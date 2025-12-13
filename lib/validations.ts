/**
 * Zod validation schemas for API inputs.
 * 
 * These schemas ensure type safety and input validation at runtime,
 * protecting against malicious or malformed inputs.
 */

import { z } from 'zod';

// === COMMON SCHEMAS ===

/**
 * UUID validation - standard v4 UUID format
 */
export const uuidSchema = z.string().uuid('Invalid ID format');

/**
 * Email validation with reasonable length limits
 */
export const emailSchema = z
    .string()
    .email('Invalid email address')
    .max(255, 'Email too long');

/**
 * Non-empty string with reasonable length
 */
export const nonEmptyString = (fieldName: string, maxLength = 500) =>
    z
        .string()
        .min(1, `${fieldName} is required`)
        .max(maxLength, `${fieldName} is too long`);

// === API ROUTE SCHEMAS ===

/**
 * Schema for /api/invite POST request
 */
export const inviteRequestSchema = z.object({
    email: emailSchema,
    householdId: uuidSchema,
    householdName: z.string().max(100).optional(),
    inviterName: z.string().max(100).optional(),
});

export type InviteRequest = z.infer<typeof inviteRequestSchema>;

// === SERVER ACTION SCHEMAS ===

/**
 * Schema for suggestMealAction inputs
 */
export const suggestMealSchema = z.object({
    inventoryItems: z.array(z.string().max(100)).max(100),
    cuisines: z.array(z.string().max(50)).max(20),
    mealType: z.enum(['Breakfast', 'Lunch', 'Dinner', 'Snack']),
    dayName: z.string().max(20),
    dietaryRestrictions: z.array(z.string().max(100)).max(20).optional(),
});

export type SuggestMealInput = z.infer<typeof suggestMealSchema>;

/**
 * Schema for askRecipeAction inputs
 */
export const askRecipeSchema = z.object({
    question: z.string().min(1, 'Question is required').max(2000, 'Question too long'),
    conversationHistory: z
        .array(
            z.object({
                role: z.enum(['user', 'assistant']),
                content: z.string().max(10000),
            })
        )
        .max(50)
        .optional(),
});

export type AskRecipeInput = z.infer<typeof askRecipeSchema>;

// === DISH SCHEMAS ===

/**
 * Schema for creating/updating a dish
 */
export const dishSchema = z.object({
    name: nonEmptyString('Name', 100),
    cuisine: z.string().max(50).optional(),
    description: z.string().max(1000).optional(),
    ingredients: z
        .array(
            z.object({
                name: z.string().max(100),
                quantity: z.string().max(50),
            })
        )
        .max(50)
        .optional(),
    recipeSteps: z.array(z.string().max(500)).max(30).optional(),
    recipeUrl: z.string().url().max(500).optional().or(z.literal('')),
});

export type DishInput = z.infer<typeof dishSchema>;

// === GROCERY SCHEMAS ===

/**
 * Schema for adding grocery items
 */
export const groceryItemSchema = z.object({
    name: nonEmptyString('Item name', 100),
    quantity: z.string().max(50).optional(),
});

export type GroceryItemInput = z.infer<typeof groceryItemSchema>;

// === VALIDATION HELPERS ===

/**
 * Validates input against a schema and returns a result object.
 * Use this in server actions and API routes.
 * 
 * @example
 * const result = validateInput(inviteRequestSchema, requestBody);
 * if (!result.success) {
 *   return NextResponse.json({ error: result.error }, { status: 400 });
 * }
 * const { email, householdId } = result.data;
 */
export function validateInput<T>(
    schema: z.ZodSchema<T>,
    input: unknown
): { success: true; data: T } | { success: false; error: string } {
    const result = schema.safeParse(input);

    if (!result.success) {
        // Get the first error message for user-friendly feedback
        const firstError = result.error.issues[0];
        const path = firstError.path.join('.');
        const message = path
            ? `${path}: ${firstError.message}`
            : firstError.message;

        return { success: false, error: message };
    }

    return { success: true, data: result.data };
}

/**
 * Returns all validation errors in a structured format.
 * Useful for form validation where you need to show multiple errors.
 */
export function getValidationErrors<T>(
    schema: z.ZodSchema<T>,
    input: unknown
): Record<string, string> | null {
    const result = schema.safeParse(input);

    if (result.success) {
        return null;
    }

    const errors: Record<string, string> = {};
    for (const error of result.error.issues) {
        const path = error.path.join('.') || 'root';
        errors[path] = error.message;
    }

    return errors;
}
