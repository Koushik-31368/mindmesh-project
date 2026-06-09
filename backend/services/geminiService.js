const { GoogleGenAI } = require("@google/genai");

// These codes cover the most common transient failures returned by network clients.
const NETWORK_ERROR_CODES = new Set([
    "ECONNRESET",
    "ETIMEDOUT",
    "ECONNREFUSED",
    "EAI_AGAIN",
    "ENOTFOUND",
    "UND_ERR_CONNECT_TIMEOUT"
]);

// Collapsing whitespace keeps prompts compact without changing the meaning of the page text.
function cleanText(text) {
    return (text || "").replace(/\s+/g, " ").trim();
}

// The service throws structured errors so the route layer can return friendly responses.
function createFriendlyError(message, statusCode) {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.userMessage = message;
    return error;
}

// Gemini and Groq can fail with different shapes, so this normalizes the common cases.
function normalizeProviderError(error, providerName, fallbackMessage) {
    const rawMessage = String(error?.message || error?.error?.message || "").toLowerCase();
    const errorCode = String(error?.code || error?.cause?.code || "").toUpperCase();
    const statusCode = Number(error?.status || error?.statusCode || error?.response?.status);

    if (
        statusCode === 429 ||
        rawMessage.includes("rate limit") ||
        rawMessage.includes("too many requests")
    ) {
        return createFriendlyError(
            `${providerName} is temporarily rate limited. Please try again in a moment.`,
            429
        );
    }

    if (
        statusCode === 402 ||
        rawMessage.includes("quota") ||
        rawMessage.includes("insufficient credits") ||
        rawMessage.includes("insufficient quota")
    ) {
        return createFriendlyError(
            `${providerName} quota has been exceeded. Please try again later or check billing.`,
            429
        );
    }

    if (
        NETWORK_ERROR_CODES.has(errorCode) ||
        rawMessage.includes("network") ||
        rawMessage.includes("fetch failed") ||
        rawMessage.includes("failed to fetch")
    ) {
        return createFriendlyError(
            `${providerName} could not be reached because of a network problem. Please try again.`,
            503
        );
    }

    return createFriendlyError(fallbackMessage, 500);
}

// Gemini stays available so the backend can switch providers without another refactor.
function createGeminiService() {
    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
    const client = apiKey ? new GoogleGenAI({ apiKey }) : null;

    // We delay the configuration failure until the endpoint is actually used.
    function assertClient() {
        if (!client) {
            throw createFriendlyError(
                "Gemini API key is missing from the environment.",
                500
            );
        }
    }

    // Summaries stay concise and predictable so the popup can render them directly.
    async function summarize(text) {
        assertClient();

        try {
            const response = await client.models.generateContent({
                model,
                contents: `
Summarize the following webpage in 5-8 concise bullet points.

${cleanText(text)}
`
            });

            return cleanText(response?.text) || "No summary could be generated.";
        } catch (error) {
            throw normalizeProviderError(error, "Gemini", "Failed to generate summary.");
        }
    }

    // The answer endpoint keeps the existing contract but the provider logic lives here.
    async function ask(text, question) {
        assertClient();

        try {
            const response = await client.models.generateContent({
                model,
                contents: `
You are answering questions about a webpage.

WEBPAGE:
${cleanText(text)}

QUESTION:
${cleanText(question)}

Answer using only information from the webpage.
`
            });

            return cleanText(response?.text) || "No answer could be generated.";
        } catch (error) {
            throw normalizeProviderError(error, "Gemini", "Failed to answer.");
        }
    }

    async function securityVerify(evidence) {
        assertClient();

        try {
            const response =
                await client.models.generateContent({
                    model,
                    contents: `
You are a cybersecurity analyst.

Analyze this webpage evidence.

${JSON.stringify(evidence, null, 2)}

Respond ONLY in JSON:

{
  "verdict":"safe|suspicious|dangerous",
  "confidence":0,
  "explanation":"short explanation"
}
`,
                    config: {
                        responseMimeType: "application/json"
                    }
                });

            return response?.text;
        }
        catch (error) {
            throw normalizeProviderError(
                error,
                "Gemini",
                "Failed security verification."
            );
        }
    }

    async function privacySummary(policyText) {
        assertClient();

        const prompt = `
Analyze this privacy policy.

Provide:

1. Data Collected
2. Data Sharing Practices
3. Data Retention
4. User Rights
5. Risk Level

Keep response under 150 words.

Policy:
${policyText}
`;

        try {
            const result = await client.models.generateContent({
                model,
                contents: prompt
            });

            return result?.text;
        } catch (error) {
            throw normalizeProviderError(
                error,
                "Gemini",
                "Failed to generate privacy summary."
            );
        }
    }

    async function extractGraphData(text) {
        assertClient();

        const pageText = cleanText(text);
        const prompt = `You are a knowledge graph extraction engine.

Extract:

1. Important entities
2. Relationships between entities

Return ONLY valid JSON.

Format:

{
  "entities": [
    {
      "name": "Entity Name",
      "type": "PERSON | COMPANY | PRODUCT | PROJECT | TECHNOLOGY | ORGANIZATION | LOCATION | OTHER"
    }
  ],
  "relationships": [
    {
      "source": "Entity A",
      "relation": "RELATIONSHIP",
      "target": "Entity B"
    }
  ]
}

Rules:

- No explanations.
- No markdown.
- No extra text.
- Output JSON only.

Text:

${pageText}`;

        try {
            const response = await client.models.generateContent({
                model,
                contents: prompt,
                config: {
                    responseMimeType: "application/json"
                }
            });

            const content = response?.text;
            if (!content) {
                return { entities: [], relationships: [] };
            }

            let jsonString = content;
            const firstBrace = jsonString.indexOf("{");
            const lastBrace = jsonString.lastIndexOf("}");
            if (firstBrace !== -1 && lastBrace !== -1) {
                jsonString = jsonString.substring(firstBrace, lastBrace + 1);
            }
            return JSON.parse(jsonString);
        } catch (error) {
            console.error("Graph extraction failed:", error);
            return {
                entities: [],
                relationships: []
            };
        }
    }

    async function answerQuestion(question, graphContext, memoryContext) {
        assertClient();

        const formattedGraph = (graphContext?.relationships || [])
            .map(r => `- ${r.source} ${r.relation} ${r.target}`)
            .join("\n") || "No relevant relationships found.";

        const formattedMemory = (memoryContext || [])
            .map((chunk, idx) => `[${idx + 1}] ${cleanText(chunk.chunkText)}`)
            .join("\n") || "No relevant memory chunks found.";

        const prompt = `You are a hybrid answering assistant. You answer questions by combining:
1. Semantic memory chunks (general context)
2. A knowledge graph (relationships and facts)

Combine both sources of information to construct a coherent, accurate, and concise answer.
If the information is not present in either source, say so. Do not make up facts.

SEMANTIC MEMORY CHUNKS:
${formattedMemory}

KNOWLEDGE GRAPH RELATIONSHIPS:
${formattedGraph}

QUESTION:
${cleanText(question)}`;

        try {
            const response = await client.models.generateContent({
                model,
                contents: prompt,
                config: {
                    temperature: 0.3
                }
            });

            return cleanText(response?.text) || "No answer could be generated.";
        } catch (error) {
            throw normalizeProviderError(error, "Gemini", "Failed to answer question using hybrid context.");
        }
    }

    return {
        ask,
        summarize,
        securityVerify,
        privacySummary,
        extractGraphData,
        answerQuestion
    };
}

module.exports = {
    createGeminiService
};