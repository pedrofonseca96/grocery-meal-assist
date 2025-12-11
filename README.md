# 🍳 Grocery & Meal Assistant

A modern, AI-powered meal planning and grocery management application designed for households. Built with Next.js 16, React 19, and Supabase for real-time collaboration.

## 🎯 What We're Trying to Achieve

This application aims to solve the daily challenge of **"What's for dinner?"** by providing:

- **AI-Powered Meal Suggestions**: Using Google Gemini, the app suggests meals based on your inventory, preferred cuisines, and day of the week (with smart rules like simple meals for weekend dinners)
- **Household Collaboration**: Multiple family members can share a household, viewing and managing the same recipes, meal plans, and grocery lists in real-time
- **Weekly Meal Planning**: A visual calendar planner for organizing lunches and dinners throughout the week
- **Smart Grocery Management**: Track grocery lists and home inventory, with seamless item transfer between them
- **Recipe Chatbot**: An AI cooking assistant that can explain recipes, suggest substitutions, and provide cooking tips
- **Recipe Library**: Save and organize your favorite dishes with ingredients and cooking instructions

The app is optimized for mobile-first use, making it easy to check your meal plan or grocery list while shopping.

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| 🏠 **Households** | Create or join households with invite codes |
| 📅 **Meal Planner** | Weekly view with lunch/dinner slots |
| 🤖 **AI Suggestions** | Gemini-powered meal recommendations |
| 💬 **Recipe Chat** | Ask questions about any recipe |
| 📋 **Grocery List** | Manage shopping items with quantities |
| 📦 **Inventory** | Track what's in your pantry |
| 🍽️ **Recipes** | Save dishes with ingredients & steps |

## 🛠️ Tech Stack

- **Framework**: Next.js 16 with App Router
- **UI**: React 19, Tailwind CSS 4, Framer Motion
- **Backend**: Supabase (Auth, PostgreSQL, Real-time)
- **AI**: Google Gemini (gemini-2.5-flash-lite)
- **State**: Zustand for client-side state management

---

## 🚀 Deployment

### Prerequisites

1. A [Supabase](https://supabase.com) project with:
   - Authentication enabled (Email/Password)
   - Database schema with `api` schema containing:
     - `households` table
     - `household_members` table
     - `dishes`, `meal_slots`, `grocery_items`, `inventory_items` tables
   - Row Level Security (RLS) policies configured

2. A [Google AI Studio](https://aistudio.google.com/apikey) API key for Gemini

### Environment Variables

Create a `.env.local` file (for local development) or configure these in your deployment platform:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Google Gemini (server-side only)
GEMINI_API_KEY=your-gemini-api-key
```

### Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Deploy to Other Platforms

For other platforms (Railway, Render, etc.):

```bash
# Build for production
npm run build

# Start production server
npm start
```

Ensure your platform:
- Supports Node.js 18+
- Has environment variables configured
- Exposes port 3000 (or configure via `PORT` env var)

---

## 📁 Project Structure

```
app/
├── page.tsx          # Home (Households view)
├── login/            # Authentication
├── register/
├── onboarding/       # Household setup
├── planner/          # Weekly meal planner
├── dishes/           # Recipe library
├── grocery/          # Grocery list & inventory
├── settings/         # User settings
└── actions.ts        # Server actions (AI calls)

components/
├── Planner.tsx       # Meal planning calendar
├── RecipeChatbot.tsx # AI recipe assistant
├── GroceryList.tsx   # Shopping list UI
├── DishManager.tsx   # Recipe management
└── ui/               # Reusable UI components

lib/
├── supabase/         # Supabase client config
└── quantities.ts     # Unit conversion utilities

store/
└── useCloudStore.ts  # Zustand store with Supabase sync
```

---

## 📝 License

This project is for personal use.
