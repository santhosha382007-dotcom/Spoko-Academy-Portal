import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
    ArrowLeft, Search, Shield, Trash2, Ban, Loader, FileText, Download, 
    Upload, Filter, Edit, UserPlus, X, KeyRound, CheckCircle, AlertTriangle, 
    RefreshCw, Check, AlertCircle, Eye, EyeOff, UserCheck
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import * as XLSX from 'xlsx';
import { useDropzone } from 'react-dropzone';
import { hashPassword, generateTemporaryPassword, validatePasswordPolicy } from '../../utils/security';

const UsersList = () => {
    const { user: currentUser, adminResetPassword } = useAuth();
    const isAdmin = currentUser?.role === 'admin';

    const [users, setUsers] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDept, setFilterDept] = useState('All');
    const [filterStatus, setFilterStatus] = useState('All');
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const usersPerPage = 10;

    // Active Tab State: 'students' | 'staff'
    const [activeTab, setActiveTab] = useState('students');

    // Add Staff Modal State
    const [showAddStaffModal, setShowAddStaffModal] = useState(false);
    const [newStaff, setNewStaff] = useState({
        staffId: '',
        fullName: '',
        phone: '',
        email: '',
        department: '',
        password: 'staff@123'
    });
    const [isStaffSubmitting, setIsStaffSubmitting] = useState(false);

    // Add Student Modal State
    const [showAddModal, setShowAddModal] = useState(false);
    const [newStudent, setNewStudent] = useState({
        studentId: '',
        fullName: '',
        phone: '',
        password: generateTemporaryPassword(),
        email: '',
        department: '',
        batch: '2026-A',
        dob: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Edit Student Modal State
    const [editingStudent, setEditingStudent] = useState(null);

    // Reset Password Modal State
    const [resettingUser, setResettingUser] = useState(null);
    const [tempPassword, setTempPassword] = useState('');
    const [enforceFirstChange, setEnforceFirstChange] = useState(true);
    const [resetSuccessResult, setResetSuccessResult] = useState(null);

    // Excel Import Preview Modal State
    const [showImportPreview, setShowImportPreview] = useState(false);
    const [importFileName, setImportFileName] = useState('');
    const [parsedRows, setParsedRows] = useState([]); // [{ data, errors: [], isValid, isConflict }]
    const [allowOverwrite, setAllowOverwrite] = useState(false);
    const [isImporting, setIsImporting] = useState(false);

    const refreshData = async () => {
        setIsLoading(true);
        try {
            const [usersData, deptsData] = await Promise.all([
                api.getUsers(),
                api.getDepartments()
            ]);
            setUsers(usersData);
            setDepartments(deptsData);
            if (deptsData.length > 0 && !newStudent.department) {
                setNewStudent(prev => ({ ...prev, department: deptsData[0].name }));
            }
        } catch (err) {
            console.error("Failed to load users or departments", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        refreshData();
    }, []);

    // -------------------------------------------------------------
    // Download Official 3-Sheet Excel Template
    // -------------------------------------------------------------
    const downloadOfficialTemplate = () => {
        const studentImportData = [
            {
                'Student ID': 'STU1001',
                'Student Name': 'Aravind Kumar',
                'Mobile Number': '9876543210',
                'Email': 'aravind.k@example.com',
                'Department': departments[0]?.name || 'Railway',
                'Batch': '2026-A',
                'Date of Birth': '2002-05-14',
                'Default Password': 'TempPass@123',
                'First Login Password Change': 'TRUE',
                'Account Status': 'Active'
            },
            {
                'Student ID': 'STU1002',
                'Student Name': 'Priya Sharma',
                'Mobile Number': '9876543211',
                'Email': 'priya.s@example.com',
                'Department': departments[1]?.name || 'SSC',
                'Batch': '2026-B',
                'Date of Birth': '2001-11-20',
                'Default Password': 'TempPass@456',
                'First Login Password Change': 'TRUE',
                'Account Status': 'Active'
            },
            {
                'Student ID': 'STU1003',
                'Student Name': 'Karthik Raja',
                'Mobile Number': '9876543212',
                'Email': 'karthik.r@example.com',
                'Department': departments[2]?.name || 'GD',
                'Batch': '2026-A',
                'Date of Birth': '2003-02-18',
                'Default Password': 'TempPass@789',
                'First Login Password Change': 'TRUE',
                'Account Status': 'Active'
            }
        ];

        const departmentRefData = departments.map(d => ({
            'Department Name': d.name,
            'Department Code': d.code || d.name.substring(0, 3).toUpperCase(),
            'Usage / Description': d.description || `${d.name} examination preparation`
        }));

        const instructionsData = [
            { 'Item': 'Template Revision', 'Guideline': 'Spoko Portal Version 1.1 • Admin-only management + bulk onboarding.' },
            { 'Item': 'Required Fields', 'Guideline': 'Student ID, Student Name, Mobile Number, Department, and Default Password are MANDATORY.' },
            { 'Item': 'Student ID', 'Guideline': 'Unique identifier for each student (e.g. STU1001). Must not duplicate existing records.' },
            { 'Item': 'Mobile Number', 'Guideline': 'Must be a valid 10-digit mobile number. Used for identity verification.' },
            { 'Item': 'Department', 'Guideline': 'Mandatory. Must match one of the active departments in the Department Reference sheet.' },
            { 'Item': 'Security Policy', 'Guideline': 'The database stores only a secure password hash. Passwords are never stored as plain text.' },
            { 'Item': 'First Login Password Change', 'Guideline': 'Set to TRUE. On their first login, students must change their password before dashboard access.' }
        ];

        const wb = XLSX.utils.book_new();
        const wsStudents = XLSX.utils.json_to_sheet(studentImportData);
        XLSX.utils.book_append_sheet(wb, wsStudents, 'Student Import');

        const wsDept = XLSX.utils.json_to_sheet(departmentRefData);
        XLSX.utils.book_append_sheet(wb, wsDept, 'Department Reference');

        const wsInstructions = XLSX.utils.json_to_sheet(instructionsData);
        XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

        XLSX.writeFile(wb, 'Spoko_User_Upload_Template.xlsx');
    };

    // -------------------------------------------------------------
    // Export Students to Excel
    // -------------------------------------------------------------
    const exportToExcel = () => {
        const studentList = users.filter(u => u.role === 'student');
        const worksheet = XLSX.utils.json_to_sheet(studentList.map(u => ({
            'Student ID': u.id,
            'Student Name': u.name,
            'Mobile Number': u.phone,
            'Email': u.details?.email || '',
            'Department': u.details?.department || 'Unassigned',
            'Batch': u.details?.batch || '-',
            'Date of Birth': u.details?.dob || '-',
            'Must Change Password': u.firstLoginPasswordChange ? 'YES' : 'NO',
            'Status': u.status || 'active'
        })));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Students");
        XLSX.writeFile(workbook, `Spoko_Academy_Students_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    // -------------------------------------------------------------
    // Excel File Upload & Section 12 Validation Engine
    // -------------------------------------------------------------
    const handleExcelFile = (file) => {
        setImportFileName(file.name);
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                // Find 'Student Import' sheet or default to first sheet
                const sheetName = workbook.SheetNames.includes('Student Import')
                    ? 'Student Import'
                    : workbook.SheetNames[0];

                const worksheet = workbook.Sheets[sheetName];
                const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

                if (!rawJson || rawJson.length === 0) {
                    alert("The uploaded Excel sheet contains no rows to import.");
                    return;
                }

                // Department lookup (case-insensitive)
                const deptNames = departments.map(d => d.name.toLowerCase().trim());

                // Existing IDs & Phones in Database
                const existingIds = new Set(users.map(u => String(u.id).toLowerCase().trim()));
                const existingPhones = new Set(users.map(u => String(u.phone).trim()));

                // In-file duplicate trackers
                const seenFileIds = new Set();
                const seenFilePhones = new Set();

                const processed = rawJson.map((row, index) => {
                    const rowNum = index + 2; // Excel row numbering
                    const errors = [];

                    // Extract columns flexibly
                    const studentId = String(row['Student ID'] || row['StudentID'] || row['ID'] || '').trim();
                    const studentName = String(row['Student Name'] || row['Name'] || row['FullName'] || '').trim();
                    const mobile = String(row['Mobile Number'] || row['Mobile'] || row['Phone'] || '').trim().replace(/\D/g, '');
                    const email = String(row['Email'] || '').trim();
                    const department = String(row['Department'] || '').trim();
                    const batch = String(row['Batch'] || 'General').trim();
                    const dob = String(row['Date of Birth'] || row['DOB'] || '').trim();
                    const defaultPassword = String(row['Default Password'] || row['Password'] || '').trim();
                    const firstLoginChangeRaw = String(row['First Login Password Change'] || row['FirstLoginChange'] || 'TRUE').trim().toUpperCase();
                    const firstLoginChange = firstLoginChangeRaw !== 'FALSE' && firstLoginChangeRaw !== 'NO';
                    const accountStatus = String(row['Account Status'] || row['Status'] || 'Active').trim();

                    // 1. Required fields validation
                    if (!studentId) errors.push("Missing required field: Student ID");
                    if (!studentName) errors.push("Missing required field: Student Name");
                    if (!mobile) errors.push("Missing required field: Mobile Number");
                    if (!department) errors.push("Missing required field: Department");
                    if (!defaultPassword) errors.push("Missing required field: Default Password");

                    // 2. Mobile validation (10 digits)
                    if (mobile && mobile.length !== 10) {
                        errors.push(`Invalid mobile format: "${mobile}" (must be 10 digits)`);
                    }

                    // 3. Duplicate mobile in file
                    if (mobile) {
                        if (seenFilePhones.has(mobile)) {
                            errors.push(`Duplicate mobile within import file: ${mobile}`);
                        } else {
                            seenFilePhones.add(mobile);
                        }
                    }

                    // 4. Duplicate Student ID in file
                    if (studentId) {
                        const lowerId = studentId.toLowerCase();
                        if (seenFileIds.has(lowerId)) {
                            errors.push(`Duplicate Student ID within import file: ${studentId}`);
                        } else {
                            seenFileIds.add(lowerId);
                        }
                    }

                    // 5. Unknown department validation
                    if (department && deptNames.length > 0) {
                        const isKnownDept = deptNames.includes(department.toLowerCase());
                        if (!isKnownDept) {
                            errors.push(`Unknown department: "${department}". Must match configured Academy departments.`);
                        }
                    }

                    // 6. Password policy validation (min 6 chars)
                    if (defaultPassword && defaultPassword.length < 6) {
                        errors.push("Password policy violation: Default password must be at least 6 characters.");
                    }

                    // 7. Existing student conflict check
                    const isExistingId = studentId && existingIds.has(studentId.toLowerCase());
                    const isExistingPhone = mobile && existingPhones.has(mobile);
                    let isConflict = false;

                    if (isExistingId) {
                        isConflict = true;
                    }
                    if (isExistingPhone && !isExistingId) {
                        errors.push(`Mobile number ${mobile} already belongs to an existing student in database.`);
                    }

                    return {
                        rowNum,
                        studentId,
                        studentName,
                        mobile,
                        email,
                        department,
                        batch,
                        dob,
                        defaultPassword,
                        firstLoginChange,
                        accountStatus,
                        errors,
                        isConflict,
                        isValid: errors.length === 0
                    };
                });

                setParsedRows(processed);
                setShowImportPreview(true);
            } catch (err) {
                console.error("Failed to parse Excel file", err);
                alert("Failed to read the Excel file. Please ensure it is a valid .xlsx document.");
            }
        };

        reader.readAsArrayBuffer(file);
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop: (acceptedFiles) => {
            if (acceptedFiles.length > 0) {
                handleExcelFile(acceptedFiles[0]);
            }
        },
        accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
        multiple: false
    });

    // -------------------------------------------------------------
    // Commit Excel Import to Database
    // -------------------------------------------------------------
    const handleCommitImport = async () => {
        setIsImporting(true);
        try {
            // Rows eligible for import
            const rowsToImport = parsedRows.filter(r => {
                if (!r.isValid) return false;
                if (r.isConflict && !allowOverwrite) return false;
                return true;
            });

            if (rowsToImport.length === 0) {
                alert("No eligible valid rows to import. Please review validation errors or enable update toggle.");
                setIsImporting(false);
                return;
            }

            let createdCount = 0;
            let updatedCount = 0;

            for (const r of rowsToImport) {
                const hashedPassword = hashPassword(r.defaultPassword);
                const userPayload = {
                    id: r.studentId,
                    name: r.studentName,
                    phone: r.mobile,
                    department: r.department,
                    password: hashedPassword,
                    role: 'student',
                    status: (r.accountStatus.toLowerCase() === 'inactive' || r.accountStatus.toLowerCase() === 'blocked') ? r.accountStatus.toLowerCase() : 'active',
                    firstLoginPasswordChange: r.firstLoginChange,
                    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(r.studentName)}&background=random`,
                    details: {
                        studentId: r.studentId,
                        fullName: r.studentName,
                        phone: r.mobile,
                        email: r.email,
                        department: r.department,
                        batch: r.batch,
                        dob: r.dob,
                        firstLoginPasswordChange: r.firstLoginChange,
                        importedAt: new Date().toISOString()
                    }
                };

                if (r.isConflict && allowOverwrite) {
                    await api.updateUser(r.studentId, userPayload);
                    updatedCount++;
                } else {
                    await api.createUser(userPayload);
                    createdCount++;
                }
            }

            // Record in Audit Log
            await api.createAuditLog({
                eventType: 'BULK_STUDENT_IMPORT',
                performedBy: currentUser?.name || 'Administrator',
                details: `Imported ${createdCount} new students (${updatedCount} updated) from Excel file "${importFileName}". Passwords securely hashed with first-login change enforced.`,
                count: createdCount + updatedCount
            });

            alert(`Import Completed Successfully!\n\n• New Students Created: ${createdCount}\n• Existing Students Updated: ${updatedCount}`);
            setShowImportPreview(false);
            setParsedRows([]);
            await refreshData();
        } catch (err) {
            console.error("Bulk Import Error:", err);
            alert("Error committing student records. Please check database connection.");
        } finally {
            setIsImporting(false);
        }
    };

    // -------------------------------------------------------------
    // Single Student Creation
    // -------------------------------------------------------------
    const handleCreateStudent = async (e) => {
        e.preventDefault();
        const cleanPhone = newStudent.phone.trim();
        const cleanId = (newStudent.studentId || `STU${Date.now().toString().slice(-4)}`).trim();

        if (cleanPhone.length !== 10) {
            alert("Please enter a valid 10-digit mobile number.");
            return;
        }

        const policyCheck = validatePasswordPolicy(newStudent.password);
        if (!policyCheck.valid) {
            alert(policyCheck.message);
            return;
        }

        setIsSubmitting(true);
        try {
            const allUsers = await api.getUsers();
            if (allUsers.some(u => String(u.phone).trim() === cleanPhone)) {
                alert("A student already exists with this mobile number!");
                setIsSubmitting(false);
                return;
            }
            if (allUsers.some(u => String(u.id).trim().toLowerCase() === cleanId.toLowerCase())) {
                alert(`A student already exists with Student ID "${cleanId}"!`);
                setIsSubmitting(false);
                return;
            }

            const hashedPassword = hashPassword(newStudent.password);

            const createdUser = {
                id: cleanId,
                name: newStudent.fullName.trim(),
                phone: cleanPhone,
                department: newStudent.department || departments[0]?.name || 'General',
                password: hashedPassword,
                role: 'student',
                status: 'active',
                firstLoginPasswordChange: true,
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(newStudent.fullName.trim())}&background=random`,
                details: {
                    studentId: cleanId,
                    fullName: newStudent.fullName.trim(),
                    phone: cleanPhone,
                    email: newStudent.email.trim(),
                    department: newStudent.department || departments[0]?.name || 'General',
                    batch: newStudent.batch || '2026-A',
                    dob: newStudent.dob || '',
                    firstLoginPasswordChange: true,
                    createdAt: new Date().toISOString()
                }
            };

            await api.createUser(createdUser);

            await api.createAuditLog({
                eventType: 'STUDENT_CREATED',
                performedBy: currentUser?.name || 'Administrator',
                userId: cleanId,
                studentName: createdUser.name,
                details: `Admin created student ${createdUser.name} (${cleanId}). Temporary password hashed, first-login change enforced.`
            });

            alert(`Student "${newStudent.fullName}" created successfully with temporary default password: ${newStudent.password}`);
            setShowAddModal(false);
            setNewStudent({
                studentId: '',
                fullName: '',
                phone: '',
                password: generateTemporaryPassword(),
                email: '',
                department: departments[0]?.name || '',
                batch: '2026-A',
                dob: ''
            });
            await refreshData();
        } catch (err) {
            console.error("Create student error", err);
            alert("Failed to create student account.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCreateStaff = async (e) => {
        e.preventDefault();
        const cleanPhone = newStaff.phone.trim();
        const cleanName = newStaff.fullName.trim();
        const cleanDept = newStaff.department || departments[0]?.name || 'Railway';
        const cleanId = (newStaff.staffId || `staff_${cleanDept.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Date.now().toString().slice(-4)}`).trim();

        if (!cleanName) {
            alert("Please enter the staff member's full name.");
            return;
        }

        if (cleanPhone.length !== 10) {
            alert("Please enter a valid 10-digit mobile number.");
            return;
        }

        if (!newStaff.password || newStaff.password.length < 6) {
            alert("Password must be at least 6 characters.");
            return;
        }

        setIsStaffSubmitting(true);
        try {
            const allUsers = await api.getUsers();
            if (allUsers.some(u => String(u.phone).trim() === cleanPhone)) {
                alert("A user already exists with this mobile number!");
                setIsStaffSubmitting(false);
                return;
            }
            if (allUsers.some(u => String(u.id).trim().toLowerCase() === cleanId.toLowerCase())) {
                alert(`A user already exists with Staff ID "${cleanId}"!`);
                setIsStaffSubmitting(false);
                return;
            }

            const hashedPassword = hashPassword(newStaff.password);

            const createdStaff = {
                id: cleanId,
                name: cleanName,
                phone: cleanPhone,
                email: newStaff.email.trim() || `${cleanId}@spoko.edu`,
                department: cleanDept,
                password: hashedPassword,
                role: 'staff',
                status: 'active',
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=7c3aed&color=fff`,
                details: {
                    staffId: cleanId,
                    fullName: cleanName,
                    phone: cleanPhone,
                    email: newStaff.email.trim() || `${cleanId}@spoko.edu`,
                    department: cleanDept,
                    title: `${cleanDept} Department Faculty`,
                    createdAt: new Date().toISOString()
                }
            };

            await api.createUser(createdStaff);

            await api.createAuditLog({
                eventType: 'STAFF_CREATED',
                performedBy: currentUser?.name || 'Administrator',
                userId: cleanId,
                details: `Admin created department staff "${cleanName}" (${cleanId}) for ${cleanDept} department.`
            });

            alert(`Staff account "${cleanName}" created successfully for ${cleanDept} Department with password: ${newStaff.password}`);
            setShowAddStaffModal(false);
            setNewStaff({
                staffId: '',
                fullName: '',
                phone: '',
                email: '',
                department: departments[0]?.name || 'Railway',
                password: 'staff@123'
            });
            await refreshData();
        } catch (err) {
            console.error("Staff creation error:", err);
            alert("Failed to create staff account.");
        } finally {
            setIsStaffSubmitting(false);
        }
    };

    const handleDeleteStaff = async (staffMember) => {
        if (!confirm(`Are you sure you want to remove staff member "${staffMember.name}" (${staffMember.department})?`)) return;
        try {
            await api.deleteUser(staffMember.id);
            await api.createAuditLog({
                eventType: 'STAFF_DELETED',
                performedBy: currentUser?.name || 'Administrator',
                userId: staffMember.id,
                details: `Admin deleted staff member "${staffMember.name}" from ${staffMember.department} department.`
            });
            await refreshData();
        } catch (err) {
            alert("Failed to delete staff member.");
        }
    };

    // -------------------------------------------------------------
    // Admin Password Reset Action
    // -------------------------------------------------------------
    const initiatePasswordReset = (student) => {
        setResettingUser(student);
        setTempPassword(generateTemporaryPassword());
        setEnforceFirstChange(true);
        setResetSuccessResult(null);
    };

    const handleConfirmPasswordReset = async () => {
        if (!resettingUser) return;
        setIsSubmitting(true);
        try {
            await adminResetPassword(resettingUser.id, tempPassword, enforceFirstChange);
            setResetSuccessResult({
                studentName: resettingUser.name,
                studentId: resettingUser.id,
                temporaryPassword: tempPassword
            });
            await refreshData();
        } catch (err) {
            alert(`Failed to reset password: ${err.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // -------------------------------------------------------------
    // Edit Student Details
    // -------------------------------------------------------------
    const handleSaveStudentEdit = async (e) => {
        e.preventDefault();
        if (!editingStudent) return;
        setIsSubmitting(true);
        try {
            const updatedPayload = {
                name: editingStudent.name,
                phone: editingStudent.phone,
                status: editingStudent.status,
                department: editingStudent.department,
                details: {
                    ...editingStudent.details,
                    fullName: editingStudent.name,
                    phone: editingStudent.phone,
                    email: editingStudent.email,
                    department: editingStudent.department,
                    batch: editingStudent.batch
                }
            };

            await api.updateUser(editingStudent.id, updatedPayload);

            await api.createAuditLog({
                eventType: 'STUDENT_UPDATED',
                performedBy: currentUser?.name || 'Administrator',
                userId: editingStudent.id,
                studentName: editingStudent.name,
                details: `Admin updated student profile details.`
            });

            alert("Student details updated successfully.");
            setEditingStudent(null);
            await refreshData();
        } catch (err) {
            alert("Failed to update student.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Delete Student
    const handleDelete = async (id, name) => {
        if (confirm(`Are you sure you want to permanently delete student "${name}" (ID: ${id})?`)) {
            try {
                await api.deleteUser(id);
                await api.createAuditLog({
                    eventType: 'STUDENT_DELETED',
                    performedBy: currentUser?.name || 'Administrator',
                    userId: id,
                    studentName: name,
                    details: `Admin permanently deleted student account.`
                });
                setUsers(users.filter(u => u.id !== id));
            } catch (err) {
                alert("Failed to delete user.");
            }
        }
    };

    // Toggle Block / Active
    const handleToggleStatus = async (user) => {
        const newStatus = user.status === 'blocked' ? 'active' : 'blocked';
        try {
            await api.updateUser(user.id, { status: newStatus });
            await api.createAuditLog({
                eventType: 'STUDENT_STATUS_CHANGED',
                performedBy: currentUser?.name || 'Administrator',
                userId: user.id,
                studentName: user.name,
                details: `Admin changed status to: ${newStatus.toUpperCase()}`
            });
            setUsers(users.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
        } catch (err) {
            alert("Failed to update user status.");
        }
    };

    // Filtering
    const filteredUsers = users.filter(u => {
        if (u.role !== 'student') return false;

        const matchesSearch =
            (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            String(u.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            String(u.phone || '').includes(searchTerm) ||
            String(u.details?.batch || '').toLowerCase().includes(searchTerm.toLowerCase());

        const uDept = u.department || u.details?.department;
        const matchesDept = filterDept === 'All' || uDept === filterDept;
        const matchesStatus = filterStatus === 'All' || (u.status || 'active').toLowerCase() === filterStatus.toLowerCase();

        return matchesSearch && matchesDept && matchesStatus;
    });

    const filteredStaff = users.filter(u => {
        if (u.role !== 'staff') return false;

        const matchesSearch =
            (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            String(u.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            String(u.phone || '').includes(searchTerm) ||
            String(u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            String(u.department || u.details?.department || '').toLowerCase().includes(searchTerm.toLowerCase());

        const sDept = u.department || u.details?.department;
        const matchesDept = filterDept === 'All' || sDept === filterDept;
        const matchesStatus = filterStatus === 'All' || (u.status || 'active').toLowerCase() === filterStatus.toLowerCase();

        return matchesSearch && matchesDept && matchesStatus;
    });

    const indexOfLastUser = currentPage * usersPerPage;
    const indexOfFirstUser = indexOfLastUser - usersPerPage;
    const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
    const totalPages = Math.ceil(filteredUsers.length / usersPerPage) || 1;

    const currentStaff = filteredStaff.slice(indexOfFirstUser, indexOfLastUser);
    const staffTotalPages = Math.ceil(filteredStaff.length / usersPerPage) || 1;

    const validRowsCount = parsedRows.filter(r => r.isValid && (!r.isConflict || allowOverwrite)).length;
    const errorRowsCount = parsedRows.filter(r => !r.isValid).length;
    const conflictRowsCount = parsedRows.filter(r => r.isConflict).length;

    return (
        <div style={{ paddingBottom: '3rem' }}>
            {/* Header */}
            <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Link to="/" className="btn-icon" style={{ background: 'white', border: '1px solid var(--color-border)' }}>
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>
                            {activeTab === 'students' ? 'Student Management' : 'Department Staff Management'}
                        </h1>
                        <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.88rem' }}>
                            {activeTab === 'students' 
                                ? 'Single creation, Excel bulk onboarding, password administration, and departmental assignments.' 
                                : 'Manage department faculty logins, credentials, and departmental question bank access.'}
                        </p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {isAdmin && activeTab === 'students' && (
                        <>
                            <button
                                onClick={() => {
                                    setNewStudent(prev => ({
                                        ...prev,
                                        password: generateTemporaryPassword(),
                                        department: departments[0]?.name || ''
                                    }));
                                    setShowAddModal(true);
                                }}
                                className="btn btn-primary btn-sm"
                                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#7c3aed', color: 'white', fontWeight: 700 }}
                            >
                                <UserPlus size={16} /> Add Student
                            </button>
                            <button onClick={downloadOfficialTemplate} className="btn btn-outline btn-sm" title="Download Excel template with 3 sheets" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Download size={14} /> Excel Template
                            </button>
                            <button onClick={exportToExcel} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Download size={14} /> Export Students
                            </button>
                        </>
                    )}

                    {isAdmin && activeTab === 'staff' && (
                        <button
                            onClick={() => {
                                setNewStaff(prev => ({
                                    ...prev,
                                    department: departments[0]?.name || 'Railway',
                                    password: 'staff@123'
                                }));
                                setShowAddStaffModal(true);
                            }}
                            className="btn btn-primary btn-sm"
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#7c3aed', color: 'white', fontWeight: 700 }}
                        >
                            <UserPlus size={16} /> Add Department Staff
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs for Students vs Department Staff */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                <button
                    onClick={() => { setActiveTab('students'); setCurrentPage(1); }}
                    style={{
                        padding: '0.6rem 1.25rem',
                        borderRadius: '10px',
                        fontWeight: 700,
                        fontSize: '0.92rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        border: 'none',
                        background: activeTab === 'students' ? '#7c3aed' : '#f1f5f9',
                        color: activeTab === 'students' ? 'white' : '#475569',
                        transition: 'all 0.15s ease'
                    }}
                >
                    <Users size={17} /> Students ({users.filter(u => u.role === 'student').length})
                </button>
                <button
                    onClick={() => { setActiveTab('staff'); setCurrentPage(1); }}
                    style={{
                        padding: '0.6rem 1.25rem',
                        borderRadius: '10px',
                        fontWeight: 700,
                        fontSize: '0.92rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        border: 'none',
                        background: activeTab === 'staff' ? '#7c3aed' : '#f1f5f9',
                        color: activeTab === 'staff' ? 'white' : '#475569',
                        transition: 'all 0.15s ease'
                    }}
                >
                    <UserCheck size={17} /> Department Staff ({users.filter(u => u.role === 'staff').length})
                </button>
            </div>

            {/* Dropzone Banner for Bulk Import (Students Tab Only) */}
            {isAdmin && activeTab === 'students' && (
                <div
                    {...getRootProps()}
                    style={{
                        border: '2px dashed #cbd5e1',
                        borderRadius: '16px',
                        padding: '1.25rem',
                        textAlign: 'center',
                        cursor: 'pointer',
                        background: isDragActive ? '#f5f3ff' : 'white',
                        borderColor: isDragActive ? '#7c3aed' : '#cbd5e1',
                        marginBottom: '1.5rem',
                        transition: 'all 0.2s',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                    }}
                >
                    <input {...getInputProps()} />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                        <div style={{ background: '#f5f3ff', color: '#7c3aed', padding: '10px', borderRadius: '12px' }}>
                            <Upload size={22} />
                        </div>
                        <div style={{ textAlign: 'left' }}>
                            <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' }}>
                                {isDragActive ? "Drop the Excel template file now" : "Bulk Onboarding: Drag & Drop Excel (.xlsx) file here"}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                Validates Student ID, Mobile, Department, and stores hashed passwords with first-login change enforcement.
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters and Search Toolbar */}
            <div className="toolbar-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="input-with-icon">
                    <Search size={18} className="input-icon" />
                    <input
                        type="text"
                        placeholder="Search by name, ID, phone, batch..."
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1);
                        }}
                    />
                </div>
                <div className="input-with-icon">
                    <Filter size={18} className="input-icon" />
                    <select
                        value={filterDept}
                        onChange={(e) => {
                            setFilterDept(e.target.value);
                            setCurrentPage(1);
                        }}
                        style={{ paddingLeft: '2.5rem', width: '100%', borderRadius: '12px', border: '1px solid var(--color-border)', height: '45px' }}
                    >
                        <option value="All">All Departments</option>
                        {departments.map(d => (
                            <option key={d.id} value={d.name}>{d.name}</option>
                        ))}
                    </select>
                </div>
                <div className="input-with-icon">
                    <Filter size={18} className="input-icon" />
                    <select
                        value={filterStatus}
                        onChange={(e) => {
                            setFilterStatus(e.target.value);
                            setCurrentPage(1);
                        }}
                        style={{ paddingLeft: '2.5rem', width: '100%', borderRadius: '12px', border: '1px solid var(--color-border)', height: '45px' }}
                    >
                        <option value="All">All Statuses</option>
                        <option value="active">Active</option>
                        <option value="blocked">Blocked / Disabled</option>
                        <option value="left">Left</option>
                    </select>
                </div>
            </div>

            {/* Students Table */}
            {activeTab === 'students' && (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Student Details</th>
                                <th>Department & Batch</th>
                                <th>First-Login Password</th>
                                <th>Account Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '3rem' }}><Loader className="spin" /> Loading students...</td></tr>
                            ) : currentUsers.length === 0 ? (
                                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>No students found matching filters.</td></tr>
                            ) : currentUsers.map(student => (
                                <tr key={student.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div className="avatar-sm" style={{ background: '#7c3aed', color: 'white', fontWeight: 700 }}>
                                                {student.name?.[0]?.toUpperCase() || 'S'}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 700, color: '#0f172a' }}>{student.name}</div>
                                                <div style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', gap: '0.5rem' }}>
                                                    <span>ID: <strong>{student.id}</strong></span>
                                                    <span>•</span>
                                                    <span>📱 {student.phone}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 600 }}>{student.details?.department || 'Unassigned'}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Batch: {student.details?.batch || '-'}</div>
                                    </td>
                                    <td>
                                        {student.firstLoginPasswordChange ? (
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fffbeb', color: '#b45309', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, border: '1px solid #fde68a' }}>
                                                <AlertTriangle size={12} /> Must Change Pass
                                            </span>
                                        ) : (
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#ecfdf5', color: '#047857', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, border: '1px solid #a7f3d0' }}>
                                                <CheckCircle size={12} /> Changed / Secure
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        <span className={`status-dot ${student.status || 'active'}`}></span>
                                        <span style={{ textTransform: 'capitalize', fontWeight: 600, fontSize: '0.85rem' }}>
                                            {student.status || 'active'}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                            <button
                                                onClick={() => initiatePasswordReset(student)}
                                                className="btn-icon-sm"
                                                title="Reset Password & Force First-Login Change"
                                                style={{ color: '#7c3aed', background: '#f5f3ff' }}
                                            >
                                                <KeyRound size={16} />
                                            </button>
                                            <button
                                                onClick={() => setEditingStudent({
                                                    id: student.id,
                                                    name: student.name,
                                                    phone: student.phone,
                                                    email: student.details?.email || '',
                                                    department: student.details?.department || departments[0]?.name || '',
                                                    batch: student.details?.batch || '2026-A',
                                                    status: student.status || 'active',
                                                    details: student.details || {}
                                                })}
                                                className="btn-icon-sm"
                                                title="Edit Student Profile"
                                                style={{ color: '#2563eb', background: '#eff6ff' }}
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <Link
                                                to={`/admin/reports/${student.id}`}
                                                className="btn-icon-sm"
                                                title="View Student Report"
                                                style={{ color: '#059669', background: '#ecfdf5' }}
                                            >
                                                <FileText size={16} />
                                            </Link>
                                            <button
                                                onClick={() => handleToggleStatus(student)}
                                                className="btn-icon-sm"
                                                title={student.status === 'blocked' ? "Activate Student" : "Deactivate Student"}
                                                style={{ color: student.status === 'blocked' ? '#10b981' : '#f59e0b', background: '#fffbeb' }}
                                            >
                                                <Ban size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(student.id, student.name)}
                                                className="btn-icon-sm"
                                                title="Delete Account"
                                                style={{ color: '#ef4444', background: '#fef2f2' }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Department Staff Table */}
            {activeTab === 'staff' && (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Staff Member</th>
                                <th>Assigned Department</th>
                                <th>Login Credentials (ID / Phone)</th>
                                <th>Email</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem' }}><Loader className="spin" /> Loading staff accounts...</td></tr>
                            ) : currentStaff.length === 0 ? (
                                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>No department staff accounts found matching filters.</td></tr>
                            ) : currentStaff.map(staff => (
                                <tr key={staff.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <img
                                                src={staff.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(staff.name || 'Staff')}&background=7c3aed&color=fff`}
                                                alt={staff.name}
                                                style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }}
                                            />
                                            <div>
                                                <div style={{ fontWeight: 700, color: '#0f172a' }}>{staff.name}</div>
                                                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                                                    Role: <strong>Faculty / Staff</strong>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="badge badge-primary" style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                                            {staff.department || staff.details?.department || 'General'}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 700, color: '#334155' }}>ID: {staff.id}</div>
                                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>📱 {staff.phone}</div>
                                    </td>
                                    <td>
                                        <span style={{ fontSize: '0.85rem', color: '#475569' }}>
                                            {staff.email || staff.details?.email || '—'}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`status-dot ${(staff.status || 'active').toLowerCase()}`}></span>
                                        <span style={{ textTransform: 'capitalize', fontWeight: 600, fontSize: '0.85rem' }}>
                                            {staff.status || 'active'}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                            <button
                                                onClick={() => initiatePasswordReset(staff)}
                                                className="btn-icon-sm"
                                                title="Reset Staff Password"
                                                style={{ color: '#7c3aed', background: '#f5f3ff' }}
                                            >
                                                <KeyRound size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleToggleStatus(staff)}
                                                className="btn-icon-sm"
                                                title={staff.status === 'blocked' ? "Activate Staff" : "Deactivate Staff"}
                                                style={{ color: staff.status === 'blocked' ? '#10b981' : '#f59e0b', background: '#fffbeb' }}
                                            >
                                                <Ban size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteStaff(staff)}
                                                className="btn-icon-sm"
                                                title="Delete Staff Account"
                                                style={{ color: '#ef4444', background: '#fef2f2' }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination */}
            {((activeTab === 'students' ? totalPages : staffTotalPages) > 1) && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '2rem' }}>
                    <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="btn btn-outline btn-sm">Prev</button>
                    {[...Array(activeTab === 'students' ? totalPages : staffTotalPages)].map((_, i) => (
                        <button key={i} onClick={() => setCurrentPage(i + 1)} className={`btn btn-sm ${currentPage === i + 1 ? 'btn-primary' : 'btn-outline'}`}>{i + 1}</button>
                    ))}
                    <button disabled={currentPage === (activeTab === 'students' ? totalPages : staffTotalPages)} onClick={() => setCurrentPage(p => p + 1)} className="btn btn-outline btn-sm">Next</button>
                </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* Modal 1: Add Single Student                                   */}
            {/* ------------------------------------------------------------- */}
            {showAddModal && (
                <div className="modal-overlay animate-fade-in" style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                    backdropFilter: 'blur(4px)', padding: '1rem'
                }}>
                    <div style={{
                        width: '100%', maxWidth: '520px', padding: '2rem',
                        borderRadius: '24px', background: '#fff', boxShadow: '0 25px 50px rgba(0,0,0,0.15)',
                        maxHeight: '90vh', overflowY: 'auto'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800 }}>Create Student Account</h2>
                                <p style={{ margin: '0.2rem 0 0', color: '#64748b', fontSize: '0.8rem' }}>Default password will be hashed with mandatory first-login change</p>
                            </div>
                            <button type="button" onClick={() => setShowAddModal(false)} style={{ border: 'none', background: '#f1f5f9', borderRadius: '50%', padding: '8px', cursor: 'pointer' }}>
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateStudent} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.3rem' }}>Student ID *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. STU1001"
                                        value={newStudent.studentId}
                                        onChange={(e) => setNewStudent({ ...newStudent, studentId: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.3rem' }}>Full Name *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Aravind Kumar"
                                        value={newStudent.fullName}
                                        onChange={(e) => setNewStudent({ ...newStudent, fullName: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.3rem' }}>Mobile Number * (10 digits)</label>
                                    <input
                                        type="tel"
                                        required
                                        maxLength={10}
                                        placeholder="9876543210"
                                        value={newStudent.phone}
                                        onChange={(e) => setNewStudent({ ...newStudent, phone: e.target.value.replace(/\D/g, '') })}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.3rem' }}>Email</label>
                                    <input
                                        type="email"
                                        placeholder="student@example.com"
                                        value={newStudent.email}
                                        onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.3rem' }}>Department *</label>
                                    <select
                                        required
                                        value={newStudent.department}
                                        onChange={(e) => setNewStudent({ ...newStudent, department: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none' }}
                                    >
                                        {departments.map(d => (
                                            <option key={d.id} value={d.name}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.3rem' }}>Batch</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 2026-A"
                                        value={newStudent.batch}
                                        onChange={(e) => setNewStudent({ ...newStudent, batch: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none' }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.3rem' }}>Temporary Default Password *</label>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <input
                                        type="text"
                                        required
                                        value={newStudent.password}
                                        onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value })}
                                        style={{ flex: 1, padding: '0.75rem', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none', fontWeight: 600 }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setNewStudent({ ...newStudent, password: generateTemporaryPassword() })}
                                        className="btn btn-outline btn-sm"
                                        style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                                    >
                                        <RefreshCw size={14} /> Randomize
                                    </button>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.3rem' }}>
                                    🔒 Live database stores only a secure password hash. Student will be forced to change password on first login.
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-outline" style={{ flex: 1 }}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1, background: '#7c3aed' }} disabled={isSubmitting}>
                                    {isSubmitting ? 'Creating...' : 'Create Student'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* Modal: Add Department Staff (Section: Staff Management)       */}
            {/* ------------------------------------------------------------- */}
            {showAddStaffModal && (
                <div className="modal-overlay animate-fade-in" style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                    backdropFilter: 'blur(4px)', padding: '1rem'
                }}>
                    <div style={{
                        width: '100%', maxWidth: '520px', padding: '2rem',
                        borderRadius: '24px', background: '#fff', boxShadow: '0 25px 50px rgba(0,0,0,0.15)',
                        maxHeight: '90vh', overflowY: 'auto'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ background: '#f5f3ff', color: '#7c3aed', padding: '8px', borderRadius: '10px' }}>
                                    <UserCheck size={22} />
                                </div>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800 }}>Create Department Staff</h2>
                                    <p style={{ margin: '0.2rem 0 0', color: '#64748b', fontSize: '0.8rem' }}>Faculty login with isolated department view & question import</p>
                                </div>
                            </div>
                            <button type="button" onClick={() => setShowAddStaffModal(false)} style={{ border: 'none', background: '#f1f5f9', borderRadius: '50%', padding: '8px', cursor: 'pointer' }}>
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateStaff} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.3rem' }}>Assigned Department *</label>
                                <select
                                    required
                                    value={newStaff.department}
                                    onChange={(e) => {
                                        const dept = e.target.value;
                                        setNewStaff(prev => ({
                                            ...prev,
                                            department: dept,
                                            staffId: prev.staffId ? prev.staffId : `staff_${dept.toLowerCase().replace(/[^a-z0-9]/g, '')}`
                                        }));
                                    }}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none' }}
                                >
                                    {departments.map(d => (
                                        <option key={d.id} value={d.name}>{d.name} ({d.code || 'Dept'})</option>
                                    ))}
                                    {departments.length === 0 && (
                                        <>
                                            <option value="Railway">Railway</option>
                                            <option value="SSC">SSC</option>
                                            <option value="GD">GD</option>
                                            <option value="TNPSC">TNPSC</option>
                                            <option value="TNUSRB">TNUSRB</option>
                                        </>
                                    )}
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.3rem' }}>Staff Full Name *</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Railway Staff / Faculty In-Charge"
                                    required
                                    value={newStaff.fullName}
                                    onChange={(e) => setNewStaff({ ...newStaff, fullName: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none' }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.3rem' }}>Staff ID / Username *</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. staff_railway"
                                        required
                                        value={newStaff.staffId}
                                        onChange={(e) => setNewStaff({ ...newStaff, staffId: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.3rem' }}>Mobile Number * (10 Digits)</label>
                                    <input
                                        type="tel"
                                        maxLength={10}
                                        placeholder="e.g. 9800100001"
                                        required
                                        value={newStaff.phone}
                                        onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value.replace(/\D/g, '') })}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none' }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.3rem' }}>Email Address (Optional)</label>
                                <input
                                    type="email"
                                    placeholder="e.g. railway.staff@spoko.edu"
                                    value={newStaff.email}
                                    onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.3rem' }}>Default Password *</label>
                                <input
                                    type="text"
                                    placeholder="staff@123"
                                    required
                                    value={newStaff.password}
                                    onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none', fontFamily: 'monospace', fontWeight: 600 }}
                                />
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.3rem' }}>
                                    Staff can log in with Staff ID, Phone, or Email, plus this default password.
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                                <button type="button" onClick={() => setShowAddStaffModal(false)} className="btn btn-outline" style={{ flex: 1 }}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1, background: '#7c3aed' }} disabled={isStaffSubmitting}>
                                    {isStaffSubmitting ? 'Creating...' : 'Create Staff Login'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* Modal 2: Excel Bulk Import Preview & Validation (Section 12)  */}
            {/* ------------------------------------------------------------- */}
            {showImportPreview && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100,
                    backdropFilter: 'blur(6px)', padding: '1rem'
                }}>
                    <div style={{
                        width: '100%', maxWidth: '960px', padding: '2rem',
                        borderRadius: '24px', background: '#fff', boxShadow: '0 25px 60px rgba(0,0,0,0.2)',
                        maxHeight: '90vh', display: 'flex', flexDirection: 'column'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>Excel Import Preview & Validation</h2>
                                <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                                    File: <strong>{importFileName}</strong> • Validated against Section 12 academy rules.
                                </p>
                            </div>
                            <button type="button" onClick={() => setShowImportPreview(false)} style={{ border: 'none', background: '#f1f5f9', borderRadius: '50%', padding: '8px', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* Summary Metrics */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
                            <div style={{ background: '#f8fafc', padding: '0.9rem', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Total Rows</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>{parsedRows.length}</div>
                            </div>
                            <div style={{ background: '#ecfdf5', padding: '0.9rem', borderRadius: '14px', border: '1px solid #a7f3d0' }}>
                                <div style={{ fontSize: '0.75rem', color: '#065f46', fontWeight: 600 }}>Ready to Import</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#047857' }}>{validRowsCount}</div>
                            </div>
                            <div style={{ background: '#fef2f2', padding: '0.9rem', borderRadius: '14px', border: '1px solid #fecaca' }}>
                                <div style={{ fontSize: '0.75rem', color: '#991b1b', fontWeight: 600 }}>Validation Errors</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#b91c1c' }}>{errorRowsCount}</div>
                            </div>
                            <div style={{ background: '#fffbeb', padding: '0.9rem', borderRadius: '14px', border: '1px solid #fde68a' }}>
                                <div style={{ fontSize: '0.75rem', color: '#92400e', fontWeight: 600 }}>Existing Conflicts</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#d97706' }}>{conflictRowsCount}</div>
                            </div>
                        </div>

                        {/* Overwrite Toggle */}
                        {conflictRowsCount > 0 && (
                            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '0.85rem 1rem', borderRadius: '12px', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#92400e' }}>
                                    <AlertTriangle size={16} />
                                    <span>{conflictRowsCount} row(s) match existing Student IDs in the database. Accidental overwrite is blocked by default.</span>
                                </div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', color: '#78350f' }}>
                                    <input
                                        type="checkbox"
                                        checked={allowOverwrite}
                                        onChange={(e) => setAllowOverwrite(e.target.checked)}
                                    />
                                    Allow update of existing students
                                </label>
                            </div>
                        )}

                        {/* Preview Table */}
                        <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '14px', marginBottom: '1.25rem' }}>
                            <table className="data-table" style={{ margin: 0 }}>
                                <thead>
                                    <tr>
                                        <th>Row</th>
                                        <th>Status</th>
                                        <th>Student ID</th>
                                        <th>Name</th>
                                        <th>Mobile</th>
                                        <th>Department</th>
                                        <th>Validation Issues</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {parsedRows.map((r, i) => (
                                        <tr key={i} style={{ background: !r.isValid ? '#fef2f2' : r.isConflict ? '#fffbeb' : 'white' }}>
                                            <td style={{ fontWeight: 700 }}>#{r.rowNum}</td>
                                            <td>
                                                {!r.isValid ? (
                                                    <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 800 }}>
                                                        ERROR
                                                    </span>
                                                ) : r.isConflict ? (
                                                    <span style={{ background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 800 }}>
                                                        CONFLICT
                                                    </span>
                                                ) : (
                                                    <span style={{ background: '#d1fae5', color: '#065f46', padding: '2px 8px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 800 }}>
                                                        READY
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ fontWeight: 600 }}>{r.studentId || <span style={{ color: '#ef4444' }}>Missing</span>}</td>
                                            <td>{r.studentName || <span style={{ color: '#ef4444' }}>Missing</span>}</td>
                                            <td>{r.mobile || <span style={{ color: '#ef4444' }}>Missing</span>}</td>
                                            <td>{r.department || <span style={{ color: '#ef4444' }}>Missing</span>}</td>
                                            <td>
                                                {r.errors.length > 0 ? (
                                                    <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#b91c1c', fontSize: '0.78rem' }}>
                                                        {r.errors.map((err, eIdx) => (
                                                            <li key={eIdx}>{err}</li>
                                                        ))}
                                                    </ul>
                                                ) : r.isConflict ? (
                                                    <span style={{ color: '#b45309', fontSize: '0.78rem', fontWeight: 600 }}>
                                                        {allowOverwrite ? "Will update existing student" : "Skipped unless update allowed"}
                                                    </span>
                                                ) : (
                                                    <span style={{ color: '#059669', fontSize: '0.78rem', fontWeight: 600 }}>
                                                        ✓ All checks passed
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Commit Actions */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                Eligible records to be created/updated: <strong>{validRowsCount}</strong> of {parsedRows.length}
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowImportPreview(false)}
                                    className="btn btn-outline"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCommitImport}
                                    className="btn btn-primary"
                                    disabled={isImporting || validRowsCount === 0}
                                    style={{ background: '#7c3aed' }}
                                >
                                    {isImporting ? 'Importing...' : `Commit Import (${validRowsCount} Students)`}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* Modal 3: Admin Password Reset Modal (Section 3)               */}
            {/* ------------------------------------------------------------- */}
            {resettingUser && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                    backdropFilter: 'blur(4px)', padding: '1rem'
                }}>
                    <div style={{
                        width: '100%', maxWidth: '440px', padding: '2rem',
                        borderRadius: '24px', background: '#fff', boxShadow: '0 25px 50px rgba(0,0,0,0.15)'
                    }}>
                        {!resetSuccessResult ? (
                            <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ background: '#f5f3ff', color: '#7c3aed', padding: '8px', borderRadius: '10px' }}>
                                            <KeyRound size={20} />
                                        </div>
                                        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Reset Password</h2>
                                    </div>
                                    <button type="button" onClick={() => setResettingUser(null)} style={{ border: 'none', background: '#f1f5f9', borderRadius: '50%', padding: '6px', cursor: 'pointer' }}>
                                        <X size={18} />
                                    </button>
                                </div>

                                <p style={{ fontSize: '0.88rem', color: '#64748b', margin: '0 0 1.25rem' }}>
                                    Generate a new temporary default password for <strong>{resettingUser.name}</strong> (ID: {resettingUser.id}).
                                </p>

                                <div style={{ marginBottom: '1.25rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                                        New Temporary Password
                                    </label>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <input
                                            type="text"
                                            value={tempPassword}
                                            onChange={(e) => setTempPassword(e.target.value)}
                                            style={{ flex: 1, padding: '0.75rem', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none', fontWeight: 700, fontSize: '1rem' }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setTempPassword(generateTemporaryPassword())}
                                            className="btn btn-outline btn-sm"
                                        >
                                            <RefreshCw size={14} />
                                        </button>
                                    </div>
                                </div>

                                <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.25rem' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                                        <input
                                            type="checkbox"
                                            checked={enforceFirstChange}
                                            onChange={(e) => setEnforceFirstChange(e.target.checked)}
                                        />
                                        <span>Force password change on student's next login</span>
                                    </label>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem', paddingLeft: '1.5rem' }}>
                                        Student will be blocked by a force-change modal until they set their own password.
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                    <button type="button" onClick={() => setResettingUser(null)} className="btn btn-outline" style={{ flex: 1 }}>
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleConfirmPasswordReset}
                                        className="btn btn-primary"
                                        style={{ flex: 1, background: '#7c3aed' }}
                                        disabled={isSubmitting || tempPassword.length < 6}
                                    >
                                        {isSubmitting ? 'Resetting...' : 'Confirm Reset'}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
                                <div style={{ width: '56px', height: '56px', background: '#ecfdf5', color: '#059669', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                                    <CheckCircle size={32} />
                                </div>
                                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 0.5rem' }}>Password Reset Successful</h2>
                                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 1.25rem' }}>
                                    Temporary password issued for <strong>{resetSuccessResult.studentName}</strong>:
                                </p>

                                <div style={{ background: '#f5f3ff', border: '2px dashed #7c3aed', padding: '1rem', borderRadius: '14px', marginBottom: '1.25rem' }}>
                                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#7c3aed', letterSpacing: '1px' }}>
                                        {resetSuccessResult.temporaryPassword}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                                        Share this temporary password with the student.
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setResettingUser(null)}
                                    className="btn btn-primary"
                                    style={{ width: '100%', background: '#7c3aed' }}
                                >
                                    Done
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* Modal 4: Edit Student Details                                 */}
            {/* ------------------------------------------------------------- */}
            {editingStudent && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                    backdropFilter: 'blur(4px)', padding: '1rem'
                }}>
                    <div style={{
                        width: '100%', maxWidth: '480px', padding: '2rem',
                        borderRadius: '24px', background: '#fff', boxShadow: '0 25px 50px rgba(0,0,0,0.15)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                            <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>Edit Student Details</h2>
                            <button type="button" onClick={() => setEditingStudent(null)} style={{ border: 'none', background: '#f1f5f9', borderRadius: '50%', padding: '6px', cursor: 'pointer' }}>
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveStudentEdit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.3rem' }}>Full Name</label>
                                <input
                                    type="text"
                                    required
                                    value={editingStudent.name}
                                    onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none' }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.3rem' }}>Mobile Number</label>
                                    <input
                                        type="tel"
                                        required
                                        maxLength={10}
                                        value={editingStudent.phone}
                                        onChange={(e) => setEditingStudent({ ...editingStudent, phone: e.target.value.replace(/\D/g, '') })}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.3rem' }}>Email</label>
                                    <input
                                        type="email"
                                        value={editingStudent.email}
                                        onChange={(e) => setEditingStudent({ ...editingStudent, email: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.3rem' }}>Department</label>
                                    <select
                                        value={editingStudent.department}
                                        onChange={(e) => setEditingStudent({ ...editingStudent, department: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none' }}
                                    >
                                        {departments.map(d => (
                                            <option key={d.id} value={d.name}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.3rem' }}>Batch</label>
                                    <input
                                        type="text"
                                        value={editingStudent.batch}
                                        onChange={(e) => setEditingStudent({ ...editingStudent, batch: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none' }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.3rem' }}>Account Status</label>
                                <select
                                    value={editingStudent.status}
                                    onChange={(e) => setEditingStudent({ ...editingStudent, status: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none' }}
                                >
                                    <option value="active">Active</option>
                                    <option value="blocked">Blocked / Inactive</option>
                                    <option value="left">Left</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                                <button type="button" onClick={() => setEditingStudent(null)} className="btn btn-outline" style={{ flex: 1 }}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1, background: '#7c3aed' }} disabled={isSubmitting}>
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UsersList;
