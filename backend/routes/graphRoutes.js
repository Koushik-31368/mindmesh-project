const express = require("express");

const router = express.Router();

const {
    createGraphService
} = require("../services/graph/graphService");

const {
    answerHybrid
} = require("../services/graph/graphChatService");

const graphService =
    createGraphService();

router.post("/build", async (req, res) => {

    try {

        const result =
            await graphService.buildGraph();

        res.json(result);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: "Failed to build graph"
        });
    }
});

router.get("/stats", async (req, res) => {

    try {

        const stats =
            await graphService.getStats();

        res.json(stats);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: "Failed to get stats"
        });
    }
});

router.post("/query", async (req, res) => {

    try {

        const { question } = req.body;

        const result =
            await graphService.queryGraph(
                question
            );

        res.json(result);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: "Failed to query graph"
        });
    }
});

router.post("/chat", async (req, res) => {
    try {
        const { question } = req.body;
        const result = await answerHybrid(question);
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Failed hybrid chat query"
        });
    }
});

module.exports = router;
