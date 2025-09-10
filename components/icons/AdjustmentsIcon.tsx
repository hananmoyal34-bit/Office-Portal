import React from 'react';

export const AdjustmentsIcon: React.FC<{ className?: string }> = ({ className = 'h-4 w-4' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 16v-2m8-6h2m-18 0H4m14.485 5.515l1.414 1.414M5.101 5.101l1.414 1.414m12.373 0l-1.414 1.414M6.515 17.485l-1.414 1.414M12 18a6 6 0 100-12 6 6 0 000 12z" />
    </svg>
);