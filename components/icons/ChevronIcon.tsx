import React from 'react';

interface ChevronIconProps {
    isCollapsed: boolean;
    className?: string;
}

export const ChevronIcon: React.FC<ChevronIconProps> = ({ isCollapsed, className = "h-5 w-5" }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className={`${className} transition-transform duration-300 ease-in-out transform ${isCollapsed ? '-rotate-90' : 'rotate-0'}`} 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
        strokeWidth={2}
    >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
);
