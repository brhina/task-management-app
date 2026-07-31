import { useContext, useEffect, useState } from 'react';
import { Plus, UsersRound, Trash2 } from 'lucide-react';
import { UserContext } from '../../context/UserContext';
import PageShell from '../../components/common/PageShell';
import AdvancedTable, { RowActions, type Column, type ActionItem } from '../../components/common/AdvancedTable';
import Modal from '../../components/common/Modal';
import axios from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';

interface TeamMember {
  _id: string;
  name: string;
  email: string;
}

interface Team {
  _id: string;
  name: string;
  description?: string;
  leadId?: TeamMember;
  memberIds: TeamMember[];
  parentTeamId?: { _id: string; name: string };
}

interface OrgUser {
  _id: string;
  name: string;
  email: string;
}

const Teams = () => {
  const { hasPermission, user } = useContext(UserContext);
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    description: '',
    leadId: '',
    memberIds: [] as string[],
    parentTeamId: '',
  });
  const [selectedDashboard, setSelectedDashboard] = useState<any>(null);
  const [showCreateTeam, setShowCreateTeam] = useState(false);

  const canView = hasPermission('team:view');
  const canManage = hasPermission('team:manage');

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const [teamsRes, usersRes] = await Promise.all([
        axios.get(apiPaths.TEAMS.LIST),
        axios.get(apiPaths.USERS.GET_ALL_USERS).catch(() => ({ data: [] })),
      ]);
      setTeams(teamsRes.data.data || []);
      const userList = Array.isArray(usersRes.data)
        ? usersRes.data
        : usersRes.data?.data || usersRes.data?.users || [];
      setUsers(userList);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canView) fetchTeams();
    else setLoading(false);
  }, [canView, user?.activeOrgId]);

  if (!canView) {
    return <PageShell title="Access Denied" subtitle="You need team:view permission." />;
  }

  const handleCreate = async () => {
    if (!form.name.trim()) {
      setError('Team name is required');
      return;
    }
    try {
      await axios.post(apiPaths.TEAMS.CREATE, {
        name: form.name.trim(),
        description: form.description,
        leadId: form.leadId || undefined,
        memberIds: form.memberIds,
        parentTeamId: form.parentTeamId || undefined,
      });
      setForm({ name: '', description: '', leadId: '', memberIds: [], parentTeamId: '' });
      setShowCreateTeam(false);
      await fetchTeams();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create team');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this team?')) return;
    try {
      await axios.delete(apiPaths.TEAMS.DELETE.replace(':id', id));
      await fetchTeams();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete team');
    }
  };

  const loadDashboard = async (id: string) => {
    try {
      const res = await axios.get(apiPaths.TEAMS.DASHBOARD.replace(':id', id));
      setSelectedDashboard(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load team dashboard');
    }
  };

  const toggleMember = (id: string) => {
    setForm((prev) => ({
      ...prev,
      memberIds: prev.memberIds.includes(id)
        ? prev.memberIds.filter((x) => x !== id)
        : [...prev.memberIds, id],
    }));
  };

  return (
    <PageShell
      title="Teams & Departments"
      subtitle="Organize members into teams with hierarchy and team-level reporting."
      actions={
        canManage ? (
          <button
            type="button"
            onClick={() => setShowCreateTeam(true)}
            className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-gray-100 transition-colors"
          >
            Create Team
          </button>
        ) : undefined
      }
    >
      <div className="space-y-6">
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg px-4 py-3 text-sm text-rose-400">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-slate-500 text-sm">Loading teams...</p>
        ) : (() => {
            const teamColumns: Column<Team>[] = [
              {
                key: 'name',
                header: 'Name',
                render: (team) => (
                  <div>
                    <div className="flex items-center gap-2 text-slate-800 font-semibold">
                      <UsersRound className="w-4 h-4 text-primary" />
                      {team.name}
                    </div>
                    {team.parentTeamId && (
                      <p className="text-xs text-slate-500 mt-0.5">Parent: {team.parentTeamId.name}</p>
                    )}
                    {team.description && (
                      <p className="text-xs text-slate-500 mt-1">{team.description}</p>
                    )}
                  </div>
                ),
              },
              {
                key: 'members',
                header: 'Members',
                render: (team) => (
                  <span className="text-sm text-slate-700">{team.memberIds?.length || 0}</span>
                ),
              },
              {
                key: 'leads',
                header: 'Leads',
                render: (team) => (
                  <span className="text-sm text-slate-700">{team.leadId?.name || '—'}</span>
                ),
              },
              {
                key: 'actions',
                header: 'Actions',
                className: 'w-[50px]',
                render: (team) => {
                  const items: ActionItem[] = [
                    { label: 'Dashboard', onClick: () => loadDashboard(team._id) },
                  ];
                  if (canManage) {
                    items.push({ label: 'Delete', onClick: () => handleDelete(team._id), className: 'text-rose-500' });
                  }
                  return <RowActions items={items} />;
                },
              },
            ];
            return (
              <AdvancedTable
                data={teams}
                columns={teamColumns}
                emptyMessage="No teams yet. Create one to get started."
                emptyIcon={<UsersRound className="w-12 h-12 text-slate-600 mx-auto mb-3" />}
              />
            );
          })()
        }

        {selectedDashboard && (
          <div className="bg-white/50 border border-gray-200/50 rounded-xl p-4">
            <h3 className="text-slate-800 font-semibold mb-2">
              {selectedDashboard.team?.name} dashboard
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <div className="bg-gray-100/60 rounded-lg p-3">
                <div className="text-lg font-bold text-slate-800">
                  {selectedDashboard.statistics?.totalTasks || 0}
                </div>
                <div className="text-[10px] uppercase text-slate-500">Tasks</div>
              </div>
              <div className="bg-gray-100/60 rounded-lg p-3">
                <div className="text-lg font-bold text-slate-800">
                  {selectedDashboard.statistics?.overdueTasks || 0}
                </div>
                <div className="text-[10px] uppercase text-slate-500">Overdue</div>
              </div>
              <div className="bg-gray-100/60 rounded-lg p-3">
                <div className="text-lg font-bold text-slate-800">
                  {selectedDashboard.statistics?.completedLast30Days || 0}
                </div>
                <div className="text-[10px] uppercase text-slate-500">Done (30d)</div>
              </div>
              <div className="bg-gray-100/60 rounded-lg p-3">
                <div className="text-lg font-bold text-slate-800">
                  {selectedDashboard.team?.memberCount || 0}
                </div>
                <div className="text-[10px] uppercase text-slate-500">Members</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <Modal
        isOpen={showCreateTeam}
        onClose={() => {
          setShowCreateTeam(false);
          setForm({ name: '', description: '', leadId: '', memberIds: [], parentTeamId: '' });
        }}
        title="Create Team"
        subtitle="Set up a new team with members and a lead"
        footer={
          <>
            <button onClick={() => setShowCreateTeam(false)} className="btn-secondary">
              Cancel
            </button>
            <button onClick={handleCreate} className="btn-primary">
              Create Team
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-3">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Team name"
              className="input-field w-full text-sm"
            />
            <select
              value={form.parentTeamId}
              onChange={(e) => setForm({ ...form, parentTeamId: e.target.value })}
              className="input-field w-full text-sm"
            >
              <option value="">No parent team</option>
              {teams.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
            </select>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Description"
              className="input-field w-full text-sm md:col-span-2"
            />
            <select
              value={form.leadId}
              onChange={(e) => setForm({ ...form, leadId: e.target.value })}
              className="input-field w-full text-sm"
            >
              <option value="">Select lead</option>
              {users.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Members
            </div>
            <div className="max-h-32 overflow-y-auto grid sm:grid-cols-2 gap-1">
              {users.map((u) => (
                <label key={u._id} className="flex items-center gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={form.memberIds.includes(u._id)}
                    onChange={() => toggleMember(u._id)}
                  />
                  {u.name}
                </label>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </PageShell>
  );
};

export default Teams;
