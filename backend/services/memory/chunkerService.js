/** Default words per chunk (tuned for Gemini embedding context). */
const DEFAULT_CHUNK_SIZE = 400;

/** Overlap words between chunks to preserve boundary context. */
const DEFAULT_OVERLAP = 50;

/**
 * Splits text into overlapping word-level chunks for embedding.
 * @param {string} text - Input text.
 * @param {number} chunkSize - Max words per chunk.
 * @param {number} overlap - Overlap word count.
 * @returns {string[]}
 */
function chunkText(text, chunkSize = DEFAULT_CHUNK_SIZE, overlap = DEFAULT_OVERLAP) {

    const words = text.split(/\s+/).filter(Boolean);

    const chunks = [];

    let start = 0;

    while (start < words.length) {
        const end = Math.min(start + chunkSize, words.length);
        const chunk = words.slice(start, end).join(" ");

        if (chunk) {
            chunks.push(chunk);
        }

        if (end === words.length) {
            break;
        }

        start = Math.max(end - overlap, start + 1);
    }

    return chunks;
}

module.exports = {
    chunkText
};