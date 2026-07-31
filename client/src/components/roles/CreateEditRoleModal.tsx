import Modal from '../common/Modal';
import { type CustomRole, PERMISSION_CATEGORIES } from './types';
import { PERMISSIONS, type Permission } from '../../constants/permissions';

interface CreateEditRoleModalProps {
  isOpen: boolean;
  editingRole: CustomRole | null;
  roleForm: {
    name: string;
    description: string;
    permissions: string[];
  };
  savingRole: boolean;
  onClose: () => void;
  onChangeForm: (form: { name: string; description: string; permissions: string[] }) => void;
  onSubmit: () => void;
}

export default function CreateEditRoleModal({
  isOpen,
  editingRole,
  roleForm,
  savingRole,
  onClose,
  onChangeForm,
  onSubmit,
}: CreateEditRoleModalProps) {
  if (!isOpen) return null;

  const togglePermission = (perm: string) => {
    const permissions = roleForm.permissions.includes(perm)
      ? roleForm.permissions.filter((p) => p !== perm)
      : [...roleForm.permissions, perm];
    onChangeForm({ ...roleForm, permissions });
  };

  const toggleCategoryPermissions = (categoryPerms: Permission[]) => {
    const allSelected = categoryPerms.every((p) => roleForm.permissions.includes(p));
    if (allSelected) {
      const permissions = roleForm.permissions.filter((p) => !categoryPerms.includes(p as Permission));
      onChangeForm({ ...roleForm, permissions });
    } else {
      const newPerms = new Set([...roleForm.permissions, ...categoryPerms]);
      onChangeForm({ ...roleForm, permissions: Array.from(newPerms) });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingRole ? `Edit Custom Role: ${editingRole.name}` : 'Create Custom Role'}
      subtitle="Define role metadata and assign granular permission sets."
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={savingRole || !roleForm.name.trim()}
            className="px-5 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg shadow-sm disabled:opacity-50 transition-all"
          >
            {savingRole ? 'Saving...' : editingRole ? 'Save Changes' : 'Create Custom Role'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              Role Name *
            </label>
            <input
              type="text"
              value={roleForm.name}
              onChange={(e) => onChangeForm({ ...roleForm, name: e.target.value })}
              placeholder="e.g. Lead QA Engineer"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              Description
            </label>
            <input
              type="text"
              value={roleForm.description}
              onChange={(e) => onChangeForm({ ...roleForm, description: e.target.value })}
              placeholder="Brief role responsibilities..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
              Assign Permissions ({roleForm.permissions.length} Selected)
            </label>
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => onChangeForm({ ...roleForm, permissions: [...PERMISSIONS] })}
                className="text-primary hover:underline font-semibold"
              >
                Select All
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={() => onChangeForm({ ...roleForm, permissions: [] })}
                className="text-rose-500 hover:underline font-semibold"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Category Grouped Permissions List */}
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {PERMISSION_CATEGORIES.map((cat) => {
              const allCatSelected = cat.permissions.every((p) => roleForm.permissions.includes(p));
              return (
                <div key={cat.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700">{cat.name}</span>
                    <button
                      type="button"
                      onClick={() => toggleCategoryPermissions(cat.permissions)}
                      className="text-[10px] font-bold text-primary hover:underline uppercase"
                    >
                      {allCatSelected ? 'Deselect Category' : 'Select Category'}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {cat.permissions.map((p) => {
                      const isChecked = roleForm.permissions.includes(p);
                      return (
                        <label
                          key={p}
                          className={`flex items-center gap-2 p-1.5 rounded-lg border text-xs font-mono cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-primary/10 border-primary/40 text-primary font-bold'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100/50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => togglePermission(p)}
                            className="rounded border-slate-300 text-primary focus:ring-primary/20"
                          />
                          <span>{p}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}
