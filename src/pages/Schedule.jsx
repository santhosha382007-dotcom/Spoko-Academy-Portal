import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
    Plus,
    Edit2,
    Trash2,
    Clock,
    User,
    X
} from 'lucide-react';
import '../styles/Schedule.css';

const formatAMPM = (timeString) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    let hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12;
    return `${hour}:${minutes} ${ampm}`;
};

const Schedule = () => {
    const { user } = useAuth();
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState(null);
    const [formData, setFormData] = useState({
        department: '',
        day: 'Monday',
        time: '',
        subject: '',
        teacher: ''
    });

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const [departments, setDepartments] = useState(['Railway', 'SSC', 'GD', 'Department 4', 'Department 5']);

    useEffect(() => {
        fetchSchedules();
        fetchDepartments();
    }, []);

    const fetchDepartments = async () => {
        try {
            const depts = await api.getDepartments();
            if (depts && depts.length > 0) {
                setDepartments(depts.map(d => d.name));
            }
        } catch (e) {
            console.error("Failed to load departments:", e);
        }
    };

    const fetchSchedules = async () => {
        try {
            const data = await api.getSchedules();
            setSchedules(data);
        } catch (error) {
            console.error("Failed to fetch schedules:", error);
        } finally {
            setLoading(false);
        }
    };

    const isAdmin = user.role === 'admin';
    const userDept = user.department || user.details?.department;

    const canEdit = () => isAdmin;

    const filteredSchedules = schedules.filter(s => {
        if (user.role === 'student' && userDept && userDept !== s.department) return false;
        return true;
    });

    const handleEdit = (schedule) => {
        setEditingSchedule(schedule);
        setFormData({
            department: schedule.department,
            day: schedule.day,
            time: schedule.time,
            subject: schedule.subject,
            teacher: schedule.teacher
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this class?")) return;
        try {
            await api.deleteSchedule(id);
            await fetchSchedules();
        } catch (error) {
            alert("Failed to delete schedule");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...formData };
            if (editingSchedule) {
                payload.id = editingSchedule.id;
            }

            await api.saveSchedule(payload);
            setIsModalOpen(false);
            setEditingSchedule(null);
            setFormData({ department: departments[0] || 'Railway', day: 'Monday', time: '', subject: '', teacher: '' });
            await fetchSchedules();
        } catch (error) {
            alert("Failed to save schedule");
        }
    };

    const openCreateModal = () => {
        setEditingSchedule(null);
        setFormData({
            department: departments[0] || 'Railway',
            day: 'Monday',
            time: '',
            subject: '',
            teacher: ''
        });
        setIsModalOpen(true);
    };

    if (loading) return <div className="flex-center" style={{ height: '300px' }}>Loading...</div>;

    return (
        <div className="schedule-container">
            <header className="schedule-header">
                <div className="schedule-title">
                    <h1>Weekly Schedule</h1>
                    <p>
                        {user.role === 'student'
                            ? `Class timings for ${userDept || 'your'} Department`
                            : "Manage class timings and course schedules"}
                    </p>
                </div>
                {isAdmin && (
                    <button onClick={openCreateModal} className="btn btn-primary">
                        <Plus size={20} />
                        Add New Class
                    </button>
                )}
            </header>

            <div className="days-grid">
                {days.map(day => (
                    <div key={day} className="day-column">
                        <div className="day-header">{day}</div>

                        <div className="classes-list">
                            {filteredSchedules
                                .filter(s => s.day === day)
                                .sort((a, b) => a.time.localeCompare(b.time))
                                .map(item => (
                                    <div key={item.id} className="class-card">
                                        <div className="class-time">
                                            <Clock size={14} />
                                            <span>{formatAMPM(item.time)}</span>
                                        </div>
                                        <div className="class-subject">{item.subject}</div>
                                        <div className="class-info">
                                            <div className="class-teacher">
                                                <User size={14} />
                                                <span>{item.teacher}</span>
                                            </div>
                                            <span className="class-dept">{item.department}</span>
                                        </div>

                                        {canEdit(item.department) && (
                                            <div className="class-actions">
                                                <button onClick={() => handleEdit(item)} className="btn-icon-sm">
                                                    <Edit2 size={12} />
                                                </button>
                                                <button onClick={() => handleDelete(item.id)} className="btn-icon-sm" style={{ color: 'var(--color-secondary)' }}>
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}

                            {filteredSchedules.filter(s => s.day === day).length === 0 && (
                                <div className="empty-day">No classes</div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>{editingSchedule ? 'Edit Class' : 'Schedule New Class'}</h2>
                            <button onClick={() => setIsModalOpen(false)} style={{ color: 'var(--color-text-muted)' }}><X size={24} /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="modal-body">
                            <div className="form-group">
                                <label>Department</label>
                                <select
                                    value={formData.department}
                                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                    required
                                >
                                    {departments.map(dept => (
                                        <option key={dept} value={dept}>{dept}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Day</label>
                                    <select
                                        value={formData.day}
                                        onChange={(e) => setFormData({ ...formData, day: e.target.value })}
                                        required
                                    >
                                        {days.map(d => (
                                            <option key={d} value={d}>{d}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Select Time</label>
                                    <input
                                        type="time"
                                        value={formData.time}
                                        onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Subject / Topic</label>
                                <input
                                    type="text"
                                    value={formData.subject}
                                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                    placeholder="Enter subject name"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Instructor Name</label>
                                <input
                                    type="text"
                                    value={formData.teacher}
                                    onChange={(e) => setFormData({ ...formData, teacher: e.target.value })}
                                    placeholder="Name of instructor / faculty"
                                    required
                                />
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="btn btn-outline full-width"
                                    style={{ marginTop: '1rem' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary full-width"
                                    style={{ marginTop: '1rem' }}
                                >
                                    {editingSchedule ? 'Update Schedule' : 'Create Schedule'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Schedule;
