const express = require("express");
const router = express.Router();

const {
    analyzePageSafety
} = require("../services/securityService");

router.post("/analyze", async (req, res) => {
    try {
        const {
            url,
            pageText,
            html
        } = req.body;

        if (!url) {
            return res.status(400).json({
                error: "URL is required"
            });
        }

        const result =
            await analyzePageSafety({
                url,
                pageText: pageText || "",
                html: html || ""
            });

        return res.json(result);

    } catch (error) {
        console.error(
            "Security analysis error:",
            error
        );

        return res.status(500).json({
            error:
                "Failed to analyze page safety"
        });
    }
});

module.exports = router;
