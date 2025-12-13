import { describe, it, expect } from 'vitest';
import {
    validateInput,
    getValidationErrors,
    inviteRequestSchema,
    suggestMealSchema,
    askRecipeSchema,
    groceryItemSchema,
} from './validations';

describe('validateInput', () => {
    describe('inviteRequestSchema', () => {
        it('should accept valid invite request', () => {
            const result = validateInput(inviteRequestSchema, {
                email: 'test@example.com',
                householdId: '123e4567-e89b-12d3-a456-426614174000',
            });
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.email).toBe('test@example.com');
            }
        });

        it('should reject invalid email', () => {
            const result = validateInput(inviteRequestSchema, {
                email: 'not-an-email',
                householdId: '123e4567-e89b-12d3-a456-426614174000',
            });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toContain('email');
            }
        });

        it('should reject invalid UUID', () => {
            const result = validateInput(inviteRequestSchema, {
                email: 'test@example.com',
                householdId: 'not-a-uuid',
            });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toContain('householdId');
            }
        });
    });

    describe('suggestMealSchema', () => {
        it('should accept valid meal suggestion request', () => {
            const result = validateInput(suggestMealSchema, {
                inventoryItems: ['chicken', 'rice'],
                cuisines: ['Italian', 'Portuguese'],
                mealType: 'Dinner',
                dayName: 'Monday',
            });
            expect(result.success).toBe(true);
        });

        it('should reject invalid meal type', () => {
            const result = validateInput(suggestMealSchema, {
                inventoryItems: [],
                cuisines: [],
                mealType: 'Brunch', // Not in enum
                dayName: 'Monday',
            });
            expect(result.success).toBe(false);
        });
    });

    describe('askRecipeSchema', () => {
        it('should accept valid recipe question', () => {
            const result = validateInput(askRecipeSchema, {
                question: 'How do I make pasta?',
            });
            expect(result.success).toBe(true);
        });

        it('should reject empty question', () => {
            const result = validateInput(askRecipeSchema, {
                question: '',
            });
            expect(result.success).toBe(false);
        });

        it('should reject question that is too long', () => {
            const result = validateInput(askRecipeSchema, {
                question: 'a'.repeat(2001),
            });
            expect(result.success).toBe(false);
        });
    });

    describe('groceryItemSchema', () => {
        it('should accept valid grocery item', () => {
            const result = validateInput(groceryItemSchema, {
                name: 'Milk',
                quantity: '2L',
            });
            expect(result.success).toBe(true);
        });

        it('should reject empty name', () => {
            const result = validateInput(groceryItemSchema, {
                name: '',
            });
            expect(result.success).toBe(false);
        });
    });
});

describe('getValidationErrors', () => {
    it('should return null for valid input', () => {
        const errors = getValidationErrors(groceryItemSchema, { name: 'Eggs' });
        expect(errors).toBeNull();
    });

    it('should return all errors for invalid input', () => {
        const errors = getValidationErrors(inviteRequestSchema, {
            email: 'invalid',
            householdId: 'invalid',
        });
        expect(errors).not.toBeNull();
        expect(Object.keys(errors!).length).toBeGreaterThan(0);
    });
});
