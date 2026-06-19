import { useCallback } from 'react';
import api, { INTELLIGENCE_TIMEOUT_MS } from '../utils/axios';
import { apiPaths } from '../utils/apiPaths';
import type { AssistantPageContextPayload } from '../types/intelligence';
import {
  normalizeExecutive,
  normalizeProjectPlan,
  normalizeRiskAnalysis,
  normalizeSprintPlan,
  normalizeStatusReport,
  normalizeTaskBreakdown,
} from '../utils/intelligence';

export interface OrchestrateResponse {
  intent: unknown;
  result: unknown;
}

function buildPageContextPayload(
  pageContext?: AssistantPageContextPayload | null,
  preferredIntent?: string
): AssistantPageContextPayload | undefined {
  if (!pageContext && !preferredIntent) return undefined;
  return {
    ...pageContext,
    preferredIntent: (preferredIntent || pageContext?.preferredIntent) as
      | AssistantPageContextPayload['preferredIntent']
      | undefined,
  };
}

export function useIntelligenceActions() {
  const orchestrate = useCallback(
    async (
      message: string,
      pageContext?: AssistantPageContextPayload | null,
      preferredIntent?: string
    ): Promise<OrchestrateResponse> => {
      const res = await api.post(
        apiPaths.INTELLIGENCE.ORCHESTRATE,
        {
          message,
          pageContext: buildPageContextPayload(pageContext, preferredIntent),
        },
        { timeout: INTELLIGENCE_TIMEOUT_MS }
      );
      return res.data?.data as OrchestrateResponse;
    },
    []
  );

  const queryRag = useCallback(
    async (
      query: string,
      pageContext?: AssistantPageContextPayload | null,
      preferredIntent?: string
    ): Promise<OrchestrateResponse & { context?: unknown }> => {
      const res = await api.post(
        apiPaths.INTELLIGENCE.QUERY,
        {
          query,
          projectId: pageContext?.entityIds?.projectId,
          pageContext: buildPageContextPayload(pageContext, preferredIntent),
        },
        { timeout: INTELLIGENCE_TIMEOUT_MS }
      );
      return res.data?.data;
    },
    []
  );

  const fetchPortfolio = useCallback(async () => {
    const res = await api.get(apiPaths.INTELLIGENCE.PORTFOLIO, {
      timeout: INTELLIGENCE_TIMEOUT_MS,
    });
    return normalizeExecutive(res.data?.data);
  }, []);

  const breakdownTask = useCallback(async (payload: Record<string, unknown>) => {
    const res = await api.post(apiPaths.INTELLIGENCE.BREAKDOWN_TASK, payload, {
      timeout: INTELLIGENCE_TIMEOUT_MS,
    });
    return normalizeTaskBreakdown(res.data?.data?.result ?? res.data?.data);
  }, []);

  const analyzeRisks = useCallback(async (payload: Record<string, unknown>) => {
    const res = await api.post(apiPaths.INTELLIGENCE.ANALYZE_RISKS, payload, {
      timeout: INTELLIGENCE_TIMEOUT_MS,
    });
    return normalizeRiskAnalysis(res.data?.data?.result || res.data?.data);
  }, []);

  const planProject = useCallback(async (payload: Record<string, unknown>) => {
    const res = await api.post(apiPaths.INTELLIGENCE.PLAN_PROJECT, payload, {
      timeout: INTELLIGENCE_TIMEOUT_MS,
    });
    return normalizeProjectPlan(res.data?.data?.result) || normalizeProjectPlan(res.data?.data);
  }, []);

  const planSprint = useCallback(async (payload: Record<string, unknown>) => {
    const res = await api.post(apiPaths.INTELLIGENCE.PLAN_SPRINT, payload, {
      timeout: INTELLIGENCE_TIMEOUT_MS,
    });
    return normalizeSprintPlan(res.data?.data?.result || res.data?.data);
  }, []);

  const generateReport = useCallback(async (reportType: string) => {
    const path = apiPaths.INTELLIGENCE.GENERATE_REPORT.replace(':type', reportType);
    const res = await api.post(path, { reportType }, { timeout: INTELLIGENCE_TIMEOUT_MS });
    return normalizeStatusReport(res.data?.data);
  }, []);

  const generateOkrs = useCallback(async (payload: Record<string, unknown>) => {
    const res = await api.post(apiPaths.INTELLIGENCE.GENERATE_OKRS, payload, {
      timeout: INTELLIGENCE_TIMEOUT_MS,
    });
    return res.data?.data?.result ?? res.data?.data;
  }, []);

  const analyzeDependencies = useCallback(async (payload: Record<string, unknown>) => {
    const res = await api.post(apiPaths.INTELLIGENCE.ANALYZE_DEPENDENCIES, payload, {
      timeout: INTELLIGENCE_TIMEOUT_MS,
    });
    return res.data?.data;
  }, []);

  const fetchRecommendations = useCallback(async (status?: string) => {
    const params = status ? { status } : {};
    const res = await api.get(apiPaths.INTELLIGENCE.RECOMMENDATIONS, { params });
    return res.data?.data || [];
  }, []);

  const patchRecommendation = useCallback(async (id: string, status: 'accepted' | 'rejected') => {
    const res = await api.patch(
      apiPaths.INTELLIGENCE.PATCH_RECOMMENDATION.replace(':id', id),
      { status }
    );
    return res.data?.data;
  }, []);

  return {
    orchestrate,
    queryRag,
    fetchPortfolio,
    breakdownTask,
    analyzeRisks,
    planProject,
    planSprint,
    generateReport,
    generateOkrs,
    analyzeDependencies,
    fetchRecommendations,
    patchRecommendation,
  };
}
