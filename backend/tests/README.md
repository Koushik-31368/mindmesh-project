# MindMesh Backend Tests

This directory contains standalone execution scripts to verify backend services.

## Prerequisites
- Node.js v18+
- `.env` file present in the `backend/` directory with `GROQ_API_KEY` and `GEMINI_API_KEY`.

## Running Tests
Tests can be executed directly via Node from the root of the repository:

```bash
node backend/tests/testChunker.js
node backend/tests/testEmbedding.js
node backend/tests/testChunkEmbeddings.js
node backend/tests/testSemanticSearch.js
node backend/tests/testMemoryChat.js
node backend/tests/testSecurityService.js
```

## Expected Outputs

- **testChunker.js**: Should output the total number of chunks and word counts per chunk for a synthetic 1000-word text string.
- **testEmbedding.js**: Should call the Gemini Embedding API and output the length (dimensions) and first 5 values of the float array for a single sentence.
- **testChunkEmbeddings.js**: Should save a mock page, chunk it, embed it, and verify the correct chunk count and vector dimensions were stored in the SQLite database.
- **testSemanticSearch.js**: Should populate SQLite with three distinct mock pages and perform a vector search for "serverless AWS service", verifying that the "AWS Lambda" chunk ranks highest.
- **testMemoryChat.js**: Should populate SQLite, perform semantic search, and synthesize an answer mentioning "AWS Lambda", verifying the RAG pipeline end-to-end.
- **testSecurityService.js**: Should test the heuristic and AI scanner against three mock webpages (a lookalike phishing page, a hidden elements scam, and a safe page), outputting the risk score and AI verdict for each.
