# Cadence - Project Management Application

## Full Documentation & Professional Improvement Roadmap

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Architecture](#architecture)
4. [Current Functionalities](#current-functionalities)
5. [Existing Bugs & Issues](#existing-bugs--issues)
6. [Professional Improvement Roadmap](#professional-improvement-roadmap)

---

## Project Overview

**Cadence** is a full-stack, multi-tenant project and task management application built for companies to manage their projects, tasks, goals (OKRs), team members, and organizational workflows. It features an AI-powered insights engine (WorkOS), automation rules, dependency tracking, and role-based access control across multiple organizations.

---

## Tech Stack

### Frontend (Client)
| Technology | Purpose |
|---|---|
| React 19 | UI framework |
| TypeScript 6 | Type safety |
| Vite 7 | Build tool |
| React Router DOM 7 | Client-side routing |
| Axios 1.11 | HTTP client |
| Tailwind CSS 3.4 | Utility-first CSS |
| @dnd-kit | Drag-and-drop (Kanban) |
| Recharts 3.8 | Data visualization |
| Lucide React | Icons |

### Backend (Server)
| Technology | Purpose |
|---|---|
| Express 5 | HTTP framework |
| TypeScript 6 | Type safety |
| Mongoose 8.16 | MongoDB ODM |
| MongoDB 6 | Database |
| JWT (jsonwebtoken) | Authentication |
| bcrypt / bcryptjs | Password hashing |
| Multer 2 | File uploads |
| ExcelJS 3.4 | Report generation |
| Vercel AI SDK | AI provider integration |
| ioredis / BullMQ | Infrastructure (prepared, unused) |
| Zod | Validation (unused) |

---

## Architecture

```
client/                          server/
  src/                             controllers/   (11 controllers)
    pages/     (16 page comps)     models/        (17 models)
    components/ (10 components)    routes/        (11 route groups)
    context/    (1 - UserContext)   middleware/    (auth, upload)
    utils/      (5 utility files)  services/      (5 services)
    types/      (1 type file)      utils/         (3 utility files)
    constants/  (2 constant files) infra/         (redis - unused)
                                   config/        (db, env loader)
                                   scripts/       (seed)
```

### Multi-Tenancy Model
- Data is scoped to **Organizations** via `orgId` on all models
- Users belong to multiple orgs via the `OrgMembership` join table
- Active org is resolved from `x-org-id` HTTP header
- Two-tier role system: User-level (`Admin`/`Member`) and Org-level (`OrgAdmin`/`OrgMember`)

### Authentication Flow
1. User registers/logs in -> receives JWT (7-day expiry) + activeOrgId
2. Token stored in localStorage, attached as `Authorization: Bearer` header
3. Org ID attached as `x-org-id` header
4. Middleware resolves user + org membership on every request
5. 401 triggers token cleanup + redirect to login

---

## Current Functionalities

### Authentication & User Management
- User registration with optional org invite token (URL query param `?invite=`)
- Admin invite token support for creating admin accounts
- Password strength meter with real-time feedback (Weak/Fair/Good/Strong)
- Login with email/password
- Profile management: update name, email, password
- Profile image upload (JPG, PNG, GIF, max 5MB)
- JWT-based session with 7-day expiry
- Auto-redirect to appropriate dashboard based on role

### Organization Management
- Create organizations with plan tier (Free/Pro/Enterprise)
- Invite members via email with token-based invite links
- Add existing users directly to organizations
- Switch between organizations via OrgSwitcher dropdown
- Leave organizations (with safeguards: can't leave if last member/admin)
- Role management: assign OrgAdmin or OrgMember roles
- Remove members from organizations

### Task Management
- **CRUD operations**: Create, read, update, delete tasks
- **Task fields**: title, description, priority (Low/Medium/High/Critical), status (Pending/In Progress/In Review/Completed), due date, assignee, project, goal links, tags, category, impact score (0-10), effort hours, collaborators, blockers
- **Checklist/Todo management**: Add, toggle, delete checklist items with auto-progress calculation
- **Drag-and-drop Kanban board**: 4 columns (Pending, In Progress, In Review, Completed) using @dnd-kit
- **Drag-and-drop reassignment**: Drag tasks onto user cards to reassign
- **Status flow**: Visual stepper on task detail page
- **Progress tracking**: Range slider (0-100%) with auto-status updates
- **Board and List views**: Toggle between Kanban board and table/list layout
- **Filtering**: By status, project, search text
- **Sorting**: By due date, priority, status, assignee
- **Overdue detection**: Automatic highlighting of overdue tasks
- **Due date presets**: Today, Tomorrow, This Week, Next Week, In 2 Weeks

### Project Management
- Create projects with name, description, status (Planned/Active/Paused/Completed/Archived)
- List projects as card grid
- Filter projects by name/description and status
- View tasks scoped to a project
- Delete projects with automatic task unlinking

### Goal/OKR Management
- Create goals with title, objective, metric name, target value, current value
- Timeframe options: Weekly, Monthly, Quarterly, Yearly, Custom
- Goal preview: "Achieve [metric] = [target] within [timeframe]"
- View goal details with progress bar
- Link/unlink projects to goals
- View linked projects and tasks per goal
- Filter goals by title/objective/metric and timeframe

### Task Dependencies
- Create dependencies between tasks (Finish-Start, Start-Start, Finish-Finish types)
- Add lag hours between dependent tasks
- View "Blocked By" and "Blocking" relationships on task detail
- Dependency graph analysis:
  - Cycle detection (DFS-based)
  - Blocked task identification
  - Critical path analysis (longest path by effort hours)
  - Bottleneck detection (tasks blocking the most dependents)

### WorkOS - AI-Powered Insights
- **Org-level summary**: Computed analytics cached for 60 seconds via InsightSnapshot
- **Priority scoring**: Combines urgency (due date), impact score, strategic alignment (goal count), and delay tolerance
- **Risk assessment**: Based on overdue tasks, blocked tasks, dependency health
- **Health status**: on_track / at_risk / delayed / critical
- **Capacity utilization**: Effort in next 7 days vs. weekly capacity
- **4 tabs**: Overview (actions, risks, workload), Actions (top priorities, blocked tasks), Schedule (deep-work blocks), Insights (automations, goal alignment, critical path)
- **WorkOS for users**: Personal work insights with weekly activity, urgent tasks, completion rate

### Dashboards
- **Admin dashboard**: Status/priority distribution charts, needs attention section (urgent/overdue), recent tasks, KPIs
- **User dashboard**: Personal task status/priority charts, needs attention, recent tasks, task status breakdown sidebar

### Automation Rules
- Define automation rules with:
  - **Triggers**: task_created, task_completed, task_status_changed, daily_summary
  - **Conditions**: status, priority, projectId, tagIncludes
  - **Actions**: notify (placeholder), create_dependent_task, generate_org_snapshot
- Daily summary job endpoint
- CRUD for automation rules (admin only)

### Reports & Export
- **Report summary**: Total tasks/projects/goals/members, tasks by status, overdue count, completion rate
- **Excel exports**: Tasks, Users, Projects, Goals - all as .xlsx files
- **Filters**: Date range, status, priority

### Team Member Management
- Grid and list view modes
- Workload classification: Idle (0), Light (1-3), Moderate (4-7), Heavy (8-12), Overloaded (13+)
- Workload bar visualization
- Completion rate bar
- Invite workflow: email lookup, direct add or invite link generation
- Role assignment (OrgAdmin/OrgMember)
- Remove members

### UI/UX
- Dark theme throughout (custom color palette)
- Responsive design (mobile sidebar drawer, desktop collapsible sidebar)
- Error boundary with recovery options
- Loading spinners
- Filter toolbar (reusable)
- PageShell layout component
- OrgSwitcher dropdown
- Password strength visual feedback
- Overdue task highlighting

---

## Existing Bugs & Issues

### Critical Security Issues

1. **`.env` committed to git** - Contains actual API keys (`sk-or-v1-...`) and admin invite token (`112233`). Even though `.gitignore` lists `.env`, it was committed before `.gitignore` was added.

2. **Hardcoded JWT secret fallback** - `jwtUtils.ts` falls back to `"your-super-secret-jwt-key-change-in-production"` if `JWT_SECRET` is missing from environment.

3. **`/api/auth/upload-image` has no auth middleware** - Anyone can upload images without authentication.

4. **No rate limiting** on any endpoint - Login, registration, and all API endpoints are vulnerable to brute force attacks.

5. **No input validation** - Zod is listed as a dependency but never imported or used. All validation is manual/ad-hoc.

6. **No CSRF protection** or **helmet** (security headers) middleware.

7. **Debug endpoint exposed in production** - `GET /test-jwt` should not exist in production.

### Bugs

8. **Attachment typo** - ~~`createTask` controller destructures `attachements`~~ **Fixed.** Attachments are now structured objects with upload/delete endpoints and UI preview.

9. **Double bcrypt libraries** - Both `bcrypt` (native) and `bcryptjs` (pure JS) are dependencies, used inconsistently across controllers.

10. **`ViewTaskDetails` uses wrong role check** - Uses `user?.role === 'Admin'` (system role) instead of `getEffectiveRole() === 'OrgAdmin'` (org role) for dependency management UI.

11. **Missing `orgAdminOnly` middleware on routes** - Several routes (`PUT/DELETE /api/orgs`, `POST /api/orgs/:id/add-member`, `POST /api/org-membership/:id/invite`, `PUT/DELETE membership role`) check admin in the handler but not on the route itself.

12. **No task deletion cascade for dependencies** - Deleting a task leaves dangling references in the Dependency model.

13. **`updateTask` and `updateTaskCheckList` don't trigger automations** - Only `createTask` and `updateTaskStatus` do.

14. **`checkUserExists` doesn't verify org membership** - Any authenticated user can check any email.

15. **Error boundary uses light theme** - Inconsistent with the rest of the dark-themed app.

16. **`LoadingSpinner` text color** hardcoded to `text-gray-600`, may be invisible on dark theme.

### Missing Features (Dead Code)

17. **6 unused models**: Sprint, Milestone, KeyResult, AIRecommendation, AIWorkflowRun, KnowledgeChunk - defined but never used in any controller or route.

18. **Unused dependencies**: `ai`, `@ai-sdk/openai`, `@ai-sdk/google`, `zod`, `bullmq` - listed but never imported.

19. **Empty `StatCard.tsx`** and **empty `hooks/` directory** - Structural placeholders never implemented.

20. **`react-ga4`** in client dependencies but never used.

21. **No task edit page** - Tasks can be created but not edited (title, description, priority, assignee, due date).

22. **No project edit/update UI** - Projects can be created but not modified from the client.

23. **No goal edit/update UI** - Goals can be created but not modified from the client.

24. **No 404 page** - Catch-all route redirects without showing a "not found" view.

25. **No pagination** on any list endpoint.

26. **No search functionality** on server endpoints.

27. **No tests** - Test script is `echo "Error: no test specified" && exit 1`.

---

## Professional Improvement Roadmap

The following improvements would transform Cadence from a solid foundation into a fully-featured, enterprise-ready project management platform capable of managing all of a company's projects and tasks.

---

### Phase 1: Fix Critical Issues & Secure the Application

#### 1.1 Security Hardening
- [ ] **Rotate all secrets** - Generate new JWT_SECRET, ADMIN_INVITE_TOKEN, and API keys. Remove `.env` from git history using `git filter-branch` or BFG.
- [ ] **Add helmet middleware** for security headers (CSP, HSTS, X-Frame-Options, etc.)
- [ ] **Add rate limiting** using `express-rate-limit` - separate limits for auth endpoints (5 req/15min) and general API (100 req/15min)
- [ ] **Add auth middleware to `/api/auth/upload-image`** - Protect the file upload endpoint
- [ ] **Add `orgAdminOnly` middleware** to all routes that currently only check in handlers
- [ ] **Add CORS origin validation** with proper whitelist for production domains
- [ ] **Implement CSRF protection** for state-changing operations
- [ ] **Add request logging** with `morgan` for audit trail
- [ ] **Remove `/test-jwt` debug endpoint** from production builds

#### 1.2 Input Validation with Zod
- [ ] Implement Zod schemas for all request bodies (auth, tasks, projects, goals, orgs)
- [ ] Add validation middleware that runs Zod schemas before controllers
- [ ] Return structured validation error responses with field-level messages
- [ ] Add query parameter validation for list/filter endpoints

#### 1.3 Bug Fixes
- [x] Fix `attachements` typo in `createTask` controller - ensure attachments are saved correctly
- [ ] Fix `ViewTaskDetails` role check to use `getEffectiveRole()` instead of `user.role`
- [ ] Add dependency cleanup on task deletion (cascade or soft-delete references)
- [ ] Trigger automations on `updateTask` and `updateTaskCheckList` when status changes
- [ ] Standardize on a single bcrypt library (recommend `bcryptjs` for portability)
- [ ] Fix `checkUserExists` to verify org membership before returning user data
- [ ] Fix ErrorBoundary styling to match dark theme
- [ ] Fix `LoadingSpinner` text color for dark theme

---

### Phase 2: Complete Core CRUD & Missing UI

#### 2.1 Task Edit Page
- [ ] Create `EditTask` page with all task fields editable
- [ ] Pre-populate form from existing task data
- [ ] Support editing: title, description, priority, status, due date, assignee, project, goals, tags, category, impact score, effort hours, collaborators, blockers, checklist
- [ ] Add confirmation dialog for critical changes (e.g., reassigning, changing priority)

#### 2.2 Project Edit/Update
- [ ] Create `EditProject` page
- [ ] Edit name, description, status, dates, owner
- [ ] Show project statistics (task count, completion rate, overdue count)

#### 2.3 Goal Edit/Update
- [ ] Create `EditGoal` page
- [ ] Edit title, objective, metric, target/current values, timeframe, dates
- [ ] Add UI for linking/unlinking projects to goals (endpoint exists, UI missing)
- [ ] Show goal progress with linked task completion data

#### 2.4 404 Page
- [ ] Create a styled "Page Not Found" component
- [ ] Add navigation options back to dashboard

#### 2.5 Pagination
- [ ] Add pagination to all list endpoints (tasks, projects, goals, users, dependencies)
- [ ] Implement cursor-based or offset pagination with page/limit query params
- [ ] Add pagination controls to client list views
- [ ] Show total count and page info

#### 2.6 Server-Side Search
- [ ] Add text search endpoints using MongoDB text indexes
- [ ] Task search by title, description, tags, category
- [ ] User search by name, email
- [ ] Project/Goal search by name, title, objective

---

### Phase 3: Enterprise Multi-Tenancy & Authorization

#### 3.1 Advanced Role-Based Access Control (RBAC)
- [ ] Define granular permissions (e.g., `task:create`, `task:delete`, `project:manage`, `report:view`, `org:manage`)
- [ ] Create a permissions matrix for roles (Owner, Admin, Manager, Member, Viewer)
- [ ] Implement permission-checking middleware: `requirePermission('task:create')`
- [ ] Add role/permission management UI for org admins
- [ ] Support custom roles with configurable permission sets

#### 3.2 Team & Department Management
- [ ] Add Team/Department model (name, description, lead, members)
- [ ] Assign tasks and projects to teams
- [ ] Team-level dashboard and reporting
- [ ] Department hierarchy support

#### 3.3 Workspace Templates
- [ ] Pre-configured workspace templates for common use cases (Software Dev, Marketing, HR, etc.)
- [ ] Template includes default projects, task categories, statuses, automation rules
- [ ] "Create from Template" option when creating new organizations

#### 3.4 Audit Log
- [ ] Create AuditLog model (actor, action, target, timestamp, metadata)
- [ ] Record all significant actions (task created/updated/deleted, user added/removed, role changed, etc.)
- [ ] Audit log viewer for admins with filtering by action, user, date range
- [ ] Export audit logs as CSV/Excel

---

### Phase 4: Advanced Task Management

#### 4.1 Task Comments & Activity Feed
- [x] Create Comment model (taskId, userId, content, mentions, createdAt)
- [x] Add comment thread to task detail page
- [x] @mention users in comments with autocomplete
- [x] Activity feed showing all task changes (status, assignee, priority, etc.)

#### 4.2 Task Attachments (File Management)
- [x] Fix current attachment system (currently broken due to typo)
- [x] Support multiple file attachments per task
- [x] File preview for images, PDFs
- [x] File size limits and type validation
- [x] Cloud storage integration (S3/GCS) for production

#### 4.3 Task Templates & Recurring Tasks
- [x] Save task as template (title, description, checklist, tags, category)
- [x] Create task from template
- [x] Recurring task scheduling (daily, weekly, monthly)
- [x] Automatic task generation based on recurrence rules

#### 4.4 Time Tracking
- [x] Create TimeEntry model (taskId, userId, startTime, endTime, description)
- [x] Timer start/stop on tasks
- [x] Manual time entry
- [x] Time reports per task, project, user
- [x] Billable vs. non-billable time

#### 4.5 Subtasks / Task Breakdown
- [x] Support parent-child task relationships
- [x] Nested task list in task detail view
- [x] Progress rollup from subtasks to parent
- [x] Drag-and-drop subtask reordering

#### 4.6 Custom Task Fields
- [x] Allow org admins to define custom fields (text, number, date, select, multi-select)
- [x] Custom field definitions stored per org
- [x] Custom fields appear in task forms and detail views
- [x] Filter and sort by custom fields

---

### Phase 5: Enhanced Project & Goal Management

#### 5.1 Gantt Chart View
- [x] Add Gantt chart component for projects/tasks with dependencies
- [x] Timeline view showing task durations and dependencies
- [x] Drag to adjust dates and dependencies
- [x] Milestone markers on timeline

#### 5.2 Sprints / Iterations (Activate Sprint Model)
- [x] Implement Sprint CRUD (model exists but is unused)
- [x] Sprint planning: assign tasks to sprints
- [x] Sprint board view (filtered Kanban)
- [x] Sprint velocity tracking
- [x] Sprint retrospective notes

#### 5.3 Milestones (Activate Milestone Model)
- [x] Implement Milestone CRUD (model exists but is unused)
- [x] Link milestones to tasks and projects
- [x] Milestone progress tracking
- [x] Milestone timeline view

#### 5.4 Key Results (Activate KeyResult Model)
- [x] Implement Key Result CRUD (model exists but is unused)
- [x] Link key results to goals
- [x] Automatic progress calculation from linked projects/tasks
- [x] OKR alignment visualization (goal -> key results -> projects -> tasks)

#### 5.5 Resource Management
- [x] Resource allocation view (who's working on what, when)
- [x] Capacity planning per team member
- [x] Workload balancing recommendations
- [x] Resource conflict detection

---

### Phase 6: Communication & Collaboration

#### 6.1 Notifications System
- [ ] Create Notification model (userId, type, title, message, read, link, createdAt)
- [ ] In-app notification center with badge count
- [ ] Notification preferences per user (email, in-app, both)
- [ ] Trigger notifications on: task assignment, mention, status change, due date approaching, comment added
- [ ] Mark as read/unread, bulk mark all as read

#### 6.2 Email Notifications
- [ ] Set up email service (Nodemailer + SMTP or SendGrid/Resend)
- [ ] Email templates for key events (welcome, task assigned, due date reminder, mentioned in comment)
- [ ] Digest emails (daily/weekly summary of activity)
- [ ] Email notification preferences

#### 6.3 Real-Time Updates
- [ ] Add Socket.io or Server-Sent Events for real-time updates
- [ ] Live task board updates when other users make changes
- [ ] Real-time notification delivery
- [ ] Presence indicators (who's viewing what)

#### 6.4 @Mentions in Tasks & Comments
- [ ] Parse @mentions in task descriptions and comments
- [ ] Autocomplete user names when typing @
- [ ] Send notification to mentioned users
- [ ] Mentioned users highlighted in text

---

### Phase 7: Reporting & Analytics

#### 7.1 Advanced Reports
- [ ] Custom report builder (select metrics, filters, groupings)
- [ ] Sprint velocity reports
- [ ] Burndown/burnup charts
- [ ] Cumulative flow diagrams
- [ ] Team performance reports
- [ ] Time tracking reports
- [ ] Scheduled report generation and email delivery

#### 7.2 Analytics Dashboard
- [ ] Trend analysis (tasks completed over time)
- [ ] Predictive completion estimates
- [ ] Team productivity metrics
- [ ] Project health scores
- [ ] Custom KPI tracking

#### 7.3 Data Visualization
- [ ] Pie charts for status/priority distribution
- [ ] Line charts for trend analysis
- [ ] Heatmaps for workload distribution
- [ ] Dependency graph visualization (interactive)

---

### Phase 8: AI & Automation (Activate Unused Infrastructure)

#### 8.1 AI-Powered Features (Activate Vercel AI SDK)
- [ ] **Smart task prioritization** - AI suggests priority based on context, deadlines, dependencies
- [ ] **Task auto-categorization** - AI suggests tags/categories based on description
- [ ] **Meeting notes summarizer** - Summarize pasted meeting notes into action items
- [ ] **Smart scheduling** - AI suggests optimal task scheduling based on capacity and deadlines
- [ ] **Risk prediction** - AI predicts which tasks are at risk of missing deadlines
- [ ] **Natural language task creation** - "Create a task to review the Q3 budget by Friday, assign to Sarah"
- [ ] **Automated status updates** - AI generates status updates based on task activity

#### 8.2 Advanced Automation (Activate BullMQ + Redis)
- [ ] **Job queue** for async operations (email sending, report generation, AI processing)
- [ ] **Workflow automation builder** - Visual rule builder with complex conditions
- [ ] **Webhook support** - Send/receive webhooks on events
- [ ] **Zapier/Make integration** via webhooks
- [ ] **Scheduled jobs** - Cron-like scheduling for recurring tasks, reports, cleanups
- [ ] **Conditional automation chains** - Chain multiple actions with if/then logic

#### 8.3 Knowledge Base (Activate KnowledgeChunk Model)
- [ ] Index project documents, decisions, meeting notes
- [ ] Full-text search across organizational knowledge
- [ ] RAG-powered Q&A: "What was decided about the Q4 roadmap?"
- [ ] Automatic knowledge extraction from task updates and comments

---

### Phase 9: Enterprise Features

#### 9.1 SSO / SAML Authentication
- [ ] Support SAML 2.0 for enterprise SSO (Okta, Azure AD, Google Workspace)
- [ ] OIDC support
- [ ] Just-in-time user provisioning from SSO
- [ ] SCIM for user lifecycle management

#### 9.2 Billing & Subscription Management
- [ ] Stripe integration for plan management
- [ ] Usage-based billing (per user, per feature)
- [ ] Invoices and payment history
- [ ] Plan upgrade/downgrade flows
- [ ] Feature gating based on plan (Free/Pro/Enterprise)

#### 9.3 API Keys & External Integrations
- [ ] API key management for org-level access
- [ ] REST API documentation (OpenAPI/Swagger)
- [ ] GitHub/GitLab integration (link PRs/MRs to tasks)
- [ ] Slack integration (notifications, task creation)
- [ ] Jira import/migration tool
- [ ] Calendar sync (Google Calendar, Outlook)

#### 9.4 Custom Branding
- [ ] Custom logo and color scheme per organization
- [ ] White-label support for Enterprise plans
- [ ] Custom domain support

#### 9.5 Data Export & Compliance
- [ ] Full data export (GDPR compliance)
- [ ] Data retention policies
- [ ] Two-factor authentication (2FA)
- [ ] IP allowlisting
- [ ] Session management (view active sessions, revoke)

---

### Phase 10: Code Quality & Infrastructure

#### 10.1 Testing
- [ ] **Unit tests** for services (automationRunner, dependencyEngine, workosScoring, workosSummary)
- [ ] **Integration tests** for API endpoints (auth, tasks, projects, goals, orgs)
- [ ] **E2E tests** with Playwright or Cypress (critical user flows)
- [ ] **Load testing** with k6 or Artillery
- [ ] Set up CI/CD pipeline with test gates

#### 10.2 Code Quality
- [ ] Remove all unused models, dependencies, and dead code
- [ ] Consistent error handling patterns across all controllers
- [ ] Proper TypeScript types (eliminate `any` types)
- [ ] Split large components (ManageUsers is 859 lines)
- [ ] Create custom hooks for reusable logic
- [ ] Add JSDoc comments for public APIs

#### 10.3 Performance Optimization
- [ ] Add MongoDB indexes for frequently queried fields (compound indexes)
- [ ] Implement query result caching with Redis (for dashboards, reports)
- [ ] Add N+1 query fixes (batch user lookups in task lists)
- [ ] Implement request debouncing on client
- [ ] Add virtual scrolling for large lists
- [ ] Optimize bundle size (code splitting, lazy loading)

#### 10.4 DevOps & Deployment
- [ ] Set up CI/CD pipeline (GitHub Actions)
- [ ] Environment-based configuration (dev, staging, production)
- [ ] Database migrations system
- [ ] Health check endpoint (`/health` with DB status)
- [ ] Graceful shutdown handling
- [ ] Docker multi-stage build optimization
- [ ] Kubernetes deployment manifests
- [ ] Monitoring with Prometheus/Grafana
- [ ] Error tracking with Sentry
- [ ] Log aggregation (ELK stack or similar)

#### 10.5 API Design
- [ ] RESTful API versioning (`/api/v1/...`)
- [ ] Consistent response format (`{ success, data, error, pagination }`)
- [ ] API documentation with OpenAPI/Swagger
- [ ] GraphQL endpoint as alternative for complex queries
- [ ] WebSocket API for real-time features

---

### Summary: Priority Order

| Priority | Phase | Impact |
|---|---|---|
| **P0** | Phase 1 - Security & Bug Fixes | Critical - production readiness |
| **P0** | Phase 2 - Complete Core CRUD | High - basic functionality gaps |
| **P1** | Phase 3 - Enterprise RBAC | High - access control for companies |
| **P1** | Phase 4 - Advanced Task Features | High - core product differentiation |
| **P2** | Phase 5 - Enhanced Project/Goal Mgmt | Medium - OKR and planning features |
| **P2** | Phase 6 - Communication & Collab | Medium - team coordination |
| **P2** | Phase 7 - Reporting & Analytics | Medium - data-driven decisions |
| **P3** | Phase 8 - AI & Automation | Medium - competitive advantage |
| **P3** | Phase 9 - Enterprise Features | Low - market expansion |
| **P3** | Phase 10 - Code Quality & Infra | Low - long-term sustainability |
