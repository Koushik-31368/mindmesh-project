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
/**
 * Converts a numeric heuristic score (0–100) to a risk level label.
 * - score >= 70  → "safe"
 * - score 40–69  → "suspicious"
 * - score < 40   → "dangerous"
 * @param {number} score
 * @returns {"safe"|"suspicious"|"dangerous"}
 */
function getRiskLevel(score) {
    if (score >= 70) return "safe";
    if (score >= 40) return "suspicious";
    return "dangerous";
}

/**
 * Orchestrates heuristic scanning and optional AI verification for a page.
 * AI verification is only triggered when the heuristic score is below 70
 * and the page is not on a trusted domain list.
 * @param {object} params
 * @param {string} params.url      - The URL of the page to analyze.
 * @param {string} params.pageText - Visible text content of the page.
 * @param {string} params.html     - Raw HTML of the page.
 * @returns {Promise<object>} Safety result with riskScore, riskLevel, reasons, and aiVerification.
 */
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
