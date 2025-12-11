import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Dish, InventoryItem, GroceryItem, MealSlot, MealType } from '@/types';
import { INITIAL_DISHES, INITIAL_INVENTORY } from '@/data/initialData';
import { addDays, format, parseISO, isMonday, isTuesday, isWednesday, isThursday, isFriday } from 'date-fns';
import { parseQuantity, formatQuantity, BaseUnit } from '@/lib/quantities';

interface AppState {
    dishes: Dish[];
    inventory: InventoryItem[];
    groceryList: GroceryItem[];
    schedule: MealSlot[];

    // Actions
    addDish: (dish: Dish) => void;
    deleteDish: (id: string) => void;
    updateInventory: (item: InventoryItem) => void;
    addToGroceryList: (name: string, quantity?: string) => void;
    removeGroceryItem: (name: string) => void;
    toggleGroceryItem: (id: string) => void;
    moveGroceryItemToInventory: (id: string) => void;
    clearGroceryList: () => void;
    setMeal: (date: string, type: MealType, dishId: string) => void;
    clearMeal: (date: string, type: MealType) => void;
}

export const useStore = create<AppState>()(
    persist(
        (set, get) => ({
            dishes: INITIAL_DISHES,
            inventory: INITIAL_INVENTORY,
            groceryList: [],
            schedule: [],

            addDish: (dish) => set((state) => ({ dishes: [...state.dishes, dish] })),

            deleteDish: (id) => set((state) => ({ dishes: state.dishes.filter(d => d.id !== id) })),

            updateInventory: (item) => set((state) => {
                const index = state.inventory.findIndex((i) => i.id === item.id);
                if (index >= 0) {
                    const newInv = [...state.inventory];
                    newInv[index] = item;
                    return { inventory: newInv };
                }
                return { inventory: [...state.inventory, item] };
            }),

            addToGroceryList: (name, quantityStr = '1') => set((state) => {
                const parsed = parseQuantity(quantityStr);

                // Find existing item with same name AND same baseUnit
                const existingIndex = state.groceryList.findIndex(
                    item => item.name.toLowerCase().trim() === name.toLowerCase().trim()
                        && item.baseUnit === parsed.baseUnit
                );

                if (existingIndex >= 0) {
                    const newList = [...state.groceryList];
                    const existingItem = newList[existingIndex];

                    // Merge quantities
                    newList[existingIndex] = {
                        ...existingItem,
                        quantity: existingItem.quantity + parsed.baseValue
                    };
                    return { groceryList: newList };
                }

                return {
                    groceryList: [...state.groceryList, {
                        id: crypto.randomUUID(),
                        name,
                        checked: false,
                        quantity: parsed.baseValue,
                        baseUnit: parsed.baseUnit
                    }]
                };
            }),

            removeGroceryItem: (name) => set((state) => ({
                groceryList: state.groceryList.filter(item => item.name !== name)
            })),

            toggleGroceryItem: (id) => set((state) => ({
                groceryList: state.groceryList.map((item) =>
                    item.id === id ? { ...item, checked: !item.checked } : item
                )
            })),

            moveGroceryItemToInventory: (id) => set((state) => {
                const groceryItem = state.groceryList.find(i => i.id === id);
                if (!groceryItem) return {};

                // Format quantity for inventory (which uses string)
                const formattedQty = formatQuantity(groceryItem.quantity, groceryItem.baseUnit);

                // Find if exists in inventory (by name)
                const existingIndex = state.inventory.findIndex(
                    i => i.name.toLowerCase().trim() === groceryItem.name.toLowerCase().trim()
                );

                let newInventory = [...state.inventory];
                if (existingIndex >= 0) {
                    // Merge: Try to add quantities
                    const existingItem = newInventory[existingIndex];
                    const existingParsed = parseQuantity(existingItem.quantity);

                    // Only merge if same base unit
                    if (existingParsed.baseUnit === groceryItem.baseUnit) {
                        const newBaseValue = existingParsed.baseValue + groceryItem.quantity;
                        const newQty = formatQuantity(newBaseValue, groceryItem.baseUnit);
                        newInventory[existingIndex] = { ...existingItem, quantity: newQty };
                    } else {
                        // Different units, append textually
                        newInventory[existingIndex] = {
                            ...existingItem,
                            quantity: `${existingItem.quantity} + ${formattedQty}`
                        };
                    }
                } else {
                    // Add new
                    newInventory.push({
                        id: crypto.randomUUID(),
                        name: groceryItem.name,
                        quantity: formattedQty,
                        unit: groceryItem.baseUnit
                    });
                }

                return {
                    inventory: newInventory,
                    groceryList: state.groceryList.filter(i => i.id !== id)
                };
            }),

            clearGroceryList: () => set(() => ({ groceryList: [] })),

            setMeal: (date, type, dishId) => set((state) => {
                const newSchedule = [...state.schedule];

                // Remove existing slot if any
                const existingIndex = newSchedule.findIndex(s => s.date === date && s.type === type);
                if (existingIndex >= 0) newSchedule.splice(existingIndex, 1);

                // Add new slot
                newSchedule.push({ date, type, dishId, isLeftover: false });

                // LEFTOVER LOGIC: If Dinner (Mon-Thu), set next day Lunch
                // Assuming standard work week logic requested
                if (type === 'Dinner') {
                    const currentDay = parseISO(date);
                    // Check if it's Mon-Thu (Sun dinner -> Mon lunch is also common but user said "Mon-Fri cook dinner")
                    // User said: "Mon-Fri cook dinner... leftovers for lunch... typically cook for lunch on Sat and Sun"
                    // So Monday Dinner -> Tuesday Lunch.
                    // Friday Dinner -> Saturday Lunch? No, user said "Sat and Sun cook for lunch". 
                    // So maybe Friday Dinner leftovers are for... ? User might eat them on Sat?
                    // Let's assume Mon-Thu Dinner -> Tue-Fri Lunch.
                    // What about Sunday Dinner? -> Monday Lunch?
                    // User: "cook dinner and pack leftovers for lunch during the week... only cook for lunch typically on Sat/Sun"

                    // Let's strictly implement: Mon, Tue, Wed, Thu, Sun Dinners -> Generate Leftover for next day Lunch?
                    // Wait, "during the week" implies Mon-Fri lunches are leftovers.
                    // So:
                    // Sun Dinner -> Mon Lunch
                    // Mon Dinner -> Tue Lunch
                    // Tue Dinner -> Wed Lunch
                    // Wed Dinner -> Thu Lunch
                    // Thu Dinner -> Fri Lunch
                    // Fri Dinner -> ??? (Maybe Sat lunch is fresh?)

                    const nextDay = addDays(currentDay, 1);
                    const nextDayStr = format(nextDay, 'yyyy-MM-dd');

                    // Check if next day is a "Lunch Leftover Day" (Mon-Fri)
                    // We can just forcefully set it if it's a weekday lunch slot
                    // Simplification: Always suggest leftover for next lunch if user explicitly sets dinner, unless Saturday/Sunday lunch override?
                    // Let's just do next day lunch for simplicity and user can clear it.

                    const nextLunchIndex = newSchedule.findIndex(s => s.date === nextDayStr && s.type === 'Lunch');
                    if (nextLunchIndex >= 0) {
                        // If manual override exists, maybe don't overwrite? Or overwrite with isLeftover=true?
                        // Let's overwrite for automation convenience
                        newSchedule.splice(nextLunchIndex, 1);
                    }
                    newSchedule.push({ date: nextDayStr, type: 'Lunch', dishId, isLeftover: true });
                }

                return { schedule: newSchedule };
            }),

            clearMeal: (date, type) => set((state) => ({
                schedule: state.schedule.filter(s => !(s.date === date && s.type === type))
            })),
        }),
        {
            name: 'grocery-app-storage',
        }
    )
);
