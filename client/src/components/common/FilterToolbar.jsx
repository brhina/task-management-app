import React from 'react';

function FilterToolbar({
    searchValue,
    onSearchChange,
    searchPlaceholder = 'Search...',
    filters = [],
    actions,
}) {
    return (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
                <div className="relative md:flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        value={searchValue}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="input-dark w-full pl-9 pr-3 py-2 text-sm"
                        placeholder={searchPlaceholder}
                    />
                </div>

                {filters.map((filter) => (
                    <select
                        key={filter.id}
                        id={filter.id}
                        value={filter.value}
                        onChange={(e) => filter.onChange(e.target.value)}
                        className="input-dark w-full md:w-48 px-3 py-2 text-sm"
                        aria-label={filter.label}
                    >
                        {filter.options.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                ))}

                {actions && (
                    <div className="flex gap-2 md:flex-shrink-0">
                        {actions}
                    </div>
                )}
            </div>
        </div>
    );
}

export default FilterToolbar;
