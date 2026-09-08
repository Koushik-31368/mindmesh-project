require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");

const EMBEDDING_MODEL = "gemini-embedding-001";

let client;

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
async function generateEmbedding(text, retries = 0) {
    const MAX_RETRIES = 6;
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

        if (is429 && retries < MAX_RETRIES) {
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
