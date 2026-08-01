import { useState, useEffect, useCallback, type FormEvent } from 'react';
import api from '../../utils/axios';
import { apiPaths, BASE_URL } from '../../utils/apiPaths';
import type { TaskComment, User } from '../../types';
import { MessageSquare, Send, Trash2 } from 'lucide-react';
import MentionText from '../common/MentionText';
import ConfirmModal from '../common/ConfirmModal';

interface Props {
  taskId: string;
  members: User[];
  canDelete?: boolean;
  canPost?: boolean;
}

export default function TaskComments({ taskId, members, canDelete = false, canPost = true }: Props) {
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

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    commentId: string;
    loading: boolean;
  }>({
    isOpen: false,
    commentId: '',
    loading: false,
  });

  const handleDelete = (commentId: string) => {
    setDeleteModal({ isOpen: true, commentId, loading: false });
  };

  const confirmDeleteComment = async () => {
    if (!deleteModal.commentId) return;
    setDeleteModal((prev) => ({ ...prev, loading: true }));
    try {
      await api.delete(
        apiPaths.TASKS.DELETE_COMMENT.replace(':id', taskId).replace(
          ':commentId',
          deleteModal.commentId,
        ),
      );
      await fetchComments();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteModal({ isOpen: false, commentId: '', loading: false });
    }
  };

  const authorName = (c: TaskComment) =>
    typeof c.userId === 'object' ? c.userId.name : 'User';

  return (
    <div className="rounded-2xl border border-gray-200/60 bg-gray-100/40 p-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
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
            <li key={c._id} className="text-sm border-b border-gray-200 pb-2">
              <div className="flex justify-between gap-2">
                <span className="font-medium text-slate-600">{authorName(c)}</span>
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
              <p className="text-slate-500 mt-1">
                <MentionText text={c.content} />
              </p>
            </li>
          ))}
        </ul>
      )}
      {canPost && (
        <form onSubmit={handleSubmit} className="relative">
          <div className="flex items-stretch rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
            <textarea
              value={content}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              rows={2}
              placeholder="Write a comment… use @ to mention (Ctrl+Enter to post)"
              className="flex-1 border-0 bg-transparent px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none resize-none"
            />
            <button
              type="submit"
              disabled={submitting || !content.trim()}
              className="self-end my-2 mr-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs inline-flex items-center gap-1.5 shadow-sm disabled:opacity-50 transition-colors shrink-0"
            >
              <Send className="w-3.5 h-3.5" /> Post
            </button>
          </div>
          {suggestions.length > 0 && (
            <ul className="absolute left-0 right-0 bottom-full mb-1 rounded-xl border border-slate-200 bg-white shadow-xl z-20 max-h-36 overflow-y-auto">
              {suggestions.slice(0, 6).map((m) => (
                <li key={m._id}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-700 font-medium hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                    onClick={() => insertMention(m.name)}
                  >
                    @{m.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </form>
      )}
      {/* keep BASE_URL referenced for attachment URLs elsewhere */}
      <span className="hidden">{BASE_URL}</span>

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, commentId: '', loading: false })}
        onConfirm={confirmDeleteComment}
        title="Delete Comment"
        message="Are you sure you want to delete this comment?"
        loading={deleteModal.loading}
      />
    </div>
  );
}
