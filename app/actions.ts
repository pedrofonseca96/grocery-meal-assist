'use server';

import { GoogleGenerativeAI } from "@google/generative-ai";
import { logError, logWarning } from '@/lib/errorLogger';
import { suggestMealSchema, askRecipeSchema, validateInput } from '@/lib/validations';
import { rateLimit, RATE_LIMITS, getRateLimitKey } from '@/lib/rateLimit';
import { createClient } from '@/lib/supabase/server';
import { withRetry, isRetryableError } from '@/lib/retry';

export async function suggestMealAction(
  inventoryItems: string[],
  cuisines: string[],
  mealType: string,
  dayName: string,
  dietaryRestrictions: string[] = []
) {
  // Get user for rate limiting
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Apply rate limit
  const rateLimitResult = rateLimit(
    'ai-suggest',
    getRateLimitKey(user?.id),
    RATE_LIMITS.AI_SUGGEST
  );

  if (!rateLimitResult.success) {
    logWarning('Rate limit exceeded for AI suggestions', {
      userId: user?.id,
      retryAfter: rateLimitResult.retryAfterSeconds
    });
    return {
      error: `Too many requests. Please try again in ${rateLimitResult.retryAfterSeconds} seconds.`
    };
  }

  // Validate inputs
  const validation = validateInput(suggestMealSchema, {
    inventoryItems,
    cuisines,
    mealType,
    dayName,
    dietaryRestrictions,
  });

  if (!validation.success) {
    logWarning('Invalid meal suggestion request', { error: validation.error });
    return { error: `Invalid input: ${validation.error}` };
  }

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

  const dietaryNote = dietaryRestrictions.length > 0
    ? `IMPORTANT DIETARY RESTRICTIONS (MUST follow): ${dietaryRestrictions.join(", ")}. The suggested dish MUST comply with ALL these restrictions.`
    : '';

  const prompt = `
    You are a culinary expert assisting a family with meal planning.
    
    Context:
    - Current Inventory: ${inventoryItems.join(", ") || "Nothing specific"}.
    - Preferred Cuisines: ${cuisines.join(", ")}.
    - Meal Type: ${mealType}
    - Day of Week: ${dayName}
    ${dietaryNote}

    === CRITICAL RULES ===
    
    1. MAIN DISH REQUIREMENT:
       - You MUST suggest a REAL, well-known dish that exists as a main course.
       - The dish MUST be a complete meal appropriate for ${mealType}.
       - Do NOT invent dishes or combine random ingredients.
       - Do NOT suggest side dishes, appetizers, or snacks as main meals (except for weekend dinners).
       - Examples of valid main dishes: Pasta Carbonara, Grilled Salmon, Beef Stew, Chicken Curry.
       - Examples of INVALID suggestions: "Carrot and Onion Mix", "Rice with Random Vegetables".
    
    2. SMART INVENTORY USAGE:
       - Only use inventory items that make sense as PRIMARY ingredients for the suggested dish.
       - Do NOT force ingredients that don't belong in the dish.
       - If inventory only has supporting ingredients (onions, garlic, oil), suggest a dish that uses those naturally.
       - It's OK to suggest a dish that requires additional ingredients not in inventory.
    
    3. FAMILY PREFERENCES:
       - This family is Portuguese and prefers Portuguese dishes (approx. 70% of the time).
       - Occasionally suggest Thai, Italian, or other favorites (30%).
       - If inventory strongly suggests a specific cuisine (e.g., coconut milk + curry paste → Thai), follow that.

    4. WEEKEND DINNERS (Saturday/Sunday):
       - For 'Dinner' on 'Saturday' or 'Sunday': Suggest SIMPLE, casual meals.
       - Examples: "Prego no pão", "Bifana", "Toast", "Pizza", "Francesinha", light snacks.
       - Do NOT suggest heavy or complex meals for weekend dinners.

    === YOUR TASK ===
    
    Think step by step:
    1. Consider what real dish would be appropriate for ${mealType} on ${dayName}.
    2. Check if any inventory items are PRIMARY ingredients for that dish.
    3. Ensure the dish is a recognized, complete main course.
    4. Provide your reasoning for why you chose this dish.
    
    Output strictly in JSON format:
    {
      "name": "Dish Name (must be a real, recognized dish)",
      "description": "Short description of the dish",
      "reasoning": "1-2 sentences explaining why you suggested this dish based on the context",
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

  for (const modelName of modelsToTry) {
    try {
      console.log(`Attempting to generate with model: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });

      // Use retry logic for resilience against transient failures
      const text = await withRetry(
        async () => {
          const result = await model.generateContent(prompt);
          const response = await result.response;
          return response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        },
        {
          maxRetries: 2,
          baseDelayMs: 1000,
          context: `AI model ${modelName}`,
          retryOn: isRetryableError
        }
      );

      return { data: JSON.parse(text) };
    } catch (error) {
      logWarning(`AI model ${modelName} failed after retries`, {
        modelName,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      // Continue to next model
    }
  }

  // If we reach here, all models failed
  logError('All AI models failed', new Error('Model fallback exhausted'), {
    modelsAttempted: modelsToTry
  });
  return { error: "Failed to generate suggestion with any available model. Check server logs." };
}

