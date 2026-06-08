function analyzePolicy(policyText) {
    const text = policyText.toLowerCase();

    return {
        collectsEmail:
            text.includes("email"),

        collectsPhone:
            text.includes("phone"),

        collectsLocation:
            text.includes("location") ||
            text.includes("geolocation"),

        collectsAddress:
            text.includes("address"),

        sharesWithThirdParties:
            text.includes("third party") ||
            text.includes("advertising partners") ||
            text.includes("partners"),

        retentionMentioned:
            text.includes("retention") ||
            text.includes("retain") ||
            text.includes("storage period")
    };
}

module.exports = {
    analyzePolicy
};
