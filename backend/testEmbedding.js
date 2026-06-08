require("dotenv").config();

const {
    generateEmbedding
} = require("./services/memory/embeddingService");

(async () => {
    const embedding = await generateEmbedding("Amazon S3 is cloud object storage");

    console.log("embedding length:", embedding.length);
    console.log("first 5 values:", embedding.slice(0, 5));
})();