"use client";

import { useState } from 'react';
import { useCloudStore } from '@/store/useCloudStore';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Plus, ChefHat, Trash2 } from 'lucide-react';
import { Cuisine, Dish } from '@/types';
import { Modal } from './ui/Modal';

export function DishManager() {
    const { dishes, addDish, deleteDish, loading } = useCloudStore();
    const [isAdding, setIsAdding] = useState(false);
    const [newDishName, setNewDishName] = useState("");
    const [cuisine, setCuisine] = useState<Cuisine>("Portuguese");
    const [viewDish, setViewDish] = useState<Dish | null>(null);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDishName.trim()) return;

        await addDish({
            name: newDishName,
            cuisine: cuisine,
            ingredients: []
        });
        setNewDishName("");
        setIsAdding(false);
    };

    return (
        <div className="space-y-4 pb-20">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <ChefHat className="w-6 h-6 text-blue-600" />
                    My Recipes
                </h2>
                <Button size="sm" onClick={() => setIsAdding(!isAdding)}>
                    <Plus className="w-4 h-4 mr-1" /> New
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
                </div>
            </Modal>

            {isAdding && (
                <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="pt-6">
                        <form onSubmit={handleAdd} className="space-y-3">
                            <input
                                className="w-full p-2 border rounded"
                                placeholder="Dish Name (e.g. Duck Rice)"
                                value={newDishName}
                                onChange={e => setNewDishName(e.target.value)}
                                autoFocus
                            />
                            <div className="flex gap-2 text-sm overflow-x-auto pb-1">
                                {['Portuguese', 'Thai', 'Italian', 'Other'].map((c) => (
                                    <button
                                        key={c}
                                        type="button"
                                        className={`px-3 py-1 rounded-full border ${cuisine === c ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700'}`}
                                        onClick={() => setCuisine(c as Cuisine)}
                                    >
                                        {c}
                                    </button>
                                ))}
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="ghost" size="sm" onClick={() => setIsAdding(false)}>Cancel</Button>
                                <Button type="submit" size="sm">Save Recipe</Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-3">
                {dishes.map((dish) => (
                    <Card key={dish.id} className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow">
                        <CardContent className="p-4 flex justify-between items-center">
                            <div className="flex-1" onClick={() => setViewDish(dish)}>
                                <h3 className="font-semibold">{dish.name}</h3>
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{dish.cuisine}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-xs text-gray-400">
                                    {dish.ingredients.length} ingredients
                                </span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm(`Delete "${dish.name}"?`)) {
                                            deleteDish(dish.id);
                                        }
                                    }}
                                    className="text-red-400 hover:text-red-600 p-1"
                                    title="Delete recipe"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
