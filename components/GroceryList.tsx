"use client";

import { useState } from 'react';
import { useCloudStore } from '@/store/useCloudStore';
import { Button } from '@/components/ui/Button';
import { Check, Plus, ShoppingCart, Package, Trash2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Toast } from '@/components/ui/Toast';
import { formatQuantity } from '@/lib/quantities';

export function GroceryManager() {
    const { groceryList, inventory, addToGroceryList, toggleGroceryItem, moveGroceryItemToInventory, clearGroceryList, loading } = useCloudStore();
    const [newItem, setNewItem] = useState("");
    const [newItemQty, setNewItemQty] = useState("1");
    const [newItemUnit, setNewItemUnit] = useState("units");
    const [activeTab, setActiveTab] = useState<'grocery' | 'inventory'>('grocery');
    const [toast, setToast] = useState({ isVisible: false, message: "" });

    const unitOptions = [
        { value: 'units', label: 'units' },
        { value: 'ml', label: 'ml' },
        { value: 'L', label: 'L' },
        { value: 'g', label: 'g' },
        { value: 'kg', label: 'kg' },
        { value: 'dozen', label: 'dozen' },
    ];

    const handleAddItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItem.trim()) return;

        // Combine quantity and unit for parsing
        const quantityWithUnit = newItemUnit === 'units' ? newItemQty : `${newItemQty}${newItemUnit}`;

        if (activeTab === 'grocery') {
            await addToGroceryList(newItem, quantityWithUnit);
        }
        setNewItem("");
        setNewItemQty("1");
        setNewItemUnit("units");
    };

    return (
        <div className="space-y-4 pb-20">
            <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                <button
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'grocery' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
                    onClick={() => setActiveTab('grocery')}
                >
                    Grocery List
                </button>
                <button
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'inventory' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
                    onClick={() => setActiveTab('inventory')}
                >
                    Inventory
                </button>
            </div>

            <form onSubmit={handleAddItem} className="flex gap-2">
                <input
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder={`Add to ${activeTab}...`}
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                />
                <input
                    type="number"
                    className="flex h-10 w-16 rounded-md border border-input bg-background px-2 py-2 text-sm text-center"
                    placeholder="Qty"
                    min="0"
                    step="any"
                    value={newItemQty}
                    onChange={(e) => setNewItemQty(e.target.value)}
                />
                <select
                    className="flex h-10 rounded-md border border-input bg-background px-2 py-2 text-sm"
                    value={newItemUnit}
                    onChange={(e) => setNewItemUnit(e.target.value)}
                >
                    {unitOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
                <Button type="submit">
                    <Plus className="w-5 h-5" />
                </Button>
            </form>

            <div className="space-y-2">
                {activeTab === 'grocery' ? (
                    groceryList.length === 0 ? (
                        <div className="text-center py-10 text-gray-500">Your list is empty.</div>
                    ) : (
                        <>
                            <div className="flex justify-end mb-2">
                                <button
                                    onClick={() => {
                                        if (confirm('Clear entire grocery list?')) {
                                            clearGroceryList();
                                            setToast({ isVisible: true, message: 'Grocery list cleared' });
                                        }
                                    }}
                                    className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                                >
                                    <Trash2 className="w-3 h-3" /> Clear All
                                </button>
                            </div>
                            {groceryList.map((item) => (
                                <div
                                    key={item.id}
                                    className={`flex items-center p-3 bg-white rounded-lg border cursor-pointer transition-colors ${item.checked ? 'bg-gray-50 opacity-60' : ''}`}
                                    onClick={() => {
                                        moveGroceryItemToInventory(item.id);
                                        setToast({ isVisible: true, message: `Moved ${item.name} to inventory` });
                                    }}
                                >
                                    <div className={`w-5 h-5 rounded-full border mr-3 flex items-center justify-center border-gray-300 hover:bg-green-100`}>
                                    </div>
                                    <span>
                                        {item.name}
                                        <span className="text-xs font-semibold text-blue-600 ml-2 bg-blue-50 px-1.5 py-0.5 rounded-full">
                                            {formatQuantity(item.quantity, item.baseUnit)}
                                        </span>
                                    </span>
                                </div>
                            ))}
                        </>
                    )
                ) : (
                    inventory.length === 0 ? (
                        <div className="text-center py-10 text-gray-500">Inventory is empty.</div>
                    ) : (
                        inventory.map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                                <span className="font-medium">{item.name}</span>
                                <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">{item.quantity} {item.unit}</span>
                            </div>
                        ))
                    )
                )}
            </div>
            <Toast
                isVisible={toast.isVisible}
                message={toast.message}
                onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
                type="success"
            />
        </div>
    );
}
