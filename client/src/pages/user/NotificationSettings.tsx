import { useEffect, useState, type FormEvent } from 'react';
import PageShell from '../../components/common/PageShell';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';

type Channel = 'in_app' | 'email' | 'both' | 'none';
type Digest = 'none' | 'daily' | 'weekly';

interface Prefs {
  taskAssigned: Channel;
  mentions: Channel;
  statusChanged: Channel;
  comments: Channel;
  dueDateReminder: Channel;
  digestFrequency: Digest;
}

const CHANNELS: Channel[] = ['in_app', 'email', 'both', 'none'];

export default function NotificationSettings() {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api
      .get(apiPaths.NOTIFICATIONS.PREFERENCES)
      .then((r) => setPrefs(r.data.data))
      .catch(console.error);
  }, []);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!prefs) return;
    setSaving(true);
    setMessage('');
    try {
      await api.put(apiPaths.NOTIFICATIONS.PREFERENCES, prefs);
      setMessage('Preferences saved');
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (!prefs) {
    return <PageShell title="Notification settings" subtitle="Loading…" />;
  }

  const rows: Array<{ key: keyof Prefs; label: string }> = [
    { key: 'taskAssigned', label: 'Task assigned' },
    { key: 'mentions', label: 'Mentions' },
    { key: 'statusChanged', label: 'Status changes' },
    { key: 'comments', label: 'Comments' },
    { key: 'dueDateReminder', label: 'Due date reminders' },
  ];

  return (
    <PageShell
      title="Notification settings"
      subtitle="Choose in-app, email, both, or none for each event"
    >
      <form onSubmit={save} className="card max-w-xl space-y-4">
        {rows.map((row) => (
          <div key={row.key} className="flex items-center justify-between gap-3">
            <label className="text-sm text-slate-300">{row.label}</label>
            <select
              className="input-dark text-sm"
              value={prefs[row.key] as string}
              onChange={(e) =>
                setPrefs({
                  ...prefs,
                  [row.key]: e.target.value as Channel,
                })
              }
            >
              {CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {c.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
        ))}
        <div className="flex items-center justify-between gap-3 border-t border-slate-700 pt-4">
          <label className="text-sm text-slate-300">Email digest</label>
          <select
            className="input-dark text-sm"
            value={prefs.digestFrequency}
            onChange={(e) =>
              setPrefs({
                ...prefs,
                digestFrequency: e.target.value as Digest,
              })
            }
          >
            <option value="none">None</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>
        {message && <p className="text-sm text-cyan-400">{message}</p>}
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save preferences'}
        </button>
      </form>
    </PageShell>
  );
}
