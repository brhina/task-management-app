import { useState, useContext, useMemo, useEffect, type FormEvent, type ChangeEvent } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Shield,
  Key,
  UserPlus,
  LogIn,
  Info,
  Sparkles
} from 'lucide-react';
import PublicLayout from '../../components/layouts/PublicLayout';
import { UserContext } from '../../context/UserContext';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';
import {
  validateEmail,
  validatePassword,
  getPasswordStrengthLabel,
  validateURL,
} from '../../utils/validation';
import LoadingSpinner from '../../components/common/LoadingSpinner';

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  profileImageUrl?: string;
  adminInviteToken?: string;
}

function SignUp() {
  const [searchParams] = useSearchParams();
  const orgInviteToken = searchParams.get('invite');

  const [regMode, setRegMode] = useState<'admin' | 'invite'>(
    orgInviteToken ? 'invite' : 'admin'
  );

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    profileImageUrl: '',
    adminInviteToken: '',
    orgInviteToken: orgInviteToken || '',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [inviteStatus, setInviteStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');

  const navigate = useNavigate();
  const { updateUser } = useContext(UserContext);

  useEffect(() => {
    if (orgInviteToken) {
      setFormData((prev) => ({ ...prev, orgInviteToken }));
      setInviteStatus('valid');
      setRegMode('invite');
    }
  }, [orgInviteToken]);

  const passwordStrength = useMemo(() => {
    if (!formData.password) return null;
    return validatePassword(formData.password);
  }, [formData.password]);

  const passwordStrengthLabel = useMemo(() => {
    if (!passwordStrength) return null;
    return getPasswordStrengthLabel(passwordStrength);
  }, [passwordStrength]);

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

    if (name === 'password' && value && passwordStrength && passwordStrength.score < 2) {
      setFieldErrors((prev) => ({ ...prev, password: 'Password is too weak' }));
    }

    if (name === 'confirmPassword' && value && formData.password && value !== formData.password) {
      setFieldErrors((prev) => ({ ...prev, confirmPassword: 'Passwords do not match' }));
    }

    if (name === 'profileImageUrl' && value && !validateURL(value)) {
      setFieldErrors((prev) => ({ ...prev, profileImageUrl: 'Please enter a valid URL' }));
    }
  };

  const validateForm = () => {
    const errors: FieldErrors = {};

    if (!formData.name.trim()) {
      errors.name = 'Full name is required';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email address is required';
    } else if (!validateEmail(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters long';
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (regMode === 'admin' && !formData.adminInviteToken.trim() && !formData.orgInviteToken) {
      errors.adminInviteToken = 'Admin Passcode / Secret Key is required for Admin registration';
    }

    if (formData.profileImageUrl && !validateURL(formData.profileImageUrl)) {
      errors.profileImageUrl = 'Please enter a valid URL';
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
      const signupData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        ...(formData.profileImageUrl.trim() && {
          profileImageUrl: formData.profileImageUrl.trim(),
        }),
        ...(formData.adminInviteToken.trim() && {
          adminInviteToken: formData.adminInviteToken.trim(),
        }),
        ...(formData.orgInviteToken.trim() && { orgInviteToken: formData.orgInviteToken.trim() }),
      };

      const response = await api.post(apiPaths.AUTH.signup, signupData);
      const { user, token, activeOrgId } = response.data;
      updateUser({ ...user, token, activeOrgId });
      navigate('/dashboard');
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message || err.message || 'An error occurred during registration';
      setError(errorMessage);
      if (formData.orgInviteToken && errorMessage.toLowerCase().includes('invite')) {
        setInviteStatus('invalid');
      }
      setFormData((prev) => ({ ...prev, password: '', confirmPassword: '' }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-12 gap-6 items-center py-2 sm:py-4">
        {/* Left Side Info Panel */}
        <div className="lg:col-span-6 space-y-3.5 hidden lg:block pr-4">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary-light px-3 py-1 text-[11px] font-semibold text-primary shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            <span>Admin-Controlled Registration</span>
          </div>

          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight leading-tight">
            Register Your Workspace &{' '}
            <span className="text-primary">
              Admin Suite
            </span>
          </h1>

          <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
            Public self-registration is role-restricted to system Administrators. Enter your Admin Key to set up a new workspace or join using your invitation link.
          </p>

          <div className="space-y-2.5 pt-1">
            <div className="bg-white rounded-xl p-3 flex items-start gap-2.5 border border-gray-200 shadow-card">
              <div className="p-2 rounded-lg bg-primary-light text-primary shrink-0">
                <Key className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800">Admin Key Workspace Setup</h4>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Register as a primary Administrator to configure team roles, create projects, and issue invitations.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl p-3 flex items-start gap-2.5 border border-gray-200 shadow-card">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800">Team Member Onboarding</h4>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Team members join via secure invitation links sent by organization Administrators.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side Form */}
        <div className="lg:col-span-6 max-w-md mx-auto w-full">
          <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-card border border-gray-200 relative overflow-hidden">
            <div className="text-center mb-3">
              <div className="mx-auto w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shadow mb-2">
                <UserPlus className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">Account Setup</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">Role-Based Account Registration</p>
            </div>

            {/* Invite Token Banner */}
            {orgInviteToken && inviteStatus === 'valid' && (
              <div className="mb-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold text-xs">Organization Invitation Active!</span>
                  <span className="block text-emerald-700 text-[10px]">
                    Complete details below to join your team.
                  </span>
                </div>
              </div>
            )}

            {orgInviteToken && inviteStatus === 'invalid' && (
              <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-800">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <div>
                  <span className="font-bold text-xs">Invalid or Expired Invitation</span>
                  <span className="block text-rose-600 text-[10px]">
                    Ask your Admin for a new invite or enter an Admin Passcode.
                  </span>
                </div>
              </div>
            )}

            {/* Registration Mode Info Alert */}
            {!orgInviteToken && (
              <div className="mb-3 p-2.5 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs text-amber-900 space-y-0.5">
                <div className="font-bold flex items-center gap-1.5 text-amber-800 text-[11px]">
                  <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Admin Registration Required</span>
                </div>
                <p className="text-[10px] text-amber-700 leading-relaxed">
                  Self-registration requires a valid **Admin Secret Key**. Non-admin team members must register via an invitation link.
                </p>
              </div>
            )}

            <form className="space-y-2.5" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-2.5 rounded-lg text-xs flex items-start gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Admin Passcode Input Field */}
              {!orgInviteToken && (
                <div>
                  <label
                    htmlFor="adminInviteToken"
                    className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1"
                  >
                    Admin Secret Key / Passcode
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Key className="h-3.5 h-3.5 text-primary" />
                    </div>
                    <input
                      id="adminInviteToken"
                      name="adminInviteToken"
                      type="text"
                      required
                      value={formData.adminInviteToken}
                      onChange={handleChange}
                      className={`w-full pl-9 pr-3 py-2 bg-white border text-slate-800 rounded-lg text-xs transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${
                        fieldErrors.adminInviteToken
                          ? 'border-rose-400 ring-2 ring-rose-500/10'
                          : 'border-primary/40 bg-primary-light/20'
                      }`}
                      placeholder="e.g. ADMIN-SECRET-KEY-2026"
                    />
                  </div>
                  {fieldErrors.adminInviteToken && (
                    <p className="mt-1 text-[11px] text-rose-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {fieldErrors.adminInviteToken}
                    </p>
                  )}
                </div>
              )}

              {/* Full Name */}
              <div>
                <label
                  htmlFor="name"
                  className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1"
                >
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="h-3.5 h-3.5" />
                  </div>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className={`w-full pl-9 pr-3 py-2 bg-white border text-slate-800 rounded-lg text-xs transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${
                      fieldErrors.name ? 'border-rose-400 ring-2 ring-rose-500/10' : 'border-gray-200'
                    }`}
                    placeholder="John Doe"
                  />
                </div>
                {fieldErrors.name && (
                  <p className="mt-1 text-[11px] text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {fieldErrors.name}
                  </p>
                )}
              </div>

              {/* Email */}
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

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1"
                >
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-3.5 h-3.5" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className={`w-full pl-9 pr-9 py-2 bg-white border text-slate-800 rounded-lg text-xs transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${
                      fieldErrors.password ? 'border-rose-400 ring-2 ring-rose-500/10' : 'border-gray-200'
                    }`}
                    placeholder="Create a strong password"
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

                {formData.password && passwordStrength && passwordStrengthLabel && (
                  <div className="mt-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[10px] text-slate-500">Password strength:</span>
                      <span className={`text-[10px] font-semibold ${passwordStrengthLabel.color}`}>
                        {passwordStrengthLabel.label}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1 overflow-hidden">
                      <div
                        className={`h-1 rounded-full transition-all duration-300 ${passwordStrengthLabel.bgColor}`}
                        style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}
                {fieldErrors.password && (
                  <p className="mt-1 text-[11px] text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1"
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-3.5 h-3.5" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={`w-full pl-9 pr-9 py-2 bg-white border text-slate-800 rounded-lg text-xs transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${
                      fieldErrors.confirmPassword
                        ? 'border-rose-400 ring-2 ring-rose-500/10'
                        : 'border-gray-200'
                    }`}
                    placeholder="Confirm your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="h-3.5 h-3.5" /> : <Eye className="h-3.5 h-3.5" />}
                  </button>
                </div>
                {formData.confirmPassword &&
                  formData.password === formData.confirmPassword &&
                  !fieldErrors.confirmPassword && (
                    <p className="mt-1 text-[11px] text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Passwords match</span>
                    </p>
                  )}
                {fieldErrors.confirmPassword && (
                  <p className="mt-1 text-[11px] text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {fieldErrors.confirmPassword}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-2.5 rounded-lg flex justify-center items-center gap-1.5 text-xs font-semibold disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" text="" className="text-white" />
                    <span>Creating Admin Account...</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-3.5 h-3.5" />
                    <span>Complete Admin Registration</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-3 pt-2.5 border-t border-gray-200 text-center">
              <p className="text-[11px] text-slate-500 mb-1.5">Already have an active account?</p>
              <Link
                to="/login"
                className="btn-secondary inline-flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-lg text-xs font-semibold"
              >
                <LogIn className="w-3.5 h-3.5 text-slate-500" />
                <span>Sign In to Existing Account</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

export default SignUp;
