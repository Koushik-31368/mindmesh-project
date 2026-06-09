const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "../../data/mindmesh.db");

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Database error:", err.message);
    } else {
        console.log("SQLite connected");
    }
});

db.serialize(() => {
    db.run("PRAGMA foreign_keys = ON");

    db.run(`
        CREATE TABLE IF NOT EXISTS pages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            url TEXT UNIQUE,
            title TEXT,
            content TEXT,
            saved_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS chunks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            page_id INTEGER NOT NULL,
            chunk_index INTEGER NOT NULL,
            chunk_text TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY(page_id) REFERENCES pages(id)
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS chunk_embeddings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chunk_id INTEGER NOT NULL UNIQUE,
            model TEXT NOT NULL,
            dimensions INTEGER NOT NULL,
            embedding BLOB NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY(chunk_id) REFERENCES chunks(id) ON DELETE CASCADE
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS entities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            type TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

            UNIQUE(name, type)
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS relationships (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_entity_id INTEGER NOT NULL,
            relation TEXT NOT NULL,
            target_entity_id INTEGER NOT NULL,
            confidence REAL DEFAULT 1.0,
            page_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY(source_entity_id) REFERENCES entities(id),
            FOREIGN KEY(target_entity_id) REFERENCES entities(id),
            FOREIGN KEY(page_id) REFERENCES pages(id) ON DELETE CASCADE,

            UNIQUE(
                source_entity_id,
                relation,
                target_entity_id
            )
        )
    `);
});

module.exports = db;
