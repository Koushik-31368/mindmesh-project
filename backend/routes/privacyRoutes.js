/**
 * Privacy Routes — /api/privacy
 * Exposes the /analyze endpoint which orchestrates tracker scanning,
 * data collection detection, policy discovery, and AI-powered summaries.
 */
const express = require("express");

const router = express.Router();

const {
    analyzePrivacy
} = require("../services/privacyService");

/**
 * POST /api/privacy/analyze
 * @param {string} req.body.html - Raw HTML of the page
 * @param {string} req.body.url  - URL of the page being analyzed
 * @param {string} req.body.policyText - Optional extracted policy text
 * @returns {object} Privacy analysis result
 */
router.post("/analyze", async (req, res) => {
    try {
        const { html, url, policyText } = req.body;

        const result = await analyzePrivacy(html, url, policyText);

        res.json(result);
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});

module.exports = router;
