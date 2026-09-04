/**
 * Memory Routes — /api/memory
 * Exposes endpoints for saving pages, listing saved pages, finding related
 * content via semantic similarity, and chatting with saved memory.
 */
const express = require("express");
const router = express.Router();

const {
    savePage,
    getAllPages,
    searchSimilarChunks,
    getPageById
} = require("../services/memory/memoryService");
const { answerFromMemory } = require("../services/memory/memoryChatService");

/**
 * POST /api/memory/related
 * Finds semantically similar saved pages for the given text snippet.
 * @param {string} req.body.text - Current page text to match against
 * @param {string} req.body.currentUrl - URL to exclude from results
 */
router.post("/related", async (req, res) => {
    try {
        const { text, currentUrl } = req.body || {};
        if (!text || !String(text).trim()) {
            return res.json({ found: false });
        }

        const chunks = await searchSimilarChunks(text, 5);
        for (const chunk of chunks) {
            if (chunk.score > 0.90) {
                const page = await getPageById(chunk.pageId);
                if (page && page.url !== currentUrl) {
                    const savedAt = new Date(page.saved_at + 'Z'); // sqlite CURRENT_TIMESTAMP is UTC
                    const now = new Date();
                    const diffTime = Math.abs(now - savedAt);
                    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                    
                    return res.json({
                        found: true,
                        title: page.title,
                        url: page.url,
                        similarity: Math.round(chunk.score * 100),
                        daysSinceViewed: diffDays
                    });
                }
            }
        }
        
        res.json({ found: false });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post("/save", async (req, res) => {
    try {
        const result = await savePage(req.body);
        res.json(result);
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});

router.get("/pages", async (req, res) => {
    try {
        const pages = await getAllPages();
        res.json(pages);
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});

router.post("/chat", async (req, res) => {
    try {
        const { question } = req.body || {};
        if (!question || !String(question).trim()) {
            res.status(400).json({
                answer: "I could not find relevant information in saved memory."
            });
            return;
        }

        const answer = await answerFromMemory(question);
        res.json({
            answer
        });
    } catch (error) {
        res.status(500).json({
            answer: error.message
        });
    }
});

module.exports = router;
