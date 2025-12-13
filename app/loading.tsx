import { Loader2 } from 'lucide-react';

/**
 * Loading state for route segments.
 * Shown while the page content is loading.
 */
export default function Loading() {
    return (
        <div className="min-h-[50vh] flex items-center justify-center">
            <div className="text-center space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-orange-500 mx-auto" />
                <p className="text-gray-500 text-sm">Loading...</p>
            </div>
        </div>
    );
}
