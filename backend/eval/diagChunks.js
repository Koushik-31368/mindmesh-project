/**
 * Diagnostic: print FULL retrieved chunks for warner-04, 07, 08, 09, 10
 * Usage: node eval/diagChunks.js
 * Does NOT modify any files. Read-only diagnostic.
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const { indexPageChunks, retrieveRelevantChunks } = require("../services/liveRagService");

const CASES = [
    {
        id: "warner-04",
        url: "https://en.wikipedia.org/wiki/David_Warner_(cricketer)",
        question: "What records does Warner hold as an opening pair with Shane Watson in T20Is?",
        targetFact: "1,108 runs / highest opening pair partnership"
    },
    {
        id: "warner-07",
        url: "https://en.wikipedia.org/wiki/David_Warner_(cricketer)",
        question: "What leadership ban did Cricket Australia impose on Warner after the 2018 scandal?",
        targetFact: "permanent/lifetime leadership ban by Cricket Australia"
    },
    {
        id: "warner-08",
        url: "https://en.wikipedia.org/wiki/David_Warner_(cricketer)",
        question: "What were David Warner's batting figures in Australia's 2021 T20 World Cup campaign?",
        targetFact: "289 runs, three half-centuries"
    },
    {
        id: "warner-09",
        url: "https://en.wikipedia.org/wiki/David_Warner_(cricketer)",
        question: "When and against whom did Warner score his highest Test score of 335 not out?",
        targetFact: "335 not out, Pakistan, Adelaide/November 2019"
    },
    {
        id: "warner-10",
        url: "https://en.wikipedia.org/wiki/David_Warner_(cricketer)",
        question: "Which award did David Warner win for his 2019-20 Test summer performances?",
        targetFact: "Allan Border Medal, 2019-20"
    }
];

const SEP = "═".repeat(72);
const DASH = "─".repeat(72);

async function fetchPageText(url) {
    const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (MindMesh-Diag/1.0)" },
        signal: AbortSignal.timeout(20000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    return html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"').replace(/\s+/g, " ")
        .trim();
}

async function run() {
    const url = CASES[0].url;

    console.log(`\n${SEP}`);
    console.log("  MindMesh RAG Diagnostic — Full Chunk Viewer");
    console.log(`  Cases: warner-04, 07, 08, 09, 10`);
    console.log(`${SEP}\n`);

    console.log("→ Fetching + indexing page (may take ~4 min with rate-limit delays)…\n");
    const pageText = await fetchPageText(url);
    console.log(`  Page fetched: ${pageText.length.toLocaleString()} chars`);
    await indexPageChunks(url, pageText);
    console.log("  Index complete.\n");

    for (const { id, url, question, targetFact } of CASES) {
        console.log(`\n${SEP}`);
        console.log(`  CASE: ${id}`);
        console.log(`  Q   : ${question}`);
        console.log(`  FACT: ${targetFact}`);
        console.log(SEP);

        const chunks = await retrieveRelevantChunks(url, question, 5);

        if (chunks.length === 0) {
            console.log("  !! NO CHUNKS RETRIEVED — URL not indexed.\n");
            continue;
        }

        chunks.forEach((chunk, i) => {
            console.log(`\n  CHUNK [${i + 1}/5]:`);
            console.log(DASH);
            // Print the FULL chunk, no truncation
            console.log(chunk);
            console.log(DASH);
        });
    }

    console.log(`\n${SEP}`);
    console.log("  Diagnostic complete.");
    console.log(`${SEP}\n`);
}

run().catch(err => {
    console.error("\nFATAL:", err.message);
    process.exit(1);
});
