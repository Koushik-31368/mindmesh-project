const db = require("../memory/db");
const { createAiService } = require("../providerFactory");

const aiService = createAiService();

function runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) {
                reject(err);
                return;
            }

            resolve(this);
        });
    });
}

function getQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) {
                reject(err);
                return;
            }

            resolve(row);
        });
    });
}

function allQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) {
                reject(err);
                return;
            }

            resolve(rows);
        });
    });
}

function createGraphService() {

    async function saveEntity(name, type) {
        await runQuery(
            `
            INSERT OR IGNORE INTO entities(name, type)
            VALUES (?, ?)
            `,
            [name, type]
        );

        const entity = await getQuery(
            `
            SELECT id
            FROM entities
            WHERE name = ?
            AND type = ?
            `,
            [name, type]
        );

        return entity?.id;
    }

    async function saveRelationship(sourceId, relation, targetId) {
        await runQuery(
            `
            INSERT OR IGNORE INTO relationships(
                source_entity_id,
                relation,
                target_entity_id
            )
            VALUES (?, ?, ?)
            `,
            [
                sourceId,
                relation,
                targetId
            ]
        );
    }

    async function buildGraph() {
        const pages = await allQuery(`
            SELECT id, title, content
            FROM pages
        `);

        let processedPages = 0;

        for (const page of pages) {
            console.log("Graphing:", page.title);

            const graphData = await aiService.extractGraphData(page.content);

            const entityMap = new Map();

            for (const entity of graphData.entities || []) {
                const entityId = await saveEntity(entity.name, entity.type);
                entityMap.set(entity.name, entityId);
            }

            for (const relation of graphData.relationships || []) {
                const sourceId = entityMap.get(relation.source);
                const targetId = entityMap.get(relation.target);

                if (!sourceId || !targetId) {
                    continue;
                }

                await saveRelationship(
                    sourceId,
                    relation.relation,
                    targetId
                );
            }

            processedPages++;
        }

        return {
            pagesProcessed: processedPages
        };
    }

    async function queryGraph(question) {
        const entities = await allQuery(
            `
            SELECT id, name
            FROM entities
            `
        );

        const matchedEntity = entities.find(entity =>
            question.toLowerCase()
                .includes(entity.name.toLowerCase())
        );

        if (!matchedEntity) {
            return {
                answer: "No matching entity found.",
                relationships: []
            };
        }

        const relationships = await allQuery(
            `
            SELECT
                e1.name AS source,
                r.relation,
                e2.name AS target

            FROM relationships r

            JOIN entities e1
            ON e1.id = r.source_entity_id

            JOIN entities e2
            ON e2.id = r.target_entity_id

            WHERE e1.id = ?
               OR e2.id = ?
            `,
            [
                matchedEntity.id,
                matchedEntity.id
            ]
        );

        return {
            entity: matchedEntity.name,
            relationships
        };
    }

    async function getStats() {
        const entityCount = await getQuery(`
            SELECT COUNT(*) AS count
            FROM entities
        `);

        const relationshipCount = await getQuery(`
            SELECT COUNT(*) AS count
            FROM relationships
        `);

        return {
            entities: entityCount.count,
            relationships: relationshipCount.count
        };
    }

    return {
        buildGraph,
        queryGraph,
        getStats
    };
}

module.exports = {
    createGraphService
};
