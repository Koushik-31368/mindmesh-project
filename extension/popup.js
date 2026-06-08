document
.getElementById("summaryBtn")
.addEventListener("click", async () => {

    const resultBox = document.getElementById("result");
    resultBox.innerText = "Reading page...";

    try {

        const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true
        });

        chrome.tabs.sendMessage(
            tab.id,
            { action: "getPageContent" },
            async (response) => {

                if (!response) {
                    resultBox.innerText =
                        "Could not read page content.";
                    return;
                }

                resultBox.innerText = "Summarizing...";

                try {

                    const res = await fetch(
                        "http://localhost:3000/summarize",
                        {
                            method: "POST",
                            headers: {
                                "Content-Type":
                                "application/json"
                            },
                            body: JSON.stringify({
                                text: response.text
                            })
                        }
                    );

                    const data = await res.json();

                    resultBox.innerText =
                        data.summary;

                } catch (err) {

                    resultBox.innerText =
                        "Could not summarize. Is backend running on http://localhost:3000?";

                }
            }
        );

    } catch (err) {

        resultBox.innerText =
            "Unexpected error occurred.";

    }
});

document
.getElementById("askBtn")
.addEventListener("click", async () => {

    const resultBox = document.getElementById("result");
    const questionInput = document.getElementById("questionInput");
    const question = questionInput.value.trim();

    if (!question) {
        resultBox.innerText = "Please enter a question.";
        return;
    }

    resultBox.innerText = "Reading page...";

    try {

        const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true
        });

        chrome.tabs.sendMessage(
            tab.id,
            { action: "getPageContent" },
            async (response) => {

                if (!response) {
                    resultBox.innerText =
                        "Could not read page content.";
                    return;
                }

                resultBox.innerText = "Thinking...";

                try {

                    const res = await fetch(
                        "http://localhost:3000/ask",
                        {
                            method: "POST",
                            headers: {
                                "Content-Type":
                                "application/json"
                            },
                            body: JSON.stringify({
                                text: response.text,
                                question: question
                            })
                        }
                    );

                    const data = await res.json();

                    resultBox.innerText =
                        data.answer;

                } catch (err) {

                    resultBox.innerText =
                        "Could not answer. Is backend running on http://localhost:3000?";

                }
            }
        );

    } catch (err) {

        resultBox.innerText =
            "Unexpected error occurred.";

    }
});

document
.getElementById("memoryAskBtn")
.addEventListener("click", async () => {

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
                    "Content-Type":
                    "application/json"
                },
                body: JSON.stringify({
                    question: question
                })
            }
        );

        const data = await res.json();

        memoryResultBox.innerText =
            data.answer || "I could not find relevant information in saved memory.";

    } catch (err) {

        memoryResultBox.innerText =
            "Could not ask memory. Is backend running on http://localhost:3000?";

    }
});

document
.getElementById("securityBtn")
.addEventListener("click", async () => {

    const securityResult =
        document.getElementById(
            "securityResult"
        );

    securityResult.innerText =
        "Analyzing page safety...";

    try {

        const [tab] =
            await chrome.tabs.query({
                active: true,
                currentWindow: true
            });

        chrome.tabs.sendMessage(
            tab.id,
            {
                action:
                    "getPageContent"
            },
            async (response) => {

                if (!response) {

                    securityResult.innerText =
                        "Could not read page content.";

                    return;
                }

                try {

                    const res =
                        await fetch(
                            "http://localhost:3000/api/security/analyze",
                            {
                                method: "POST",
                                headers: {
                                    "Content-Type":
                                    "application/json"
                                },
                                body: JSON.stringify({
                                    url:
                                        response.url,
                                    pageText:
                                        response.text,
                                    html:
                                        response.html
                                })
                            }
                        );

                    const data =
                        await res.json();

                    let emoji = "[SAFE]";

                    if (
                        data.riskLevel ===
                        "suspicious"
                    ) {
                        emoji = "[SUSPICIOUS]";
                    }

                    if (
                        data.riskLevel ===
                        "dangerous"
                    ) {
                        emoji = "[DANGEROUS]";
                    }

                    let output =
`${emoji} ${data.riskLevel.toUpperCase()}

Risk Score: ${data.riskScore}

Reasons:
${data.reasons.length > 0 ? data.reasons.join("\n") : "None"}`;

                    if (data.aiVerification) {
                        output += `

AI Verdict:
${data.aiVerification.verdict}

Confidence:
${data.aiVerification.confidence}%

Explanation:
${data.aiVerification.explanation}`;
                    }

                    securityResult.innerText = output;

                } catch (error) {

                    securityResult.innerText =
                        "Could not analyze page safety.";

                }
            }
        );

    } catch (error) {

        securityResult.innerText =
            "Unexpected error occurred.";

    }
});
