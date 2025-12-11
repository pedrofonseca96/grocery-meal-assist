// Quantity parsing and formatting utilities

export type BaseUnit = 'ml' | 'g' | 'units';

export interface ParsedQuantity {
    value: number;
    unit: string;
    baseValue: number;
    baseUnit: BaseUnit;
}

const UNIT_CONVERSIONS: Record<string, { base: BaseUnit; factor: number }> = {
    // Volume
    'l': { base: 'ml', factor: 1000 },
    'L': { base: 'ml', factor: 1000 },
    'litre': { base: 'ml', factor: 1000 },
    'liter': { base: 'ml', factor: 1000 },
    'ml': { base: 'ml', factor: 1 },
    'ML': { base: 'ml', factor: 1 },
    // Weight
    'kg': { base: 'g', factor: 1000 },
    'KG': { base: 'g', factor: 1000 },
    'kilo': { base: 'g', factor: 1000 },
    'g': { base: 'g', factor: 1 },
    'G': { base: 'g', factor: 1 },
    'gram': { base: 'g', factor: 1 },
    'grams': { base: 'g', factor: 1 },
    // Count
    'dozen': { base: 'units', factor: 12 },
    'dz': { base: 'units', factor: 12 },
    'units': { base: 'units', factor: 1 },
    'unit': { base: 'units', factor: 1 },
    'pcs': { base: 'units', factor: 1 },
    'pc': { base: 'units', factor: 1 },
    'piece': { base: 'units', factor: 1 },
    'pieces': { base: 'units', factor: 1 },
};

/**
 * Parse a quantity string like "500ml", "1.5L", "2kg", "3" into structured data.
 */
export function parseQuantity(input: string): ParsedQuantity {
    const trimmed = input.trim();

    // Try to match number + optional unit
    // Examples: "500ml", "1.5 L", "2", "1kg", "dozen"
    const match = trimmed.match(/^([\d.]+)\s*([a-zA-Z]*)?$/);

    if (!match) {
        // If it's just a unit like "dozen", try that
        if (UNIT_CONVERSIONS[trimmed.toLowerCase()]) {
            const conv = UNIT_CONVERSIONS[trimmed.toLowerCase()];
            return {
                value: 1,
                unit: trimmed,
                baseValue: conv.factor,
                baseUnit: conv.base
            };
        }
        // Fallback: treat as 1 unit
        return { value: 1, unit: 'units', baseValue: 1, baseUnit: 'units' };
    }

    const value = parseFloat(match[1]);
    const unitStr = match[2] || 'units';

    // Find conversion
    const conv = UNIT_CONVERSIONS[unitStr] || UNIT_CONVERSIONS[unitStr.toLowerCase()];

    if (conv) {
        return {
            value,
            unit: unitStr,
            baseValue: value * conv.factor,
            baseUnit: conv.base
        };
    }

    // Unknown unit, treat as count
    return {
        value,
        unit: unitStr || 'units',
        baseValue: value,
        baseUnit: 'units'
    };
}

/**
 * Format a base quantity for display, converting to larger units when appropriate.
 */
export function formatQuantity(baseValue: number, baseUnit: BaseUnit): string {
    if (baseUnit === 'ml') {
        if (baseValue >= 1000) {
            const liters = baseValue / 1000;
            return Number.isInteger(liters) ? `${liters}L` : `${liters.toFixed(1)}L`;
        }
        return `${baseValue}ml`;
    }

    if (baseUnit === 'g') {
        if (baseValue >= 1000) {
            const kg = baseValue / 1000;
            return Number.isInteger(kg) ? `${kg}kg` : `${kg.toFixed(1)}kg`;
        }
        return `${baseValue}g`;
    }

    // Units
    return baseValue.toString();
}
