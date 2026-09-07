/**
 * Privacy Discovery Service
 * Scans raw page HTML for links that point to privacy policy pages.
 * Uses regex-based anchor tag extraction and pattern matching to identify
 * relevant links (e.g., "privacy policy", "data policy").
 */
function findPrivacyLinks(html) {
    const patterns = [
        "privacy",
        "privacy policy",
        "privacy notice",
        "data policy"
    ];

    const matches = [];

    const linkRegex =
        /<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi;

    let match;

    while ((match = linkRegex.exec(html)) !== null) {
        const href = match[1];
        const text = match[2].toLowerCase();

        if (
            patterns.some(
                pattern =>
                    text.includes(pattern)
            )
        ) {
            matches.push({
                href,
                text
            });
        }
    }

    return matches;
}

module.exports = {
    findPrivacyLinks
};
