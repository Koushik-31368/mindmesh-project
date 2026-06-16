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

// ─── Markdown Renderer ────────────────────────────────────────────────
/**
 * Minimal, safe Markdown → HTML renderer (no external dependency).
 * Handles: headers (h2-h4), bold, italic, inline code, unordered &
 * ordered lists, horizontal rules, and paragraphs.
 * Returns an HTML string, set via innerHTML on .md-content elements.
 */
function renderMarkdown(text) {
    if (!text) return "";

    // Escape HTML first to prevent XSS
    const escape = s => s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

    let html = escape(text);

    // Headings
    html = html.replace(/^#### (.+)$/gm, "<h4>$1</h4>");
    html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
    html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
    html = html.replace(/^# (.+)$/gm, "<h2>$1</h2>"); // treat h1 as h2

    // Horizontal rule
    html = html.replace(/^---+$/gm, "<hr style='border:none;border-top:1px solid var(--border-color);margin:10px 0;'>");

    // Bold / Italic
    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
    html = html.replace(/__(.+?)__/g, "<strong>$1</strong>");
    html = html.replace(/_(.+?)_/g, "<em>$1</em>");

    // Inline code
    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

    // Unordered lists (-, *, •)
    html = html.replace(/^[-*•] (.+)$/gm, "<li>$1</li>");
    html = html.replace(/(<li>.*<\/li>\n?)+/g, "<ul>$&</ul>");

    // Ordered lists
    html = html.replace(/^\d+\. (.+)$/gm, "<li>$1</li>");

    // Paragraphs: wrap lines that are not already in block tags
    const blockTags = /^<(h[2-4]|ul|ol|li|hr)/;
    const lines = html.split("\n");
    const paragraphed = [];
    let i = 0;
    while (i < lines.length) {
        const line = lines[i].trim();
        if (!line) {
            i++;
            continue;
        }
        if (blockTags.test(line)) {
            paragraphed.push(line);
        } else {
            paragraphed.push(`<p>${line}</p>`);
        }
        i++;
    }
    return `<div class="md-content">${paragraphed.join("")}</div>`;
}

// ─── Provider Attribution Badge ───────────────────────────────────────
/**
 * Returns HTML for a small badge showing which AI provider was used.
 * @param {string} provider - "groq", "gemini", or any string.
 */
function attributionBadge(provider) {
    if (!provider) return "";
    const name = provider.toLowerCase();
    const label = name === "groq" ? "Groq" : name === "gemini" ? "Gemini" : provider;
    const dotClass = name === "groq" ? "groq" : name === "gemini" ? "gemini" : "";
    return `<div class="attribution-badge"><span class="attribution-dot ${dotClass}"></span>${label}</div>`;
}

// ─── Source Citations ─────────────────────────────────────────────────
/**
 * Returns HTML for a source-citation block.
 * @param {Array<{title:string, url:string}>} sources
 */
function sourceCitations(sources) {
    if (!sources || sources.length === 0) return "";
    const chips = sources.map(s => {
        const title = s.title || s.url || "Source";
        const url   = s.url   || "#";
        const safeTitle = title.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const linkIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 0 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`;
        return `<a class="source-chip" href="${url}" target="_blank" title="${safeTitle}">${linkIcon}${safeTitle}</a>`;
    }).join("");
    return `<div class="source-citations"><div class="citations-label">Sources</div><div class="source-chips">${chips}</div></div>`;
}

// ─── Loading State HTML ───────────────────────────────────────────────
function loadingHTML(message = "Processing...") {
    return `<div class="loading-state"><span class="mm-spinner"></span>${message}</div>`;
}

// ─── Empty Hint HTML ──────────────────────────────────────────────────
function emptyHint(message) {
    return `<div class="empty-hint">${message}</div>`;
}

// ─── Offline / Setup State ────────────────────────────────────────────
function applyOfflineState(offline) {
    const wrapper = document.querySelector(".dashboard-wrapper");
    const offlinePanel = document.getElementById("offlineState");
    if (!wrapper) return;

    if (offline) {
        wrapper.classList.add("is-offline");
        if (offlinePanel) offlinePanel.style.display = "flex";
    } else {
        wrapper.classList.remove("is-offline");
        if (offlinePanel) offlinePanel.style.display = "none";
    }
}

// ─── Processing State ─────────────────────────────────────────────────
function setProcessingState(buttons, isProcessingState, buttonText = null) {
    isProcessing = isProcessingState;
    buttons.forEach(btn => {
        if (!btn) return;
        btn.disabled = isProcessingState;
        if (buttonText !== null) {
            btn.innerHTML = buttonText;
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
    const dot  = document.getElementById("statusDot");
    const text = document.getElementById("statusText");

    try {
        const res = await fetch(`${BACKEND}/health`, { signal: AbortSignal.timeout(3000) });
        if (res.ok) {
            dot.className  = "status-dot connected";
            text.innerText = "Connected";
            isBackendAvailable = true;
            applyOfflineState(false);
        } else {
            dot.className  = "status-dot error";
            text.innerText = "Backend error";
            isBackendAvailable = false;
            applyOfflineState(true);
        }
    } catch {
        dot.className  = "status-dot error";
        text.innerText = "Disconnected";
        isBackendAvailable = false;
        applyOfflineState(true);
    }
}

// ─── SVG Icon Helpers ─────────────────────────────────────────────────
const ICONS = {
    check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    x:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
    warn:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
    eye:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`
};

// ─── Page Tab: Summarize & Ask ────────────────────────────────────────
function setupPageTab() {
    const summaryBtn = document.getElementById("summaryBtn");
    const askBtn     = document.getElementById("askBtn");
    const resultBox  = document.getElementById("result");

    const resetResult = () => {
        resultBox.innerHTML = emptyHint("Summarize a page or ask a question to get started.");
    };

    if (summaryBtn) {
        summaryBtn.addEventListener("click", async () => {
            if (isProcessing) return;
            if (!isBackendAvailable) {
                resultBox.innerHTML = `<div class="empty-hint" style="color:var(--danger-red);">Backend unavailable — see setup panel above.</div>`;
                return;
            }

            setProcessingState([summaryBtn, askBtn], true, `<span class="mm-spinner"></span>Summarizing...`);
            resultBox.innerHTML = loadingHTML("Reading page…");

            try {
                const [tab] = await getChrome().tabs.query({ active: true, currentWindow: true });
                if (!tab) throw new Error("No active tab found.");

                getChrome().tabs.sendMessage(tab.id, { action: "getPageContent" }, async (response) => {
                    if (getChrome().runtime && getChrome().runtime.lastError) {
                        resultBox.innerHTML = `<div class="empty-hint" style="color:var(--danger-red);">Cannot read this page (restricted or extension tab).</div>`;
                        setProcessingState([summaryBtn, askBtn], false, "Summarize Page");
                        return;
                    }
                    if (!response) {
                        resultBox.innerHTML = `<div class="empty-hint" style="color:var(--danger-red);">Could not read page content.</div>`;
                        setProcessingState([summaryBtn, askBtn], false, "Summarize Page");
                        return;
                    }

                    resultBox.innerHTML = loadingHTML("Generating summary…");
                    try {
                        const res  = await fetch(`${BACKEND}/summarize`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ text: response.text, url: response.url, title: tab.title || response.url }),
                            signal: AbortSignal.timeout(20000)
                        });
                        const data = await res.json();

                        if (data.error) {
                            resultBox.innerHTML = `<div class="empty-hint" style="color:var(--danger-red);">${data.error}</div>`;
                        } else {
                            resultBox.innerHTML =
                                renderMarkdown(data.summary || "No summary generated.") +
                                attributionBadge(data.provider);
                            if (data.summary) checkRelatedMemory(response.text, response.url);
                        }
                    } catch (err) {
                        resultBox.innerHTML = `<div class="empty-hint" style="color:var(--danger-red);">${err.name === "TimeoutError" ? "Request timed out." : "Backend unavailable. Is it running on localhost:3000?"}</div>`;
                    } finally {
                        setProcessingState([summaryBtn, askBtn], false, "Summarize Page");
                    }
                });
            } catch (err) {
                resultBox.innerHTML = `<div class="empty-hint" style="color:var(--danger-red);">Unexpected error: ${err.message}</div>`;
                setProcessingState([summaryBtn, askBtn], false, "Summarize Page");
            }
        });
    }

    if (askBtn) {
        askBtn.addEventListener("click", async () => {
            if (isProcessing) return;
            if (!isBackendAvailable) {
                resultBox.innerHTML = `<div class="empty-hint" style="color:var(--danger-red);">Backend unavailable — see setup panel above.</div>`;
                return;
            }

            const questionInput = document.getElementById("questionInput");
            const question = questionInput.value.trim();
            if (!question) {
                resultBox.innerHTML = `<div class="empty-hint">Please enter a question first.</div>`;
                return;
            }

            setProcessingState([summaryBtn, askBtn], true);
            resultBox.innerHTML = loadingHTML("Reading page…");

            try {
                const [tab] = await getChrome().tabs.query({ active: true, currentWindow: true });
                if (!tab) throw new Error("No active tab found.");

                getChrome().tabs.sendMessage(tab.id, { action: "getPageContent" }, async (response) => {
                    if (getChrome().runtime && getChrome().runtime.lastError) {
                        resultBox.innerHTML = `<div class="empty-hint" style="color:var(--danger-red);">Cannot read this page.</div>`;
                        setProcessingState([summaryBtn, askBtn], false);
                        return;
                    }
                    if (!response) {
                        resultBox.innerHTML = `<div class="empty-hint" style="color:var(--danger-red);">Could not read page content.</div>`;
                        setProcessingState([summaryBtn, askBtn], false);
                        return;
                    }

                    resultBox.innerHTML = loadingHTML("Thinking…");
                    try {
                        const res  = await fetch(`${BACKEND}/ask`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ text: response.text, question }),
                            signal: AbortSignal.timeout(20000)
                        });
                        const data = await res.json();
                        resultBox.innerHTML =
                            renderMarkdown(data.answer || data.error || "No answer generated.") +
                            attributionBadge(data.provider);
                    } catch (err) {
                        resultBox.innerHTML = `<div class="empty-hint" style="color:var(--danger-red);">${err.name === "TimeoutError" ? "Request timed out." : "Backend unavailable."}</div>`;
                    } finally {
                        setProcessingState([summaryBtn, askBtn], false);
                    }
                });
            } catch (err) {
                resultBox.innerHTML = `<div class="empty-hint" style="color:var(--danger-red);">Unexpected error: ${err.message}</div>`;
                setProcessingState([summaryBtn, askBtn], false);
            }
        });

        // Allow Enter key in question input
        const qi = document.getElementById("questionInput");
        if (qi) qi.addEventListener("keydown", e => { if (e.key === "Enter") askBtn.click(); });
    }
}

