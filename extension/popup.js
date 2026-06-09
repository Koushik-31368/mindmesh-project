// Mock chrome APIs for browser testing/development
function getChrome() {
    if (typeof chrome !== "undefined" && chrome.tabs) {
        return chrome;
    }
    return {
        tabs: {
            query: async () => [{ id: 1 }],
            sendMessage: (tabId, message, callback) => {
                if (message.action === "getPageContent") {
                    callback({
                        text: "Welcome to Paypal. Please login with your username and password to proceed authentication. Free crypto lottery winner! Claim reward now.",
                        url: "http://paypa1.com/signin",
                        html: '<form action="http://paypa1.com/login" method="POST"><input type="password" name="pass"><div style="display:none">hidden field</div></form> <iframe src="https://doubleclick.net"></iframe>'
                    });
                }
            }
        }
    };
}

// Tab Switching Setup
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
            if (activePane) {
                activePane.classList.add("active");
            }

            // Refresh graph / analytics when switching to Graph tab
            if (targetTab === "tab-graph") {
                loadAnalyticsAndGraph();
            }
        });
    });
}

// Analytics and Graph Loading
let cyInstance = null;

async function loadAnalyticsOnly() {
    try {
        const res = await fetch("http://localhost:3000/api/graph/analytics");
        const analytics = await res.json();

        const entitiesEl = document.getElementById("analyticsEntities");
        const relsEl = document.getElementById("analyticsRelationships");
        const pagesEl = document.getElementById("analyticsPages");

        if (entitiesEl) entitiesEl.innerText = analytics.entities;
        if (relsEl) relsEl.innerText = analytics.relationships;
        if (pagesEl) pagesEl.innerText = analytics.pagesIndexed;

        const topEntitiesList = document.getElementById("topEntitiesList");
        if (topEntitiesList) {
            topEntitiesList.innerHTML = "";
            if (analytics.topEntities && analytics.topEntities.length > 0) {
                analytics.topEntities.forEach(ent => {
                    const li = document.createElement("li");
                    li.innerHTML = `<span class="entity-name">${ent.name}</span><strong class="entity-count">(${ent.connections})</strong>`;
                    topEntitiesList.appendChild(li);
                });
            } else {
                topEntitiesList.innerHTML = "<li>No data</li>";
            }
        }
    } catch (err) {
        console.error("Failed to load analytics:", err);
    }
}

async function loadAnalyticsAndGraph() {
    await loadAnalyticsOnly();

    try {
        const res = await fetch("http://localhost:3000/api/graph/network");
        const graphData = await res.json();
        renderGraph(graphData);
    } catch (err) {
        console.error("Failed to render graph:", err);
    }
}

// Cytoscape Render Graph logic
function renderGraph(graphData) {
    const container = document.getElementById("cy");
    if (!container) return;

    const elements = [];

    // Map nodes
    if (graphData.nodes) {
        graphData.nodes.forEach(node => {
            elements.push({
                data: {
                    id: node.id.toString(),
                    label: node.label,
                    type: node.type || "OTHER"
                }
            });
        });
    }

    // Map edges
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

    // Initialize Cytoscape
    cyInstance = cytoscape({
        container: container,
        elements: elements,
        style: [
            {
                selector: "node",
                style: {
                    "label": "data(label)",
                    "background-color": function (ele) {
                        const type = ele.data("type") || "";
                        switch (type.toUpperCase()) {
                            case "COMPANY": return "#818cf8"; // indigo-400
                            case "PRODUCT": return "#e2e8f0"; // slate-200
                            case "TECHNOLOGY": return "#c084fc"; // purple-400
                            case "PERSON": return "#f43f5e"; // rose-500
                            default: return "#38bdf8"; // sky-400
                        }
                    },
                    "color": "#0f172a", // Slate-900 (for strong contrast against node colors)
                    "font-size": "10px",
                    "font-weight": "bold",
                    "text-valign": "center",
                    "text-halign": "center",
                    "width": "50px",
                    "height": "50px",
                    "border-width": "2px",
                    "border-color": "#1e293b",
                    "text-wrap": "wrap",
                    "text-max-width": "42px"
                }
            },
            {
                selector: "edge",
                style: {
                    "width": 2,
                    "line-color": "#475569",
                    "target-arrow-color": "#475569",
                    "target-arrow-shape": "triangle",
                    "curve-style": "bezier",
                    "label": "data(label)",
                    "font-size": "8px",
                    "color": "#94a3b8",
                    "text-background-opacity": 0.85,
                    "text-background-color": "#0d1321",
                    "text-background-padding": "2px",
                    "text-background-shape": "roundrectangle",
                    "arrow-scale": 1.0
                }
            },
            {
                selector: "edge:selected",
                style: {
                    "line-color": "#818cf8",
                    "target-arrow-color": "#818cf8",
                    "width": 3
                }
            },
            {
                selector: "node:selected",
                style: {
                    "border-color": "#ffffff",
                    "border-width": "3px"
                }
            }
        ],
        layout: {
            name: "cose",
            animate: false,
            fit: true,
            padding: 15
        }
    });

    // Add click event listener to edges for explainability
    cyInstance.on("tap", "edge", async function (evt) {
        const edge = evt.target;
        const dbId = edge.data("dbId");
        if (dbId) {
            await showProvenance(dbId);
        }
    });
}

