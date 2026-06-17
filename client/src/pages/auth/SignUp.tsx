import { useState, useContext, useMemo, useEffect, type FormEvent, type ChangeEvent } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
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
}

function SignUp() {
  const [searchParams] = useSearchParams();
  const orgInviteToken = searchParams.get('invite');

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
  const [showAdminToken, setShowAdminToken] = useState(false);
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

  const validateForm = () => {
    const errors: FieldErrors = {};

    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters long';
    } else if (passwordStrength && passwordStrength.score < 2) {
      errors.password = 'Password is too weak';
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
      if (user.role === 'Admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/user/dashboard');
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

  const inputClass = (hasError: boolean) =>
    `input-dark block w-full pl-10 pr-3 py-2 text-sm transition-colors ${hasError ? 'border-rose-500/60 ring-2 ring-rose-500/15' : ''}`;

  return (
    <PublicLayout>
      <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-2 gap-8 items-center py-8">
        <div className="hidden lg:block">
          <div className="max-w-lg">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
              Create account
            </div>
            <h1 className="mt-4 text-4xl font-extrabold text-white tracking-tight">
              Start managing work with clarity.
            </h1>
            <p className="mt-3 text-slate-300 leading-relaxed">
              Create your account to access projects, goals, and task insights for your
              organization.
            </p>
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm font-semibold text-slate-100">Admin token (optional)</div>
              <div className="mt-1 text-sm text-slate-400">
                If you have an invite token, you can register as an admin during sign-up.
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-md">
          <div className="text-center mb-6 lg:hidden">
            <h2 className="text-3xl font-extrabold text-white mb-2">Create your account</h2>
            <p className="text-sm text-slate-300">Join Task Manager and start managing tasks</p>
          </div>

          <div className="card p-5 sm:p-6">
            {orgInviteToken && inviteStatus === 'valid' && (
              <div className="mb-4 p-3 bg-primary/10 border border-primary/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                    />
                  </svg>
                  <div className="text-sm">
                    <span className="font-medium text-primary">
                      You've been invited to join an organization!
                    </span>
                    <span className="text-slate-400 ml-1">
                      Complete your registration to accept.
                    </span>
                  </div>
                </div>
              </div>
            )}
            {orgInviteToken && inviteStatus === 'invalid' && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-rose-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div className="text-sm">
                    <span className="font-medium text-rose-400">
                      Invalid or expired invite link.
                    </span>
                    <span className="text-slate-400 ml-1">You can still create an account.</span>
                  </div>
                </div>
              </div>
            )}
            <form className="space-y-3.5" onSubmit={handleSubmit}>
              {error && <div className="alert-error">{error}</div>}

              <div>
                <label
                  htmlFor="name"
                  className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1"
                >
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg
                      className="h-5 w-5 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </div>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className={inputClass(!!fieldErrors.name)}
                    placeholder="John Doe"
                  />
                </div>
                {fieldErrors.name && (
                  <p className="mt-1 text-sm text-rose-200 flex items-center">
                    <svg
                      className="w-4 h-4 mr-1 text-rose-300"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {fieldErrors.name}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1"
                >
                  Email address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg
                      className="h-5 w-5 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                      />
                    </svg>
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className={inputClass(!!fieldErrors.email)}
                    placeholder="you@example.com"
                  />
                </div>
                {fieldErrors.email && (
                  <p className="mt-1 text-sm text-rose-200 flex items-center">
                    <svg
                      className="w-4 h-4 mr-1 text-rose-300"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
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
                    <svg
                      className="h-5 w-5 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className={inputClass(!!fieldErrors.password)}
                    placeholder="Create a strong password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg
                        className="h-5 w-5 text-slate-400 hover:text-slate-200"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0L3 3m3.29 3.29L3 3"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="h-5 w-5 text-slate-400 hover:text-slate-200"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
                {formData.password && passwordStrength && passwordStrengthLabel && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-400">Password strength:</span>
                      <span className={`text-xs font-semibold ${passwordStrengthLabel.color}`}>
                        {passwordStrengthLabel.label}
                      </span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${passwordStrengthLabel.bgColor}`}
                        style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                      ></div>
                    </div>
                    {passwordStrength.feedback.length > 0 && (
                      <ul className="mt-2 text-xs text-slate-400 space-y-1">
                        {passwordStrength.feedback.map((item, index) => (
                          <li key={index} className="flex items-center">
                            <svg
                              className="w-3 h-3 mr-1 text-slate-500"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                clipRule="evenodd"
                              />
                            </svg>
                            {item}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                {fieldErrors.password && (
                  <p className="mt-1 text-sm text-rose-200 flex items-center">
                    <svg
                      className="w-4 h-4 mr-1 text-rose-300"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1"
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg
                      className="h-5 w-5 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={`input-dark block w-full pl-10 pr-10 py-2 text-sm transition-colors ${
                      fieldErrors.confirmPassword
                        ? 'border-rose-500/60 ring-2 ring-rose-500/15'
                        : ''
                    }`}
                    placeholder="Confirm your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? (
                      <svg
                        className="h-5 w-5 text-slate-400 hover:text-slate-200"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0L3 3m3.29 3.29L3 3"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="h-5 w-5 text-slate-400 hover:text-slate-200"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
                {formData.confirmPassword &&
                  formData.password === formData.confirmPassword &&
                  !fieldErrors.confirmPassword && (
                    <p className="mt-1 text-sm text-emerald-200 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Passwords match
                    </p>
                  )}
                {fieldErrors.confirmPassword && (
                  <p className="mt-1 text-sm text-rose-200 flex items-center">
                    <svg
                      className="w-4 h-4 mr-1 text-rose-300"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {fieldErrors.confirmPassword}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="profileImageUrl"
                  className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1"
                >
                  Profile Image URL <span className="text-slate-500 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg
                      className="h-5 w-5 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <input
                    id="profileImageUrl"
                    name="profileImageUrl"
                    type="url"
                    value={formData.profileImageUrl}
                    onChange={handleChange}
                    className={inputClass(!!fieldErrors.profileImageUrl)}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
                {fieldErrors.profileImageUrl && (
                  <p className="mt-1 text-sm text-rose-200 flex items-center">
                    <svg
                      className="w-4 h-4 mr-1 text-rose-300"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {fieldErrors.profileImageUrl}
                  </p>
                )}
              </div>

              <div className="flex items-center p-3 bg-white/5 rounded-xl border border-white/10">
                <input
                  id="showAdminToken"
                  name="showAdminToken"
                  type="checkbox"
                  checked={showAdminToken}
                  onChange={(e) => setShowAdminToken(e.target.checked)}
                  className="h-4 w-4 text-primary focus:ring-primary border-white/20 rounded"
                />
                <label htmlFor="showAdminToken" className="ml-3 block text-sm text-slate-200">
                  I have an admin invite token
                </label>
              </div>

              {showAdminToken && (
                <div>
                  <label
                    htmlFor="adminInviteToken"
                    className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1"
                  >
                    Admin Invite Token
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg
                        className="h-5 w-5 text-slate-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                        />
                      </svg>
                    </div>
                    <input
                      id="adminInviteToken"
                      name="adminInviteToken"
                      type="text"
                      value={formData.adminInviteToken}
                      onChange={handleChange}
                      className="input-dark block w-full pl-10 pr-3 py-2 text-sm"
                      placeholder="Enter admin invite token"
                    />
                  </div>
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full flex justify-center items-center py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <LoadingSpinner size="sm" text="" className="mr-2" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                        />
                      </svg>
                      Create account
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
                  <span className="px-3 bg-app-panel2 text-slate-500">
                    Already have an account?
                  </span>
                </div>
              </div>
              <Link to="/login" className="btn-ghost w-full flex justify-center items-center py-2">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                  />
                </svg>
                Sign in to existing account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

export default SignUp;
