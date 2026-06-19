import { Brain } from 'lucide-react';
import { useAssistant } from '../../context/AssistantContext';
import type { QuickAction } from '../../types/intelligence';

interface InlineAiButtonProps {
  action: QuickAction;
  label?: string;
  className?: string;
}

export default function InlineAiButton({ action, label, className = '' }: InlineAiButtonProps) {
  const { openAndRun } = useAssistant();

  return (
    <button
      type="button"
      onClick={() => openAndRun(action)}
      className={`inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors ${className}`}
    >
      <Brain className="h-3.5 w-3.5" />
      {label || action.label}
    </button>
  );
}
