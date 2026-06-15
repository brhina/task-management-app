import React from 'react';

function PageShell({ title, subtitle, actions, children }) {
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">{title}</h1>
                    {subtitle && <p className="text-slate-400 mt-1">{subtitle}</p>}
                </div>
                {actions}
            </div>
            {children}
        </div>
    );
}

export default PageShell;
