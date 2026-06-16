const assert = require('assert');
const { cosineSimilarity } = require('../services/memory/memoryService');

console.log("Running Cosine Similarity Tests...");

try {
    // 1. Identical vectors
    const vecA = [1, 2, 3];
    const vecA2 = [1, 2, 3];
    const simIdentical = cosineSimilarity(vecA, vecA2);
    // Floating point math might not be exactly 1.0, but should be very close
    assert.ok(Math.abs(simIdentical - 1.0) < 0.0001, "Identical vectors should have similarity ~1.0");

    // 2. Opposite vectors
    const vecB = [-1, -2, -3];
    const simOpposite = cosineSimilarity(vecA, vecB);
    assert.ok(Math.abs(simOpposite - (-1.0)) < 0.0001, "Opposite vectors should have similarity ~-1.0");

    // 3. Orthogonal vectors
    const vecC = [1, 0, 0];
    const vecD = [0, 1, 0];
    const simOrthogonal = cosineSimilarity(vecC, vecD);
    assert.strictEqual(simOrthogonal, 0, "Orthogonal vectors should have similarity 0");

    // 4. Empty vector handling
    assert.strictEqual(cosineSimilarity([], [1, 2, 3]), 0, "Empty vector should return 0");
    assert.strictEqual(cosineSimilarity([1, 2, 3], []), 0, "Empty vector should return 0");
    assert.strictEqual(cosineSimilarity([], []), 0, "Two empty vectors should return 0");
    assert.strictEqual(cosineSimilarity(null, undefined), 0, "Null/undefined should return 0");

    console.log("PASS: Cosine Similarity Tests");
} catch (error) {
    console.error("FAIL: Cosine Similarity Tests");
    console.error(error.message);
    process.exit(1);
}
