/**
 * Privacy Fetch Service
 * Fetches the full text content of a privacy policy page given its URL.
 * Uses axios for HTTP requests and cheerio for HTML-to-text extraction.
 */
const axios = require("axios");
const cheerio = require("cheerio");

/**
 * Fetches and extracts plain text from a privacy policy URL.
 * @param {string} baseUrl - Base page URL used to resolve relative hrefs.
 * @param {{href: string}} link - The privacy link to fetch.
 * @returns {Promise<{text: string}|null>}
 */
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