// ─── Memory Tab ───────────────────────────────────────────────────────
function setupMemoryTab() {
    const memoryAskBtn = document.getElementById("memoryAskBtn");
    const memoryResult = document.getElementById("memoryResult");

    if (memoryAskBtn) {
        memoryAskBtn.addEventListener("click", async () => {
            if (isProcessing) return;
            if (!isBackendAvailable) {
                memoryResult.innerHTML = `<div class="empty-hint" style="color:var(--danger-red);">Backend unavailable.</div>`;
                return;
            }

            const input    = document.getElementById("memoryQuestionInput");
            const question = input.value.trim();
            if (!question) {
                memoryResult.innerHTML = emptyHint("Please enter a question.");
                return;
            }

            setProcessingState([memoryAskBtn], true);
            memoryResult.innerHTML = loadingHTML("Searching saved memory…");

            try {
                const res  = await fetch(`${BACKEND}/api/memory/chat`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ question }),
                    signal: AbortSignal.timeout(20000)
                });
                const data = await res.json();

                // Build result with markdown + attribution + source citations
                let html = renderMarkdown(data.answer || "No relevant information found.");
                html += attributionBadge(data.provider);
                if (data.sources && data.sources.length > 0) {
                    html += sourceCitations(data.sources);
                }
                memoryResult.innerHTML = html;
            } catch (err) {
                memoryResult.innerHTML = `<div class="empty-hint" style="color:var(--danger-red);">${err.name === "TimeoutError" ? "Request timed out." : "Backend unavailable."}</div>`;
            } finally {
                setProcessingState([memoryAskBtn], false);
            }
        });

        // Allow Enter key
        const mi = document.getElementById("memoryQuestionInput");
        if (mi) mi.addEventListener("keydown", e => { if (e.key === "Enter") memoryAskBtn.click(); });
    }
}

