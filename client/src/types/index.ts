export type UserRole = 'Admin' | 'Member';

export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export type TaskStatus = 'Pending' | 'In Progress' | 'In Review' | 'Completed';

export type OrgRole = 'OrgAdmin' | 'OrgMember';

export interface OrgMembership {
  _id: string;
  name: string;
  slug: string;
  plan?: string;
  membershipId: string;
  role: OrgRole;
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

export interface Task {
  _id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
  assignedTo: User | string;
  createdBy: string;
  projectId?: string | { _id: string; name?: string };
  goalIds?: string[];
  tags?: string[];
  category?: string;
  impactScore?: number;
  effortHours?: number;
  collaborators?: string[];
  attachments: string[];
  todoCheckList: TodoItem[];
  progress: number;
  completedCount?: number;
  totalCount?: number;
  createdAt: string;
  updatedAt: string;
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
  profileImageUrl: string;
  adminInviteToken: string;
  orgInviteToken: string;
}

export interface TaskFormData {
  title: string;
  description: string;
  priority: TaskPriority;
  dueDate: string;
  assignedTo: string;
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

export interface UserContextType {
  user: User | null;
  loading: boolean;
  updateUser: (
    userData: User & { token?: string; activeOrgId?: string; orgs?: OrgMembership[] }
  ) => void;
  clearUser: () => void;
  getEffectiveRole: () => 'OrgAdmin' | 'OrgMember' | null;
}

export type ProjectStatus = 'Planned' | 'Active' | 'Paused' | 'Completed' | 'Archived';

export interface Project {
  _id: string;
  orgId: string;
  name: string;
  description?: string;
  ownerId: string;
  status: ProjectStatus;
  startDate?: string;
  targetDate?: string;
  createdAt: string;
  updatedAt: string;
}

export type GoalTimeframe = 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly' | 'Custom';

export interface Goal {
  _id: string;
  orgId: string;
  title: string;
  objective?: string;
  metric?: string;
  targetValue?: number;
  currentValue?: number;
  ownerId: string;
  timeframe: GoalTimeframe;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}
