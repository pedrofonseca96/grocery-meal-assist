"use client";

import { useEffect, useState } from 'react';
import { addDays, format, startOfWeek, isSameDay } from 'date-fns';
import { useCloudStore } from '@/store/useCloudStore';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ChefHat, RotateCw, Trash2, CalendarDays, ChevronLeft, ChevronRight, Eye, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dish, UserPreferences } from '@/types';
import { suggestMealAction } from '@/app/actions';
import { Sparkles, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Toast } from '@/components/ui/Toast';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function Planner() {
    const { schedule, dishes, setMeal, clearMeal, addToGroceryList, removeGroceryItem, addDish, inventory, loading } = useCloudStore();
    const { user } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewDish, setViewDish] = useState<Dish | null>(null);
    const [toast, setToast] = useState({ isVisible: false, message: "", description: "" });
    const [recentAdditions, setRecentAdditions] = useState<{ slotId: string; timestamp: number; items: string[] }[]>([]);

    // User preferences for AI suggestions
    const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null);

    // Fetch user preferences on mount
    useEffect(() => {
        const fetchPreferences = async () => {
            if (!user) return;
            const supabase = createClient();
            const { data } = await supabase
                .from('user_preferences')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (data) {
                setUserPreferences(data);
            }
        };
        fetchPreferences();
    }, [user]);

    const changeWeek = (days: number) => {
        setCurrentDate(prev => addDays(prev, days));
    };

    // Start Monday
    const startDay = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(startDay, i));

    const handleDishSelect = (dateStr: string, type: 'Lunch' | 'Dinner', dishId: string) => {
        if (!dishId) return;
        setMeal(dateStr, type, dishId);

        const dish = dishes.find(d => d.id === dishId);
        if (dish) {
            const addedItems: string[] = [];
            dish.ingredients.forEach(ing => {
                const inInventory = inventory.some(inv => inv.name.toLowerCase().includes(ing.name.toLowerCase()));
                if (!inInventory) {
                    addToGroceryList(ing.name, ing.quantity || '1');
                    addedItems.push(ing.name);
                }
            });

            if (addedItems.length > 0) {
                setToast({
                    isVisible: true,
                    message: "Missing Ingredients Added",
                    description: `Added to grocery list: ${addedItems.join(', ')}`
                });

                // Track recent addition for potential undo
                const slotId = `${dateStr}-${type}`;
                setRecentAdditions(prev => [
                    ...prev,
                    { slotId, timestamp: Date.now(), items: addedItems }
                ]);
            }
        }
    };

    const [loadingSlot, setLoadingSlot] = useState<string | null>(null);

    const handleAiSuggest = async (dateStr: string, type: 'Lunch' | 'Dinner') => {
        const slotId = `${dateStr}-${type}`;
        setLoadingSlot(slotId);

        const inventoryNames = inventory.map(i => i.name);

        // Use user preferences if available, otherwise default values
        const cuisines = userPreferences?.preferred_cuisines?.length
            ? userPreferences.preferred_cuisines
            : ["Portuguese", "Thai", "Italian"];
        const dietaryRestrictions = userPreferences?.dietary_restrictions || [];

        const safeDate = new Date(dateStr + 'T12:00:00');
        const dayNameStr = format(safeDate, 'EEEE');

        const result = await suggestMealAction(inventoryNames, cuisines, type, dayNameStr, dietaryRestrictions);

        if (result.error) {
            console.error(result.error);
            alert("AI suggestion failed. Please check if your API Key is set in .env.local and you have restarted the server.");
        } else if (result.data) {
            const newDish = {
                id: crypto.randomUUID(),
                name: result.data.name,
                cuisine: result.data.cuisine || "Other",
                description: result.data.description,
                ingredients: result.data.ingredients || []
            } as Dish;

            addDish(newDish);

            // Add missing ingredients to grocery list immediately
            const addedItems: string[] = [];
            newDish.ingredients.forEach(ing => {
                const inInventory = inventory.some(inv => inv.name.toLowerCase().includes(ing.name.toLowerCase()));
                if (!inInventory) {
                    addToGroceryList(ing.name, ing.quantity || '1');
                    addedItems.push(ing.name);
                }
            });

            if (addedItems.length > 0) {
                setToast({
                    isVisible: true,
                    message: "Missing Ingredients Added",
                    description: `Added to grocery list: ${addedItems.join(', ')}`
                });

                // Track recent addition for potential undo
                const slotId = `${dateStr}-${type}`;
                setRecentAdditions(prev => [
                    ...prev,
                    { slotId, timestamp: Date.now(), items: addedItems }
                ]);
            }

            handleDishSelect(dateStr, type, newDish.id);
        }
        setLoadingSlot(null);
    };

    const handleClearMeal = (dateStr: string, type: 'Lunch' | 'Dinner') => {
        clearMeal(dateStr, type);

        // Check for recent additions to undo
        const slotId = `${dateStr}-${type}`;
        const now = Date.now();
        const recent = recentAdditions.find(r => r.slotId === slotId && (now - r.timestamp) < 15000);

        if (recent) {
            recent.items.forEach(item => removeGroceryItem(item));
            setToast({
                isVisible: true,
                message: "Meal Removed",
                description: `Also removed ${recent.items.length} items from grocery list.`
            });
            // Cleanup state
            setRecentAdditions(prev => prev.filter(r => r !== recent));
        }
    };

    return (
        <div className="space-y-4 pb-20">
            <div className="flex items-center justify-between">
                <Button size="icon" variant="ghost" onClick={() => changeWeek(-7)}>
                    <ChevronLeft className="w-5 h-5" />
                </Button>
                <div className="text-center">
                    <h2 className="text-xl font-bold flex items-center justify-center gap-2">
                        <CalendarDays className="w-5 h-5 text-blue-600" />
                        Week Plan
                    </h2>
                    <div className="text-xs text-gray-500 font-medium mt-1">
                        {format(startDay, 'MMM d')} - {format(addDays(startDay, 6), 'MMM d')}
                    </div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => changeWeek(7)}>
                    <ChevronRight className="w-5 h-5" />
                </Button>
            </div>

            <Modal
                isOpen={!!viewDish}
                onClose={() => setViewDish(null)}
                title={viewDish?.name || "Dish Details"}
            >
                <div className="space-y-4">
                    <div className="flex gap-2">
                        <span className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                            {viewDish?.cuisine}
                        </span>
                    </div>
                    {viewDish?.description && (
                        <p className="text-sm text-gray-600 italic">{viewDish.description}</p>
                    )}
                    <div>
                        <h4 className="font-semibold text-sm mb-2">Ingredients:</h4>
                        <ul className="text-sm space-y-1">
                            {viewDish?.ingredients.map((ing, idx) => (
                                <li key={idx} className="flex justify-between border-b border-gray-100 pb-1 last:border-0">
                                    <span>{ing.name}</span>
                                    <span className="text-gray-500">{ing.quantity}</span>
                                </li>
                            ))}
                            {(!viewDish?.ingredients || viewDish.ingredients.length === 0) && (
                                <li className="text-gray-400 italic">No ingredients listed.</li>
                            )}
                        </ul>
                    </div>
                    {viewDish?.recipeSteps && viewDish.recipeSteps.length > 0 && (
                        <div>
                            <h4 className="font-semibold text-sm mb-2">Instructions:</h4>
                            <ol className="text-sm space-y-2 list-decimal list-inside">
                                {viewDish.recipeSteps.map((step, idx) => (
                                    <li key={idx} className="text-gray-700">{step}</li>
                                ))}
                            </ol>
                        </div>
                    )}
                    {viewDish?.recipeUrl && (
                        <div>
                            <a
                                href={viewDish.recipeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                            >
                                📺 View Recipe Tutorial
                            </a>
                        </div>
                    )}
                </div>
            </Modal>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {weekDays.map((day) => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const dayName = format(day, 'EEEE');
                    const isWeekend = dayName === 'Saturday' || dayName === 'Sunday';

                    const lunchSlot = schedule.find(s => s.date === dateStr && s.type === 'Lunch');
                    const dinnerSlot = schedule.find(s => s.date === dateStr && s.type === 'Dinner');

                    const getDish = (id?: string) => dishes.find(d => d.id === id);

                    return (
                        <Card key={dateStr} className={cn("border-l-4", isWeekend ? "border-l-green-500" : "border-l-blue-500")}>
                            <CardHeader className="py-3 bg-gray-50/50 border-b">
                                <CardTitle className="text-base font-medium flex justify-between">
                                    <span>{dayName}</span>
                                    <span className="text-gray-400 font-normal text-xs">{format(day, 'MMM d')}</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-4">
                                {/* Lunch Slot */}
                                <div className="space-y-1">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Lunch</label>
                                        {lunchSlot?.isLeftover && (
                                            <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                                                <RotateCw className="w-3 h-3" /> Leftover
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex gap-2">
                                        {lunchSlot?.dishId && (
                                            <Button size="icon" variant="ghost" className="h-10 w-8 text-blue-500" onClick={() => setViewDish(getDish(lunchSlot.dishId) || null)}>
                                                <Info className="w-4 h-4" />
                                            </Button>
                                        )}
                                        <select
                                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            value={lunchSlot?.dishId || ""}
                                            onChange={(e) => handleDishSelect(dateStr, 'Lunch', e.target.value)}
                                        >
                                            <option value="">Select Dish...</option>
                                            {dishes.map(d => (
                                                <option key={d.id} value={d.id}>{d.name}</option>
                                            ))}
                                        </select>
                                        {lunchSlot?.dishId && (
                                            <Button size="icon" variant="ghost" className="h-10 w-10 text-red-500" onClick={() => handleClearMeal(dateStr, 'Lunch')}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        )}
                                        {!lunchSlot?.dishId && (
                                            <Button
                                                size="icon"
                                                variant="outline"
                                                className="h-10 w-10 text-purple-600 border-purple-200 hover:bg-purple-50"
                                                onClick={() => handleAiSuggest(dateStr, 'Lunch')}
                                                disabled={!!loadingSlot}
                                            >
                                                {loadingSlot === `${dateStr}-Lunch` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {/* Dinner Slot */}
                                <div className="space-y-1">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Dinner</label>
                                    </div>
                                    <div className="flex gap-2">
                                        {dinnerSlot?.dishId && (
                                            <Button size="icon" variant="ghost" className="h-10 w-8 text-blue-500" onClick={() => setViewDish(getDish(dinnerSlot.dishId) || null)}>
                                                <Info className="w-4 h-4" />
                                            </Button>
                                        )}
                                        <select
                                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            value={dinnerSlot?.dishId || ""}
                                            onChange={(e) => handleDishSelect(dateStr, 'Dinner', e.target.value)}
                                        >
                                            <option value="">Select Dish...</option>
                                            {dishes.map(d => (
                                                <option key={d.id} value={d.id}>{d.name}</option>
                                            ))}
                                        </select>
                                        {dinnerSlot?.dishId && (
                                            <Button size="icon" variant="ghost" className="h-10 w-10 text-red-500" onClick={() => handleClearMeal(dateStr, 'Dinner')}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        )}
                                        {!dinnerSlot?.dishId && (
                                            <Button
                                                size="icon"
                                                variant="outline"
                                                className="h-10 w-10 text-purple-600 border-purple-200 hover:bg-purple-50"
                                                onClick={() => handleAiSuggest(dateStr, 'Dinner')}
                                                disabled={!!loadingSlot}
                                            >
                                                {loadingSlot === `${dateStr}-Dinner` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <Toast
                isVisible={toast.isVisible}
                message={toast.message}
                description={toast.description}
                onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
                type="info"
            />
        </div>
    );
}
