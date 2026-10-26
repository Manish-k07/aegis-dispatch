import React, { useState, useEffect } from 'react';
import { Card, Button, Stack, Icon, StatusChip, Field } from './common';
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
  createdAt: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, userLabel }) => {
  const [activeTab, setActiveTab] = useState<'USERS' | 'UNITS' | 'HOSPITALS'>('USERS');
  const [users, setUsers] = useState<UserRow[]>([]);
  const [ambulances, setAmbulances] = useState<any[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New user form state
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('DISPATCHER');
  const [newFullName, setNewFullName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAssignedVehicle, setNewAssignedVehicle] = useState('');
  const [newAssignedHospital, setNewAssignedHospital] = useState('');

  // New unit form state
  const [newRegNum, setNewRegNum] = useState('');
  const [newUnitType, setNewUnitType] = useState('ALS');
  const [newDriverName, setNewDriverName] = useState('');
  const [newEmtName, setNewEmtName] = useState('');

  // New hospital form state
  const [newHospName, setNewHospName] = useState('');
  const [newHospPhone, setNewHospPhone] = useState('');
  const [newHospEdPhone, setNewHospEdPhone] = useState('');
  const [newHospAddress, setNewHospAddress] = useState('');

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
          setError('Failed to fetch users');
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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newPassword) return;
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json', ...getAuthHeader() };
      const res = await fetch(`${API_BASE}/admin/users`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
          role: newRole,
          fullName: newFullName || newUsername,
          phone: newPhone,
          assignedVehicleId: newAssignedVehicle,
          assignedHospitalId: newAssignedHospital,
        }),
      });
      if (res.ok) {
        setNewUsername('');
        setNewPassword('');
        setNewFullName('');
        setNewPhone('');
        setNewAssignedVehicle('');
        setNewAssignedHospital('');
        loadData();
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.error || 'Failed to create user');
      }
    } catch (e: any) {
      setError(e.message || 'Network error');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to remove this user?')) return;
    try {
      const headers: Record<string, string> = { ...getAuthHeader() };
      const res = await fetch(`${API_BASE}/admin/users/${id}`, {
        method: 'DELETE',
        headers,
      });
      if (res.ok) loadData();
    } catch {}
  };

  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRegNum) return;
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json', ...getAuthHeader() };
      const res = await fetch(`${API_BASE}/admin/ambulances`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          registrationNumber: newRegNum,
          type: newUnitType,
          driverName: newDriverName,
          emtName: newEmtName,
          status: 'AVAILABLE',
          latitude: 12.9716,
          longitude: 77.5946,
        }),
      });
      if (res.ok) {
        setNewRegNum('');
        setNewDriverName('');
        setNewEmtName('');
        loadData();
      }
    } catch {}
  };

  const handleCreateHospital = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHospName) return;
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json', ...getAuthHeader() };
      const res = await fetch(`${API_BASE}/admin/hospitals`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: newHospName,
          phone: newHospPhone,
          designatedEdPhone: newHospEdPhone,
          address: newHospAddress || 'Bengaluru Central',
          latitude: 12.9719,
          longitude: 77.5949,
          totalBeds: 100,
          availableBeds: 25,
          emergencyDepartment: true,
        }),
      });
      if (res.ok) {
        setNewHospName('');
        setNewHospPhone('');
        setNewHospEdPhone('');
        setNewHospAddress('');
        loadData();
      }
    } catch {}
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--md-sys-color-background)', padding: '24px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: 'var(--md-sys-color-on-background)' }}>
              Aegis System Administration
            </h1>
            <div style={{ fontSize: '14px', color: 'var(--md-sys-color-text-secondary)', marginTop: '4px' }}>
              Signed in as {userLabel} (ADMIN)
            </div>
          </div>
          <Button variant="outlined" onClick={onLogout} icon="logout">
            Sign out
          </Button>
        </div>

        {/* Tab selection */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--md-sys-color-outline-variant)', marginBottom: '20px' }}>
          <button
            onClick={() => setActiveTab('USERS')}
            style={{
              padding: '10px 20px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'USERS' ? '2px solid var(--md-sys-color-primary)' : '2px solid transparent',
              color: activeTab === 'USERS' ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-text-secondary)',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Staff & User Accounts
          </button>
          <button
            onClick={() => setActiveTab('UNITS')}
            style={{
              padding: '10px 20px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'UNITS' ? '2px solid var(--md-sys-color-primary)' : '2px solid transparent',
              color: activeTab === 'UNITS' ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-text-secondary)',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Ambulance Fleet
          </button>
          <button
            onClick={() => setActiveTab('HOSPITALS')}
            style={{
              padding: '10px 20px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'HOSPITALS' ? '2px solid var(--md-sys-color-primary)' : '2px solid transparent',
              color: activeTab === 'HOSPITALS' ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-text-secondary)',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Hospitals & ED Facilities
          </button>
        </div>

        {error && (
          <div style={{ padding: '12px 16px', backgroundColor: 'var(--md-sys-color-error-container)', color: 'var(--md-sys-color-error)', borderRadius: '8px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        {/* TAB: USERS */}
        {activeTab === 'USERS' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>
            {/* List */}
            <Card padding={24}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, marginTop: 0, marginBottom: '16px' }}>
                System Users ({users.length})
              </h2>
              {isLoading ? (
                <div>Loading accounts...</div>
              ) : users.length === 0 ? (
                <div style={{ color: 'var(--md-sys-color-text-secondary)', padding: '24px 0', textAlign: 'center' }}>
                  No registered users in database.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {users.map((u) => (
                    <div
                      key={u.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        border: '1px solid var(--md-sys-color-outline-variant)',
                        borderRadius: '8px',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 600 }}>{u.fullName || u.username}</span>
                          <span style={{ fontSize: '12px', color: 'var(--md-sys-color-text-secondary)' }}>({u.username})</span>
                          <StatusChip label={u.role} tone={u.role === 'ADMIN' ? 'error' : 'success'} />
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--md-sys-color-text-secondary)', marginTop: '4px' }}>
                          {u.phone && `Phone: ${u.phone} · `}
                          {u.assignedVehicleId && `Vehicle: ${u.assignedVehicleId} · `}
                          {u.assignedHospitalId && `Hospital: ${u.assignedHospitalId.substring(0, 8)}...`}
                        </div>
                      </div>
                      {u.role !== 'ADMIN' && (
                        <Button variant="outlined" size="small" onClick={() => handleDeleteUser(u.id)} icon="delete">
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Create form */}
            <Card padding={24}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, marginTop: 0, marginBottom: '16px' }}>
                Create Account
              </h2>
              <form onSubmit={handleCreateUser}>
                <Stack gap={12}>
                  <Field label="Role">
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--md-sys-color-outline-variant)' }}
                    >
                      <option value="DISPATCHER">DISPATCHER</option>
                      <option value="PARAMEDIC">PARAMEDIC</option>
                      <option value="HOSPITAL_STAFF">HOSPITAL_STAFF</option>
                    </select>
                  </Field>
                  <Field label="Username / Badge ID">
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder="e.g. CAD-105 or MED-204"
                      required
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--md-sys-color-outline-variant)' }}
                    />
                  </Field>
                  <Field label="Password">
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      required
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--md-sys-color-outline-variant)' }}
                    />
                  </Field>
                  <Field label="Full Name">
                    <input
                      type="text"
                      value={newFullName}
                      onChange={(e) => setNewFullName(e.target.value)}
                      placeholder="Personnel Name"
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--md-sys-color-outline-variant)' }}
                    />
                  </Field>
                  <Field label="Phone">
                    <input
                      type="text"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="+91..."
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--md-sys-color-outline-variant)' }}
                    />
                  </Field>
                  {newRole === 'PARAMEDIC' && (
                    <Field label="Bound Ambulance Registration">
                      <input
                        type="text"
                        value={newAssignedVehicle}
                        onChange={(e) => setNewAssignedVehicle(e.target.value)}
                        placeholder="e.g. KA-01-AE-1001"
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--md-sys-color-outline-variant)' }}
                      />
                    </Field>
                  )}
                  {newRole === 'HOSPITAL_STAFF' && (
                    <Field label="Bound Hospital ID">
                      <input
                        type="text"
                        value={newAssignedHospital}
                        onChange={(e) => setNewAssignedHospital(e.target.value)}
                        placeholder="Hospital UUID"
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--md-sys-color-outline-variant)' }}
                      />
                    </Field>
                  )}
                  <Button type="submit" variant="filled" icon="person_add" style={{ marginTop: '8px' }}>
                    Create User
                  </Button>
                </Stack>
              </form>
            </Card>
          </div>
        )}

        {/* TAB: UNITS */}
        {activeTab === 'UNITS' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>
            <Card padding={24}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, marginTop: 0, marginBottom: '16px' }}>
                Fleet Units ({ambulances.length})
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {ambulances.map((a) => (
                  <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', border: '1px solid var(--md-sys-color-outline-variant)', borderRadius: '8px' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{a.registrationNumber} ({a.type})</div>
                      <div style={{ fontSize: '12px', color: 'var(--md-sys-color-text-secondary)', marginTop: '4px' }}>
                        Driver: {a.driverName || 'Unassigned'} · Status: {a.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
            <Card padding={24}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, marginTop: 0, marginBottom: '16px' }}>Add Ambulance</h2>
              <form onSubmit={handleCreateUnit}>
                <Stack gap={12}>
                  <Field label="Registration Number">
                    <input type="text" value={newRegNum} onChange={(e) => setNewRegNum(e.target.value)} placeholder="KA-01-AE-..." required style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--md-sys-color-outline-variant)' }} />
                  </Field>
                  <Field label="Unit Type">
                    <select value={newUnitType} onChange={(e) => setNewUnitType(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--md-sys-color-outline-variant)' }}>
                      <option value="ALS">ALS (Advanced Life Support)</option>
                      <option value="BLS">BLS (Basic Life Support)</option>
                    </select>
                  </Field>
                  <Field label="Driver Name">
                    <input type="text" value={newDriverName} onChange={(e) => setNewDriverName(e.target.value)} placeholder="Driver Name" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--md-sys-color-outline-variant)' }} />
                  </Field>
                  <Field label="EMT Name">
                    <input type="text" value={newEmtName} onChange={(e) => setNewEmtName(e.target.value)} placeholder="EMT Name" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--md-sys-color-outline-variant)' }} />
                  </Field>
                  <Button type="submit" variant="filled" icon="add">Add Unit</Button>
                </Stack>
              </form>
            </Card>
          </div>
        )}

        {/* TAB: HOSPITALS */}
        {activeTab === 'HOSPITALS' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>
            <Card padding={24}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, marginTop: 0, marginBottom: '16px' }}>
                Hospitals & Trauma Centers ({hospitals.length})
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {hospitals.map((h) => (
                  <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', border: '1px solid var(--md-sys-color-outline-variant)', borderRadius: '8px' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{h.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--md-sys-color-text-secondary)', marginTop: '4px' }}>
                        ED Phone: {h.designatedEdPhone || h.phone || 'N/A'} · Available Beds: {h.availableBeds}/{h.totalBeds}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
            <Card padding={24}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, marginTop: 0, marginBottom: '16px' }}>Add Hospital</h2>
              <form onSubmit={handleCreateHospital}>
                <Stack gap={12}>
                  <Field label="Hospital Name">
                    <input type="text" value={newHospName} onChange={(e) => setNewHospName(e.target.value)} placeholder="Medical Center Name" required style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--md-sys-color-outline-variant)' }} />
                  </Field>
                  <Field label="Main Phone">
                    <input type="text" value={newHospPhone} onChange={(e) => setNewHospPhone(e.target.value)} placeholder="080-..." style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--md-sys-color-outline-variant)' }} />
                  </Field>
                  <Field label="Designated ED Phone">
                    <input type="text" value={newHospEdPhone} onChange={(e) => setNewHospEdPhone(e.target.value)} placeholder="+91..." style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--md-sys-color-outline-variant)' }} />
                  </Field>
                  <Field label="Address">
                    <input type="text" value={newHospAddress} onChange={(e) => setNewHospAddress(e.target.value)} placeholder="Address" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--md-sys-color-outline-variant)' }} />
                  </Field>
                  <Button type="submit" variant="filled" icon="local_hospital">Add Facility</Button>
                </Stack>
              </form>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};
