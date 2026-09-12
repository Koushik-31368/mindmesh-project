# MindMesh Architecture

## Overview

MindMesh is a browser extension + Node.js backend that builds a personal knowledge graph from browsing history.

## Components

| Component | Purpose |
|---|---|
| `extension/` | Chrome extension: content + background scripts + popup UI |
| `backend/` | Express API server with AI, memory, graph and privacy services |
| `backend/services/memory/` | SQLite page storage, chunking and vector embedding |
| `backend/services/graph/` | Knowledge graph construction and BFS traversal |
| `backend/services/retrieval/` | ChromaDB vector search (optional dual-index) |

## Data Flow

1. Content script extracts page text on visit
2. Background script posts page data to `/api/memory/save`
3. Backend chunks, embeds and stores in SQLite
4. Graph service extracts entities and relationships
5. Popup queries memory and graph via chat endpoints
