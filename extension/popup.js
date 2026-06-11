// ─── Chrome API Helper ────────────────────────────────────────────────
// When running inside the extension iframe, chrome.tabs is available.
// When opened directly in a browser tab (dev testing), we provide a mock.
function getChrome() {
    if (typeof chrome !== "undefined" && chrome.tabs) {
        return chrome;
    }
    return {
        tabs: {
            query: async () => [{ id: 1, title: "Dev Page" }],
            sendMessage: (_tabId, message, callback) => {
                if (message.action === "getPageContent") {
                    callback({
                        text: document.body.innerText || "",
                        url: window.location.href,
                        html: document.documentElement.outerHTML || ""
                    });
                }
            }
        }
    };
}

const BACKEND = "http://localhost:3000";
let isBackendAvailable = false;
let isProcessing = false;

function setProcessingState(buttons, isProcessingState, buttonText = null) {
    isProcessing = isProcessingState;
    buttons.forEach(btn => {
        if (!btn) return;
        btn.disabled = isProcessingState;
        if (buttonText !== null) {
            btn.innerText = buttonText;
        }
    });
}

// ─── Tab Switching ────────────────────────────────────────────────────
function setupTabs() {
    const tabBtns = document.querySelectorAll(".tab-btn");
    const tabPanes = document.querySelectorAll(".tab-pane");

    tabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const targetTab = btn.getAttribute("data-tab");

            tabBtns.forEach(b => b.classList.remove("active"));
            tabPanes.forEach(p => p.classList.remove("active"));

            btn.classList.add("active");
            const activePane = document.getElementById(targetTab);
            if (activePane) activePane.classList.add("active");

            // Persist active tab
            try { localStorage.setItem("mm-active-tab", targetTab); } catch (_) {}

            // Load graph data when switching to graph tab
            if (targetTab === "tab-graph") {
                loadAnalyticsAndGraph();
            }
        });
    });

    // Restore last active tab
    try {
        const saved = localStorage.getItem("mm-active-tab");
        if (saved) {
            const btn = document.querySelector(`.tab-btn[data-tab="${saved}"]`);
            if (btn) btn.click();
        }
    } catch (_) {}
}

// ─── Health Check ─────────────────────────────────────────────────────
async function checkBackendHealth() {
    const dot = document.getElementById("statusDot");
    const text = document.getElementById("statusText");

    try {
        const res = await fetch(`${BACKEND}/health`, { signal: AbortSignal.timeout(3000) });
        if (res.ok) {
            dot.className = "status-dot connected";
            text.innerText = "Connected";
            isBackendAvailable = true;
        } else {
            dot.className = "status-dot";
            text.innerText = "Backend error";
            isBackendAvailable = false;
        }
    } catch {
        dot.className = "status-dot";
        text.innerText = "Disconnected";
        isBackendAvailable = false;
    }
}

