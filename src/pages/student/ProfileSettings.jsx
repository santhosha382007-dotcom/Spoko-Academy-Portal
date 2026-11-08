import React, { useState, useRef } from 'react';
import { User, Mail, Phone, Lock, Camera, Save, Shield, BellRing, Eye, EyeOff, CheckCircle2, AlertCircle, Loader } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const ProfileSettings = () => {
    const { user, updateUserProfile, changePassword } = useAuth();
    
    // Active navigation tab: 'general' | 'security' | 'notifications'
    const [activeTab, setActiveTab] = useState('general');

    // Profile state
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || user?.details?.email || '');
    const [phone, setPhone] = useState(user?.phone || user?.details?.phone || '');
    const [avatar, setAvatar] = useState(user?.avatar || '');
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [profileMessage, setProfileMessage] = useState(null);

    // Password state
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isSavingPassword, setIsSavingPassword] = useState(false);
    const [passwordMessage, setPasswordMessage] = useState(null);

    // Notification toggles
    const [notifSettings, setNotifSettings] = useState({
        emailAlerts: true,
        examReminders: true,
        attendanceAlerts: true
    });

    const fileInputRef = useRef(null);

    // Handle Avatar file upload
    const handleAvatarClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Please select a valid image file (PNG, JPG, WEBP).');
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            alert('Image size exceeds 2MB limit. Please choose a smaller picture.');
            return;
        }

        const reader = new FileReader();
        reader.onload = async (event) => {
            const dataUrl = event.target.result;
            setAvatar(dataUrl);
            try {
                await updateUserProfile({ avatar: dataUrl });
                setProfileMessage({ type: 'success', text: 'Profile photo updated successfully!' });
                setTimeout(() => setProfileMessage(null), 4000);
            } catch (err) {
                console.error('Avatar update failed:', err);
                setProfileMessage({ type: 'error', text: 'Failed to save updated photo.' });
            }
        };
        reader.readAsDataURL(file);
    };

    // Handle Profile Save
    const handleSaveProfile = async (e) => {
        if (e) e.preventDefault();
        setProfileMessage(null);

        if (!name.trim()) {
            setProfileMessage({ type: 'error', text: 'Full Name cannot be empty.' });
            return;
        }

        setIsSavingProfile(true);
        try {
            await updateUserProfile({
                name: name.trim(),
                email: email.trim(),
                phone: phone.trim(),
                avatar: avatar || user?.avatar
            });
            setIsEditing(false);
            setProfileMessage({ type: 'success', text: 'Profile details saved successfully!' });
            setTimeout(() => setProfileMessage(null), 4000);
        } catch (err) {
            console.error('Profile update failed:', err);
            setProfileMessage({ type: 'error', text: err.message || 'Failed to update profile.' });
        } finally {
            setIsSavingProfile(false);
        }
    };

    // Handle Password Update
    const handleUpdatePassword = async (e) => {
        if (e) e.preventDefault();
        setPasswordMessage(null);

        if (newPassword.length < 6) {
            setPasswordMessage({ type: 'error', text: 'Password must be at least 6 characters long.' });
            return;
        }

        if (newPassword !== confirmPassword) {
            setPasswordMessage({ type: 'error', text: 'New passwords do not match. Please verify.' });
            return;
        }

        setIsSavingPassword(true);
        try {
            await changePassword(newPassword);
            setNewPassword('');
            setConfirmPassword('');
            setPasswordMessage({ type: 'success', text: 'Password updated successfully!' });
            setTimeout(() => setPasswordMessage(null), 4000);
        } catch (err) {
            console.error('Password change failed:', err);
            setPasswordMessage({ type: 'error', text: err.message || 'Failed to update password.' });
        } finally {
            setIsSavingPassword(false);
        }
    };

    const departmentName = user?.department || user?.details?.department || 'Spoko Academy';
    const displayAvatar = avatar || user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=7c3aed&color=fff`;

    return (
        <div className="container" style={{ paddingTop: '1.5rem', maxWidth: '1000px', paddingBottom: '3rem' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontWeight: 800, fontSize: '1.8rem', color: '#0f172a' }}>Account Settings</h1>
                <p className="text-muted" style={{ margin: '0.25rem 0 0' }}>Manage your profile credentials, security settings, and notifications.</p>
            </div>

            <div className="settings-grid">
                {/* Left Sidebar - Profile Card */}
                <div className="profile-card-section card">
                    <div className="avatar-upload-group">
                        <div className="avatar-preview">
                            <img src={displayAvatar} alt="Profile" />
                            <input
                                type="file"
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                accept="image/*"
                                onChange={handleAvatarChange}
                            />
                            <button
                                type="button"
                                className="camera-btn"
                                onClick={handleAvatarClick}
                                title="Upload new profile picture"
                                aria-label="Change profile photo"
                            >
                                <Camera size={16} />
                            </button>
                        </div>
                        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                            <h3 style={{ margin: '0', fontSize: '1.15rem', color: '#0f172a' }}>{user?.name}</h3>
                            <p className="text-muted" style={{ fontSize: '0.82rem', marginTop: '0.25rem' }}>
                                User ID: #{user?.id || '01'}
                            </p>
                            <span className="dept-badge">{departmentName}</span>
                        </div>
                    </div>

                    <div className="profile-quick-nav">
                        <button
                            type="button"
                            className={`nav-item ${activeTab === 'general' ? 'active' : ''}`}
                            onClick={() => setActiveTab('general')}
                        >
                            <User size={18} /> General Info
                        </button>
                        <button
                            type="button"
                            className={`nav-item ${activeTab === 'security' ? 'active' : ''}`}
                            onClick={() => setActiveTab('security')}
                        >
                            <Lock size={18} /> Security & Password
                        </button>
                        <button
                            type="button"
                            className={`nav-item ${activeTab === 'notifications' ? 'active' : ''}`}
                            onClick={() => setActiveTab('notifications')}
                        >
                            <BellRing size={18} /> Notifications
                        </button>
                    </div>
                </div>

                {/* Right Area - Form Content */}
                <div className="form-section-container">
                    {/* Feedback Messages */}
                    {profileMessage && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.85rem 1rem',
                            borderRadius: '12px',
                            marginBottom: '1rem',
                            background: profileMessage.type === 'success' ? '#f0fdf4' : '#fef2f2',
                            color: profileMessage.type === 'success' ? '#166534' : '#991b1b',
                            border: `1px solid ${profileMessage.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
                            fontSize: '0.9rem',
                            fontWeight: 600
                        }}>
                            {profileMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                            <span>{profileMessage.text}</span>
                        </div>
                    )}

                    {/* TAB 1: GENERAL INFO */}
                    {activeTab === 'general' && (
                        <div className="card" style={{ marginBottom: '1.5rem' }}>
                            <div className="card-header-flex">
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a' }}>Personal Information</h3>
                                    <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                                        {isEditing ? 'Make edits and click Save Changes below' : 'View or edit your registered personal profile'}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (isEditing) {
                                            setName(user?.name || '');
                                            setEmail(user?.email || user?.details?.email || '');
                                            setPhone(user?.phone || user?.details?.phone || '');
                                        }
                                        setIsEditing(!isEditing);
                                    }}
                                    className={`btn btn-sm ${isEditing ? 'btn-outline' : 'btn-primary'}`}
                                >
                                    {isEditing ? 'Cancel Edit' : 'Edit Profile'}
                                </button>
                            </div>

                            <form onSubmit={handleSaveProfile}>
                                <div className="form-grid">
                                    <div className="input-group-premium">
                                        <label><User size={14} /> Full Name</label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            disabled={!isEditing}
                                            required
                                        />
                                    </div>
                                    <div className="input-group-premium">
                                        <label><Mail size={14} /> Email Address</label>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            disabled={!isEditing}
                                            placeholder="e.g. user@spokoacademy.edu"
                                        />
                                    </div>
                                    <div className="input-group-premium">
                                        <label><Phone size={14} /> Mobile Phone Number</label>
                                        <input
                                            type="text"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            disabled={!isEditing}
                                            placeholder="10-digit mobile number"
                                        />
                                    </div>
                                    <div className="input-group-premium">
                                        <label><Shield size={14} /> Department / Faculty</label>
                                        <input
                                            type="text"
                                            value={departmentName}
                                            disabled
                                            title="Assigned by Academic Administration"
                                        />
                                    </div>
                                </div>

                                {isEditing && (
                                    <div style={{ marginTop: '2rem', display: 'flex', gap: '0.75rem' }}>
                                        <button
                                            type="submit"
                                            className="btn btn-primary"
                                            disabled={isSavingProfile}
                                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#7c3aed' }}
                                        >
                                            {isSavingProfile ? <Loader className="spin" size={18} /> : <Save size={18} />}
                                            <span>{isSavingProfile ? 'Saving Changes...' : 'Save Changes'}</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsEditing(false)}
                                            className="btn btn-outline"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                )}
                            </form>
                        </div>
                    )}

                    {/* TAB 2: SECURITY & PASSWORD */}
                    {activeTab === 'security' && (
                        <div className="card">
                            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.2rem', color: '#0f172a' }}>Security & Password</h3>
                            <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                                Update your password to keep your academic account secure. Minimum 6 characters required.
                            </p>

                            {passwordMessage && (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.85rem 1rem',
                                    borderRadius: '12px',
                                    marginBottom: '1.5rem',
                                    background: passwordMessage.type === 'success' ? '#f0fdf4' : '#fef2f2',
                                    color: passwordMessage.type === 'success' ? '#166534' : '#991b1b',
                                    border: `1px solid ${passwordMessage.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
                                    fontSize: '0.9rem',
                                    fontWeight: 600
                                }}>
                                    {passwordMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                                    <span>{passwordMessage.text}</span>
                                </div>
                            )}

                            <form onSubmit={handleUpdatePassword} style={{ maxWidth: '480px' }}>
                                <div className="input-group-premium">
                                    <label><Lock size={14} /> New Password</label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Enter minimum 6 characters"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            required
                                        />
                                        <button
                                            type="button"
                                            className="toggle-pass"
                                            onClick={() => setShowPassword(!showPassword)}
                                            title={showPassword ? "Hide password" : "Show password"}
                                            aria-label="Toggle password visibility"
                                        >
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="input-group-premium">
                                    <label><Lock size={14} /> Confirm New Password</label>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Re-type new password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={isSavingPassword || !newPassword}
                                    style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#7c3aed' }}
                                >
                                    {isSavingPassword ? <Loader className="spin" size={18} /> : <Save size={18} />}
                                    <span>{isSavingPassword ? 'Updating...' : 'Update Password'}</span>
                                </button>
                            </form>
                        </div>
                    )}

                    {/* TAB 3: NOTIFICATIONS */}
                    {activeTab === 'notifications' && (
                        <div className="card">
                            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.2rem', color: '#0f172a' }}>Notification Preferences</h3>
                            <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                                Choose which alerts and announcements you receive on this device.
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '0.75rem', borderRadius: '10px', background: '#f8fafc' }}>
                                    <div>
                                        <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' }}>Email Notifications</div>
                                        <div style={{ color: '#64748b', fontSize: '0.8rem' }}>Receive important score updates and official reports via email</div>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={notifSettings.emailAlerts}
                                        onChange={(e) => setNotifSettings({ ...notifSettings, emailAlerts: e.target.checked })}
                                        style={{ width: '20px', height: '20px', accentColor: '#7c3aed' }}
                                    />
                                </label>

                                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '0.75rem', borderRadius: '10px', background: '#f8fafc' }}>
                                    <div>
                                        <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' }}>Assessment & Exam Reminders</div>
                                        <div style={{ color: '#64748b', fontSize: '0.8rem' }}>Get notified when a new test is assigned or schedules change</div>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={notifSettings.examReminders}
                                        onChange={(e) => setNotifSettings({ ...notifSettings, examReminders: e.target.checked })}
                                        style={{ width: '20px', height: '20px', accentColor: '#7c3aed' }}
                                    />
                                </label>

                                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '0.75rem', borderRadius: '10px', background: '#f8fafc' }}>
                                    <div>
                                        <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' }}>Daily Attendance Reminders</div>
                                        <div style={{ color: '#64748b', fontSize: '0.8rem' }}>Daily reminder to log attendance before campus cutoff time</div>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={notifSettings.attendanceAlerts}
                                        onChange={(e) => setNotifSettings({ ...notifSettings, attendanceAlerts: e.target.checked })}
                                        style={{ width: '20px', height: '20px', accentColor: '#7c3aed' }}
                                    />
                                </label>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                .settings-grid { display: grid; grid-template-columns: 320px 1fr; gap: 2rem; align-items: start; }
                
                .avatar-upload-group { display: flex; flex-direction: column; align-items: center; padding-bottom: 2rem; border-bottom: 1px solid #f1f5f9; }
                .avatar-preview { position: relative; width: 120px; height: 120px; }
                .avatar-preview img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; border: 4px solid #f8fafc; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
                .camera-btn { position: absolute; bottom: 0; right: 0; width: 36px; height: 36px; border-radius: 50%; background: #7c3aed; color: white; border: 3px solid white; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 6px rgba(0,0,0,0.2); }
                .camera-btn:hover { background: #6d28d9; transform: scale(1.1); }
                
                .dept-badge { margin-top: 1rem; display: inline-block; padding: 4px 12px; background: #eef2ff; color: #6366f1; border-radius: 99px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; }

                .profile-quick-nav { padding-top: 1rem; display: flex; flex-direction: column; gap: 0.5rem; }
                .nav-item { display: flex; align-items: center; gap: 1rem; padding: 0.85rem 1.25rem; border-radius: 12px; color: #64748b; font-weight: 600; font-size: 0.9rem; transition: all 0.2s; border: none; background: transparent; cursor: pointer; text-align: left; width: 100%; }
                .nav-item:hover { background: #f8fafc; color: #1e293b; }
                .nav-item.active { background: #f5f3ff; color: #7c3aed; font-weight: 700; }

                .card-header-flex { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
                .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
                
                .input-group-premium { margin-bottom: 1rem; }
                .input-group-premium label { display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 0.5rem; }
                .input-group-premium input { width: 100%; padding: 0.85rem 1.25rem; border-radius: 12px; border: 1px solid #e2e8f0; background: #f8fafc; font-size: 0.95rem; font-weight: 500; transition: all 0.2s; box-sizing: border-box; }
                .input-group-premium input:focus { border-color: #7c3aed; background: white; outline: none; box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.1); }
                .input-group-premium input:disabled { opacity: 0.7; cursor: not-allowed; background: #f1f5f9; }

                .toggle-pass { position: absolute; right: 1rem; top: 50%; transform: translateY(-50%); color: #64748b; border: none; background: transparent; cursor: pointer; display: flex; align-items: center; }
                .toggle-pass:hover { color: #1e293b; }

                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                
                @media (max-width: 900px) {
                    .settings-grid { grid-template-columns: 1fr; }
                    .form-grid { grid-template-columns: 1fr; }
                }
            `}</style>
        </div>
    );
};

export default ProfileSettings;
