/**
 * AI Security Verifier
 * Delegates to the active AI provider (via providerFactory) to get a
 * second-opinion verdict on pages flagged by the heuristic scanner.
 * Returns a structured { verdict, confidence, explanation } response.
 */
const { createAiService } = require("./providerFactory");

const aiService = createAiService();

/**
 * Uses the active AI provider to verify heuristic security flags.
 * @param {{url: string, score: number, reasons: string[], pageSnippet: string}} params
 * @returns {Promise<object>} AI security verdict.
 */
async function verifySecurity(evidence) {
    try {
        const raw = await aiService.securityVerify(evidence);
        return JSON.parse(raw);
    } catch {
        return {
            verdict: "unknown",
            confidence: 0,
            explanation: "AI verification unavailable"
        };
    }
}

module.exports = {
    verifySecurity
};
