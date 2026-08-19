/**
 * MindMesh RAG Evaluation Runner
 * ─────────────────────────────────────────────────────────────────────────────
 * Usage:
 *   npm run eval                     — run all test cases
 *   npm run eval -- --id ml-01       — run a single case by id
 *   npm run eval -- --url <substr>   — run all cases whose url contains substr
 *
 * What it measures:
 *   • Keyword hit rate  — % of answers containing all expectedKeywords
 *   • Avg response time — wall-clock ms from indexing through answer
 *   • Per-question table — PASS/FAIL, retrieved chunks, actual answer
 *
 * Retrieval vs generation diagnosis:
 *   If retrieved chunks contain the right content but the answer is wrong
 *   → generation problem (prompt or model).
 *   If retrieved chunks are irrelevant → retrieval problem (chunking or embeddings).
 * ─────────────────────────────────────────────────────────────────────────────
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const EVAL_DATASET = require("./evalDataset");
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
 * Fetch full page text from a URL using Node's built-in fetch.
 * Strips HTML tags and collapses whitespace to approximate innerText.
 */
async function fetchPageText(url) {
    const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (MindMesh-Eval/1.0)" },
        signal: AbortSignal.timeout(15000)
    });

    if (!res.ok) {
        throw new Error(`HTTP ${res.status} fetching ${url}`);
    }

    const html = await res.text();

    // Strip scripts, styles, and all HTML tags — rough but good enough for eval.
    const text = html
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

    return text;
}

/**
 * Score one answer against its expected keywords.
 * Returns { passed: boolean, hits: string[], misses: string[] }
 */
function scoreAnswer(answer, expectedKeywords) {
    const lowerAnswer = answer.toLowerCase();
    const hits   = [];
    const misses = [];

    for (const kw of expectedKeywords) {
        if (lowerAnswer.includes(kw.toLowerCase())) {
            hits.push(kw);
        } else {
            misses.push(kw);
        }
    }

    return {
        passed: misses.length === 0,
        hits,
        misses
    };
}

/** Truncate a string for display without breaking word boundaries. */
function truncate(str, maxLen = 200) {
    if (!str || str.length <= maxLen) return str;
    return str.slice(0, maxLen).trimEnd() + "…";
}

// ── Main runner ───────────────────────────────────────────────────────────────