// ─── SVG Icon Helpers ─────────────────────────────────────────────────
const ICONS = {
    check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    x: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
    warn: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
    eye: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`
};

// ─── Page Tab: Summarize & Ask ────────────────────────────────────────
function setupPageTab() {
    const summaryBtn = document.getElementById("summaryBtn");
    const askBtn = document.getElementById("askBtn");
    const resultBox = document.getElementById("result");

    if (summaryBtn) {
        summaryBtn.addEventListener("click", async () => {
            if (isProcessing) return;
            if (!isBackendAvailable) { resultBox.innerText = "Backend unavailable. Please start it on localhost:3000."; return; }

            setProcessingState([summaryBtn, askBtn], true, "Summarizing...");
            resultBox.innerText = "Reading page...";
            try {
                const [tab] = await getChrome().tabs.query({ active: true, currentWindow: true });
                if (!tab) throw new Error("No active tab found.");
                
                getChrome().tabs.sendMessage(tab.id, { action: "getPageContent" }, async (response) => {
                    if (getChrome().runtime && getChrome().runtime.lastError) {
                        resultBox.innerText = "Cannot read this page (restricted or extension tab).";
                        setProcessingState([summaryBtn, askBtn], false, "Summarize Page");
                        return;
                    }
                    if (!response) { 
                        resultBox.innerText = "Could not read page content."; 
                        setProcessingState([summaryBtn, askBtn], false, "Summarize Page");
                        return; 
                    }
                    
                    resultBox.innerText = "Generating summary...";
                    try {
                        const res = await fetch(`${BACKEND}/summarize`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ text: response.text, url: response.url, title: tab.title || response.url }),
                            signal: AbortSignal.timeout(20000)
                        });
                        const data = await res.json();
                        resultBox.innerText = data.summary || data.error || "No summary generated.";
                        
                        if (data.summary && !data.error) {
                            checkRelatedMemory(response.text, response.url);
                        }
                    } catch (err) {
                        resultBox.innerText = err.name === 'TimeoutError' ? "Request timed out." : "Backend unavailable. Is it running on localhost:3000?";
                    } finally {
                        setProcessingState([summaryBtn, askBtn], false, "Summarize Page");
                    }
                });
            } catch (err) {
                resultBox.innerText = "Unexpected error: " + err.message;
                setProcessingState([summaryBtn, askBtn], false, "Summarize Page");
            }
        });
    }

    if (askBtn) {
        askBtn.addEventListener("click", async () => {
            if (isProcessing) return;
            if (!isBackendAvailable) { resultBox.innerText = "Backend unavailable. Please start it on localhost:3000."; return; }

            const questionInput = document.getElementById("questionInput");
            const question = questionInput.value.trim();
            if (!question) { resultBox.innerText = "Please enter a question."; return; }

            setProcessingState([summaryBtn, askBtn], true);
            resultBox.innerText = "Reading page...";
            try {
                const [tab] = await getChrome().tabs.query({ active: true, currentWindow: true });
                if (!tab) throw new Error("No active tab found.");

                getChrome().tabs.sendMessage(tab.id, { action: "getPageContent" }, async (response) => {
                    if (getChrome().runtime && getChrome().runtime.lastError) {
                        resultBox.innerText = "Cannot read this page (restricted or extension tab).";
                        setProcessingState([summaryBtn, askBtn], false);
                        return;
                    }
                    if (!response) { 
                        resultBox.innerText = "Could not read page content."; 
                        setProcessingState([summaryBtn, askBtn], false);
                        return; 
                    }
                    
                    resultBox.innerText = "Thinking...";
                    try {
                        const res = await fetch(`${BACKEND}/ask`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ text: response.text, question }),
                            signal: AbortSignal.timeout(20000)
                        });
                        const data = await res.json();
                        resultBox.innerText = data.answer || data.error || "No answer generated.";
                    } catch (err) {
                        resultBox.innerText = err.name === 'TimeoutError' ? "Request timed out." : "Backend unavailable. Is it running on localhost:3000?";
                    } finally {
                        setProcessingState([summaryBtn, askBtn], false);
                    }
                });
            } catch (err) {
                resultBox.innerText = "Unexpected error: " + err.message;
                setProcessingState([summaryBtn, askBtn], false);
            }
        });
    }
}

// ─── Memory Tab ───────────────────────────────────────────────────────
function setupMemoryTab() {
    const memoryAskBtn = document.getElementById("memoryAskBtn");
    const memoryResult = document.getElementById("memoryResult");

    if (memoryAskBtn) {
        memoryAskBtn.addEventListener("click", async () => {
            if (isProcessing) return;
            if (!isBackendAvailable) { memoryResult.innerText = "Backend unavailable."; return; }

            const input = document.getElementById("memoryQuestionInput");
            const question = input.value.trim();
            if (!question) { memoryResult.innerText = "Please enter a question."; return; }

            setProcessingState([memoryAskBtn], true);
            memoryResult.innerText = "Searching saved memory...";
            try {
                const res = await fetch(`${BACKEND}/api/memory/chat`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ question }),
                    signal: AbortSignal.timeout(20000)
                });
                const data = await res.json();
                memoryResult.innerText = data.answer || "No relevant information found.";
            } catch (err) {
                memoryResult.innerText = err.name === 'TimeoutError' ? "Request timed out." : "Backend unavailable. Is it running on localhost:3000?";
            } finally {
                setProcessingState([memoryAskBtn], false);
            }
        });
    }
}

// ─── Safety Tab ───────────────────────────────────────────────────────
function setupSecurityTab() {
    const securityBtn = document.getElementById("securityBtn");

    if (securityBtn) {
        securityBtn.addEventListener("click", async () => {
            if (isProcessing) return;
            
            const scoreCircle = document.getElementById("scoreCircle");
            const scoreNumber = document.getElementById("scoreNumber");
            const scoreLabel = document.getElementById("scoreLabel");
            const scoreSubtitle = document.getElementById("scoreSubtitle");
            const safetyChecks = document.getElementById("safetyChecks");
            const aiVerdict = document.getElementById("aiVerdict");
            const aiVerdictContent = document.getElementById("aiVerdictContent");
            const appHeader = document.getElementById("appHeader");
            const headerTitle = document.getElementById("headerTitle");

            if (!isBackendAvailable) { 
                scoreSubtitle.innerText = "Backend unavailable."; 
                return; 
            }

            setProcessingState([securityBtn], true, "Analyzing...");
            scoreNumber.innerText = "...";
            scoreLabel.innerText = "";
            scoreSubtitle.innerText = "Analyzing page...";
            safetyChecks.innerHTML = "";
            aiVerdict.style.display = "none";

            try {
                const [tab] = await getChrome().tabs.query({ active: true, currentWindow: true });
                if (!tab) throw new Error("No active tab found.");

                getChrome().tabs.sendMessage(tab.id, { action: "getPageContent" }, async (response) => {
                    if (getChrome().runtime && getChrome().runtime.lastError) {
                        scoreSubtitle.innerText = "Cannot read this page (restricted or extension tab).";
                        setProcessingState([securityBtn], false, "Analyze Page Safety");
                        return;
                    }
                    if (!response) {
                        scoreSubtitle.innerText = "Could not read page content.";
                        setProcessingState([securityBtn], false, "Analyze Page Safety");
                        return;
                    }

                    try {
                        const res = await fetch(`${BACKEND}/api/security/analyze`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ url: response.url, pageText: response.text, html: response.html }),
                            signal: AbortSignal.timeout(20000)
                        });
                        const data = await res.json();

                        // Update score circle
                        scoreNumber.innerText = data.riskScore;

                        if (data.riskLevel === "safe") {
                            scoreCircle.className = "score-circle safe";
                            scoreLabel.innerText = "Safe";
                            scoreSubtitle.innerText = "This page appears legitimate";
                            scoreSubtitle.style.color = "var(--text-muted)";
                            appHeader.classList.remove("danger-mode");
                            document.body.classList.remove("danger-mode-active");
                            headerTitle.innerText = "MindMesh";
                        } else if (data.riskLevel === "suspicious") {
                            scoreCircle.className = "score-circle warning";
                            scoreLabel.innerText = "Warning";
                            scoreSubtitle.innerText = "Some concerns detected";
                            scoreSubtitle.style.color = "var(--warning-orange)";
                            appHeader.classList.remove("danger-mode");
                            document.body.classList.remove("danger-mode-active");
                            headerTitle.innerText = "MindMesh — Caution";
                        } else {
                            scoreCircle.className = "score-circle danger";
                            scoreLabel.innerText = "Danger";
                            scoreSubtitle.innerText = "This page may be dangerous";
                            scoreSubtitle.style.color = "var(--danger-red)";
                            appHeader.classList.add("danger-mode");
                            document.body.classList.add("danger-mode-active");
                            headerTitle.innerText = "MindMesh — Threat Detected";
                        }

                        // Render reason check items
                        if (data.reasons && data.reasons.length > 0) {
                            safetyChecks.innerHTML = data.reasons.map(reason => {
                                const iconClass = data.riskLevel === "safe" ? "success" : (data.riskLevel === "suspicious" ? "warning" : "danger");
                                const icon = data.riskLevel === "safe" ? ICONS.check : (data.riskLevel === "suspicious" ? ICONS.warn : ICONS.x);
                                return `<div class="check-item">
                                    <div class="check-icon ${iconClass}">${icon}</div>
                                    <div class="check-content"><h4>${reason}</h4></div>
                                </div>`;
                            }).join("");
                        } else {
                            safetyChecks.innerHTML = `<div class="check-item">
                                <div class="check-icon success">${ICONS.check}</div>
                                <div class="check-content"><h4>No issues detected</h4><p>This page passed all safety checks.</p></div>
                            </div>`;
                        }

                        // AI Verification
                        if (data.aiVerification) {
                            aiVerdict.style.display = "block";
                            aiVerdictContent.innerHTML = `
                                <strong>Verdict:</strong> ${data.aiVerification.verdict || "N/A"}<br>
                                <strong>Confidence:</strong> ${data.aiVerification.confidence || 0}%<br>
                                <strong>Explanation:</strong> ${data.aiVerification.explanation || "N/A"}
                            `;
                        }

                    } catch (err) {
                        scoreSubtitle.innerText = err.name === 'TimeoutError' ? "Request timed out." : "Backend unavailable.";
                    } finally {
                        setProcessingState([securityBtn], false, "Analyze Page Safety");
                    }
                });
            } catch (err) {
                scoreSubtitle.innerText = "Unexpected error.";
                setProcessingState([securityBtn], false, "Analyze Page Safety");
            }
        });
    }
}

// ─── Privacy Tab ──────────────────────────────────────────────────────
function setupPrivacyTab() {
    const privacyBtn = document.getElementById("privacyBtn");
    const privacyResult = document.getElementById("privacyResult");
    const privacyDetails = document.getElementById("privacyDetails");

    if (privacyBtn) {
        privacyBtn.addEventListener("click", async () => {
            if (isProcessing) return;
            if (!isBackendAvailable) { privacyResult.innerText = "Backend unavailable."; return; }

            setProcessingState([privacyBtn], true, "Analyzing...");
            privacyResult.innerText = "Analyzing privacy...";
            privacyDetails.style.display = "none";

            try {
                const [tab] = await getChrome().tabs.query({ active: true, currentWindow: true });
                if (!tab) throw new Error("No active tab found.");

                getChrome().tabs.sendMessage(tab.id, { action: "getPageContent" }, async (response) => {
                    if (getChrome().runtime && getChrome().runtime.lastError) {
                        privacyResult.innerText = "Cannot read this page (restricted or extension tab).";
                        setProcessingState([privacyBtn], false, "Analyze Privacy");
                        return;
                    }
                    if (!response) { 
                        privacyResult.innerText = "Could not read page content."; 
                        setProcessingState([privacyBtn], false, "Analyze Privacy");
                        return; 
                    }

                    try {
                        const res = await fetch(`${BACKEND}/api/privacy/analyze`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ html: response.html, url: response.url }),
                            signal: AbortSignal.timeout(20000)
                        });
                        const data = await res.json();

                        privacyResult.innerText = `Risk: ${data.risk.level} (Score: ${data.risk.score})`;
                        privacyDetails.style.display = "block";

                        // Trackers
                        const trackerBadges = document.getElementById("trackerBadges");
                        if (data.trackers.trackers.length > 0) {
                            trackerBadges.innerHTML = data.trackers.trackers.map(t =>
                                `<span class="badge warning">${ICONS.eye} ${t}</span>`
                            ).join("");
                        } else {
                            trackerBadges.innerHTML = `<span class="badge muted">No trackers detected</span>`;
                        }

                        // Data collection
                        const dataLabels = { email: "Email", phone: "Phone", password: "Password", address: "Address", dob: "Date of Birth", location: "Location" };
                        const dataCollection = document.getElementById("dataCollection");
                        dataCollection.innerHTML = Object.keys(dataLabels).map(key => {
                            const icon = data.dataCollected[key] ? "⚠" : "✓";
                            const color = data.dataCollected[key] ? "var(--warning-orange)" : "var(--success-green)";
                            return `<div style="margin-bottom: 4px;"><span style="color: ${color};">${icon}</span> ${dataLabels[key]}: ${data.dataCollected[key] ? "Collected" : "Not detected"}</div>`;
                        }).join("");

                        // Policy highlights
                        const policyHighlights = document.getElementById("policyHighlights");
                        if (data.policy) {
                            const policyLabels = {
                                collectsEmail: "Collects email",
                                collectsPhone: "Collects phone",
                                collectsLocation: "Collects location",
                                collectsAddress: "Collects address",
                                sharesWithThirdParties: "Shares with third parties",
                                retentionMentioned: "Data retention mentioned"
                            };
                            policyHighlights.innerHTML = Object.keys(policyLabels).map(key => {
                                const found = data.policy[key];
                                const iconClass = found ? "warning" : "success";
                                const icon = found ? ICONS.warn : ICONS.check;
                                return `<div class="highlight-item ${iconClass}">${icon}<span>${policyLabels[key]}: ${found ? "Yes" : "No"}</span></div>`;
                            }).join("");
                        } else {
                            policyHighlights.innerHTML = `<div class="highlight-item" style="color: var(--text-muted);">No privacy policy found.</div>`;
                        }

                        // AI summary
                        const aiSummarySection = document.getElementById("privacyAiSummary");
                        const aiContent = document.getElementById("privacyAiContent");
                        if (data.aiSummary) {
                            aiSummarySection.style.display = "block";
                            aiContent.innerText = data.aiSummary;
                        }

                    } catch (err) {
                        privacyResult.innerText = err.name === 'TimeoutError' ? "Request timed out." : "Backend unavailable.";
                    } finally {
                        setProcessingState([privacyBtn], false, "Analyze Privacy");
                    }
                });
            } catch (err) {
                privacyResult.innerText = "Unexpected error.";
                setProcessingState([privacyBtn], false, "Analyze Privacy");
            }
        });
    }
}

// ─── Graph Tab: Analytics, Cytoscape, Chat ────────────────────────────
let cyInstance = null;

async function loadAnalyticsOnly() {
    try {
        const res = await fetch(`${BACKEND}/api/graph/analytics`);
        const analytics = await res.json();

        const entitiesEl = document.getElementById("analyticsEntities");
        const relsEl = document.getElementById("analyticsRelationships");
        const pagesEl = document.getElementById("analyticsPages");

        if (entitiesEl) entitiesEl.innerText = analytics.entities || 0;
        if (relsEl) relsEl.innerText = analytics.relationships || 0;
        if (pagesEl) pagesEl.innerText = analytics.pagesIndexed || 0;
    } catch (err) {
        console.error("Failed to load analytics:", err);
    }
}

async function loadAnalyticsAndGraph() {
    if (!isBackendAvailable) return;
    
    // Add visual loading state
    const container = document.getElementById("cy");
    if (container) {
        container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#94a3b8;font-size:12px;">Loading graph network...</div>`;
    }

    await loadAnalyticsOnly();

    try {
        const res = await fetch(`${BACKEND}/api/graph/network`, { signal: AbortSignal.timeout(10000) });
        const graphData = await res.json();
        renderGraph(graphData);
    } catch (err) {
        if (container) {
            container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--danger-red);font-size:12px;">Failed to load graph data.</div>`;
        }
    }
}