// ─── Safety Tab ───────────────────────────────────────────────────────
function setupSecurityTab() {
    const securityBtn = document.getElementById("securityBtn");

    if (securityBtn) {
        securityBtn.addEventListener("click", async () => {
            if (isProcessing) return;

            const scoreCircle    = document.getElementById("scoreCircle");
            const scoreNumber    = document.getElementById("scoreNumber");
            const scoreLabel     = document.getElementById("scoreLabel");
            const scoreSubtitle  = document.getElementById("scoreSubtitle");
            const safetyChecks   = document.getElementById("safetyChecks");
            const aiVerdict      = document.getElementById("aiVerdict");
            const aiVerdictContent = document.getElementById("aiVerdictContent");
            const appHeader      = document.getElementById("appHeader");
            const headerTitle    = document.getElementById("headerTitle");

            if (!isBackendAvailable) {
                scoreSubtitle.innerText = "Backend unavailable — start the server first.";
                return;
            }

            setProcessingState([securityBtn], true, `<span class="mm-spinner"></span>Analyzing…`);
            scoreNumber.innerText   = "…";
            scoreLabel.innerText    = "";
            scoreSubtitle.innerText = "Analyzing page…";
            safetyChecks.innerHTML  = loadingHTML("Running safety checks…");
            aiVerdict.style.display = "none";

            try {
                const [tab] = await getChrome().tabs.query({ active: true, currentWindow: true });
                if (!tab) throw new Error("No active tab found.");

                getChrome().tabs.sendMessage(tab.id, { action: "getPageContent" }, async (response) => {
                    if (getChrome().runtime && getChrome().runtime.lastError) {
                        scoreSubtitle.innerText = "Cannot read this page (restricted tab).";
                        safetyChecks.innerHTML = "";
                        setProcessingState([securityBtn], false, "Analyze Page Safety");
                        return;
                    }
                    if (!response) {
                        scoreSubtitle.innerText = "Could not read page content.";
                        safetyChecks.innerHTML = "";
                        setProcessingState([securityBtn], false, "Analyze Page Safety");
                        return;
                    }

                    try {
                        const res  = await fetch(`${BACKEND}/api/security/analyze`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ url: response.url, pageText: response.text, html: response.html }),
                            signal: AbortSignal.timeout(20000)
                        });
                        const data = await res.json();

                        scoreNumber.innerText = data.riskScore;

                        if (data.riskLevel === "safe") {
                            scoreCircle.className   = "score-circle safe";
                            scoreLabel.innerText    = "Safe";
                            scoreSubtitle.innerText = "This page appears legitimate";
                            scoreSubtitle.style.color = "var(--text-muted)";
                            appHeader.classList.remove("danger-mode");
                            document.body.classList.remove("danger-mode-active");
                            headerTitle.innerText   = "MindMesh";
                        } else if (data.riskLevel === "suspicious") {
                            scoreCircle.className   = "score-circle warning";
                            scoreLabel.innerText    = "Warning";
                            scoreSubtitle.innerText = "Some concerns detected";
                            scoreSubtitle.style.color = "var(--warning-orange)";
                            appHeader.classList.remove("danger-mode");
                            document.body.classList.remove("danger-mode-active");
                            headerTitle.innerText   = "MindMesh — Caution";
                        } else {
                            scoreCircle.className   = "score-circle danger";
                            scoreLabel.innerText    = "Danger";
                            scoreSubtitle.innerText = "This page may be dangerous";
                            scoreSubtitle.style.color = "var(--danger-red)";
                            appHeader.classList.add("danger-mode");
                            document.body.classList.add("danger-mode-active");
                            headerTitle.innerText   = "MindMesh — Threat Detected";
                        }

                        if (data.reasons && data.reasons.length > 0) {
                            safetyChecks.innerHTML = data.reasons.map(reason => {
                                const iconClass = data.riskLevel === "safe" ? "success" : (data.riskLevel === "suspicious" ? "warning" : "danger");
                                const icon      = data.riskLevel === "safe" ? ICONS.check : (data.riskLevel === "suspicious" ? ICONS.warn : ICONS.x);
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

                        if (data.aiVerification) {
                            aiVerdict.style.display = "block";
                            aiVerdictContent.innerHTML =
                                renderMarkdown(`**Verdict:** ${data.aiVerification.verdict || "N/A"}\n\n**Confidence:** ${data.aiVerification.confidence || 0}%\n\n${data.aiVerification.explanation || ""}`) +
                                attributionBadge(data.provider);
                        }

                    } catch (err) {
                        scoreSubtitle.innerText = err.name === "TimeoutError" ? "Request timed out." : "Backend unavailable.";
                        safetyChecks.innerHTML = "";
                    } finally {
                        setProcessingState([securityBtn], false, "Analyze Page Safety");
                    }
                });
            } catch (err) {
                scoreSubtitle.innerText = "Unexpected error.";
                safetyChecks.innerHTML = "";
                setProcessingState([securityBtn], false, "Analyze Page Safety");
            }
        });
    }
}

