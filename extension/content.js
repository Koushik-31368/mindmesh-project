console.log("MindMesh content script loaded");

chrome.runtime.onMessage.addListener(
    (request, sender, sendResponse) => {
        if (request.action === "getPageContent") {
            sendResponse({
                text: document.body.innerText,
                url: window.location.href,
                html: document.documentElement.outerHTML
            });
        }

        return true;
    }
);
