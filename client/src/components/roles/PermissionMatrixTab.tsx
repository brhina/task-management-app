import { ListFilter, CheckCircle2, XCircle } from 'lucide-react';
import { type SystemRoleRow, type CustomRole, PERMISSION_CATEGORIES } from './types';
import { PERMISSIONS, ROLE_LABELS } from '../../constants/permissions';

interface PermissionMatrixTabProps {
  systemRoles: SystemRoleRow[];
  customRoles: CustomRole[];
  searchTerm: string;
  permissionCategoryFilter: string;
  onCategoryFilterChange: (cat: string) => void;
}

export default function PermissionMatrixTab({
  systemRoles,
  customRoles,
  searchTerm,
  permissionCategoryFilter,
  onCategoryFilterChange,
}: PermissionMatrixTabProps) {
  // Filtered Permission list for Matrix view
  const filteredCategories = PERMISSION_CATEGORIES.map((cat) => {
    if (permissionCategoryFilter !== 'all' && cat.id !== permissionCategoryFilter) {
      return null;
    }
    const filteredPerms = cat.permissions.filter(
      (p) =>
        !searchTerm ||
        p.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cat.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (filteredPerms.length === 0 && searchTerm) return null;
    return { ...cat, permissions: filteredPerms };
  }).filter(Boolean) as typeof PERMISSION_CATEGORIES;

  return (
    <div className="space-y-4">
      {/* Select Dropdown for Categories */}
      <div className="flex items-center gap-2.5 pb-2">
        <select
          id="categoryFilterSelect"
          value={permissionCategoryFilter}
          onChange={(e) => onCategoryFilterChange(e.target.value)}
          className="bg-white border border-slate-200/80 rounded-xl px-3 text-xs font-semibold text-slate-700 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-2xs cursor-pointer min-w-[200px]"
        >
          <option value="all">All Categories ({PERMISSIONS.length} permissions)</option>
          {PERMISSION_CATEGORIES.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name} ({cat.permissions.length} permissions)
            </option>
          ))}
        </select>
      </div>

      {/* Permissions Matrix Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-3.5 px-4 w-[280px]">Permission</th>
              {systemRoles.map((s) => (
                <th key={s.role} className="py-3.5 px-3 text-center min-w-[90px]">
                  {ROLE_LABELS[s.role as keyof typeof ROLE_LABELS] || s.label}
                </th>
              ))}
              {customRoles.map((c) => (
                <th key={c._id} className="py-3.5 px-3 text-center min-w-[100px] text-amber-600">
                  {c.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {filteredCategories.map((cat) => (
              <tr key={cat.id} className="contents">
                <tr className="bg-slate-100/70 border-y border-slate-200/60 font-bold text-slate-700">
                  <td
                    colSpan={1 + systemRoles.length + customRoles.length}
                    className="py-2.5 px-4 text-xs font-bold text-slate-700"
                  >
                    <span className="text-primary mr-1 hover:underline">●</span> {cat.name} —{' '}
                    <span className="font-normal text-slate-500">{cat.description}</span>
                  </td>
                </tr>
                {cat.permissions.map((perm) => (
                  <tr key={perm} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] font-semibold text-slate-700">
                      {perm}
                    </td>
                    {systemRoles.map((s) => {
                      const has = s.permissions.includes(perm);
                      return (
                        <td key={s.role} className="py-3 px-3 text-center">
                          {has ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                          ) : (
                            <XCircle className="w-4 h-4 text-slate-200 mx-auto" />
                          )}
                        </td>
                      );
                    })}
                    {customRoles.map((c) => {
                      const has = c.permissions.includes(perm);
                      return (
                        <td key={c._id} className="py-3 px-3 text-center">
                          {has ? (
                            <CheckCircle2 className="w-4 h-4 text-amber-500 mx-auto" />
                          ) : (
                            <XCircle className="w-4 h-4 text-slate-200 mx-auto" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
