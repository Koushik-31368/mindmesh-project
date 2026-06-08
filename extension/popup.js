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

document
.getElementById("privacyBtn")
.addEventListener("click", async () => {

    const privacyResult =
        document.getElementById(
            "privacyResult"
        );
    const policyInput =
        document.getElementById(
            "policyInput"
        );
    const policyText =
        policyInput
            ? policyInput.value
            : "";

    privacyResult.innerText =
        "Analyzing privacy...";

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

                    privacyResult.innerText =
                        "Could not read page content.";

                    return;
                }

                try {

                    const res =
                        await fetch(
                            "http://localhost:3000/api/privacy/analyze",
                            {
                                method: "POST",
                                headers: {
                                    "Content-Type":
                                    "application/json"
                                },
                                body: JSON.stringify({
                                    html:
                                        response.html,
                                    url:
                                        response.url,
                                    policyText:
                                        policyText
                                })
                            }
                        );

                    const data =
                        await res.json();

                    const labels = {
                        email: "Email",
                        phone: "Phone",
                        password: "Password",
                        address: "Address",
                        dob: "DOB",
                        location: "Location"
                    };

                    const dataCollectedList =
                        Object.keys(labels)
                        .map(key => {
                            const icon =
                                data.dataCollected[key]
                                    ? "✓"
                                    : "✗";

                            return `${icon} ${labels[key]}`;
                        })
                        .join("\n");

                    const trackerList =
                        data.trackers.trackers.length > 0
                            ? data.trackers.trackers
                                .map(t => `✓ ${t}`)
                                .join("\n")
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
                                const icon =
                                    data.policy[key]
                                        ? "✓"
                                        : "✗";

                                return `${icon} ${policyLabels[key]}`;
                            })
                            .join("\n")
                        : "No policy analyzed";

                    const policyHeader = data.autoFetched
                        ? "Policy Analysis (Auto-Fetched):"
                        : "Policy Analysis:";

                    let output =
`🔒 Privacy Analysis

Risk Level: ${data.risk.level}
Risk Score: ${data.risk.score}

Data Collected:
${dataCollectedList}

Trackers:
${trackerList}

${policyHeader}
${policyList}`;

                    if (data.aiSummary) {
                        output += `\n\n🔒 Privacy Summary\n\n${data.aiSummary}`;
                    }

                    privacyResult.innerText = output;

                } catch (error) {

                    privacyResult.innerText =
                        "Could not analyze privacy.";

                }
            }
        );

    } catch (error) {

        privacyResult.innerText =
            "Unexpected error occurred.";

    }
});
