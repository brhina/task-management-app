import { OrchestratorIntent } from "../schemas/orchestrator.schema.js";

const INTENT_PATTERNS: { intent: OrchestratorIntent["intent"]; patterns: RegExp[] }[] = [
  {
    intent: "plan_project",
    patterns: [
      /\b(plan|create|start|kick[\s-]?off|launch|new)\b.*\b(project|initiative|program)\b/i,
      /\b(project)\b.*\b(plan|roadmap|proposal)\b/i,
    ],
  },
  {
    intent: "breakdown_task",
    patterns: [
      /\b(break[\s-]?down|split|decompose|subtask|subtask|sub[\s-]?task)\b/i,
      /\b(task|story|ticket|work\s?item)\b.*\b(break|split|detail|refine)\b/i,
    ],
  },
  {
    intent: "analyze_risks",
    patterns: [
      /\b(risk|risk[s]?|blocker|threat|concern|issue)\b.*\b(analy|assess|review|identify|find)\b/i,
      /\b(analy|assess|review)\b.*\b(risk|risk[s]?|blocker|threat)\b/i,
    ],
  },
  {
    intent: "plan_sprint",
    patterns: [
      /\b(sprint|iteration|cycle)\b.*\b(plan|schedule|organize|prep)\b/i,
      /\b(plan|schedule|organize)\b.*\b(sprint|iteration|cycle)\b/i,
      /\bsprint\s*planning\b/i,
    ],
  },
  {
    intent: "generate_report",
    patterns: [
      /\b(report|summary|status\s?update|dashboard|weekly|daily|executive)\b.*\b(generat|creat|build|produc)\b/i,
      /\b(generat|creat|build|produc)\b.*\b(report|summary|status)\b/i,
    ],
  },
  {
    intent: "generate_okrs",
    patterns: [
      /\b(okr|objective|key\s?result|goal|metric|target|kr)\b/i,
    ],
  },
  {
    intent: "analyze_dependencies",
    patterns: [
      /\b(dependenc|dep|blocker|blocked|critical\s?path|prerequisite|waiting\s?on)\b/i,
    ],
  },
  {
    intent: "portfolio_intelligence",
    patterns: [
      /\b(portfolio|executive|strategic|overall|all\s?project|cross[\s-]?project)\b/i,
      /\b(capacity|utilization|resource)\b.*\b(bottleneck|overview|across)\b/i,
    ],
  },
];

export function classifyIntentLocal(
  message: string,
): OrchestratorIntent {
  const lower = message.toLowerCase();

  for (const { intent, patterns } of INTENT_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(lower) || pattern.test(message)) {
        return { intent, confidence: 0.85, summary: "" };
      }
    }
  }

  return { intent: "general_query", confidence: 0.5, summary: "" };
}
