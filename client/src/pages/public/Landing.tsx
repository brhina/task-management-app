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
  Kanban,
  Building2,
  CreditCard,
  Bot,
  Target,
  Clock,
  Briefcase
} from 'lucide-react';
import PublicLayout from '../../components/layouts/PublicLayout';

function Landing() {
  const [activeTab, setActiveTab] = useState<'kanban' | 'sprint' | 'billing' | 'ai'>('kanban');

  const mainFeatures = [
    {
      icon: <Kanban className="w-6 h-6 text-primary" />,
      title: 'Agile Kanban & Backlogs',
      description:
        'Structure tasks with flexible Kanban boards, custom WIP limits, issue types, and real-time sprint backlogs.',
    },
    {
      icon: <CreditCard className="w-6 h-6 text-emerald-600" />,
      title: 'Tiered Subscription Plans',
      description:
        'Choose Free, Pro (14-day trial), or Enterprise tiers. Integrated Telebirr payments and automated ETB invoicing.',
    },
    {
      icon: <Bot className="w-6 h-6 text-indigo-600" />,
      title: 'AI Intelligence Engine',
      description:
        'Automated task effort estimation, smart impact scoring, velocity recommendations, and automated workflow runs.',
    },
    {
      icon: <BarChart3 className="w-6 h-6 text-amber-500" />,
      title: 'Executive Analytics',
      description:
        'Track burndown charts, team velocity, resource workloads, and export compliance audit logs.',
    },
  ];

  const onboardingSteps = [
    {
      step: '01',
      title: 'Create Your Workspace',
      badge: 'Instant Setup',
      color: 'bg-primary-light text-primary border-primary/30',
      description: 'Enter your name, work email, and company workspace name to get started immediately.',
      perks: ['Workspace admin access', 'Custom workspace URL slug', 'No secret key needed'],
    },
    {
      step: '02',
      title: 'Choose Subscription Tier',
      badge: 'Free & Paid Tiers',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      description: 'Start on Free (up to 5 team members) or activate Pro with a 14-day free trial.',
      perks: ['Free tier included', 'Telebirr express payment', 'Transparent usage limits'],
    },
    {
      step: '03',
      title: 'Invite & Scale Sprints',
      badge: 'Team Onboarding',
      color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      description: 'Send instant invitation links to team members and assign project roles seamlessly.',
      perks: ['Granular role permissions', 'Sprint backlog planning', 'Real-time sync'],
    },
  ];

  return (
    <PublicLayout>
      <div className="flex flex-col gap-6 sm:gap-8 pb-4">
        {/* Hero Section */}
        <section className="pt-2 pb-3 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary-light px-3 py-1 text-[11px] font-semibold text-primary shadow-2xs mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            <span>Enterprise Workspace & Subscription Platform</span>
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-800 tracking-tight max-w-3xl mx-auto leading-tight">
            Organize Projects.{' '}
            <span className="bg-gradient-to-r from-primary to-indigo-600 bg-clip-text text-transparent">
              Align Teams. Scale Faster.
            </span>
          </h1>

          <p className="mt-2.5 text-sm sm:text-base text-slate-600 mb-4 max-w-xl mx-auto leading-relaxed font-normal">
            The next-generation agile task workspace built for modern engineering & product teams. Launch your organization workspace in seconds with integrated AI intelligence and flexible subscription tiers.
          </p>

          <div className="flex flex-col sm:flex-row gap-2.5 justify-center max-w-md mx-auto">
            <Link
              to="/signup"
              className="inline-flex items-center justify-center gap-1.5 bg-primary hover:bg-primary-hover text-white font-semibold text-sm px-5 py-2.5 rounded-xl shadow-md transition-all hover:shadow-lg group"
            >
              <Zap className="w-4 h-4 text-white/90" />
              <span>Start Free Workspace</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              to="/login"
              className="btn-ghost inline-flex items-center justify-center gap-1.5 text-sm px-5 py-2.5 rounded-xl border border-gray-200"
            >
              <span>Sign In to Workspace</span>
            </Link>
          </div>

          <div className="mt-3 text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Instant setup • No admin key required • Upgrade anytime via Telebirr</span>
          </div>

          {/* Interactive Feature Demo Mockup */}
          <div className="mt-5 max-w-4xl mx-auto rounded-2xl border border-gray-200 bg-white shadow-card p-3 sm:p-4">
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
                  Agile Sprints
                </button>
                <button
                  onClick={() => setActiveTab('billing')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    activeTab === 'billing'
                      ? 'bg-primary text-white shadow-xs'
                      : 'bg-gray-100 text-slate-600 hover:bg-gray-200/70'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  Subscriptions & Billing
                </button>
                <button
                  onClick={() => setActiveTab('ai')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    activeTab === 'ai'
                      ? 'bg-primary text-white shadow-xs'
                      : 'bg-gray-100 text-slate-600 hover:bg-gray-200/70'
                  }`}
                >
                  <Bot className="w-3.5 h-3.5" />
                  AI Workflows
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[11px] text-slate-500 font-medium">Live Workspace Preview</span>
              </div>
            </div>

            {/* Tab Preview Content */}
            <div className="bg-slate-50/80 rounded-xl p-3.5 text-left font-sans text-slate-800 border border-gray-200 min-h-[190px] flex flex-col justify-between shadow-2xs">
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
                        <span>Backlog</span>
                        <span className="text-slate-400">3</span>
                      </div>
                      <div className="bg-gray-50 p-2 rounded border border-gray-200 text-xs text-slate-700 space-y-1">
                        <div className="font-semibold text-slate-800 text-[11px]">Setup Subscription Tier Limits</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                          <span className="px-1 py-0.2 rounded bg-rose-50 text-rose-600 font-semibold border border-rose-200">Critical</span>
                          <span>Billing</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-2.5 border border-gray-200 shadow-2xs">
                      <div className="text-[11px] font-bold text-primary uppercase mb-1.5 flex justify-between">
                        <span>In Progress</span>
                        <span className="text-primary">2</span>
                      </div>
                      <div className="bg-primary-light/40 p-2 rounded border border-primary/30 text-xs text-slate-700 space-y-1">
                        <div className="font-semibold text-slate-800 text-[11px]">Self-Service Onboarding Workflow</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                          <span className="px-1 py-0.2 rounded bg-amber-50 text-amber-600 font-semibold border border-amber-200">High</span>
                          <span>Auth & Workspace</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-2.5 border border-gray-200 shadow-2xs">
                      <div className="text-[11px] font-bold text-emerald-600 uppercase mb-1.5 flex justify-between">
                        <span>Completed</span>
                        <span className="text-emerald-600">5</span>
                      </div>
                      <div className="bg-emerald-50/50 p-2 rounded border border-emerald-200 text-xs text-slate-700 space-y-1">
                        <div className="font-semibold text-slate-800 text-[11px]">Telebirr Payment Gateway</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                          <span className="px-1 py-0.2 rounded bg-emerald-100 text-emerald-700 font-semibold">Done</span>
                          <span>Billing</span>
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
                      <Layers className="w-3.5 h-3.5 text-primary" /> Sprint Lifecycle & Roadmap Timeline
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">Q3 Engineering Sprint</span>
                  </div>
                  <div className="space-y-2.5 text-xs">
                    <div className="space-y-1">
                      <div className="flex justify-between text-slate-700 font-medium text-[11px]">
                        <span>Sprint 14: Onboarding & Subscription Plans</span>
                        <span className="text-primary font-bold">92% Complete</span>
                      </div>
                      <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-primary h-full w-[92%]"></div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-slate-700 font-medium text-[11px]">
                        <span>Sprint 15: AI Copilot Recommendations</span>
                        <span className="text-slate-500 font-bold">45% Planned</span>
                      </div>
                      <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-primary/60 h-full w-[45%]"></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'billing' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                    <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-emerald-600" /> Organization Subscription & Usage
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                      Pro Plan Active (2,500 ETB/mo)
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div className="bg-white p-2.5 rounded-lg border border-gray-200 shadow-2xs">
                      <div className="text-[10px] text-slate-500">Team Members</div>
                      <div className="text-sm font-bold text-slate-800">12 / 25 Used</div>
                      <div className="w-full bg-gray-100 h-1 rounded-full mt-1 overflow-hidden">
                        <div className="bg-emerald-500 h-full w-[48%]"></div>
                      </div>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-gray-200 shadow-2xs">
                      <div className="text-[10px] text-slate-500">Active Projects</div>
                      <div className="text-sm font-bold text-primary">8 / 20 Used</div>
                      <div className="w-full bg-gray-100 h-1 rounded-full mt-1 overflow-hidden">
                        <div className="bg-primary h-full w-[40%]"></div>
                      </div>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-gray-200 shadow-2xs">
                      <div className="text-[10px] text-slate-500">Telebirr Payment</div>
                      <div className="text-sm font-bold text-slate-800">+251911***890</div>
                      <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">Auto-Renew Active</div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'ai' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                    <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                      <Bot className="w-3.5 h-3.5 text-indigo-600" /> AI Task Intelligence & Automation
                    </span>
                    <span className="text-[10px] text-indigo-600 font-bold">1,000 Ops / Month</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="bg-white p-2.5 rounded-lg border border-gray-200 shadow-2xs space-y-1">
                      <div className="text-indigo-600 font-bold text-[11px] flex items-center gap-1">
                        <Bot className="w-3 h-3" /> Effort & Impact Score Prediction
                      </div>
                      <p className="text-slate-600 text-[10px]">
                        AI automatically calculates task impact score (8.5/10) and estimates 4.5 effort hours.
                      </p>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-gray-200 shadow-2xs space-y-1">
                      <div className="text-emerald-600 font-bold text-[11px] flex items-center gap-1">
                        <Zap className="w-3 h-3" /> Automated Risk Detection
                      </div>
                      <p className="text-slate-600 text-[10px]">
                        Detects blocker dependencies before sprint launch to keep team velocity on track.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-1.5 flex justify-between items-center text-[10px] text-slate-500 border-t border-gray-200 mt-1.5">
                <span>Cadence Agile Platform v2.5</span>
                <Link to="/signup" className="text-primary hover:underline flex items-center gap-0.5 font-semibold">
                  Launch Your Workspace <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Grid Section */}
        <section className="py-1">
          <div className="text-center mb-3">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
              Built for Modern Agile Workspaces
            </h2>
            <p className="mt-1 text-slate-600 max-w-xl mx-auto text-xs sm:text-sm">
              Everything your organization needs to plan sprints, track velocity, and manage subscription billing.
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

        {/* Onboarding Flow Section */}
        <section className="py-1">
          <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-card">
            <div className="max-w-3xl mb-4">
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary-light border border-primary/30 text-[11px] font-bold text-primary mb-2">
                <Building2 className="w-3.5 h-3.5" />
                Simple 3-Step Workspace Setup
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight">
                Self-Service Workspace Onboarding
              </h2>
              <p className="mt-1 text-slate-600 text-xs sm:text-sm leading-relaxed">
                No complex server passcodes needed. Register your account, choose your subscription tier, and start collaborating with your team in minutes.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {onboardingSteps.map((stepItem, idx) => (
                <div key={idx} className="bg-gray-50/70 rounded-xl p-4 border border-gray-200 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-lg font-black text-primary/40 font-mono">{stepItem.step}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${stepItem.color}`}>
                        {stepItem.badge}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-800 mb-1">{stepItem.title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed mb-3">{stepItem.description}</p>
                  </div>

                  <ul className="space-y-1.5 pt-2 border-t border-gray-200">
                    {stepItem.perks.map((perk, pIdx) => (
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
          <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-7 text-center shadow-lg relative overflow-hidden">
            <div className="relative z-10 max-w-2xl mx-auto space-y-2.5">
              <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight text-white">
                Ready to Scale Your Team’s Workspace?
              </h2>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                Launch your organization workspace today. Start on our Free tier or activate a 14-day trial for Pro features.
              </p>
              <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  to="/signup"
                  className="bg-primary hover:bg-primary-hover text-white font-bold px-6 py-3 rounded-xl shadow-md transition-all inline-flex items-center justify-center gap-2 text-xs"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>Start Free Workspace</span>
                </Link>
                <Link
                  to="/login"
                  className="bg-white/10 hover:bg-white/20 text-white font-semibold text-xs px-6 py-3 rounded-xl border border-white/20 transition-colors inline-flex items-center justify-center gap-1.5"
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
              <span className="font-semibold text-slate-800">Cadence Workspace Platform</span>
              <span>&copy; {new Date().getFullYear()} All rights reserved.</span>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/login" className="hover:text-primary transition-colors">Sign In</Link>
              <Link to="/signup" className="hover:text-primary transition-colors font-semibold text-primary">Start Workspace</Link>
            </div>
          </div>
        </footer>
      </div>
    </PublicLayout>
  );
}

export default Landing;
