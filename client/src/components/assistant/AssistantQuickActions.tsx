import type { QuickAction } from '../../types/intelligence';

interface AssistantQuickActionsProps {
  actions: QuickAction[];
  onAction: (action: QuickAction) => void;
  disabled?: boolean;
}

export default function AssistantQuickActions({
  actions,
  onAction,
  disabled = false,
}: AssistantQuickActionsProps) {
  if (actions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          disabled={disabled}
          onClick={() => onAction(action)}
          className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20 disabled:opacity-50 transition-colors"
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
