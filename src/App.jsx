import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Briefcase,
  Search,
  Settings,
  BarChart3,
  Bot,
  FileText,
  Sparkles,
  Plus,
  Download,
  CheckCircle2,
  AlertCircle,
  Upload,
  Copy,
  Check,
  Edit3,
  RotateCcw,
  FileSpreadsheet,
  Terminal,
  Trash2,
  Database,
  RefreshCw,
} from 'lucide-react';
import { GEMINI_MODELS, DEFAULT_MODEL_ID } from './data/models.js';
import { DEFAULT_CV, cvToPlainText } from './data/defaultCv.js';
import { generateTailoredCv } from './services/geminiService.js';
import { downloadCvPdf, downloadCvTxt } from './utils/cvPdf.js';
import { apiRequest } from './utils/apiClient.js';
import {
  parseVacanciesCsv,
  generateSampleCsv,
  buildDeepAnalysisPrompt,
} from './utils/csvParser.js';
import ConfigModal from './components/ConfigModal.jsx';
import VacancyTable from './components/VacancyTable.jsx';
import CvEditorModal from './components/CvEditorModal.jsx';
import SendHrModal from './components/SendHrModal.jsx';
import AnalyticsDashboard from './components/AnalyticsDashboard.jsx';
import JobAssistantChat from './components/JobAssistantChat.jsx';

function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.warn('localStorage write error:', err);
    }
  }, [key, value]);

  return [value, setValue];
}

