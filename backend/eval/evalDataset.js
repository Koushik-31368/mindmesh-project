/**
 * MindMesh RAG Evaluation Dataset
 * ─────────────────────────────────────────────────────────────────────────────
 * Two test pages:
 *   • warnerCases    (15 cases) — David Warner (cricketer) Wikipedia article
 *   • chernobylCases (10 cases) — Chernobyl disaster Wikipedia article (~200k chars)
 *
 * All keywords match the ACTUAL phrasing from the live article text.
 * All Chernobyl facts are sourced from past the 8,000-char mark of the article.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const EVAL_DATASET = [
    // ── Page 1: David Warner (cricketer) ─────────────────────────────────────
    {
        id: "warner-01",
        url: "https://en.wikipedia.org/wiki/David_Warner_(cricketer)",
        question: "How many runs did David Warner score in the 2016 IPL final and who was the opposition?",
        expectedAnswer: "Warner scored 69 runs in the 2016 IPL final against Royal Challengers Bangalore.",
        expectedKeywords: ["69", "Royal Challengers Bangalore", "IPL"]
    },
    {
        id: "warner-02",
        url: "https://en.wikipedia.org/wiki/David_Warner_(cricketer)",
        question: "What was David Warner's total run tally in the 2016 IPL season?",
        expectedAnswer: "Warner scored 848 runs in the 2016 IPL season.",
        expectedKeywords: ["848", "2016", "IPL"]
    },
    {
        id: "warner-03",
        url: "https://en.wikipedia.org/wiki/David_Warner_(cricketer)",
        question: "What milestone did David Warner reach against Pakistan on 28 December 2016?",
        expectedAnswer: "On 28 December 2016, Warner scored his 5,000th Test run against Pakistan.",
        expectedKeywords: ["5,000th", "Pakistan", "Test run"]
    },
    {
        id: "warner-04",
        url: "https://en.wikipedia.org/wiki/David_Warner_(cricketer)",
        question: "What records does Warner hold as an opening pair with Shane Watson in T20Is?",
        expectedAnswer: "Warner and Shane Watson hold the highest partnership total for opening pairs in T20 Internationals with 1,108 runs.",
        expectedKeywords: ["Watson", "1,108", "opening"]
    },
    {
        id: "warner-05",
        url: "https://en.wikipedia.org/wiki/David_Warner_(cricketer)",
        question: "What happened to David Warner's captaincy at Sunrisers Hyderabad in 2021?",
        expectedAnswer: "Warner was replaced as captain of Sunrisers Hyderabad in 2021 and later dropped from the squad.",
        expectedKeywords: ["captain", "Sunrisers Hyderabad", "2021"]
    },
    {
        id: "warner-06",
        url: "https://en.wikipedia.org/wiki/David_Warner_(cricketer)",
        question: "Which Australian cricket scandal led to David Warner's 12-month ban?",
        expectedAnswer: "Warner received a 12-month ban for his involvement in the 2018 ball tampering scandal involving sandpaper.",
        expectedKeywords: ["sandpaper", "12-month", "ban"]
    },
    {
        id: "warner-07",
        url: "https://en.wikipedia.org/wiki/David_Warner_(cricketer)",
        question: "What leadership ban did Cricket Australia impose on Warner after the 2018 scandal?",
        expectedAnswer: "Cricket Australia imposed a permanent leadership ban on Warner following the 2018 ball tampering scandal.",
        expectedKeywords: ["leadership", "banned", "Cricket Australia"]
    },
    {
        id: "warner-08",
        url: "https://en.wikipedia.org/wiki/David_Warner_(cricketer)",
        question: "What were David Warner's batting figures in Australia's 2021 T20 World Cup campaign?",
        expectedAnswer: "Warner scored 289 runs in the 2021 ICC Men's T20 World Cup, hitting three half-centuries.",
        expectedKeywords: ["289", "T20 World Cup", "half"]
    },
    {
        id: "warner-09",
        url: "https://en.wikipedia.org/wiki/David_Warner_(cricketer)",
        question: "When and against whom did Warner score his highest Test score of 335 not out?",
        expectedAnswer: "Warner scored 335 not out against Pakistan on 30 November 2019.",
        expectedKeywords: ["335", "Pakistan", "2019"]
    },
    {
        id: "warner-10",
        url: "https://en.wikipedia.org/wiki/David_Warner_(cricketer)",
        question: "Which award did David Warner win for his 2019-20 Test summer performances?",
        expectedAnswer: "Warner won the Allan Border Medal for his 2019-20 Test summer performances.",
        expectedKeywords: ["Allan Border Medal", "2019", "Test"]
    },
    {
        id: "warner-11",
        url: "https://en.wikipedia.org/wiki/David_Warner_(cricketer)",
        question: "What jersey number does David Warner wear and what is his nickname?",
        expectedAnswer: "David Warner wears jersey number 31 and his nickname is Bull.",
        expectedKeywords: ["31", "Bull", "nickname"]
    },
    {
        id: "warner-12",
        url: "https://en.wikipedia.org/wiki/David_Warner_(cricketer)",
        question: "When did Warner make his Test debut and who was it against?",
        expectedAnswer: "Warner made his Test debut on 1 December 2011 against New Zealand.",
        expectedKeywords: ["New Zealand", "2011", "debut"]
    },
    {
        id: "warner-13",
        url: "https://en.wikipedia.org/wiki/David_Warner_(cricketer)",
        question: "What is David Warner's ODI batting average and how many ODI centuries has he scored?",
        expectedAnswer: "Information about Warner's ODI batting average and centuries.",
        expectedKeywords: ["ODI", "centuries", "average"]
    },
    {
        id: "warner-14",
        url: "https://en.wikipedia.org/wiki/David_Warner_(cricketer)",
        question: "Who is David Warner's wife and when did they marry?",
        expectedAnswer: "David Warner married Candice Falzon in April 2015. She is an Australian former ironwoman.",
        expectedKeywords: ["Candice", "2015", "ironwoman"]
    },
    {
        id: "warner-15",
        url: "https://en.wikipedia.org/wiki/David_Warner_(cricketer)",
        question: "What was the outcome of David Warner's leadership ban from Cricket Australia?",
        expectedAnswer: "The ban on leadership positions was lifted on 18 October 2024.",
        expectedKeywords: ["lifted", "18 October 2024", "leadership positions"]
    },

    // ── Page 2: Chernobyl disaster ──────────────────────────────────────────
    // Facts sourced from past the 8,000-char mark of the article.
    // Dense technical/historical prose — structurally different from sports stats.
    {
        id: "chernobyl-01",
        url: "https://en.wikipedia.org/wiki/Chernobyl_disaster",
        question: "What was the reactor power output in the seconds before the second Chernobyl explosion?",
        expectedAnswer: "The reactor output jumped to around 30,000 MW thermal, 10 times its normal operational output.",
        expectedKeywords: ["30,000 MW", "10 times", "normal operational"]
    },
    {
        id: "chernobyl-02",
        url: "https://en.wikipedia.org/wiki/Chernobyl_disaster",
        question: "How powerful was the second Chernobyl explosion, expressed in TNT equivalent?",
        expectedAnswer: "The second explosion was estimated to have had the power equivalent of 225 tons of TNT.",
        expectedKeywords: ["225 tons of TNT", "second", "explosion"]
    },
    {
        id: "chernobyl-03",
        url: "https://en.wikipedia.org/wiki/Chernobyl_disaster",
        question: "How many liquidator soldiers cleared radioactive debris from the Chernobyl roof and what average dose did they receive?",
        expectedAnswer: "3,828 men cleared debris from the roof, each receiving on average an estimated dose of 25 rem (250 mSv) of radiation.",
        expectedKeywords: ["3,828", "25 rem", "roof"]
    },
    {
        id: "chernobyl-04",
        url: "https://en.wikipedia.org/wiki/Chernobyl_disaster",
        question: "When did the design of the Chernobyl sarcophagus begin relative to the disaster date?",
        expectedAnswer: "The sarcophagus design started on 20 May 1986, 24 days after the disaster; construction ran from June to late November.",
        expectedKeywords: ["20 May 1986", "24 days", "sarcophagus"]
    },
    {
        id: "chernobyl-05",
        url: "https://en.wikipedia.org/wiki/Chernobyl_disaster",
        question: "What radiation level did Konstantin Checherov measure inside the Southern Main Circulation Pump Hall?",
        expectedAnswer: "On June 10, Konstantin Checherov measured a radiation level of 11,400 roentgens per hour inside an open hatch within the Southern Main Circulation Pump Hall.",
        expectedKeywords: ["11,400 roentgens", "Checherov", "Pump Hall"]
    },
    {
        id: "chernobyl-06",
        url: "https://en.wikipedia.org/wiki/Chernobyl_disaster",
        question: "What material was the Chernobyl Elephant's Foot composed of, and what crystalline forms were found beneath the reactor?",
        expectedAnswer: "The Elephant's Foot was composed of melted sand, concrete, and a large amount of nuclear fuel; unknown crystalline forms termed chernobylite were found.",
        expectedKeywords: ["chernobylite", "Elephant's Foot", "nuclear fuel"]
    },
    {
        id: "chernobyl-07",
        url: "https://en.wikipedia.org/wiki/Chernobyl_disaster",
        question: "When was Chernobyl reactor no. 3 officially shut down and who performed the shutdown?",
        expectedAnswer: "On 15 December 2000, then-President Leonid Kuchma personally turned off reactor no. 3 in an official ceremony.",
        expectedKeywords: ["15 December 2000", "Leonid Kuchma", "reactor no. 3"]
    },
    {
        id: "chernobyl-08",
        url: "https://en.wikipedia.org/wiki/Chernobyl_disaster",
        question: "What was the maximum time Chernobyl liquidator soldiers could spend on the radioactive rooftops?",
        expectedAnswer: "Soldiers could only spend a maximum of 40–90 seconds working on the rooftops because of the extremely high radiation levels.",
        expectedKeywords: ["40", "90 seconds", "rooftops"]
    },
    {
        id: "chernobyl-09",
        url: "https://en.wikipedia.org/wiki/Chernobyl_disaster",
        question: "What percentage of graphite blocks were expelled from the Chernobyl reactor core during the disaster?",
        expectedAnswer: "Approximately 25% of the graphite blocks and overheated material from the fuel channels were expelled.",
        expectedKeywords: ["25%", "graphite blocks", "expelled"]
    },
    {
        id: "chernobyl-10",
        url: "https://en.wikipedia.org/wiki/Chernobyl_disaster",
        question: "When did a roof section of the Chernobyl turbine-building collapse and what was its area?",
        expectedAnswer: "On 12 February 2013, a 600 square metre section of the roof of the turbine-building collapsed, adjacent to the sarcophagus.",
        expectedKeywords: ["12 February 2013", "600 square metre", "turbine-building"]
    }
];

// Named exports for per-page reporting in runEval.js
const warnerCases    = EVAL_DATASET.slice(0, 15);
const chernobylCases = EVAL_DATASET.slice(15);

module.exports = { EVAL_DATASET, warnerCases, chernobylCases };
