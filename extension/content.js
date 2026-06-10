(() => {
    if (window.hasMindMeshCopilotLoaded) {
        console.log("[MindMesh Copilot] content.js is already active. Bypassing duplicate initialization.");
        return;
    }
    window.hasMindMeshCopilotLoaded = true;

    const State = {
        INACTIVE: 0,
        LAUNCHER: 1,
        DASHBOARD: 2
    };

    let currentState = State.INACTIVE;
    let mmShadow = null;

    chrome.storage.local.get(["mm-copilot-state"], (items) => {
        if (items["mm-copilot-state"] !== undefined) {
            currentState = items["mm-copilot-state"];
        }
        
        if (currentState !== State.INACTIVE) {
            initUI();
            applyState();
        }
    });

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "toggleFloatingShield") {
            if (currentState === State.INACTIVE) {
                currentState = State.LAUNCHER;
                initUI();
            } else {
                currentState = State.INACTIVE;
            }
            applyState();
            saveState();
        } else if (request.action === "getPageContent") {
            sendResponse({
                text: document.body.innerText,
                url: window.location.href,
                html: document.documentElement.outerHTML
            });
        }
        return true;
    });

    window.addEventListener("message", (event) => {
        if (event.data === "collapseMindMeshDashboard") {
            if (currentState === State.DASHBOARD) {
                currentState = State.LAUNCHER;
                applyState();
                saveState();
            }
        }
    });

    function saveState() {
        chrome.storage.local.set({ "mm-copilot-state": currentState });
    }

    function initUI() {
        let existingRoot = document.getElementById("mindmesh-copilot-root");
        if (existingRoot) {
            existingRoot.remove();
        }

        const mmContainer = document.createElement("div");
        mmContainer.id = "mindmesh-copilot-root";
        mmContainer.style.position = "fixed";
        mmContainer.style.zIndex = "2147483647";
        mmContainer.style.top = "0";
        mmContainer.style.left = "0";
        mmContainer.style.width = "0";
        mmContainer.style.height = "0";
        document.body.appendChild(mmContainer);

        mmShadow = mmContainer.attachShadow({ mode: "open" });

        const style = document.createElement("style");
        style.textContent = `
            :host {
                all: initial;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            }

            /* Sleek Floating Launcher */
            .mm-launcher {
                position: fixed;
                top: 25%;
                right: 24px;
                width: 48px;
                height: 48px;
                background-color: #0057B8;
                border-radius: 12px;
                cursor: pointer;
                z-index: 2147483647;
                user-select: none;
                transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.2s, background-color 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 15px rgba(0, 87, 184, 0.3);
                border: 1px solid rgba(255, 255, 255, 0.1);
            }

            .mm-launcher:hover {
                transform: scale(1.05);
                background-color: #004799;
                box-shadow: 0 6px 20px rgba(0, 87, 184, 0.4);
            }

            .mm-launcher:active {
                transform: scale(0.95);
            }

            .mm-shield-icon {
                width: 24px;
                height: 24px;
                fill: white;
            }

            .mm-status-dot {
                position: absolute;
                top: -3px;
                right: -3px;
                width: 12px;
                height: 12px;
                border-radius: 50%;
                background-color: #00C896;
                border: 2px solid #111827; /* Dark background color matcher to blend */
                box-shadow: 0 0 6px rgba(0, 200, 150, 0.6);
            }

            /* Dashboard Sidebar */
            .mm-sidebar {
                position: fixed;
                top: 0;
                right: 0;
                width: 440px;
                height: 100vh;
                background: #0F172A;
                box-shadow: -5px 0 30px rgba(0, 0, 0, 0.5);
                transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s;
                z-index: 2147483646;
                opacity: 0;
                pointer-events: none;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                border-left: 1px solid rgba(255, 255, 255, 0.08);
                transform: translateX(100%);
            }

            .mm-sidebar.open {
                transform: translateX(0);
                opacity: 1;
                pointer-events: all;
            }

            .mm-iframe {
                width: 100%;
                height: 100%;
                border: none;
                background: transparent;
            }
        `;

        mmShadow.appendChild(style);

        const launcher = document.createElement("div");
        launcher.className = "mm-launcher";
        launcher.title = "MindMesh Assistant";
        
        // Simple SVG shield icon
        launcher.innerHTML = `
            <svg class="mm-shield-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M9 12l2 2 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span class="mm-status-dot"></span>
        `;

        const sidebar = document.createElement("div");
        sidebar.className = "mm-sidebar";

        const iframe = document.createElement("iframe");
        iframe.className = "mm-iframe";
        iframe.src = chrome.runtime.getURL("popup.html");

        sidebar.appendChild(iframe);

        mmShadow.appendChild(launcher);
        mmShadow.appendChild(sidebar);

        launcher.addEventListener("click", (e) => {
            e.preventDefault();
            currentState = State.DASHBOARD;
            applyState();
            saveState();
        });
    }

    function applyState() {
        // Send state to background script to update extension badge
        chrome.runtime.sendMessage({ 
            action: "updateIconState", 
            isActive: currentState !== State.INACTIVE 
        });

        if (!mmShadow) return;

        const launcher = mmShadow.querySelector(".mm-launcher");
        const sidebar = mmShadow.querySelector(".mm-sidebar");

        if (!launcher || !sidebar) return;

        if (currentState === State.INACTIVE) {
            launcher.style.display = "none";
            sidebar.classList.remove("open");
        } else if (currentState === State.LAUNCHER) {
            launcher.style.display = "flex";
            sidebar.classList.remove("open");
        } else if (currentState === State.DASHBOARD) {
            launcher.style.display = "none";
            sidebar.classList.add("open");
        }
    }
})();
