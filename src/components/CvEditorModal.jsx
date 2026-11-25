import React, { useState, useEffect } from 'react';
import { X, Download, Save, FileText, Sparkles, Plus, Trash2, Send } from 'lucide-react';
import { cvToPlainText } from '../data/defaultCv.js';
import { downloadCvPdf, downloadCvTxt } from '../utils/cvPdf.js';

export default function CvEditorModal({
  isOpen,
  onClose,
  cv,
  vacancy,
  tailoredMeta,
  onSaveCv,
  onRegenerate,
  onOpenSendHr,
  regenerating,
}) {
  const [draft, setDraft] = useState(cv);

  useEffect(() => {
    if (cv) {
      setDraft(JSON.parse(JSON.stringify(cv)));
    }
  }, [cv, isOpen]);

  if (!isOpen || !draft) return null;

  const companyLabel = vacancy ? vacancy.company : 'Base_Profile';

  const updateField = (field, value) => setDraft((prev) => ({ ...prev, [field]: value }));

  const updateSkill = (idx, key, value) => {
    setDraft((prev) => {
      const next = [...(prev.skills || [])];
      next[idx] = { ...next[idx], [key]: value };
      return { ...prev, skills: next };
    });
  };

  const updateExperience = (idx, key, value) => {
    setDraft((prev) => {
      const next = [...(prev.experience || [])];
      next[idx] = { ...next[idx], [key]: value };
      return { ...prev, experience: next };
    });
  };

  const updateProject = (idx, key, value) => {
    setDraft((prev) => {
      const next = [...(prev.projects || [])];
      next[idx] = { ...next[idx], [key]: value };
      return { ...prev, projects: next };
    });
  };

  const handleSave = () => {
    onSaveCv(draft);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 1260 }}>
        <div className="modal-header">
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={18} color="#4f46e5" />
              {vacancy ? `CV Editor & Preview — ${vacancy.company} (${vacancy.role})` : 'Edit My Base CV'}
            </h3>
            {tailoredMeta && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
                <span className="badge badge-green">ATS Match: {tailoredMeta.atsScore}%</span>
                <span style={{ fontSize: 12, color: 'var(--text-soft)' }}>{tailoredMeta.tailoringNotes}</span>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {vacancy && onRegenerate && (
              <button className="btn btn-indigo btn-sm" onClick={() => onRegenerate(vacancy)} disabled={regenerating}>
                <Sparkles size={14} /> {regenerating ? 'Tailoring...' : 'Re-Tailor with AI'}
              </button>
            )}
            <button
              className="btn btn-outline btn-sm"
              onClick={() => downloadCvPdf(draft, companyLabel)}
            >
              <Download size={14} /> Download PDF
            </button>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => downloadCvTxt(draft, companyLabel, cvToPlainText(draft))}
            >
              <Download size={14} /> TXT
            </button>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Left Column: Structured Editor */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', paddingRight: 6 }}>
            <div className="grid-2">
              <div>
                <label className="label">Full Name</label>
                <input
                  className="input"
                  value={draft.fullName || ''}
                  onChange={(e) => updateField('fullName', e.target.value)}
                />
              </div>
              <div>
                <label className="label">Target Headline</label>
                <input
                  className="input"
                  value={draft.headline || ''}
                  onChange={(e) => updateField('headline', e.target.value)}
                />
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  className="input"
                  value={draft.email || ''}
                  onChange={(e) => updateField('email', e.target.value)}
                />
              </div>
              <div>
                <label className="label">Phone</label>
                <input
                  className="input"
                  value={draft.phone || ''}
                  onChange={(e) => updateField('phone', e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="label">Professional Summary</label>
              <textarea
                className="textarea"
                rows={4}
                value={draft.summary || ''}
                onChange={(e) => updateField('summary', e.target.value)}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label className="label" style={{ margin: 0 }}>Technical Skills</label>
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() =>
                    updateField('skills', [...(draft.skills || []), { category: 'New Category', items: '' }])
                  }
                >
                  <Plus size={12} /> Add Skill Row
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(draft.skills || []).map((sk, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 28px', gap: 6 }}>
                    <input
                      className="input"
                      style={{ fontSize: 12, padding: '6px 8px' }}
                      value={sk.category}
                      onChange={(e) => updateSkill(idx, 'category', e.target.value)}
                    />
                    <input
                      className="input"
                      style={{ fontSize: 12, padding: '6px 8px' }}
                      value={sk.items}
                      onChange={(e) => updateSkill(idx, 'items', e.target.value)}
                    />
                    <button
                      className="btn btn-ghost btn-xs"
                      onClick={() =>
                        updateField(
                          'skills',
                          draft.skills.filter((_, i) => i !== idx)
                        )
                      }
                    >
                      <Trash2 size={13} color="#dc2626" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Internship Experience</label>
              {(draft.experience || []).map((exp, idx) => (
                <div
                  key={idx}
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: 10,
                    marginBottom: 8,
                    background: 'var(--surface-subtle)',
                  }}
                >
                  <div className="grid-2" style={{ marginBottom: 6 }}>
                    <input
                      className="input"
                      style={{ fontSize: 12, padding: '6px 8px' }}
                      value={exp.title}
                      onChange={(e) => updateExperience(idx, 'title', e.target.value)}
                      placeholder="Role"
                    />
                    <input
                      className="input"
                      style={{ fontSize: 12, padding: '6px 8px' }}
                      value={exp.company}
                      onChange={(e) => updateExperience(idx, 'company', e.target.value)}
                      placeholder="Company"
                    />
                  </div>
                  <textarea
                    className="textarea"
                    rows={3}
                    style={{ fontSize: 12 }}
                    value={(exp.bullets || []).join('\n')}
                    onChange={(e) =>
                      updateExperience(
                        idx,
                        'bullets',
                        e.target.value.split('\n').filter((b) => b.trim().length > 0)
                      )
                    }
                    placeholder="One bullet per line"
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="label">Projects</label>
              {(draft.projects || []).map((proj, idx) => (
                <div
                  key={idx}
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: 10,
                    marginBottom: 8,
                    background: 'var(--surface-subtle)',
                  }}
                >
                  <div className="grid-2" style={{ marginBottom: 6 }}>
                    <input
                      className="input"
                      style={{ fontSize: 12, padding: '6px 8px' }}
                      value={proj.title}
                      onChange={(e) => updateProject(idx, 'title', e.target.value)}
                      placeholder="Project Title"
                    />
                    <input
                      className="input"
                      style={{ fontSize: 12, padding: '6px 8px' }}
                      value={proj.tech || ''}
                      onChange={(e) => updateProject(idx, 'tech', e.target.value)}
                      placeholder="Tech Stack"
                    />
                  </div>
                  <textarea
                    className="textarea"
                    rows={3}
                    style={{ fontSize: 12 }}
                    value={(proj.bullets || []).join('\n')}
                    onChange={(e) =>
                      updateProject(
                        idx,
                        'bullets',
                        e.target.value.split('\n').filter((b) => b.trim().length > 0)
                      )
                    }
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="label">Certifications (one per line)</label>
              <textarea
                className="textarea"
                rows={3}
                style={{ fontSize: 12 }}
                value={(draft.certifications || []).join('\n')}
                onChange={(e) =>
                  updateField(
                    'certifications',
                    e.target.value.split('\n').filter((c) => c.trim().length > 0)
                  )
                }
              />
            </div>
          </div>

          {/* Right Column: Live ATS Resume Preview */}
          <div style={{ overflowY: 'auto' }}>
            <div className="cv-paper">
              <h2>{draft.fullName}</h2>
              <div className="cv-role">{draft.headline}</div>
              <div className="cv-contact">
                {[draft.phone, draft.email, draft.linkedin, draft.github].filter(Boolean).join(' | ')}
              </div>

              <div className="cv-sec-title">Professional Summary</div>
              <p style={{ margin: 0 }}>{draft.summary}</p>

              <div className="cv-sec-title">Education</div>
              {(draft.education || []).map((edu, i) => (
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
              {(draft.skills || []).map((sk, i) => (
                <div key={i} style={{ marginBottom: 2 }}>
                  <strong>{sk.category}:</strong> {sk.items}
                </div>
              ))}

              <div className="cv-sec-title">Internship Experience</div>
              {(draft.experience || []).map((exp, i) => (
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
              {(draft.projects || []).map((proj, i) => (
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
                {(draft.certifications || []).map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          {vacancy && onOpenSendHr && (
            <button
              className="btn btn-success"
              onClick={() => {
                onSaveCv(draft);
                onClose();
                onOpenSendHr(vacancy);
              }}
            >
              <Send size={14} /> Save & Send to HR
            </button>
          )}
          <button className="btn btn-primary" onClick={handleSave}>
            <Save size={14} /> Save CV Changes
          </button>
        </div>
      </div>
    </div>
  );
}
