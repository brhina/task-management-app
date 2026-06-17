import { useState, useContext, useEffect, type FormEvent, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../../context/UserContext';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';
import { getAbsoluteImageUrl } from '../../utils/imageUtils';
import PageShell from '../../components/common/PageShell';

function ProfileUpdate() {
    const { user, updateUser } = useContext(UserContext);
    const navigate = useNavigate();
    
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
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
                confirmPassword: ''
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
        setFormData(prev => ({
            ...prev,
            [name]: value
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
                profileImageUrl: imageUrl || user?.profileImageUrl
            });

            setSuccess('Profile updated successfully!');
            
            setFormData(prev => ({
                ...prev,
                password: '',
                confirmPassword: ''
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
            <PageShell title="Please Log In" subtitle="You need to be logged in to update your profile." />
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
                                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
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
                                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
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
                                            <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                                <label className="absolute bottom-0 right-0 bg-primary text-white rounded-full p-2 cursor-pointer hover:bg-primary-hover transition-colors">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                            <p className="text-sm text-slate-400 mt-2">Click the camera icon to upload a new profile picture</p>
                        </div>

                        <div>
                            <label htmlFor="name" className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Full Name</label>
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
                            <label htmlFor="email" className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Email Address</label>
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
                            <label htmlFor="password" className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">New Password (optional)</label>
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
                            <label htmlFor="confirmPassword" className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Confirm New Password</label>
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
                            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Role</label>
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
                    </form>
                </div>
            </div>
        </PageShell>
    );
}

export default ProfileUpdate;
