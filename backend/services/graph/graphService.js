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

    async function saveRelationship(sourceId, relation, targetId, pageId = null, confidence = 1.0) {
        await runQuery(
            `
            INSERT OR IGNORE INTO relationships(
                source_entity_id,
                relation,
                target_entity_id,
                page_id,
                confidence
            )
            VALUES (?, ?, ?, ?, ?)
            `,
            [
                sourceId,
                relation,
                targetId,
                pageId,
                confidence
            ]
        );
    }

    async function processPage(pageId, title, content) {
        console.log("Graphing:", title);

        const graphData = await aiService.extractGraphData(content);

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

            const confidence = typeof relation.confidence === "number" ? relation.confidence : 1.0;

            await saveRelationship(
                sourceId,
                relation.relation,
                targetId,
                pageId,
                confidence
            );
        }
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
            await processPage(page.id, page.title, page.content);
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

    async function getNetworkData() {
        const nodes = await allQuery(`
            SELECT id, name AS label, type
            FROM entities
        `);

        const edges = await allQuery(`
            SELECT
                id,
                source_entity_id AS [from],
                target_entity_id AS [to],
                relation AS label,
                confidence,
                page_id AS pageId
            FROM relationships
        `);

        return { nodes, edges };
    }

    async function getAnalytics() {
        const entityCount = await getQuery(`
            SELECT COUNT(*) AS count
            FROM entities
        `);

        const relationshipCount = await getQuery(`
            SELECT COUNT(*) AS count
            FROM relationships
        `);

        const pageCount = await getQuery(`
            SELECT COUNT(*) AS count
            FROM pages
        `);

        const topEntities = await allQuery(`
            SELECT e.name, COUNT(*) as connections
            FROM (
                SELECT source_entity_id AS entity_id FROM relationships
                UNION ALL
                SELECT target_entity_id AS entity_id FROM relationships
            ) r
            JOIN entities e ON e.id = r.entity_id
            GROUP BY r.entity_id
            ORDER BY connections DESC
            LIMIT 5
        `);

        return {
            entities: entityCount?.count || 0,
            relationships: relationshipCount?.count || 0,
            pagesIndexed: pageCount?.count || 0,
            topEntities: topEntities || []
        };
    }

    async function getRelationshipSource(relationshipId) {
        const row = await getQuery(`
            SELECT 
                r.relation,
                e1.name AS source_name,
                e2.name AS target_name,
                p.id AS page_id,
                p.title AS page_title,
                p.url AS page_url
            FROM relationships r
            JOIN entities e1 ON e1.id = r.source_entity_id
            JOIN entities e2 ON e2.id = r.target_entity_id
            LEFT JOIN pages p ON p.id = r.page_id
            WHERE r.id = ?
        `, [relationshipId]);

        if (!row) {
            return null;
        }

        return {
            relationship: {
                source: row.source_name,
                relation: row.relation,
                target: row.target_name
            },
            page: row.page_id ? {
                id: row.page_id,
                title: row.page_title,
                url: row.page_url
            } : null
        };
    }

    return {
        buildGraph,
        queryGraph,
        getStats,
        getNetworkData,
        getAnalytics,
        getRelationshipSource,
        traverseGraph,
        getEntityByName,
        getNeighbors,
        processPage
    };
}

module.exports = {
    createGraphService
};