function renderGraph(graphData) {
    const container = document.getElementById("cy");
    if (!container || typeof cytoscape === "undefined") return;

    const elements = [];

    if (graphData.nodes) {
        graphData.nodes.forEach(node => {
            elements.push({ data: { id: node.id.toString(), label: node.label, type: node.type || "OTHER" } });
        });
    }

    if (graphData.edges) {
        graphData.edges.forEach(edge => {
            elements.push({
                data: {
                    id: "edge-" + edge.id.toString(),
                    source: edge.from.toString(),
                    target: edge.to.toString(),
                    label: edge.label,
                    confidence: edge.confidence || 1.0,
                    dbId: edge.id
                }
            });
        });
    }

    if (elements.length === 0) {
        container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#94a3b8;font-size:12px;">No graph data yet. Summarize some pages first.</div>`;
        return;
    }

    container.innerHTML = ""; // Clear the loading text so Cytoscape canvas doesn't get pushed down

    if (cyInstance) { cyInstance.destroy(); }

    cyInstance = cytoscape({
        container,
        elements,
        style: [
            {
                selector: "node",
                style: {
                    "label": "data(label)",
                    "background-color": ele => {
                        const type = (ele.data("type") || "").toUpperCase();
                        switch (type) {
                            case "COMPANY": return "#0057B8";
                            case "TECHNOLOGY": return "#00C896";
                            case "PERSON": return "#1F6FEB";
                            case "PRODUCT": return "#475569";
                            case "ORGANIZATION": return "#7C3AED";
                            case "LOCATION": return "#F59E0B";
                            default: return "#334155";
                        }
                    },
                    "color": "#ffffff",
                    "font-family": "Inter, sans-serif",
                    "font-size": "9px",
                    "font-weight": "500",
                    "text-valign": "center",
                    "text-halign": "center",
                    "width": "46px",
                    "height": "46px",
                    "border-width": "1.5px",
                    "border-color": "rgba(255,255,255,0.2)",
                    "text-wrap": "wrap",
                    "text-max-width": "40px"
                }
            },
            {
                selector: "edge",
                style: {
                    "width": 1.5,
                    "line-color": "rgba(255,255,255,0.12)",
                    "target-arrow-color": "rgba(255,255,255,0.12)",
                    "target-arrow-shape": "triangle",
                    "curve-style": "bezier",
                    "label": "data(label)",
                    "font-family": "Inter, sans-serif",
                    "font-size": "8px",
                    "color": "#94a3b8",
                    "text-background-opacity": 1.0,
                    "text-background-color": "#1E1E1E",
                    "text-background-padding": "2px",
                    "text-background-shape": "roundrectangle",
                    "arrow-scale": 0.8
                }
            },
            { selector: "edge:selected", style: { "line-color": "#0057B8", "target-arrow-color": "#0057B8", "width": 2.5 } },
            { selector: "node:selected", style: { "border-color": "#0057B8", "border-width": "3px" } }
        ],
        layout: { 
            name: elements.length > 50 ? "concentric" : "cose", 
            animate: false, 
            fit: true, 
            padding: 15 
        }
    });

    cyInstance.on("tap", "edge", async evt => {
        const edge = evt.target;
        const dbId = edge.data("dbId");
        if (dbId) await showProvenance(dbId);
    });
}

