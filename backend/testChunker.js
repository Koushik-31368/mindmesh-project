const {
    chunkText
} = require("./services/memory/chunkerService");

const text = "hello ".repeat(1000);

const chunks = chunkText(text);

console.log("Chunks:", chunks.length);

chunks.forEach((chunk, index) => {
    console.log(
        `Chunk ${index + 1}:`,
        chunk.split(/\s+/).length,
        "words"
    );
});