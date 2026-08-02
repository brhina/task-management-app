import { useState, useContext, type FormEvent, type ChangeEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle, LogIn, UserPlus, Shield } from 'lucide-react';
import PublicLayout from '../../components/layouts/PublicLayout';
import { UserContext } from '../../context/UserContext';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';
import { validateEmail } from '../../utils/validation';
import LoadingSpinner from '../../components/common/LoadingSpinner';

interface FieldErrors {
  email?: string;
  password?: string;
}

function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const navigate = useNavigate();
  const { updateUser } = useContext(UserContext);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (error) setError('');
    if (fieldErrors[name as keyof FieldErrors]) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name as keyof FieldErrors];
        return newErrors;
      });
    }

    if (name === 'email' && value && !validateEmail(value)) {
      setFieldErrors((prev) => ({ ...prev, email: 'Please enter a valid email address' }));
    }
  };

  const validateForm = () => {
    const errors: FieldErrors = {};

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError('');
    try {
      const response = await api.post(apiPaths.AUTH.login, formData);
      const { user, token, activeOrgId } = response.data;
      updateUser({ ...user, token, activeOrgId });
      navigate('/dashboard');
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message || err.message || 'An error occurred during login';
      setError(errorMessage);
      setFormData((prev) => ({ ...prev, password: '' }));
    } finally {
      setLoading(false);
    }
  };

  const handleSSOLogin = async () => {
    if (!formData.email || !validateEmail(formData.email)) {
      setFieldErrors((prev) => ({ ...prev, email: 'Enter your work email to initiate Enterprise SSO' }));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/api/sso/login/initiate', { email: formData.email });
      if (res.data?.redirectUrl) {
        window.location.href = res.data.redirectUrl;
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'No active SSO integration found for this domain');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-12 gap-6 items-center py-2 sm:py-4">
        {/* Left Side Branding & Hero Info */}
        <div className="lg:col-span-6 space-y-3.5 hidden lg:block pr-4">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary-light px-3 py-1 text-[11px] font-semibold text-primary shadow-2xs">
            <Shield className="w-3.5 h-3.5 text-primary" />
            <span>Secure Enterprise Workspace</span>
          </div>

          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight leading-tight">
            Welcome back to your{' '}
            <span className="text-primary">
              Task Command Suite
            </span>
          </h1>

          <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
            Sign in to access your organization's projects, manage sprint lifecycles, and monitor real-time productivity analytics.
          </p>

          <div className="grid grid-cols-1 gap-2.5 pt-1">
            <div className="bg-white rounded-xl p-3 flex items-start gap-2.5 border border-gray-200 shadow-card">
              <div className="p-2 rounded-lg bg-primary-light text-primary shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800">Role-Based Access Enforcement</h4>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Granular permissions for Admins, Managers, and Members protect sensitive workflows.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl p-3 flex items-start gap-2.5 border border-gray-200 shadow-card">
              <div className="p-2 rounded-lg bg-primary-light text-primary shrink-0">
                <LogIn className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800">Unified Navigation & Live Sync</h4>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Real-time updates across Gantt timelines, Kanban boards, and task execution threads.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side Login Form Card */}
        <div className="lg:col-span-6 max-w-md mx-auto w-full">
          <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-card border border-gray-200 relative overflow-hidden">
            <div className="text-center mb-3">
              <div className="mx-auto w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shadow mb-2">
                <LogIn className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">Sign In</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">Enter your credentials to access your account</p>
            </div>

            <form className="space-y-3" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-2.5 rounded-lg text-xs flex items-start gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label
                  htmlFor="email"
                  className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1"
                >
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="h-3.5 h-3.5" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full pl-9 pr-3 py-2 bg-white border text-slate-800 rounded-lg text-xs transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${
                      fieldErrors.email ? 'border-rose-400 ring-2 ring-rose-500/10' : 'border-gray-200'
                    }`}
                    placeholder="you@company.com"
                  />
                </div>
                {fieldErrors.email && (
                  <p className="mt-1 text-[11px] text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label
                    htmlFor="password"
                    className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider"
                  >
                    Password
                  </label>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-3.5 h-3.5" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className={`w-full pl-9 pr-9 py-2 bg-white border text-slate-800 rounded-lg text-xs transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${
                      fieldErrors.password ? 'border-rose-400 ring-2 ring-rose-500/10' : 'border-gray-200'
                    }`}
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-3.5 h-3.5" /> : <Eye className="h-3.5 h-3.5" />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="mt-1 text-[11px] text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-2.5 rounded-lg flex justify-center items-center gap-1.5 text-xs font-semibold disabled:opacity-60 disabled:cursor-not-allowed mt-1"
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" text="" className="text-white" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign In to Workspace</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleSSOLogin}
                disabled={loading}
                className="btn-secondary w-full py-2 rounded-lg flex justify-center items-center gap-1.5 text-xs font-semibold text-slate-700"
              >
                <Shield className="w-3.5 h-3.5 text-primary" />
                <span>Sign in with Enterprise SSO</span>
              </button>
            </form>

            <div className="mt-4 pt-3 border-t border-gray-200 text-center">
              <p className="text-[11px] text-slate-500 mb-2">
                Need to register a new Administrator workspace?
              </p>
              <Link
                to="/signup"
                className="btn-secondary inline-flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-lg text-xs font-semibold"
              >
                <UserPlus className="w-3.5 h-3.5 text-primary" />
                <span>Admin Workspace Setup</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

export default Login;