// Show Relationship Provenance
async function showProvenance(dbId) {
    const card = document.getElementById("sourceExplainabilityCard");
    try {
        const res = await fetch(`http://localhost:3000/api/graph/source/${dbId}`);
        if (!res.ok) return;
        const data = await res.json();

        document.getElementById("sourceNode").innerText = data.relationship.source;
        document.getElementById("relPath").innerText = ` ➔ ${data.relationship.relation} ➔ `;
        document.getElementById("targetNode").innerText = data.relationship.target;

        const link = document.getElementById("sourcePageLink");
        if (data.page) {
            link.innerText = `${data.page.title || "Untitled Article"} (Confidence: ${data.relationship.confidence || 1.0})`;
            link.href = data.page.url || "#";
            link.style.display = "inline";
        } else {
            link.innerText = "Unknown source";
            link.href = "#";
        }

        card.classList.remove("hidden");
    } catch (err) {
        console.error("Failed to fetch relationship source:", err);
    }
}

// Setup Page Tab DOM Content Load Event
document.addEventListener("DOMContentLoaded", () => {
    // Initial stats load
    loadAnalyticsOnly();

    // Tab routing
    setupTabs();

    // Wire up close explainability card button
    const closeExplainBtn = document.getElementById("closeExplainBtn");
    if (closeExplainBtn) {
        closeExplainBtn.addEventListener("click", () => {
            document.getElementById("sourceExplainabilityCard").classList.add("hidden");
        });
    }
});

// Original Tab Feature Listeners
document.getElementById("summaryBtn").addEventListener("click", async () => {
    const resultBox = document.getElementById("result");
    resultBox.innerText = "Reading page...";

    try {
        const [tab] = await getChrome().tabs.query({
            active: true,
            currentWindow: true
        });

        getChrome().tabs.sendMessage(
            tab.id,
            { action: "getPageContent" },
            async (response) => {
                if (!response) {
                    resultBox.innerText = "Could not read page content.";
                    return;
                }

                resultBox.innerText = "Summarizing...";

                try {
                    const res = await fetch(
                        "http://localhost:3000/summarize",
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                text: response.text,
                                url: response.url,
                                title: tab.title || response.url
                            })
                        }
                    );

                    const data = await res.json();
                    resultBox.innerText = data.summary;

                } catch (err) {
                    resultBox.innerText = "Could not summarize. Is backend running on http://localhost:3000?";
                }
            }
        );
    } catch (err) {
        resultBox.innerText = "Unexpected error occurred.";
    }
});

document.getElementById("askBtn").addEventListener("click", async () => {
    const resultBox = document.getElementById("result");
    const questionInput = document.getElementById("questionInput");
    const question = questionInput.value.trim();

    if (!question) {
        resultBox.innerText = "Please enter a question.";
        return;
    }

    resultBox.innerText = "Reading page...";

    try {
        const [tab] = await getChrome().tabs.query({
            active: true,
            currentWindow: true
        });

        getChrome().tabs.sendMessage(
            tab.id,
            { action: "getPageContent" },
            async (response) => {
                if (!response) {
                    resultBox.innerText = "Could not read page content.";
                    return;
                }

                resultBox.innerText = "Thinking...";

                try {
                    const res = await fetch(
                        "http://localhost:3000/ask",
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                text: response.text,
                                question: question
                            })
                        }
                    );

                    const data = await res.json();
                    resultBox.innerText = data.answer;

                } catch (err) {
                    resultBox.innerText = "Could not answer. Is backend running on http://localhost:3000?";
                }
            }
        );
    } catch (err) {
        resultBox.innerText = "Unexpected error occurred.";
    }
});

document.getElementById("memoryAskBtn").addEventListener("click", async () => {
    const memoryResultBox = document.getElementById("memoryResult");
    const memoryQuestionInput = document.getElementById("memoryQuestionInput");
    const question = memoryQuestionInput.value.trim();

    if (!question) {
        memoryResultBox.innerText = "Please enter a memory question.";
        return;
    }

    memoryResultBox.innerText = "Searching saved memory...";

    try {
        const res = await fetch(
            "http://localhost:3000/api/memory/chat",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    question: question
                })
            }
        );

        const data = await res.json();
        memoryResultBox.innerText = data.answer || "I could not find relevant information in saved memory.";

    } catch (err) {
        memoryResultBox.innerText = "Could not ask memory. Is backend running on http://localhost:3000?";
    }
});

