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
  Building2,
  Zap,
  ArrowRight,
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp
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
  workspaceName?: string;
  profileImageUrl?: string;
  adminInviteToken?: string;
}

type PlanType = 'Free' | 'Pro' | 'Enterprise';

interface PlanOption {
  id: PlanType;
  name: string;
  price: string;
  subtitle: string;
  badge?: string;
  isPopular?: boolean;
  features: string[];
}

const PLAN_OPTIONS: PlanOption[] = [
  {
    id: 'Free',
    name: 'Free Workspace',
    price: '0 ETB',
    subtitle: 'Essential task management for small teams',
    badge: 'Free Forever',
    features: [
      'Up to 5 Team Members',
      '3 Active Projects',
      '50 AI Operations / mo',
      'Kanban & List Views',
    ],
  },
  {
    id: 'Pro',
    name: 'Pro Workspace',
    price: '2,500 ETB',
    subtitle: 'Advanced collaboration & automated AI workflows',
    badge: 'Upgrade after signup',
    isPopular: true,
    features: [
      'Up to 25 Team Members',
      '20 Active Projects',
      '1,000 AI Operations / mo',
      'Gantt Charts & Custom API Keys',
      'Telebirr Express Payments',
    ],
  },
  {
    id: 'Enterprise',
    name: 'Enterprise',
    price: '15,000 ETB',
    subtitle: 'Maximum security, SSO, and unlimited scale',
    badge: 'Pay via Telebirr',
    features: [
      'Unlimited Members & Projects',
      '50,000 AI Operations / mo',
      'SSO / SAML 2.0 & Custom Branding',
      'IP Allowlisting & Audit Logs',
    ],
  },
];

