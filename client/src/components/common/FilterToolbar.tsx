import type { ReactNode } from 'react';

interface FilterOption {
    value: string;
    label: string;
}

interface Filter {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: FilterOption[];
}

interface FilterToolbarProps {
    searchValue: string;
    onSearchChange: (value: string) => void;
    searchPlaceholder?: string;
    filters?: Filter[];
    actions?: ReactNode;
}

function FilterToolbar({
    searchValue,
    onSearchChange,
    searchPlaceholder = 'Search...',
    filters = [],
    actions,
}: FilterToolbarProps) {
    return (
        // <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-2">
        <div className="flex flex-col md:flex-row md:items-center gap-2">
            <div className="relative md:w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
                <input
                    type="text"
                    value={searchValue}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="input-dark w-full pl-9 pr-3 py-1.5 text-sm"
                    placeholder={searchPlaceholder}
                />
            </div>

            {filters.map((filter) => (
                <select
                    key={filter.id}
                    id={filter.id}
                    value={filter.value}
                    onChange={(e) => filter.onChange(e.target.value)}
                    className="input-dark w-full md:w-44 px-3 py-1.5 text-sm"
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
        // </div>
    );
}

export default FilterToolbar;
