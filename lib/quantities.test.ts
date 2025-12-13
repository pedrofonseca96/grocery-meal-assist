import { describe, it, expect } from 'vitest';
import { parseQuantity, formatQuantity } from './quantities';

describe('parseQuantity', () => {
    describe('volume parsing', () => {
        it('should parse milliliters', () => {
            const result = parseQuantity('500ml');
            expect(result.value).toBe(500);
            expect(result.unit).toBe('ml');
            expect(result.baseValue).toBe(500);
            expect(result.baseUnit).toBe('ml');
        });

        it('should parse liters and convert to ml', () => {
            const result = parseQuantity('1.5L');
            expect(result.value).toBe(1.5);
            expect(result.unit).toBe('L');
            expect(result.baseValue).toBe(1500);
            expect(result.baseUnit).toBe('ml');
        });

        it('should handle space between number and unit', () => {
            const result = parseQuantity('500 ml');
            expect(result.baseValue).toBe(500);
            expect(result.baseUnit).toBe('ml');
        });
    });

    describe('weight parsing', () => {
        it('should parse grams', () => {
            const result = parseQuantity('250g');
            expect(result.value).toBe(250);
            expect(result.baseValue).toBe(250);
            expect(result.baseUnit).toBe('g');
        });

        it('should parse kilograms and convert to grams', () => {
            const result = parseQuantity('2kg');
            expect(result.value).toBe(2);
            expect(result.baseValue).toBe(2000);
            expect(result.baseUnit).toBe('g');
        });
    });

    describe('count parsing', () => {
        it('should parse plain numbers as units', () => {
            const result = parseQuantity('3');
            expect(result.value).toBe(3);
            expect(result.baseValue).toBe(3);
            expect(result.baseUnit).toBe('units');
        });

        it('should parse dozen and convert to units', () => {
            const result = parseQuantity('1dozen');
            expect(result.value).toBe(1);
            expect(result.baseValue).toBe(12);
            expect(result.baseUnit).toBe('units');
        });
    });

    describe('edge cases', () => {
        it('should handle empty string', () => {
            const result = parseQuantity('');
            expect(result.baseUnit).toBe('units');
        });

        it('should handle unknown units as count', () => {
            const result = parseQuantity('5boxes');
            expect(result.value).toBe(5);
            expect(result.baseValue).toBe(5);
            expect(result.baseUnit).toBe('units');
        });
    });
});

describe('formatQuantity', () => {
    describe('volume formatting', () => {
        it('should display ml for small values', () => {
            expect(formatQuantity(500, 'ml')).toBe('500ml');
        });

        it('should convert to L for large values', () => {
            expect(formatQuantity(1000, 'ml')).toBe('1L');
            expect(formatQuantity(1500, 'ml')).toBe('1.5L');
        });
    });

    describe('weight formatting', () => {
        it('should display g for small values', () => {
            expect(formatQuantity(500, 'g')).toBe('500g');
        });

        it('should convert to kg for large values', () => {
            expect(formatQuantity(1000, 'g')).toBe('1kg');
            expect(formatQuantity(2500, 'g')).toBe('2.5kg');
        });
    });

    describe('count formatting', () => {
        it('should display plain number for units', () => {
            expect(formatQuantity(5, 'units')).toBe('5');
        });
    });
});
