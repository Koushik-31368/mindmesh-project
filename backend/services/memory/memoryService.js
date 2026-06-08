const db = require("./db");
const { chunkText } = require("./chunkerService");
const {
    EMBEDDING_MODEL,
    generateEmbedding
} = require("./embeddingService");
const { addChunks } = require("../retrieval/retrievalService");

const CHROMA_INDEXING_ENABLED = String(process.env.CHROMA_INDEXING_ENABLED || "false").toLowerCase() === "true";

function run(query, params = []) {
    return new Promise((resolve, reject) => {
        db.run(query, params, function (err) {
            if (err) {
                reject(err);
            } else {
                resolve(this);
            }
        });
    });
}

function all(query, params = []) {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

function embeddingToBuffer(embedding) {
    return Buffer.from(Float32Array.from(embedding).buffer);
}

function deserializeEmbedding(blob) {
    if (!blob) {
        return [];
    }

    const arrayBuffer = blob.buffer.slice(blob.byteOffset, blob.byteOffset + blob.byteLength);
    return Array.from(new Float32Array(arrayBuffer));
}

function cosineSimilarity(vectorA, vectorB) {
    if (!Array.isArray(vectorA) || !Array.isArray(vectorB)) {
        return 0;
    }

    const length = Math.min(vectorA.length, vectorB.length);

    if (length === 0) {
        return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let index = 0; index < length; index += 1) {
        const valueA = vectorA[index];
        const valueB = vectorB[index];

        dotProduct += valueA * valueB;
        normA += valueA * valueA;
        normB += valueB * valueB;
    }

    if (normA === 0 || normB === 0) {
        return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function saveChunkEmbedding(chunkId, embedding, model = EMBEDDING_MODEL) {
    if (!chunkId) {
        throw new Error("chunkId is required to save an embedding.");
    }

    if (!Array.isArray(embedding) || embedding.length === 0) {
        throw new Error("embedding must be a non-empty array.");
    }

    await run(
        `
            INSERT INTO chunk_embeddings
            (chunk_id, model, dimensions, embedding)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(chunk_id) DO UPDATE SET
                model = excluded.model,
                dimensions = excluded.dimensions,
                embedding = excluded.embedding,
                created_at = CURRENT_TIMESTAMP
        `,
        [chunkId, model, embedding.length, embeddingToBuffer(embedding)]
    );
}

async function getChunkEmbeddings(pageId) {
    const params = [];
    let whereClause = "";

    if (pageId) {
        whereClause = "WHERE c.page_id = ?";
        params.push(pageId);
    }

    const rows = await all(
        `
            SELECT
                ce.id,
                ce.chunk_id,
                c.page_id,
                c.chunk_index,
                c.chunk_text,
                ce.model,
                ce.dimensions,
                ce.embedding,
                ce.created_at
            FROM chunk_embeddings ce
            JOIN chunks c ON c.id = ce.chunk_id
            ${whereClause}
            ORDER BY c.page_id ASC, c.chunk_index ASC
        `,
        params
    );

    return rows.map((row) => ({
        ...row,
        embedding: deserializeEmbedding(row.embedding)
    }));
}

async function searchSimilarChunks(query, limit = 5) {
    const cleanedQuery = String(query || "").trim();

    if (!cleanedQuery) {
        return [];
    }

    const queryEmbedding = await generateEmbedding(cleanedQuery);
    const chunkEmbeddings = await getChunkEmbeddings();

    return chunkEmbeddings
        .map((chunk) => ({
            pageId: chunk.page_id,
            chunkId: chunk.chunk_id,
            score: cosineSimilarity(queryEmbedding, chunk.embedding),
            chunkText: chunk.chunk_text
        }))
        .sort((left, right) => right.score - left.score)
        .slice(0, limit);
}

async function savePage({ url, title, content }) {
    const safeContent = content || "";
    const chunks = chunkText(safeContent);
    const embeddings = [];

    for (const chunk of chunks) {
        embeddings.push(await generateEmbedding(chunk));
    }

    await run(
        `
            INSERT INTO pages
            (url, title, content)
            VALUES (?, ?, ?)
            ON CONFLICT(url) DO UPDATE SET
                title = excluded.title,
                content = excluded.content,
                saved_at = CURRENT_TIMESTAMP
        `,
        [url, title, safeContent]
    );

    const pageRow = await new Promise((resolve, reject) => {
        db.get(
            "SELECT id FROM pages WHERE url = ?",
            [url],
            (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            }
        );
    });

    const pageId = pageRow?.id;

    if (!pageId) {
        throw new Error("Saved page could not be found.");
    }

    await run("DELETE FROM chunks WHERE page_id = ?", [pageId]);

    for (let index = 0; index < chunks.length; index += 1) {
        const chunkResult = await run(
            `
                INSERT INTO chunks
                (page_id, chunk_index, chunk_text)
                VALUES (?, ?, ?)
            `,
            [pageId, index, chunks[index]]
        );

        await saveChunkEmbedding(chunkResult.lastID, embeddings[index]);
    }

    if (CHROMA_INDEXING_ENABLED) {
        try {
            await addChunks(pageId, chunks);
        } catch (error) {
            console.warn("Chroma indexing skipped:", error.message);
        }
    }

    return {
        success: true,
        pageId,
        chunkCount: chunks.length
    };
}

function getChunksByPageId(pageId) {
    return new Promise((resolve, reject) => {
        db.all(
            `
                SELECT *
                FROM chunks
                WHERE page_id = ?
                ORDER BY chunk_index ASC
            `,
            [pageId],
            (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            }
        );
    });
}

function getAllPages() {
    return new Promise((resolve, reject) => {

        db.all(
            "SELECT * FROM pages ORDER BY saved_at DESC",
            [],
            (err, rows) => {

                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }

            }
        );

    });
}

module.exports = {
    savePage,
    getAllPages,
    getChunksByPageId,
    saveChunkEmbedding,
    getChunkEmbeddings,
    deserializeEmbedding,
    cosineSimilarity,
    searchSimilarChunks
};
