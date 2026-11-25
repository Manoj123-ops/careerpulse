import React, { useState } from 'react';
import {
  Key,
  Cpu,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Mail,
  X,
  Eye,
  EyeOff,
  Loader2,
  Sparkles,
  Server,
} from 'lucide-react';
import { GEMINI_MODELS } from '../data/models.js';
import { testGeminiConnection, fetchAvailableGeminiModels } from '../services/geminiService.js';
import { postApiJson } from '../utils/apiClient.js';

export default function ConfigModal({
  isOpen,
  onClose,
  apiKey,
  setApiKey,
  selectedModel,
  setSelectedModel,
  extraModels,
  setExtraModels,
  smtpConfig,
  setSmtpConfig,
}) {
  const [activeTab, setActiveTab] = useState('gemini');
  const [showKey, setShowKey] = useState(false);
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [smtpTesting, setSmtpTesting] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);
  const [smtpStatus, setSmtpStatus] = useState(null);

  if (!isOpen) return null;

  const allModels = [...GEMINI_MODELS, ...(extraModels || [])];

  const handleTestConnection = async () => {
    setTesting(true);
    setStatusMsg(null);
    try {
      const res = await testGeminiConnection(apiKey, selectedModel);
      setStatusMsg({
        type: 'success',
        text: `Connected to ${selectedModel} in ${res.latencyMs}ms — "${res.reply}"`,
      });
    } catch (err) {
      setStatusMsg({
        type: 'error',
        text: err?.message || 'Failed to connect. Verify your Gemini API key and model access.',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSyncModels = async () => {
    setSyncing(true);
    setStatusMsg(null);
    try {
      const res = await fetchAvailableGeminiModels(apiKey);
      setExtraModels(res.extra);
      setStatusMsg({
        type: 'success',
        text: `Synced live models from Gemini API (${res.liveCount} active endpoints found, ${res.extra.length} additional models added).`,
      });
    } catch (err) {
      setStatusMsg({
        type: 'error',
        text: err?.message || 'Could not list models from API.',
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleTestSmtp = async () => {
    setSmtpTesting(true);
    setSmtpStatus(null);
    try {
      const data = await postApiJson('/api/test-smtp', smtpConfig);
      setSmtpStatus({ type: 'success', text: data.message });
    } catch (err) {
      setSmtpStatus({
        type: 'error',
        text: err?.message || 'SMTP verification failed.',
      });
    } finally {
      setSmtpTesting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="brand-icon" style={{ width: 34, height: 34 }}>
              <Cpu size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                Gemini AI & Direct HR Email Configuration
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-soft)' }}>
                Keys are saved only in your browser localStorage on this machine.
              </p>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '12px 20px 0', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8 }}>
          <button
            className={`nav-tab ${activeTab === 'gemini' ? 'active' : ''}`}
            onClick={() => setActiveTab('gemini')}
          >
            <Key size={14} /> Gemini API & Latest Models ({allModels.length})
          </button>
          <button
            className={`nav-tab ${activeTab === 'smtp' ? 'active' : ''}`}
            onClick={() => setActiveTab('smtp')}
          >
            <Mail size={14} /> Direct HR Email (SMTP / Gmail App Password)
          </button>
        </div>

        <div className="modal-body">
          {activeTab === 'gemini' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div
                style={{
                  background: 'var(--surface-subtle)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: 16,
                }}
              >
                <label className="label">Google Gemini API Key</label>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative', flex: '1 1 320px' }}>
                    <input
                      type={showKey ? 'text' : 'password'}
                      className="input mono"
                      placeholder="AIzaSy..."
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      style={{ paddingRight: 40 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey((s) => !s)}
                      style={{
                        position: 'absolute',
                        right: 10,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-soft)',
                      }}
                    >
                      {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={handleTestConnection}
                    disabled={!apiKey || testing}
                  >
                    {testing ? <Loader2 size={14} className="spin" /> : <CheckCircle2 size={14} />}
                    Test Connection
                  </button>
                  <button
                    className="btn btn-outline"
                    onClick={handleSyncModels}
                    disabled={!apiKey || syncing}
                  >
                    {syncing ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />}
                    Sync Live Models
                  </button>
                </div>
                <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--text-soft)' }}>
                  Get a key from Google AI Studio (aistudio.google.com). Required for live Google Search vacancy analysis, CV tailoring, and AI Job Assistant.
                </p>

                {statusMsg && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: '10px 12px',
                      borderRadius: 8,
                      fontSize: 12.5,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      background: statusMsg.type === 'success' ? 'var(--success-soft)' : 'var(--danger-soft)',
                      color: statusMsg.type === 'success' ? '#065f46' : '#991b1b',
                      border: `1px solid ${statusMsg.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
                    }}
                  >
                    {statusMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    <span>{statusMsg.text}</span>
                  </div>
                )}
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Sparkles size={15} color="#2563eb" /> Select Active Latest Gemini Model
                  </h4>
                  <span className="badge badge-blue mono">Selected: {selectedModel}</span>
                </div>

                <div className="grid-2">
                  {allModels.map((model) => {
                    const isSelected = selectedModel === model.id;
                    return (
                      <div
                        key={model.id}
                        className={`model-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => setSelectedModel(model.id)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                              {model.name}
                              {isSelected && <CheckCircle2 size={14} color="#2563eb" />}
                            </div>
                            <div className="mono" style={{ fontSize: 11.5, color: 'var(--primary)', marginTop: 2 }}>
                              {model.id}
                            </div>
                          </div>
                          <span
                            className={`badge ${
                              model.tier === 'latest'
                                ? 'badge-blue'
                                : model.tier === 'stable'
                                ? 'badge-green'
                                : model.tier === 'preview'
                                ? 'badge-purple'
                                : 'badge-amber'
                            }`}
                          >
                            {model.badge}
                          </span>
                        </div>
                        <p style={{ margin: '7px 0', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.45 }}>
                          {model.description}
                        </p>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 11, color: 'var(--text-soft)' }}>
                          <span>Family: <strong>{model.family}</strong></span>
                          <span>• Speed: <strong>{model.speed}</strong></span>
                          <span>• Context: <strong>{model.contextWindow}</strong></span>
                          {model.supportsSearchGrounding && <span>• Search Grounding ✓</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div
                style={{
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: 10,
                  padding: 14,
                  fontSize: 12.5,
                  color: '#1e3a8a',
                }}
              >
                <strong>Two ways to send your tailored CV directly to HR:</strong>
                <ul style={{ margin: '6px 0 0 18px', padding: 0 }}>
                  <li>
                    <strong>Instant Gmail / Default Mail App (Zero Setup):</strong> Always available in the Send to HR modal — opens pre-filled email + auto-downloads your tailored PDF.
                  </li>
                  <li>
                    <strong>Direct In-App SMTP Delivery (Auto-Attaches Tailored PDF):</strong> Configure your Gmail + 16-character Google App Password (or any SMTP server) below so CareerPulse sends emails with the PDF attached directly via the backend API (Vercel Serverless or local dev).
                  </li>
                </ul>
              </div>

              <div className="grid-2">
                <div>
                  <label className="label">SMTP Host</label>
                  <input
                    className="input"
                    value={smtpConfig.smtpHost}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, smtpHost: e.target.value })}
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <div>
                  <label className="label">SMTP Port</label>
                  <input
                    className="input"
                    type="number"
                    value={smtpConfig.smtpPort}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, smtpPort: Number(e.target.value) })}
                    placeholder="465"
                  />
                </div>
                <div>
                  <label className="label">Your Sender Email</label>
                  <input
                    className="input"
                    type="email"
                    value={smtpConfig.smtpUser}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, smtpUser: e.target.value })}
                    placeholder="manojrmanu360@gmail.com"
                  />
                </div>
                <div>
                  <label className="label">App Password / SMTP Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="input mono"
                      type={showSmtpPass ? 'text' : 'password'}
                      value={smtpConfig.smtpPass}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, smtpPass: e.target.value })}
                      placeholder="16-char Gmail App Password"
                      style={{ paddingRight: 38 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSmtpPass((s) => !s)}
                      style={{
                        position: 'absolute',
                        right: 10,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-soft)',
                      }}
                    >
                      {showSmtpPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="label">Sender Display Name</label>
                  <input
                    className="input"
                    value={smtpConfig.fromName}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, fromName: e.target.value })}
                    placeholder="Manoj Kumar PR"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button className="btn btn-outline" onClick={handleTestSmtp} disabled={smtpTesting}>
                  {smtpTesting ? <Loader2 size={14} className="spin" /> : <Server size={14} />}
                  Verify SMTP Connection
                </button>
              </div>

              {smtpStatus && (
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    fontSize: 12.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: smtpStatus.type === 'success' ? 'var(--success-soft)' : 'var(--danger-soft)',
                    color: smtpStatus.type === 'success' ? '#065f46' : '#991b1b',
                    border: `1px solid ${smtpStatus.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
                  }}
                >
                  {smtpStatus.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <span>{smtpStatus.text}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
}
