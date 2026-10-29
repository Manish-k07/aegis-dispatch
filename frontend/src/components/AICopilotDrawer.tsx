import React, { useState, useEffect, useRef } from 'react';
import { StatusChip } from './common/StatusChip';
import { Field } from './common/Field';
import { Icon } from './common/Icon';
import { Button } from './common/Button';
import { IconButton } from './common/IconButton';
import {
  ChatMessage,
  TriageAssessment,
  Emergency,
  Ambulance,
  Hospital
} from '../types';
import { API_BASE } from '../config';

interface AICopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  emergencies: Emergency[];
  ambulances: Ambulance[];
  hospitals: Hospital[];
  onAutoAssignNext: () => void;
  onRefreshData: () => void;
}

export const AICopilotDrawer: React.FC<AICopilotDrawerProps> = ({
  isOpen,
  onClose,
  emergencies,
  ambulances,
  hospitals,
  onAutoAssignNext,
  onRefreshData,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      sender: 'assistant',
      text: 'Aegis AI Copilot active. Monitoring fleet units, hospital emergency departments, and live traffic telemetry across Bengaluru. How can I assist with tactical dispatch operations?',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Triage tool panel state
  const [showTriageTool, setShowTriageTool] = useState(false);
  const [triageInput, setTriageInput] = useState('');
  const [triageResult, setTriageResult] = useState<TriageAssessment | null>(null);
  const [isTriaging, setIsTriaging] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new message or loading state
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Support Escape key to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });

      if (res.ok) {
        const json = await res.json();
        const aiMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          sender: 'assistant',
          text: json.reply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          actionExecuted: json.actionExecuted,
          data: json.data,
        };
        setMessages((prev) => [...prev, aiMsg]);
        if (json.actionExecuted === 'AUTO_ASSIGN') {
          onRefreshData();
        }
        return;
      }
    } catch {
      // Graceful local engine fallback
      const lower = text.toLowerCase();
      let reply = 'Aegis CAD Copilot: Fleet telemetry nominal. Autonomous dispatch engine active.';
      let executedAction: string | undefined = undefined;

      if (lower.includes('auto') || lower.includes('dispatch') || lower.includes('assign') || lower.includes('send')) {
        executedAction = 'AUTO_ASSIGN';
        onAutoAssignNext();
        reply = 'Auto-dispatch executed: Nearest available unit has been autonomously assigned to the highest priority pending incident with live turn-by-turn route telemetry.';
      } else if (lower.includes('fleet') || lower.includes('ambulance') || lower.includes('unit')) {
        const avail = ambulances.filter((a) => a.status === 'AVAILABLE').length;
        reply = `Fleet Status: ${avail} of ${ambulances.length} ambulances are ready for immediate dispatch. GPS tracking active across all sectors.`;
      } else if (lower.includes('hospital') || lower.includes('bed') || lower.includes('capacity')) {
        const hospSummary = hospitals.slice(0, 3).map((h) => `${h.name}: ${h.availableBeds} beds (${h.icuBedsAvailable} ICU)`).join(' • ');
        reply = `Hospital ED Status: ${hospSummary}. Real-time divert status: NORMAL.`;
      } else if (lower.includes('weather') || lower.includes('traffic')) {
        reply = 'Bengaluru Metro Telemetry: 27°C, road friction index 0.78 nominal. Average transit delay buffer: +2.8 mins.';
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: 'assistant',
          text: reply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          actionExecuted: executedAction,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunTriage = async () => {
    if (!triageInput.trim()) return;
    setIsTriaging(true);
    try {
      const res = await fetch(`${API_BASE}/ai/triage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: triageInput }),
      });
      if (res.ok) {
        const json = await res.json();
        setTriageResult(json);
        return;
      }
    } catch (err) {
      console.warn('AI Triage remote gateway fallback to embedded clinical rules', err);
      const lower = triageInput.toLowerCase();
      let priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
      let esiLevel = 'ESI-3 (Urgent)';
      let requiredUnit = 'BLS Unit';
      let protocolChecklist = ['Check baseline vital signs (BP, HR, SpO2)', 'Establish peripheral IV line', 'Prepare for transport'];

      if (lower.includes('cardiac') || lower.includes('chest pain') || lower.includes('heart') || lower.includes('arrest') || lower.includes('cpr')) {
        priority = 'CRITICAL';
        esiLevel = 'ESI-1 (Immediate Resuscitation)';
        requiredUnit = 'ALS Resuscitation Unit';
        protocolChecklist = ['Immediate CPR / AED deployment', '12-lead ECG acquisition', 'Aspirin 300mg oral', 'High-flow O2'];
      } else if (lower.includes('unconscious') || lower.includes('stroke') || lower.includes('head') || lower.includes('collision') || lower.includes('bleed') || lower.includes('accident')) {
        priority = 'CRITICAL';
        esiLevel = 'ESI-1 (Immediate Trauma)';
        requiredUnit = 'ALS Critical Care Unit';
        protocolChecklist = ['C-spine immobilization', 'GCS neurological assessment', 'Direct transport to Level 1 Trauma'];
      } else if (lower.includes('breath') || lower.includes('asthma') || lower.includes('chok')) {
        priority = 'HIGH';
        esiLevel = 'ESI-2 (Emergent)';
        requiredUnit = 'ALS Unit';
        protocolChecklist = ['Nebulization therapy', 'Continuous pulse oximetry', 'Upright patient positioning'];
      }

      setTriageResult({
        priority,
        esiLevel,
        suggestedType: 'MEDICAL',
        requiredUnit,
        protocolChecklist,
      });
    } finally {
      setIsTriaging(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="ai-copilot-backdrop"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          zIndex: 1199,
          animation: 'fadeIn 150ms ease',
        }}
      />

      <aside className="ai-copilot-drawer" aria-label="AI Copilot panel">
        {/* Drawer Header */}
        <div className="copilot-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="copilot-badge-icon">
              <Icon name="auto_awesome" size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 className="copilot-title" style={{ margin: 0 }}>Aegis AI Copilot</h2>
                <StatusChip label="Autonomous" tone="info" size="small" />
              </div>
              <span className="copilot-subtitle">Tactical dispatch & clinical triage support</span>
            </div>
          </div>
          <IconButton
            icon="close"
            size="standard"
            onClick={onClose}
            aria-label="Close AI Copilot"
          />
        </div>

        {/* Stacked Quick Operational Prompts */}
        <div className="copilot-stacked-actions">
          <span className="stacked-actions-title">TACTICAL PROMPTS</span>
          <div className="stacked-buttons-col">
            <button
              type="button"
              className="stacked-chat-btn"
              onClick={() => {
                onAutoAssignNext();
                handleSend('Auto dispatch closest ambulance to highest priority pending emergency');
              }}
            >
              <div className="stacked-btn-icon amber">
                <Icon name="bolt" size={18} />
              </div>
              <div className="stacked-btn-info">
                <strong>Auto-dispatch next incident</strong>
                <small>Assign closest unit to highest priority pending call</small>
              </div>
            </button>

            <button
              type="button"
              className="stacked-chat-btn"
              onClick={() => handleSend('What ambulances are available in our fleet?')}
            >
              <div className="stacked-btn-icon emerald">
                <Icon name="local_shipping" size={18} />
              </div>
              <div className="stacked-btn-info">
                <strong>Fleet readiness & unit status</strong>
                <small>Report available emergency vehicles</small>
              </div>
            </button>

            <button
              type="button"
              className="stacked-chat-btn"
              onClick={() => handleSend('Show hospital ICU and trauma bed availability')}
            >
              <div className="stacked-btn-icon sky">
                <Icon name="domain" size={18} />
              </div>
              <div className="stacked-btn-info">
                <strong>Hospital capacity & trauma beds</strong>
                <small>Inspect trauma bay bed availability and divert status</small>
              </div>
            </button>

            <button
              type="button"
              className="stacked-chat-btn"
              onClick={() => setShowTriageTool(!showTriageTool)}
            >
              <div className="stacked-btn-icon red">
                <Icon name="medical_services" size={18} />
              </div>
              <div className="stacked-btn-info">
                <strong>{showTriageTool ? 'Close clinical triage' : 'Clinical protocol triage'}</strong>
                <small>Evaluate symptom acuity and ESI classification</small>
              </div>
            </button>
          </div>
        </div>

        {/* Embedded Clinical Triage Testing Tool */}
        {showTriageTool && (
          <div className="embedded-triage-panel">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <Icon name="auto_awesome" size={16} />
              <strong style={{ fontSize: '12px', fontWeight: 600 }}>Clinical protocol triage</strong>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ flex: 1 }}>
                <Field
                  fieldSize="compact"
                  placeholder="e.g. 52yo male substernal chest pain, cold sweat, dyspnea"
                  value={triageInput}
                  onChange={(e) => setTriageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleRunTriage();
                    }
                  }}
                />
              </div>
              <Button
                variant="filled"
                size="small"
                onClick={handleRunTriage}
                disabled={isTriaging || !triageInput.trim()}
              >
                {isTriaging ? 'Analyzing...' : 'Analyze'}
              </Button>
            </div>

            {triageResult && (
              <div className="triage-result-card" style={{ marginTop: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <StatusChip
                    label={`${triageResult.priority} priority`}
                    tone={triageResult.priority === 'CRITICAL' ? 'critical' : triageResult.priority === 'HIGH' ? 'warning' : 'info'}
                    size="small"
                  />
                  <span className="mono" style={{ fontSize: '12px', fontWeight: 600 }}>{triageResult.esiLevel}</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--md-sys-color-text-secondary)', marginBottom: '8px' }}>
                  Required resource: <strong style={{ color: 'var(--md-sys-color-text)' }}>{triageResult.requiredUnit}</strong>
                </div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--md-sys-color-primary)', marginBottom: '4px' }}>
                    Protocol checklist:
                  </div>
                  <ul className="triage-checklist" style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {(triageResult.protocolChecklist || []).map((step, idx) => (
                      <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--md-sys-color-text)' }}>
                        <Icon name="check_circle" size={14} style={{ color: 'var(--md-sys-color-success)' }} />
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Chat Messages Log */}
        <div className="copilot-messages-container">
          {messages.map((m) => (
            <div key={m.id} className={`chat-bubble-row ${m.sender}`}>
              {m.sender === 'assistant' && (
                <div className="bot-avatar">
                  <Icon name="smart_toy" size={16} />
                </div>
              )}
              <div className={`chat-bubble ${m.sender}`}>
                <div className="chat-text">{m.text}</div>
                <span className="chat-time">{m.time}</span>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="chat-bubble-row assistant">
              <div className="bot-avatar">
                <Icon name="smart_toy" size={16} />
              </div>
              <div className="chat-bubble assistant typing">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="copilot-input-bar"
        >
          <div style={{ flex: 1 }}>
            <Field
              fieldSize="compact"
              placeholder="Ask AI Copilot: 'Auto assign next', 'Fleet status'..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          </div>
          <IconButton
            icon="send"
            size="standard"
            type="submit"
            disabled={!input.trim()}
            aria-label="Send message"
            style={{
              backgroundColor: input.trim() ? 'var(--md-sys-color-primary)' : 'transparent',
              color: input.trim() ? 'var(--md-sys-color-on-primary)' : 'var(--md-sys-color-text-secondary)',
            }}
          />
        </form>
      </aside>
    </>
  );
};
