import { useContext, useEffect, useState } from 'react';
import { Plus, Shield, Trash2 } from 'lucide-react';
import { UserContext } from '../../context/UserContext';
import PageShell from '../../components/common/PageShell';
import Modal from '../../components/common/Modal';
import axios from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';
import { PERMISSIONS, ROLE_LABELS, type Permission } from '../../constants/permissions';

interface SystemRoleRow {
  role: string;
  label: string;
  permissions: string[];
  isSystem: boolean;
}

interface CustomRole {
  _id: string;
  name: string;
  description?: string;
  permissions: string[];
}

const RolesPermissions = () => {
  const { hasPermission } = useContext(UserContext);
  const [systemRoles, setSystemRoles] = useState<SystemRoleRow[]>([]);
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    permissions: [] as string[],
  });

  const resetForm = () => setForm({ name: '', description: '', permissions: [] });

  const canManage = hasPermission('role:manage');

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const response = await axios.get(apiPaths.ROLES.LIST);
      setSystemRoles(response.data.data.systemRoles || []);
      setCustomRoles(response.data.data.customRoles || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canManage) fetchRoles();
    else setLoading(false);
  }, [canManage]);

  if (!canManage) {
    return (
      <PageShell title="Access Denied" subtitle="You need role:manage permission." />
    );
  }

  const togglePerm = (p: string) => {
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(p)
        ? prev.permissions.filter((x) => x !== p)
        : [...prev.permissions, p],
    }));
  };

  const handleCreate = async () => {
    if (!form.name.trim()) {
      setError('Role name is required');
      return;
    }
    setCreating(true);
    setError('');
    try {
      await axios.post(apiPaths.ROLES.CREATE, form);
      setForm({ name: '', description: '', permissions: [] });
      setShowCreateRole(false);
      await fetchRoles();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create role');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this custom role?')) return;
    try {
      await axios.delete(apiPaths.ROLES.DELETE.replace(':id', id));
      await fetchRoles();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete role');
    }
  };

  return (
    <PageShell
      title="Roles & Permissions"
      subtitle="System roles and custom permission sets for your organization."
    >
      <div className="space-y-6">
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg px-4 py-3 text-sm text-rose-400">
            {error}
          </div>
        )}

        <button
          onClick={() => setShowCreateRole(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover rounded-lg text-sm font-medium text-white"
        >
          <Plus className="w-4 h-4" /> Create custom role
        </button>

        {loading ? (
          <p className="text-slate-400 text-sm">Loading roles...</p>
        ) : (
          <>
            <div>
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4" /> System roles
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                {systemRoles.map((role) => (
                  <div
                    key={role.role}
                    className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4"
                  >
                    <div className="text-white font-medium">
                      {ROLE_LABELS[role.role as keyof typeof ROLE_LABELS] || role.label}
                    </div>
                    <p className="text-xs text-slate-400 mt-1 mb-2">
                      {role.permissions.length} permissions
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {role.permissions.slice(0, 8).map((p) => (
                        <span
                          key={p}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-700"
                        >
                          {p}
                        </span>
                      ))}
                      {role.permissions.length > 8 && (
                        <span className="text-[10px] text-slate-500">
                          +{role.permissions.length - 8} more
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-3">Custom roles</h3>
              {customRoles.length === 0 ? (
                <p className="text-sm text-slate-400">No custom roles yet.</p>
              ) : (
                <div className="space-y-2">
                  {customRoles.map((role) => (
                    <div
                      key={role._id}
                      className="flex items-start justify-between gap-3 bg-slate-800/50 border border-slate-700/50 rounded-xl p-4"
                    >
                      <div>
                        <div className="text-white font-medium">{role.name}</div>
                        {role.description && (
                          <p className="text-xs text-slate-400 mt-0.5">{role.description}</p>
                        )}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {role.permissions.map((p: Permission | string) => (
                            <span
                              key={p}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-700"
                            >
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(role._id)}
                        className="text-rose-400 hover:text-rose-300 p-1"
                        title="Delete role"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <Modal
        isOpen={showCreateRole}
        onClose={() => {
          setShowCreateRole(false);
          resetForm();
        }}
        title="Create custom role"
        subtitle="Define a new role and assign permissions."
        footer={
          <>
            <button
              onClick={() => {
                setShowCreateRole(false);
                resetForm();
              }}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium text-slate-300"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="px-4 py-2 bg-primary hover:bg-primary-hover rounded-lg text-sm font-medium text-white disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create role'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-3">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Role name"
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white"
            />
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Description (optional)"
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <p className="text-sm text-slate-400 mb-2">Permissions</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
              {PERMISSIONS.map((p) => (
                <label key={p} className="flex items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={form.permissions.includes(p)}
                    onChange={() => togglePerm(p)}
                  />
                  {p}
                </label>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </PageShell>
  );
};

export default RolesPermissions;
