/**
 * MindMesh Backend Server
 * Entry point for the Express application that serves all API routes
 * including summarization, Q&A, memory, security, privacy, and graph endpoints.
 */
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { createAiService } = require("./services/providerFactory");
const memoryRoutes = require("./routes/memoryRoutes");
const securityRoutes = require("./routes/securityRoutes");
const privacyRoutes = require("./routes/privacyRoutes");
const graphRoutes = require("./routes/graphRoutes");
const { savePage } = require("./services/memory/memoryService");
const { indexPageChunks, retrieveRelevantChunks } = require("./services/liveRagService");

const app = express();
const port = process.env.PORT || 3000;

// The selected provider is hidden behind a factory so the route handlers stay stable.
const aiService = createAiService();

// CORS — allow all origins for this personal project.
// In a production multi-user app, restrict this to your specific extension ID:
//   origin: ["chrome-extension://<YOUR_EXTENSION_ID>"]
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "2mb" }));

// Lightweight request logger — logs method, path, status, and duration.
app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    });
    next();
});
app.use("/api/memory", memoryRoutes);
app.use("/api/security", securityRoutes);
app.use("/api/privacy", privacyRoutes);
app.use("/api/graph", graphRoutes);

// Serve the extension popup for local browser testing (dev only)
const path = require("path");
app.use("/popup", express.static(path.join(__dirname, "../extension")));

// The route layer only formats responses and never depends on provider internals.
function sendFriendlyAiError(res, responseKey, error, fallbackMessage) {
    if (error?.allProvidersFailed) {
        res.status(error?.statusCode || 503).json({
            error: fallbackMessage
        });

        return;
    }

    res.status(error?.statusCode || 500).json({
        [responseKey]: error?.userMessage || fallbackMessage
    });
}

app.post("/summarize", async (req, res) => {
    try {
        const { text, url, title } = req.body || {};

        // Summarization is now delegated to the active provider service.
        const summary = await aiService.summarize(text);

        // Automatically save/index the page into permanent memory.
        if (url && title) {
            try {
                await savePage({ url, title, content: text });
            } catch (saveError) {
                console.error("Auto-save page during summary failed:", saveError);
            }
        }

        res.json({
            summary
        });

        // Fire-and-forget: warm the live RAG index in the background so the
        // first /ask on this page has near-zero extra latency.  Errors here
        // are non-fatal — /ask has its own fallback if the index is missing.
        if (url && text) {
            indexPageChunks(url, text).catch((err) => {
                console.warn("[liveRag] Background indexing failed for", url, err?.message);
            });
        }
    } catch (error) {
        console.error(error);
        sendFriendlyAiError(res, "summary", error, "Failed to generate summary.");
    }
});

app.post("/ask", async (req, res) => {
    try {
        const { text, question, url } = req.body || {};

        let answer;

        // --- Live RAG path ---
        // Try to retrieve the top-5 most relevant chunks for this question.
        // If the live index for this URL is missing or stale, ensure it is
        // built now (on-demand fallback for users who skip /summarize).
        try {
            if (url && text) {
                // indexPageChunks is idempotent + TTL-aware: returns immediately
                // when a fresh entry already exists (warmed by /summarize).
                await indexPageChunks(url, text);
            }

            const relevantChunks = url
                ? await retrieveRelevantChunks(url, question, 5)
                : [];

            if (relevantChunks.length > 0) {
                // Feed only the relevant chunks to the LLM instead of the
                // raw truncated page text — this is the real RAG path.
                const context = relevantChunks
                    .map((chunk, i) => `[${i + 1}] ${chunk}`)
                    .join("\n\n");
                answer = await aiService.ask(context, question);
            }
        } catch (ragError) {
            // RAG failed (e.g. embedding API down) — log and fall through to
            // the truncated-text path so the feature never hard-breaks.
            console.warn("[liveRag] RAG retrieval failed, falling back to full text:", ragError?.message);
        }

        // --- Truncated-text fallback path ---
        // Used when: (a) RAG returned no chunks, (b) url was not supplied,
        // or (c) the embedding step threw an error.
        if (!answer) {
            answer = await aiService.ask(text, question);
        }

        res.json({
            answer
        });
    } catch (error) {
        console.error(error);
        sendFriendlyAiError(res, "answer", error, "Failed to answer.");
    }
});

app.get("/health", (_req, res) => {
    res.json({
        ok: true,
        uptime: Math.floor(process.uptime()),
        version: require("./package.json").version,
        timestamp: new Date().toISOString()
    });
});

app.listen(port, () => {
    const host = process.env.NODE_ENV === "production" ? "0.0.0.0" : "localhost";
    console.log(`MindMesh backend listening on port ${port} (${host})`);
});