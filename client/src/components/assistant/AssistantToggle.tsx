import { Brain } from 'lucide-react';
import { useAssistantOptional } from '../../context/AssistantContext';

export default function AssistantToggle() {
  const assistant = useAssistantOptional();
  if (!assistant) return null;

  const { isOpen, toggleOpen, pendingRecCount } = assistant;

  return (
    <button
      type="button"
      onClick={toggleOpen}
      className={`relative flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
        isOpen
          ? 'border-primary/40 bg-primary/15 text-primary'
          : 'border-app-border bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
      }`}
      aria-label={isOpen ? 'Close AI assistant' : 'Open AI assistant'}
      title="AI Assistant"
    >
      <Brain className="h-4 w-4" />
      <span className="hidden sm:inline">Assistant</span>
      {pendingRecCount > 0 && (
        <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-slate-900">
          {pendingRecCount > 9 ? '9+' : pendingRecCount}
        </span>
      )}
    </button>
  );
}
