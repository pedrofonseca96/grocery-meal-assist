/* eslint-disable @typescript-eslint/no-require-imports */
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');

// Read .env.local manually since we aren't in Next.js context
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const apiKeyMatch = envContent.match(/GEMINI_API_KEY=(.*)/);
const apiKey = apiKeyMatch ? apiKeyMatch[1].trim() : null;

if (!apiKey) {
    console.error("Could not find GEMINI_API_KEY in .env.local");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
    try {
        const modelsToCheck = [
            "gemini-2.0-flash-exp",
            "gemini-1.5-flash",
            "gemini-1.5-flash-8b",
            "gemini-1.5-pro",
            "gemini-1.0-pro"
        ];

        console.log("Checking model availability...");

        for (const modelName of modelsToCheck) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                await model.generateContent("Test");
                console.log(`✅ ${modelName}: AVAILABLE`);
            } catch (e) {
                if (e.message.includes('404')) {
                    console.log(`❌ ${modelName}: NOT FOUND`);
                } else {
                    console.log(`⚠️ ${modelName}: Error '${e.message}'`);
                }
            }
        }

    } catch (error) {
        console.error("Detailed Error:", error);
    }
}

listModels();
