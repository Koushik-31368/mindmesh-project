/**
 * MindMesh RAG Evaluation Runner
 * ─────────────────────────────────────────────────────────────────────────────
 * Usage:
 *   npm run eval                     — run all test cases
 *   npm run eval -- --id warner-01   — run a single case by id
 *   npm run eval -- --url <substr>   — run all cases whose url contains substr
 *
 * Flow:
 *   1. Pre-index all unique URLs ONCE (chunk + embed with rate-limit delay)
 *   2. Run all questions against the warm in-memory cache
 *   3. Score answers by keyword presence
 *   4. Print per-question table + summary with hit rate and latency
 * ─────────────────────────────────────────────────────────────────────────────
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const { EVAL_DATASET } = require("./evalDataset");
const { indexPageChunks, retrieveRelevantChunks } = require("../services/liveRagService");
const { createAiService } = require("../services/providerFactory");

const aiService = createAiService();

// ── ANSI colour helpers ──────────────────────────────────────────────────────
const GREEN  = (s) => `\x1b[32m${s}\x1b[0m`;
const RED    = (s) => `\x1b[31m${s}\x1b[0m`;
const YELLOW = (s) => `\x1b[33m${s}\x1b[0m`;
const BOLD   = (s) => `\x1b[1m${s}\x1b[0m`;
const DIM    = (s) => `\x1b[2m${s}\x1b[0m`;
const CYAN   = (s) => `\x1b[36m${s}\x1b[0m`;

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Fetch full page text from a URL.
 * Strips HTML tags and collapses whitespace to approximate innerText.
 */
async function fetchPageText(url) {
    const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (MindMesh-Eval/1.0)" },
        signal: AbortSignal.timeout(20000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);

    const html = await res.text();
    return html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, "\"")
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * Score one answer against its expected keywords.
 */
function scoreAnswer(answer, expectedKeywords) {
    // Normalize all unicode dash/hyphen variants to ASCII '-' before matching.
    // This prevents failures like \u2010 (non-breaking hyphen) vs '-' in
    // LLM-generated text (e.g. "ball\u2010tampering" vs "ball-tampering").
    const DASH_RE = /[\u2010\u2011\u2012\u2013\u2014\u2015\u2212\uFE58\uFE63\uFF0D]/g;
    const normalize = (s) => s.replace(DASH_RE, "-").toLowerCase();

    const normAnswer = normalize(answer);
    const hits   = [];
    const misses = [];
    for (const kw of expectedKeywords) {
        if (normAnswer.includes(normalize(kw))) {
            hits.push(kw);
        } else {
            misses.push(kw);
        }
    }
    return { passed: misses.length === 0, hits, misses };
}

function truncate(str, maxLen = 200) {
    if (!str || str.length <= maxLen) return str;
    return str.slice(0, maxLen).trimEnd() + "\u2026";
}

/**
 * Ask the AI once, and retry once if it throws a transient provider 500.
 * This absorbs infra noise (Groq 500s) without inflating the FAIL count.
 */
async function askWithRetry(context, question) {
    try {
        return await aiService.ask(context, question);
    } catch (err) {
        // Retry once on provider-side 500s (e.g. Groq "Failed to answer")
        const is500 = err.message && (
            err.message.includes("500") ||
            err.message.includes("Failed to answer") ||
            err.message.includes("unavailable")
        );
        if (!is500) throw err;
        console.log(YELLOW("  [auto-retry] provider 500 — waiting 5s then retrying once…"));
        await new Promise((r) => setTimeout(r, 5000));
        return await aiService.ask(context, question);
    }
}

// ── Main runner ───────────────────────────────────────────────────────────────

