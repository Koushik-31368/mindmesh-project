const { scanTrackers } = require("./trackerScanner");
const { scanDataCollection } = require("./dataCollectionScanner");
const { analyzePolicy } = require("./privacyPolicyAnalyzer");
const { findPrivacyLinks } = require("./privacyDiscoveryService");
const { fetchPrivacyPolicy } = require("./privacyFetchService");
const { rankPrivacyLinks } = require("./privacyLinkRanker");
const { createAiService } = require("./providerFactory");

const aiService = createAiService();

function calculateRisk(data, trackerCount) {
    let score = 0;

    if (data.email) score += 10;
    if (data.phone) score += 10;
    if (data.password) score += 15;
    if (data.address) score += 15;
    if (data.location) score += 15;

    score += trackerCount * 10;

    let level = "Low";

    if (score > 20) level = "Medium";
    if (score > 50) level = "High";
    if (score > 80) level = "Critical";

    return {
        score,
        level
    };
}

async function analyzePrivacy(html, url = "", policyText = "") {
    const trackerResult = scanTrackers(html);

    const dataResult = scanDataCollection(html);

    const risk = calculateRisk(
        dataResult,
        trackerResult.count
    );

    const privacyLinks = findPrivacyLinks(html);
    const rankedLinks = rankPrivacyLinks(privacyLinks);

    let autoFetched = false;
    if (!policyText && rankedLinks.length > 0 && url) {
        const fetchedPolicy = await fetchPrivacyPolicy(url, rankedLinks[0]);
        if (fetchedPolicy) {
            policyText = fetchedPolicy.text;
            autoFetched = true;
        }
    }

    const policyResult = analyzePolicy(policyText);

    let aiSummary = null;
    if (policyText && policyText.length > 1000) {
        try {
            aiSummary = await aiService.privacySummary(policyText.slice(0, 12000));
        } catch (error) {
            console.error("Privacy summary failed:", error.message);
        }
    }

    return {
        trackers: trackerResult,
        dataCollected: dataResult,
        risk,
        policy: policyResult,
        privacyLinks: rankedLinks,
        autoFetched,
        aiSummary
    };
}

module.exports = {
    analyzePrivacy
};
