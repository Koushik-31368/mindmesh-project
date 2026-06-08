const axios = require("axios");
const cheerio = require("cheerio");

async function fetchPrivacyPolicy(baseUrl, privacyLink) {
    try {
        const policyUrl =
            new URL(
                privacyLink.href,
                baseUrl
            ).toString();

        const response =
            await axios.get(policyUrl, {
                timeout: 10000
            });

        const $ =
            cheerio.load(response.data);

        const policyText =
            $("body").text();

        return {
            url: policyUrl,
            text: policyText
                .replace(/\s+/g, " ")
                .trim()
        };
    } catch (error) {
        return null;
    }
}

module.exports = {
    fetchPrivacyPolicy
};
