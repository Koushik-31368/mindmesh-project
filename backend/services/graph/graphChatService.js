const { createGraphService } = require("./graphService");
const { searchSimilarChunks } = require("../memory/memoryService");
const { createAiService } = require("../providerFactory");

const graphService = createGraphService();
const aiService = createAiService();

async function answerHybrid(question) {
    // 1. Query the knowledge graph (performs multi-hop BFS traversal)
    const graphContext = await graphService.queryGraph(question);

    // 2. Query semantic memory (retrieves relevant text chunks)
    const memoryContext = await searchSimilarChunks(question, 5);

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
