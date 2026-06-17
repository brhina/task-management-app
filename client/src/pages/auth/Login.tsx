import { useState, useContext, type FormEvent, type ChangeEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle, LogIn, UserPlus } from 'lucide-react';
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
      if (user.role === 'Admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/user/dashboard');
      }
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message || err.message || 'An error occurred during login';
      setError(errorMessage);
      setFormData((prev) => ({ ...prev, password: '' }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-2 gap-8 items-center py-8">
        <div className="hidden lg:block">
          <div className="max-w-lg">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
              Secure sign-in
            </div>
            <h1 className="mt-4 text-4xl font-extrabold text-white tracking-tight">
              Welcome back.
            </h1>
            <p className="mt-3 text-slate-300 leading-relaxed">
              Sign in to access dashboards, insights, and your team's task workflow.
            </p>
            <div className="mt-8 grid grid-cols-1 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm font-semibold text-slate-100">Fast navigation</div>
                <div className="mt-1 text-sm text-slate-400">
                  A consistent sidebar and page layout across all modules.
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm font-semibold text-slate-100">Actionable insights</div>
                <div className="mt-1 text-sm text-slate-400">
                  Charts and KPI chips surface what needs attention.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-md">
          <div className="text-center mb-6 lg:hidden">
            <h2 className="text-3xl font-extrabold text-white mb-2">Welcome back</h2>
            <p className="text-sm text-slate-300">Sign in to continue</p>
          </div>

          <div className="card p-5 sm:p-6">
            <form className="space-y-4" onSubmit={handleSubmit}>
              {error && <div className="alert-error">{error}</div>}

              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1"
                >
                  Email address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className={`input-dark block w-full pl-10 pr-3 py-2 text-sm transition-colors ${
                      fieldErrors.email ? 'border-rose-500/60 ring-2 ring-rose-500/15' : ''
                    }`}
                    placeholder="you@example.com"
                  />
                </div>
                {fieldErrors.email && (
                  <p className="mt-1 text-sm text-rose-200 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1 text-rose-300" />
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1"
                >
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className={`input-dark block w-full pl-10 pr-10 py-2 text-sm transition-colors ${
                      fieldErrors.password ? 'border-rose-500/60 ring-2 ring-rose-500/15' : ''
                    }`}
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-slate-400 hover:text-slate-200" />
                    ) : (
                      <Eye className="h-5 w-5 text-slate-400 hover:text-slate-200" />
                    )}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="mt-1 text-sm text-rose-200 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1 text-rose-300" />
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full flex justify-center items-center py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <LoadingSpinner size="sm" text="" className="mr-2" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      <LogIn className="w-5 h-5 mr-2" />
                      Sign in
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-4">
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 bg-app-panel2 text-slate-500">New to Cadence?</span>
                </div>
              </div>
              <Link to="/signup" className="btn-ghost w-full flex justify-center items-center py-2">
                <UserPlus className="w-5 h-5 mr-2" />
                Create new account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

export default Login;
