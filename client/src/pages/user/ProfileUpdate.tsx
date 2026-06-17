import { useState, useContext, useEffect, useCallback, type FormEvent, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../../context/UserContext';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';
import { getAbsoluteImageUrl } from '../../utils/imageUtils';
import PageShell from '../../components/common/PageShell';
import { LogOut, Camera, User as UserIcon, CheckCircle, XCircle } from 'lucide-react';

function ProfileUpdate() {
  const { user, updateUser, clearUser } = useContext(UserContext);
  const navigate = useNavigate();

  const handleLogout = useCallback(() => {
    clearUser();
    navigate('/login');
  }, [clearUser, navigate]);

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
        setError('Please select a valid image file');
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (formData.password && formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }

      if (formData.password && formData.password.length < 6) {
        setError('Password must be at least 6 characters long');
        setLoading(false);
        return;
      }

      let imageUrl: string | null = null;
      if (profileImage) {
        try {
          imageUrl = await uploadImage();
        } catch (err) {
          setError('Failed to upload image. Please try again.');
          setLoading(false);
          return;
        }
      }

      const updateData: Record<string, string> = {
        name: formData.name,
        email: formData.email,
      };

      if (formData.password) {
        updateData.password = formData.password;
      }

      if (imageUrl) {
        updateData.profileImageUrl = imageUrl;
      }

      const response = await api.put(
        apiPaths.AUTH.UPDATE_USER_PROFILE.replace(':id', user?._id || ''),
        updateData
      );

      updateUser({
        ...user!,
        ...response.data.user,
        profileImageUrl: imageUrl || user?.profileImageUrl,
      });

      setSuccess('Profile updated successfully!');

      setFormData((prev) => ({
        ...prev,
        password: '',
        confirmPassword: '',
      }));

      setTimeout(() => {
        navigate('/user/dashboard');
      }, 2000);
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError(err.response?.data?.message || 'Failed to update profile');
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

  return (
    <PageShell
      title="Update Profile"
      subtitle="Update your personal information and profile picture"
    >
      <div className="max-w-7xl">
        <div className="card">
          {success && (
            <div className="alert-success">
              <div className="flex">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800">{success}</p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="alert-error">
              <div className="flex">
                <div className="flex-shrink-0">
                  <XCircle className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="text-center">
              <div className="relative inline-block">
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-slate-600 mx-auto">
                  {previewImage ? (
                    <img src={previewImage} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-slate-700 flex items-center justify-center">
                      <UserIcon className="w-12 h-12 text-slate-400" />
                    </div>
                  )}
                </div>
                <label className="absolute bottom-0 right-0 bg-primary text-white rounded-full p-2 cursor-pointer hover:bg-primary-hover transition-colors">
                  <Camera className="w-4 h-4" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-sm text-slate-400 mt-2">
                Click the camera icon to upload a new profile picture
              </p>
            </div>

            <div>
              <label
                htmlFor="name"
                className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1"
              >
                Full Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="input-dark w-full"
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1"
              >
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="input-dark w-full"
                placeholder="Enter your email address"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1"
              >
                New Password (optional)
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="input-dark w-full"
                placeholder="Enter new password (min 6 characters)"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1"
              >
                Confirm New Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="input-dark w-full"
                placeholder="Confirm new password"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">
                Role
              </label>
              <div className="input-dark w-full cursor-default">{user.role}</div>
              <p className="text-sm text-slate-400 mt-1">Role cannot be changed</p>
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={() => navigate('/user/dashboard')}
                className="flex-1 btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Updating...
                  </div>
                ) : (
                  'Update Profile'
                )}
              </button>
            </div>

            <div className="pt-4 border-t border-slate-700">
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-rose-300 hover:bg-rose-500/10 hover:text-rose-200 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          </form>
        </div>
      </div>
    </PageShell>
  );
}

export default ProfileUpdate;
