function chunkText(text, chunkSize = 400, overlap = 50) {

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