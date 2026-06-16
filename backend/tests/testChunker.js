const assert = require('assert');
const { chunkText } = require('../services/memory/chunkerService');

console.log("Running Chunker Service Tests...");

try {
    // 1. Verify basic chunk splitting
    const text1 = "word ".repeat(100).trim();
    const chunks1 = chunkText(text1, 50, 10);
    assert.strictEqual(chunks1.length, 3, "Failed to split into correct number of chunks");
    assert.strictEqual(chunks1[0].split(" ").length, 50, "First chunk should have 50 words");
    
    // 2. Verify chunk overlap
    const uniqueText = Array.from({length: 100}, (_, i) => `w${i}`).join(" ");
    const uniqueChunks = chunkText(uniqueText, 50, 10);
    // Last 10 words of chunk 1 should equal first 10 words of chunk 2
    const endOfChunk1 = uniqueChunks[0].split(" ").slice(-10).join(" ");
    const startOfChunk2 = uniqueChunks[1].split(" ").slice(0, 10).join(" ");
    assert.strictEqual(endOfChunk1, startOfChunk2, "Chunk overlap is incorrect");

    // 3. Verify edge cases: empty string
    const chunksEmpty = chunkText("", 50, 10);
    assert.deepStrictEqual(chunksEmpty, [], "Empty string should return empty array");

    // 4. Verify edge cases: text shorter than chunk size
    const shortText = "just a few words";
    const shortChunks = chunkText(shortText, 50, 10);
    assert.deepStrictEqual(shortChunks, [shortText], "Short text should return single chunk");

    console.log("PASS: Chunker Service Tests");
} catch (error) {
    console.error("FAIL: Chunker Service Tests");
    console.error(error.message);
    process.exit(1);
}
