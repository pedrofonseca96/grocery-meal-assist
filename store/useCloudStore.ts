"use client";

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { Dish, InventoryItem, GroceryItem, MealSlot, MealType } from '@/types';
import { parseQuantity, formatQuantity, BaseUnit } from '@/lib/quantities';

interface CloudStoreState {
    dishes: Dish[];
    inventory: InventoryItem[];
    groceryList: GroceryItem[];
    schedule: MealSlot[];
    loading: boolean;
}

interface CloudStoreActions {
    // Dishes
    addDish: (dish: Omit<Dish, 'id'>) => Promise<void>;
    deleteDish: (id: string) => Promise<void>;

    // Grocery
    addToGroceryList: (name: string, quantity?: string) => Promise<void>;
    removeGroceryItem: (id: string) => Promise<void>;
    toggleGroceryItem: (id: string) => Promise<void>;
    moveGroceryItemToInventory: (id: string) => Promise<void>;
    clearGroceryList: () => Promise<void>;

    // Schedule
    setMeal: (date: string, type: MealType, dishId: string) => Promise<void>;
    clearMeal: (date: string, type: MealType) => Promise<void>;

    // Refresh
    refresh: () => Promise<void>;
}

export function useCloudStore(): CloudStoreState & CloudStoreActions {
    const { household } = useHousehold();
    const [dishes, setDishes] = useState<Dish[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [groceryList, setGroceryList] = useState<GroceryItem[]>([]);
    const [schedule, setSchedule] = useState<MealSlot[]>([]);
    const [loading, setLoading] = useState(true);

    const supabase = createClient();

    // Fetch all data for household
     
    const fetchData = useCallback(async () => {
        if (!household?.id) {
            setLoading(false);
            return;
        }

        setLoading(true);

        // Fetch dishes
        const { data: dishesData } = await supabase
            .from('dishes')
            .select('*')
            .eq('household_id', household.id);

        if (dishesData) {
            setDishes(dishesData.map(d => ({
                id: d.id,
                name: d.name,
                cuisine: d.cuisine || 'Other',
                description: d.description,
                ingredients: d.ingredients || [],
                recipeSteps: d.recipe_steps || [],
                recipeUrl: d.recipe_url,
            })));
        }

        // Fetch inventory
        const { data: inventoryData } = await supabase
            .from('inventory')
            .select('*')
            .eq('household_id', household.id);

        if (inventoryData) {
            setInventory(inventoryData.map(i => ({
                id: i.id,
                name: i.name,
                quantity: i.quantity || '1',
                category: i.category,
                unit: i.category || 'units',
            })));
        }

        // Fetch grocery items
        const { data: groceryData } = await supabase
            .from('grocery_items')
            .select('*')
            .eq('household_id', household.id);

        if (groceryData) {
            setGroceryList(groceryData.map(g => ({
                id: g.id,
                name: g.name,
                quantity: g.quantity || 1,
                baseUnit: (g.base_unit || 'units') as BaseUnit,
                checked: g.checked || false,
            })));
        }

        // Fetch schedule
        const { data: scheduleData } = await supabase
            .from('meal_schedule')
            .select('*')
            .eq('household_id', household.id);

        if (scheduleData) {
            setSchedule(scheduleData.map(s => ({
                date: s.date,
                type: s.meal_type as MealType,
                dishId: s.dish_id,
                isLeftover: false,
            })));
        }

        setLoading(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- supabase client is stable
    }, [household?.id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // === DISH ACTIONS ===
    const addDish = async (dish: Omit<Dish, 'id'>) => {
        if (!household?.id) return;

        const { data, error } = await supabase
            .from('dishes')
            .insert({
                household_id: household.id,
                name: dish.name,
                cuisine: dish.cuisine,
                description: dish.description,
                ingredients: dish.ingredients,
                recipe_steps: dish.recipeSteps,
                recipe_url: dish.recipeUrl,
            })
            .select()
            .single();

        if (data && !error) {
            setDishes(prev => [...prev, {
                id: data.id,
                name: data.name,
                cuisine: data.cuisine || 'Other',
                description: data.description,
                ingredients: data.ingredients || [],
                recipeSteps: data.recipe_steps || [],
                recipeUrl: data.recipe_url,
            }]);
        }
    };

    const deleteDish = async (id: string) => {
        await supabase.from('dishes').delete().eq('id', id);
        setDishes(prev => prev.filter(d => d.id !== id));
    };

    // === GROCERY ACTIONS ===
    const addToGroceryList = async (name: string, quantityStr = '1') => {
        if (!household?.id) return;

        const parsed = parseQuantity(quantityStr);

        // Check for existing item
        const existing = groceryList.find(
            item => item.name.toLowerCase().trim() === name.toLowerCase().trim()
                && item.baseUnit === parsed.baseUnit
        );

        if (existing) {
            // Update existing
            const newQty = existing.quantity + parsed.baseValue;
            await supabase
                .from('grocery_items')
                .update({ quantity: newQty })
                .eq('id', existing.id);

            setGroceryList(prev => prev.map(item =>
                item.id === existing.id ? { ...item, quantity: newQty } : item
            ));
        } else {
            // Insert new
            const { data } = await supabase
                .from('grocery_items')
                .insert({
                    household_id: household.id,
                    name,
                    quantity: parsed.baseValue,
                    base_unit: parsed.baseUnit,
                    checked: false,
                })
                .select()
                .single();

            if (data) {
                setGroceryList(prev => [...prev, {
                    id: data.id,
                    name: data.name,
                    quantity: data.quantity,
                    baseUnit: data.base_unit as BaseUnit,
                    checked: false,
                }]);
            }
        }
    };

    const removeGroceryItem = async (id: string) => {
        await supabase.from('grocery_items').delete().eq('id', id);
        setGroceryList(prev => prev.filter(item => item.id !== id));
    };

    const toggleGroceryItem = async (id: string) => {
        const item = groceryList.find(i => i.id === id);
        if (!item) return;

        await supabase
            .from('grocery_items')
            .update({ checked: !item.checked })
            .eq('id', id);

        setGroceryList(prev => prev.map(i =>
            i.id === id ? { ...i, checked: !i.checked } : i
        ));
    };

    const moveGroceryItemToInventory = async (id: string) => {
        if (!household?.id) return;

        const item = groceryList.find(i => i.id === id);
        if (!item) return;

        const formattedQty = formatQuantity(item.quantity, item.baseUnit);

        // Add to inventory
        await supabase.from('inventory').insert({
            household_id: household.id,
            name: item.name,
            quantity: formattedQty,
        });

        // Remove from grocery
        await supabase.from('grocery_items').delete().eq('id', id);

        setGroceryList(prev => prev.filter(i => i.id !== id));
        setInventory(prev => [...prev, {
            id: crypto.randomUUID(),
            name: item.name,
            quantity: formattedQty,
            unit: item.baseUnit,
        }]);
    };

    const clearGroceryList = async () => {
        if (!household?.id) return;
        await supabase.from('grocery_items').delete().eq('household_id', household.id);
        setGroceryList([]);
    };

    // === SCHEDULE ACTIONS ===
    const setMeal = async (date: string, type: MealType, dishId: string) => {
        if (!household?.id) return;

        // Upsert the meal schedule
        await supabase
            .from('meal_schedule')
            .upsert({
                household_id: household.id,
                date,
                meal_type: type,
                dish_id: dishId,
            }, {
                onConflict: 'household_id,date,meal_type'
            });

        setSchedule(prev => {
            const filtered = prev.filter(s => !(s.date === date && s.type === type));
            return [...filtered, { date, type, dishId, isLeftover: false }];
        });
    };

    const clearMeal = async (date: string, type: MealType) => {
        if (!household?.id) return;

        await supabase
            .from('meal_schedule')
            .delete()
            .eq('household_id', household.id)
            .eq('date', date)
            .eq('meal_type', type);

        setSchedule(prev => prev.filter(s => !(s.date === date && s.type === type)));
    };

    return {
        dishes,
        inventory,
        groceryList,
        schedule,
        loading,
        addDish,
        deleteDish,
        addToGroceryList,
        removeGroceryItem,
        toggleGroceryItem,
        moveGroceryItemToInventory,
        clearGroceryList,
        setMeal,
        clearMeal,
        refresh: fetchData,
    };
}
