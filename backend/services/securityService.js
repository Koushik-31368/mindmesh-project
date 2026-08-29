/**
 * Security Service — Orchestrates heuristic scanning and AI verification
 * to produce a composite safety verdict for any given webpage.
 */
const { scanPage } = require("./heuristicScanner");
const { verifySecurity } = require("./aiSecurityVerifier");

/**
 * New scoring model: subtractive from 100.
 *   Score >= 70  → safe
 *   Score 40-69  → suspicious (warning)
 *   Score < 40   → dangerous
 */
function getRiskLevel(score) {
    if (score >= 70) return "safe";
    if (score >= 40) return "suspicious";
    return "dangerous";
}

async function analyzePageSafety({ url, pageText, html }) {
    const scanResult = scanPage({ url, pageText, html });

    let aiVerification = null;

    // Only invoke AI verification for suspicious or dangerous pages
    // (score < 70 means something was flagged)
    if (scanResult.score < 70 && !scanResult.details.trusted) {
        try {
            aiVerification = await verifySecurity({
                url,
                score: scanResult.score,
                reasons: scanResult.reasons,
                pageSnippet: (pageText || "").slice(0, 1000)
            });
        } catch (err) {
            console.error("AI security verification failed:", err.message);
        }
    }

    return {
        riskScore: scanResult.score,
        riskLevel: getRiskLevel(scanResult.score),
        reasons: scanResult.reasons,
        details: scanResult.details,
        aiVerification
    };
}

module.exports = {
    analyzePageSafety
};
