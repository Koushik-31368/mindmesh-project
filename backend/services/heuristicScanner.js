// Trusted domains that should bypass heuristic scanning entirely.
// These are well-known, established domains that are structurally safe.
const TRUSTED_DOMAINS = new Set([
    "google.com",
    "google.co.in",
    "youtube.com",
    "wikipedia.org",
    "github.com",
    "stackoverflow.com",
    "microsoft.com",
    "apple.com",
    "amazon.com",
    "linkedin.com",
    "twitter.com",
    "x.com",
    "reddit.com",
    "medium.com",
    "notion.so",
    "figma.com",
    "vercel.com",
    "netlify.com",
    "npmjs.com",
    "mozilla.org",
    "w3.org",
    "developer.mozilla.org",
    "docs.google.com",
    "mail.google.com",
    "drive.google.com",
    "outlook.com",
    "live.com",
    "office.com",
    "bing.com",
    "duckduckgo.com",
    "cloudflare.com",
    "aws.amazon.com",
    "firebase.google.com",
    "stripe.com",
    "paypal.com",
    "twitch.tv",
    "spotify.com",
    "netflix.com",
    "bbc.com",
    "bbc.co.uk",
    "cnn.com",
    "nytimes.com",
    "theguardian.com",
    "reuters.com",
    "facebook.com",
    "instagram.com",
    "whatsapp.com"
]);

/**
 * Check if a hostname belongs to a trusted domain.
 * Handles subdomains (e.g., en.wikipedia.org matches wikipedia.org).
 */
function isTrustedDomain(hostname) {
    const lower = hostname.toLowerCase();

    // Exact match
    if (TRUSTED_DOMAINS.has(lower)) return true;

    // Check if it's a valid subdomain of a trusted domain
    // Must be preceded by a dot to prevent matching "fake-wikipedia.org"
    for (const trusted of TRUSTED_DOMAINS) {
        if (lower.endsWith("." + trusted)) {
            // Also ensure it's truly a subdomain and not just a query param hack or similar
            const prefix = lower.slice(0, -(trusted.length + 1));
            // Basic check to ensure prefix isn't empty or containing weird characters
            if (prefix.length > 0 && /^[a-z0-9.-]+$/.test(prefix)) {
                return true;
            }
        }
    }
    return false;
}

function analyzeUrl(url) {
    let penalty = 0;
    const reasons = [];

    try {
        const parsedUrl = new URL(url);
        const hostname = parsedUrl.hostname;

        // Trusted domain — skip all heuristics
        if (isTrustedDomain(hostname)) {
            return { penalty: 0, reasons: [], trusted: true };
        }

        // IP address URL — very suspicious
        if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
            penalty += 30;
            reasons.push("Uses IP address instead of domain name");
        }

        // Excessive subdomains
        const parts = hostname.split(".");
        if (parts.length > 4) {
            penalty += 15;
            reasons.push("Excessive subdomains detected");
        }

        // Suspicious TLDs
        const suspiciousTlds = [".xyz", ".top", ".click", ".gq", ".tk", ".ml", ".ga", ".cf", ".buzz", ".icu"];
        if (suspiciousTlds.some(tld => hostname.endsWith(tld))) {
            penalty += 20;
            reasons.push("Suspicious top-level domain");
        }

        // URL shorteners
        const shorteners = ["bit.ly", "tinyurl.com", "goo.gl", "t.co", "is.gd", "v.gd"];
        if (shorteners.includes(hostname)) {
            penalty += 15;
            reasons.push("Uses URL shortener");
        }

        // Lookalike domains — strongest signal
        const lookalikePatterns = [
            /g00gle/i, /amaz0n/i, /paypa1/i, /micr0soft/i,
            /faceb00k/i, /app1e/i, /netfl1x/i, /1inkedin/i,
            /paypal.*secure/i, /secure.*paypal/i
        ];
        if (lookalikePatterns.some(pattern => pattern.test(hostname))) {
            penalty += 40;
            reasons.push("Lookalike domain — possible impersonation");
        }

    } catch {
        penalty += 20;
        reasons.push("Malformed URL");
    }

    return { penalty, reasons, trusted: false };
}

/**
 * Keyword analysis with context awareness.
 * Only flags keywords when they appear alongside credential harvesting indicators.
 */
