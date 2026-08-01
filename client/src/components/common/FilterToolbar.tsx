import { useState, type ReactNode } from 'react';
import { Search, SlidersHorizontal, X, RotateCcw } from 'lucide-react';

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

export default function FilterToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters = [],
  actions,
}: FilterToolbarProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);

  const activeFilterCount = filters.filter((f) => f.value !== '' && f.value !== undefined).length;

  const handleClearAll = () => {
    onSearchChange('');
    filters.forEach((f) => f.onChange(''));
  };

  return (
    <div className="rounded-2xl shadow-xs ">
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search & Main Filter Controls */}
        <div className="flex flex-1 items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {/* Search Bar matching Resources Page style */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/40 transition-all shadow-2xs"
            />
            {searchValue && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 transition-colors"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Inline Filter Selects matching Resources Page style (Desktop/Tablet) */}
          {filters.length > 0 && (
            <div className="hidden md:flex items-center gap-2 flex-wrap">
              {filters.map((filter) => (
                <div key={filter.id} className="relative">
                  <select
                    id={filter.id}
                    value={filter.value}
                    onChange={(e) => filter.onChange(e.target.value)}
                    className={`px-3 py-1.5 bg-slate-50 border rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/40 transition-all shadow-2xs cursor-pointer ${
                      filter.value
                        ? 'border-indigo-300 text-indigo-700 bg-indigo-50/50'
                        : 'border-slate-200/80 text-slate-700 hover:bg-slate-100/60'
                    }`}
                  >
                    {filter.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.value === '' && filter.label ? `All ${filter.label}s` : opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}

          {/* Mobile Filter Trigger Button */}
          {filters.length > 0 && (
            <button
              type="button"
              onClick={() => setFiltersOpen(!filtersOpen)}
              className={`md:hidden flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all shadow-2xs ${
                filtersOpen || activeFilterCount > 0
                  ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200/80 bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="flex items-center justify-center h-4 min-w-4 px-1 text-[10px] font-bold rounded-full bg-indigo-600 text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
          )}

          {/* Clear/Reset button when search or filters are active */}
          {(searchValue || activeFilterCount > 0) && (
            <button
              type="button"
              onClick={handleClearAll}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200/60 rounded-xl transition-all shadow-2xs shrink-0"
              title="Reset Search and Filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}
        </div>

        {/* Right Side Actions (e.g., View Mode toggle tabs) */}
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>

      {/* Collapsible Mobile Filter Panel */}
      {filters.length > 0 && filtersOpen && (
        <div className="md:hidden pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {filters.map((filter) => (
            <div key={filter.id} className="flex flex-col gap-1">
              <label htmlFor={`mobile-${filter.id}`} className="text-[11px] font-bold text-slate-500">
                {filter.label}
              </label>
              <select
                id={`mobile-${filter.id}`}
                value={filter.value}
                onChange={(e) => filter.onChange(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {filter.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
