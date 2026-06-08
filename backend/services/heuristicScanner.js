function analyzeUrl(url) {
    let score = 0;
    const reasons = [];

    try {
        const parsedUrl = new URL(url);
        const hostname = parsedUrl.hostname;

        // IP address URL
        if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
            score += 30;
            reasons.push("Uses IP address instead of domain");
        }

        // Too many subdomains
        const parts = hostname.split(".");
        if (parts.length > 4) {
            score += 15;
            reasons.push("Excessive subdomains");
        }

        // Suspicious TLDs
        const suspiciousTlds = [
            ".xyz",
            ".top",
            ".click",
            ".gq",
            ".tk"
        ];

        if (
            suspiciousTlds.some(tld =>
                hostname.endsWith(tld)
            )
        ) {
            score += 15;
            reasons.push("Suspicious top-level domain");
        }

        // URL shorteners
        const shorteners = [
            "bit.ly",
            "tinyurl.com",
            "goo.gl",
            "t.co"
        ];

        if (
            shorteners.includes(hostname)
        ) {
            score += 20;
            reasons.push("Uses URL shortener");
        }

        // Lookalike domains
        const lookalikePatterns = [
            /g00gle/i,
            /amaz0n/i,
            /paypa1/i,
            /micr0soft/i
        ];

        if (
            lookalikePatterns.some(pattern =>
                pattern.test(hostname)
            )
        ) {
            score += 40;
            reasons.push("Lookalike domain detected");
        }
    } catch {
        score += 20;
        reasons.push("Malformed URL");
    }

    return { score, reasons };
}

function analyzeKeywords(text) {
    let score = 0;
    const reasons = [];

    const suspiciousKeywords = [
        "verify account",
        "verify now",
        "urgent action",
        "account suspended",
        "claim reward",
        "gift card",
        "lottery",
        "bank verification",
        "password expired"
    ];

    const lowerText = text.toLowerCase();

    suspiciousKeywords.forEach(keyword => {
        if (lowerText.includes(keyword)) {
            score += 10;
            reasons.push(`Suspicious phrase detected: "${keyword}"`);
        }
    });

    const loginKeywords = [
        "login",
        "sign in",
        "password",
        "username",
        "authentication"
    ];

    const loginMatches = loginKeywords.filter(keyword =>
        lowerText.includes(keyword)
    ).length;

    if (loginMatches >= 3) {
        score += 15;
        reasons.push("Login page detected");
    }

    return { score, reasons };
}

function analyzeForms(html) {
    let score = 0;
    const reasons = [];

    const passwordFields =
        (html.match(/type=["']password["']/gi) || []).length;

    if (passwordFields > 0) {
        score += 20;
        reasons.push(
            `${passwordFields} password field(s) detected`
        );
    }

    const hasHiddenStyles = /display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0/i.test(html);
    if (hasHiddenStyles) {
        score += 15;
        reasons.push("Hidden form elements detected");
    }

    return { score, reasons };
}

function scanPage({ url, pageText, html }) {
    const urlResult = analyzeUrl(url);
    const keywordResult = analyzeKeywords(pageText);
    const formResult = analyzeForms(html);

    const score =
        urlResult.score +
        keywordResult.score +
        formResult.score;

    return {
        score,
        reasons: [
            ...urlResult.reasons,
            ...keywordResult.reasons,
            ...formResult.reasons
        ],
        details: {
            urlScore: urlResult.score,
            keywordScore: keywordResult.score,
            formScore: formResult.score
        }
    };
}

module.exports = {
    scanPage
};