// ─── Privacy Tab ──────────────────────────────────────────────────────
function setupPrivacyTab() {
    const privacyBtn     = document.getElementById("privacyBtn");
    const privacyResult  = document.getElementById("privacyResult");
    const privacyDetails = document.getElementById("privacyDetails");

    if (privacyBtn) {
        privacyBtn.addEventListener("click", async () => {
            if (isProcessing) return;
            if (!isBackendAvailable) {
                privacyResult.innerHTML = `<div class="empty-hint" style="color:var(--danger-red);">Backend unavailable.</div>`;
                return;
            }

            setProcessingState([privacyBtn], true, `<span class="mm-spinner"></span>Analyzing…`);
            privacyResult.innerHTML = loadingHTML("Analyzing privacy…");
            privacyDetails.style.display = "none";

            try {
                const [tab] = await getChrome().tabs.query({ active: true, currentWindow: true });
                if (!tab) throw new Error("No active tab found.");

                getChrome().tabs.sendMessage(tab.id, { action: "getPageContent" }, async (response) => {
                    if (getChrome().runtime && getChrome().runtime.lastError) {
                        privacyResult.innerHTML = `<div class="empty-hint" style="color:var(--danger-red);">Cannot read this page.</div>`;
                        setProcessingState([privacyBtn], false, "Analyze Privacy");
                        return;
                    }
                    if (!response) {
                        privacyResult.innerHTML = `<div class="empty-hint" style="color:var(--danger-red);">Could not read page content.</div>`;
                        setProcessingState([privacyBtn], false, "Analyze Privacy");
                        return;
                    }

                    try {
                        const res  = await fetch(`${BACKEND}/api/privacy/analyze`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ html: response.html, url: response.url }),
                            signal: AbortSignal.timeout(20000)
                        });
                        const data = await res.json();

                        // Risk level pill
                        const riskColors = { low: "var(--success-green)", medium: "var(--warning-orange)", high: "var(--danger-red)" };
                        const riskColor  = riskColors[data.risk.level] || "var(--text-muted)";
                        privacyResult.innerHTML = `<div style="font-size:12.5px;padding:8px 0;"><span style="color:${riskColor};font-weight:600;">${data.risk.level.toUpperCase()} RISK</span> &nbsp;· Score: ${data.risk.score}/100</div>`;

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
                            const icon  = data.dataCollected[key] ? "⚠" : "✓";
                            const color = data.dataCollected[key] ? "var(--warning-orange)" : "var(--success-green)";
                            return `<div style="margin-bottom:4px;"><span style="color:${color};">${icon}</span> ${dataLabels[key]}: ${data.dataCollected[key] ? "Collected" : "Not detected"}</div>`;
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
                                const found     = data.policy[key];
                                const iconClass = found ? "warning" : "success";
                                const icon      = found ? ICONS.warn : ICONS.check;
                                return `<div class="highlight-item ${iconClass}">${icon}<span>${policyLabels[key]}: ${found ? "Yes" : "No"}</span></div>`;
                            }).join("");
                        } else {
                            policyHighlights.innerHTML = `<div class="highlight-item" style="color:var(--text-muted);">No privacy policy found.</div>`;
                        }

                        // AI summary with Markdown
                        const aiSummarySection = document.getElementById("privacyAiSummary");
                        const aiContent        = document.getElementById("privacyAiContent");
                        if (data.aiSummary) {
                            aiSummarySection.style.display = "block";
                            aiContent.innerHTML = renderMarkdown(data.aiSummary) + attributionBadge(data.provider);
                        }

                    } catch (err) {
                        privacyResult.innerHTML = `<div class="empty-hint" style="color:var(--danger-red);">${err.name === "TimeoutError" ? "Request timed out." : "Backend unavailable."}</div>`;
                    } finally {
                        setProcessingState([privacyBtn], false, "Analyze Privacy");
                    }
                });
            } catch (err) {
                privacyResult.innerHTML = `<div class="empty-hint" style="color:var(--danger-red);">Unexpected error.</div>`;
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
        const relsEl     = document.getElementById("analyticsRelationships");
        const pagesEl    = document.getElementById("analyticsPages");

        if (entitiesEl) entitiesEl.innerText = analytics.entities || 0;
        if (relsEl)     relsEl.innerText     = analytics.relationships || 0;
        if (pagesEl)    pagesEl.innerText    = analytics.pagesIndexed || 0;
    } catch (err) {
        console.error("Failed to load analytics:", err);
    }
}

