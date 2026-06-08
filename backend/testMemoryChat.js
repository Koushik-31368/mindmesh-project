require("dotenv").config();

const { savePage } = require("./services/memory/memoryService");
const { answerFromMemory } = require("./services/memory/memoryChatService");

(async () => {
    await savePage({
        url: "test://memory-chat/aws-lambda",
        title: "AWS Lambda",
        content: "AWS Lambda is a serverless compute service."
    });

    await savePage({
        url: "test://memory-chat/aws-s3",
        title: "Amazon S3",
        content: "Amazon S3 is cloud object storage."
    });

    await savePage({
        url: "test://memory-chat/unrelated",
        title: "Unrelated",
        content: "Tomatoes grow best with sunlight and regular watering."
    });

    const answer = await answerFromMemory("What AWS service is serverless?");

    console.log("answer:", answer);

    if (!answer.toLowerCase().includes("aws lambda")) {
        throw new Error("Expected answer to mention AWS Lambda.");
    }
})();
