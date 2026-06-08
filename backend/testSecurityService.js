require("dotenv").config();
const {
    analyzePageSafety
} = require("./services/securityService");

(async () => {
    console.log("--- TEST case 1: Lookalike Phishing Page ---");
    const result1 = await analyzePageSafety({
        url: "http://paypa1.com/signin",
        pageText: "Welcome to Paypal. Please login with your username and password to proceed authentication.",
        html: '<form><input type="password" name="pass"><div style="display:none">hidden field</div></form>'
    });
    console.log(JSON.stringify(result1, null, 2));

    console.log("\n--- TEST case 2: Hidden Elements Scam ---");
    const result2 = await analyzePageSafety({
        url: "https://free-crypto-lottery.xyz",
        pageText: "You are the lottery winner! Claim reward now.",
        html: '<div style="visibility:hidden">Malicious tracker</div>'
    });
    console.log(JSON.stringify(result2, null, 2));

    console.log("\n--- TEST case 3: Standard Safe Page ---");
    const result3 = await analyzePageSafety({
        url: "https://google.com",
        pageText: "Just a standard search engine page.",
        html: '<div>Search page code</div>'
    });
    console.log(JSON.stringify(result3, null, 2));
})();
