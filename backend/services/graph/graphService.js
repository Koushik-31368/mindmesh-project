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

    async function getEntityByName(name) {
        return await getQuery(
            `
            SELECT id, name, type
            FROM entities
            WHERE LOWER(name) = ?
            `,
            [name.toLowerCase()]
        );
    }

    async function getNeighbors(entityId) {
        return await allQuery(
            `
            SELECT
                e1.id AS source_id,
                e1.name AS source,
                r.relation,
                e2.id AS target_id,
                e2.name AS target
            FROM relationships r
            JOIN entities e1 ON e1.id = r.source_entity_id
            JOIN entities e2 ON e2.id = r.target_entity_id
            WHERE e1.id = ? OR e2.id = ?
            `,
            [entityId, entityId]
        );
    }

    async function traverseGraph(startEntityId, maxDepth = 2) {
        const visited = new Set();
        const relationships = [];
        const queue = [{ entityId: startEntityId, depth: 0 }];
        visited.add(startEntityId);

        while (queue.length > 0) {
            const { entityId, depth } = queue.shift();

            if (depth >= maxDepth) {
                continue;
            }

            const neighbors = await getNeighbors(entityId);

            for (const rel of neighbors) {
                const relKey = `${rel.source_id}-${rel.relation}-${rel.target_id}`;
                if (!relationships.some(r => `${r.source_id}-${r.relation}-${r.target_id}` === relKey)) {
                    relationships.push(rel);
                }

                const neighborId = rel.source_id === entityId ? rel.target_id : rel.source_id;

                if (!visited.has(neighborId)) {
                    visited.add(neighborId);
                    queue.push({ entityId: neighborId, depth: depth + 1 });
                }
            }
        }

        return relationships.map(r => ({
            source: r.source,
            relation: r.relation,
            target: r.target
        }));
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

        const relationships = await traverseGraph(matchedEntity.id, 2);

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
        getStats,
        traverseGraph,
        getEntityByName,
        getNeighbors
    };
}

module.exports = {
    createGraphService
};
