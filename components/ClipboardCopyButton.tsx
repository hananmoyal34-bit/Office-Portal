import React, { useState } from 'react';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { CheckIcon } from './icons/CheckIcon';

interface ClipboardCopyButtonProps {
    textToCopy: string | null | undefined;
}

const ClipboardCopyButton: React.FC<ClipboardCopyButtonProps> = ({ textToCopy }) => {
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = async (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent modal clicks or other parent events
        if (!textToCopy) return;

        try {
            await navigator.clipboard.writeText(textToCopy);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000); // Reset after 2 seconds
        } catch (err) {
            console.error('Failed to copy text: ', err);
            // You could add an error state here if desired
        }
    };

    if (!textToCopy) {
        return null;
    }

    return (
        <button
            onClick={handleCopy}
            className="flex-shrink-0 ml-2 p-1 rounded-md text-gray-500 hover:bg-gray-200 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary transition-all"
            aria-label="Copy to clipboard"
        >
            {isCopied ? (
                <CheckIcon className="h-4 w-4 text-green-500" />
            ) : (
                <ClipboardIcon className="h-4 w-4" />
            )}
        </button>
    );
};

export default ClipboardCopyButton;