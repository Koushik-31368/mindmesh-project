const assert = require('assert');
const { scanPage } = require('../services/heuristicScanner');

console.log("Running Security Heuristic Tests...");

try {
    // 1. Trusted domain detection
    const trustedResult = scanPage({ url: "https://wikipedia.org/wiki/Phishing", pageText: "phishing login password", html: "" });
    assert.strictEqual(trustedResult.details.trusted, true, "Wikipedia should be a trusted domain");
    assert.strictEqual(trustedResult.score, 95, "Trusted domain should score 95");

    // 2. Phishing URL detection (lookalike domain)
    const phishingResult = scanPage({ url: "http://paypa1.com/login", pageText: "welcome", html: "" });
    assert.strictEqual(phishingResult.details.trusted, false, "Lookalike domain should not be trusted");
    assert.ok(phishingResult.details.urlPenalty > 0, "Lookalike domain should incur a URL penalty");

    // 3. Suspicious keyword detection
    // Scams always penalize.
    const scamResult = scanPage({ url: "https://unknown-site.com", pageText: "download free movie guarantee return crack", html: "" });
    assert.ok(scamResult.details.keywordPenalty > 0, "Scam keywords should incur penalty");

    // Login keywords only penalize if password field exists!
    const loginNoPasswordResult = scanPage({ url: "https://unknown-site.com", pageText: "login password username authentication", html: "<div></div>" });
    assert.strictEqual(loginNoPasswordResult.details.keywordPenalty, 0, "Login keywords without password field should NOT incur penalty");

    const loginWithPasswordResult = scanPage({ url: "https://unknown-site.com", pageText: "login password username authentication", html: "<input type='password'>" });
    assert.ok(loginWithPasswordResult.details.keywordPenalty > 0, "Login keywords WITH password field should incur penalty");

    // 4. Hidden form detection
    const hiddenFormHtml = `<form><input type="password"><div style="display:none">hidden</div><div style="display:none">hidden</div><div style="display:none">hidden</div><div style="display:none">hidden</div><div style="display:none">hidden</div><div style="display:none">hidden</div></form>`;
    const hiddenFormResult = scanPage({ url: "https://unknown-site.com", pageText: "", html: hiddenFormHtml });
    assert.ok(hiddenFormResult.details.formPenalty > 0, "Forms with password fields and many hidden elements should incur penalty");

    console.log("PASS: Security Heuristic Tests");
} catch (error) {
    console.error("FAIL: Security Heuristic Tests");
    console.error(error.message);
    process.exit(1);
}
