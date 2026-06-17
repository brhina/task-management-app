import { Link } from 'react-router-dom';
import PublicLayout from '../../components/layouts/PublicLayout';

function Landing() {
  const features = [
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
        </svg>
      ),
      title: 'Task Management',
      description:
        'Create, organize, and track your tasks with ease. Set priorities, due dates, and status updates.',
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      ),
      title: 'Team Collaboration',
      description:
        'Assign tasks to team members, track progress, and collaborate effectively with your team.',
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
      title: 'Progress Tracking',
      description:
        'Monitor your progress with visual indicators, checklists, and detailed task analytics.',
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      title: 'Reports & Analytics',
      description:
        "Generate comprehensive reports and gain insights into your team's productivity and performance.",
    },
  ];

  return (
    <PublicLayout>
      <div className="flex flex-col">
        <section className="py-12 lg:py-16">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
              Task management for teams
            </div>
            <h2 className="mt-4 text-4xl md:text-5xl font-extrabold text-white tracking-tight">
              Organize work.
              <br />
              <span className="text-primary">Deliver outcomes.</span>
            </h2>
            <p className="mt-4 text-lg text-slate-300 mb-8 max-w-2xl mx-auto leading-relaxed">
              A professional task management system designed to help teams and individuals stay
              organized, productive, and on track with goals.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/signup" className="btn-primary px-6 py-3">
                Get started
              </Link>
              <Link to="/login" className="btn-ghost px-6 py-3">
                Sign in
              </Link>
            </div>
          </div>
        </section>

        <section className="py-10 lg:py-14">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-white">Everything you need</h2>
            <p className="mt-2 text-slate-300">
              Built for modern workflows, from planning to delivery.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((feature, index) => (
              <div
                key={index}
                className="rounded-2xl border border-white/10 bg-white/5 p-6 hover:bg-white/7 transition-all duration-200 shadow-card"
              >
                <div className="text-primary mb-4">{feature.icon}</div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-slate-300 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="py-8 border-t border-white/10">
          <div className="text-center text-slate-500 text-sm">
            <p>&copy; {new Date().getFullYear()} Task Manager. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </PublicLayout>
  );
}

export default Landing;
