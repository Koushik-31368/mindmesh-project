/**
 * Scan page HTML for personal data collection indicators.
 * Detects email, phone, password, address, DOB, and location fields.
 * @param {string} html - Raw HTML content of the page.
 * @returns {object} Boolean flags for each data category.
 */
/**
 * Scans raw page HTML for personal data collection form fields and keywords.
 * Detection is keyword-based on lowercased HTML; intended as a fast heuristic.
 * @param {string} html - Raw HTML content of the page.
 * @returns {{
 *   email: boolean, phone: boolean, password: boolean,
 *   address: boolean, dob: boolean, location: boolean,
 *   creditCard: boolean, ssn: boolean,
 *   biometric: boolean, ipAddress: boolean
 * }}
 */
function scanDataCollection(html) {
    const lowerHtml = html.toLowerCase();

    return {
        email:
            lowerHtml.includes('type="email"') ||
            lowerHtml.includes("email"),

        phone:
            lowerHtml.includes('type="tel"') ||
            lowerHtml.includes("phone"),

        password:
            lowerHtml.includes('type="password"'),

        address:
            lowerHtml.includes("address"),

        dob:
            lowerHtml.includes("date of birth") ||
            lowerHtml.includes("dob"),

        location:
            lowerHtml.includes("location") ||
            lowerHtml.includes("geolocation"),

        creditCard:
            lowerHtml.includes("credit card") ||
            lowerHtml.includes("card number") ||
            lowerHtml.includes("cvv"),

        ssn:
            lowerHtml.includes("social security") ||
            lowerHtml.includes("ssn") ||
            lowerHtml.includes("national id"),

        biometric:
            lowerHtml.includes("fingerprint") ||
            lowerHtml.includes("face id") ||
            lowerHtml.includes("biometric") ||
            lowerHtml.includes("retina scan"),

        ipAddress:
            lowerHtml.includes("ip address") ||
            lowerHtml.includes("your ip") ||
            lowerHtml.includes("ip logging")
    };
}

module.exports = { scanDataCollection };
