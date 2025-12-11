import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";
import { RecipeChatbot } from "@/components/RecipeChatbot";
import { AuthProvider } from "@/contexts/AuthContext";
import { HouseholdProvider } from "@/contexts/HouseholdContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Grocery & Meal Assistant",
  description: "Plan meals and manage grocery list.",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-gray-50 pb-safe`}>
        <AuthProvider>
          <HouseholdProvider>
            <main className="w-full max-w-5xl mx-auto min-h-screen bg-white shadow-xl overflow-hidden">
              <div className="h-full overflow-y-auto p-4 custom-scrollbar">
                {children}
              </div>
              <BottomNav />
              <RecipeChatbot />
            </main>
          </HouseholdProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
