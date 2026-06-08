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
