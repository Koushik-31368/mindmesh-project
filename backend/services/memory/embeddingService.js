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

async function generateEmbedding(text) {

    const client = getClient();

    const response = await client.models.embedContent({
        model: EMBEDDING_MODEL,
        contents: text
    });

    return response.embeddings?.[0]?.values || [];
}

module.exports = {
    EMBEDDING_MODEL,
    generateEmbedding
};