async function showProvenance(dbId) {
    const card = document.getElementById("sourceExplainabilityCard");
    try {
        const res = await fetch(`${BACKEND}/api/graph/source/${dbId}`);
        if (!res.ok) return;
        const data = await res.json();

        document.getElementById("sourceNode").innerText = data.relationship.source;
        document.getElementById("relPath").innerText = ` → ${data.relationship.relation} → `;
        document.getElementById("targetNode").innerText = data.relationship.target;

        const link = document.getElementById("sourcePageLink");
        if (data.page) {
            link.innerText = `${data.page.title || "Untitled"} (Confidence: ${data.relationship.confidence || 1.0})`;
            link.href = data.page.url || "#";
        } else {
            link.innerText = "Source unknown";
            link.href = "#";
        }

        card.classList.remove("hidden");
    } catch (err) {
        console.error("Failed to fetch provenance:", err);
    }
}

function setupGraphTab() {
    const graphAskBtn = document.getElementById("graphAskBtn");
    const graphResult = document.getElementById("graphResult");

    if (graphAskBtn) {
        graphAskBtn.addEventListener("click", async () => {
            if (isProcessing) return;
            if (!isBackendAvailable) { graphResult.innerText = "Backend unavailable."; return; }

            const input = document.getElementById("graphQuestion");
            const question = input.value.trim();
            if (!question) { graphResult.innerText = "Please enter a question."; return; }

            setProcessingState([graphAskBtn], true);
            graphResult.innerText = "Searching knowledge graph & memory...";
            try {
                const res = await fetch(`${BACKEND}/api/graph/chat`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ question }),
                    signal: AbortSignal.timeout(20000)
                });
                const data = await res.json();
                loadAnalyticsAndGraph();
                graphResult.innerText = data.answer || "No answer generated.";
            } catch (err) {
                graphResult.innerText = err.name === 'TimeoutError' ? "Request timed out." : "Backend unavailable.";
            } finally {
                setProcessingState([graphAskBtn], false);
            }
        });
    }

    const closeExplainBtn = document.getElementById("closeExplainBtn");
    if (closeExplainBtn) {
        closeExplainBtn.addEventListener("click", () => {
            document.getElementById("sourceExplainabilityCard").classList.add("hidden");
        });
    }
}

