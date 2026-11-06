import React, { useState } from 'react';
import { User, Mail, Phone, Lock, Camera, Save, Shield, BellRing, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const ProfileSettings = () => {
    const { user } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    return (
        <div className="container" style={{ paddingTop: '2rem', maxWidth: '1000px' }}>
            <div style={{ marginBottom: '2.5rem' }}>
                <h1 style={{ fontWeight: 800 }}>Account Settings</h1>
                <p className="text-muted">Manage your profile information and account preferences.</p>
            </div>

            <div className="settings-grid">
                {/* Left Sidebar - Profile Card */}
                <div className="profile-card-section card">
                    <div className="avatar-upload-group">
                        <div className="avatar-preview">
                            <img src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name}&background=7c3aed&color=fff`} alt="Profile" />
                            <button className="camera-btn"><Camera size={16} /></button>
                        </div>
                        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                            <h3 style={{ margin: '0' }}>{user?.name}</h3>
                            <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Student ID: #SP-2024-{user?.id || '01'}</p>
                            <span className="dept-badge">{user?.details?.department || 'Railways'}</span>
                        </div>
                    </div>

                    <div className="profile-quick-nav">
                        <button className="nav-item active"><User size={18} /> General Info</button>
                        <button className="nav-item"><Lock size={18} /> Security</button>
                        <button className="nav-item"><BellRing size={18} /> Notifications</button>
                    </div>
                </div>

                {/* Right Area - Form Content */}
                <div className="form-section-container">
                    <div className="card" style={{ marginBottom: '1.5rem' }}>
                        <div className="card-header-flex">
                            <h3 style={{ margin: 0 }}>Personal Information</h3>
                            <button onClick={() => setIsEditing(!isEditing)} className={`btn btn-sm ${isEditing ? 'btn-outline' : 'btn-primary'}`}>
                                {isEditing ? 'Cancel' : 'Edit Profile'}
                            </button>
                        </div>

                        <div className="form-grid">
                            <div className="input-group-premium">
                                <label><User size={14} /> Full Name</label>
                                <input type="text" defaultValue={user?.name} disabled={!isEditing} />
                            </div>
                            <div className="input-group-premium">
                                <label><Mail size={14} /> Email Address</label>
                                <input type="email" defaultValue={user?.email || 'student@spoko.com'} disabled={!isEditing} />
                            </div>
                            <div className="input-group-premium">
                                <label><Phone size={14} /> Phone Number</label>
                                <input type="text" defaultValue={user?.phone || '+91 98765 43210'} disabled={!isEditing} />
                            </div>
                            <div className="input-group-premium">
                                <label><Shield size={14} /> Department</label>
                                <input type="text" defaultValue={user?.details?.department || 'Railways'} disabled />
                            </div>
                        </div>

                        {isEditing && (
                            <button className="btn btn-primary" style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Save size={18} /> Save Changes
                            </button>
                        )}
                    </div>

                    <div className="card">
                        <h3 style={{ marginBottom: '1.5rem' }}>Security Settings</h3>
                        <div className="input-group-premium">
                            <label><Lock size={14} /> New Password</label>
                            <div style={{ position: 'relative' }}>
                                <input type={showPassword ? "text" : "password"} placeholder="Enter new password" />
                                <button className="toggle-pass" onClick={() => setShowPassword(!showPassword)}>
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>
                        <button className="btn btn-outline" style={{ marginTop: '1.5rem' }}>Update Password</button>
                    </div>

                    <div className="card" style={{ marginTop: '1.5rem' }}>
                        <h3 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Shield size={20} color="#6366f1" /> Mobile & Network Connection
                        </h3>
                        <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                            Configure the portal server endpoint for Mobile APK and Cross-Device access over Wi-Fi.
                        </p>
                        <div className="input-group-premium">
                            <label>Portal API Endpoint (Default: https://spoko-academy-portal.onrender.com)</label>
                            <input 
                                type="text" 
                                defaultValue={localStorage.getItem('spoko_api_url') || 'https://spoko-academy-portal.onrender.com'}
                                id="spoko_server_input"
                                placeholder="e.g. https://spoko-academy-portal.onrender.com"
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                            <button 
                                className="btn btn-primary btn-sm"
                                onClick={() => {
                                    const val = document.getElementById('spoko_server_input')?.value?.trim();
                                    if (val) {
                                        localStorage.setItem('spoko_api_url', val);
                                        alert(`API Server URL updated to: ${val}\nReloading portal...`);
                                        window.location.reload();
                                    }
                                }}
                            >
                                Save & Connect
                            </button>
                            <button 
                                className="btn btn-outline btn-sm"
                                onClick={() => {
                                    localStorage.removeItem('spoko_api_url');
                                    alert('Reset to local default! Reloading...');
                                    window.location.reload();
                                }}
                            >
                                Reset to Default
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .settings-grid { display: grid; grid-template-columns: 320px 1fr; gap: 2rem; align-items: start; }
                
                .avatar-upload-group { display: flex; flex-direction: column; align-items: center; padding-bottom: 2rem; border-bottom: 1px solid #f1f5f9; }
                .avatar-preview { position: relative; width: 120px; height: 120px; }
                .avatar-preview img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; border: 4px solid #f8fafc; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
                .camera-btn { position: absolute; bottom: 0; right: 0; width: 36px; height: 36px; border-radius: 50%; background: #7c3aed; color: white; border: 3px solid white; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
                .camera-btn:hover { background: #6d28d9; transform: scale(1.1); }
                
                .dept-badge { margin-top: 1rem; display: inline-block; padding: 4px 12px; background: #eef2ff; color: #6366f1; border-radius: 99px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; }

                .profile-quick-nav { padding-top: 1rem; display: flex; flex-direction: column; gap: 0.5rem; }
                .nav-item { display: flex; align-items: center; gap: 1rem; padding: 0.85rem 1.25rem; border-radius: 12px; color: #64748b; font-weight: 600; font-size: 0.9rem; transition: all 0.2s; }
                .nav-item:hover { background: #f8fafc; color: #1e293b; }
                .nav-item.active { background: #f5f3ff; color: #7c3aed; }

                .card-header-flex { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
                .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
                
                .input-group-premium { margin-bottom: 1rem; }
                .input-group-premium label { display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 0.75rem; }
                .input-group-premium input { width: 100%; padding: 0.85rem 1.25rem; border-radius: 12px; border: 1px solid #e2e8f0; background: #f8fafc; font-size: 0.95rem; font-weight: 500; transition: all 0.2s; }
                .input-group-premium input:focus { border-color: #7c3aed; background: white; outline: none; box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.1); }
                .input-group-premium input:disabled { opacity: 0.7; cursor: not-allowed; }

                .toggle-pass { position: absolute; right: 1rem; top: 50%; transform: translateY(-50%); color: #64748b; }
                
                @media (max-width: 900px) {
                    .settings-grid { grid-template-columns: 1fr; }
                }
            `}</style>
        </div>
    );
};

export default ProfileSettings;
