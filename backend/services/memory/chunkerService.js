/** Default words per chunk (tuned for Gemini embedding context window). */
const DEFAULT_CHUNK_SIZE = 400;

/** Word overlap between consecutive chunks to preserve sentence context. */
const DEFAULT_OVERLAP = 50;

/**
 * Splits text into overlapping word-level chunks suitable for vector embedding.
 * @param {string} text      - Raw input text to split.
 * @param {number} chunkSize - Words per chunk (default: DEFAULT_CHUNK_SIZE).
 * @param {number} overlap   - Overlap words (default: DEFAULT_OVERLAP).
 * @returns {string[]} Array of text chunks.
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