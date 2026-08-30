/**
 * Scan page HTML for known third-party tracking scripts.
 * @param {string} html - Raw HTML content of the page.
 * @returns {{ count: number, trackers: string[] }} Detected tracker names.
 */
function scanTrackers(html) {
    const trackers = [];

    const trackerPatterns = [
        {
            name: "Google Analytics",
            pattern: /google-analytics\.com|gtag\(/i
        },
        {
            name: "Google Tag Manager",
            pattern: /googletagmanager\.com/i
        },
        {
            name: "Facebook Pixel",
            pattern: /connect\.facebook\.net|fbq\(/i
        },
        {
            name: "Hotjar",
            pattern: /hotjar/i
        },
        {
            name: "Mixpanel",
            pattern: /mixpanel/i
        },
        {
            name: "Segment",
            pattern: /segment\.com|analytics\.js/i
        },
        {
            name: "LinkedIn Insight",
            pattern: /snap\.licdn\.com/i
        },
        {
            name: "TikTok Pixel",
            pattern: /analytics\.tiktok\.com|ttq\.track/i
        },
        {
            name: "Twitter/X Pixel",
            pattern: /static\.ads-twitter\.com|twq\(/i
        },
        {
            name: "Pinterest Tag",
            pattern: /pintrk\(|s\.pinimg\.com/i
        },
        {
            name: "Snap Pixel",
            pattern: /sc-static\.net\/scevent/i
        },
        {
            name: "Microsoft Clarity",
            pattern: /clarity\.ms/i
        }
    ];

    trackerPatterns.forEach((tracker) => {
        if (tracker.pattern.test(html)) {
            trackers.push(tracker.name);
        }
    });

    return {
        count: trackers.length,
        trackers
    };
}

module.exports = { scanTrackers };