async function loadAnalyticsAndGraph() {
    if (!isBackendAvailable) return;

    const container = document.getElementById("cy");
    if (container) {
        container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#94a3b8;font-size:12px;gap:8px;"><span class="mm-spinner"></span>Loading graph network…</div>`;
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
        container.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:8px;"><div style="color:#94a3b8;font-size:12px;">No graph data yet.</div><div style="color:#64748b;font-size:11px;">Summarize some pages to build your knowledge graph.</div></div>`;
        return;
    }

    container.innerHTML = "";

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
                            case "COMPANY":      return "#0057B8";
                            case "TECHNOLOGY":   return "#00C896";
                            case "PERSON":       return "#1F6FEB";
                            case "PRODUCT":      return "#475569";
                            case "ORGANIZATION": return "#7C3AED";
                            case "LOCATION":     return "#F59E0B";
                            default:             return "#334155";
                        }
                    },
                    "color":        "#ffffff",
                    "font-family":  "Inter, sans-serif",
                    "font-size":    "9px",
                    "font-weight":  "500",
                    "text-valign":  "center",
                    "text-halign":  "center",
                    "width":        "46px",
                    "height":       "46px",
                    "border-width": "1.5px",
                    "border-color": "rgba(255,255,255,0.2)",
                    "text-wrap":    "wrap",
                    "text-max-width": "40px"
                }
            },
            {
                selector: "edge",
                style: {
                    "width":                  1.5,
                    "line-color":             "rgba(255,255,255,0.12)",
                    "target-arrow-color":     "rgba(255,255,255,0.12)",
                    "target-arrow-shape":     "triangle",
                    "curve-style":            "bezier",
                    "label":                  "data(label)",
                    "font-family":            "Inter, sans-serif",
                    "font-size":              "8px",
                    "color":                  "#94a3b8",
                    "text-background-opacity": 1.0,
                    "text-background-color":  "#1E293B",
                    "text-background-padding": "2px",
                    "text-background-shape":  "roundrectangle",
                    "arrow-scale":            0.8
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
        document.getElementById("relPath").innerText    = ` → ${data.relationship.relation} → `;
        document.getElementById("targetNode").innerText = data.relationship.target;

        const link = document.getElementById("sourcePageLink");
        if (data.page) {
            link.innerText = `${data.page.title || "Untitled"} (Confidence: ${data.relationship.confidence || 1.0})`;
            link.href      = data.page.url || "#";
        } else {
            link.innerText = "Source unknown";
            link.href      = "#";
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
            if (!isBackendAvailable) {
                graphResult.innerHTML = `<div class="empty-hint" style="color:var(--danger-red);">Backend unavailable.</div>`;
                return;
            }

            const input    = document.getElementById("graphQuestion");
            const question = input.value.trim();
            if (!question) {
                graphResult.innerHTML = emptyHint("Please enter a question.");
                return;
            }

            setProcessingState([graphAskBtn], true);
            graphResult.innerHTML = loadingHTML("Searching knowledge graph & memory…");

            try {
                const res  = await fetch(`${BACKEND}/api/graph/chat`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ question }),
                    signal: AbortSignal.timeout(20000)
                });
                const data = await res.json();
                loadAnalyticsAndGraph();
                let html = renderMarkdown(data.answer || "No answer generated.");
                html += attributionBadge(data.provider);
                if (data.sources && data.sources.length > 0) html += sourceCitations(data.sources);
                graphResult.innerHTML = html;
            } catch (err) {
                graphResult.innerHTML = `<div class="empty-hint" style="color:var(--danger-red);">${err.name === "TimeoutError" ? "Request timed out." : "Backend unavailable."}</div>`;
            } finally {
                setProcessingState([graphAskBtn], false);
            }
        });

        // Allow Enter key
        const gi = document.getElementById("graphQuestion");
        if (gi) gi.addEventListener("keydown", e => { if (e.key === "Enter") graphAskBtn.click(); });
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

    // Collapse / close button → message parent content.js
    const collapseBtn = document.getElementById("collapseBtn");
    if (collapseBtn) {
        collapseBtn.addEventListener("click", () => {
            window.parent.postMessage("collapseMindMeshDashboard", "*");
        });
    }

    // Retry connection button in offline panel
    const retryBtn = document.getElementById("retryConnectionBtn");
    if (retryBtn) {
        retryBtn.addEventListener("click", async () => {
            retryBtn.disabled = true;
            retryBtn.innerHTML = `<span class="mm-spinner"></span>Checking…`;
            await checkBackendHealth();
            if (isBackendAvailable) {
                loadAnalyticsOnly();
            } else {
                retryBtn.disabled = false;
                retryBtn.innerHTML = "↻ Retry Connection";
            }
        });
    }
});

// ─── Related Memory (Déjà Browse) ─────────────────────────────────────
async function checkRelatedMemory(text, currentUrl) {
    const sessionKey = `rm_shown_${currentUrl}`;
    if (sessionStorage.getItem(sessionKey)) return;

    try {
        const res  = await fetch(`${BACKEND}/api/memory/related`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, currentUrl }),
            signal: AbortSignal.timeout(10000)
        });
        const data = await res.json();

        if (data.found) {
            sessionStorage.setItem(sessionKey, "true");

            const toast      = document.getElementById("relatedMemoryToast");
            const rmTitle    = document.getElementById("rmTitle");
            const rmDays     = document.getElementById("rmDays");
            const rmSim      = document.getElementById("rmSim");
            const rmOpenBtn  = document.getElementById("rmOpenBtn");
            const rmDismissBtn = document.getElementById("rmDismissBtn");

            if (!toast) return;

            rmTitle.innerText = data.title || "Untitled Page";
            rmDays.innerText  = data.daysSinceViewed;
            rmSim.innerText   = data.similarity;

            rmOpenBtn.onclick = () => {
                if (getChrome().tabs.create) {
                    getChrome().tabs.create({ url: data.url });
                } else {
                    window.open(data.url, "_blank");
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
