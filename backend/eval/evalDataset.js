/**
 * MindMesh RAG Evaluation Dataset
 * ─────────────────────────────────────────────────────────────────────────────
 * HOW TO FILL THIS IN:
 *
 * For each test case:
 *  1. Open the URL in your browser with MindMesh active
 *  2. Hit "Summarize" to warm the RAG index
 *  3. Ask the question manually and note what the correct answer is
 *  4. Fill in `expectedAnswer` (1-2 sentences, what the page actually says)
 *  5. Fill in `expectedKeywords` (2-3 words that MUST appear in any correct answer)
 *
 * IMPORTANT: Pick questions whose answers are PAST the 8,000-character mark on
 * the page — that's the only way to prove RAG is doing real work vs. the old
 * truncation path. Count ~1,500 words ≈ 8,000 chars as your rough cutoff.
 *
 * Sections marked "TODO" must be filled in by you after reading the pages.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const EVAL_DATASET = [

    // ── Wikipedia: Machine Learning ──────────────────────────────────────────
    // Long article (~50k chars). Reinforcement learning section is deep in page.
    {
        id: "ml-01",
        url: "https://en.wikipedia.org/wiki/Machine_learning",
        question: "What are the main approaches used in reinforcement learning according to the article?",
        expectedAnswer: "TODO — read the article and fill in what it says about reinforcement learning approaches",
        expectedKeywords: ["reward", "agent", "reinforcement"] // adjust after reading
    },
    {
        id: "ml-02",
        url: "https://en.wikipedia.org/wiki/Machine_learning",
        question: "What does the article say about unsupervised learning and clustering?",
        expectedAnswer: "TODO — fill in after reading the unsupervised learning section",
        expectedKeywords: ["cluster", "unsupervised", "unlabeled"] // adjust after reading
    },
    {
        id: "ml-03",
        url: "https://en.wikipedia.org/wiki/Machine_learning",
        question: "How does the article describe the bias-variance tradeoff?",
        expectedAnswer: "TODO — fill in after reading",
        expectedKeywords: ["bias", "variance", "tradeoff"] // adjust after reading
    },

    // ── Wikipedia: Artificial Intelligence ───────────────────────────────────
    {
        id: "ai-01",
        url: "https://en.wikipedia.org/wiki/Artificial_intelligence",
        question: "What does the article say about AI safety and existential risk?",
        expectedAnswer: "TODO — fill in after reading the AI safety section",
        expectedKeywords: ["safety", "existential", "risk"] // adjust after reading
    },
    {
        id: "ai-02",
        url: "https://en.wikipedia.org/wiki/Artificial_intelligence",
        question: "How does the article describe symbolic AI vs connectionist approaches?",
        expectedAnswer: "TODO — fill in after reading",
        expectedKeywords: ["symbolic", "connectionist", "neural"] // adjust after reading
    },
    {
        id: "ai-03",
        url: "https://en.wikipedia.org/wiki/Artificial_intelligence",
        question: "What criticisms of AI does the article mention?",
        expectedAnswer: "TODO — fill in after reading the criticisms section",
        expectedKeywords: ["criticism", "bias", "concern"] // adjust after reading
    },

    // ── Wikipedia: Natural Language Processing ───────────────────────────────
    {
        id: "nlp-01",
        url: "https://en.wikipedia.org/wiki/Natural_language_processing",
        question: "What does the article say about transformer models and their role in NLP?",
        expectedAnswer: "TODO — fill in after reading",
        expectedKeywords: ["transformer", "attention", "BERT"] // adjust after reading
    },
    {
        id: "nlp-02",
        url: "https://en.wikipedia.org/wiki/Natural_language_processing",
        question: "How does the article describe the challenges of coreference resolution?",
        expectedAnswer: "TODO — fill in after reading",
        expectedKeywords: ["coreference", "reference", "pronoun"] // adjust after reading
    },

    // ── Wikipedia: Large Language Models ─────────────────────────────────────
    {
        id: "llm-01",
        url: "https://en.wikipedia.org/wiki/Large_language_model",
        question: "What does the article say about emergent abilities in large language models?",
        expectedAnswer: "TODO — fill in after reading the emergent abilities section",
        expectedKeywords: ["emergent", "ability", "scale"] // adjust after reading
    },
    {
        id: "llm-02",
        url: "https://en.wikipedia.org/wiki/Large_language_model",
        question: "How does the article describe RLHF (reinforcement learning from human feedback)?",
        expectedAnswer: "TODO — fill in after reading",
        expectedKeywords: ["RLHF", "human feedback", "fine-tuning"] // adjust after reading
    },
    {
        id: "llm-03",
        url: "https://en.wikipedia.org/wiki/Large_language_model",
        question: "What hallucination problems does the article describe for LLMs?",
        expectedAnswer: "TODO — fill in after reading the limitations section",
        expectedKeywords: ["hallucination", "factual", "incorrect"] // adjust after reading
    },

    // ── Wikipedia: Deep Learning ─────────────────────────────────────────────
    {
        id: "dl-01",
        url: "https://en.wikipedia.org/wiki/Deep_learning",
        question: "What does the article say about convolutional neural networks and image recognition?",
        expectedAnswer: "TODO — fill in after reading",
        expectedKeywords: ["convolutional", "image", "recognition"] // adjust after reading
    },
    {
        id: "dl-02",
        url: "https://en.wikipedia.org/wiki/Deep_learning",
        question: "How does the article describe the vanishing gradient problem?",
        expectedAnswer: "TODO — fill in after reading",
        expectedKeywords: ["vanishing", "gradient", "backpropagation"] // adjust after reading
    },

    // ── Wikipedia: Retrieval-Augmented Generation ─────────────────────────────
    {
        id: "rag-01",
        url: "https://en.wikipedia.org/wiki/Retrieval-augmented_generation",
        question: "What are the main components of a RAG system according to the article?",
        expectedAnswer: "TODO — fill in after reading",
        expectedKeywords: ["retriever", "generator", "index"] // adjust after reading
    },
    {
        id: "rag-02",
        url: "https://en.wikipedia.org/wiki/Retrieval-augmented_generation",
        question: "What limitations of RAG does the article mention?",
        expectedAnswer: "TODO — fill in after reading the limitations section",
        expectedKeywords: ["limitation", "retrieval", "accuracy"] // adjust after reading
    },

    // ── Add your own tested pages below ──────────────────────────────────────
    // Copy this template and fill in all fields:
    // {
    //     id: "custom-01",
    //     url: "https://...",
    //     question: "...",
    //     expectedAnswer: "...",
    //     expectedKeywords: ["keyword1", "keyword2", "keyword3"]
    // },
];

module.exports = EVAL_DATASET;
