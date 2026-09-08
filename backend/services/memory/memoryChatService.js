require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");
const { searchSimilarChunks } = require("./memoryService");

const MEMORY_CHAT_MODELS = (process.env.GEMINI_MEMORY_CHAT_MODEL || "gemini-2.5-flash,gemini-flash-lite-latest")
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);
const NO_MEMORY_ANSWER = "I could not find relevant information in saved memory.";

/** Number of top-K semantic chunks retrieved per query. */
const MEMORY_TOP_K = 5;

let client;

/**
 * Normalises any value to a trimmed, clean string.
 * @param {string|any} text
 * @returns {string}
 */
function cleanText(text) {
    return String(text || "").replace(/\s+/g, " ").trim();
}

function getClient() {
    if (!client) {
        const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

        if (!apiKey) {
            throw new Error("GEMINI_API_KEY is required for memory answers.");
        }

        client = new GoogleGenAI({
            apiKey: apiKey.trim()
        });
    }

    return client;
}

/**
 * Builds a numbered context block from memory chunks for LLM prompting.
 * @param {Array<{chunkText: string}>} chunks
 * @returns {string}
 */
function buildContext(chunks) {
    return chunks
        .map((chunk, index) => {
            return `[${index + 1}] ${cleanText(chunk.chunkText)}`;
        })
        .join("\n");
}

async function answerFromMemory(question) {
    const cleanedQuestion = cleanText(question);

    if (!cleanedQuestion) {
        return NO_MEMORY_ANSWER;
    }

    const chunks = await searchSimilarChunks(cleanedQuestion, MEMORY_TOP_K);

    if (chunks.length === 0) {
        return NO_MEMORY_ANSWER;
    }

    const prompt = `
You answer questions using only saved memory chunks.

Rules:
- Use only the information in MEMORY.
- Do not use outside knowledge.
- If MEMORY does not contain the answer, say exactly:
${NO_MEMORY_ANSWER}
- Keep the answer concise and complete.
- When one memory sentence directly answers the question, use that sentence.

MEMORY:
${buildContext(chunks)}

QUESTION:
${cleanedQuestion}
`;

    let lastError;

    for (const model of MEMORY_CHAT_MODELS) {
        try {
            const response = await getClient().models.generateContent({
                model,
                contents: prompt,
                config: {
                    temperature: 0
                }
            });

            return cleanText(response?.text) || NO_MEMORY_ANSWER;
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError;
}

module.exports = {
    MEMORY_CHAT_MODELS,
    NO_MEMORY_ANSWER,
    answerFromMemory
};
