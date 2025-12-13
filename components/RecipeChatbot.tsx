"use client";

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, ChefHat, Loader2, BookmarkPlus, Check } from 'lucide-react';
import { askRecipeAction } from '@/app/actions';
import { motion, AnimatePresence } from 'framer-motion';
import { useCloudStore } from '@/store/useCloudStore';
import { Dish } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useHousehold } from '@/contexts/HouseholdContext';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    recipeName?: string; // If this message contains a recipe
}

export function RecipeChatbot() {
    const { user } = useAuth();
    const { isHouseholdSelected } = useHousehold();
    const { addDish, dishes } = useCloudStore();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: "Hi! I'm your cooking assistant. Ask me how to cook any dish, and I'll help you with step-by-step instructions! 👨‍🍳" }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [savedRecipes, setSavedRecipes] = useState<Set<number>>(new Set());
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);


    // Detect recipe name from user query
    const detectRecipeNameFromQuery = (userQuery: string): string | undefined => {
        // Match various patterns: "how do I make X", "recipe for X", "X recipe", "how to cook X", etc.
        const patterns = [
            /(?:how (?:do i|to) (?:make|cook|prepare|bake))\s+(.+?)(?:\?|$)/i,
            /(?:recipe for)\s+(.+?)(?:\?|$)/i,
            /(?:make|cook|prepare)\s+(.+?)(?:\?|$)/i,
            /^(.+?)\s+recipe\b/i,
            /^(?:what is|tell me about)\s+(.+?)(?:\?|$)/i,
        ];
        for (const pattern of patterns) {
            const match = userQuery.match(pattern);
            if (match) return match[1].trim();
        }
        return undefined;
    };

    // Extract recipe name from AI response (first line or title-like text)
    const extractRecipeNameFromResponse = (response: string): string | undefined => {
        // Look for a title-like first line (before description or ingredients)
        const firstLine = response.split('\n')[0].trim();
        // If it's short and not starting with a description word, treat as title
        if (firstLine.length < 60 && !firstLine.match(/^(a |the |this |here's |here is |i'll |let me )/i)) {
            return firstLine.replace(/[:.!?]+$/, '').trim();
        }
        return undefined;
    };

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        const queryRecipeName = detectRecipeNameFromQuery(userMessage);

        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsLoading(true);

        try {
            const result = await askRecipeAction(userMessage, messages);
            if (result.data) {
                // Check if response contains recipe elements
                const hasIngredients = /ingredients:/i.test(result.data);
                const hasSteps = /\d+\.\s/.test(result.data) || /instructions:/i.test(result.data);
                const isRecipe = hasIngredients || hasSteps;

                // Get recipe name from query or extract from response
                let recipeName = queryRecipeName;
                if (!recipeName && isRecipe) {
                    recipeName = extractRecipeNameFromResponse(result.data);
                }
                // Fallback: use the user's message as recipe name if it's short
                if (!recipeName && isRecipe && userMessage.length < 40) {
                    recipeName = userMessage.replace(/\?/g, '').trim();
                }

                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: result.data,
                    recipeName: isRecipe ? recipeName : undefined
                }]);
            } else if (result.error) {
                setMessages(prev => [...prev, { role: 'assistant', content: `Sorry, I encountered an error: ${result.error}` }]);
            }
        } catch (error) {
            setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveRecipe = (msgIdx: number, recipeName: string, content: string) => {
        // Parse description (first paragraph before "Ingredients:")
        const descMatch = content.match(/^([\s\S]*?)(?=\n\s*Ingredients:)/i);
        const description = descMatch ? descMatch[1].trim() : 'Recipe from chat assistant';

        // Parse ingredients (lines starting with - between "Ingredients:" and "Instructions:")
        const ingredientsSection = content.match(/Ingredients:[\s\S]*?(?=Instructions:|$)/i);
        const ingredients: { name: string; quantity: string }[] = [];
        if (ingredientsSection) {
            const ingredientLines = ingredientsSection[0].match(/^-\s*.+$/gm) || [];
            ingredientLines.forEach(line => {
                const cleanLine = line.replace(/^-\s*/, '').trim();
                // Try to split quantity from name (e.g., "400g pasta" -> quantity: "400g", name: "pasta")
                const qtyMatch = cleanLine.match(/^([\d.]+\s*(?:g|kg|ml|L|cups?|tbsp|tsp|oz|lb)?)\s+(.+)$/i);
                if (qtyMatch) {
                    ingredients.push({ quantity: qtyMatch[1].trim(), name: qtyMatch[2].trim() });
                } else {
                    ingredients.push({ quantity: '1', name: cleanLine });
                }
            });
        }

        // Parse steps from content (numbered lines after "Instructions:")
        const instructionsSection = content.match(/Instructions:[\s\S]*/i);
        const stepsMatch = instructionsSection ? instructionsSection[0].match(/\d+\.\s.+/g) : content.match(/\d+\.\s.+/g);
        const recipeSteps = (stepsMatch || []).map(s => s.replace(/^\d+\.\s*/, '').trim());

        // Create new dish
        const newDish: Dish = {
            id: crypto.randomUUID(),
            name: recipeName.charAt(0).toUpperCase() + recipeName.slice(1),
            cuisine: 'Other',
            description: description,
            ingredients: ingredients,
            recipeSteps: recipeSteps.length > 0 ? recipeSteps : [content]
        };

        addDish(newDish);
        setSavedRecipes(prev => new Set(prev).add(msgIdx));
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Only show chatbot when user is logged in and has selected a household
    if (!user || !isHouseholdSelected) {
        return null;
    }

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-28 right-4 md:bottom-8 md:right-8 w-14 h-14 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform z-50"
                aria-label="Open recipe chat"
            >
                {isOpen ? <X className="w-6 h-6" /> : <ChefHat className="w-6 h-6" />}
            </button>

            {/* Chat Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="fixed bottom-44 right-4 md:bottom-24 md:right-8 w-80 md:w-96 h-[28rem] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden z-50"
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-3 flex items-center gap-2">
                            <ChefHat className="w-5 h-5" />
                            <span className="font-semibold">Recipe Assistant</span>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {messages.map((msg, idx) => (
                                <div key={idx}>
                                    <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div
                                            className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap ${msg.role === 'user'
                                                ? 'bg-blue-500 text-white rounded-br-sm'
                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-sm'
                                                }`}
                                        >
                                            {msg.content}
                                        </div>
                                    </div>
                                    {/* Save Recipe Button */}
                                    {msg.role === 'assistant' && msg.recipeName && (
                                        <div className="flex justify-start mt-1 ml-1">
                                            {savedRecipes.has(idx) ? (
                                                <span className="text-xs text-green-600 flex items-center gap-1">
                                                    <Check className="w-3 h-3" /> Saved to Recipes
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() => handleSaveRecipe(idx, msg.recipeName!, msg.content)}
                                                    className="text-xs text-orange-600 hover:text-orange-700 flex items-center gap-1 bg-orange-50 px-2 py-1 rounded-full"
                                                >
                                                    <BookmarkPlus className="w-3 h-3" /> Save "{msg.recipeName}" to Recipes
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-2xl rounded-bl-sm">
                                        <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="border-t border-gray-200 dark:border-gray-700 p-3 flex gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="How do I make...?"
                                className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-full bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                disabled={isLoading}
                            />
                            <button
                                onClick={handleSend}
                                disabled={isLoading || !input.trim()}
                                className="w-10 h-10 bg-orange-500 text-white rounded-full flex items-center justify-center disabled:opacity-50 hover:bg-orange-600 transition-colors"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
