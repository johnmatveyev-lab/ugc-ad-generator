import React from 'react';

export const RefreshIcon: React.FC<{className?: string}> = ({ className = "h-4 w-4" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M5.223 9.223a8.003 8.003 0 0013.554 4.554M19 20v-5h-5m.223-4.223a8.003 8.003 0 00-13.554-4.554" />
    </svg>
);
