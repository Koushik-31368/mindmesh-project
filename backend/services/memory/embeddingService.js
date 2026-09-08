require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");

/** Gemini model identifier used for text embedding generation. */
const EMBEDDING_MODEL = "gemini-embedding-001";

/** Max retries on 429 RESOURCE_EXHAUSTED rate-limit responses. */
const MAX_RETRIES = 6;

let client;

/**
 * Lazily initialises the shared GoogleGenAI client from env credentials.
 * @returns {import("@google/genai").GoogleGenAI}
 */
function getClient() {
    if (!client) {
        const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

        if (!apiKey) {
            throw new Error("GEMINI_API_KEY is required for Gemini embeddings.");
        }

        client = new GoogleGenAI({
            apiKey: apiKey.trim()
        });
    }

    return client;
}

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

/**
 * Call the Gemini embedding API with exponential backoff on 429 errors.
 * Retries up to MAX_RETRIES times, doubling the wait each attempt.
 */
/**
 * Generates a vector embedding via the Gemini API with exponential backoff.
 * @param {string} text - Text to embed.
 * @param {number} retries - Internal retry counter.
 * @returns {Promise<number[]>}
 */
async function generateEmbedding(text, retries = 0) {
    const _maxRetries = MAX_RETRIES;
    const BASE_DELAY_MS = Number(process.env.EMBED_DELAY_MS ?? 5000);

    const client = getClient();

    try {
        const response = await client.models.embedContent({
            model: EMBEDDING_MODEL,
            contents: text
        });

        return response.embeddings?.[0]?.values || [];
    } catch (err) {
        const is429 =
            err?.status === 429 ||
            err?.message?.includes("429") ||
            err?.message?.includes("RESOURCE_EXHAUSTED") ||
            JSON.stringify(err).includes("RESOURCE_EXHAUSTED");

        if (is429 && retries < _maxRetries) {
            const delay = BASE_DELAY_MS * Math.pow(2, retries); // 5s, 10s, 20s, 40s...
            process.stderr.write(
                `\n    [embed] 429 rate-limit — waiting ${(delay / 1000).toFixed(0)}s before retry ${retries + 1}/${MAX_RETRIES}… `
            );
            await sleep(delay);
            return generateEmbedding(text, retries + 1);
        }

        throw err;
    }
}

module.exports = {
    EMBEDDING_MODEL,
    generateEmbedding
};
