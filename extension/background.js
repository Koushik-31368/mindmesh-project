/**
 * MindMesh Background Service Worker (Manifest V3)
 * Handles toolbar icon clicks, programmatic content script injection,
 * and badge state management for the floating assistant.
 */
console.log("MindMesh background service worker initialized");

chrome.action.onClicked.addListener(async (tab) => {
    console.log("MindMesh extension toolbar icon clicked! Tab ID:", tab?.id, "URL:", tab?.url);
    if (!tab || !tab.id) return;
    
    // Bypass system/restricted pages
    if (tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://") || tab.url.startsWith("edge://") || tab.url.startsWith("about:")) {
        console.warn("Chrome restricts script injection on browser internal URLs:", tab.url);
        return;
    }
    
    try {
        console.log("Attempting to send toggleFloatingShield message to content script...");
        await chrome.tabs.sendMessage(tab.id, { action: "toggleFloatingShield" });
        console.log("Message toggleFloatingShield sent successfully!");
    } catch (err) {
        console.warn("Content script not detected in active tab. Attempting programmatic script injection...", err.message);
        try {
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ["content.js"]
            });
            console.log("content.js injected programmatically successfully!");
            
            // Wait a brief moment and resend the toggle message
            setTimeout(async () => {
                try {
                    await chrome.tabs.sendMessage(tab.id, { action: "toggleFloatingShield" });
                    console.log("Resent toggleFloatingShield message successfully!");
                } catch (resendErr) {
                    console.error("Failed to communicate with content script after injection:", resendErr);
                }
            }, 150);
        } catch (injectErr) {
            console.error("Programmatic script injection failed:", injectErr);
        }
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "updateIconState" && sender.tab) {
        if (request.isActive) {
            chrome.action.setBadgeText({text: "•", tabId: sender.tab.id});
            chrome.action.setBadgeBackgroundColor({color: "#00C896", tabId: sender.tab.id});
        } else {
            chrome.action.setBadgeText({text: "", tabId: sender.tab.id});
        }
    }
});
