import React from 'react';
import Spinner from './Spinner';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    isConfirming?: boolean;
    confirmText?: string;
    variant?: 'danger' | 'primary';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title, 
    message, 
    isConfirming = false,
    confirmText = 'Confirm',
    variant = 'danger'
}) => {
    if (!isOpen) return null;

    const variantClasses = {
        primary: 'text-white bg-primary hover:bg-primary-hover focus:ring-indigo-300 disabled:bg-indigo-400',
        danger: 'text-white bg-red-600 hover:bg-red-700 focus:ring-red-300 disabled:bg-red-400',
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-surface rounded-lg shadow-xl w-full max-w-md">
                <div className="p-6">
                    <h3 className="text-xl font-semibold text-on-surface mb-2">{title}</h3>
                    <p className="text-on-surface-secondary">{message}</p>
                </div>
                <div className="flex items-center justify-end p-4 bg-gray-50 rounded-b-lg gap-2">
                    <button onClick={onClose} disabled={isConfirming} className="text-on-surface bg-white hover:bg-gray-100 border border-border-color font-medium rounded-lg text-sm px-5 py-2.5 text-center disabled:opacity-50">
                        Cancel
                    </button>
                    <button 
                        onClick={onConfirm} 
                        disabled={isConfirming} 
                        className={`focus:ring-4 focus:outline-none font-medium rounded-lg text-sm px-5 py-2.5 text-center disabled:cursor-not-allowed flex items-center gap-2 ${variantClasses[variant]}`}
                    >
                        {isConfirming ? (
                            <>
                                <Spinner size="sm" />
                                Confirming...
                            </>
                        ) : confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;