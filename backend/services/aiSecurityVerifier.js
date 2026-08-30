/**
 * AI Security Verifier
 * Delegates to the active AI provider (via providerFactory) to get a
 * second-opinion verdict on pages flagged by the heuristic scanner.
 * Returns a structured { verdict, confidence, explanation } response.
 */
const { createAiService } = require("./providerFactory");

const aiService = createAiService();

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
