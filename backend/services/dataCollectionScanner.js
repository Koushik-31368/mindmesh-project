/**
 * Scan page HTML for personal data collection indicators.
 * Detects email, phone, password, address, DOB, and location fields.
 * @param {string} html - Raw HTML content of the page.
 * @returns {object} Boolean flags for each data category.
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
            lowerHtml.includes("geolocation")
    };
}

module.exports = { scanDataCollection };
