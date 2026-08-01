import { useState, useContext, useEffect, useCallback, type FormEvent, type ChangeEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserContext } from '../../context/UserContext';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';
import { getAbsoluteImageUrl } from '../../utils/imageUtils';
import PageShell from '../../components/common/PageShell';
import ConfirmModal from '../../components/common/ConfirmModal';
import NavTabs, { type TabItem } from '../../components/common/NavTabs';
import { validatePassword, getPasswordStrengthLabel } from '../../utils/validation';
import { ROLE_LABELS } from '../../constants/permissions';
import {
  User as UserIcon,
  Mail,
  Lock,
  Camera,
  Shield,
  CheckCircle,
  XCircle,
  LogOut,
  Copy,
  Check,
  ExternalLink,
  Layers,
  Clock,
  TrendingUp,
  Users,
  Briefcase,
  Bell,
  KeyRound,
  Sparkles,
  Trash2,
  Building,
  CheckCircle2,
} from 'lucide-react';

type ProfileTab = 'general' | 'security' | 'productivity' | 'workspaces' | 'preferences';

interface MemberPerformanceData {
  user: {
    _id: string;
    name: string;
    email: string;
    profileImageUrl?: string;
    role: string;
    teams: Array<{
      _id: string;
      name: string;
      description?: string;
    }>;
  };
  statistics: {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    pendingTasks: number;
    overdueTasks: number;
    completedLast30Days: number;
    completionRate: number;
    workloadStatus: string;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
  };
}

