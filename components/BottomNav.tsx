"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, CalendarDays, ShoppingCart, ChefHat, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BottomNav() {
    const pathname = usePathname();

    const links = [
        { href: '/', label: 'Home', icon: Home },
        { href: '/planner', label: 'Planner', icon: CalendarDays },
        { href: '/grocery', label: 'Shop', icon: ShoppingCart },
        { href: '/dishes', label: 'Recipes', icon: ChefHat },
        { href: '/settings', label: 'Settings', icon: Settings },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-2 safe-area-pb z-50">
            <div className="flex justify-around items-center w-full max-w-5xl mx-auto">
                {links.map(({ href, label, icon: Icon }) => {
                    const isActive = pathname === href;
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={cn(
                                "flex flex-col items-center justify-center w-full py-1",
                                isActive ? "text-blue-600" : "text-gray-400 hover:text-gray-600"
                            )}
                        >
                            <Icon className={cn("w-6 h-6 mb-1", isActive && "fill-current opacity-20")} />
                            <span className="text-[10px] font-medium">{label}</span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
