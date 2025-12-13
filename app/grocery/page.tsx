import { GroceryManager } from '@/components/GroceryList';
import { HouseholdGuard } from '@/components/HouseholdGuard';

export default function GroceryPage() {
    return (
        <HouseholdGuard>
            <GroceryManager />
        </HouseholdGuard>
    );
}