function SignUp() {
  const [searchParams] = useSearchParams();
  const orgInviteToken = searchParams.get('invite');

  const [step, setStep] = useState<1 | 2>(1);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    workspaceName: '',
    plan: 'Pro' as PlanType,
    profileImageUrl: '',
    adminInviteToken: '',
    orgInviteToken: orgInviteToken || '',
  });

  const [showAdminPasscode, setShowAdminPasscode] = useState(false);
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

  const validateStep1 = () => {
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

    if (formData.profileImageUrl && !validateURL(formData.profileImageUrl)) {
      errors.profileImageUrl = 'Please enter a valid URL';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNextStep = (e: FormEvent) => {
    e.preventDefault();
    if (!validateStep1()) return;

    if (orgInviteToken) {
      // Invited users join existing org directly
      void handleFinalSubmit();
    } else {
      setStep(2);
    }
  };

  const handleFinalSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault();

    setLoading(true);
    setError('');
    try {
      const signupData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        plan: formData.plan === 'Free' ? 'Free' : undefined,
        ...(formData.workspaceName.trim() && {
          workspaceName: formData.workspaceName.trim(),
        }),
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
      if (formData.plan === 'Pro' || formData.plan === 'Enterprise') {
        navigate(
          `/settings/enterprise?tab=billing&upgrade=${formData.plan}&cycle=monthly`
        );
      } else {
        navigate('/dashboard');
      }
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
        <div className="lg:col-span-5 space-y-4 hidden lg:block pr-2">

          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight leading-tight">
            Launch Your Team’s <br />
            <span className="bg-gradient-to-r from-primary to-indigo-600 bg-clip-text text-transparent">
              Workspace & Subscription
            </span>
          </h1>

          <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
            Create your organization workspace in seconds. Select a subscription plan, invite team members, and scale projects with integrated AI intelligence.
          </p>

          <div className="space-y-3 pt-1">
            <div className="bg-white rounded-xl p-3.5 flex items-start gap-3 border border-gray-200 shadow-card transition-all hover:border-primary/40">
              <div className="p-2.5 rounded-lg bg-primary-light text-primary shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800">Self-Service Workspace Setup</h4>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Instant organization setup. You automatically become the Workspace Admin with full billing and role management.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl p-3.5 flex items-start gap-3 border border-gray-200 shadow-card transition-all hover:border-emerald-200">
              <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800">Flexible Subscription Tiers</h4>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Start on Free. Pro and Enterprise activate only after Telebirr payment confirmation in Enterprise Settings.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl p-3.5 flex items-start gap-3 border border-gray-200 shadow-card transition-all hover:border-indigo-200">
              <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800">Enterprise Security & Compliance</h4>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  SOC2 readiness, TOTP Two-Factor Auth, IP Allowlisting, and audit logs built for modern operations.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side Form Panel */}
        <div className="lg:col-span-7 max-w-xl mx-auto w-full">
          <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-card border border-gray-200 relative overflow-hidden">
            {/* Header & Stepper */}
            <div className="text-center mb-4">
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">
                {orgInviteToken ? 'Join Your Team Workspace' : step === 1 ? 'Create Your Account & Workspace' : 'Choose Your Subscription Plan'}
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {orgInviteToken
                  ? 'Complete your profile to accept invitation'
                  : step === 1
                  ? 'Step 1 of 2: Account & Workspace Info'
                  : 'Step 2 of 2: Select Subscription Plan'}
              </p>

              {/* Progress Bar (Only for non-invited registration) */}
              {!orgInviteToken && (
                <div className="flex items-center justify-center gap-2 mt-3 max-w-xs mx-auto">
                  <div
                    className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                      step >= 1 ? 'bg-primary' : 'bg-slate-200'
                    }`}
                  />
                  <div
                    className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                      step === 2 ? 'bg-primary' : 'bg-slate-200'
                    }`}
                  />
                </div>
              )}
            </div>

            {/* Invite Token Banner */}
            {orgInviteToken && inviteStatus === 'valid' && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold text-xs">Organization Invitation Active!</span>
                  <span className="block text-emerald-700 text-[11px]">
                    Complete details below to join your team workspace.
                  </span>
                </div>
              </div>
            )}

            {orgInviteToken && inviteStatus === 'invalid' && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs text-rose-800">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <div>
                  <span className="font-bold text-xs">Invalid or Expired Invitation</span>
                  <span className="block text-rose-600 text-[11px]">
                    Please ask your Organization Administrator for a new invitation link.
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* STEP 1: Account & Workspace Details */}
            {step === 1 && (
              <form className="space-y-3" onSubmit={handleNextStep}>
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
                      <User className="h-4 h-4" />
                    </div>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className={`w-full pl-9 pr-3 py-2.5 bg-white border text-slate-800 rounded-lg text-xs transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${
                        fieldErrors.name ? 'border-rose-400 ring-2 ring-rose-500/10' : 'border-gray-200'
                      }`}
                      placeholder="e.g. Alex Morgan"
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
                    Work Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="h-4 h-4" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className={`w-full pl-9 pr-3 py-2.5 bg-white border text-slate-800 rounded-lg text-xs transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${
                        fieldErrors.email ? 'border-rose-400 ring-2 ring-rose-500/10' : 'border-gray-200'
                      }`}
                      placeholder="alex@company.com"
                    />
                  </div>
                  {fieldErrors.email && (
                    <p className="mt-1 text-[11px] text-rose-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {fieldErrors.email}
                    </p>
                  )}
                </div>

                {/* Workspace Name (Only for non-invited signup) */}
                {!orgInviteToken && (
                  <div>
                    <label
                      htmlFor="workspaceName"
                      className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1"
                    >
                      Workspace / Organization Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Building2 className="h-4 h-4 text-primary" />
                      </div>
                      <input
                        id="workspaceName"
                        name="workspaceName"
                        type="text"
                        value={formData.workspaceName}
                        onChange={handleChange}
                        className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 text-slate-800 rounded-lg text-xs transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                        placeholder="e.g. Acme Software Corp (Optional)"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Default: "{formData.name ? `${formData.name}'s Workspace` : "Your Name's Workspace"}"
                    </p>
                  </div>
                )}

                {/* Password & Confirm Password in 2 Cols */}
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="password"
                      className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1"
                    >
                      Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Lock className="h-4 h-4" />
                      </div>
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        value={formData.password}
                        onChange={handleChange}
                        className={`w-full pl-9 pr-9 py-2.5 bg-white border text-slate-800 rounded-lg text-xs transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${
                          fieldErrors.password ? 'border-rose-400 ring-2 ring-rose-500/10' : 'border-gray-200'
                        }`}
                        placeholder="Min 6 characters"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="h-3.5 h-3.5" /> : <Eye className="h-3.5 h-3.5" />}
                      </button>
                    </div>
                    {fieldErrors.password && (
                      <p className="mt-1 text-[11px] text-rose-600">{fieldErrors.password}</p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="confirmPassword"
                      className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1"
                    >
                      Confirm Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Lock className="h-4 h-4" />
                      </div>
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className={`w-full pl-9 pr-9 py-2.5 bg-white border text-slate-800 rounded-lg text-xs transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${
                          fieldErrors.confirmPassword
                            ? 'border-rose-400 ring-2 ring-rose-500/10'
                            : 'border-gray-200'
                        }`}
                        placeholder="Re-enter password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                      >
                        {showConfirmPassword ? <EyeOff className="h-3.5 h-3.5" /> : <Eye className="h-3.5 h-3.5" />}
                      </button>
                    </div>
                    {fieldErrors.confirmPassword && (
                      <p className="mt-1 text-[11px] text-rose-600">{fieldErrors.confirmPassword}</p>
                    )}
                  </div>
                </div>

                {/* Password Strength Indicator */}
                {formData.password && passwordStrength && passwordStrengthLabel && (
                  <div className="pt-0.5">
                    <div className="flex items-center justify-between mb-1">
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

                {/* Optional System Admin Passcode Accordion */}
                {!orgInviteToken && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAdminPasscode(!showAdminPasscode)}
                      className="text-[11px] font-medium text-slate-500 hover:text-primary flex items-center gap-1 transition-colors"
                    >
                      <Key className="w-3 h-3 text-slate-400" />
                      <span>Have a System Admin Secret Key? (Optional)</span>
                      {showAdminPasscode ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>

                    {showAdminPasscode && (
                      <div className="mt-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                        <label
                          htmlFor="adminInviteToken"
                          className="block text-[10px] font-semibold text-slate-600 uppercase tracking-wider"
                        >
                          System Admin Passcode
                        </label>
                        <input
                          id="adminInviteToken"
                          name="adminInviteToken"
                          type="text"
                          value={formData.adminInviteToken}
                          onChange={handleChange}
                          className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-mono text-slate-800"
                          placeholder="e.g. ADMIN-SECRET-KEY-2026"
                        />
                        <p className="text-[10px] text-slate-500">
                          Optional: Grants global system administrator role across all organizations.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Submit / Next Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-2.5 rounded-xl flex justify-center items-center gap-2 text-xs font-semibold shadow-md disabled:opacity-60 disabled:cursor-not-allowed mt-3"
                >
                  {orgInviteToken ? (
                    loading ? (
                      <>
                        <LoadingSpinner size="sm" text="" className="text-white" />
                        <span>Joining Workspace...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Complete Registration & Join Workspace</span>
                      </>
                    )
                  ) : (
                    <>
                      <span>Next: Select Subscription Plan</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* STEP 2: Subscription Plan Selection */}
            {step === 2 && !orgInviteToken && (
              <form onSubmit={handleFinalSubmit} className="space-y-4">
                <div className="grid gap-3">
                  {PLAN_OPTIONS.map((p) => {
                    const isSelected = formData.plan === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setFormData((prev) => ({ ...prev, plan: p.id }))}
                        className={`cursor-pointer rounded-xl p-3.5 border transition-all relative ${
                          isSelected
                            ? 'border-primary bg-primary-light/20 ring-2 ring-primary/20 shadow-sm'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                                isSelected
                                  ? 'border-primary bg-primary text-white'
                                  : 'border-slate-300 bg-white'
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs font-bold text-slate-800">{p.name}</h4>
                                {p.badge && (
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                      p.isPopular
                                        ? 'bg-primary text-white'
                                        : 'bg-slate-100 text-slate-600'
                                    }`}
                                  >
                                    {p.badge}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">{p.subtitle}</p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-sm font-extrabold text-slate-800">{p.price}</span>
                            <span className="text-[10px] text-slate-400 block">/ month</span>
                          </div>
                        </div>

                        {/* Features List */}
                        <div className="mt-2.5 pt-2.5 border-t border-gray-100/80 grid grid-cols-2 gap-1.5">
                          {p.features.map((feat, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 text-[11px] text-slate-600">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                              <span>{feat}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="btn-secondary py-2.5 px-4 rounded-xl flex items-center gap-1 text-xs font-semibold"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary flex-1 py-2.5 rounded-xl flex justify-center items-center gap-2 text-xs font-semibold shadow-md disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <LoadingSpinner size="sm" text="" className="text-white" />
                        <span>Setting Up Your Workspace...</span>
                      </>
                    ) : (
                      <>
                        <ArrowRight className="w-4 h-4" />
                        <span>
                          {formData.plan === 'Free'
                            ? 'Create Free Workspace & Launch'
                            : `Create Workspace & Pay for ${formData.plan}`}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Footer */}
            <div className="mt-4 pt-3 border-t border-gray-200 text-center">
              <p className="text-[11px] text-slate-500 mb-1.5">Already have an active account?</p>
              <Link
                to="/login"
                className="btn-secondary inline-flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-xl text-xs font-semibold"
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
