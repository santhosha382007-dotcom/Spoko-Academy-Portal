import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Building2, Plus, Edit, Users, Award, Calendar, CheckCircle, X, Loader } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const Departments = () => {
    const { user: currentUser } = useAuth();
    const [departments, setDepartments] = useState([]);
    const [students, setStudents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Edit Modal State
    const [editingDept, setEditingDept] = useState(null);
    const [isAdding, setIsAdding] = useState(false);
    const [deptForm, setDeptForm] = useState({
        name: '',
        code: '',
        description: '',
        active: true
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [deptsData, usersData] = await Promise.all([
                api.getDepartments(),
                api.getUsers()
            ]);
            setDepartments(deptsData);
            setStudents(usersData.filter(u => u.role === 'student'));
        } catch (err) {
            console.error("Failed to load departments data", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const openEditModal = (dept) => {
        setEditingDept(dept);
        setIsAdding(false);
        setDeptForm({
            name: dept.name,
            code: dept.code || dept.name.substring(0, 3).toUpperCase(),
            description: dept.description || '',
            active: dept.active !== false
        });
    };

    const openAddModal = () => {
        setEditingDept(null);
        setIsAdding(true);
        setDeptForm({
            name: '',
            code: '',
            description: '',
            active: true
        });
    };

    const handleSaveDept = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (isAdding) {
                const newDept = {
                    id: 'dept-' + Date.now(),
                    name: deptForm.name.trim(),
                    code: deptForm.code.trim().toUpperCase() || deptForm.name.substring(0, 3).toUpperCase(),
                    description: deptForm.description.trim(),
                    active: deptForm.active,
                    createdAt: new Date().toISOString()
                };
                await api.createDepartment(newDept);
                await api.createAuditLog({
                    eventType: 'DEPARTMENT_CREATED',
                    performedBy: currentUser?.name || 'Administrator',
                    details: `Created new academy department: "${newDept.name}" (${newDept.code})`
                });
            } else if (editingDept) {
                const updatedPayload = {
                    name: deptForm.name.trim(),
                    code: deptForm.code.trim().toUpperCase(),
                    description: deptForm.description.trim(),
                    active: deptForm.active
                };
                await api.updateDepartment(editingDept.id, updatedPayload);
                await api.createAuditLog({
                    eventType: 'DEPARTMENT_UPDATED',
                    performedBy: currentUser?.name || 'Administrator',
                    details: `Updated department "${editingDept.name}" to "${updatedPayload.name}"`
                });
            }

            setEditingDept(null);
            setIsAdding(false);
            await loadData();
        } catch (err) {
            alert("Failed to save department details.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={{ paddingBottom: '3rem' }}>
            {/* Header */}
            <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Link to="/" className="btn-icon" style={{ background: 'white', border: '1px solid var(--color-border)' }}>
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>Academy Departments</h1>
                        <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.88rem' }}>
                            Maintains the academy's 5 core streams and course specializations. Referenced in Excel import.
                        </p>
                    </div>
                </div>
                <button
                    onClick={openAddModal}
                    className="btn btn-primary btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#7c3aed', color: 'white', fontWeight: 700 }}
                >
                    <Plus size={16} /> Add Department
                </button>
            </div>

            {/* Department Cards Grid */}
            {isLoading ? (
                <div style={{ textAlign: 'center', padding: '4rem' }}>
                    <Loader className="spin" size={32} color="#7c3aed" />
                    <p style={{ color: '#64748b', marginTop: '1rem' }}>Loading department catalog...</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                    {departments.map((dept, index) => {
                        const enrolledCount = students.filter(s => s.details?.department === dept.name).length;
                        return (
                            <div
                                key={dept.id || index}
                                className="card"
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '20px',
                                    padding: '1.75rem',
                                    boxShadow: '0 4px 15px rgba(0,0,0,0.02)'
                                }}
                            >
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={{ background: '#f5f3ff', color: '#7c3aed', padding: '12px', borderRadius: '14px' }}>
                                                <Building2 size={24} />
                                            </div>
                                            <div>
                                                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                                                    {dept.name}
                                                </h3>
                                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7c3aed', background: '#ede9fe', padding: '2px 8px', borderRadius: '6px' }}>
                                                    CODE: {dept.code || 'DEPT'}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => openEditModal(dept)}
                                            className="btn-icon-sm"
                                            title="Edit Department Name / Details"
                                            style={{ color: '#64748b', background: '#f8fafc' }}
                                        >
                                            <Edit size={16} />
                                        </button>
                                    </div>

                                    <p style={{ fontSize: '0.88rem', color: '#64748b', minHeight: '40px', lineHeight: 1.5, margin: '0 0 1.25rem' }}>
                                        {dept.description || 'Academy examination preparation stream.'}
                                    </p>
                                </div>

                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1rem', background: '#f8fafc', borderRadius: '12px', marginBottom: '1.25rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>
                                            <Users size={16} color="#7c3aed" /> Enrolled Students
                                        </div>
                                        <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0f172a' }}>
                                            {enrolledCount}
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                                        <Link
                                            to={`/admin/department/${encodeURIComponent(dept.name)}`}
                                            className="btn btn-outline"
                                            style={{ textAlign: 'center', fontWeight: 700, fontSize: '0.82rem', padding: '0.65rem 0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
                                        >
                                            Students Roster
                                        </Link>
                                        <Link
                                            to={`/admin/department/${encodeURIComponent(dept.name)}?tab=attendance`}
                                            className="btn btn-primary"
                                            style={{ textAlign: 'center', fontWeight: 700, fontSize: '0.82rem', padding: '0.65rem 0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', textDecoration: 'none', background: '#7c3aed' }}
                                        >
                                            <Calendar size={14} /> Mark Attendance
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal: Edit or Add Department */}
            {(editingDept || isAdding) && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                    backdropFilter: 'blur(4px)', padding: '1rem'
                }}>
                    <div style={{
                        width: '100%', maxWidth: '460px', padding: '2rem',
                        borderRadius: '24px', background: '#fff', boxShadow: '0 25px 50px rgba(0,0,0,0.15)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                            <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>
                                {isAdding ? 'Add Academy Department' : `Edit: ${editingDept?.name}`}
                            </h2>
                            <button
                                type="button"
                                onClick={() => { setEditingDept(null); setIsAdding(false); }}
                                style={{ border: 'none', background: '#f1f5f9', borderRadius: '50%', padding: '6px', cursor: 'pointer' }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveDept} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.3rem' }}>Department Name *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Railway, SSC, GD"
                                    value={deptForm.name}
                                    onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.3rem' }}>Department Code *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. RLY, SSC, GD"
                                    value={deptForm.code}
                                    onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.3rem' }}>Description / Scope</label>
                                <textarea
                                    rows={3}
                                    placeholder="Examination preparation description..."
                                    value={deptForm.description}
                                    onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none', resize: 'none' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                                <button
                                    type="button"
                                    onClick={() => { setEditingDept(null); setIsAdding(false); }}
                                    className="btn btn-outline"
                                    style={{ flex: 1 }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    style={{ flex: 1, background: '#7c3aed' }}
                                    disabled={isSubmitting || !deptForm.name.trim()}
                                >
                                    {isSubmitting ? 'Saving...' : 'Save Department'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Departments;
