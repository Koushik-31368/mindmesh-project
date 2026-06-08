const express = require("express");

const router = express.Router();

const {
    analyzePrivacy
} = require("../services/privacyService");

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