export default function App() {
  const [activeTab, setActiveTab] = useState('vacancies');

  // Config state
  const [apiKey, setApiKey] = useLocalStorage('cp_gemini_api_key', '');
  const [selectedModel, setSelectedModel] = useLocalStorage('cp_gemini_model', DEFAULT_MODEL_ID);
  const [extraModels, setExtraModels] = useLocalStorage('cp_extra_models', []);
  const [smtpConfig, setSmtpConfig] = useLocalStorage('cp_smtp_config', {
    smtpHost: 'smtp.gmail.com',
    smtpPort: 465,
    smtpSecure: true,
    smtpUser: '',
    smtpPass: '',
    fromName: DEFAULT_CV.fullName,
  });

  // Core data state (cached in localStorage & synchronized with Neon PostgreSQL)
  const [baseCv, setBaseCv] = useLocalStorage('cp_base_cv', DEFAULT_CV);
  const [vacancies, setVacancies] = useLocalStorage('cp_vacancies', []);
  const [tailoredMap, setTailoredMap] = useLocalStorage('cp_tailored_cvs', {});
  const [applicationLogs, setApplicationLogs] = useLocalStorage('cp_app_logs', []);
  const [assistantMessages, setAssistantMessages] = useState([]);

  // Neon DB connection status
  const [dbStatus, setDbStatus] = useState('connecting'); // 'connecting' | 'connected' | 'error'
  const [dbError, setDbError] = useState('');

  // CSV Upload & Prompt Generator state
  const fileInputRef = useRef(null);
  const [csvImportMode, setCsvImportMode] = useState('append'); // 'append' | 'replace'
  const [csvPasteText, setCsvPasteText] = useState('');
  const [showCsvPaste, setShowCsvPaste] = useState(false);
  const [csvError, setCsvError] = useState(null);
  const [showPromptPanel, setShowPromptPanel] = useState(false);
  const [promptRoles, setPromptRoles] = useState(
    'Software Development Engineer, Software Tester / QA, Data Analyst, Full-Stack / React.js Developer (Fresher / 2026 Graduate)'
  );
  const [promptLocations, setPromptLocations] = useState('Bengaluru, Shivamogga, Karnataka, Remote India');
  const [promptMinLpa, setPromptMinLpa] = useState('3.5+ LPA');
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // Table filters
  const [tableQuery, setTableQuery] = useState('');
  const [tableTypeFilter, setTableTypeFilter] = useState('all');
  const [tableStatusFilter, setTableStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('match'); // 'match' | 'lpa' | 'newest'

  // Modals
  const [configOpen, setConfigOpen] = useState(false);
  const [generatingId, setGeneratingId] = useState(null);
  const [editorState, setEditorState] = useState({ open: false, vacancy: null });
  const [sendHrVacancy, setSendHrVacancy] = useState(null);
  const [toast, setToast] = useState(null);
  const [showAddManual, setShowAddManual] = useState(false);
  const [manualDraft, setManualDraft] = useState({
    company: '',
    role: '',
    location: 'Bengaluru',
    packageLpa: '4.5 LPA',
    interviewType: 'walk-in',
    walkInTimings: '',
    applyLink: '',
    hrName: '',
    hrEmail: '',
    hrPhone: '',
  });

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const syncFromNeonDb = useCallback(async (showFeedback = false) => {
    setDbStatus('connecting');
    setDbError('');
    try {
      const state = await apiRequest('/api/state');
      if (state.baseCv) {
        setBaseCv(state.baseCv);
      } else {
        // Seed initial Base CV into Neon DB
        await apiRequest('/api/profile', {
          method: 'PUT',
          body: { baseCv: DEFAULT_CV, selectedModel: DEFAULT_MODEL_ID },
        });
      }
      if (state.selectedModel) {
        setSelectedModel(state.selectedModel);
      }
      setVacancies(state.vacancies || []);
      setTailoredMap(state.tailoredMap || {});
      setApplicationLogs(state.applicationLogs || []);
      setAssistantMessages(state.assistantMessages || []);
      setDbStatus('connected');
      if (showFeedback) {
        showToast('Synced latest data from Neon PostgreSQL.');
      }
    } catch (err) {
      setDbStatus('error');
      setDbError(err?.message || 'Neon DB unreachable');
      if (showFeedback) {
        showToast(err?.message || 'Failed to sync with Neon DB.', 'error');
      }
    }
  }, [setApplicationLogs, setBaseCv, setSelectedModel, setTailoredMap, setVacancies, showToast]);

  useEffect(() => {
    syncFromNeonDb(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allModels = useMemo(() => [...GEMINI_MODELS, ...(extraModels || [])], [extraModels]);

  const appliedCount = useMemo(
    () => vacancies.filter((v) => ['Applied', 'Interview', 'Offer'].includes(v.status)).length,
    [vacancies]
  );

  const walkInCount = useMemo(
    () => vacancies.filter((v) => v.interviewType === 'walk-in').length,
    [vacancies]
  );

  const deepAnalysisPrompt = useMemo(
    () =>
      buildDeepAnalysisPrompt({
        cv: baseCv,
        targetRoles: promptRoles,
        targetLocations: promptLocations,
        minLpa: promptMinLpa,
      }),
    [baseCv, promptRoles, promptLocations, promptMinLpa]
  );

  const filteredVacancies = useMemo(() => {
    const q = tableQuery.trim().toLowerCase();
    return vacancies
      .filter((v) => {
        if (tableTypeFilter !== 'all' && v.interviewType !== tableTypeFilter) return false;
        if (tableStatusFilter !== 'all' && v.status !== tableStatusFilter) return false;
        if (!q) return true;
        return (
          v.company.toLowerCase().includes(q) ||
          v.role.toLowerCase().includes(q) ||
          (v.location || '').toLowerCase().includes(q) ||
          (v.hrEmail || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortBy === 'lpa') return (b.lpaNumericMax || 0) - (a.lpaNumericMax || 0);
        if (sortBy === 'newest') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        return (b.matchScore || 0) - (a.matchScore || 0);
      });
  }, [vacancies, tableQuery, tableTypeFilter, tableStatusFilter, sortBy]);

  const handleModelChange = async (newModel) => {
    setSelectedModel(newModel);
    try {
      await apiRequest('/api/profile', {
        method: 'PUT',
        body: { selectedModel: newModel },
      });
    } catch (err) {
      console.warn('Model DB sync warning:', err);
    }
  };

  const importCsvContent = async (text, label) => {
    setCsvError(null);
    try {
      const parsed = parseVacanciesCsv(text, label);
      setVacancies((prev) => (csvImportMode === 'replace' ? parsed : [...parsed, ...prev]));
      if (csvImportMode === 'replace') {
        setTailoredMap({});
      }
      setCsvPasteText('');
      setShowCsvPaste(false);

      await apiRequest('/api/vacancies', {
        method: 'POST',
        body: { vacancies: parsed, mode: csvImportMode },
      });
      setDbStatus('connected');
      showToast(`Imported & saved ${parsed.length} vacancies to Neon DB!`);
    } catch (err) {
      setCsvError(err?.message || 'Could not import CSV.');
      showToast(err?.message || 'CSV import / DB sync failed.', 'error');
    }
  };

  const handleCsvFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      importCsvContent(evt.target?.result || '', file.name);
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const handleDownloadSampleCsv = () => {
    const csv = generateSampleCsv();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'CareerPulse_Deep_Analysis_Template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(deepAnalysisPrompt);
    setCopiedPrompt(true);
    showToast('Deep Analysis Prompt copied to clipboard!');
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleGenerateCv = async (vacancy) => {
    if (!apiKey.trim()) {
      setConfigOpen(true);
      showToast('Configure your Gemini API key first.', 'error');
      return;
    }
    setGeneratingId(vacancy.id);
    try {
      const res = await generateTailoredCv({
        apiKey,
        modelId: selectedModel,
        baseCv,
        vacancy,
      });
      setTailoredMap((prev) => ({ ...prev, [vacancy.id]: res }));
      const nextStatus = vacancy.status === 'New' ? 'CV Tailored' : vacancy.status;
      setVacancies((prev) =>
        prev.map((v) => (v.id === vacancy.id ? { ...v, status: nextStatus } : v))
      );

      await apiRequest('/api/tailored-cv', {
        method: 'POST',
        body: { vacancyId: vacancy.id, ...res },
      });
      if (vacancy.status === 'New') {
        await apiRequest('/api/vacancies', {
          method: 'PATCH',
          body: { id: vacancy.id, updates: { status: 'CV Tailored' } },
        });
      }
      showToast(`Tailored CV saved to Neon DB for ${vacancy.company} (ATS ${res.atsScore}%)!`);
    } catch (err) {
      showToast(err?.message || 'Failed to generate tailored CV.', 'error');
    } finally {
      setGeneratingId(null);
    }
  };

  const handleEditCv = (vacancy) => {
    setEditorState({ open: true, vacancy });
  };

  const handleSaveEditedCv = async (updatedCv) => {
    if (!editorState.vacancy) {
      setBaseCv(updatedCv);
      try {
        await apiRequest('/api/profile', { method: 'PUT', body: { baseCv: updatedCv } });
        showToast('Base CV saved to Neon DB.');
      } catch (err) {
        showToast(err?.message || 'Saved locally; Neon DB sync failed.', 'error');
      }
      return;
    }

    const vid = editorState.vacancy.id;
    const payload = {
      ...(tailoredMap[vid] || {
        atsScore: 85,
        tailoringNotes: 'Manually customized for this role',
        addedKeywords: [],
      }),
      tailoredCv: updatedCv,
      editedAt: new Date().toISOString(),
    };
    setTailoredMap((prev) => ({ ...prev, [vid]: payload }));
    try {
      await apiRequest('/api/tailored-cv', {
        method: 'POST',
        body: { vacancyId: vid, ...payload },
      });
      showToast(`Saved customized CV for ${editorState.vacancy.company} to Neon DB.`);
    } catch (err) {
      showToast(err?.message || 'Saved locally; Neon DB sync failed.', 'error');
    }
  };

  const handleDownloadCv = (vacancy) => {
    const cvToDownload = tailoredMap[vacancy.id]?.tailoredCv || baseCv;
    const fname = downloadCvPdf(cvToDownload, vacancy.company);
    showToast(`Downloaded ${fname}`);
  };

  const handleStatusChange = async (id, status) => {
    setVacancies((prev) => prev.map((v) => (v.id === id ? { ...v, status } : v)));
    try {
      await apiRequest('/api/vacancies', {
        method: 'PATCH',
        body: { id, updates: { status } },
      });
      if (status === 'Applied') {
        const v = vacancies.find((item) => item.id === id);
        if (v) {
          const logEntry = {
            id: `log_${Date.now()}`,
            vacancyId: id,
            company: v.company,
            role: v.role,
            method: 'Manual Status Update',
            hrEmail: v.hrEmail || '',
            timestamp: new Date().toISOString(),
          };
          setApplicationLogs((prev) => [...prev, logEntry]);
          await apiRequest('/api/applications', { method: 'POST', body: logEntry });
        }
      }
    } catch (err) {
      showToast(err?.message || 'Failed to sync status to Neon DB.', 'error');
    }
  };

  const handleUpdateHr = async (id, hrDraft) => {
    setVacancies((prev) => prev.map((v) => (v.id === id ? { ...v, ...hrDraft } : v)));
    try {
      await apiRequest('/api/vacancies', {
        method: 'PATCH',
        body: { id, updates: hrDraft },
      });
      showToast('HR contact saved to Neon DB.');
    } catch (err) {
      showToast(err?.message || 'Failed to sync HR contact to Neon DB.', 'error');
    }
  };

  const handleApplicationLogged = async (vacancy, meta) => {
    setVacancies((prev) => prev.map((v) => (v.id === vacancy.id ? { ...v, status: 'Applied' } : v)));
    const logEntry = {
      id: `log_${Date.now()}`,
      vacancyId: vacancy.id,
      company: vacancy.company,
      role: vacancy.role,
      method: meta.method,
      hrEmail: meta.hrEmail,
      subject: meta.subject || '',
      timestamp: new Date().toISOString(),
    };
    setApplicationLogs((prev) => [...prev, logEntry]);
    try {
      await apiRequest('/api/applications', { method: 'POST', body: logEntry });
    } catch (err) {
      showToast(err?.message || 'Failed to persist application log in Neon DB.', 'error');
    }
  };

  const handleAddManualVacancy = async (e) => {
    e.preventDefault();
    if (!manualDraft.company.trim() || !manualDraft.role.trim()) return;
    const numMatch = (manualDraft.packageLpa || '').match(/(\d+(\.\d+)?)/g);
    const minNum = numMatch ? Number(numMatch[0]) : 0;
    const maxNum = numMatch && numMatch[1] ? Number(numMatch[1]) : minNum;

    const newItem = {
      id: `vac_manual_${Date.now()}`,
      company: manualDraft.company.trim(),
      role: manualDraft.role.trim(),
      location: manualDraft.location.trim() || 'Bengaluru',
      workMode: 'On-site',
      experienceRequired: 'Fresher / 0-1 Yrs',
      packageLpa: manualDraft.packageLpa.trim() || 'Not Disclosed',
      lpaNumericMin: minNum,
      lpaNumericMax: maxNum,
      interviewType: manualDraft.interviewType,
      walkInTimings: manualDraft.interviewType === 'walk-in' ? manualDraft.walkInTimings : '',
      applyLink: manualDraft.interviewType === 'online' ? manualDraft.applyLink : '',
      hrName: manualDraft.hrName,
      hrRole: 'HR / Recruiter',
      hrEmail: manualDraft.hrEmail,
      hrPhone: manualDraft.hrPhone,
      hrNotes: 'Manually added',
      requiredSkills: ['Python', 'SQL', 'React.js', 'Testing'],
      matchScore: 80,
      matchedSkills: ['Python', 'SQL'],
      missingSkills: [],
      deepAnalysisNotes: 'Manually added vacancy ready for AI CV tailoring and direct HR outreach.',
      postedOrDeadline: 'Manual Entry',
      status: 'New',
      source: 'Manual Entry',
      createdAt: new Date().toISOString(),
    };
    setVacancies((prev) => [newItem, ...prev]);
    setShowAddManual(false);
    setManualDraft({
      company: '',
      role: '',
      location: 'Bengaluru',
      packageLpa: '4.5 LPA',
      interviewType: 'walk-in',
      walkInTimings: '',
      applyLink: '',
      hrName: '',
      hrEmail: '',
      hrPhone: '',
    });

    try {
      await apiRequest('/api/vacancies', {
        method: 'POST',
        body: { vacancies: [newItem], mode: 'append' },
      });
      showToast(`Added ${newItem.company} & saved to Neon DB.`);
    } catch (err) {
      showToast(err?.message || 'Added locally; Neon DB sync failed.', 'error');
    }
  };

  const handleDeleteVacancy = async (id) => {
    setVacancies((prev) => prev.filter((v) => v.id !== id));
    try {
      await apiRequest(`/api/vacancies?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      showToast('Removed vacancy from Neon DB.');
    } catch (err) {
      showToast(err?.message || 'Failed to delete from Neon DB.', 'error');
    }
  };

  const handleClearAllVacancies = async () => {
    setVacancies([]);
    setTailoredMap({});
    try {
      await apiRequest('/api/vacancies?clear=all', { method: 'DELETE' });
      showToast('Cleared vacancy table & Neon DB.');
    } catch (err) {
      showToast(err?.message || 'Failed to clear Neon DB.', 'error');
    }
  };

  const handleResetBaseCv = async () => {
    setBaseCv(DEFAULT_CV);
    try {
      await apiRequest('/api/profile', { method: 'PUT', body: { baseCv: DEFAULT_CV } });
      showToast('Reset Base CV in Neon DB.');
    } catch (err) {
      showToast(err?.message || 'Reset locally; Neon DB sync failed.', 'error');
    }
  };

  const handlePersistAssistantMsg = async (msg) => {
    setAssistantMessages((prev) => [...prev, msg]);
    try {
      await apiRequest('/api/assistant', { method: 'POST', body: msg });
    } catch (err) {
      console.warn('Assistant message DB sync warning:', err);
    }
  };

  const handleClearAssistantMsgs = async () => {
    setAssistantMessages([]);
    try {
      await apiRequest('/api/assistant', { method: 'DELETE' });
    } catch (err) {
      console.warn('Assistant clear DB warning:', err);
    }
  };

  const handleExportCsv = () => {
    const headers = [
      'Company',
      'Role',
      'Location',
      'Package (LPA)',
      'Drive Type',
      'Walk-In Timings',
      'Apply Link',
      'HR Name',
      'HR Email',
      'HR Phone',
      'Match Score',
      'Status',
    ];
    const escape = (val) => `"${String(val || '').replace(/"/g, '""')}"`;
    const rows = filteredVacancies.map((v) =>
      [
        v.company,
        v.role,
        v.location,
        v.packageLpa,
        v.interviewType,
        v.walkInTimings,
        v.applyLink,
        v.hrName,
        v.hrEmail,
        v.hrPhone,
        `${v.matchScore}%`,
        v.status,
      ]
        .map(escape)
        .join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CareerPulse_Vacancies_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentEditorCv = editorState.vacancy
    ? tailoredMap[editorState.vacancy.id]?.tailoredCv || baseCv
    : baseCv;

  return (
    <div className="app-shell">
      {/* Top Navigation */}
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">
            <Briefcase size={20} />
          </div>
          <div>
            <h1>CareerPulse AI</h1>
            <p>Neon PostgreSQL Cloud Sync • CSV Tracker • AI Resume Modifier • Direct HR Sender</p>
          </div>
        </div>

        <nav className="nav-tabs">
          <button
            className={`nav-tab ${activeTab === 'vacancies' ? 'active' : ''}`}
            onClick={() => setActiveTab('vacancies')}
          >
            <Search size={14} /> Vacancies ({vacancies.length})
          </button>
          <button
            className={`nav-tab ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            <BarChart3 size={14} /> Analytics & Applied ({appliedCount})
          </button>
          <button
            className={`nav-tab ${activeTab === 'assistant' ? 'active' : ''}`}
            onClick={() => setActiveTab('assistant')}
          >
            <Bot size={14} /> AI Job Assistant
          </button>
          <button
            className={`nav-tab ${activeTab === 'cv' ? 'active' : ''}`}
            onClick={() => setActiveTab('cv')}
          >
            <FileText size={14} /> My Base CV
          </button>
        </nav>

        <div className="topbar-actions">
          <button
            className={`status-pill ${
              dbStatus === 'connected' ? 'ready' : dbStatus === 'error' ? 'missing' : ''
            }`}
            onClick={() => syncFromNeonDb(true)}
            title={dbError || 'Click to sync with Neon PostgreSQL'}
            style={{ cursor: 'pointer' }}
          >
            {dbStatus === 'connecting' ? (
              <RefreshCw size={13} className="spin" />
            ) : (
              <Database size={13} />
            )}
            {dbStatus === 'connected'
              ? 'Neon DB Connected'
              : dbStatus === 'connecting'
              ? 'Syncing DB...'
              : 'DB Offline'}
          </button>

          <select
            className="select mono"
            style={{ width: 205, padding: '6px 10px', fontSize: 12 }}
            value={selectedModel}
            onChange={(e) => handleModelChange(e.target.value)}
            title="Active Latest Gemini Model"
          >
            {allModels.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.id})
              </option>
            ))}
          </select>

          <button
            className={`status-pill ${apiKey ? 'ready' : 'missing'}`}
            onClick={() => setConfigOpen(true)}
            style={{ cursor: 'pointer' }}
          >
            {apiKey ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            {apiKey ? 'Gemini Ready' : 'Set Gemini Key'}
          </button>

          <button className="btn btn-outline btn-sm" onClick={() => setConfigOpen(true)}>
            <Settings size={14} /> Config & Models
          </button>
        </div>
      </header>

      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            zIndex: 80,
            padding: '11px 16px',
            borderRadius: 10,
            background: toast.type === 'error' ? '#991b1b' : '#0f172a',
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} color="#34d399" />}
          {toast.msg}
        </div>
      )}

      <main className="main-container">
        {activeTab === 'vacancies' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Quick Summary KPI Strip */}
            <div className="kpi-grid" style={{ marginBottom: 0 }}>
              <div className="kpi-card">
                <div>
                  <div className="kpi-label">Companies Applied</div>
                  <div className="kpi-value" style={{ color: '#2563eb' }}>{appliedCount}</div>
                  <div className="kpi-sub">Synced with Neon DB</div>
                </div>
                <span className="badge badge-blue">Applied</span>
              </div>
              <div className="kpi-card">
                <div>
                  <div className="kpi-label">Uploaded Vacancies</div>
                  <div className="kpi-value">{vacancies.length}</div>
                  <div className="kpi-sub">
                    {walkInCount} Walk-In • {vacancies.length - walkInCount} Online
                  </div>
                </div>
                <span className="badge badge-slate">Total</span>
              </div>
              <div className="kpi-card">
                <div>
                  <div className="kpi-label">Tailored CVs Ready</div>
                  <div className="kpi-value" style={{ color: '#7c3aed' }}>
                    {Object.keys(tailoredMap).length}
                  </div>
                  <div className="kpi-sub">AI-modified from your Base CV</div>
                </div>
                <span className="badge badge-purple">CVs</span>
              </div>
              <div className="kpi-card">
                <div>
                  <div className="kpi-label">Active Gemini Model</div>
                  <div className="kpi-value mono" style={{ fontSize: 15, marginTop: 10, color: '#059669' }}>
                    {selectedModel}
                  </div>
                  <div className="kpi-sub">Used for CV Modification & Assistant</div>
                </div>
                <span className="badge badge-green">AI Ready</span>
              </div>
            </div>

            {/* CSV Import & Deep Analysis Prompt Card */}
            <div className="card">
              <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <h2 className="card-title">
                    <FileSpreadsheet size={18} color="#2563eb" /> Import Deep-Analyzed Vacancy CSV
                  </h2>
                  <span className="badge badge-blue">Step 1: Copy Prompt → Step 2: Upload CSV → Step 3: Generate AI CV</span>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    className={`btn btn-sm ${showPromptPanel ? 'btn-indigo' : 'btn-outline'}`}
                    onClick={() => setShowPromptPanel((s) => !s)}
                  >
                    <Terminal size={14} /> {showPromptPanel ? 'Hide Deep Analysis Prompt' : 'Get Deep Analysis Prompt'}
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={handleDownloadSampleCsv}>
                    <Download size={14} /> Sample CSV
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={() => setShowAddManual((s) => !s)}>
                    <Plus size={14} /> Add Manual
                  </button>
                </div>
              </div>

              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    style={{ display: 'none' }}
                    onChange={handleCsvFileChange}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload size={15} /> Upload Deep-Analyzed CSV File
                  </button>

                  <button
                    className="btn btn-outline"
                    onClick={() => setShowCsvPaste((s) => !s)}
                  >
                    <Sparkles size={14} /> {showCsvPaste ? 'Hide CSV Text Paste' : 'Paste CSV Text Directly'}
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-soft)' }}>Import Mode:</span>
                    <select
                      className="select"
                      style={{ width: 175, padding: '6px 10px', fontSize: 12.5 }}
                      value={csvImportMode}
                      onChange={(e) => setCsvImportMode(e.target.value)}
                    >
                      <option value="append">Append to Current Table</option>
                      <option value="replace">Replace Current Table</option>
                    </select>
                    {vacancies.length > 0 && (
                      <button
                        className="btn btn-danger-outline btn-sm"
                        onClick={handleClearAllVacancies}
                      >
                        <Trash2 size={13} /> Clear Table
                      </button>
                    )}
                  </div>
                </div>

                {showCsvPaste && (
                  <div
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      padding: 14,
                      background: 'var(--surface-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                    }}
                  >
                    <label className="label" style={{ margin: 0 }}>
                      Paste CSV Output (Header + Rows)
                    </label>
                    <textarea
                      className="textarea mono"
                      rows={5}
                      style={{ fontSize: 12 }}
                      value={csvPasteText}
                      onChange={(e) => setCsvPasteText(e.target.value)}
                      placeholder="Company,Role,Location,WorkMode,Experience,PackageLPA,InterviewType,WalkInTimings,ApplyLink,HRName,HRRole,HREmail,HRPhone,HRNotes,RequiredSkills,MatchScore,MatchedSkills,MissingSkills,DeepAnalysisNotes,PostedOrDeadline&#10;..."
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="btn btn-primary btn-sm"
                        disabled={!csvPasteText.trim()}
                        onClick={() => importCsvContent(csvPasteText, 'Pasted CSV')}
                      >
                        Import Pasted CSV into Table
                      </button>
                      <button className="btn btn-outline btn-sm" onClick={() => setShowCsvPaste(false)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {showPromptPanel && (
                  <div
                    style={{
                      border: '1px solid #c7d2fe',
                      borderRadius: 10,
                      padding: 16,
                      background: '#f5f7ff',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#1e1b4b' }}>
                          Deep Data Analysis Prompt (Outputs Exact CSV for This App)
                        </div>
                        <div style={{ fontSize: 12, color: '#4338ca', marginTop: 2 }}>
                          Copy this prompt into Gemini Deep Research / ChatGPT / Perplexity, save the output as <span className="mono">.csv</span>, and upload it above.
                        </div>
                      </div>
                      <button className="btn btn-indigo btn-sm" onClick={handleCopyPrompt}>
                        {copiedPrompt ? <Check size={14} /> : <Copy size={14} />}
                        {copiedPrompt ? 'Copied!' : 'Copy Full Prompt'}
                      </button>
                    </div>

                    <div className="grid-3">
                      <div>
                        <label className="label">Target Roles</label>
                        <input
                          className="input"
                          value={promptRoles}
                          onChange={(e) => setPromptRoles(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="label">Target Locations</label>
                        <input
                          className="input"
                          value={promptLocations}
                          onChange={(e) => setPromptLocations(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="label">Minimum Package</label>
                        <input
                          className="input"
                          value={promptMinLpa}
                          onChange={(e) => setPromptMinLpa(e.target.value)}
                        />
                      </div>
                    </div>

                    <textarea
                      className="textarea mono"
                      rows={9}
                      readOnly
                      value={deepAnalysisPrompt}
                      style={{ fontSize: 11.5, background: '#fff' }}
                    />
                  </div>
                )}

                {csvError && (
                  <div
                    style={{
                      padding: '10px 12px',
                      borderRadius: 8,
                      background: 'var(--danger-soft)',
                      border: '1px solid #fecaca',
                      color: '#991b1b',
                      fontSize: 12.5,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <AlertCircle size={16} /> {csvError}
                  </div>
                )}

                {showAddManual && (
                  <form
                    onSubmit={handleAddManualVacancy}
                    style={{
                      padding: 14,
                      borderRadius: 10,
                      border: '1px solid var(--border)',
                      background: 'var(--surface-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 13 }}>Add Vacancy Manually</div>
                    <div className="grid-3">
                      <input
                        className="input"
                        required
                        placeholder="Company Name *"
                        value={manualDraft.company}
                        onChange={(e) => setManualDraft({ ...manualDraft, company: e.target.value })}
                      />
                      <input
                        className="input"
                        required
                        placeholder="Role Title *"
                        value={manualDraft.role}
                        onChange={(e) => setManualDraft({ ...manualDraft, role: e.target.value })}
                      />
                      <input
                        className="input"
                        placeholder="Package (e.g. 5.5 LPA)"
                        value={manualDraft.packageLpa}
                        onChange={(e) => setManualDraft({ ...manualDraft, packageLpa: e.target.value })}
                      />
                      <select
                        className="select"
                        value={manualDraft.interviewType}
                        onChange={(e) => setManualDraft({ ...manualDraft, interviewType: e.target.value })}
                      >
                        <option value="walk-in">Walk-In Interview</option>
                        <option value="online">Online Apply</option>
                      </select>
                      {manualDraft.interviewType === 'walk-in' ? (
                        <input
                          className="input"
                          placeholder="Walk-In Date, Timings & Venue"
                          value={manualDraft.walkInTimings}
                          onChange={(e) => setManualDraft({ ...manualDraft, walkInTimings: e.target.value })}
                        />
                      ) : (
                        <input
                          className="input"
                          placeholder="Apply URL (https://...)"
                          value={manualDraft.applyLink}
                          onChange={(e) => setManualDraft({ ...manualDraft, applyLink: e.target.value })}
                        />
                      )}
                      <input
                        className="input"
                        placeholder="Location"
                        value={manualDraft.location}
                        onChange={(e) => setManualDraft({ ...manualDraft, location: e.target.value })}
                      />
                      <input
                        className="input"
                        placeholder="HR Name"
                        value={manualDraft.hrName}
                        onChange={(e) => setManualDraft({ ...manualDraft, hrName: e.target.value })}
                      />
                      <input
                        className="input"
                        placeholder="HR Email"
                        value={manualDraft.hrEmail}
                        onChange={(e) => setManualDraft({ ...manualDraft, hrEmail: e.target.value })}
                      />
                      <input
                        className="input"
                        placeholder="HR Phone"
                        value={manualDraft.hrPhone}
                        onChange={(e) => setManualDraft({ ...manualDraft, hrPhone: e.target.value })}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-primary btn-sm" type="submit">
                        Save Vacancy
                      </button>
                      <button
                        className="btn btn-outline btn-sm"
                        type="button"
                        onClick={() => setShowAddManual(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>

            {/* Table Filters */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', flex: 1 }}>
                <input
                  className="input"
                  style={{ maxWidth: 280 }}
                  placeholder="Filter company, role, location, HR..."
                  value={tableQuery}
                  onChange={(e) => setTableQuery(e.target.value)}
                />
                <select
                  className="select"
                  style={{ width: 155 }}
                  value={tableTypeFilter}
                  onChange={(e) => setTableTypeFilter(e.target.value)}
                >
                  <option value="all">All Drive Modes</option>
                  <option value="walk-in">Walk-In Only</option>
                  <option value="online">Online Only</option>
                </select>
                <select
                  className="select"
                  style={{ width: 155 }}
                  value={tableStatusFilter}
                  onChange={(e) => setTableStatusFilter(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="New">New</option>
                  <option value="CV Tailored">CV Tailored</option>
                  <option value="Applied">Applied</option>
                  <option value="Interview">Interview</option>
                  <option value="Offer">Offer</option>
                </select>
                <select
                  className="select"
                  style={{ width: 170 }}
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="match">Sort: Match Score ↓</option>
                  <option value="lpa">Sort: Highest LPA ↓</option>
                  <option value="newest">Sort: Newest First</option>
                </select>
              </div>
              {vacancies.length > 0 && (
                <button className="btn btn-outline btn-sm" onClick={handleExportCsv}>
                  <Download size={14} /> Export Table CSV
                </button>
              )}
            </div>

            {/* Main Vacancy Table */}
            <VacancyTable
              vacancies={filteredVacancies}
              tailoredMap={tailoredMap}
              generatingId={generatingId}
              onGenerateCv={handleGenerateCv}
              onEditCv={handleEditCv}
              onDownloadCv={handleDownloadCv}
              onOpenSendHr={(v) => setSendHrVacancy(v)}
              onStatusChange={handleStatusChange}
              onUpdateHr={handleUpdateHr}
              onDeleteVacancy={handleDeleteVacancy}
            />
          </div>
        )}

        {activeTab === 'analytics' && (
          <AnalyticsDashboard
            vacancies={vacancies}
            tailoredMap={tailoredMap}
            applicationLogs={applicationLogs}
          />
        )}

        {activeTab === 'assistant' && (
          <JobAssistantChat
            apiKey={apiKey}
            selectedModel={selectedModel}
            cv={baseCv}
            vacancies={vacancies}
            persistedMessages={assistantMessages}
            onPersistMessage={handlePersistAssistantMsg}
            onClearMessages={handleClearAssistantMsgs}
          />
        )}

        {activeTab === 'cv' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card">
              <div className="card-header">
                <div>
                  <h2 className="card-title">
                    <FileText size={18} color="#2563eb" /> My Existing Base CV ({baseCv.fullName})
                  </h2>
                  <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-soft)' }}>
                    Stored in Neon PostgreSQL. Every company-specific &quot;Generate CV&quot; modifies this base CV with Gemini AI.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn btn-outline btn-sm" onClick={handleResetBaseCv}>
                    <RotateCcw size={14} /> Reset to Original PDF
                  </button>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => downloadCvPdf(baseCv, 'Base_CV')}
                  >
                    <Download size={14} /> Download PDF
                  </button>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => downloadCvTxt(baseCv, 'Base_CV', cvToPlainText(baseCv))}
                  >
                    <Download size={14} /> Download TXT
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => setEditorState({ open: true, vacancy: null })}
                  >
                    <Edit3 size={14} /> Edit Base CV
                  </button>
                </div>
              </div>
              <div className="card-body">
                <div className="cv-paper" style={{ maxWidth: 860, marginInline: 'auto' }}>
                  <h2>{baseCv.fullName}</h2>
                  <div className="cv-role">{baseCv.headline}</div>
                  <div className="cv-contact">
                    {[baseCv.phone, baseCv.email, baseCv.linkedin, baseCv.github].filter(Boolean).join(' | ')}
                  </div>

                  <div className="cv-sec-title">Professional Summary</div>
                  <p style={{ margin: 0 }}>{baseCv.summary}</p>

                  <div className="cv-sec-title">Education</div>
                  {(baseCv.education || []).map((edu, i) => (
                    <div key={i} style={{ marginBottom: 5 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                        <span>{edu.degree}</span>
                        <span style={{ fontStyle: 'italic', fontWeight: 500 }}>{edu.period}</span>
                      </div>
                      <div style={{ color: '#475569' }}>
                        {edu.institution} | {edu.score}
                      </div>
                    </div>
                  ))}

                  <div className="cv-sec-title">Technical Skills</div>
                  {(baseCv.skills || []).map((sk, i) => (
                    <div key={i} style={{ marginBottom: 2 }}>
                      <strong>{sk.category}:</strong> {sk.items}
                    </div>
                  ))}

                  <div className="cv-sec-title">Internship Experience</div>
                  {(baseCv.experience || []).map((exp, i) => (
                    <div key={i} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                        <span>
                          {exp.title} - {exp.company}
                        </span>
                        <span style={{ fontStyle: 'italic', fontWeight: 500 }}>{exp.period}</span>
                      </div>
                      <ul style={{ margin: '3px 0 0 18px', padding: 0 }}>
                        {(exp.bullets || []).map((b, j) => (
                          <li key={j}>{b}</li>
                        ))}
                      </ul>
                    </div>
                  ))}

                  <div className="cv-sec-title">Projects</div>
                  {(baseCv.projects || []).map((proj, i) => (
                    <div key={i} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                        <span>{proj.title}</span>
                        {proj.tech && (
                          <span style={{ fontSize: 11, fontStyle: 'italic', color: '#475569' }}>{proj.tech}</span>
                        )}
                      </div>
                      <ul style={{ margin: '3px 0 0 18px', padding: 0 }}>
                        {(proj.bullets || []).map((b, j) => (
                          <li key={j}>{b}</li>
                        ))}
                      </ul>
                    </div>
                  ))}

                  <div className="cv-sec-title">Certifications</div>
                  <ul style={{ margin: '3px 0 0 18px', padding: 0 }}>
                    {(baseCv.certifications || []).map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <ConfigModal
        isOpen={configOpen}
        onClose={() => setConfigOpen(false)}
        apiKey={apiKey}
        setApiKey={setApiKey}
        selectedModel={selectedModel}
        setSelectedModel={handleModelChange}
        extraModels={extraModels}
        setExtraModels={setExtraModels}
        smtpConfig={smtpConfig}
        setSmtpConfig={setSmtpConfig}
      />

      <CvEditorModal
        isOpen={editorState.open}
        onClose={() => setEditorState({ open: false, vacancy: null })}
        cv={currentEditorCv}
        vacancy={editorState.vacancy}
        tailoredMeta={editorState.vacancy ? tailoredMap[editorState.vacancy.id] : null}
        onSaveCv={handleSaveEditedCv}
        onRegenerate={handleGenerateCv}
        onOpenSendHr={(v) => setSendHrVacancy(v)}
        regenerating={Boolean(editorState.vacancy && generatingId === editorState.vacancy.id)}
      />

      <SendHrModal
        isOpen={Boolean(sendHrVacancy)}
        onClose={() => setSendHrVacancy(null)}
        vacancy={sendHrVacancy}
        cv={sendHrVacancy ? tailoredMap[sendHrVacancy.id]?.tailoredCv || baseCv : baseCv}
        apiKey={apiKey}
        selectedModel={selectedModel}
        smtpConfig={smtpConfig}
        onApplicationLogged={handleApplicationLogged}
        onOpenSettings={() => {
          setSendHrVacancy(null);
          setConfigOpen(true);
        }}
      />
    </div>
  );
}