function analyzeKeywords(text, hasPasswordFields) {
    let penalty = 0;
    const reasons = [];
    const lowerText = (text || "").toLowerCase();

    // High-confidence phishing phrases — always flag these
    const phishingPhrases = [
        "verify your account immediately",
        "your account has been suspended",
        "claim your reward",
        "you have won a gift card",
        "lottery winner",
        "bank verification required",
        "password has expired",
        "urgent: update your payment"
    ];

    let phishingCount = 0;
    phishingPhrases.forEach(phrase => {
        if (lowerText.includes(phrase)) {
            phishingCount++;
            reasons.push(`Phishing phrase: "${phrase}"`);
        }
    });
    // Cap at 30 points for keywords
    penalty += Math.min(phishingCount * 10, 30);

    // Scam and Piracy keywords - apply independently of password fields
    const scamPhrases = [
        "download free movie",
        "crack",
        "keygen",
        "torrent",
        "crypto double",
        "guaranteed return",
        "free download full version",
        "piratebay",
        "yts",
        "1337x",
        "putlocker",
        "fmovies",
        "watch free online",
        "nulled",
        "cracked software"
    ];

    let scamCount = 0;
    scamPhrases.forEach(phrase => {
        if (lowerText.includes(phrase)) {
            scamCount++;
            reasons.push(`Suspicious term detected: "${phrase}"`);
        }
    });
    // Cap at 45 points for scams (enough to push into warning/danger territory)
    penalty += Math.min(scamCount * 15, 45);

    // Login-related keywords — ONLY flag if page also has password input fields.
    // This prevents Wikipedia articles about "authentication" from being flagged.
    if (hasPasswordFields) {
        const loginKeywords = ["login", "sign in", "password", "username", "authentication"];
        const loginMatches = loginKeywords.filter(kw => lowerText.includes(kw)).length;
        if (loginMatches >= 3) {
            penalty += 10;
            reasons.push("Multiple login-related keywords with password fields present");
        }
    }

    return { penalty, reasons };
}

/**
 * Form analysis with context awareness.
 * Hidden elements are only flagged when they appear inside forms with password fields.
 */
function analyzeForms(html) {
    let penalty = 0;
    const reasons = [];
    const hasPasswordFields = (html.match(/type=["']password["']/gi) || []).length > 0;

    if (hasPasswordFields) {
        penalty += 15;
        reasons.push("Password input field detected");

        // Check if form action points to a suspicious external URL
        const formActionMatch = html.match(/action=["']([^"']+)["']/i);
        if (formActionMatch) {
            const action = formActionMatch[1];
            if (action.startsWith("http") && !action.includes(new URL("https://placeholder.com").hostname)) {
                // External form action with password field — suspicious
                penalty += 10;
                reasons.push("Form submits to external endpoint");
            }
        }

        // Hidden elements are ONLY suspicious when inside a page that also has password fields
        const hiddenCount = (html.match(/display\s*:\s*none/gi) || []).length;
        if (hiddenCount > 5) {
            penalty += 5;
            reasons.push(`${hiddenCount} hidden elements on a page with login forms`);
        }
    }

    // Note: We deliberately do NOT flag display:none on pages without password fields.
    // Every modern website uses display:none for menus, modals, tooltips, etc.

    return { penalty, reasons, hasPasswordFields };
}

/**
 * Run all heuristic safety checks on a page and produce a composite score.
 * @param {{ url: string, pageText: string, html: string }} params
 * @returns {{ score: number, reasons: string[], details: object }}
 */
function scanPage({ url, pageText, html }) {
    const formResult = analyzeForms(html);
    const urlResult = analyzeUrl(url);

    // If the domain is trusted, return immediately with a high score
    if (urlResult.trusted) {
        return {
            score: 95,
            reasons: ["Domain is in the trusted allowlist"],
            details: {
                urlPenalty: 0,
                keywordPenalty: 0,
                formPenalty: 0,
                trusted: true
            }
        };
    }

    const keywordResult = analyzeKeywords(pageText, formResult.hasPasswordFields);

    const totalPenalty = urlResult.penalty + keywordResult.penalty + formResult.penalty;

    // Subtractive scoring: start at 100, subtract penalties
    const score = Math.max(0, 100 - totalPenalty);

    return {
        score,
        reasons: [
            ...urlResult.reasons,
            ...keywordResult.reasons,
            ...formResult.reasons
        ],
        details: {
            urlPenalty: urlResult.penalty,
            keywordPenalty: keywordResult.penalty,
            formPenalty: formResult.penalty,
            trusted: false
        }
    };
}

module.exports = {
    scanPage
};
