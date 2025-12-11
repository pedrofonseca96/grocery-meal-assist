export type Cuisine = "Portuguese" | "Thai" | "Italian" | "Other";
export type MealType = "Lunch" | "Dinner";

export interface Ingredient {
    id: string;
    name: string;
    category?: string;
    unit: string;
}

export interface Dish {
    id: string;
    name: string;
    cuisine: Cuisine;
    ingredients: {
        name: string;
        quantity: string;
    }[];
    description?: string;
    imageUrl?: string;
    recipeSteps?: string[];  // Step-by-step cooking instructions
    recipeUrl?: string;       // Link to external recipe/video tutorial
}

export interface InventoryItem {
    id: string;
    name: string;
    quantity: string;
    unit: string;
}

export interface GroceryItem {
    id: string;
    name: string;
    checked: boolean;
    quantity: number;  // Stored in base unit (e.g., 1500 for 1.5L)
    baseUnit: 'ml' | 'g' | 'units';
}

export interface MealSlot {
    date: string; // ISO date string (YYYY-MM-DD)
    type: MealType;
    dishId?: string;
    isLeftover?: boolean; // If true, implies it's from previous dinner
    customNote?: string;
}
