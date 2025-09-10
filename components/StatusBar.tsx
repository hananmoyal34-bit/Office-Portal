import React from 'react';
import Spinner from './Spinner';
import { CheckIcon } from './icons/CheckIcon';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';

interface StatusBarProps {
    status: 'idle' | 'syncing' | 'success' | 'error';
    message: string;
}

const StatusBar: React.FC<StatusBarProps> = ({ status, message }) => {
    if (status === 'idle') {
        return null;
    }

    const statusInfo = {
        syncing: { icon: <Spinner size="sm" />, bg: 'bg-gray-800', text: 'text-white' },
        success: { icon: <CheckIcon className="h-5 w-5" />, bg: 'bg-green-600', text: 'text-white' },
        error: { icon: <AlertTriangleIcon className="h-5 w-5" />, bg: 'bg-red-600', text: 'text-white' },
    };

    const currentStatus = statusInfo[status as keyof typeof statusInfo];

    return (
        <>
            <style>{`
                @keyframes slide-up {
                    from { transform: translate(-50%, 100%); opacity: 0; }
                    to { transform: translate(-50%, 0); opacity: 1; }
                }
                .animate-slide-up {
                    animation: slide-up 0.3s ease-out forwards;
                }
            `}</style>
            <div
                className={`fixed bottom-8 left-1/2 flex items-center gap-3 px-6 py-3 rounded-full shadow-lg text-sm font-medium z-50 transition-all duration-300 animate-slide-up ${currentStatus.bg} ${currentStatus.text}`}
                role="status"
                aria-live="polite"
            >
                {currentStatus.icon}
                <span>{message}</span>
            </div>
        </>
    );
};

export default StatusBar;
