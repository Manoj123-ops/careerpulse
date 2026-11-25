import React, { useState } from 'react';
import {
  ExternalLink,
  Clock,
  MapPin,
  Mail,
  Phone,
  FileText,
  Edit3,
  Download,
  Send,
  ChevronDown,
  ChevronUp,
  Loader2,
  Check,
  Copy,
  Trash2,
  Sparkles,
  UserCheck,
} from 'lucide-react';

const STATUS_OPTIONS = [
  'New',
  'Shortlisted',
  'CV Tailored',
  'Applied',
  'Interview',
  'Offer',
  'Rejected',
];

function getStatusBadgeClass(status) {
  switch (status) {
    case 'Applied':
      return 'badge-blue';
    case 'Interview':
      return 'badge-purple';
    case 'Offer':
      return 'badge-green';
    case 'CV Tailored':
      return 'badge-amber';
    case 'Shortlisted':
      return 'badge-amber';
    case 'Rejected':
      return 'badge-red';
    default:
      return 'badge-slate';
  }
}

export default function VacancyTable({
  vacancies,
  tailoredMap,
  generatingId,
  onGenerateCv,
  onEditCv,
  onDownloadCv,
  onOpenSendHr,
  onStatusChange,
  onUpdateHr,
  onDeleteVacancy,
}) {
  const [expandedId, setExpandedId] = useState(null);
  const [editingHrId, setEditingHrId] = useState(null);
  const [hrDraft, setHrDraft] = useState({});
  const [copiedId, setCopiedId] = useState(null);

  const copyText = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(key);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const startEditHr = (v) => {
    setEditingHrId(v.id);
    setHrDraft({
      hrName: v.hrName || '',
      hrRole: v.hrRole || '',
      hrEmail: v.hrEmail || '',
      hrPhone: v.hrPhone || '',
    });
  };

  const saveEditHr = (id) => {
    onUpdateHr(id, hrDraft);
    setEditingHrId(null);
  };

  if (!vacancies.length) {
    return (
      <div className="card">
        <div className="card-body" style={{ textAlign: 'center', padding: '44px 20px', color: 'var(--text-soft)' }}>
          <Sparkles size={32} color="#e50914" style={{ marginBottom: 10 }} />
          <h3 style={{ margin: '0 0 6px', color: 'var(--text)', fontSize: 16 }}>
            No Vacancies Uploaded Yet
          </h3>
          <p style={{ margin: 0, maxWidth: 540, marginInline: 'auto', fontSize: 13 }}>
            Upload your deep-analyzed <strong>.csv</strong> file above (or copy the <strong>Deep Analysis Prompt</strong> to generate one) to populate this table with LPA, Walk-In timings / Apply links, HR contacts, and AI-tailored CVs.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ minWidth: 240 }}>Company & Role</th>
              <th style={{ minWidth: 120 }}>Package (LPA)</th>
              <th style={{ minWidth: 240 }}>Walk-In Timings / Apply Link</th>
              <th style={{ minWidth: 230 }}>HR Contact Details</th>
              <th style={{ minWidth: 135 }}>Status</th>
              <th style={{ minWidth: 280 }}>Actions (CV & Direct HR Send)</th>
            </tr>
          </thead>
          <tbody>
            {vacancies.map((v) => {
              const tailored = tailoredMap[v.id];
              const isGenerating = generatingId === v.id;
              const isExpanded = expandedId === v.id;
              const isWalkIn = v.interviewType === 'walk-in';

              return (
                <React.Fragment key={v.id}>
                  <tr>
                    {/* Company & Role */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{v.company}</div>
                          <div style={{ fontWeight: 600, fontSize: 12.5, color: 'var(--primary)', marginTop: 2 }}>
                            {v.role}
                          </div>
                        </div>
                        <span
                          className={`badge ${
                            v.matchScore >= 80
                              ? 'badge-green'
                              : v.matchScore >= 65
                              ? 'badge-blue'
                              : 'badge-amber'
                          }`}
                          title="Deep Fit Score against your CV"
                        >
                          {v.matchScore}% Fit
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 7, fontSize: 11.5, color: 'var(--text-soft)' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          <MapPin size={12} /> {v.location}
                        </span>
                        <span>• {v.workMode}</span>
                        <span>• {v.experienceRequired}</span>
                      </div>

                      <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                        <button
                          className="btn btn-ghost btn-xs"
                          onClick={() => setExpandedId(isExpanded ? null : v.id)}
                          style={{ paddingLeft: 4, color: 'var(--primary)' }}
                        >
                          {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          {isExpanded ? 'Hide Deep Analysis' : 'Deep Analysis & Skills'}
                        </button>
                        <span className="badge badge-slate" style={{ fontSize: 10.5 }}>
                          {v.source}
                        </span>
                      </div>
                    </td>

                    {/* Package (LPA) */}
                    <td>
                      <div style={{ fontWeight: 700, fontSize: 13.5, color: '#6ee7b7' }}>{v.packageLpa}</div>
                      {v.postedOrDeadline && (
                        <div style={{ fontSize: 11, color: 'var(--text-soft)', marginTop: 4 }}>
                          {v.postedOrDeadline}
                        </div>
                      )}
                    </td>

                    {/* Walk-In Timings OR Apply Link */}
                    <td>
                      {isWalkIn ? (
                        <div
                          style={{
                            background: 'rgba(255, 138, 30, 0.1)',
                            border: '1px solid rgba(255, 138, 30, 0.35)',
                            borderRadius: 8,
                            padding: '8px 10px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                            <span className="badge badge-amber">
                              <Clock size={11} /> WALK-IN INTERVIEW
                            </span>
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#fde68a', lineHeight: 1.4 }}>
                            {v.walkInTimings || 'Walk-in timings not specified in notice'}
                          </div>
                          {v.applyLink && (
                            <a
                              href={v.applyLink}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                fontSize: 11.5,
                                color: 'var(--primary)',
                                marginTop: 5,
                                fontWeight: 600,
                              }}
                            >
                              Drive Notice / Registration <ExternalLink size={11} />
                            </a>
                          )}
                        </div>
                      ) : (
                        <div
                          style={{
                            background: 'rgba(229, 9, 20, 0.08)',
                            border: '1px solid rgba(229, 9, 20, 0.3)',
                            borderRadius: 8,
                            padding: '8px 10px',
                          }}
                        >
                          <span className="badge badge-blue" style={{ marginBottom: 6 }}>
                            ONLINE APPLY
                          </span>
                          <div>
                            {v.applyLink ? (
                              <a
                                href={v.applyLink}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-primary btn-xs"
                                style={{ textDecoration: 'none' }}
                              >
                                Apply Link <ExternalLink size={12} />
                              </a>
                            ) : (
                              <span style={{ fontSize: 12, color: 'var(--text-soft)' }}>
                                Link not provided in listing
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </td>

                    {/* HR Contact Details */}
                    <td>
                      {editingHrId === v.id ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <input
                            className="input"
                            style={{ padding: '5px 8px', fontSize: 12 }}
                            placeholder="HR Name"
                            value={hrDraft.hrName}
                            onChange={(e) => setHrDraft({ ...hrDraft, hrName: e.target.value })}
                          />
                          <input
                            className="input"
                            style={{ padding: '5px 8px', fontSize: 12 }}
                            placeholder="HR Email"
                            value={hrDraft.hrEmail}
                            onChange={(e) => setHrDraft({ ...hrDraft, hrEmail: e.target.value })}
                          />
                          <input
                            className="input"
                            style={{ padding: '5px 8px', fontSize: 12 }}
                            placeholder="HR Phone"
                            value={hrDraft.hrPhone}
                            onChange={(e) => setHrDraft({ ...hrDraft, hrPhone: e.target.value })}
                          />
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-success btn-xs" onClick={() => saveEditHr(v.id)}>
                              Save
                            </button>
                            <button className="btn btn-outline btn-xs" onClick={() => setEditingHrId(null)}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                            <UserCheck size={13} color="#475569" />
                            <span>{v.hrName || 'Hiring Team / HR'}</span>
                          </div>
                          {v.hrEmail ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                              <Mail size={12} color="#2563eb" />
                              <span className="mono" style={{ fontSize: 11.5, wordBreak: 'break-all' }}>
                                {v.hrEmail}
                              </span>
                              <button
                                className="btn btn-ghost btn-xs"
                                style={{ padding: '2px 4px' }}
                                title="Copy HR Email"
                                onClick={() => copyText(v.hrEmail, `${v.id}_email`)}
                              >
                                {copiedId === `${v.id}_email` ? <Check size={12} color="#059669" /> : <Copy size={12} />}
                              </button>
                            </div>
                          ) : (
                            <div style={{ fontSize: 11.5, color: 'var(--text-soft)' }}>
                              {v.hrNotes || 'No direct HR email listed publicly'}
                            </div>
                          )}
                          {v.hrPhone && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <Phone size={12} color="#059669" />
                              <span className="mono" style={{ fontSize: 11.5 }}>{v.hrPhone}</span>
                            </div>
                          )}
                          <button
                            className="btn btn-ghost btn-xs"
                            style={{ alignSelf: 'flex-start', paddingLeft: 2, color: 'var(--text-soft)' }}
                            onClick={() => startEditHr(v)}
                          >
                            <Edit3 size={11} /> Edit HR Contact
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td>
                      <select
                        className="select"
                        style={{ padding: '6px 8px', fontSize: 12, fontWeight: 600 }}
                        value={v.status}
                        onChange={(e) => onStatusChange(v.id, e.target.value)}
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                      <div style={{ marginTop: 6 }}>
                        <span className={`badge ${getStatusBadgeClass(v.status)}`}>{v.status}</span>
                      </div>
                    </td>

                    {/* Action Column */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button
                            className="btn btn-indigo btn-xs"
                            onClick={() => onGenerateCv(v)}
                            disabled={isGenerating}
                          >
                            {isGenerating ? (
                              <>
                                <Loader2 size={12} className="spin" /> Tailoring...
                              </>
                            ) : (
                              <>
                                <FileText size={12} /> {tailored ? 'Regenerate CV' : 'Generate CV'}
                              </>
                            )}
                          </button>

                          <button
                            className="btn btn-outline btn-xs"
                            onClick={() => onEditCv(v)}
                            title={tailored ? 'Edit Tailored CV' : 'Edit Base/Company CV'}
                          >
                            <Edit3 size={12} /> Edit
                          </button>

                          <button
                            className="btn btn-outline btn-xs"
                            onClick={() => onDownloadCv(v)}
                            title="Download Tailored CV PDF"
                          >
                            <Download size={12} /> Download
                          </button>
                        </div>

                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                          <button
                            className="btn btn-success btn-xs"
                            onClick={() => onOpenSendHr(v)}
                          >
                            <Send size={12} /> Send to HR
                          </button>

                          {tailored && (
                            <span className="badge badge-green" style={{ fontSize: 10.5 }}>
                              ATS {tailored.atsScore}%
                            </span>
                          )}

                          <button
                            className="btn btn-ghost btn-xs"
                            onClick={() => onDeleteVacancy(v.id)}
                            title="Remove row"
                            style={{ color: '#94a3b8', marginLeft: 'auto' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr>
                      <td colSpan={6} style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '14px 18px' }}>
                        <div className="grid-2">
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 12.5, marginBottom: 6 }}>
                              Deep Data Analysis & Role Fit
                            </div>
                            <p style={{ margin: '0 0 10px', fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.55 }}>
                              {v.deepAnalysisNotes}
                            </p>
                            {v.sources?.length > 0 && (
                              <div style={{ fontSize: 11.5, color: 'var(--text-soft)' }}>
                                <strong>Grounded Sources:</strong>{' '}
                                {v.sources.slice(0, 4).map((s, idx) => (
                                  <a
                                    key={idx}
                                    href={s.uri}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{ color: 'var(--primary)', marginRight: 10 }}
                                  >
                                    {s.title || 'Source'} ↗
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 12.5, marginBottom: 6 }}>
                              Skill Match Breakdown
                            </div>
                            <div style={{ marginBottom: 8 }}>
                              <span style={{ fontSize: 11.5, fontWeight: 600, color: '#6ee7b7' }}>Matched: </span>
                              {(v.matchedSkills?.length ? v.matchedSkills : v.requiredSkills || []).map((s, i) => (
                                <span key={i} className="badge badge-green" style={{ margin: '2px 4px 2px 0' }}>
                                  {s}
                                </span>
                              ))}
                            </div>
                            {v.missingSkills?.length > 0 && (
                              <div>
                                <span style={{ fontSize: 11.5, fontWeight: 600, color: '#fdba74' }}>Gap / Brush-up: </span>
                                {v.missingSkills.map((s, i) => (
                                  <span key={i} className="badge badge-amber" style={{ margin: '2px 4px 2px 0' }}>
                                    {s}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
