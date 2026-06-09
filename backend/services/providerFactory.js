const { createGeminiService } = require("./geminiService");
const { createGroqService } = require("./groqService");

// The provider is selected once at startup so the routes stay free of AI-specific branching.
function createAiService() {
    const groqService = createGroqService();
    const geminiService = createGeminiService();

    // Groq is the primary provider and Gemini is the automatic fallback.
    async function withFallback(action, ...args) {
        console.log("Using Groq");

        try {
            return await action(groqService, ...args);
        } catch (error) {
            if (!error?.fallbackEligible) {
                throw error;
            }

            console.log("Groq failed, switching to Gemini");
            console.log("Using Gemini fallback");

            try {
                return await action(geminiService, ...args);
            } catch (geminiError) {
                console.error(geminiError);

                const unavailableError = new Error(
                    "All AI providers are currently unavailable. Please try again later."
                );
                unavailableError.statusCode = 503;
                unavailableError.userMessage = unavailableError.message;
                unavailableError.allProvidersFailed = true;

                throw unavailableError;
            }
        }
    }

    return {
        summarize(text) {
            return withFallback((service, pageText) => service.summarize(pageText), text);
        },
        ask(text, question) {
            return withFallback((service, pageText, userQuestion) => service.ask(pageText, userQuestion), text, question);
        },
        securityVerify(evidence) {
            return withFallback((service, pageEvidence) => service.securityVerify(pageEvidence), evidence);
        },
        privacySummary(policyText) {
            return withFallback((service, text) => service.privacySummary(text), policyText);
        },
        extractGraphData(text) {
            return withFallback((service, pageText) => service.extractGraphData(pageText), text);
        },
        answerQuestion(question, graphContext, memoryContext) {
            return withFallback(
                (service, q, gCtx, mCtx) => service.answerQuestion(q, gCtx, mCtx),
                question,
                graphContext,
                memoryContext
            );
        }
    };
}

module.exports = {
    createAiService
};