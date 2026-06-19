import { useEffect, useMemo, useRef } from 'react';
import { useAssistantOptional } from '../context/AssistantContext';
import type { PageAssistantContext } from '../types/intelligence';
import { getDefaultQuickActions } from '../utils/pageAssistantActions';

export function usePageAssistant(context: Omit<PageAssistantContext, 'suggestedActions'> & {
  suggestedActions?: PageAssistantContext['suggestedActions'];
}) {
  const assistant = useAssistantOptional();
  const registerRef = useRef(assistant?.registerPageContext);
  registerRef.current = assistant?.registerPageContext;

  const suggestedActions =
    context.suggestedActions && context.suggestedActions.length > 0
      ? context.suggestedActions
      : getDefaultQuickActions(context.pageType);

  const contextKey = useMemo(
    () =>
      JSON.stringify({
        pageType: context.pageType,
        pageTitle: context.pageTitle,
        entityIds: context.entityIds,
        entitySnapshot: context.entitySnapshot,
        suggestedActions,
      }),
    [
      context.pageType,
      context.pageTitle,
      JSON.stringify(context.entityIds),
      JSON.stringify(context.entitySnapshot),
      JSON.stringify(suggestedActions),
    ]
  );

  useEffect(() => {
    const register = registerRef.current;
    if (!register) return;

    register({
      pageType: context.pageType,
      pageTitle: context.pageTitle,
      entityIds: context.entityIds,
      entitySnapshot: context.entitySnapshot,
      suggestedActions,
    });
    return () => register(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by serialized contextKey
  }, [contextKey]);

  return assistant;
}
