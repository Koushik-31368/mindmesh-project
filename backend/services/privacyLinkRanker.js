function rankPrivacyLinks(links) {
    const priorities = [
        "privacy policy",
        "privacy notice",
        "privacy",
        "data policy"
    ];

    return [...links].sort((a, b) => {
        const aText = a.text.toLowerCase();
        const bText = b.text.toLowerCase();

        const aRank = priorities.findIndex(
            p => aText.includes(p)
        );

        const bRank = priorities.findIndex(
            p => bText.includes(p)
        );

        return (
            (aRank === -1 ? 999 : aRank) -
            (bRank === -1 ? 999 : bRank)
        );
    });
}

module.exports = { rankPrivacyLinks };
