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
