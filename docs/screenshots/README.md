# MindMesh Screenshot Framework

This directory contains reference screenshots used in `README.md` and `demo_script.md`. 
All screenshots should follow the naming conventions below.

## Required Screenshots

| Filename | Purpose | Recommended Capture |
|---|---|---|
| `popup_page_tab.png` | Shows the floating Dashboard on a clean page. | Open MindMesh on a Wikipedia article before summarization. |
| `popup_page_summary.png` | Shows the LLM-generated summary. | Capture immediately after clicking "Summarize Page". |
| `popup_memory_tab.png` | Shows Semantic Memory Search. | Switch to Memory tab, type a query that references a different indexed page, and capture the answer. |
| `popup_safety_tab.png` | Shows the Safety Analysis results. | Capture after running safety analysis on a non-trusted domain. |
| `popup_privacy_tab.png` | Shows Privacy Analysis results. | Capture after running privacy analysis on a page with multiple trackers. |
| `popup_graph_tab.png` | Shows the Cytoscape Knowledge Graph. | Capture when at least 15-20 nodes and edges are populated in the network. |
| `popup_graph_chat.png` | Shows Hybrid Graph + Memory Chat. | Capture an answer to a question requiring graph traversal. |
| `popup_deja_browse.png` | Shows the Deja Browse Toast Notification. | Capture the bottom-right corner when visiting a semantically related page. |

## Update Instructions
When updating the UI, replace the affected files while maintaining the exact filenames to ensure existing documentation links do not break.
