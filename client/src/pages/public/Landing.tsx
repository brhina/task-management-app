import { Link } from 'react-router-dom';
import { ClipboardCheck, Users, BarChart3, DollarSign } from 'lucide-react';
import PublicLayout from '../../components/layouts/PublicLayout';

function Landing() {
  const features = [
    {
      icon: <ClipboardCheck className="w-8 h-8" />,
      title: 'Task Management',
      description:
        'Create, organize, and track your tasks with ease. Set priorities, due dates, and status updates.',
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: 'Team Collaboration',
      description:
        'Assign tasks to team members, track progress, and collaborate effectively with your team.',
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: 'Progress Tracking',
      description:
        'Monitor your progress with visual indicators, checklists, and detailed task analytics.',
    },
    {
      icon: <DollarSign className="w-8 h-8" />,
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
            <p>&copy; {new Date().getFullYear()} Cadence. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </PublicLayout>
  );
}

export default Landing;
