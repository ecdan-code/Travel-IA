const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

async function test() {
    const key = process.env.GEMINI_API_KEY;
    console.log("Testing Key starting with:", key?.substring(0, 7));

    const genAI = new GoogleGenerativeAI(key);

    const modelVariations = [
        "gemini-flash-latest",
        "gemini-pro-latest",
        "gemini-2.5-flash",
        "gemini-2.0-flash"
    ];

    for (const modelName of modelVariations) {
        console.log(`\n--- Testing Model: ${modelName} ---`);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Hola, responde solo 'OK'.");
            const response = await result.response;
            console.log(`[PASS] ${modelName}: ${response.text()}`);
        } catch (error) {
            console.log(`[FAIL] ${modelName}: ${error.message.substring(0, 200)}`);
        }
    }
}

test();