async function runEval() {
    const args     = process.argv.slice(2);
    const idFlag   = args.indexOf("--id");
    const urlFlag  = args.indexOf("--url");
    const filterId  = idFlag  !== -1 ? args[idFlag + 1]  : null;
    const filterUrl = urlFlag !== -1 ? args[urlFlag + 1] : null;

    let dataset = EVAL_DATASET;
    if (filterId)  dataset = dataset.filter((c) => c.id === filterId);
    if (filterUrl) dataset = dataset.filter((c) => c.url.includes(filterUrl));

    if (dataset.length === 0) {
        console.error(RED("No test cases matched the filter."));
        process.exit(1);
    }

    const skipped  = dataset.filter((c) => c.expectedAnswer.startsWith("TODO"));
    const runnable = dataset.filter((c) => !c.expectedAnswer.startsWith("TODO"));

    console.log(BOLD("\n╔══════════════════════════════════════════════════════╗"));
    console.log(BOLD("║         MindMesh RAG Evaluation Runner               ║"));
    console.log(BOLD("╚══════════════════════════════════════════════════════╝\n"));
    console.log(`  Total cases : ${dataset.length}`);
    console.log(`  Runnable    : ${GREEN(String(runnable.length))}`);
    console.log(`  Skipped (TODO): ${YELLOW(String(skipped.length))}`);
    if (skipped.length > 0) {
        for (const c of skipped) console.log(DIM(`    • ${c.id} — ${c.url}`));
    }
    console.log();

    if (runnable.length === 0) {
        console.log(YELLOW("No runnable cases yet — fill in the TODO fields in evalDataset.js first."));
        process.exit(0);
    }

    // ── Phase 1: Pre-index each unique URL ONCE ──────────────────────────────
    // All 15 cases share the same David Warner URL — we embed it once and all
    // questions hit the warm in-memory cache. This avoids 15x quota exhaustion.
    const uniqueUrls = [...new Set(runnable.map((c) => c.url))];
    const embedDelay = Number(process.env.EMBED_DELAY_MS ?? 10000);

    console.log(BOLD(`Phase 1 — Pre-indexing ${uniqueUrls.length} unique URL(s)`));
    console.log(DIM(`  Rate-limit delay between chunks: ${embedDelay}ms`));
    console.log(DIM(`  Tip: set EMBED_DELAY_MS=0 in .env on a paid Gemini plan\n`));

    const indexedUrls = new Set();

    for (const url of uniqueUrls) {
        console.log(`  → ${DIM(url)}`);
        try {
            process.stdout.write("    Fetching page text… ");
            const pageText = await fetchPageText(url);
            console.log(GREEN(`${pageText.length.toLocaleString()} chars`));

            process.stdout.write("    Embedding chunks (this may take a few minutes)… ");
            await indexPageChunks(url, pageText);
            console.log(GREEN("done ✓"));
            indexedUrls.add(url);
        } catch (err) {
            console.log(RED(`\n    FAILED: ${err.message}`));
            console.log(DIM("    Cases for this URL will show ERROR — check your GEMINI_API_KEY and quota."));
        }
        console.log();
    }

    console.log(BOLD("Phase 2 — Running questions against warm cache\n"));

    // ── Phase 2: Question loop (no re-indexing, just retrieve + generate) ───
    const results = [];

    for (const [i, testCase] of runnable.entries()) {
        const { id, url, question, expectedAnswer, expectedKeywords } = testCase;

        console.log(BOLD(`[${i + 1}/${runnable.length}] ${id}`));
        console.log(DIM(`  Question : ${question}`));

        const t0 = Date.now();
        let answer  = "";
        let chunks  = [];
        let error   = null;

        try {
            // Retrieve from warm cache — no re-indexing
            process.stdout.write("  Retrieving chunks… ");
            chunks = await retrieveRelevantChunks(url, question, 5);
            process.stdout.write(GREEN(`${chunks.length} chunk(s)\n`));

            // Generate answer from retrieved chunks (with single auto-retry on 500)
            process.stdout.write("  Generating answer… ");
            if (chunks.length > 0) {
                const context = chunks.map((c, idx) => `[${idx + 1}] ${c}`).join("\n\n");
                answer = await askWithRetry(context, question);
            } else {
                answer = "(no chunks retrieved — URL may not have been indexed successfully)";
            }
            process.stdout.write(GREEN("done\n"));
        } catch (err) {
            error = err.message;
            process.stdout.write(RED(`\n  ERROR: ${err.message}\n`));
        }

        const elapsed = Date.now() - t0;
        const score   = error
            ? { passed: false, hits: [], misses: expectedKeywords }
            : scoreAnswer(answer, expectedKeywords);

        // ── Chunk details ──────────────────────────────────────────────────
        console.log(CYAN("\n  ── Retrieved Chunks ──"));
        if (chunks.length === 0) {
            console.log(DIM("  (none)"));
        } else {
            chunks.forEach((chunk, idx) => {
                console.log(DIM(`  [${idx + 1}] ${truncate(chunk, 160)}`));
            });
        }

        // ── Answer vs expected ─────────────────────────────────────────────
        console.log(CYAN("\n  ── Answer Quality ──"));
        console.log(`  Expected   : ${DIM(truncate(expectedAnswer, 200))}`);
        console.log(`  Actual     : ${answer || "(empty)"}`);
        console.log(`  Full answer: ${answer}`);
        console.log(`  Keywords   : expected [${expectedKeywords.join(", ")}]`);
        console.log(`             : hits   → ${GREEN(score.hits.join(", ") || "none")}`);
        if (score.misses.length > 0) {
            console.log(`             : misses → ${RED(score.misses.join(", "))}`);
        }

        const statusLabel = error
            ? RED("  ERROR ")
            : score.passed ? GREEN("  PASS  ") : RED("  FAIL  ");

        console.log(`\n  Result  : ${statusLabel}  (${elapsed}ms)\n`);
        console.log(DIM("  " + "─".repeat(60) + "\n"));

        results.push({ id, url, question, score, elapsed, error, chunks, answer });
    }

    // ── Summary ──────────────────────────────────────────────────────────────
    const passed  = results.filter((r) => r.score.passed && !r.error).length;
    const hitRate = ((passed / results.length) * 100).toFixed(1);
    const avgTime = Math.round(results.reduce((s, r) => s + r.elapsed, 0) / results.length);

    console.log(BOLD("╔══════════════════════════════════════════════════════╗"));
    console.log(BOLD("║                    SUMMARY                          ║"));
    console.log(BOLD("╚══════════════════════════════════════════════════════╝\n"));

    console.log(BOLD("  ID          │ Result │ Time  │ Keywords"));
    console.log("  " + "─".repeat(58));
    for (const r of results) {
        const status   = r.error ? RED("ERROR ") : r.score.passed ? GREEN(" PASS ") : RED(" FAIL ");
        const kwSummary = r.error ? "—" : `${r.score.hits.length}/${r.score.hits.length + r.score.misses.length} hit`;
        console.log(`  ${r.id.padEnd(12)}│ ${status} │ ${String(r.elapsed + "ms").padEnd(6)}│ ${kwSummary}`);
    }

    console.log("\n" + "  " + "─".repeat(58));
    console.log(`\n  Keyword hit rate : ${hitRate >= 70 ? GREEN(hitRate + "%") : hitRate >= 50 ? YELLOW(hitRate + "%") : RED(hitRate + "%")}  (${passed}/${results.length} passed)`);
    console.log(`  Avg question latency : ${avgTime}ms`);
    console.log(`  Cases run : ${results.length}  |  Skipped (TODO) : ${skipped.length}\n`);

    if (hitRate >= 80) {
        console.log(GREEN("  ✅ Hit rate ≥ 80% — RAG pipeline is resume-worthy as-is.\n"));
    } else if (hitRate >= 60) {
        console.log(YELLOW("  ⚠️  Hit rate 60-79% — decent but check chunk sizes or top-k.\n"));
    } else {
        console.log(RED("  ❌ Hit rate < 60% — retrieval needs work.\n"));
    }

    // ── Per-page breakdown ────────────────────────────────────────────────────
    const pageGroups = {};
    for (const r of results) {
        const page = r.url.includes("David_Warner") ? "David Warner (cricket)"
                   : r.url.includes("Chernobyl")    ? "Chernobyl disaster"
                   : new URL(r.url).pathname.replace(/\/_?\//, "").slice(0, 30);
        if (!pageGroups[page]) pageGroups[page] = [];
        pageGroups[page].push(r);
    }

    console.log(BOLD("\n  ── Per-page hit rates ──"));
    for (const [page, cases] of Object.entries(pageGroups)) {
        const pagePassed  = cases.filter((r) => r.score.passed && !r.error).length;
        const pageRate    = ((pagePassed / cases.length) * 100).toFixed(0);
        const color       = pageRate >= 80 ? GREEN : pageRate >= 60 ? YELLOW : RED;
        console.log(`  ${page.padEnd(28)} ${color(pageRate + "%")} (${pagePassed}/${cases.length})`);
    }
    console.log();
}

runEval().catch((err) => {
    console.error(RED("\nFatal error running eval:"), err);
    process.exit(1);
});
