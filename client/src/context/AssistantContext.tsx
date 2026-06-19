import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { UserContext } from './UserContext';
import { useIntelligenceActions } from '../hooks/useIntelligenceActions';
import type {
  AssistantMessage,
  AssistantPageContextPayload,
  PageAssistantContext,
  QuickAction,
  Recommendation,
} from '../types/intelligence';

const ASSISTANT_OPEN_KEY = 'assistant:open';

interface AssistantContextValue {
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
  messages: AssistantMessage[];
  loading: boolean;
  loadingLabel: string;
  pendingRecCount: number;
  pageContext: PageAssistantContext | null;
  registerPageContext: (ctx: PageAssistantContext | null) => void;
  sendMessage: (message: string, options?: { useRag?: boolean }) => Promise<void>;
  runQuickAction: (action: QuickAction) => Promise<void>;
  openAndRun: (action: QuickAction) => Promise<void>;
  refreshRecommendations: () => Promise<void>;
  acceptRecommendation: (id: string) => Promise<void>;
  rejectRecommendation: (id: string) => Promise<void>;
  readOnly: boolean;
}

const AssistantContext = createContext<AssistantContextValue | null>(null);

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function AssistantProvider({ children }: { children: ReactNode }) {
  const { user, getEffectiveRole } = useContext(UserContext);
  const { orchestrate, queryRag, fetchRecommendations, patchRecommendation } =
    useIntelligenceActions();

  const [isOpen, setIsOpenState] = useState(() => {
    try {
      return localStorage.getItem(ASSISTANT_OPEN_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState('Thinking…');
  const [pageContext, setPageContext] = useState<PageAssistantContext | null>(null);
  const [pendingRecCount, setPendingRecCount] = useState(0);

  const readOnly = getEffectiveRole() !== 'OrgAdmin';

  const setOpen = useCallback((open: boolean) => {
    setIsOpenState(open);
    try {
      localStorage.setItem(ASSISTANT_OPEN_KEY, String(open));
    } catch {
      /* ignore */
    }
  }, []);

  const toggleOpen = useCallback(() => {
    setIsOpenState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(ASSISTANT_OPEN_KEY, String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const registerPageContext = useCallback((ctx: PageAssistantContext | null) => {
    setPageContext((prev) => {
      const prevKey = prev ? JSON.stringify(prev) : '';
      const nextKey = ctx ? JSON.stringify(ctx) : '';
      if (prevKey === nextKey) return prev;
      return ctx;
    });
  }, []);

  const buildPayload = useCallback(
    (preferredIntent?: string): AssistantPageContextPayload | undefined => {
      if (!pageContext) return preferredIntent ? { preferredIntent: preferredIntent as any } : undefined;
      return {
        pageType: pageContext.pageType,
        pageTitle: pageContext.pageTitle,
        entityIds: pageContext.entityIds,
        entitySnapshot: pageContext.entitySnapshot,
        preferredIntent: preferredIntent as AssistantPageContextPayload['preferredIntent'],
      };
    },
    [pageContext]
  );

  const refreshRecommendations = useCallback(async () => {
    try {
      const recs: Recommendation[] = await fetchRecommendations('pending');
      setPendingRecCount(recs.length);
    } catch {
      /* ignore */
    }
  }, [fetchRecommendations]);

  useEffect(() => {
    if (user) refreshRecommendations();
  }, [user, refreshRecommendations]);

  const runWithMessage = useCallback(
    async (
      message: string,
      options?: { preferredIntent?: string; loadingLabel?: string; useRag?: boolean }
    ) => {
      const userMsg: AssistantMessage = {
        id: makeId(),
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);
      setLoadingLabel(options?.loadingLabel || 'Thinking…');

      try {
        const payload = buildPayload(options?.preferredIntent);
        const data = options?.useRag
          ? await queryRag(message, payload, options?.preferredIntent)
          : await orchestrate(message, payload, options?.preferredIntent);

        const intentObj = data?.intent as { intent?: string } | undefined;
        const assistantMsg: AssistantMessage = {
          id: makeId(),
          role: 'assistant',
          content: intentObj?.intent
            ? `Completed: ${intentObj.intent.replace(/_/g, ' ')}`
            : 'Response ready',
          timestamp: new Date().toISOString(),
          intent: intentObj?.intent,
          result: data?.result ?? data,
        };
        setMessages((prev) => [...prev, assistantMsg]);
        await refreshRecommendations();
      } catch (err: unknown) {
        const e = err as { response?: { data?: { message?: string } } };
        setMessages((prev) => [
          ...prev,
          {
            id: makeId(),
            role: 'error',
            content: e.response?.data?.message || 'Something went wrong. Please try again.',
            timestamp: new Date().toISOString(),
          },
        ]);
      } finally {
        setLoading(false);
        setLoadingLabel('Thinking…');
      }
    },
    [buildPayload, orchestrate, queryRag, refreshRecommendations]
  );

  const sendMessage = useCallback(
    async (message: string, options?: { useRag?: boolean }) => {
      if (!message.trim()) return;
      await runWithMessage(message.trim(), { useRag: options?.useRag });
    },
    [runWithMessage]
  );

  const runQuickAction = useCallback(
    async (action: QuickAction) => {
      await runWithMessage(action.message, {
        preferredIntent: action.preferredIntent,
        loadingLabel: action.loadingLabel,
      });
    },
    [runWithMessage]
  );

  const openAndRun = useCallback(
    async (action: QuickAction) => {
      setOpen(true);
      await runQuickAction(action);
    },
    [runQuickAction, setOpen]
  );

  const acceptRecommendation = useCallback(
    async (id: string) => {
      await patchRecommendation(id, 'accepted');
      await refreshRecommendations();
    },
    [patchRecommendation, refreshRecommendations]
  );

  const rejectRecommendation = useCallback(
    async (id: string) => {
      await patchRecommendation(id, 'rejected');
      await refreshRecommendations();
    },
    [patchRecommendation, refreshRecommendations]
  );

  const value = useMemo(
    () => ({
      isOpen,
      setOpen,
      toggleOpen,
      messages,
      loading,
      loadingLabel,
      pendingRecCount,
      pageContext,
      registerPageContext,
      sendMessage,
      runQuickAction,
      openAndRun,
      refreshRecommendations,
      acceptRecommendation,
      rejectRecommendation,
      readOnly,
    }),
    [
      isOpen,
      setOpen,
      toggleOpen,
      messages,
      loading,
      loadingLabel,
      pendingRecCount,
      pageContext,
      registerPageContext,
      sendMessage,
      runQuickAction,
      openAndRun,
      refreshRecommendations,
      acceptRecommendation,
      rejectRecommendation,
      readOnly,
    ]
  );

  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}

export function useAssistant() {
  const ctx = useContext(AssistantContext);
  if (!ctx) {
    throw new Error('useAssistant must be used within AssistantProvider');
  }
  return ctx;
}

export function useAssistantOptional() {
  return useContext(AssistantContext);
}
