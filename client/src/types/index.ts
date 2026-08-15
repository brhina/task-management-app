export type UserRole = 'Admin' | 'Member';

export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export type TaskStatus = 'Pending' | 'In Progress' | 'In Review' | 'Completed';

export type OrgRole = 'Owner' | 'OrgAdmin' | 'Manager' | 'OrgMember' | 'Viewer' | 'Custom';

export interface OrgMembership {
  _id: string;
  name: string;
  slug: string;
  plan?: string;
  billingCycle?: string;
  membershipId: string;
  role: OrgRole;
  customRoleId?: string | null;
  customRoleName?: string | null;
  capacityHoursPerWeek?: number;
  joinedAt?: string;
  orgId?: string;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  profileImageUrl?: string;
  activeOrgId?: string;
  orgs?: OrgMembership[];
  createdAt?: string;
  updatedAt?: string;
  pendingTasks?: number;
  inProgressTasks?: number;
  completedTasks?: number;
}

export interface UserWithToken extends User {
  token: string;
}

export interface TodoItem {
  text: string;
  isCompleted: boolean;
}

export interface TaskAttachment {
  _id: string;
  url: string;
  name: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  uploadedAt: string;
}

export interface TaskRecurrence {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number;
  nextRunAt: string;
  endDate?: string;
}

export interface Task {
  _id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
  startDate?: string;
  assignedTo?: User | string | null;
  createdBy: string;
  projectId?: string | { _id: string; name?: string };
  goalIds?: string[];
  tags?: string[];
  category?: string;
  impactScore?: number;
  effortHours?: number;
  collaborators?: string[];
  blockersText?: string[];
  attachments: (string | TaskAttachment)[];
  todoCheckList: TodoItem[];
  progress: number;
  parentTaskId?: string | { _id?: string; title?: string; status?: string; priority?: string } | null;
  sortOrder?: number;
  sprintId?: string;
  recurrence?: TaskRecurrence | null;
  completedCount?: number;
  totalCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskComment {
  _id: string;
  content: string;
  userId: User | string;
  mentions?: User[];
  createdAt: string;
}

export interface TaskActivityItem {
  _id: string;
  action: string;
  field?: string;
  from?: string;
  to?: string;
  actorId: User | string;
  createdAt: string;
}

export interface TimeEntry {
  _id: string;
  taskId: string | Task;
  userId: User | string;
  startTime: string;
  endTime?: string;
  description?: string;
  billable: boolean;
  running: boolean;
}

export interface TaskTemplate {
  _id: string;
  name: string;
  title: string;
  description: string;
  priority: TaskPriority;
  tags?: string[];
  category?: string;
  impactScore?: number;
  effortHours?: number;
  checklist: TodoItem[];
}


export interface Sprint {
  _id: string;
  projectId: string;
  name: string;
  startDate: string;
  endDate: string;
  capacityHours?: number;
  status: 'Planned' | 'Active' | 'Completed' | 'Cancelled';
  retrospectiveNotes?: string;
}

export interface Milestone {
  _id: string;
  projectId: string;
  title: string;
  description?: string;
  targetDate: string;
  status: 'Planned' | 'In Progress' | 'Completed' | 'At Risk';
  taskIds?: string[];
  progress?: number;
}

export type KeyResultUnit = 'percentage' | 'currency' | 'number' | 'boolean';
export type KeyResultStatus = 'Not Started' | 'In Progress' | 'Completed' | 'At Risk';

export interface KeyResult {
  _id: string;
  objectiveId: string;
  title: string;
  metric?: string;
  unit?: KeyResultUnit;
  status?: KeyResultStatus;
  startValue?: number;
  targetValue?: number;
  currentValue?: number;
  ownerId?: string | User;
  linkedProjectIds?: string[];
  linkedTaskIds?: string[];
  progressPercent?: number;
}

export interface StatusSummary {
  all: number;
  pending: number;
  inProgress: number;
  inReview: number;
  completed: number;
}

export interface DashboardData {
  statistics: {
    allTasks: number;
    pendingTasks: number;
    inProgressTasks: number;
    inReviewTasks: number;
    completedTasks: number;
    overdueTasks: number;
  };
  charts: {
    taskDistribution: {
      pending: number;
      in_progress: number;
      in_review: number;
      completed: number;
      all: number;
    };
    taskPriorityLevels: {
      high: number;
      medium: number;
      low: number;
      critical?: number;
    };
  };
  recentTasks: Task[];
  recentCompletedTasks: Task[];
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface SignUpFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  profileImageUrl?: string;
  adminInviteToken?: string;
  orgInviteToken?: string;
  workspaceName?: string;
  plan?: 'Free' | 'Pro' | 'Enterprise';
}

export interface TaskFormData {
  title: string;
  description: string;
  priority: TaskPriority;
  dueDate: string;
  assignedTo?: string | null;
  attachments: string[];
}

export interface ProfileFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface PasswordStrength {
  score: number;
  feedback: string[];
}

export interface PasswordStrengthLabel {
  label: string;
  color: string;
  bgColor: string;
}

export interface FilterOption {
  value: string;
  label: string;
}

export interface Filter {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
}

export interface OrgBranding {
  logoUrl?: string;
  primaryColor?: string;
  accentColor?: string;
  customTitle?: string;
  customFavicon?: string;
  whiteLabelEnabled?: boolean;
}

export interface UserContextType {
  user: User | null;
  loading: boolean;
  activeOrgBranding?: OrgBranding | null;
  activePlan?: string | null;
  currency?: string;
  updateUser: (
    userData: User & { token?: string; activeOrgId?: string; orgs?: OrgMembership[] }
  ) => void;
  clearUser: () => void;
  getEffectiveRole: () => OrgRole | null;
  permissions: string[];
  hasPermission: (permission: string) => boolean;
  canAccessAdminSuite: () => boolean;
  refreshOrgDetails: () => Promise<void>;
}

export type ProjectStatus = 'Planned' | 'Active' | 'Paused' | 'Completed' | 'Archived';

export interface ProjectMetrics {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  progressPercent: number;
  activeSprints: number;
  totalMilestones: number;
  completedMilestones: number;
}

export interface Project {
  _id: string;
  orgId: string;
  name: string;
  description?: string;
  ownerId: string | User;
  status: ProjectStatus;
  startDate?: string;
  targetDate?: string;
  metrics?: ProjectMetrics;
  createdAt: string;
  updatedAt: string;
}

export type GoalTimeframe = 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly' | 'Custom';
export type GoalStatus =
  | 'Not Started'
  | 'In Progress'
  | 'On Track'
  | 'At Risk'
  | 'Behind'
  | 'Completed'
  | 'Closed';
export type GoalCategory = 'Company' | 'Team' | 'Individual';
export type GoalPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface Goal {
  _id: string;
  orgId: string;
  title: string;
  objective?: string;
  metric?: string;
  targetValue?: number;
  currentValue?: number;
  ownerId: string | User;
  timeframe: GoalTimeframe;
  status: GoalStatus;
  category: GoalCategory;
  priority: GoalPriority;
  startDate?: string;
  endDate?: string;
  keyResultsCount?: number;
  progressPercent?: number;
  createdAt: string;
  updatedAt: string;
}
