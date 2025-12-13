import type { Metadata, Viewport } from "next";
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
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-gray-50 pb-safe`}>
        {/* Skip to main content link for accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:rounded-md focus:shadow-lg focus:text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          Skip to main content
        </a>

        <AuthProvider>
          <HouseholdProvider>
            <div
              className="w-full max-w-5xl mx-auto min-h-screen bg-white shadow-xl overflow-hidden"
              role="application"
              aria-label="Grocery & Meal Assistant"
            >
              <main
                id="main-content"
                className="h-full overflow-y-auto p-4 custom-scrollbar"
                role="main"
              >
                {children}
              </main>
              <BottomNav />
              <RecipeChatbot />
            </div>
          </HouseholdProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
