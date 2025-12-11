'use server';

import { GoogleGenerativeAI } from "@google/generative-ai";

export async function suggestMealAction(inventoryItems: string[], cuisines: string[], mealType: string, dayName: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { error: "API Key not configured. Please set GEMINI_API_KEY in .env.local" };
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  /* 
   * Confirmed available model for this API Key/Region.
   * gemini-2.0-flash-exp is the only one responding (even if rate limited).
   * Others return 404.
   */
  const modelsToTry = ["gemini-2.5-flash-lite"];

  const prompt = `
    You are a culinary expert assisting a family with meal planning.
    Context:
    - Current Inventory: ${inventoryItems.join(", ") || "Nothing specific"}.
    - Preferred Cuisines: ${cuisines.join(", ")}.
    - Meal Type: ${mealType}
    - Day of Week: ${dayName}

    RULES & PREFERENCES:
    1. FAMILY BIAS: This family is Portuguese and prefers Portuguese dishes (approx. 70% of the time).
       - Occasionally suggest Thai, Italian, or other favorites (30%).
    
    2. INVENTORY: If the current inventory strongly suggests a non-Portuguese dish (e.g., coconut milk + curry paste), ignore the bias and suggest that.

    3. WEEKEND DINNERS (Saturday/Sunday Night):
       - If Suggested Meal is for 'Dinner' on 'Saturday' or 'Sunday':
       - Suggest SIMPLE, casual meals.
       - Examples: "Prego no pão" (Steak sandwich), "Bifana", "Toast", "Pizza", or light snacks.
       - Do NOT suggest heavy or complex meals for weekend dinners.

    Please suggest ONE dish following these rules.
    It should valid for a family meal.
    If possible, use the inventory items.
    
    IMPORTANT: Include step-by-step cooking instructions (5-8 simple steps).
    
    Output strictly in JSON format:
    {
      "name": "Dish Name",
      "description": "Short description",
      "cuisine": "Cuisine Type",
      "ingredients": [
        { "name": "Ingredient 1", "quantity": "amount" },
        { "name": "Ingredient 2", "quantity": "amount" }
      ],
      "recipeSteps": [
        "Step 1: Prepare ingredients...",
        "Step 2: Heat oil in pan...",
        "Step 3: ..."
      ]
    }
    Do not include markdown code blocks. Just the JSON string.
  `;

  let lastError = null;

  for (const modelName of modelsToTry) {
    try {
      console.log(`Attempting to generate with model: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
      return { data: JSON.parse(text) };
    } catch (error) {
      console.error(`Failed with ${modelName}:`, error);
      lastError = error;
      // Continue to next model
    }
  }

  // If we reach here, all models failed
  console.error("All models failed.");
  return { error: "Failed to generate suggestion with any available model. Check server logs." };
}

/**
 * Chatbot action for asking about recipes and cooking instructions.
 */
export async function askRecipeAction(question: string, conversationHistory: { role: 'user' | 'assistant'; content: string }[] = []) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { error: "API Key not configured. Please set GEMINI_API_KEY in .env.local" };
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

  // Build conversation context
  const historyContext = conversationHistory
    .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
    .join('\n');

  const prompt = `
    You are a friendly and helpful cooking assistant. Your job is to help users cook delicious meals.
    
    You can:
    - Explain how to cook specific dishes step-by-step
    - Suggest ingredient substitutions
    - Give cooking tips and techniques
    - Answer questions about recipes
    
    IMPORTANT: When explaining how to cook a dish, ALWAYS structure your response like this:
    1. Start with a brief description
    2. List "Ingredients:" followed by bullet points (use - for each ingredient with quantity)
    3. Then "Instructions:" followed by numbered steps
    
    Example format:
    A classic Italian pasta dish with creamy sauce.
    
    Ingredients:
    - 400g pasta
    - 200g bacon
    - 4 eggs
    - 100g parmesan
    
    Instructions:
    1. Boil the pasta...
    2. Fry the bacon...
    
    Keep responses concise but complete. If you don't know something, say so honestly.
    
    ${historyContext ? `Previous conversation:\n${historyContext}\n\n` : ''}
    User's question: ${question}
    
    Respond naturally and helpfully:
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    return { data: text };
  } catch (error) {
    console.error("Recipe chat error:", error);
    return { error: "Failed to get response. Please try again." };
  }
}