async function runEval() {
    // Parse CLI filters
    const args   = process.argv.slice(2);
    const idFlag  = args.indexOf("--id");
    const urlFlag = args.indexOf("--url");
    const filterId  = idFlag  !== -1 ? args[idFlag + 1]  : null;
    const filterUrl = urlFlag !== -1 ? args[urlFlag + 1] : null;

    let dataset = EVAL_DATASET;
    if (filterId)  dataset = dataset.filter((c) => c.id === filterId);
    if (filterUrl) dataset = dataset.filter((c) => c.url.includes(filterUrl));

    if (dataset.length === 0) {
        console.error(RED("No test cases matched the filter. Check your --id or --url value."));
        process.exit(1);
    }

    // Skip any cases that still have TODO placeholders
    const skipped = dataset.filter((c) => c.expectedAnswer.startsWith("TODO"));
    const runnable = dataset.filter((c) => !c.expectedAnswer.startsWith("TODO"));

    console.log(BOLD("\n╔══════════════════════════════════════════════════════╗"));
    console.log(BOLD("║         MindMesh RAG Evaluation Runner               ║"));
    console.log(BOLD("╚══════════════════════════════════════════════════════╝\n"));
    console.log(`  Total cases : ${dataset.length}`);
    console.log(`  Runnable    : ${GREEN(String(runnable.length))}`);
    console.log(`  Skipped (TODO): ${YELLOW(String(skipped.length))}`);
    if (skipped.length > 0) {
        console.log(DIM(`  → Fill in expectedAnswer + expectedKeywords in evalDataset.js to run these:`));
        for (const c of skipped) console.log(DIM(`    • ${c.id} — ${c.url}`));
    }
    console.log();

    if (runnable.length === 0) {
        console.log(YELLOW("No runnable cases yet — fill in the TODO fields in evalDataset.js first."));
        process.exit(0);
    }

    const results = [];

    for (const [i, testCase] of runnable.entries()) {
        const { id, url, question, expectedAnswer, expectedKeywords } = testCase;

        console.log(BOLD(`[${i + 1}/${runnable.length}] ${id}`));
        console.log(DIM(`  URL      : ${url}`));
        console.log(DIM(`  Question : ${question}`));

        const t0 = Date.now();
        let answer        = "";
        let chunks        = [];
        let error         = null;

        try {
            // 1. Fetch page text
            process.stdout.write("  Fetching page text… ");
            const pageText = await fetchPageText(url);
            process.stdout.write(GREEN(`${pageText.length.toLocaleString()} chars\n`));

            // 2. Index page (chunk + embed)
            process.stdout.write("  Indexing (chunk + embed)… ");
            await indexPageChunks(url, pageText);
            process.stdout.write(GREEN("done\n"));

            // 3. Retrieve top-5 relevant chunks
            process.stdout.write("  Retrieving chunks… ");
            chunks = await retrieveRelevantChunks(url, question, 5);
            process.stdout.write(GREEN(`${chunks.length} chunk(s) retrieved\n`));

            // 4. Generate answer from chunks
            process.stdout.write("  Generating answer… ");
            if (chunks.length > 0) {
                const context = chunks.map((c, idx) => `[${idx + 1}] ${c}`).join("\n\n");
                answer = await aiService.ask(context, question);
            } else {
                answer = "(no chunks retrieved — RAG returned empty)";
            }
            process.stdout.write(GREEN("done\n"));

        } catch (err) {
            error = err.message;
            process.stdout.write(RED(`\n  ERROR: ${err.message}\n`));
        }

        const elapsed = Date.now() - t0;
        const score   = error ? { passed: false, hits: [], misses: expectedKeywords } : scoreAnswer(answer, expectedKeywords);

        // ── Print chunk details ────────────────────────────────────────────
        console.log(CYAN("\n  ── Retrieved Chunks ──"));
        if (chunks.length === 0) {
            console.log(DIM("  (none)"));
        } else {
            chunks.forEach((chunk, idx) => {
                console.log(DIM(`  [${idx + 1}] ${truncate(chunk, 160)}`));
            });
        }

        // ── Print answer vs expected ───────────────────────────────────────
        console.log(CYAN("\n  ── Answer Quality ──"));
        console.log(`  Expected   : ${DIM(truncate(expectedAnswer, 200))}`);
        console.log(`  Actual     : ${truncate(answer, 200)}`);
        console.log(`  Keywords   : expected [${expectedKeywords.join(", ")}]`);
        console.log(`             : hits   → ${GREEN(score.hits.join(", ") || "none")}`);
        if (score.misses.length > 0) {
            console.log(`             : misses → ${RED(score.misses.join(", "))}`);
        }

        const statusLabel = error
            ? RED("  ERROR ")
            : score.passed
                ? GREEN("  PASS  ")
                : RED("  FAIL  ");

        console.log(`\n  Result  : ${statusLabel}  (${elapsed}ms)\n`);
        console.log(DIM("  " + "─".repeat(60) + "\n"));

        results.push({ id, url, question, score, elapsed, error, chunks, answer });
    }

    // ── Summary table ────────────────────────────────────────────────────────
    const passed   = results.filter((r) => r.score.passed && !r.error).length;
    const failed   = results.filter((r) => !r.score.passed || r.error).length;
    const hitRate  = ((passed / results.length) * 100).toFixed(1);
    const avgTime  = Math.round(results.reduce((s, r) => s + r.elapsed, 0) / results.length);

    console.log(BOLD("╔══════════════════════════════════════════════════════╗"));
    console.log(BOLD("║                    SUMMARY                          ║"));
    console.log(BOLD("╚══════════════════════════════════════════════════════╝\n"));

    // Per-question table
    console.log(BOLD("  ID          │ Result │ Time  │ Keywords"));
    console.log("  " + "─".repeat(58));
    for (const r of results) {
        const status = r.error ? RED("ERROR ") : r.score.passed ? GREEN(" PASS ") : RED(" FAIL ");
        const kwSummary = r.error
            ? "—"
            : `${r.score.hits.length}/${r.score.hits.length + r.score.misses.length} hit`;
        console.log(`  ${r.id.padEnd(12)}│ ${status} │ ${String(r.elapsed + "ms").padEnd(6)}│ ${kwSummary}`);
    }

    console.log("\n" + "  " + "─".repeat(58));
    console.log(`\n  Keyword hit rate : ${hitRate >= 70 ? GREEN(hitRate + "%") : hitRate >= 50 ? YELLOW(hitRate + "%") : RED(hitRate + "%")}  (${passed}/${results.length} passed)`);
    console.log(`  Average latency  : ${avgTime}ms`);
    console.log(`  Cases run        : ${results.length}  |  Skipped (TODO) : ${skipped.length}\n`);

    if (hitRate >= 80) {
        console.log(GREEN("  ✅ Hit rate ≥ 80% — RAG pipeline is resume-worthy as-is.\n"));
    } else if (hitRate >= 60) {
        console.log(YELLOW("  ⚠️  Hit rate 60-79% — decent but could be better. Check chunk sizes or top-k.\n"));
    } else {
        console.log(RED("  ❌ Hit rate < 60% — retrieval needs work. Check embeddings and chunk overlap.\n"));
    }
}

runEval().catch((err) => {
    console.error(RED("\nFatal error running eval:"), err);
    process.exit(1);
});
