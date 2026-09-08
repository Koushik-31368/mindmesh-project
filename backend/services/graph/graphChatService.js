const { createGraphService } = require("./graphService");
const { searchSimilarChunks } = require("../memory/memoryService");
const { createAiService } = require("../providerFactory");

const graphService = createGraphService();
const aiService = createAiService();

/** Top-K memory chunks used alongside graph context in hybrid answers. */
const GRAPH_MEMORY_TOP_K = 5;

/**
 * Hybrid Q&A combining graph traversal with semantic RAG retrieval.
 * @param {string} question
 * @returns {Promise<{answer: string, graphContext: object, memoryContext: object[]}>}
 */
async function answerHybrid(question) {
    // 1. Query the knowledge graph (performs multi-hop BFS traversal)
    const graphContext = await graphService.queryGraph(question);

    // 2. Query semantic memory (retrieves relevant text chunks)
    const memoryContext = await searchSimilarChunks(question, GRAPH_MEMORY_TOP_K);

    // 3. Synthesize the final answer using the active AI provider
    const answer = await aiService.answerQuestion(
        question,
        graphContext,
        memoryContext
    );

    return {
        answer,
        graphContext,
        memoryContext: memoryContext.map(chunk => ({
            chunkText: chunk.chunkText,
            score: chunk.score
        }))
    };
}

module.exports = {
    answerHybrid
};
