const { scanPage } = require("./heuristicScanner");
const {
    verifySecurity
} = require("./aiSecurityVerifier");

function getRiskLevel(score) {
    if (score >= 70) {
        return "dangerous";
    }

    if (score >= 30) {
        return "suspicious";
    }

    return "safe";
}

async function analyzePageSafety({
    url,
    pageText,
    html
}) {
    const scanResult = scanPage({
        url,
        pageText,
        html
    });

    let aiVerification = null;

    if (scanResult.score >= 50) {
        aiVerification =
            await verifySecurity({
                url,
                score: scanResult.score,
                reasons: scanResult.reasons,
                pageSnippet:
                    (pageText || "")
                    .slice(0, 1000)
            });
    }

    return {
        riskScore: scanResult.score,
        riskLevel: getRiskLevel(
            scanResult.score
        ),
        reasons: scanResult.reasons,
        details: scanResult.details,
        aiVerification
    };
}

module.exports = {
    analyzePageSafety
};
