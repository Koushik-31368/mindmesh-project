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

router.get("/network", async (req, res) => {
    try {
        const network = await graphService.getNetworkData();
        res.json(network);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Failed to get graph network"
        });
    }
});

router.get("/analytics", async (req, res) => {
    try {
        const analytics = await graphService.getAnalytics();
        res.json(analytics);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Failed to get graph analytics"
        });
    }
});

router.get("/source/:relationshipId", async (req, res) => {
    try {
        const source = await graphService.getRelationshipSource(req.params.relationshipId);
        if (!source) {
            return res.status(404).json({
                error: "Relationship source not found"
            });
        }
        res.json(source);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Failed to get relationship source"
        });
    }
});

module.exports = router;

