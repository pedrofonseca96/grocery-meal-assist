import { Planner } from '@/components/Planner';
import { HouseholdGuard } from '@/components/HouseholdGuard';

export default function PlannerPage() {
    return (
        <HouseholdGuard>
            <Planner />
        </HouseholdGuard>
    );
}

