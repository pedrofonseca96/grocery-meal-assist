import { DishManager } from '@/components/DishManager';
import { HouseholdGuard } from '@/components/HouseholdGuard';

export default function DishesPage() {
    return (
        <HouseholdGuard>
            <DishManager />
        </HouseholdGuard>
    );
}

