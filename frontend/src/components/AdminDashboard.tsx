import React, { useState, useEffect, useMemo } from 'react';
import {
  AppShell,
  Card,
  Button,
  Stack,
  Icon,
  IconButton,
  StatusChip,
  Field,
  Select,
  Switch,
  Tabs,
  ProgressBar,
  PhoneLink,
  Dialog,
  Snackbar,
  EmptyState,
  Tooltip,
} from './common';
import {
  formatRole,
  formatUnitStatus,
  formatUnitType,
  joinNonEmpty,
} from '../utils/formatters';
import { API_BASE } from '../config';

interface AdminDashboardProps {
  onLogout: () => void;
  userLabel: string;
}

interface UserRow {
  id: string;
  username: string;
  role: string;
  fullName: string;
  phone?: string;
  assignedVehicleId?: string;
  assignedHospitalId?: string;
  forcePasswordChange: boolean;
  enabled?: boolean;
  createdAt: string;
}

interface AmbulanceRow {
  id: string;
  registrationNumber: string;
  type: string;
  status: string;
  driverName?: string;
  emtName?: string;
  homeBase?: string;
  latitude?: number;
  longitude?: number;
}

interface HospitalRow {
  id: string;
  name: string;
  phone?: string;
  designatedEdPhone?: string;
  address?: string;
  status?: string;
  totalBeds: number;
  availableBeds: number;
  emergencyDepartment?: boolean;
  specialties?: string[];
  divertStatus?: boolean;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, userLabel }) => {
  const [activeTab, setActiveTab] = useState<'USERS' | 'UNITS' | 'HOSPITALS'>('USERS');
  const [users, setUsers] = useState<UserRow[]>([]);
  const [ambulances, setAmbulances] = useState<AmbulanceRow[]>([]);
  const [hospitals, setHospitals] = useState<HospitalRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Responsive Form Modal / Side Sheet
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Actions & Safety Feedback
  const [snackbar, setSnackbar] = useState<{ message: string; actionLabel?: string; onAction?: () => void } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'USER' | 'UNIT' | 'HOSPITAL'; id: string; name: string } | null>(null);
  const [resetPwDialog, setResetPwDialog] = useState<{ username: string; tempPass: string } | null>(null);

  // --- FORM STATES ---
  // User form
  const [newRole, setNewRole] = useState('DISPATCHER');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAssignedVehicle, setNewAssignedVehicle] = useState('');
  const [newAssignedHospital, setNewAssignedHospital] = useState('');
  const [userTouched, setUserTouched] = useState<Record<string, boolean>>({});

  // Unit form
  const [newRegNum, setNewRegNum] = useState('');
  const [newUnitType, setNewUnitType] = useState('ALS');
  const [newDriverName, setNewDriverName] = useState('');
  const [newEmtName, setNewEmtName] = useState('');
  const [newHomeBase, setNewHomeBase] = useState('Bengaluru Base Stn');
  const [newInitialStatus, setNewInitialStatus] = useState('AVAILABLE');
  const [unitTouched, setUnitTouched] = useState<Record<string, boolean>>({});

  // Hospital form
  const [newHospName, setNewHospName] = useState('');
  const [newHospPhone, setNewHospPhone] = useState('');
  const [newHospEdPhone, setNewHospEdPhone] = useState('');
  const [newHospAddress, setNewHospAddress] = useState('');
  const [newTotalBeds, setNewTotalBeds] = useState('100');
  const [newAvailableBeds, setNewAvailableBeds] = useState('25');
  const [newDivertStatus, setNewDivertStatus] = useState(false);
  const [hospTouched, setHospTouched] = useState<Record<string, boolean>>({});

  const clearForms = () => {
    // User
    setNewRole('DISPATCHER');
    setNewUsername('');
    setNewPassword('');
    setNewFullName('');
    setNewPhone('');
    setNewAssignedVehicle('');
    setNewAssignedHospital('');
    setUserTouched({});
    // Unit
    setNewRegNum('');
    setNewUnitType('ALS');
    setNewDriverName('');
    setNewEmtName('');
    setNewHomeBase('Bengaluru Base Stn');
    setNewInitialStatus('AVAILABLE');
    setUnitTouched({});
    // Hospital
    setNewHospName('');
    setNewHospPhone('');
    setNewHospEdPhone('');
    setNewHospAddress('');
    setNewTotalBeds('100');
    setNewAvailableBeds('25');
    setNewDivertStatus(false);
    setHospTouched({});
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId as any);
    setSearchQuery('');
    setRoleFilter('ALL');
    setStatusFilter('ALL');
    setPage(1);
    clearForms();
    setIsFormOpen(false);
  };

  const getAuthHeader = (): Record<string, string> => {
    const token = localStorage.getItem('aegis.live.token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json', ...getAuthHeader() };
      if (activeTab === 'USERS') {
        const res = await fetch(`${API_BASE}/admin/users`, { headers });
        if (res.ok) {
          setUsers(await res.json());
        } else {
          setError('Failed to fetch user accounts');
        }
      } else if (activeTab === 'UNITS') {
        const res = await fetch(`${API_BASE}/admin/ambulances`, { headers });
        if (res.ok) {
          setAmbulances(await res.json());
        } else {
          setError('Failed to fetch fleet units');
        }
      } else if (activeTab === 'HOSPITALS') {
        const res = await fetch(`${API_BASE}/admin/hospitals`, { headers });
        if (res.ok) {
          setHospitals(await res.json());
        } else {
          setError('Failed to fetch hospitals');
        }
      }
    } catch (e: any) {
      setError(e.message || 'Error connecting to admin service');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  // --- VALIDATION HELPERS ---
  const phonePattern = /^(?:\+91|91)?[6-9]\d{9}$/;
  const badgePattern = /^[a-zA-Z0-9-]{3,20}$/;
  const regNumPattern = /^[A-Z]{2}[- ]?[0-9]{2}[- ]?[A-Z]{1,2}[- ]?[0-9]{4}$/i;

  const isUserValid = useMemo(() => {
    const validUsername = badgePattern.test(newUsername.trim());
    const validPassword = newPassword.length >= 6;
    const validFullName = newFullName.trim().length >= 2;
    const validPhone = !newPhone || phonePattern.test(newPhone.replace(/\s+/g, ''));
    return validUsername && validPassword && validFullName && validPhone;
  }, [newUsername, newPassword, newFullName, newPhone]);

  const isUnitValid = useMemo(() => {
    return regNumPattern.test(newRegNum.trim());
  }, [newRegNum]);

  const isHospValid = useMemo(() => {
    const validName = newHospName.trim().length >= 3;
    const total = parseInt(newTotalBeds, 10);
    const avail = parseInt(newAvailableBeds, 10);
    const validBeds = !isNaN(total) && !isNaN(avail) && avail <= total && total > 0;
    return validName && validBeds;
  }, [newHospName, newTotalBeds, newAvailableBeds]);

  // --- ACTIONS ---
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserTouched({ username: true, password: true, fullName: true, phone: true });
    if (!isUserValid) return;

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json', ...getAuthHeader() };
      const res = await fetch(`${API_BASE}/admin/users`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          username: newUsername.trim(),
          password: newPassword,
          role: newRole,
          fullName: newFullName.trim(),
          phone: newPhone.trim(),
          assignedVehicleId: newAssignedVehicle.trim() || null,
          assignedHospitalId: newAssignedHospital.trim() || null,
        }),
      });
      if (res.ok) {
        clearForms();
        setIsFormOpen(false);
        setSnackbar({ message: `Account "${newUsername.trim()}" created successfully` });
        loadData();
      } else {
        const err = await res.json().catch(() => ({}));
        setSnackbar({ message: err.error || 'Failed to create user' });
      }
    } catch (e: any) {
      setSnackbar({ message: e.message || 'Network error creating user' });
    }
  };

  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUnitTouched({ regNum: true });
    if (!isUnitValid) return;

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json', ...getAuthHeader() };
      const res = await fetch(`${API_BASE}/admin/ambulances`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          registrationNumber: newRegNum.trim().toUpperCase(),
          type: newUnitType,
          driverName: newDriverName.trim() || null,
          emtName: newEmtName.trim() || null,
          status: newInitialStatus,
          latitude: 12.9716,
          longitude: 77.5946,
        }),
      });
      if (res.ok) {
        clearForms();
        setIsFormOpen(false);
        setSnackbar({ message: `Ambulance ${newRegNum.trim().toUpperCase()} added to fleet` });
        loadData();
      } else {
        const err = await res.json().catch(() => ({}));
        setSnackbar({ message: err.error || 'Failed to add ambulance' });
      }
    } catch (e: any) {
      setSnackbar({ message: e.message || 'Network error adding ambulance' });
    }
  };

  const handleCreateHospital = async (e: React.FormEvent) => {
    e.preventDefault();
    setHospTouched({ name: true, beds: true });
    if (!isHospValid) return;

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json', ...getAuthHeader() };
      const res = await fetch(`${API_BASE}/admin/hospitals`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: newHospName.trim(),
          phone: newHospPhone.trim() || null,
          designatedEdPhone: newHospEdPhone.trim() || null,
          address: newHospAddress.trim() || 'Central Bengaluru',
          latitude: 12.9719,
          longitude: 77.5949,
          totalBeds: parseInt(newTotalBeds, 10) || 100,
          availableBeds: parseInt(newAvailableBeds, 10) || 25,
          emergencyDepartment: true,
          status: newDivertStatus ? 'DIVERT' : 'AVAILABLE',
        }),
      });
      if (res.ok) {
        clearForms();
        setIsFormOpen(false);
        setSnackbar({ message: `Hospital "${newHospName.trim()}" registered successfully` });
        loadData();
      } else {
        const err = await res.json().catch(() => ({}));
        setSnackbar({ message: err.error || 'Failed to register facility' });
      }
    } catch (e: any) {
      setSnackbar({ message: e.message || 'Network error registering hospital' });
    }
  };

  // Safe Actions: Delete
  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    const { type, id, name } = deleteConfirm;
    setDeleteConfirm(null);

    try {
      const headers: Record<string, string> = { ...getAuthHeader() };
      let endpoint = '';
      if (type === 'USER') endpoint = `${API_BASE}/admin/users/${id}`;
      else if (type === 'UNIT') endpoint = `${API_BASE}/admin/ambulances/${id}`;
      else if (type === 'HOSPITAL') endpoint = `${API_BASE}/admin/hospitals/${id}`;

      const res = await fetch(endpoint, { method: 'DELETE', headers });
      if (res.ok) {
        setSnackbar({ message: `${name} deleted successfully` });
        loadData();
      } else {
        const err = await res.json().catch(() => ({}));
        setSnackbar({ message: err.error || `Unable to delete ${name}` });
      }
    } catch (e: any) {
      setSnackbar({ message: e.message || `Error deleting ${name}` });
    }
  };

  // Safe Actions: Toggle status with 5s Undo
  const handleToggleStatus = async (user: UserRow) => {
    try {
      const headers: Record<string, string> = { ...getAuthHeader() };
      const res = await fetch(`${API_BASE}/admin/users/${user.id}/toggle-status`, {
        method: 'POST',
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        loadData();
        setSnackbar({
          message: `${user.username} ${data.enabled ? 'enabled' : 'disabled'}`,
          actionLabel: 'Undo',
          onAction: () => handleToggleStatus({ ...user, enabled: data.enabled }),
        });
      } else {
        const err = await res.json().catch(() => ({}));
        setSnackbar({ message: err.error || 'Failed to update user status' });
      }
    } catch (e: any) {
      setSnackbar({ message: e.message || 'Network error' });
    }
  };

  // Safe Actions: Reset password
  const handleResetPassword = async (user: UserRow) => {
    try {
      const headers: Record<string, string> = { ...getAuthHeader() };
      const res = await fetch(`${API_BASE}/admin/users/${user.id}/reset-password`, {
        method: 'POST',
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        setResetPwDialog({
          username: user.username,
          tempPass: data.temporaryPassword,
        });
      } else {
        const err = await res.json().catch(() => ({}));
        setSnackbar({ message: err.error || 'Failed to reset password' });
      }
    } catch (e: any) {
      setSnackbar({ message: e.message || 'Network error' });
    }
  };

  // Filter & Search logic
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.phone && u.phone.includes(searchQuery));
      const matchesRole = roleFilter === 'ALL' || u.role.toUpperCase() === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, roleFilter]);

  const filteredAmbulances = useMemo(() => {
    return ambulances.filter((a) => {
      const matchesSearch =
        a.registrationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.driverName && a.driverName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (a.emtName && a.emtName.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = statusFilter === 'ALL' || a.status.toUpperCase() === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [ambulances, searchQuery, statusFilter]);

  const filteredHospitals = useMemo(() => {
    return hospitals.filter((h) => {
      const matchesSearch =
        h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (h.address && h.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (h.phone && h.phone.includes(searchQuery));
      return matchesSearch;
    });
  }, [hospitals, searchQuery]);

  // Paginated Slices
  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, page]);

  const paginatedAmbulances = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredAmbulances.slice(start, start + pageSize);
  }, [filteredAmbulances, page]);

  const paginatedHospitals = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredHospitals.slice(start, start + pageSize);
  }, [filteredHospitals, page]);

  // Role icon helper for StatusChip (no green checkmarks)
  const getRoleIcon = (role: string) => {
    switch (role.toUpperCase()) {
      case 'DISPATCHER':
        return 'shield';
      case 'PARAMEDIC':
        return 'ambulance';
      case 'HOSPITAL_STAFF':
        return 'local_hospital';
      case 'CITIZEN':
        return 'person';
      case 'ADMIN':
        return 'admin_panel_settings';
      default:
        return 'badge';
    }
  };

  const getRoleTone = (role: string) => {
    switch (role.toUpperCase()) {
      case 'ADMIN':
        return 'warning';
      case 'DISPATCHER':
        return 'info';
      case 'PARAMEDIC':
        return 'success';
      case 'HOSPITAL_STAFF':
        return 'info';
      default:
        return 'neutral';
    }
  };

  // --- RENDER FORM CONTENTS ---
  const renderUserForm = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <Select
        label="Role"
        value={newRole}
        onChange={(val) => {
          setNewRole(val);
          setNewAssignedVehicle('');
          setNewAssignedHospital('');
        }}
        options={[
          { value: 'DISPATCHER', label: 'Dispatcher', icon: 'shield' },
          { value: 'PARAMEDIC', label: 'Paramedic', icon: 'ambulance' },
          { value: 'HOSPITAL_STAFF', label: 'Hospital staff', icon: 'local_hospital' },
          { value: 'ADMIN', label: 'Administrator', icon: 'admin_panel_settings' },
        ]}
      />

      <Field
        label="Username / Badge ID"
        name="admin_usr_username_input"
        autoComplete="off"
        value={newUsername}
        onChange={(e) => setNewUsername(e.target.value)}
        onBlur={() => setUserTouched((prev) => ({ ...prev, username: true }))}
        placeholder="e.g. CAD-105 or MED-204"
        required
        error={
          userTouched.username && !badgePattern.test(newUsername.trim())
            ? 'Badge ID must be 3-20 characters (alphanumeric and hyphens only)'
            : undefined
        }
      />

      <Field
        label="Initial Password"
        name="admin_usr_password_input"
        type="password"
        autoComplete="new-password"
        showPasswordToggle
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        onBlur={() => setUserTouched((prev) => ({ ...prev, password: true }))}
        placeholder="Min 6 characters"
        required
        error={
          userTouched.password && newPassword.length < 6
            ? 'Password must contain at least 6 characters'
            : undefined
        }
      />

      <Field
        label="Full Name"
        name="admin_usr_fullname_input"
        autoComplete="off"
        value={newFullName}
        onChange={(e) => setNewFullName(e.target.value)}
        onBlur={() => setUserTouched((prev) => ({ ...prev, fullName: true }))}
        placeholder="Personnel Full Name"
        required
        error={
          userTouched.fullName && newFullName.trim().length < 2
            ? 'Full name is required (min 2 characters)'
            : undefined
        }
      />

      <Field
        label="Phone Number"
        name="admin_usr_phone_input"
        autoComplete="off"
        value={newPhone}
        onChange={(e) => setNewPhone(e.target.value)}
        onBlur={() => setUserTouched((prev) => ({ ...prev, phone: true }))}
        placeholder="+91 98000 00001"
        error={
          userTouched.phone && newPhone && !phonePattern.test(newPhone.replace(/\s+/g, ''))
            ? 'Enter a valid Indian mobile number (+91 [6-9]XXXXXXXXX)'
            : undefined
        }
      />

      {newRole === 'PARAMEDIC' && (
        <Select
          label="Assigned Ambulance"
          value={newAssignedVehicle}
          onChange={setNewAssignedVehicle}
          options={[
            { value: '', label: 'None (Floating paramedic)' },
            ...ambulances.map((a) => ({
              value: a.registrationNumber,
              label: `${a.registrationNumber} (${a.type})`,
            })),
          ]}
        />
      )}

      {newRole === 'HOSPITAL_STAFF' && (
        <Select
          label="Assigned Hospital"
          value={newAssignedHospital}
          onChange={setNewAssignedHospital}
          options={[
            { value: '', label: 'Select Facility...' },
            ...hospitals.map((h) => ({
              value: h.id,
              label: h.name,
            })),
          ]}
        />
      )}

      <Button
        variant="filled"
        icon="person_add"
        onClick={handleCreateUser as any}
        disabled={!isUserValid}
        style={{ marginTop: '8px' }}
      >
        Create Account
      </Button>
    </div>
  );

  const renderUnitForm = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <Field
        label="Registration Number"
        name="admin_unit_reg_input"
        autoComplete="off"
        value={newRegNum}
        onChange={(e) => setNewRegNum(e.target.value)}
        onBlur={() => setUnitTouched((prev) => ({ ...prev, regNum: true }))}
        placeholder="e.g. KA-01-AE-1001"
        required
        error={
          unitTouched.regNum && !regNumPattern.test(newRegNum.trim())
            ? 'Format: standard vehicle registration (e.g. KA-01-AE-1001)'
            : undefined
        }
      />

      <Select
        label="Unit Type"
        value={newUnitType}
        onChange={setNewUnitType}
        options={[
          { value: 'ALS', label: 'Advanced Life Support (ALS)' },
          { value: 'BLS', label: 'Basic Life Support (BLS)' },
          { value: 'MICU', label: 'Mobile ICU (MICU)' },
        ]}
      />

      <Select
        label="Initial Status"
        value={newInitialStatus}
        onChange={setNewInitialStatus}
        options={[
          { value: 'AVAILABLE', label: 'Available' },
          { value: 'OUT_OF_SERVICE', label: 'Out of service' },
        ]}
      />

      <Field
        label="Driver Name"
        name="admin_unit_driver_input"
        autoComplete="off"
        value={newDriverName}
        onChange={(e) => setNewDriverName(e.target.value)}
        placeholder="Assigned Driver Name"
      />

      <Field
        label="Lead Paramedic / EMT"
        name="admin_unit_emt_input"
        autoComplete="off"
        value={newEmtName}
        onChange={(e) => setNewEmtName(e.target.value)}
        placeholder="Assigned EMT Name"
      />

      <Field
        label="Home Base Station"
        name="admin_unit_base_input"
        autoComplete="off"
        value={newHomeBase}
        onChange={(e) => setNewHomeBase(e.target.value)}
        placeholder="Station location or facility"
      />

      <Button
        variant="filled"
        icon="add"
        onClick={handleCreateUnit as any}
        disabled={!isUnitValid}
        style={{ marginTop: '8px' }}
      >
        Add Unit to Fleet
      </Button>
    </div>
  );

  const renderHospitalForm = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <Field
        label="Hospital / Trauma Center Name"
        name="admin_hosp_name_input"
        autoComplete="off"
        value={newHospName}
        onChange={(e) => setNewHospName(e.target.value)}
        onBlur={() => setHospTouched((prev) => ({ ...prev, name: true }))}
        placeholder="e.g. Aegis Central Medical Center"
        required
        error={
          hospTouched.name && newHospName.trim().length < 3
            ? 'Hospital name must be at least 3 characters'
            : undefined
        }
      />

      <Field
        label="Main Reception Phone"
        name="admin_hosp_phone_input"
        autoComplete="off"
        value={newHospPhone}
        onChange={(e) => setNewHospPhone(e.target.value)}
        placeholder="080-22220000"
      />

      <Field
        label="Designated ED Emergency Phone"
        name="admin_hosp_edphone_input"
        autoComplete="off"
        value={newHospEdPhone}
        onChange={(e) => setNewHospEdPhone(e.target.value)}
        placeholder="+91 98000 00001"
      />

      <Field
        label="Physical Address & Landmark"
        name="admin_hosp_addr_input"
        autoComplete="off"
        value={newHospAddress}
        onChange={(e) => setNewHospAddress(e.target.value)}
        placeholder="Street address, city area"
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <Field
          label="Total Beds"
          name="admin_hosp_totalbeds_input"
          type="number"
          value={newTotalBeds}
          onChange={(e) => setNewTotalBeds(e.target.value)}
        />
        <Field
          label="Available Beds"
          name="admin_hosp_availbeds_input"
          type="number"
          value={newAvailableBeds}
          onChange={(e) => setNewAvailableBeds(e.target.value)}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
        <span style={{ fontSize: '14px', color: 'var(--md-sys-color-text)' }}>Emergency Divert Status</span>
        <Switch
          checked={newDivertStatus}
          onChange={setNewDivertStatus}
          label={newDivertStatus ? 'Divert Active' : 'Normal Operations'}
        />
      </div>

      <Button
        variant="filled"
        icon="local_hospital"
        onClick={handleCreateHospital as any}
        disabled={!isHospValid}
        style={{ marginTop: '8px' }}
      >
        Register Facility
      </Button>
    </div>
  );

  return (
    <AppShell
      header={
        <header
          style={{
            height: '64px',
            backgroundColor: 'var(--md-sys-color-surface)',
            borderBottom: '1px solid var(--md-sys-color-outline-variant)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'var(--md-sys-color-primary-container)',
                color: 'var(--md-sys-color-on-primary-container)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="admin_panel_settings" size={22} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--md-sys-color-text)' }}>
                Aegis System Administration
              </h1>
              <div style={{ fontSize: '12px', color: 'var(--md-sys-color-text-secondary)' }}>
                Personnel, Fleet & Infrastructure Management
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 12px',
                borderRadius: '20px',
                backgroundColor: 'var(--md-sys-color-surface-container-high)',
                fontSize: '13px',
                fontWeight: 500,
              }}
            >
              <Icon name="account_circle" size={18} style={{ color: 'var(--md-sys-color-primary)' }} />
              <span>{userLabel}</span>
              <span style={{ fontSize: '11px', color: 'var(--md-sys-color-text-secondary)', textTransform: 'uppercase' }}>
                (Admin)
              </span>
            </div>

            <Button variant="outlined" size="small" icon="logout" onClick={onLogout}>
              Sign out
            </Button>
          </div>
        </header>
      }
    >
      <div style={{ maxWidth: '1440px', width: '100%', margin: '0 auto', padding: '24px', boxSizing: 'border-box' }}>
        {/* Navigation Tabs */}
        <div style={{ marginBottom: '24px' }}>
          <Tabs
            tabs={[
              { id: 'USERS', label: 'Staff & User Accounts', icon: 'group', badge: users.length },
              { id: 'UNITS', label: 'Ambulance Fleet', icon: 'ambulance', badge: ambulances.length },
              { id: 'HOSPITALS', label: 'Hospitals & ED Facilities', icon: 'local_hospital', badge: hospitals.length },
            ]}
            activeTab={activeTab}
            onChange={handleTabChange}
          />
        </div>

        {/* Global Error Banner */}
        {error && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: 'var(--md-sys-color-error-container)',
              color: 'var(--md-sys-color-on-error-container)',
              borderRadius: '8px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icon name="error" size={20} />
              <span>{error}</span>
            </div>
            <Button variant="text" size="small" onClick={loadData}>
              Retry
            </Button>
          </div>
        )}

        {/* Search, Filter & Mobile Add Bar */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', flex: 1 }}>
            <div style={{ width: '100%', maxWidth: '360px' }}>
              <Field
                fieldSize="compact"
                leadingIcon="search"
                placeholder={
                  activeTab === 'USERS'
                    ? 'Search personnel name, badge...'
                    : activeTab === 'UNITS'
                    ? 'Search registration number, crew...'
                    : 'Search hospital name, address...'
                }
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                trailingIcon={searchQuery ? 'close' : undefined}
                onTrailingIconClick={() => setSearchQuery('')}
              />
            </div>

            {activeTab === 'USERS' && (
              <div style={{ width: '180px' }}>
                <Select
                  label="Filter Role"
                  value={roleFilter}
                  onChange={(val) => {
                    setRoleFilter(val);
                    setPage(1);
                  }}
                  options={[
                    { value: 'ALL', label: 'All Roles' },
                    { value: 'DISPATCHER', label: 'Dispatcher' },
                    { value: 'PARAMEDIC', label: 'Paramedic' },
                    { value: 'HOSPITAL_STAFF', label: 'Hospital staff' },
                    { value: 'ADMIN', label: 'Administrator' },
                  ]}
                />
              </div>
            )}

            {activeTab === 'UNITS' && (
              <div style={{ width: '180px' }}>
                <Select
                  label="Filter Status"
                  value={statusFilter}
                  onChange={(val) => {
                    setStatusFilter(val);
                    setPage(1);
                  }}
                  options={[
                    { value: 'ALL', label: 'All Statuses' },
                    { value: 'AVAILABLE', label: 'Available' },
                    { value: 'DISPATCHED', label: 'Dispatched' },
                    { value: 'OUT_OF_SERVICE', label: 'Out of service' },
                  ]}
                />
              </div>
            )}
          </div>

          {/* "+ Add" button for screens below 1000px */}
          <div className="m3-admin-mobile-add-btn">
            <Button
              variant="filled"
              icon="add"
              onClick={() => setIsFormOpen(true)}
            >
              {activeTab === 'USERS' ? 'Add User' : activeTab === 'UNITS' ? 'Add Ambulance' : 'Add Hospital'}
            </Button>
          </div>
        </div>

        {/* Two-Column Responsive Grid (List 2fr / Form 1fr) */}
        <div className="m3-admin-grid">
          {/* Main List Column */}
          <div style={{ minWidth: 0 }}>
            {/* TAB: USERS */}
            {activeTab === 'USERS' && (
              <Card padding={24}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>
                    Registered Users ({filteredUsers.length})
                  </h2>
                  <div style={{ fontSize: '12px', color: 'var(--md-sys-color-text-secondary)' }}>
                    Page {page} of {Math.max(1, Math.ceil(filteredUsers.length / pageSize))}
                  </div>
                </div>

                {isLoading ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: 'var(--md-sys-color-text-secondary)' }}>
                    Loading accounts...
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <EmptyState
                    icon="group_off"
                    title="No users match your criteria"
                    description="Try adjusting your search query or role filter."
                  />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {paginatedUsers.map((u) => (
                      <div
                        key={u.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          border: '1px solid var(--md-sys-color-outline-variant)',
                          borderRadius: '8px',
                          backgroundColor: u.enabled === false ? 'var(--md-sys-color-surface-container-high)' : 'transparent',
                          opacity: u.enabled === false ? 0.75 : 1,
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1, marginRight: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 600, color: 'var(--md-sys-color-text)' }}>
                              {u.fullName || u.username}
                            </span>
                            <span style={{ fontSize: '12px', color: 'var(--md-sys-color-text-secondary)' }}>
                              ({u.username})
                            </span>
                            <StatusChip
                              label={formatRole(u.role)}
                              icon={getRoleIcon(u.role)}
                              tone={getRoleTone(u.role)}
                              size="small"
                            />
                            {u.enabled === false && (
                              <StatusChip label="Disabled" tone="error" size="small" icon="block" />
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '12px', color: 'var(--md-sys-color-text-secondary)', marginTop: '4px' }}>
                            {u.phone && <PhoneLink phone={u.phone} />}
                            {u.phone && (u.assignedVehicleId || u.assignedHospitalId) && <span>·</span>}
                            {u.assignedVehicleId && <span>Vehicle: {u.assignedVehicleId}</span>}
                            {u.assignedVehicleId && u.assignedHospitalId && <span>·</span>}
                            {u.assignedHospitalId && <span>Hospital: {u.assignedHospitalId.substring(0, 8)}...</span>}
                          </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Tooltip content="Reset Password">
                            <IconButton
                              icon="lock_reset"
                              size="standard"
                              aria-label="Reset password"
                              onClick={() => handleResetPassword(u)}
                            />
                          </Tooltip>

                          <Tooltip content={u.enabled === false ? 'Enable user' : 'Disable user'}>
                            <IconButton
                              icon={u.enabled === false ? 'check_circle' : 'block'}
                              size="standard"
                              aria-label="Toggle user status"
                              onClick={() => handleToggleStatus(u)}
                            />
                          </Tooltip>

                          <Tooltip content="Delete Account">
                            <IconButton
                              icon="delete"
                              size="standard"
                              aria-label="Delete user"
                              style={{ color: 'var(--md-sys-color-error)' }}
                              onClick={() => setDeleteConfirm({ type: 'USER', id: u.id, name: u.fullName || u.username })}
                            />
                          </Tooltip>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {/* TAB: UNITS */}
            {activeTab === 'UNITS' && (
              <Card padding={24}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>
                    Ambulance Units ({filteredAmbulances.length})
                  </h2>
                  <div style={{ fontSize: '12px', color: 'var(--md-sys-color-text-secondary)' }}>
                    Page {page} of {Math.max(1, Math.ceil(filteredAmbulances.length / pageSize))}
                  </div>
                </div>

                {isLoading ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: 'var(--md-sys-color-text-secondary)' }}>
                    Loading fleet...
                  </div>
                ) : filteredAmbulances.length === 0 ? (
                  <EmptyState
                    icon="airport_shuttle"
                    title="No fleet units match your filter"
                    description="Try selecting all statuses or clearing your search."
                  />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {paginatedAmbulances.map((a) => (
                      <div
                        key={a.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          border: '1px solid var(--md-sys-color-outline-variant)',
                          borderRadius: '8px',
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1, marginRight: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 600, color: 'var(--md-sys-color-text)' }}>
                              {a.registrationNumber}
                            </span>
                            <StatusChip label={formatUnitType(a.type)} tone="info" size="small" icon="local_shipping" />
                            <StatusChip
                              label={formatUnitStatus(a.status)}
                              tone={a.status === 'AVAILABLE' ? 'success' : a.status === 'OUT_OF_SERVICE' ? 'error' : 'warning'}
                              size="small"
                              icon="info"
                            />
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--md-sys-color-text-secondary)', marginTop: '4px' }}>
                            {joinNonEmpty([
                              a.driverName ? `Driver: ${a.driverName}` : 'Driver: Unassigned',
                              a.emtName ? `EMT: ${a.emtName}` : null,
                              a.homeBase ? `Base: ${a.homeBase}` : null,
                            ])}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Tooltip content="Remove Ambulance">
                            <IconButton
                              icon="delete"
                              size="standard"
                              aria-label="Remove unit"
                              style={{ color: 'var(--md-sys-color-error)' }}
                              onClick={() => setDeleteConfirm({ type: 'UNIT', id: a.id, name: a.registrationNumber })}
                            />
                          </Tooltip>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {/* TAB: HOSPITALS */}
            {activeTab === 'HOSPITALS' && (
              <Card padding={24}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>
                    Emergency Facilities ({filteredHospitals.length})
                  </h2>
                  <div style={{ fontSize: '12px', color: 'var(--md-sys-color-text-secondary)' }}>
                    Page {page} of {Math.max(1, Math.ceil(filteredHospitals.length / pageSize))}
                  </div>
                </div>

                {isLoading ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: 'var(--md-sys-color-text-secondary)' }}>
                    Loading hospitals...
                  </div>
                ) : filteredHospitals.length === 0 ? (
                  <EmptyState
                    icon="local_hospital"
                    title="No hospitals found"
                    description="Try clearing your search term."
                  />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {paginatedHospitals.map((h) => (
                      <div
                        key={h.id}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                          padding: '16px',
                          border: '1px solid var(--md-sys-color-outline-variant)',
                          borderRadius: '8px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 600, fontSize: '15px', color: 'var(--md-sys-color-text)' }}>
                              {h.name}
                            </span>
                            <StatusChip
                              label={h.status === 'DIVERT' ? 'Divert Active' : 'Receiving Patients'}
                              tone={h.status === 'DIVERT' ? 'error' : 'success'}
                              size="small"
                              icon={h.status === 'DIVERT' ? 'cancel' : 'check_circle'}
                            />
                          </div>

                          <Tooltip content="Remove Facility">
                            <IconButton
                              icon="delete"
                              size="standard"
                              aria-label="Remove hospital"
                              style={{ color: 'var(--md-sys-color-error)' }}
                              onClick={() => setDeleteConfirm({ type: 'HOSPITAL', id: h.id, name: h.name })}
                            />
                          </Tooltip>
                        </div>

                        <div style={{ fontSize: '13px', color: 'var(--md-sys-color-text-secondary)' }}>
                          {joinNonEmpty([
                            h.address,
                            h.designatedEdPhone ? `ED: ${h.designatedEdPhone}` : null,
                            h.phone ? `Main: ${h.phone}` : null,
                          ])}
                        </div>

                        {/* Capacity Progress Bar */}
                        <div style={{ maxWidth: '400px' }}>
                          <ProgressBar
                            label="Emergency Bed Occupancy"
                            current={h.availableBeds}
                            total={h.totalBeds}
                            unit="beds available"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}
          </div>

          {/* Form Column (Desktop 1fr, hides below 1000px) */}
          <div className="m3-admin-desktop-form">
            <Card padding={24}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, marginTop: 0, marginBottom: '16px' }}>
                {activeTab === 'USERS'
                  ? 'Create Staff Account'
                  : activeTab === 'UNITS'
                  ? 'Add Ambulance Unit'
                  : 'Register Medical Center'}
              </h2>
              {activeTab === 'USERS' && renderUserForm()}
              {activeTab === 'UNITS' && renderUnitForm()}
              {activeTab === 'HOSPITALS' && renderHospitalForm()}
            </Card>
          </div>
        </div>

        {/* Mobile / Tablet Dialog for Add Form */}
        <Dialog
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          title={
            activeTab === 'USERS'
              ? 'Create Staff Account'
              : activeTab === 'UNITS'
              ? 'Add Ambulance Unit'
              : 'Register Medical Center'
          }
        >
          <div style={{ paddingTop: '8px' }}>
            {activeTab === 'USERS' && renderUserForm()}
            {activeTab === 'UNITS' && renderUnitForm()}
            {activeTab === 'HOSPITALS' && renderHospitalForm()}
          </div>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
          isOpen={Boolean(deleteConfirm)}
          onClose={() => setDeleteConfirm(null)}
          title={`Confirm Delete ${deleteConfirm?.type === 'USER' ? 'Account' : deleteConfirm?.type === 'UNIT' ? 'Ambulance' : 'Hospital'}`}
          actions={
            <>
              <Button variant="text" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button
                variant="filled"
                onClick={confirmDelete}
                style={{ backgroundColor: 'var(--md-sys-color-error)', color: 'var(--md-sys-color-on-error)' }}
              >
                Delete permanently
              </Button>
            </>
          }
        >
          <p style={{ margin: 0, fontSize: '14px', lineHeight: '20px' }}>
            Are you sure you want to permanently delete <strong>{deleteConfirm?.name}</strong>?
            This operation is audited and cannot be undone.
          </p>
        </Dialog>

        {/* Reset Password Result Dialog */}
        <Dialog
          isOpen={Boolean(resetPwDialog)}
          onClose={() => setResetPwDialog(null)}
          title="Password Reset Generated"
          actions={
            <Button variant="filled" onClick={() => setResetPwDialog(null)}>
              Done
            </Button>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ margin: 0, fontSize: '14px' }}>
              Temporary password generated for <strong>{resetPwDialog?.username}</strong>. The user will be required to change their password on next sign-in.
            </p>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                backgroundColor: 'var(--md-sys-color-surface-container-high)',
                borderRadius: '8px',
                fontFamily: 'monospace',
                fontSize: '16px',
                fontWeight: 600,
                letterSpacing: '1px',
              }}
            >
              <span>{resetPwDialog?.tempPass}</span>
              <Button
                variant="outlined"
                size="small"
                icon="content_copy"
                onClick={() => {
                  navigator.clipboard.writeText(resetPwDialog?.tempPass || '');
                  setSnackbar({ message: 'Password copied to clipboard' });
                }}
              >
                Copy
              </Button>
            </div>
          </div>
        </Dialog>

        {/* Feedback Snackbar with Undo */}
        {snackbar && (
          <Snackbar
            isOpen={Boolean(snackbar)}
            message={snackbar.message}
            actionLabel={snackbar.actionLabel}
            onAction={snackbar.onAction}
            onClose={() => setSnackbar(null)}
            durationMs={5000}
          />
        )}
      </div>
    </AppShell>
  );
};
