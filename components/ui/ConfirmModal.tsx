"use client";

import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    confirmVariant?: 'danger' | 'default';
    isLoading?: boolean;
}

export function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    confirmVariant = 'default',
    isLoading = false
}: ConfirmModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm rounded-lg bg-white shadow-lg animate-in fade-in zoom-in-95 duration-200">
                <div className="p-6 space-y-4">
                    {/* Icon and Title */}
                    <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-full ${confirmVariant === 'danger' ? 'bg-red-100' : 'bg-gray-100'}`}>
                            <AlertTriangle className={`w-6 h-6 ${confirmVariant === 'danger' ? 'text-red-600' : 'text-gray-600'}`} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">{title}</h3>
                            <p className="text-sm text-gray-600 mt-1">{message}</p>
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 justify-end pt-2">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={onConfirm}
                            disabled={isLoading}
                            className={confirmVariant === 'danger'
                                ? 'bg-red-600 hover:bg-red-700 text-white'
                                : ''
                            }
                        >
                            {isLoading ? 'Deleting...' : confirmText}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
