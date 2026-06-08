const { createGeminiService } = require("./geminiService");
const { createGroqService } = require("./groqService");

// The provider is selected once at startup so the routes stay free of AI-specific branching.
function createAiService() {
    const groqService = createGroqService();
    const geminiService = createGeminiService();

    // Groq is the primary provider and Gemini is the automatic fallback.
    async function withFallback(action, text, question) {
        console.log("Using Groq");

        try {
            return await action(groqService, text, question);
        } catch (error) {
            if (!error?.fallbackEligible) {
                throw error;
            }

            console.log("Groq failed, switching to Gemini");
            console.log("Using Gemini fallback");

            try {
                return await action(geminiService, text, question);
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
        }
    };
}

module.exports = {
    createAiService
};