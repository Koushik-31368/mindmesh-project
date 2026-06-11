# MindMesh Demo Script

**Target Audience:** Recruiters, Hackathon Judges, Software Engineers
**Estimated Duration:** 2-3 minutes
**Recommended Demo Page:** Any content-rich Wikipedia article (e.g., "Artificial Intelligence")

---

## Pre-Demo Checklist

- Backend running on `localhost:3000` (verify with `curl localhost:3000/health`)
- Chrome loaded with MindMesh extension (green badge visible)
- At least 2-3 pages pre-indexed in the database for memory/graph demonstrations
- Browser tabs clean except for the demo starting page

---

## Scene 1: Introduction (15 seconds)

**Action:** Open a Wikipedia article. Click the MindMesh extension icon in the toolbar. The floating launcher appears. Click the launcher to open the sidebar dashboard.

**Talking Points:**
> "MindMesh is a browser extension that turns passive browsing into active knowledge. It combines retrieval-augmented generation, knowledge graphs, and automated security analysis into a single interface. Let me walk through it."

**Expected Outcome:** Sidebar dashboard opens with green "Connected" status indicator. Five tabs visible: Page, Memory, Safety, Privacy, Graph.

---

## Scene 2: Page Summarization (20 seconds)

**Action:** In the Page tab, click "Summarize Page".

**Talking Points:**
> "The content script extracts the primary text from the active page, strips out navigation and structural noise, and sends it to our Express backend. The backend routes it to Groq's Llama 3.3 70B for structured summarization. Behind the scenes, this also indexes the page into our local semantic database -- it chunks the text, generates vector embeddings via Gemini, and stores everything in SQLite."

**Expected Outcome:** 5-8 bullet point summary appears within 3-5 seconds.

---

## Scene 3: Contextual Question Answering (20 seconds)

**Action:** Type a specific question about the page content (e.g., "What are the major subfields mentioned?") and click "Ask".

**Talking Points:**
> "We can interrogate the page directly. The system uses the active document as a strict context window for the LLM, which grounds the answer entirely in what is on this page. There is no hallucination because the model cannot reference external knowledge."

**Expected Outcome:** Precise, factual answer derived exclusively from the active page content.

---

## Scene 4: Semantic Memory Search (25 seconds)

**Action:** Switch to the Memory tab. Type a conceptual query related to a previously indexed page (e.g., "machine learning applications in healthcare") and click "Ask".

**Talking Points:**
> "Every page I summarize gets chunked into 400-word segments with overlapping windows, embedded using Gemini's embedding model, and stored as vector BLOBs in a local SQLite database. When I query memory, we compute cosine similarity against all stored chunks and feed the top matches into the LLM as context. This is a full RAG pipeline -- it searches by meaning, not keywords."

**Expected Outcome:** Answer synthesized from previously indexed pages. Demonstrates cross-page knowledge retrieval.

---

## Scene 5: Deja Browse -- Related Memory Discovery (20 seconds)

**Action:** Open a new tab. Navigate to a page semantically related to a previously indexed one. Click "Summarize Page". Watch the bottom-right corner.

**Talking Points:**
> "Watch the bottom-right corner. Our system compares the current page's content against all stored embeddings. When it detects a semantic overlap above 90%, it surfaces this 'You Have Seen This Before' notification. It shows the related page title, the similarity score, and how long ago I visited it. This happens automatically on every summarization."

**Expected Outcome:** Toast notification appears with page title, similarity percentage (e.g., 94%), and days elapsed.

---

## Scene 6: Safety Analysis (20 seconds)

**Action:** Switch to the Safety tab. Click "Analyze Page Safety".

**Talking Points:**
> "The Safety tab runs a two-phase analysis. First, a heuristic scanner evaluates the URL for suspicious patterns -- IP addresses, lookalike domains, phishing TLDs. It also checks for password fields, hidden form elements, and phishing phrases. If the aggregate score drops below safe, it escalates to an AI verification step for intent analysis. Wikipedia matches our trusted domain allowlist, so it bypasses heuristics entirely."

**Expected Outcome:** Green circle with score 95, "Safe" label, "Domain is in the trusted allowlist" reason.

---

## Scene 7: Privacy Analysis (15 seconds)

**Action:** Switch to the Privacy tab. Click "Analyze Privacy".

**Talking Points:**
> "The Privacy tab scans the page for embedded third-party trackers, evaluates HTML forms for data collection patterns, and auto-discovers privacy policy links. If a policy is found, it fetches and analyzes it using AI to produce a structured summary of data practices."

**Expected Outcome:** Tracker badges, data collection status flags, and privacy policy highlights rendered in the dashboard.

---

## Scene 8: Knowledge Graph (25 seconds)

**Action:** Switch to the Graph tab. Point out the analytics counters (entities, relationships, pages indexed). Interact with the Cytoscape.js visualization -- drag nodes, click an edge to show the provenance card. Type a question in the graph chat.

**Talking Points:**
> "As pages are indexed, we extract entities and relationships using LLM-based NER. Entities become nodes, relationships become directed edges with confidence scores. Clicking any edge shows exactly which source page generated that relationship -- this is provenance tracing. The graph chat combines BFS traversal over the knowledge graph with cosine-similarity memory search to answer questions that span multiple sources."

**Expected Outcome:** Interactive graph with color-coded nodes (blue for companies, green for technologies, purple for organizations). Provenance card shows source entity, relation, target entity, and source page link. Hybrid chat provides a synthesized answer.

---

## Scene 9: Closing (10 seconds)

**Talking Points:**
> "MindMesh demonstrates retrieval-augmented generation, knowledge graph construction, multi-provider AI failover, and automated security analysis -- all running locally as a browser extension. The entire system is self-contained in SQLite with no external databases required. Thank you."

---

## Recovery Scenarios

**If the backend is down:** The status dot will show "Disconnected". Restart with `cd backend && npm start`.

**If summarization is slow:** Groq may be rate-limited. The fallback to Gemini is automatic. Mention: "Our provider failover architecture is handling a rate limit transparently."

**If the knowledge graph is empty:** Summarize 2-3 pages first. Mention: "The graph builds incrementally as pages are indexed."

**If Deja Browse toast does not appear:** The similarity threshold is 90%. The two pages may not be similar enough. Pre-test with related articles.
