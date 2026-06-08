require("dotenv").config();

const {
    savePage,
    searchSimilarChunks
} = require("./services/memory/memoryService");

(async () => {
    await savePage({
        url: "test://semantic/aws-lambda",
        title: "AWS Lambda",
        content: "AWS Lambda is a serverless compute service"
    });

    await savePage({
        url: "test://semantic/aws-s3",
        title: "Amazon S3",
        content: "Amazon S3 is cloud object storage"
    });

    await savePage({
        url: "test://semantic/unrelated",
        title: "Unrelated",
        content: "Tomatoes grow best with sunlight and regular watering"
    });

    const results = await searchSimilarChunks("serverless AWS service");

    console.log("semantic search results:");
    console.log(results);

    const lambdaResult = results.find((result) => {
        return result.chunkText === "AWS Lambda is a serverless compute service";
    });

    const unrelatedResult = results.find((result) => {
        return result.chunkText === "Tomatoes grow best with sunlight and regular watering";
    });

    if (!lambdaResult) {
        throw new Error("Expected AWS Lambda chunk in search results.");
    }

    if (unrelatedResult && lambdaResult.score <= unrelatedResult.score) {
        throw new Error("Expected AWS Lambda chunk to rank above unrelated chunks.");
    }

    console.log("top match:", results[0]);
})();