// ─── Initialization ───────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
    setupTabs();
    checkBackendHealth();
    setupPageTab();
    setupMemoryTab();
    setupSecurityTab();
    setupPrivacyTab();
    setupGraphTab();
    loadAnalyticsOnly();

    // Collapse button → message parent content.js
    const collapseBtn = document.getElementById("collapseBtn");
    if (collapseBtn) {
        collapseBtn.addEventListener("click", () => {
            window.parent.postMessage("collapseMindMeshDashboard", "*");
        });
    }
});

// ─── Related Memory (Déjà Browse) ─────────────────────────────────────
async function checkRelatedMemory(text, currentUrl) {
    const sessionKey = `rm_shown_${currentUrl}`;
    if (sessionStorage.getItem(sessionKey)) return;

    try {
        const res = await fetch(`${BACKEND}/api/memory/related`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, currentUrl }),
            signal: AbortSignal.timeout(10000)
        });
        const data = await res.json();

        if (data.found) {
            sessionStorage.setItem(sessionKey, "true");
            
            const toast = document.getElementById("relatedMemoryToast");
            const rmTitle = document.getElementById("rmTitle");
            const rmDays = document.getElementById("rmDays");
            const rmSim = document.getElementById("rmSim");
            const rmOpenBtn = document.getElementById("rmOpenBtn");
            const rmDismissBtn = document.getElementById("rmDismissBtn");

            if (!toast) return;

            rmTitle.innerText = data.title || "Untitled Page";
            rmDays.innerText = data.daysSinceViewed;
            rmSim.innerText = data.similarity;

            rmOpenBtn.onclick = () => {
                if (getChrome().tabs.create) {
                    getChrome().tabs.create({ url: data.url });
                } else {
                    window.open(data.url, '_blank');
                }
                toast.classList.add("hidden");
            };

            rmDismissBtn.onclick = () => {
                toast.classList.add("hidden");
            };

            toast.classList.remove("hidden");
        }
    } catch (error) {
        console.error("Related memory check failed:", error);
    }
}
