const express = require("express");
const router = express.Router();

const {
    savePage,
    getAllPages
} = require("../services/memory/memoryService");
const { answerFromMemory } = require("../services/memory/memoryChatService");

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
