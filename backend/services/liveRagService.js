const { chunkText } = require("./memory/chunkerService");
const { generateEmbedding } = require("./memory/embeddingService");
const { cosineSimilarity } = require("./memory/memoryService");

// How long a live-page index entry is considered fresh (milliseconds).
// After this window the next request for that URL triggers a full re-index so
// that SPA navigation and infinite-scroll updates are not silently served from
// a stale cache.
const TTL_MS = Number(process.env.LIVE_RAG_TTL_MS || 30 * 60 * 1000); // 30 min

// Delay in ms between consecutive embedding calls to stay under free-tier RPM limits.
const EMBED_DELAY_MS = Number(process.env.EMBED_DELAY_MS || 10000);

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

// In-memory store.  Keyed by URL string.
// Each value: { chunks: string[], embeddings: number[][], timestamp: number }
const store = new Map();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isEntryFresh(entry) {
    return entry && (Date.now() - entry.timestamp) < TTL_MS;
}

// Walk the store and drop anything older than TTL_MS.  Called inline on every
// mutating operation so the map stays bounded without a background timer.
function evictStale() {
    const now = Date.now();
    for (const [url, entry] of store) {
        if (now - entry.timestamp >= TTL_MS) {
            store.delete(url);
        }
    }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Chunk + embed `pageText` and store the result under `url`.
 *
 * Idempotent with TTL-aware freshness: if a valid (non-stale) entry already
 * exists for this URL the function returns early without re-embedding.  If the
 * entry is present but stale it is replaced, which correctly handles SPAs and
 * dynamic pages that change content under the same URL.
 *
 * Designed to be called fire-and-forget (not awaited) from the /summarize
 * handler so the embedding sweep runs in the background while the user reads
 * the summary.
 *
 * @param {string} url        - Canonical page URL used as the cache key.
 * @param {string} pageText   - Full innerText from document.body.
 * @returns {Promise<void>}
 */
async function indexPageChunks(url, pageText) {
    if (!url || !pageText) {
        return;
    }

    // Evict any globally stale entries on each indexing call.
    evictStale();

    // Return early only if the entry is still fresh.
    const existing = store.get(url);
    if (isEntryFresh(existing)) {
        return;
    }

    const cleanedText = String(pageText).replace(/\s+/g, " ").trim();
    const chunks = chunkText(cleanedText); // 400-word chunks, 50-word overlap

    if (chunks.length === 0) {
        return;
    }

    // Embed each chunk sequentially with a delay to avoid hammering the free-tier API.
    const embeddings = [];
    for (let i = 0; i < chunks.length; i++) {
        if (i > 0 && EMBED_DELAY_MS > 0) {
            await sleep(EMBED_DELAY_MS);
        }
        const vector = await generateEmbedding(chunks[i]);
        embeddings.push(vector);
    }

    store.set(url, {
        chunks,
        embeddings,
        timestamp: Date.now()
    });
}

/**
 * Embed `query` and return the top-`limit` most-relevant chunk strings from
 * the live index for `url`.
 *
 * Returns an empty array if the URL has not been indexed yet or the entry has
 * gone stale — the caller is responsible for falling back to the truncated-text
 * path in that case.
 *
 * @param {string} url
 * @param {string} query
 * @param {number} [limit=5]
 * @returns {Promise<string[]>}  Array of chunk text strings, best-match first.
 */
async function retrieveRelevantChunks(url, query, limit = 5) {
    if (!url || !query) {
        return [];
    }

    const entry = store.get(url);
    if (!isEntryFresh(entry) || entry.chunks.length === 0) {
        return [];
    }

    const queryEmbedding = await generateEmbedding(String(query).trim());

    const scored = entry.chunks.map((chunk, index) => ({
        chunk,
        score: cosineSimilarity(queryEmbedding, entry.embeddings[index])
    }));

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, limit).map(item => item.chunk);
}

module.exports = {
    indexPageChunks,
    retrieveRelevantChunks
};
