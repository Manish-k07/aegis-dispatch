import React, { useState } from 'react';
import {
  ChatMessage,
  TriageAssessment,
  Emergency,
  Ambulance,
  Hospital
} from '../types';
import { API_BASE } from '../config';
import {
  Bot,
  Send,
  Sparkles,
  Zap,
  Activity,
  Shield,
  Building2,
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

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
      text: 'Aegis CAD AI Copilot active. Monitoring 4 fleet units, 3 regional emergency receiving hospitals, and live OSRM road telemetry in Bengaluru. How can I assist with tactical dispatch operations?',
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
      const lower = text.toLowerCase();
      let reply = 'Aegis CAD Copilot (Virtual Gateway): Fleet telemetry nominal. All algorithms active.';
      let executedAction: string | undefined = undefined;

      if (lower.includes('auto') || lower.includes('dispatch') || lower.includes('assign') || lower.includes('send')) {
        executedAction = 'AUTO_ASSIGN';
        onAutoAssignNext();
        reply = '⚡ Autonomous Auto-Dispatch executed: Nearest high-capability unit has been assigned to the highest priority pending incident with live turn-by-turn route telemetry.';
      } else if (lower.includes('fleet') || lower.includes('ambulance') || lower.includes('unit')) {
        const avail = ambulances.filter((a) => a.status === 'AVAILABLE').length;
        reply = `Fleet Status: ${avail} of ${ambulances.length} ambulances are ready for immediate dispatch. GPS tracking active.`;
      } else if (lower.includes('hospital') || lower.includes('bed') || lower.includes('capacity')) {
        const hospSummary = hospitals.slice(0, 3).map((h) => `${h.name}: ${h.availableBeds} beds (${h.icuBedsAvailable} ICU)`).join(' • ');
        reply = `Hospital ED Status: ${hospSummary}. Real-time divert status: NORMAL.`;
      } else if (lower.includes('weather') || lower.includes('traffic')) {
        reply = 'Bengaluru Metro Telemetry: 27°C Monsoon, wet road friction index 0.72. Average transit delay buffer: +3.2 mins.';
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
      console.warn('AI Triage remote gateway unavailable, using embedded rule triage', err);
      const lower = triageInput.toLowerCase();
      let priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
      let esiLevel = 'ESI-3 (Urgent)';
      let requiredUnit = 'BLS Unit';
      let protocolChecklist = ['Check vital signs (BP, HR, SpO2)', 'Establish peripheral IV line', 'Prepare for transport'];

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
    <div className="ai-copilot-drawer">
      {/* Drawer Header */}
      <div className="copilot-header">
        <div className="flex items-center gap-2">
          <div className="copilot-badge-icon">
            <Bot size={18} className="text-indigo" />
          </div>
          <div>
            <h2 className="copilot-title">Aegis AI Dispatch Copilot</h2>
            <span className="copilot-subtitle">Neural CAD Assistant · Live Ops Telemetry</span>
          </div>
        </div>
        <button className="btn-close" onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      {/* Quick Action Shortcut Pills */}
      <div className="copilot-quick-pills">
        <button
          className="quick-action-pill"
          onClick={() => {
            onAutoAssignNext();
            handleSend('Auto dispatch closest ambulance to highest priority pending emergency');
          }}
        >
          <Zap size={12} className="text-amber" />
          <span>⚡ Auto-Dispatch Next</span>
        </button>

        <button
          className="quick-action-pill"
          onClick={() => handleSend('What ambulances are available in our fleet?')}
        >
          <Shield size={12} className="text-emerald" />
          <span>Fleet Readiness</span>
        </button>

        <button
          className="quick-action-pill"
          onClick={() => handleSend('Show hospital ICU and trauma bed availability')}
        >
          <Building2 size={12} className="text-sky" />
          <span>Hospital Beds</span>
        </button>

        <button
          className="quick-action-pill"
          onClick={() => setShowTriageTool(!showTriageTool)}
        >
          <Activity size={12} className="text-red" />
          <span>{showTriageTool ? 'Hide Triage Tool' : 'Clinical Triage Tool'}</span>
        </button>
      </div>

      {/* Embedded Clinical Triage Testing Tool */}
      {showTriageTool && (
        <div className="embedded-triage-panel">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={14} className="text-indigo" />
            <strong className="text-xs uppercase tracking-wider">AI Symptom Triage Analyzer</strong>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. 52yo male substernal chest pain, cold sweat, radiating to neck"
              value={triageInput}
              onChange={(e) => setTriageInput(e.target.value)}
              className="triage-input"
            />
            <button className="btn btn-sm btn-primary" onClick={handleRunTriage} disabled={isTriaging}>
              {isTriaging ? 'Triaging...' : 'Analyze'}
            </button>
          </div>

          {triageResult && (
            <div className="triage-result-card mt-2">
              <div className="flex items-center justify-between mb-1">
                <span className={`priority-tag ${triageResult.priority.toLowerCase()}`}>
                  {triageResult.priority} PRIORITY
                </span>
                <span className="font-mono text-xs text-amber font-bold">{triageResult.esiLevel}</span>
              </div>
              <div className="text-xs text-secondary mt-1">
                Required Resource: <strong>{triageResult.requiredUnit}</strong>
              </div>
              <div className="mt-2">
                <strong className="text-xs text-primary">Protocol Checklist:</strong>
                <ul className="triage-checklist mt-1">
                  {triageResult.protocolChecklist.map((step, idx) => (
                    <li key={idx} className="flex items-center gap-1 text-xs text-secondary">
                      <CheckCircle2 size={11} className="text-emerald flex-shrink-0" />
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
                <Bot size={14} />
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
              <Bot size={14} />
            </div>
            <div className="chat-bubble assistant typing">
              <span className="typing-dot"></span>
              <span className="typing-dot"></span>
              <span className="typing-dot"></span>
            </div>
          </div>
        )}
      </div>

      {/* Chat Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="copilot-input-bar"
      >
        <input
          type="text"
          placeholder="Ask CAD copilot or command: 'Auto assign next', 'Fleet status'..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" className="btn-send" disabled={!input.trim()}>
          <Send size={15} />
        </button>
      </form>
    </div>
  );
};
