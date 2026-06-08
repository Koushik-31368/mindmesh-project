require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { GoogleGenAI } = require("@google/genai");

const app = express();
const port = 3000;
const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

app.use(cors());
app.use(express.json({ limit: "2mb" }));

function cleanText(text) {
    return (text || "").replace(/\s+/g, " ").trim();
}

app.post("/summarize", async (req, res) => {
    try {
        const { text } = req.body || {};

        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: `
    Summarize the following webpage in 5-8 concise bullet points.

    ${text}
    `
        });

        res.json({
            summary: response.text
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            summary: "Failed to generate summary."
        });
    }
});

app.post("/ask", async (req, res) => {
    try {

        const { text, question } = req.body;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `
You are answering questions about a webpage.

WEBPAGE:
${text}

QUESTION:
${question}

Answer using only information
from the webpage.
`
        });

        res.json({
            answer: response.text
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            answer: "Failed to answer."
        });

    }
});

app.get("/health", (_req, res) => {
    res.json({ ok: true });
});

app.listen(port, () => {
    console.log(`MindMesh backend listening on http://localhost:${port}`);
});
