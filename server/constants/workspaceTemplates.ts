export interface WorkspaceTemplateSeed {
  id: string;
  name: string;
  description: string;
  projects: { name: string; description: string }[];
  taskCategories: string[];
  customFields: {
    key: string;
    label: string;
    type: "text" | "number" | "date" | "select" | "multi-select";
    options?: string[];
  }[];
  teams: { name: string; description: string }[];
}

export const WORKSPACE_TEMPLATES: WorkspaceTemplateSeed[] = [
  {
    id: "software-dev",
    name: "Software Development",
    description:
      "Projects, sprint-ready structure, and engineering teams for product delivery.",
    projects: [
      {
        name: "Product Backlog",
        description: "Prioritized feature and bug backlog",
      },
      {
        name: "Platform & Infrastructure",
        description: "Reliability, CI/CD, and platform work",
      },
    ],
    taskCategories: ["Feature", "Bug", "Tech Debt", "Spike"],
    customFields: [
      {
        key: "story_points",
        label: "Story Points",
        type: "number",
      },
      {
        key: "component",
        label: "Component",
        type: "select",
        options: ["Frontend", "Backend", "API", "Infra", "Mobile"],
      },
    ],
    teams: [
      { name: "Engineering", description: "Product engineering" },
      { name: "QA", description: "Quality assurance" },
    ],
  },
  {
    id: "marketing",
    name: "Marketing",
    description:
      "Campaign planning, content pipelines, and go-to-market tracking.",
    projects: [
      {
        name: "Campaigns",
        description: "Active and planned marketing campaigns",
      },
      {
        name: "Content Calendar",
        description: "Blog, social, and email content",
      },
    ],
    taskCategories: ["Campaign", "Content", "Design", "Analytics"],
    customFields: [
      {
        key: "channel",
        label: "Channel",
        type: "select",
        options: ["Email", "Social", "Web", "Paid Ads", "Event"],
      },
      {
        key: "target_audience",
        label: "Target Audience",
        type: "text",
      },
    ],
    teams: [
      { name: "Growth", description: "Acquisition and growth" },
      { name: "Brand", description: "Brand and creative" },
    ],
  },
  {
    id: "hr",
    name: "Human Resources",
    description:
      "Hiring pipelines, onboarding checklists, and people operations.",
    projects: [
      {
        name: "Recruiting",
        description: "Open roles and candidate pipeline",
      },
      {
        name: "Onboarding",
        description: "New hire onboarding workflows",
      },
    ],
    taskCategories: ["Hiring", "Onboarding", "Policy", "Training"],
    customFields: [
      {
        key: "department",
        label: "Department",
        type: "select",
        options: ["Engineering", "Sales", "Marketing", "Ops", "Finance"],
      },
      {
        key: "hire_date",
        label: "Target Hire Date",
        type: "date",
      },
    ],
    teams: [
      { name: "Talent", description: "Recruiting" },
      { name: "People Ops", description: "HR operations" },
    ],
  },
  {
    id: "blank",
    name: "Blank Workspace",
    description: "Start empty and configure projects yourself.",
    projects: [],
    taskCategories: [],
    customFields: [],
    teams: [],
  },
];

export function getWorkspaceTemplate(
  id: string,
): WorkspaceTemplateSeed | undefined {
  return WORKSPACE_TEMPLATES.find((t) => t.id === id);
}