/**
 * Chatbot action for asking about recipes and cooking instructions.
 */
export async function askRecipeAction(question: string, conversationHistory: { role: 'user' | 'assistant'; content: string }[] = []) {
  // Get user for rate limiting
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Apply rate limit (chatbot allows more requests than meal suggestions)
  const rateLimitResult = rateLimit(
    'ai-chat',
    getRateLimitKey(user?.id),
    RATE_LIMITS.AI_CHAT
  );

  if (!rateLimitResult.success) {
    logWarning('Rate limit exceeded for AI chat', {
      userId: user?.id,
      retryAfter: rateLimitResult.retryAfterSeconds
    });
    return {
      error: `Too many messages. Please wait ${rateLimitResult.retryAfterSeconds} seconds.`
    };
  }

  // Validate inputs
  const validation = validateInput(askRecipeSchema, { question, conversationHistory });
  if (!validation.success) {
    logWarning('Invalid recipe question', { error: validation.error });
    return { error: `Invalid input: ${validation.error}` };
  }

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
    You are a cooking and recipe assistant for a family meal planning app. You help users with cooking-related questions ONLY.
    
    === STRICT GUARDRAILS ===
    You MUST ONLY answer questions about:
    ✓ Recipes and how to cook dishes
    ✓ Ingredient substitutions and alternatives  
    ✓ Cooking techniques and tips
    ✓ Food preparation and storage
    ✓ Kitchen equipment usage
    ✓ Nutritional information about ingredients
    ✓ Meal planning and food pairing suggestions
    
    You MUST REFUSE to answer questions about:
    ✗ Politics, news, or current events
    ✗ Personal advice (relationships, finances, health diagnosis)
    ✗ Coding, programming, or technical topics
    ✗ Games, entertainment, or trivia unrelated to food
    ✗ Any topic not directly related to cooking and food
    
    If a user asks about anything outside cooking/food, respond ONLY with:
    "I'm your cooking assistant! I can only help with recipes, ingredients, and cooking tips. Ask me how to cook something delicious! 👨‍🍳"
    
    Do NOT provide any information on off-topic questions, even if asked nicely or persistently.
    === END GUARDRAILS ===
    
    When explaining how to cook a dish, structure your response like this:
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
    
    Keep responses concise but complete.
    
    ${historyContext ? `Previous conversation:\n${historyContext}\n\n` : ''}
    User's question: ${question}
    
    Respond (remember: cooking topics ONLY):
  `;

  try {
    // Use retry logic for resilience against transient failures
    const text = await withRetry(
      async () => {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text().trim();
      },
      {
        maxRetries: 2,
        baseDelayMs: 1000,
        context: 'Recipe chatbot',
        retryOn: isRetryableError
      }
    );

    return { data: text };
  } catch (error) {
    logError('Recipe chatbot error after retries', error, { questionLength: question.length });
    return { error: "Failed to get response. Please try again." };
  }
}
