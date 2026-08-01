import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardCheck,
  Users,
  BarChart3,
  ShieldCheck,
  Zap,
  CheckCircle2,
  ArrowRight,
  Shield,
  Layers,
  Lock,
  ChevronRight,
  Kanban
} from 'lucide-react';
import PublicLayout from '../../components/layouts/PublicLayout';

function Landing() {
  const [activeTab, setActiveTab] = useState<'kanban' | 'sprint' | 'roles' | 'analytics'>('kanban');

  const mainFeatures = [
    {
      icon: <ClipboardCheck className="w-6 h-6 text-primary" />,
      title: 'Advanced Task Board',
      description:
        'Manage tasks with Kanban views, customizable statuses, priority levels, and instant task assignments.',
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-primary" />,
      title: 'Admin Role Governance',
      description:
        'Registration is strictly role-controlled by Administrators. Invite team members with precise access rights.',
    },
    {
      icon: <Zap className="w-6 h-6 text-amber-500" />,
      title: 'Real-Time Sync & Sprints',
      description:
        'Collaborate synchronously across agile sprints, gantt timelines, and project milestones.',
    },
    {
      icon: <BarChart3 className="w-6 h-6 text-emerald-600" />,
      title: 'Executive Analytics',
      description:
        'Track velocity, team workload, goal completion rates, and comprehensive audit logs.',
    },
  ];

  const roleHighlights = [
    {
      role: 'System Administrator',
      badge: 'Admin Only Registration',
      color: 'bg-primary-light text-primary border-primary/30',
      description: 'Creates workspace, manages team members, configures custom permissions, and monitors audit logs.',
      perks: ['Register new workspace', 'Invite & manage users', 'Full role permissions', 'Audit trail access'],
    },
    {
      role: 'Project Manager',
      badge: 'Assigned Role',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      description: 'Plans project sprints, sets milestones, manages team workloads, and reviews task progress.',
      perks: ['Sprint planning', 'Gantt chart management', 'Resource allocation', 'Team analytics'],
    },
    {
      role: 'Team Member / Contributor',
      badge: 'Invited Member',
      color: 'bg-blue-50 text-blue-700 border-blue-200',
      description: 'Executes assigned tasks, updates checklists, logs time, and collaborates in real-time.',
      perks: ['Task execution', 'Checklist items', 'Comment threads', 'Personal dashboard'],
    },
  ];

  return (
    <PublicLayout>
      <div className="flex flex-col gap-6 sm:gap-8 pb-4">
        {/* Hero Section */}
        <section className="pt-2 pb-3 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary-light px-3 py-1 text-[11px] font-semibold text-primary shadow-2xs mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            <span>Role-Based Enterprise Security</span>
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-800 tracking-tight max-w-3xl mx-auto leading-tight">
            Organize Work.{' '}
            <span className="text-primary">
              Execute with Precision.
            </span>
          </h1>

          <p className="mt-2.5 text-sm sm:text-base text-slate-600 mb-4 max-w-xl mx-auto leading-relaxed font-normal">
            A high-performance task management system built with Admin-governed role access, agile sprints, and real-time collaboration.
          </p>

          <div className="flex flex-col sm:flex-row gap-2.5 justify-center max-w-md mx-auto">
            <Link
              to="/signup"
              className="inline-flex items-center justify-center gap-1.5 bg-primary hover:bg-primary-hover text-white font-semibold text-sm px-5 py-2.5 rounded-lg shadow transition-colors group"
            >
              <Shield className="w-4 h-4 text-white/90" />
              <span>Admin Registration</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              to="/login"
              className="btn-ghost inline-flex items-center justify-center gap-1.5 text-sm px-5 py-2.5 rounded-lg"
            >
              <span>Sign In to Workspace</span>
            </Link>
          </div>

          <div className="mt-3 text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
            <Lock className="w-3 h-3 text-slate-400" />
            <span>Public registration restricted to Administrators. Team members register via invitation link.</span>
          </div>

          {/* Interactive Feature Demo Mockup */}
          <div className="mt-5 max-w-4xl mx-auto rounded-xl border border-gray-200 bg-white shadow-card p-3 sm:p-4">
            {/* Tab navigation */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-2.5 mb-3">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setActiveTab('kanban')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    activeTab === 'kanban'
                      ? 'bg-primary text-white shadow-xs'
                      : 'bg-gray-100 text-slate-600 hover:bg-gray-200/70'
                  }`}
                >
                  <Kanban className="w-3.5 h-3.5" />
                  Task Kanban
                </button>
                <button
                  onClick={() => setActiveTab('sprint')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    activeTab === 'sprint'
                      ? 'bg-primary text-white shadow-xs'
                      : 'bg-gray-100 text-slate-600 hover:bg-gray-200/70'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  Sprint Planning
                </button>
                <button
                  onClick={() => setActiveTab('roles')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    activeTab === 'roles'
                      ? 'bg-primary text-white shadow-xs'
                      : 'bg-gray-100 text-slate-600 hover:bg-gray-200/70'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Admin & Roles
                </button>
                <button
                  onClick={() => setActiveTab('analytics')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    activeTab === 'analytics'
                      ? 'bg-primary text-white shadow-xs'
                      : 'bg-gray-100 text-slate-600 hover:bg-gray-200/70'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  Executive Analytics
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[11px] text-slate-500 font-medium">Live Workspace Preview</span>
              </div>
            </div>

            {/* Tab Preview Content */}
            <div className="bg-slate-50 rounded-lg p-3.5 text-left font-sans text-slate-800 border border-gray-200 min-h-[190px] flex flex-col justify-between shadow-2xs">
              {activeTab === 'kanban' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                    <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                      <Kanban className="w-3.5 h-3.5 text-primary" /> Task Workflow Board
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary-light text-primary font-semibold border border-primary/30">
                      Sprint 14 Active
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                    <div className="bg-white rounded-lg p-2.5 border border-gray-200 shadow-2xs">
                      <div className="text-[11px] font-bold text-slate-500 uppercase mb-1.5 flex justify-between">
                        <span>To Do</span>
                        <span className="text-slate-400">3</span>
                      </div>
                      <div className="bg-gray-50 p-2 rounded border border-gray-200 text-xs text-slate-700 space-y-1">
                        <div className="font-semibold text-slate-800 text-[11px]">Setup Admin Role Permissions</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                          <span className="px-1 py-0.2 rounded bg-rose-50 text-rose-600 font-semibold border border-rose-200">Critical</span>
                          <span>Admin Suite</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-2.5 border border-gray-200 shadow-2xs">
                      <div className="text-[11px] font-bold text-primary uppercase mb-1.5 flex justify-between">
                        <span>In Progress</span>
                        <span className="text-primary">2</span>
                      </div>
                      <div className="bg-primary-light/40 p-2 rounded border border-primary/30 text-xs text-slate-700 space-y-1">
                        <div className="font-semibold text-slate-800 text-[11px]">Role-Based Registration Enforcement</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                          <span className="px-1 py-0.2 rounded bg-amber-50 text-amber-600 font-semibold border border-amber-200">High</span>
                          <span>Auth Module</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-2.5 border border-gray-200 shadow-2xs">
                      <div className="text-[11px] font-bold text-emerald-600 uppercase mb-1.5 flex justify-between">
                        <span>Completed</span>
                        <span className="text-emerald-600">5</span>
                      </div>
                      <div className="bg-emerald-50/50 p-2 rounded border border-emerald-200 text-xs text-slate-700 space-y-1">
                        <div className="font-semibold text-slate-800 text-[11px]">Login & Dashboard Refresh</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                          <span className="px-1 py-0.2 rounded bg-emerald-100 text-emerald-700 font-semibold">Done</span>
                          <span>UI Polish</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'sprint' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                    <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-primary" /> Sprint Lifecycle & Gantt Timeline
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">Q3 Roadmap</span>
                  </div>
                  <div className="space-y-2.5 text-xs">
                    <div className="space-y-1">
                      <div className="flex justify-between text-slate-700 font-medium text-[11px]">
                        <span>Sprint 14: Core Auth & RBAC Security</span>
                        <span className="text-primary font-bold">85% Complete</span>
                      </div>
                      <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-primary h-full w-[85%]"></div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-slate-700 font-medium text-[11px]">
                        <span>Sprint 15: Analytics & Audit Log Export</span>
                        <span className="text-slate-500 font-bold">40% Planned</span>
                      </div>
                      <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-primary/60 h-full w-[40%]"></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'roles' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                    <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Role-Based Access Control Matrix
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary-light text-primary font-semibold border border-primary/30">
                      Admin Restricted Registration
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="bg-white p-2.5 rounded-lg border border-gray-200 shadow-2xs space-y-0.5">
                      <div className="text-primary font-bold flex items-center justify-between text-[11px]">
                        <span>Admin Key Registration</span>
                        <Lock className="w-3 h-3 text-primary" />
                      </div>
                      <p className="text-slate-600 text-[10px]">
                        Only users with valid Admin Keys can register a primary Administrator account.
                      </p>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-gray-200 shadow-2xs space-y-0.5">
                      <div className="text-emerald-600 font-bold flex items-center justify-between text-[11px]">
                        <span>Member Invitation Token</span>
                        <Users className="w-3 h-3 text-emerald-600" />
                      </div>
                      <p className="text-slate-600 text-[10px]">
                        Admins issue secure invitation links to onboarding team members with pre-assigned roles.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'analytics' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                    <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                      <BarChart3 className="w-3.5 h-3.5 text-emerald-600" /> Executive Productivity Metrics
                    </span>
                    <span className="text-[10px] text-emerald-600 font-bold">+24% Velocity</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-2xs">
                      <div className="text-base font-bold text-slate-800">98.4%</div>
                      <div className="text-[10px] text-slate-500">On-Time Delivery</div>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-2xs">
                      <div className="text-base font-bold text-primary">142</div>
                      <div className="text-[10px] text-slate-500">Tasks Completed</div>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-2xs">
                      <div className="text-base font-bold text-emerald-600">0</div>
                      <div className="text-[10px] text-slate-500">Security Violations</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-1.5 flex justify-between items-center text-[10px] text-slate-500 border-t border-gray-200 mt-1.5">
                <span>Cadence Platform Engine v2.4</span>
                <span className="text-primary hover:underline cursor-pointer flex items-center gap-0.5 font-medium">
                  Explore full features <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Grid Section */}
        <section className="py-1">
          <div className="text-center mb-3">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
              Built for Modern Enterprise Workflows
            </h2>
            <p className="mt-1 text-slate-600 max-w-xl mx-auto text-xs sm:text-sm">
              Everything your organization needs to maintain velocity, enforce security, and track progress.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {mainFeatures.map((feature, index) => (
              <div
                key={index}
                className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-cardHover transition-all duration-200 group"
              >
                <div className="p-2 rounded-lg bg-primary-light w-fit mb-2.5 group-hover:bg-primary/20 transition-colors">
                  {feature.icon}
                </div>
                <h3 className="text-sm font-bold text-slate-800 mb-1">{feature.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Role-Based Access Governance Section */}
        <section className="py-1">
          <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-card">
            <div className="max-w-3xl mb-3">
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary-light border border-primary/30 text-[11px] font-bold text-primary mb-2">
                <Lock className="w-3 h-3" />
                Role-Based Security Model
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight">
                Admin-Controlled Account & Workspace Registration
              </h2>
              <p className="mt-1 text-slate-600 text-xs sm:text-sm leading-relaxed">
                Prevent unauthorized public access. Primary organization accounts are registered by Administrators with an Admin Key, while team members join securely via invitation links.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {roleHighlights.map((roleItem, idx) => (
                <div key={idx} className="bg-gray-50/70 rounded-xl p-3.5 border border-gray-200 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${roleItem.color}`}>
                        {roleItem.badge}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-800 mb-1">{roleItem.role}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed mb-3">{roleItem.description}</p>
                  </div>

                  <ul className="space-y-1.5 pt-2 border-t border-gray-200">
                    {roleItem.perks.map((perk, pIdx) => (
                      <li key={pIdx} className="flex items-center gap-1.5 text-xs text-slate-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>{perk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="py-2">
          <div className="rounded-2xl bg-primary-light border border-primary/30 text-slate-800 p-4 sm:p-6 text-center shadow-card relative overflow-hidden">
            <div className="relative z-10 max-w-2xl mx-auto space-y-2">
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
                Ready to Setup Your Enterprise Workspace?
              </h2>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                Register your Administrator account with your Admin Secret Key to start inviting team members and organizing tasks today.
              </p>
              <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
                <Link
                  to="/signup"
                  className="bg-primary hover:bg-primary-hover text-white font-semibold px-5 py-2.5 rounded-lg shadow transition-colors inline-flex items-center justify-center gap-1.5 text-xs"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Register Admin Account</span>
                </Link>
                <Link
                  to="/login"
                  className="btn-ghost inline-flex items-center justify-center gap-1.5 text-xs px-5 py-2.5 rounded-lg"
                >
                  <span>Sign In</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="pt-3 pb-2 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-primary" />
              <span className="font-semibold text-slate-800">Cadence Task Suite</span>
              <span>&copy; {new Date().getFullYear()} All rights reserved.</span>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/login" className="hover:text-primary transition-colors">Sign In</Link>
              <Link to="/signup" className="hover:text-primary transition-colors">Admin Registration</Link>
            </div>
          </div>
        </footer>
      </div>
    </PublicLayout>
  );
}

export default Landing;
