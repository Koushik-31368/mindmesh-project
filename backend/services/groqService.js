const Groq = require("groq-sdk");

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

// Groq Free Tier has a token-per-minute limit, so long page text must be capped before prompting.
function trimPageText(text) {
    return (text || "").slice(0, 8000);
}

// The service throws structured errors so the route layer can return friendly responses.
function createFriendlyError(message, statusCode, options = {}) {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.userMessage = message;
    error.fallbackEligible = Boolean(options.fallbackEligible);
    return error;
}

// Groq error payloads can vary, so this normalizes the common failure types we care about.
function normalizeProviderError(error, providerName, fallbackMessage) {
    const rawMessage = String(error?.message || error?.error?.message || "").toLowerCase();
    const errorCode = String(error?.code || error?.cause?.code || "").toUpperCase();
    const statusCode = Number(error?.status || error?.statusCode || error?.response?.status);
    const fallbackEligible =
        statusCode === 429 ||
        statusCode === 413 ||
        statusCode === 402 ||
        statusCode === 503 ||
        rawMessage.includes("rate_limit_exceeded") ||
        rawMessage.includes("rate limit") ||
        rawMessage.includes("too many requests") ||
        rawMessage.includes("quota") ||
        rawMessage.includes("insufficient credits") ||
        rawMessage.includes("insufficient quota") ||
        rawMessage.includes("too large") ||
        rawMessage.includes("context length") ||
        rawMessage.includes("token limit") ||
        rawMessage.includes("timeout") ||
        rawMessage.includes("timed out") ||
        rawMessage.includes("network") ||
        rawMessage.includes("fetch failed") ||
        rawMessage.includes("failed to fetch") ||
        rawMessage.includes("service unavailable") ||
        rawMessage.includes("temporarily unavailable") ||
        rawMessage.includes("provider unavailable") ||
        errorCode === "MODEL_DECOMMISSIONED";

    if (
        statusCode === 400 &&
        (rawMessage.includes("decommissioned") || errorCode === "MODEL_DECOMMISSIONED")
    ) {
        return createFriendlyError(
            `${providerName} model is no longer available. Please update GROQ_MODEL to a supported model.`,
            500,
            { fallbackEligible: true }
        );
    }

    if (
        statusCode === 429 ||
        rawMessage.includes("rate limit") ||
        rawMessage.includes("too many requests")
    ) {
        return createFriendlyError(
            `${providerName} is temporarily rate limited. Please try again in a moment.`,
            429,
            { fallbackEligible: true }
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
            429,
            { fallbackEligible: true }
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
            503,
            { fallbackEligible: true }
        );
    }

    if (fallbackEligible) {
        return createFriendlyError(fallbackMessage, 500, {
            fallbackEligible: true
        });
    }

    return createFriendlyError(fallbackMessage, 500);
}

// Groq is the active provider, but the service stays isolated so Gemini can remain available.
function createGroqService() {
    const apiKey = process.env.GROQ_API_KEY;
    const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
    const client = apiKey ? new Groq({ apiKey }) : null;

    // We delay the configuration failure until the endpoint is actually used.
    function assertClient() {
        if (!client) {
            throw createFriendlyError(
                "Groq API key is missing from the environment.",
                500
            );
        }
    }

    // Summaries stay concise and predictable so the popup can render them directly.
    async function summarize(text) {
        assertClient();

        const pageText = cleanText(trimPageText(text));

        try {
            const response = await client.chat.completions.create({
                model,
                messages: [
                    {
                        role: "user",
                        content: `
Summarize the following webpage in 5-8 concise bullet points.

${pageText}
`
                    }
                ],
                temperature: 0.2
            });

            const summary = response?.choices?.[0]?.message?.content;
            return cleanText(summary) || "No summary could be generated.";
        } catch (error) {
            throw normalizeProviderError(error, "Groq", "Failed to generate summary.");
        }
    }

    // The answer endpoint keeps the existing contract but the provider logic lives here.
    async function ask(text, question) {
        assertClient();

        const pageText = cleanText(trimPageText(text));

        try {
            const response = await client.chat.completions.create({
                model,
                messages: [
                    {
                        role: "user",
                        content: `
You are answering questions about a webpage.

WEBPAGE:
${pageText}

QUESTION:
${cleanText(question)}

Answer using only information from the webpage.
`
                    }
                ],
                temperature: 0.2
            });

            const answer = response?.choices?.[0]?.message?.content;
            return cleanText(answer) || "No answer could be generated.";
        } catch (error) {
            throw normalizeProviderError(error, "Groq", "Failed to answer.");
        }
    }

    async function securityVerify(evidence) {
        assertClient();

        try {
            const response =
                await client.chat.completions.create({
                    model,
                    messages: [
                        {
                            role: "user",
                            content: `
You are a cybersecurity analyst.

Analyze this webpage evidence.

EVIDENCE:
${JSON.stringify(evidence, null, 2)}

Respond ONLY in JSON:

{
  "verdict":"safe|suspicious|dangerous",
  "confidence":0,
  "explanation":"short explanation"
}
`
                        }
                    ],
                    temperature: 0.1
                });

            return response?.choices?.[0]?.message?.content;
        }
        catch (error) {
            throw normalizeProviderError(
                error,
                "Groq",
                "Failed security verification."
            );
        }
    }

    async function privacySummary(policyText) {
        assertClient();

        try {
            const response =
                await client.chat.completions.create({
                    model: "llama-3.3-70b-versatile",
                    messages: [
                        {
                            role: "system",
                            content:
`You are a privacy analyst.

Analyze the privacy policy and provide:

1. Data Collected
2. Data Sharing Practices
3. Data Retention
4. User Rights
5. Risk Level

Keep the response under 150 words.`
                        },
                        {
                            role: "user",
                            content: policyText
                        }
                    ],
                    temperature: 0.2
                });

            return response.choices[0].message.content;
        } catch (error) {
            throw normalizeProviderError(
                error,
                "Groq",
                "Failed to generate privacy summary."
            );
        }
    }

    async function extractGraphData(text) {
        assertClient();

        const pageText = cleanText(trimPageText(text));
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
            const response = await client.chat.completions.create({
                model,
                messages: [
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.1
            });

            const content = response?.choices?.[0]?.message?.content;
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

    return {
        ask,
        summarize,
        securityVerify,
        privacySummary,
        extractGraphData
    };
}

module.exports = {
    createGroqService
};