import { useEffect, useState, useContext, type FormEvent } from 'react';
import PageShell from '../../components/common/PageShell';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';
import { UserContext } from '../../context/UserContext';
import type { CustomFieldDefinition } from '../../types';
import { Trash2 } from 'lucide-react';

export default function CustomFields() {
  const { hasPermission } = useContext(UserContext);
  const [fields, setFields] = useState<CustomFieldDefinition[]>([]);
  const [label, setLabel] = useState('');
  const [type, setType] = useState<CustomFieldDefinition['type']>('text');
  const [options, setOptions] = useState('');
  const [required, setRequired] = useState(false);

  const load = async () => {
    const res = await api.get(apiPaths.CUSTOM_FIELDS.LIST);
    setFields(res.data.data || []);
  };

  useEffect(() => {
    load().catch(console.error);
  }, []);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    await api.post(apiPaths.CUSTOM_FIELDS.CREATE, {
      label,
      type,
      options:
        type === 'select' || type === 'multi-select'
          ? options.split(',').map((o) => o.trim()).filter(Boolean)
          : [],
      required,
    });
    setLabel('');
    setOptions('');
    setRequired(false);
    await load();
  };

  const remove = async (id: string) => {
    await api.delete(apiPaths.CUSTOM_FIELDS.DELETE.replace(':id', id));
    await load();
  };

  return (
    <PageShell title="Custom Fields" subtitle="Org-level task field definitions">
      <form onSubmit={create} className="card space-y-3 mb-6 max-w-xl">
        <input
          className="input-dark w-full text-sm"
          placeholder="Label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          required
        />
        <select
          className="input-dark w-full text-sm"
          value={type}
          onChange={(e) => setType(e.target.value as CustomFieldDefinition['type'])}
        >
          <option value="text">Text</option>
          <option value="number">Number</option>
          <option value="date">Date</option>
          <option value="select">Select</option>
          <option value="multi-select">Multi-select</option>
        </select>
        {(type === 'select' || type === 'multi-select') && (
          <input
            className="input-dark w-full text-sm"
            placeholder="Options (comma-separated)"
            value={options}
            onChange={(e) => setOptions(e.target.value)}
          />
        )}
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={required}
            onChange={(e) => setRequired(e.target.checked)}
          />
          Required
        </label>
        <button type="submit" className="btn-primary" disabled={!hasPermission('custom_field:manage')}>
          Add field
        </button>
      </form>
      <ul className="space-y-2">
        {fields.map((f) => (
          <li key={f._id} className="card flex justify-between items-center gap-3">
            <div>
              <div className="text-sm text-slate-200">
                {f.label}{' '}
                <span className="text-xs text-slate-500">({f.type})</span>
              </div>
              <div className="text-xs text-slate-500">key: {f.key}</div>
            </div>
            <button
              type="button"
              onClick={() => remove(f._id)}
              className="text-slate-500 hover:text-red-400 disabled:opacity-50"
              disabled={!hasPermission('custom_field:manage')}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
