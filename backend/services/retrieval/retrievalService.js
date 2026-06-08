const DEFAULT_COLLECTION_NAME = process.env.CHROMA_COLLECTION || "mindmesh_chunks";
const DEFAULT_HOST = process.env.CHROMA_HOST || "localhost";
const DEFAULT_PORT = Number(process.env.CHROMA_PORT || 8000);
const DEFAULT_SSL = String(process.env.CHROMA_SSL || "false").toLowerCase() === "true";
const DEFAULT_TENANT = process.env.CHROMA_TENANT || undefined;
const DEFAULT_DATABASE = process.env.CHROMA_DATABASE || undefined;

let chromaClientPromise;
let collectionPromise;

function cleanText(text) {
    return String(text || "").replace(/\s+/g, " ").trim();
}

function buildChunkId(pageId, chunkIndex) {
    return `page-${pageId}-chunk-${chunkIndex}`;
}

async function loadChromaClient() {
    if (!chromaClientPromise) {
        chromaClientPromise = import("chromadb").then(({ ChromaClient }) => {
            return new ChromaClient({
                host: DEFAULT_HOST,
                port: DEFAULT_PORT,
                ssl: DEFAULT_SSL,
                tenant: DEFAULT_TENANT,
                database: DEFAULT_DATABASE
            });
        });
    }

    return chromaClientPromise;
}

async function getCollection() {
    if (!collectionPromise) {
        collectionPromise = loadChromaClient().then((client) => {
            return client.getOrCreateCollection({
                name: DEFAULT_COLLECTION_NAME
            });
        });
    }

    return collectionPromise;
}

async function deleteChunksByPageId(pageId) {
    const collection = await getCollection();

    try {
        await collection.delete({
            where: {
                pageId: String(pageId)
            }
        });
    } catch (error) {
        const message = String(error?.message || "");

        if (!message.toLowerCase().includes("not found")) {
            throw error;
        }
    }
}

async function addChunks(pageId, chunks) {
    if (!pageId) {
        throw new Error("pageId is required to add chunks to ChromaDB.");
    }

    if (!Array.isArray(chunks)) {
        throw new Error("chunks must be an array.");
    }

    const collection = await getCollection();

    await deleteChunksByPageId(pageId);

    const ids = chunks.map((_, index) => buildChunkId(pageId, index));
    const documents = chunks.map((chunk) => cleanText(chunk));
    const metadatas = chunks.map((_, index) => ({
        pageId: String(pageId),
        chunkIndex: index
    }));

    if (ids.length === 0) {
        return {
            pageId,
            chunkCount: 0
        };
    }

    await collection.add({
        ids,
        documents,
        metadatas
    });

    return {
        pageId,
        chunkCount: ids.length
    };
}

async function searchSimilarChunks(query, limit = 5) {
    const cleanedQuery = cleanText(query);

    if (!cleanedQuery) {
        return [];
    }

    const collection = await getCollection();
    const result = await collection.query({
        queryTexts: [cleanedQuery],
        nResults: limit,
        include: ["documents", "metadatas", "distances"]
    });

    const ids = result?.ids?.[0] || [];
    const documents = result?.documents?.[0] || [];
    const metadatas = result?.metadatas?.[0] || [];
    const distances = result?.distances?.[0] || [];

    return ids.map((id, index) => {
        const metadata = metadatas[index] || {};

        return {
            id,
            pageId: metadata.pageId ? String(metadata.pageId) : null,
            chunkIndex: typeof metadata.chunkIndex === "number" ? metadata.chunkIndex : null,
            chunkText: documents[index] || "",
            distance: typeof distances[index] === "number" ? distances[index] : null
        };
    });
}

module.exports = {
    addChunks,
    searchSimilarChunks
};