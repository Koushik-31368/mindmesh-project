# MindMesh Automated Tests

This directory contains automated, assertion-based test suites for core system logic. These tests ensure the reliability of mathematical algorithms, content processing, and heuristic evaluation without requiring external dependencies or AI provider connections.

## Included Test Suites

1. **Chunker Service Test** (`testChunker.js`)
   - Verifies paragraph splitting logic.
   - Validates sliding window overlap mechanism.
   - Ensures edge cases (empty strings, strings smaller than chunk size) are handled correctly without throwing.

2. **Cosine Similarity Test** (`testCosineSimilarity.js`)
   - Tests semantic vector comparison math.
   - Verifies proper outputs for identical (~1.0), opposite (~-1.0), and orthogonal (0) vectors.
   - Confirms graceful handling of missing, empty, or undefined arrays.

3. **Security Heuristic Test** (`testHeuristicScanner.js`)
   - Tests the subtractive scoring algorithm for page safety.
   - Verifies the trusted domain allowlist bypasses penalties.
   - Confirms detection of lookalike domains and malicious URL structures.
   - Validates context-aware keyword analysis (e.g., login keywords only penalizing when password fields are present).
   - Validates context-aware form analysis (e.g., hidden elements only penalizing inside credential forms).

## Execution Instructions

All tests utilize Node.js's built-in `assert` module and can be run independently without any testing frameworks (like Jest or Mocha). No `.env` configuration is required for these pure-logic tests.

Run them individually from the repository root:

```bash
node backend/tests/testChunker.js
node backend/tests/testCosineSimilarity.js
node backend/tests/testHeuristicScanner.js
```

### Expected Output
Each test will output a clear `PASS` or `FAIL` message. On failure, the assertion error and message will be printed to stderr, and the process will exit with code `1`.