function ProfileUpdate() {
  const { user, updateUser, clearUser, getEffectiveRole } = useContext(UserContext);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<ProfileTab>('general');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Performance stats state
  const [perfData, setPerfData] = useState<MemberPerformanceData | null>(null);
  const [perfLoading, setPerfLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        password: '',
        confirmPassword: '',
      });
      const imageUrl = user.profileImageUrl || '';
      setPreviewImage(getAbsoluteImageUrl(imageUrl));
    }
  }, [user]);

  // Fetch logged in user's performance statistics & assigned teams
  const fetchPerformance = useCallback(async () => {
    if (!user?._id) return;
    try {
      setPerfLoading(true);
      const res = await api.get(apiPaths.USERS.PERFORMANCE.replace(':id', user._id));
      if (res.data?.data) {
        setPerfData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch user performance data:', err);
    } finally {
      setPerfLoading(false);
    }
  }, [user?._id]);

  useEffect(() => {
    fetchPerformance();
  }, [fetchPerformance]);

  useEffect(() => {
    return () => {
      if (previewImage && previewImage.startsWith('blob:')) {
        URL.revokeObjectURL(previewImage);
      }
    };
  }, [previewImage]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file (PNG, JPG, WebP)');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setError('Image size should be less than 5MB');
        return;
      }

      if (previewImage && previewImage.startsWith('blob:')) {
        URL.revokeObjectURL(previewImage);
      }

      setProfileImage(file);
      setPreviewImage(URL.createObjectURL(file));
      setError('');
    }
  };

  const handleRemoveImage = () => {
    if (previewImage && previewImage.startsWith('blob:')) {
      URL.revokeObjectURL(previewImage);
    }
    setProfileImage(null);
    setPreviewImage('');
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!profileImage) return null;

    const uploadFormData = new FormData();
    uploadFormData.append('image', profileImage);

    try {
      const response = await api.post(apiPaths.UPLOADS.UPLOAD_IMAGE, uploadFormData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data.imageUrl;
    } catch (err) {
      console.error('Error uploading image:', err);
      throw new Error('Failed to upload image');
    }
  };

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    variant?: 'danger' | 'warning' | 'info' | 'success';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const handleLogout = useCallback(() => {
    setConfirmModal({
      isOpen: true,
      title: 'Sign Out',
      message: 'Are you sure you want to sign out of your account?',
      confirmText: 'Sign Out',
      variant: 'danger',
      onConfirm: () => {
        clearUser();
        navigate('/login');
      },
    });
  }, [clearUser, navigate]);

  const handleCopyEmail = () => {
    if (user?.email) {
      navigator.clipboard.writeText(user.email);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  const handleUpdateGeneralProfile = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (!formData.name.trim()) {
        setError('Name cannot be empty.');
        setLoading(false);
        return;
      }

      let imageUrl: string | null = null;
      if (profileImage) {
        try {
          imageUrl = await uploadImage();
        } catch (err) {
          setError('Failed to upload profile image. Please try again.');
          setLoading(false);
          return;
        }
      }

      const updateData: Record<string, string> = {
        name: formData.name.trim(),
        email: formData.email.trim(),
      };

      if (imageUrl !== null) {
        updateData.profileImageUrl = imageUrl;
      } else if (!previewImage && user?.profileImageUrl) {
        updateData.profileImageUrl = '';
      }

      const response = await api.put(
        apiPaths.AUTH.UPDATE_USER_PROFILE.replace(':id', user?._id || ''),
        updateData
      );

      updateUser({
        ...user!,
        ...response.data.user,
        profileImageUrl: imageUrl !== null ? imageUrl : previewImage ? user?.profileImageUrl : '',
      });

      setSuccess('Profile details updated successfully!');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (!formData.password) {
      setError('Please enter a new password');
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('New passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      const response = await api.put(
        apiPaths.AUTH.UPDATE_USER_PROFILE.replace(':id', user?._id || ''),
        {
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }
      );

      updateUser({
        ...user!,
        ...response.data.user,
      });

      setSuccess('Password updated successfully!');
      setFormData((prev) => ({
        ...prev,
        password: '',
        confirmPassword: '',
      }));
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      console.error('Error updating password:', err);
      setError(err.response?.data?.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <PageShell
        title="Please Log In"
        subtitle="You need to be logged in to update your profile."
      />
    );
  }

  // Calculate password strength
  const pwordStrength = validatePassword(formData.password);
  const pwordLabel = getPasswordStrengthLabel(pwordStrength);

  const effectiveRole = getEffectiveRole();
  const displayRoleLabel = effectiveRole
    ? ROLE_LABELS[effectiveRole as keyof typeof ROLE_LABELS] || effectiveRole
    : user.role;

  const tabs: TabItem<ProfileTab>[] = [
    { id: 'general', label: 'General Info', icon: UserIcon },
    { id: 'security', label: 'Security & Password', icon: Lock },
    { id: 'productivity', label: 'Productivity Snapshot', icon: TrendingUp },
    { id: 'workspaces', label: 'Workspaces & Teams', icon: Users },
    { id: 'preferences', label: 'Preferences', icon: Bell },
  ];

  return (
    <PageShell
      title="User Profile & Settings"
      subtitle="Manage your personal account preferences, identity, security, and team affiliations"
    >
      <div className="space-y-4 pb-8 max-w-7xl mx-auto">
        {/* Global Notifications */}
        {success && (
          <div className="alert-success flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
              <p className="text-sm font-medium text-emerald-800">{success}</p>
            </div>
            <button
              onClick={() => setSuccess('')}
              className="text-emerald-700 hover:text-emerald-900 text-xs font-bold"
            >
              Dismiss
            </button>
          </div>
        )}

        {error && (
          <div className="alert-error flex items-center justify-between">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-rose-600 shrink-0" />
              <p className="text-sm font-medium text-rose-800">{error}</p>
            </div>
            <button
              onClick={() => setError('')}
              className="text-rose-700 hover:text-rose-900 text-xs font-bold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Profile Hero Banner */}
        <div className="card overflow-hidden relative border border-app-border">
          {/* Header background accent gradient */}
          <div className="h-28 bg-gradient-to-r from-sky-500 via-primary to-indigo-600 rounded-t-lg -mx-4 -mt-4 relative">
            <div className="absolute inset-0 bg-black/10"></div>
          </div>

          <div className="relative px-2 sm:px-4 pb-2 flex flex-col md:flex-row md:items-end justify-between gap-4 -mt-12">
            {/* Avatar & Basic Info */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <div className="relative group shrink-0">
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-md bg-white">
                  {previewImage ? (
                    <img
                      src={previewImage}
                      alt={user.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-primary/10 text-primary font-bold text-2xl flex items-center justify-center">
                      {user.name
                        ?.split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2) || 'U'}
                    </div>
                  )}
                </div>
                <label
                  htmlFor="hero-avatar-input"
                  className="absolute bottom-1 right-1 bg-primary text-white p-2 rounded-full shadow-lg cursor-pointer hover:bg-primary-hover transition-transform hover:scale-105"
                  title="Upload profile image"
                >
                  <Camera className="w-4 h-4" />
                  <input
                    id="hero-avatar-input"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold text-slate-900">{user.name}</h1>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                    <Shield className="w-3 h-3" />
                    {displayRoleLabel}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                    {user.role} System Access
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    {user.email}
                  </span>
                  <button
                    onClick={handleCopyEmail}
                    className="text-slate-400 hover:text-primary transition-colors flex items-center gap-1"
                    title="Copy Email"
                  >
                    {copiedEmail ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Actions Strip */}
            <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0">
              <Link
                to={`/users/${user._id}/performance`}
                className="btn-secondary text-xs flex items-center gap-1.5"
              >
                <TrendingUp className="w-3.5 h-3.5 text-primary" />
                <span>Performance Dashboard</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </Link>

              <button
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-lg border border-rose-200 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick KPI Stat Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="card p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-semibold text-slate-400">
                Assigned Tasks
              </div>
              <div className="text-base font-bold text-slate-800 tabular-nums">
                {perfData?.statistics?.totalTasks ?? user.pendingTasks ?? 0}
              </div>
            </div>
          </div>

          <div className="card p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-semibold text-slate-400">
                Completion Rate
              </div>
              <div className="text-base font-bold text-emerald-700 tabular-nums">
                {perfData?.statistics?.completionRate ?? 0}%
              </div>
            </div>
          </div>

          <div className="card p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sky-50 text-sky-600">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-semibold text-slate-400">Workload</div>
              <div className="text-xs font-bold text-slate-800">
                {perfData?.statistics?.workloadStatus || 'Balanced'}
              </div>
            </div>
          </div>

          <div className="card p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-semibold text-slate-400">
                30d Velocity
              </div>
              <div className="text-base font-bold text-indigo-700 tabular-nums">
                {perfData?.statistics?.completedLast30Days ?? 0} Done
              </div>
            </div>
          </div>

          <div className="card p-3 flex items-center gap-3 col-span-2 sm:col-span-1">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-semibold text-slate-400">Teams</div>
              <div className="text-base font-bold text-slate-800 tabular-nums">
                {(perfData?.user?.teams || []).length}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-app-panel p-2 rounded-xl border border-app-border">
          <NavTabs<ProfileTab>
            tabs={tabs}
            activeTab={activeTab}
            onChange={(tab) => {
              setActiveTab(tab);
              setError('');
              setSuccess('');
            }}
            variant="pill"
          />
        </div>

        {/* Tab Content Views */}
        {activeTab === 'general' && (
          <div className="card space-y-6">
            <div className="border-b border-gray-100 pb-3">
              <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-primary" />
                Personal & Contact Details
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Update your identity details, display name, and avatar picture across the platform.
              </p>
            </div>

            <form onSubmit={handleUpdateGeneralProfile} className="space-y-5">
              {/* Profile Photo Uploader Section */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="w-16 h-16 rounded-full overflow-hidden border border-slate-300 bg-white shrink-0">
                  {previewImage ? (
                    <img
                      src={previewImage}
                      alt="Profile Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-xl">
                      {formData.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 flex-1">
                  <div className="text-xs font-semibold text-slate-700">Profile Avatar Photo</div>
                  <p className="text-xs text-slate-500">
                    Supports PNG, JPG, or WebP files up to 5MB.
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <label className="btn-secondary text-xs cursor-pointer flex items-center gap-1.5 py-1 px-3">
                      <Camera className="w-3.5 h-3.5 text-primary" />
                      <span>Choose New File</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                    {previewImage && (
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="text-xs text-rose-600 hover:text-rose-800 font-medium px-2 py-1 flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        Remove Photo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Form Input Fields */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="field-label mb-1">
                    Full Display Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="input-icon-wrapper">
                    <UserIcon className="input-icon w-4 h-4" />
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="input-field w-full"
                      placeholder="Enter your full name"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="field-label mb-1">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <div className="input-icon-wrapper">
                    <Mail className="input-icon w-4 h-4" />
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="input-field w-full"
                      placeholder="Enter your email address"
                    />
                  </div>
                </div>
              </div>

              {/* Role & Access Info (Read Only) */}
              <div className="grid sm:grid-cols-2 gap-4 pt-2">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mb-1">
                    System Account Role
                  </span>
                  <div className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-primary" />
                    {user.role}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Defines platform-wide default authorization permissions.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mb-1">
                    Workspace Role
                  </span>
                  <div className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-indigo-500" />
                    {displayRoleLabel}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Active role in your current organization context.
                  </p>
                </div>
              </div>

              {/* Submit CTA */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                      <span>Saving Profile...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Save General Details</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="card space-y-6">
            <div className="border-b border-gray-100 pb-3">
              <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-primary" />
                Security & Password Management
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Update your account password and review security options.
              </p>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="password" className="field-label mb-1">
                    New Password
                  </label>
                  <div className="input-icon-wrapper">
                    <Lock className="input-icon w-4 h-4" />
                    <input
                      type="password"
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="input-field w-full"
                      placeholder="Enter new password"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="field-label mb-1">
                    Confirm New Password
                  </label>
                  <div className="input-icon-wrapper">
                    <Lock className="input-icon w-4 h-4" />
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className="input-field w-full"
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>
              </div>

              {/* Password Strength Progress Bar & Criteria */}
              {formData.password && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">Password Strength</span>
                    <span className={`font-bold ${pwordLabel.color}`}>{pwordLabel.label}</span>
                  </div>

                  {/* Strength Bar Indicator */}
                  <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden flex gap-1 p-0.5">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className={`h-full flex-1 rounded-full transition-colors ${
                          level <= pwordStrength.score
                            ? pwordStrength.score <= 2
                              ? 'bg-rose-500'
                              : pwordStrength.score <= 3
                              ? 'bg-amber-500'
                              : pwordStrength.score <= 4
                              ? 'bg-blue-500'
                              : 'bg-emerald-500'
                            : 'bg-slate-200'
                        }`}
                      ></div>
                    ))}
                  </div>

                  {/* Password Checklist Criteria */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-1">
                    <div
                      className={`flex items-center gap-1.5 ${
                        formData.password.length >= 6 ? 'text-emerald-700 font-semibold' : 'text-slate-400'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>At least 6 characters</span>
                    </div>

                    <div
                      className={`flex items-center gap-1.5 ${
                        /[A-Z]/.test(formData.password) ? 'text-emerald-700 font-semibold' : 'text-slate-400'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>One uppercase letter</span>
                    </div>

                    <div
                      className={`flex items-center gap-1.5 ${
                        /[a-z]/.test(formData.password) ? 'text-emerald-700 font-semibold' : 'text-slate-400'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>One lowercase letter</span>
                    </div>

                    <div
                      className={`flex items-center gap-1.5 ${
                        /[0-9]/.test(formData.password) ? 'text-emerald-700 font-semibold' : 'text-slate-400'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>One number</span>
                    </div>

                    <div
                      className={`flex items-center gap-1.5 ${
                        /[!@#$%^&*(),.?":{}|<>]/.test(formData.password)
                          ? 'text-emerald-700 font-semibold'
                          : 'text-slate-400'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>One special character</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Security Banner Card */}
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-start gap-3 text-xs text-amber-800">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-amber-900">Security Recommendation</div>
                  <p className="mt-0.5 text-amber-800">
                    Always use strong, unique passwords across your accounts. If you suspect any unauthorized access, update your password immediately and sign out of active sessions.
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign out of account</span>
                </button>

                <button
                  type="submit"
                  disabled={loading || !formData.password}
                  className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Update Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'productivity' && (
          <div className="card space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Personal Productivity & Performance Summary
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Overview of your assigned tasks, workload status, and completion metrics.
                </p>
              </div>

              <Link
                to={`/users/${user._id}/performance`}
                className="btn-primary text-xs flex items-center gap-1.5"
              >
                <span>Full Analytics Dashboard</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>

            {perfLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : perfData ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-xs font-semibold text-slate-500">Total Tasks</div>
                    <div className="text-xl font-bold text-slate-800 mt-1 tabular-nums">
                      {perfData.statistics.totalTasks}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                    <div className="text-xs font-semibold text-emerald-800">Completed</div>
                    <div className="text-xl font-bold text-emerald-700 mt-1 tabular-nums">
                      {perfData.statistics.completedTasks}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-sky-50 border border-sky-200">
                    <div className="text-xs font-semibold text-sky-800">In Progress</div>
                    <div className="text-xl font-bold text-sky-700 mt-1 tabular-nums">
                      {perfData.statistics.inProgressTasks}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
                    <div className="text-xs font-semibold text-rose-800">Overdue</div>
                    <div className="text-xl font-bold text-rose-700 mt-1 tabular-nums">
                      {perfData.statistics.overdueTasks}
                    </div>
                  </div>
                </div>

                {/* Progress bar visual */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-700">Completion Velocity</span>
                    <span className="text-emerald-600">{perfData.statistics.completionRate}% Done</span>
                  </div>
                  <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                      style={{ width: `${perfData.statistics.completionRate}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-slate-400">
                No task performance metrics recorded yet.
              </div>
            )}
          </div>
        )}

        {activeTab === 'workspaces' && (
          <div className="card space-y-5">
            <div className="border-b border-gray-100 pb-3">
              <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Workspaces & Team Memberships
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Teams and organizations you are currently a member of.
              </p>
            </div>

            {/* Teams List */}
            <div className="space-y-3">
              <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Assigned Teams ({(perfData?.user?.teams || []).length})
              </div>

              {(perfData?.user?.teams || []).length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-400 italic">
                  You are not assigned to any specific teams yet. An administrator can add you to teams in Users & Teams settings.
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {(perfData?.user?.teams || []).map((team) => (
                    <div
                      key={team._id}
                      className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3 hover:border-slate-300 transition-colors"
                    >
                      <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800">{team.name}</div>
                        {team.description && (
                          <div className="text-[11px] text-slate-500 mt-0.5">{team.description}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'preferences' && (
          <div className="card space-y-5">
            <div className="border-b border-gray-100 pb-3">
              <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" />
                Account Preferences & Notification Center
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Customize your email notifications, digest frequency, and alert channels.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-primary" />
                  Notification Preferences & Alert Channels
                </div>
                <p className="text-xs text-slate-500">
                  Configure detailed alert settings for task assignments, due dates, project updates, and daily digests.
                </p>
              </div>

              <Link to="/settings/notifications" className="btn-primary text-xs shrink-0">
                Manage Notification Settings
              </Link>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        variant={confirmModal.variant}
      />
    </PageShell>
  );
}

export default ProfileUpdate;
