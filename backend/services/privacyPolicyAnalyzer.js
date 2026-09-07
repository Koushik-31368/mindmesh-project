/**
 * Privacy Policy Analyzer
 * Performs keyword-based analysis of privacy policy text to detect what
 * categories of personal data a site collects, whether it shares data
 * with third parties, and whether data retention is mentioned.
 */
/**
 * Analyzes privacy policy text for data collection, sharing, and compliance signals.
 * @param {string} policyText - The full text of a privacy/cookie policy page.
 * @returns {object} Detected signals as boolean flags.
 */
function analyzePolicy(policyText) {
    const text = policyText.toLowerCase();

    return {
        collectsEmail:
            text.includes("email"),

        collectsPhone:
            text.includes("phone"),

        collectsLocation:
            text.includes("location") ||
            text.includes("geolocation"),

        collectsAddress:
            text.includes("address"),

        sharesWithThirdParties:
            text.includes("third party") ||
            text.includes("advertising partners") ||
            text.includes("partners"),

        retentionMentioned:
            text.includes("retention") ||
            text.includes("retain") ||
            text.includes("storage period")
    };
}

module.exports = {
    analyzePolicy
};
