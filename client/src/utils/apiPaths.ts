export const BASE_URL =
  import.meta.env.MODE === 'production'
    ? 'https://task-management-app-ma8h.onrender.com'
    : 'http://localhost:3001';

export const apiPaths = {
  AUTH: {
    signup: '/api/auth/register',
    login: '/api/auth/login',
    GET_USER_PROFILE: '/api/auth/profile',
    UPDATE_USER_PROFILE: '/api/auth/profile/:id',
  },
  USERS: {
    GET_ALL_USERS: '/api/users',
    GET_USER_BY_ID: '/api/users/:id',
    DELETE_USER: '/api/users/:id',
  },
  TASKS: {
    GET_DASHBOARD_TASKS: '/api/tasks/dashboard-tasks',
    GET_USER_DASHBOARD_TASKS: '/api/tasks/user-dashboard-tasks',
    GET_ALL_TASKS: '/api/tasks',
    GET_TASK_BY_ID: '/api/tasks/:id',
    CREATE_TASK: '/api/tasks',
    UPDATE_TASK: '/api/tasks/:id',
    DELETE_TASK: '/api/tasks/:id',
    UPDATE_TASK_STATUS: '/api/tasks/:id/status',
    UPDATE_TASK_ASSIGNEE: '/api/tasks/:id/assignee',
    UPDATE_TASK_CHECKLIST: '/api/tasks/:id/todo',
  },
  PROJECTS: {
    LIST: '/api/projects',
    GET_BY_ID: '/api/projects/:id',
    CREATE: '/api/projects',
    UPDATE: '/api/projects/:id',
    DELETE: '/api/projects/:id',
  },
  GOALS: {
    LIST: '/api/goals',
    GET_BY_ID: '/api/goals/:id',
    CREATE: '/api/goals',
    UPDATE: '/api/goals/:id',
    DELETE: '/api/goals/:id',
    LINK_PROJECT: '/api/goals/:id/link-project',
    UNLINK_PROJECT: '/api/goals/:id/unlink-project',
  },
  DEPENDENCIES: {
    LIST: '/api/dependencies',
    ANALYSIS: '/api/dependencies/analysis',
    CREATE: '/api/dependencies',
    DELETE: '/api/dependencies/:id',
  },
  WORKOS: {
    ORG_SUMMARY: '/api/workos/orgs/:id/summary',
    PROJECT_SUMMARY: '/api/workos/projects/:id/summary',
    USER_SUMMARY: '/api/workos/users/:id/summary',
  },
  AUTOMATION: {
    LIST_RULES: '/api/automation/rules',
    CREATE_RULE: '/api/automation/rules',
    UPDATE_RULE: '/api/automation/rules/:id',
    DELETE_RULE: '/api/automation/rules/:id',
    DAILY_SUMMARY_JOB: '/api/automation/jobs/daily-summary',
  },
  REPORTS: {
    SUMMARY: '/api/reports/summary',
    Export_TASKS_REPORT: '/api/reports/export-tasks',
    Export_USERS_REPORT: '/api/reports/export-users',
    Export_PROJECTS_REPORT: '/api/reports/export-projects',
    Export_GOALS_REPORT: '/api/reports/export-goals',
  },
  UPLOADS: {
    UPLOAD_IMAGE: '/api/auth/upload-image',
  },
  ORG_MEMBERSHIP: {
    MY_ORGS: '/api/org-membership/my-orgs',
    LEAVE_ORG: '/api/org-membership/:orgId/leave',
    INVITE: '/api/org-membership/:orgId/invite',
    JOIN: '/api/org-membership/join',
    GET_MEMBERS: '/api/org-membership/:orgId/members',
    UPDATE_ROLE: '/api/org-membership/:orgId/members/:memberId/role',
    REMOVE_MEMBER: '/api/org-membership/:orgId/members/:memberId',
  },
  ORGS: {
    CREATE: '/api/orgs',
    GET_BY_ID: '/api/orgs/:orgId',
    UPDATE: '/api/orgs/:orgId',
    DELETE: '/api/orgs/:orgId',
    ADD_MEMBER: '/api/orgs/:orgId/add-member',
    CHECK_USER: '/api/orgs/check-user/:email',
  },
};
