function cleanText(text) {
    return String(text || "").replace(/\s+/g, " ").trim();
}

function countMatches(text, patterns) {
    return patterns.reduce((count, pattern) => {
        const matches = text.match(pattern);
        return count + (matches ? matches.length : 0);
    }, 0);
}

function clampScore(score) {
    return Math.max(0, Math.min(100, Math.round(score)));
}

function riskFromScore(score) {
    if (score >= 70) {
        return "high";
    }

    if (score >= 35) {
        return "medium";
    }

    return "low";
}

function addSignal(signals, condition, score, reason) {
    if (condition) {
        signals.push({
            score,
            reason
        });
    }
}

function analyzePageSafety(text) {
    const cleanedText = cleanText(text);
    const normalizedText = cleanedText.toLowerCase();
    const signals = [];

    if (!cleanedText) {
        return {
            risk: "low",
            score: 0,
            reasons: ["No page text was available to analyze."]
        };
    }

    const credentialMatches = countMatches(normalizedText, [
        /\bpassword\b/g,
        /\blogin\b/g,
        /\bsign in\b/g,
        /\bverify your account\b/g,
        /\bconfirm your account\b/g,
        /\bsecurity code\b/g,
        /\bone[-\s]?time password\b/g,
        /\botp\b/g,
        /\bseed phrase\b/g,
        /\brecovery phrase\b/g,
        /\bprivate key\b/g,
        /\bcard number\b/g,
        /\bssn\b/g
    ]);

    const urgencyMatches = countMatches(normalizedText, [
        /\burgent\b/g,
        /\bimmediately\b/g,
        /\bwithin\s+\d+\s+(minutes?|hours?|days?)\b/g,
        /\bexpires?\s+(today|soon|now)\b/g,
        /\blast chance\b/g,
        /\bfinal notice\b/g,
        /\bact now\b/g,
        /\baccount (will be )?(locked|suspended|closed|disabled)\b/g
    ]);

    const impersonationMatches = countMatches(normalizedText, [
        /\bpaypal\b/g,
        /\bamazon\b/g,
        /\bmicrosoft\b/g,
        /\bgoogle\b/g,
        /\bapple\b/g,
        /\bnetflix\b/g,
        /\bbank\b/g,
        /\btax\b/g,
        /\birs\b/g,
        /\bsupport team\b/g,
        /\bsecurity team\b/g
    ]);

    const scamMatches = countMatches(normalizedText, [
        /\bwire transfer\b/g,
        /\bgift card\b/g,
        /\bcrypto\b/g,
        /\bbitcoin\b/g,
        /\bprize\b/g,
        /\bwinner\b/g,
        /\bclaim your reward\b/g,
        /\brefund pending\b/g,
        /\bprocessing fee\b/g,
        /\badvance fee\b/g,
        /\bguaranteed returns?\b/g
    ]);

    const linkPressureMatches = countMatches(normalizedText, [
        /\bclick here\b/g,
        /\bopen the link\b/g,
        /\bfollow this link\b/g,
        /\bupdate your information\b/g,
        /\bverify now\b/g,
        /\bunlock your account\b/g
    ]);

    addSignal(
        signals,
        credentialMatches >= 2,
        30,
        "The page repeatedly asks for credentials, security codes, payment details, or recovery secrets."
    );

    addSignal(
        signals,
        urgencyMatches >= 1,
        Math.min(25, urgencyMatches * 10),
        "The page uses urgency or account-lock language to pressure quick action."
    );

    addSignal(
        signals,
        impersonationMatches >= 1 && (credentialMatches >= 1 || urgencyMatches >= 1),
        20,
        "The page references a trusted brand or authority while asking for sensitive action."
    );

    addSignal(
        signals,
        scamMatches >= 2,
        25,
        "The page contains common scam indicators such as rewards, payment pressure, crypto, gift cards, or wire transfers."
    );

    addSignal(
        signals,
        linkPressureMatches >= 1 && (credentialMatches >= 1 || urgencyMatches >= 1),
        15,
        "The page pushes the user to click or verify information in a suspicious context."
    );

    addSignal(
        signals,
        credentialMatches >= 1 && urgencyMatches >= 1 && impersonationMatches >= 1,
        20,
        "Credential requests, urgency, and impersonation appear together, which is a strong phishing pattern."
    );

    const score = clampScore(signals.reduce((total, signal) => total + signal.score, 0));
    const reasons = signals.map((signal) => signal.reason);

    return {
        risk: riskFromScore(score),
        score,
        reasons: reasons.length > 0 ? reasons : ["No strong phishing or scam signals were found in the page text."]
    };
}

module.exports = {
    analyzePageSafety
};
