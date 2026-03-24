import React from 'react';

/**
 * Reusable loading spinner component
 */
const LoadingSpinner = ({ size = 'md', text = 'Loading...', className = '' }) => {
    const sizeClasses = {
        sm: 'h-6 w-6',
        md: 'h-12 w-12',
        lg: 'h-16 w-16'
    };

    return (
        <div className={`flex flex-col items-center justify-center ${className}`}>
            <div className={`animate-spin rounded-full border-b-2 border-blue-600 ${sizeClasses[size]}`} role="status" aria-label="Loading">
                <span className="sr-only">{text}</span>
            </div>
            {text && (
                <p className="mt-4 text-gray-600">{text}</p>
            )}
        </div>
    );
};

export default LoadingSpinner;

