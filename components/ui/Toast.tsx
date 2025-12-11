import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle } from 'lucide-react';
import { useEffect } from 'react';

export type ToastType = 'success' | 'width' | 'info';

interface ToastProps {
    message: string;
    description?: string;
    type?: ToastType;
    isVisible: boolean;
    onClose: () => void;
}

export function Toast({ message, description, type = 'info', isVisible, onClose }: ToastProps) {
    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(onClose, 4000);
            return () => clearTimeout(timer);
        }
    }, [isVisible, onClose]);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.9 }}
                    className="fixed bottom-32 left-4 right-4 md:left-auto md:right-8 md:bottom-8 md:w-96 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 p-4 z-50 flex gap-3 items-start"
                >
                    <div className="mt-0.5">
                        {type === 'success' && <CheckCircle className="w-5 h-5 text-green-500" />}
                        {type === 'info' && <AlertCircle className="w-5 h-5 text-blue-500" />}
                    </div>
                    <div className="flex-1">
                        <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">{message}</h4>
                        {description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{description}</p>
                        )}
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-4 h-4" />
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
