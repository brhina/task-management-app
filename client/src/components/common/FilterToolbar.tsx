import { useState, type ReactNode } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';

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
  const [filtersOpen, setFiltersOpen] = useState(false);

  const activeFilterCount = filters.filter((f) => f.value !== '' && f.value !== undefined).length;

  const handleClearAll = () => {
    filters.forEach((f) => f.onChange(''));
  };

  return (
    <div className="space-y-2">
      {/* Search Row */}
      <div className="flex items-center gap-2">
        <div className="relative w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="input-field w-full pl-10 pr-8 py-2 text-sm"
            placeholder={searchPlaceholder}
          />
          {searchValue && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {actions && <div className="flex items-center gap-2">{actions}</div>}

        {filters.length > 0 && (
          <button
            type="button"
            onClick={() => setFiltersOpen(!filtersOpen)}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
              filtersOpen || activeFilterCount > 0
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-gray-200 bg-white text-slate-600 hover:bg-gray-50 hover:text-slate-800'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <span className="flex items-center justify-center h-5 min-w-5 px-1.5 text-xs font-semibold rounded-full bg-primary text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Collapsible Filter Panel */}
      {filters.length > 0 && filtersOpen && (
        <div className="flex items-center gap-3 p-3 bg-gray-50/80 border border-gray-200/60 rounded-lg">
          <div className="flex-1 flex flex-wrap items-center gap-3">
            {filters.map((filter) => (
              <div key={filter.id} className="flex items-center gap-2">
                <label
                  htmlFor={filter.id}
                  className="text-xs font-medium text-slate-500 whitespace-nowrap"
                >
                  {filter.label}
                </label>
                <select
                  id={filter.id}
                  value={filter.value}
                  onChange={(e) => filter.onChange(e.target.value)}
                  className="input-field w-auto min-w-[130px] px-2.5 py-1.5 text-xs"
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

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-500 hover:text-rose-500 transition-colors"
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default FilterToolbar;
