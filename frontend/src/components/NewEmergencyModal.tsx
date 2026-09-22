import React, { useState } from 'react';
import { X, AlertTriangle, Sparkles } from 'lucide-react';
import { Emergency } from '../types';
import { API_BASE } from '../config';

interface NewEmergencyModalProps {
  initialCoordinates?: { lat: number; lon: number } | null;
  onClose: () => void;
  onSubmit: (emergency: Partial<Emergency>) => void;
}

export const NewEmergencyModal: React.FC<NewEmergencyModalProps> = ({
  initialCoordinates,
  onClose,
  onSubmit,
}) => {
  const [callerName, setCallerName] = useState('John Doe');
  const [phone, setPhone] = useState('9876543210');
  const [type, setType] = useState('ACCIDENT');
  const [priority, setPriority] = useState<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('CRITICAL');
  const [patientCount, setPatientCount] = useState(1);
  const [address, setAddress] = useState(
    initialCoordinates
      ? `Incident at Lat ${initialCoordinates.lat.toFixed(4)}, Lon ${initialCoordinates.lon.toFixed(4)} (Bengaluru)`
      : 'Brigade Road Junction, Bengaluru'
  );
  const [latitude, setLatitude] = useState(initialCoordinates?.lat ?? 12.9738);
  const [longitude, setLongitude] = useState(initialCoordinates?.lon ?? 77.6074);
  const [description, setDescription] = useState(
    initialCoordinates
      ? 'Emergency incident reported via interactive map coordinate selection'
      : 'Multi-vehicle collision with severe trauma reported'
  );

  const [triageLoading, setTriageLoading] = useState(false);
  const [triageSuggestion, setTriageSuggestion] = useState<any>(null);

  const handleRunAiTriage = async () => {
    if (!description.trim()) return;
    setTriageLoading(true);
    try {
      const res = await fetch(`${API_BASE}/ai/triage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, type }),
      });
      if (res.ok) {
        const json = await res.json();
        setTriageSuggestion(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTriageLoading(false);
    }
  };

  const applyAiTriage = () => {
    if (triageSuggestion) {
      setPriority(triageSuggestion.priority);
      if (triageSuggestion.suggestedType) setType(triageSuggestion.suggestedType);
      const protocols = triageSuggestion.protocolChecklist?.join('; ');
      if (protocols && !description.includes('Protocol:')) {
        setDescription(`${description}\n[AI Protocol Checklist: ${protocols}]`);
      }
      setTriageSuggestion(null);
    }
  };

  const presets = [
    {
      label: 'Vehicle Collision',
      type: 'ACCIDENT',
      priority: 'CRITICAL' as const,
      address: 'Indiranagar 100ft Road, Bengaluru',
      lat: 12.9784,
      lon: 77.6408,
      desc: 'High-speed collision with injuries',
    },
    {
      label: 'Cardiac Arrest',
      type: 'CARDIAC',
      priority: 'CRITICAL' as const,
      address: 'Koramangala 4th Block, Bengaluru',
      lat: 12.9345,
      lon: 77.6256,
      desc: 'Elderly male collapsed, CPR initiated',
    },
    {
      label: 'Respiratory Distress',
      type: 'BREATHING',
      priority: 'HIGH' as const,
      address: 'MG Road Metro Station, Bengaluru',
      lat: 12.9756,
      lon: 77.6066,
      desc: 'Severe shortness of breath, asthma history',
    },
  ];

  const applyPreset = (p: typeof presets[0]) => {
    setType(p.type);
    setPriority(p.priority);
    setAddress(p.address);
    setLatitude(p.lat);
    setLongitude(p.lon);
    setDescription(p.desc);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      callerName,
      phone,
      type,
      priority,
      patientCount,
      address,
      latitude,
      longitude,
      description,
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-red" size={20} />
            <h2>Report New Emergency Incident</h2>
          </div>
          <button className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="presets-bar">
            <span className="text-secondary text-xs flex items-center gap-1">
              <Sparkles size={12} />
              Quick Presets:
            </span>
            <div className="flex gap-1 flex-wrap">
              {presets.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  className="btn btn-xs btn-outline"
                  onClick={() => applyPreset(p)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Caller Name</label>
              <input
                type="text"
                value={callerName}
                onChange={(e) => setCallerName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Callback Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Emergency Type</label>
              <select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="ACCIDENT">ACCIDENT</option>
                <option value="CARDIAC">CARDIAC</option>
                <option value="BREATHING">BREATHING</option>
                <option value="TRAUMA">TRAUMA</option>
                <option value="PEDIATRIC">PEDIATRIC</option>
                <option value="MATERNITY">MATERNITY</option>
              </select>
            </div>

            <div className="form-group">
              <label>Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
              >
                <option value="CRITICAL">CRITICAL</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
            </div>

            <div className="form-group">
              <label>Patient Count</label>
              <input
                type="number"
                min="1"
                value={patientCount}
                onChange={(e) => setPatientCount(parseInt(e.target.value) || 1)}
                required
              />
            </div>

            <div className="form-group">
              <label>Location / Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Latitude</label>
              <input
                type="number"
                step="0.0001"
                value={latitude}
                onChange={(e) => setLatitude(parseFloat(e.target.value) || 0)}
                required
              />
            </div>

            <div className="form-group">
              <label>Longitude</label>
              <input
                type="number"
                step="0.0001"
                value={longitude}
                onChange={(e) => setLongitude(parseFloat(e.target.value) || 0)}
                required
              />
            </div>
          </div>

          <div className="form-group mt-2">
            <div className="flex items-center justify-between mb-1">
              <label>Incident Details / Clinical Notes</label>
              <button
                type="button"
                className="btn btn-xs btn-outline-sky"
                onClick={handleRunAiTriage}
                disabled={triageLoading || !description.trim()}
              >
                <Sparkles size={12} />
                <span>{triageLoading ? 'Triaging...' : 'AI Clinical Triage'}</span>
              </button>
            </div>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter patient symptoms, mechanism of injury, vitals or scene hazards..."
            />
          </div>

          {triageSuggestion && (
            <div className="ai-triage-modal-banner mt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`priority-tag ${triageSuggestion.priority.toLowerCase()}`}>
                    {triageSuggestion.priority}
                  </span>
                  <strong className="text-xs font-mono text-amber">{triageSuggestion.esiLevel}</strong>
                  <span className="text-xs text-secondary">· Requires {triageSuggestion.requiredUnit}</span>
                </div>
                <button type="button" className="btn btn-xs btn-primary" onClick={applyAiTriage}>
                  Apply Recommendation
                </button>
              </div>
            </div>
          )}

          <div className="modal-actions mt-4">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Dispatch Request Intake
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
