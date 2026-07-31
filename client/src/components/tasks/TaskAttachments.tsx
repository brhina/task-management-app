import { useState, type ChangeEvent } from 'react';
import api from '../../utils/axios';
import { apiPaths, BASE_URL } from '../../utils/apiPaths';
import type { Task, TaskAttachment } from '../../types';
import { Paperclip, Trash2, Eye, X } from 'lucide-react';

interface Props {
  task: Task;
  onUpdated: () => void;
  canDelete?: boolean;
  canUpload?: boolean;
}

function resolveUrl(url: string) {
  if (url.startsWith('http')) return url;
  return `${BASE_URL}${url}`;
}

function isAttachmentObj(a: string | TaskAttachment): a is TaskAttachment {
  return typeof a === 'object' && a !== null && 'url' in a;
}

export default function TaskAttachments({ task, onUpdated, canDelete = false, canUpload = true }: Props) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<TaskAttachment | null>(null);

  const attachments = (task.attachments || [])
    .map((a) =>
      isAttachmentObj(a)
        ? a
        : ({
            _id: a,
            url: a,
            name: a.split('/').pop() || a,
            mimeType: 'application/octet-stream',
            size: 0,
            uploadedBy: '',
            uploadedAt: '',
          } as TaskAttachment),
    );

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const form = new FormData();
      form.append('file', file);
      await api.post(
        apiPaths.TASKS.ATTACHMENTS.replace(':id', task._id),
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      onUpdated();
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (attachmentId: string) => {
    try {
      await api.delete(
        apiPaths.TASKS.DELETE_ATTACHMENT.replace(':id', task._id).replace(
          ':attachmentId',
          attachmentId,
        ),
      );
      onUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200/60 bg-gray-100/40 p-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
        <Paperclip className="w-4 h-4" /> Attachments
      </h3>
      <ul className="space-y-2 mb-3">
        {attachments.length === 0 && (
          <li className="text-sm text-slate-500">No files attached.</li>
        )}
        {attachments.map((a) => (
          <li
            key={a._id}
            className="flex items-center justify-between gap-2 text-sm text-slate-600"
          >
            <span className="truncate">{a.name}</span>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setPreview(a)}
                className="text-cyan-400 hover:text-cyan-300"
                title="Preview"
              >
                <Eye className="w-4 h-4" />
              </button>
              {canDelete && (
                <button
                  type="button"
                  onClick={() => handleDelete(a._id)}
                  className="text-slate-500 hover:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {canUpload && (
        <label className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-600 cursor-pointer hover:bg-white">
          {uploading ? 'Uploading…' : 'Upload file'}
          <input
            type="file"
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
        </label>
      )}

      {preview && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-gray-100 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-auto p-4 relative">
            <button
              type="button"
              className="absolute top-3 right-3 text-slate-500 hover:text-slate-800"
              onClick={() => setPreview(null)}
            >
              <X className="w-5 h-5" />
            </button>
            <h4 className="text-slate-700 mb-3 pr-8">{preview.name}</h4>
            {preview.mimeType.startsWith('image/') ? (
              <img
                src={resolveUrl(preview.url)}
                alt={preview.name}
                className="max-w-full rounded-lg"
              />
            ) : preview.mimeType === 'application/pdf' ? (
              <iframe
                src={resolveUrl(preview.url)}
                title={preview.name}
                className="w-full h-[70vh] rounded-lg bg-white"
              />
            ) : (
              <a
                href={resolveUrl(preview.url)}
                target="_blank"
                rel="noreferrer"
                className="text-cyan-400 underline"
              >
                Download / open file
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
