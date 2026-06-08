require("dotenv").config();

const {
    getChunkEmbeddings,
    savePage
} = require("./services/memory/memoryService");

(async () => {
    const result = await savePage({
        url: "test://chunk-embeddings",
        title: "Chunk Embedding Test",
        content: [
            "Amazon S3 is cloud object storage.",
            "Embeddings convert chunk text into numeric vectors.",
            "MindMesh stores page chunks and embeddings in SQLite before vector search."
        ].join(" ")
    });

    const chunkEmbeddings = await getChunkEmbeddings(result.pageId);
    const first = chunkEmbeddings[0];

    console.log("page id:", result.pageId);
    console.log("chunk count:", result.chunkCount);
    console.log("saved embeddings:", chunkEmbeddings.length);
    console.log("embedding dimensions:", first?.dimensions);
    console.log("first 5 values:", first?.embedding.slice(0, 5));
})();