document.getElementById("securityBtn").addEventListener("click", async () => {
    const securityResult = document.getElementById("securityResult");
    securityResult.innerText = "Analyzing page safety...";

    try {
        const [tab] = await getChrome().tabs.query({
            active: true,
            currentWindow: true
        });

        getChrome().tabs.sendMessage(
            tab.id,
            { action: "getPageContent" },
            async (response) => {
                if (!response) {
                    securityResult.innerText = "Could not read page content.";
                    return;
                }

                try {
                    const res = await fetch(
                        "http://localhost:3000/api/security/analyze",
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                url: response.url,
                                pageText: response.text,
                                html: response.html
                            })
                        }
                    );

                    const data = await res.json();
                    let emoji = "[SAFE]";

                    if (data.riskLevel === "suspicious") {
                        emoji = "[SUSPICIOUS]";
                    }
                    if (data.riskLevel === "dangerous") {
                        emoji = "[DANGEROUS]";
                    }

                    let output = `${emoji} ${data.riskLevel.toUpperCase()}\n\nRisk Score: ${data.riskScore}\n\nReasons:\n${data.reasons.length > 0 ? data.reasons.join("\n") : "None"}`;

                    if (data.aiVerification) {
                        output += `\n\nAI Verdict:\n${data.aiVerification.verdict}\n\nConfidence:\n${data.aiVerification.confidence}%\n\nExplanation:\n${data.aiVerification.explanation}`;
                    }

                    securityResult.innerText = output;

                } catch (error) {
                    securityResult.innerText = "Could not analyze page safety.";
                }
            }
        );
    } catch (error) {
        securityResult.innerText = "Unexpected error occurred.";
    }
});

document.getElementById("privacyBtn").addEventListener("click", async () => {
    const privacyResult = document.getElementById("privacyResult");
    const policyInput = document.getElementById("policyInput");
    const policyText = policyInput ? policyInput.value : "";

    privacyResult.innerText = "Analyzing privacy...";

    try {
        const [tab] = await getChrome().tabs.query({
            active: true,
            currentWindow: true
        });

        getChrome().tabs.sendMessage(
            tab.id,
            { action: "getPageContent" },
            async (response) => {
                if (!response) {
                    privacyResult.innerText = "Could not read page content.";
                    return;
                }

                try {
                    const res = await fetch(
                        "http://localhost:3000/api/privacy/analyze",
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                html: response.html,
                                url: response.url,
                                policyText: policyText
                            })
                        }
                    );

                    const data = await res.json();
                    const labels = {
                        email: "Email",
                        phone: "Phone",
                        password: "Password",
                        address: "Address",
                        dob: "DOB",
                        location: "Location"
                    };

                    const dataCollectedList = Object.keys(labels)
                        .map(key => {
                            const icon = data.dataCollected[key] ? "✓" : "✗";
                            return `${icon} ${labels[key]}`;
                        })
                        .join("\n");

                    const trackerList = data.trackers.trackers.length > 0
                        ? data.trackers.trackers.map(t => `✓ ${t}`).join("\n")
                        : "None";

                    const policyLabels = {
                        collectsEmail: "Collects Email",
                        collectsPhone: "Collects Phone",
                        collectsLocation: "Collects Location",
                        collectsAddress: "Collects Address",
                        sharesWithThirdParties: "Shares with Third Parties",
                        retentionMentioned: "Retention Mentioned"
                    };

                    const policyList = data.policy
                        ? Object.keys(policyLabels)
                            .map(key => {
                                const icon = data.policy[key] ? "✓" : "✗";
                                return `${icon} ${policyLabels[key]}`;
                            })
                            .join("\n")
                        : "No policy analyzed";

                    const policyHeader = data.autoFetched
                        ? "Policy Analysis (Auto-Fetched):"
                        : "Policy Analysis:";

                    let output = `🔒 Privacy Analysis\n\nRisk Level: ${data.risk.level}\nRisk Score: ${data.risk.score}\n\nData Collected:\n${dataCollectedList}\n\nTrackers:\n${trackerList}\n\n${policyHeader}\n${policyList}`;

                    if (data.aiSummary) {
                        output += `\n\n🔒 Privacy Summary\n\n${data.aiSummary}`;
                    }

                    privacyResult.innerText = output;

                } catch (error) {
                    privacyResult.innerText = "Could not analyze privacy.";
                }
            }
        );
    } catch (error) {
        privacyResult.innerText = "Unexpected error occurred.";
    }
});

document.getElementById("graphAskBtn").addEventListener("click", async () => {
    const graphResult = document.getElementById("graphResult");
    const graphQuestion = document.getElementById("graphQuestion");
    const question = graphQuestion.value.trim();

    if (!question) {
        graphResult.innerText = "Please enter a question.";
        return;
    }

    graphResult.innerText = "Searching knowledge graph & memory...";

    try {
        const res = await fetch(
            "http://localhost:3000/api/graph/chat",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    question: question
                })
            }
        );

        const data = await res.json();

        // Refresh analytics and graph visualizer
        loadAnalyticsAndGraph();

        graphResult.innerText = data.answer || "No answer could be generated.";

    } catch (err) {
        graphResult.innerText = "Could not ask graph. Is backend running on http://localhost:3000?";
    }
});
