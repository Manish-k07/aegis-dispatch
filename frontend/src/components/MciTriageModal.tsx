import React, { useState } from 'react';
import {
  AlertTriangle,
  Users,
  ShieldAlert,
  Building2,
  CheckCircle2,
  X,
  Plus,
  QrCode,
  Truck,
  ArrowRight
} from 'lucide-react';
import { Hospital } from '../types';

interface MciTriageModalProps {
  isOpen: boolean;
  onClose: () => void;
  hospitals: Hospital[];
}

export const MciTriageModal: React.FC<MciTriageModalProps> = ({
  isOpen,
  onClose,
  hospitals,
}) => {
  // START/SALT Triage Counts
  const [counts, setCounts] = useState({
    red: 8,      // Immediate
    yellow: 14,  // Delayed
    green: 18,   // Minor
    black: 2,    // Expectant
  });

  const [recentTags, setRecentTags] = useState([
    { tagId: 'MCI-0401-RED', priority: 'RED', age: 34, chief: 'Tension Pneumothorax / Flail Chest', assignedHospital: 'Aegis City General', bay: 'Trauma Bay 1' },
    { tagId: 'MCI-0402-RED', priority: 'RED', age: 28, chief: 'Compound Femur Fracture w/ Hemorrhagic Shock', assignedHospital: 'Metro Trauma Centre', bay: 'Trauma Bay 2' },
    { tagId: 'MCI-0403-YEL', priority: 'YELLOW', age: 42, chief: 'Blunt Abdominal Trauma (Stable)', assignedHospital: 'Southside Community', bay: 'ED Bed 4' },
    { tagId: 'MCI-0404-GRN', priority: 'GREEN', age: 19, chief: 'Superficial Lacerations / Walking Wounded', assignedHospital: 'Southside Community', bay: 'Minor Triage Area' },
  ]);

  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newPriority, setNewPriority] = useState<'RED' | 'YELLOW' | 'GREEN' | 'BLACK'>('RED');
  const [newChief, setNewChief] = useState('');

  const totalCasualties = counts.red + counts.yellow + counts.green + counts.black;

  const handleCreateTag = () => {
    if (!newChief) return;
    const tagId = `MCI-${Math.floor(1000 + Math.random() * 9000)}-${newPriority.substring(0, 3)}`;
    const randomHosp = hospitals[Math.floor(Math.random() * hospitals.length)]?.name || 'Aegis City General';

    setRecentTags([
      { tagId, priority: newPriority, age: Math.floor(18 + Math.random() * 50), chief: newChief, assignedHospital: randomHosp, bay: 'Immediate Intake' },
      ...recentTags,
    ]);

    if (newPriority === 'RED') setCounts((c) => ({ ...c, red: c.red + 1 }));
    if (newPriority === 'YELLOW') setCounts((c) => ({ ...c, yellow: c.yellow + 1 }));
    if (newPriority === 'GREEN') setCounts((c) => ({ ...c, green: c.green + 1 }));
    if (newPriority === 'BLACK') setCounts((c) => ({ ...c, black: c.black + 1 }));

    setNewChief('');
    setIsAddingTag(false);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div
        className="modal-content"
        style={{
          maxWidth: '860px',
          width: '94%',
          background: 'rgba(11, 16, 28, 0.98)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: '18px',
          padding: '26px 30px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(16px)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
              <ShieldAlert size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <strong style={{ fontSize: '17px', color: '#f8fafc', letterSpacing: '0.5px' }}>
                  Mass Casualty Incident (MCI) & START Triage Console
                </strong>
                <span style={{ fontSize: '10px', background: '#dc2626', color: '#ffffff', padding: '2px 8px', borderRadius: '4px', fontWeight: 800 }}>
                  ACTIVE PROTOCOL
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '3px' }}>
                Automated Regional Trauma Load-Balancing & START/SALT Digital Tagging Matrix
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{ background: 'rgba(255, 255, 255, 0.06)', border: 'none', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* 4 Triage Ribbon Bins with Generous Whitespace */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '22px' }}>
          {/* RED: Immediate */}
          <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid #ef4444', borderRadius: '14px', padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#fca5a5', fontWeight: 800, letterSpacing: '1px', marginBottom: '4px' }}>
              RED · IMMEDIATE
            </div>
            <div style={{ fontSize: '32px', fontWeight: 900, color: '#fef2f2' }}>{counts.red}</div>
            <div style={{ fontSize: '11px', color: '#f87171', marginTop: '2px' }}>Priority 1 Transport</div>
          </div>

          {/* YELLOW: Delayed */}
          <div style={{ background: 'rgba(245, 158, 11, 0.12)', border: '1px solid #f59e0b', borderRadius: '14px', padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#fcd34d', fontWeight: 800, letterSpacing: '1px', marginBottom: '4px' }}>
              YELLOW · DELAYED
            </div>
            <div style={{ fontSize: '32px', fontWeight: 900, color: '#fef2f2' }}>{counts.yellow}</div>
            <div style={{ fontSize: '11px', color: '#fbbf24', marginTop: '2px' }}>Serious (Non-Critical)</div>
          </div>

          {/* GREEN: Minor */}
          <div style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid #10b981', borderRadius: '14px', padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#6ee7b7', fontWeight: 800, letterSpacing: '1px', marginBottom: '4px' }}>
              GREEN · MINOR
            </div>
            <div style={{ fontSize: '32px', fontWeight: 900, color: '#fef2f2' }}>{counts.green}</div>
            <div style={{ fontSize: '11px', color: '#34d399', marginTop: '2px' }}>Walking Wounded</div>
          </div>

          {/* BLACK: Expectant */}
          <div style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '14px', padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 800, letterSpacing: '1px', marginBottom: '4px' }}>
              BLACK · EXPECTANT
            </div>
            <div style={{ fontSize: '32px', fontWeight: 900, color: '#cbd5e1' }}>{counts.black}</div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Morgue / Non-Salvageable</div>
          </div>
        </div>

        {/* Load-Balanced Regional Hospital Distribution */}
        <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '16px 20px', marginBottom: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <strong style={{ fontSize: '13px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={16} className="text-sky" />
              <span>Anti-Saturation Evacuation Load-Balancer</span>
            </strong>
            <span style={{ fontSize: '11px', color: '#38bdf8' }}>Total Casualties: {totalCasualties} En Route or Tagged</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {hospitals.map((h, i) => (
              <div
                key={h.id}
                style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc', marginBottom: '4px' }}>{h.name}</div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '6px' }}>
                  Trauma Bays: <strong style={{ color: '#34d399' }}>{h.traumaBaysAvailable || 3} Open</strong>
                </div>
                <div style={{ fontSize: '11px', color: '#38bdf8' }}>
                  Allocated: <strong>{i === 0 ? '4 Red, 5 Yel' : i === 1 ? '3 Red, 4 Yel' : '1 Red, 5 Grn'}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Rapid Digital Tagging Form & List */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <strong style={{ fontSize: '13px', color: '#f8fafc' }}>Scanned Casualty Wristbands (START Log)</strong>
          <button
            onClick={() => setIsAddingTag(!isAddingTag)}
            style={{
              background: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              color: '#38bdf8',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Plus size={14} />
            <span>Tag New Casualty</span>
          </button>
        </div>

        {/* Add Tag Sub-Panel */}
        {isAddingTag && (
          <div style={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '12px', padding: '16px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              {(['RED', 'YELLOW', 'GREEN', 'BLACK'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setNewPriority(p)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 800,
                    border: newPriority === p ? '2px solid #fff' : '1px solid rgba(255, 255, 255, 0.1)',
                    background: p === 'RED' ? '#dc2626' : p === 'YELLOW' ? '#d97706' : p === 'GREEN' ? '#059669' : '#334155',
                    color: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  {p}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                placeholder="Chief complaint & injuries (e.g. Femur fracture, airway intact)..."
                value={newChief}
                onChange={(e) => setNewChief(e.target.value)}
                style={{
                  flex: 1,
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
              <button
                onClick={handleCreateTag}
                style={{
                  background: '#38bdf8',
                  color: '#020617',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontWeight: 800,
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                Log Tag
              </button>
            </div>
          </div>
        )}

        {/* Casualty Tags Stream */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
          {recentTags.map((tag) => (
            <div
              key={tag.tagId}
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '8px',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 900,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: tag.priority === 'RED' ? '#dc2626' : tag.priority === 'YELLOW' ? '#d97706' : '#059669',
                    color: '#fff',
                  }}
                >
                  {tag.tagId}
                </span>
                <div>
                  <strong style={{ fontSize: '12px', color: '#f8fafc' }}>{tag.chief}</strong>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>Age: {tag.age} yrs · Assigned: {tag.assignedHospital} ({tag.bay})</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#38bdf8', fontSize: '11px', fontWeight: 600 }}>
                <Truck size={14} />
                <span>Transport Pre-Assigned</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
