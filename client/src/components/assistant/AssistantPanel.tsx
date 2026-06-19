import { useEffect, useState, type FormEvent } from 'react';
import { Loader2, Send, X, PanelRightOpen, PanelRightClose } from 'lucide-react';
import { useAssistant } from '../../context/AssistantContext';
import AssistantQuickActions from './AssistantQuickActions';
import AssistantResultView from './AssistantResultView';

const NARROW_W = 'max-w-[380px]';
const WIDE_W = 'max-w-[560px]';

export default function AssistantPanel() {
  const {
    isOpen,
    setOpen,
    messages,
    loading,
    loadingLabel,
    pageContext,
    sendMessage,
    runQuickAction,
  } = useAssistant();
  const [input, setInput] = useState('');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const mql = window.matchMedia('(max-width: 767px)');
    if (!mql.matches) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const msg = input.trim();
    if (!msg || loading) return;
    setInput('');
    await sendMessage(msg, { useRag: true });
  };

  if (!isOpen) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm md:hidden"
        onClick={() => setOpen(false)}
        aria-label="Close assistant"
      />
      <aside className={`fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-app-border bg-app-panel shadow-2xl transition-[max-width] duration-200 md:static md:z-auto md:shrink-0 md:h-full md:overflow-hidden ${expanded ? WIDE_W : NARROW_W}`}>
        <div className="flex items-center justify-between gap-2 border-b border-app-border px-4 py-1.5">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-white">AI Assistant</h2>
            {pageContext && (
              <p className="text-xs text-slate-500 truncate">{pageContext.pageTitle}</p>
            )}
          </div>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"
              aria-label={expanded ? 'Collapse panel' : 'Expand panel'}
              title={expanded ? 'Collapse' : 'Expand'}
            >
              {expanded ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"
              aria-label="Close panel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div
          className="min-h-0 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-app-border scrollbar-track-app-panel px-4 py-3 space-y-3"
          onWheel={(e) => e.stopPropagation()}
        >
          {messages.length === 0 && (
            <div className="rounded-lg border border-dashed border-app-border bg-white/5 p-4 text-center">
              <p className="text-sm text-slate-400">
                Ask anything about your work, or use a quick action below.
              </p>
            </div>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`rounded-lg px-3 py-2 text-sm ${
                msg.role === 'user'
                  ? 'ml-4 bg-primary/15 text-slate-100'
                  : msg.role === 'error'
                    ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                    : 'mr-4 bg-white/5 text-slate-200 border border-app-border'
              }`}
            >
              <p>{msg.content}</p>
              {msg.role === 'assistant' && msg.result != null && (
                <div className="mt-3 pt-3 border-t border-app-border/50">
                  <AssistantResultView intent={msg.intent} result={msg.result} />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              {loadingLabel}
            </div>
          )}
        </div>

        <div className="border-t border-app-border p-3 space-y-2">
          {pageContext && pageContext.suggestedActions.length > 0 && (
            <AssistantQuickActions
              actions={pageContext.suggestedActions}
              onAction={runQuickAction}
              disabled={loading}
            />
          )}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your work…"
              className="input-dark flex-1 !py-2 !text-sm"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="btn-primary !px-3 disabled:opacity-50"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
