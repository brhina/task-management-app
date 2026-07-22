import { useState, useEffect, useCallback, type FormEvent } from 'react';
import api from '../../utils/axios';
import { apiPaths, BASE_URL } from '../../utils/apiPaths';
import type { TaskComment, User } from '../../types';
import { MessageSquare, Send, Trash2 } from 'lucide-react';

interface Props {
  taskId: string;
  members: User[];
  canDelete?: boolean;
}

export default function TaskComments({ taskId, members, canDelete }: Props) {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);

  const fetchComments = useCallback(async () => {
    try {
      const res = await api.get(apiPaths.TASKS.COMMENTS.replace(':id', taskId));
      setComments(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const onChange = (value: string) => {
    setContent(value);
    const match = value.match(/@(\w*)$/);
    setMentionQuery(match ? match[1] : null);
  };

  const insertMention = (name: string) => {
    setContent((prev) => prev.replace(/@\w*$/, `@${name.replace(/\s+/g, '')} `));
    setMentionQuery(null);
  };

  const suggestions =
    mentionQuery !== null
      ? members.filter((m) =>
          m.name.toLowerCase().includes(mentionQuery.toLowerCase()),
        )
      : [];

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    try {
      setSubmitting(true);
      await api.post(apiPaths.TASKS.COMMENTS.replace(':id', taskId), {
        content: content.trim(),
      });
      setContent('');
      await fetchComments();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await api.delete(
        apiPaths.TASKS.DELETE_COMMENT.replace(':id', taskId).replace(
          ':commentId',
          commentId,
        ),
      );
      await fetchComments();
    } catch (err) {
      console.error(err);
    }
  };

  const authorName = (c: TaskComment) =>
    typeof c.userId === 'object' ? c.userId.name : 'User';

  return (
    <div className="rounded-2xl border border-slate-700/60 bg-slate-900/40 p-4">
      <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
        <MessageSquare className="w-4 h-4" /> Comments
      </h3>
      {loading ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : (
        <ul className="space-y-3 mb-4 max-h-64 overflow-y-auto">
          {comments.length === 0 && (
            <li className="text-sm text-slate-500">No comments yet.</li>
          )}
          {comments.map((c) => (
            <li key={c._id} className="text-sm border-b border-slate-800 pb-2">
              <div className="flex justify-between gap-2">
                <span className="font-medium text-slate-300">{authorName(c)}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">
                    {new Date(c.createdAt).toLocaleString()}
                  </span>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => handleDelete(c._id)}
                      className="text-slate-500 hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <p className="text-slate-400 mt-1 whitespace-pre-wrap">{c.content}</p>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={handleSubmit} className="relative">
        <textarea
          value={content}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          placeholder="Write a comment… use @ to mention"
          className="w-full rounded-xl bg-slate-950/60 border border-slate-700 px-3 py-2 text-sm text-slate-200"
        />
        {suggestions.length > 0 && (
          <ul className="absolute left-0 right-0 bottom-full mb-1 rounded-lg border border-slate-700 bg-slate-900 shadow-lg z-10 max-h-32 overflow-y-auto">
            {suggestions.slice(0, 6).map((m) => (
              <li key={m._id}>
                <button
                  type="button"
                  className="w-full text-left px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
                  onClick={() => insertMention(m.name)}
                >
                  @{m.name}
                </button>
              </li>
            ))}
          </ul>
        )}
        <button
          type="submit"
          disabled={submitting || !content.trim()}
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-cyan-600/80 hover:bg-cyan-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
        >
          <Send className="w-3.5 h-3.5" /> Post
        </button>
      </form>
      {/* keep BASE_URL referenced for attachment URLs elsewhere */}
      <span className="hidden">{BASE_URL}</span>
    </div>
  );
}
