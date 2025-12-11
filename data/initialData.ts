import { Dish, InventoryItem } from "@/types";

export const INITIAL_DISHES: Dish[] = [
    {
        id: "1",
        name: "Bacalhau à Brás",
        cuisine: "Portuguese",
        ingredients: [
            { name: "Salted Cod", quantity: "500g" },
            { name: "Eggs", quantity: "6" },
            { name: "Potatoes", quantity: "500g" },
            { name: "Onion", quantity: "2" },
            { name: "Olives", quantity: "Handful" }
        ],
        description: "Classic Portuguese cod dish with shredded potatoes and eggs."
    },
    {
        id: "2",
        name: "Green Curry",
        cuisine: "Thai",
        ingredients: [
            { name: "Chicken Breast", quantity: "500g" },
            { name: "Green Curry Paste", quantity: "2 tbsp" },
            { name: "Coconut Milk", quantity: "400ml" },
            { name: "Bamboo Shoots", quantity: "1 can" }
        ],
        description: "Spicy and aromatic Thai coconut curry."
    },
    {
        id: "3",
        name: "Spaghetti Carbonara",
        cuisine: "Italian",
        ingredients: [
            { name: "Spaghetti", quantity: "400g" },
            { name: "Eggs", quantity: "3" },
            { name: "Pecorino Cheese", quantity: "100g" },
            { name: "Guanciale", quantity: "150g" }
        ],
        description: "Traditional Roman pasta dish."
    }
];

export const INITIAL_INVENTORY: InventoryItem[] = [
    { id: "1", name: "Rice", quantity: "1", unit: "kg" },
    { id: "2", name: "Olive Oil", quantity: "500", unit: "ml" },
    { id: "3", name: "Salt", quantity: "1", unit: "kg" }
];
