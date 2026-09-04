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

router.post("/analyze", async (req, res) => {
    try {
        const { html, url, policyText } = req.body;

        if (!url || typeof url !== "string" || !url.trim()) {
            return res.status(400).json({ error: "url is required and must be a non-empty string" });
        }

        // Note: html is passed directly to the service; sanitization is handled there
        const result = await analyzePrivacy(html, url, policyText);

        res.json(result);
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});

module.exports = router;
