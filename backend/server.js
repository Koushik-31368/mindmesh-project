require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { createAiService } = require("./services/providerFactory");
const memoryRoutes = require("./routes/memoryRoutes");

const app = express();
const port = process.env.PORT || 3000;

// The selected provider is hidden behind a factory so the route handlers stay stable.
const aiService = createAiService();

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use("/api/memory", memoryRoutes);

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
        const { text } = req.body || {};

        // Summarization is now delegated to the active provider service.
        const summary = await aiService.summarize(text);

        res.json({
            summary
        });
    } catch (error) {
        console.error(error);
        sendFriendlyAiError(res, "summary", error, "Failed to generate summary.");
    }
});

app.post("/ask", async (req, res) => {
    try {
        const { text, question } = req.body || {};

        // Question answering is also delegated to the active provider service.
        const answer = await aiService.ask(text, question);

        res.json({
            answer
        });
    } catch (error) {
        console.error(error);
        sendFriendlyAiError(res, "answer", error, "Failed to answer.");
    }
});

app.get("/health", (_req, res) => {
    res.json({ ok: true });
});

app.listen(port, () => {
    console.log(`MindMesh backend listening on http://localhost:${port}`);
});