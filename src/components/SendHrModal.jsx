import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  Sparkles,
  Download,
  Mail,
  ExternalLink,
  Paperclip,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Copy,
} from 'lucide-react';
import { generateHrEmailDraft } from '../services/geminiService.js';
import { buildCvPdfBase64, downloadCvPdf } from '../utils/cvPdf.js';
import { postApiJson } from '../utils/apiClient.js';

export default function SendHrModal({
  isOpen,
  onClose,
  vacancy,
  cv,
  apiKey,
  selectedModel,
  smtpConfig,
  onApplicationLogged,
  onOpenSettings,
}) {
  const [toEmail, setToEmail] = useState('');
  const [ccEmail, setCcEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [drafting, setDrafting] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendFeedback, setSendFeedback] = useState(null);

  useEffect(() => {
    if (!isOpen || !vacancy) return;
    setSendFeedback(null);
    setToEmail(vacancy.hrEmail || '');
    setCcEmail('');
    setSubject(`Application for ${vacancy.role} — ${cv.fullName} (B.E. ISE 2026)`);
    setBody(
      `Dear ${vacancy.hrName || 'Hiring Team'},\n\nI am writing to express my strong interest in the ${vacancy.role} position at ${vacancy.company}.\n\nI am a 2026 Information Science & Engineering graduate (CGPA: 7.56) with hands-on industry experience from my Python & Data Analytics internship at Dyashin Technosoft Pvt. Ltd., Bengaluru, along with a VTU Elite Gold (12-credit) certification in Python, React.js, Cybersecurity, and Full Stack Development.\n\nMy tailored resume PDF is attached for your review. I would welcome the opportunity to discuss how my skills align with your team.\n\nBest regards,\n${cv.fullName}\n${cv.phone} | ${cv.email}\nLinkedIn: ${cv.linkedin}\nGitHub: ${cv.github}`
    );
  }, [isOpen, vacancy, cv]);

  if (!isOpen || !vacancy) return null;

  const pdfFilename = `${(cv.fullName || 'Resume').replace(/[^a-zA-Z0-9]+/g, '_')}_${(
    vacancy.company || 'CV'
  ).replace(/[^a-zA-Z0-9]+/g, '_')}_CV.pdf`;

  const handleAiDraft = async () => {
    setDrafting(true);
    setSendFeedback(null);
    try {
      const draft = await generateHrEmailDraft({
        apiKey,
        modelId: selectedModel,
        cv,
        vacancy,
      });
      if (draft.subject) setSubject(draft.subject);
      if (draft.body) setBody(draft.body);
    } catch (err) {
      setSendFeedback({
        type: 'error',
        text: err?.message || 'Failed to generate AI cover email.',
      });
    } finally {
      setDrafting(false);
    }
  };

  const handleDirectSmtpSend = async () => {
    if (!toEmail.trim()) {
      setSendFeedback({ type: 'error', text: 'Please enter the HR email address.' });
      return;
    }
    if (!smtpConfig?.smtpUser || !smtpConfig?.smtpPass) {
      setSendFeedback({
        type: 'error',
        text: 'Direct SMTP credentials are not configured yet. Configure Gmail App Password in Settings or use "Open Gmail + Download PDF" below.',
      });
      return;
    }

    setSending(true);
    setSendFeedback(null);
    try {
      const attachmentBase64 = buildCvPdfBase64(cv);
      await postApiJson('/api/send-email', {
        ...smtpConfig,
        to: toEmail.trim(),
        cc: ccEmail.trim() || undefined,
        subject,
        textBody: body,
        attachmentFilename: pdfFilename,
        attachmentBase64,
      });

      onApplicationLogged(vacancy, {
        method: 'Direct SMTP Email (PDF Attached)',
        hrEmail: toEmail.trim(),
        subject,
      });

      setSendFeedback({
        type: 'success',
        text: `Email with ${pdfFilename} sent directly to ${toEmail}! Status updated to Applied.`,
      });
    } catch (err) {
      setSendFeedback({
        type: 'error',
        text: err?.message || 'Could not reach email relay API.',
      });
    } finally {
      setSending(false);
    }
  };

  const handleOpenGmail = () => {
    downloadCvPdf(cv, vacancy.company);
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
      toEmail.trim()
    )}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(gmailUrl, '_blank', 'noopener,noreferrer');
    onApplicationLogged(vacancy, {
      method: 'Gmail Compose + Tailored PDF',
      hrEmail: toEmail.trim(),
      subject,
    });
    setSendFeedback({
      type: 'success',
      text: `Downloaded ${pdfFilename} and opened Gmail Compose! Just attach the downloaded PDF and click Send.`,
    });
  };

  const handleOpenMailto = () => {
    downloadCvPdf(cv, vacancy.company);
    const mailto = `mailto:${encodeURIComponent(toEmail.trim())}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    onApplicationLogged(vacancy, {
      method: 'Mail App + Tailored PDF',
      hrEmail: toEmail.trim(),
      subject,
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Mail size={18} color="#059669" /> Send Resume Directly to HR — {vacancy.company}
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-soft)' }}>
              Role: {vacancy.role} • Package: {vacancy.packageLpa}
            </p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="grid-2">
            <div>
              <label className="label">HR / Recruiter Email</label>
              <input
                className="input mono"
                type="email"
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                placeholder="hr@company.com"
              />
            </div>
            <div>
              <label className="label">CC (Optional)</label>
              <input
                className="input mono"
                type="email"
                value={ccEmail}
                onChange={(e) => setCcEmail(e.target.value)}
                placeholder="talent@company.com"
              />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
              <label className="label" style={{ margin: 0 }}>Email Subject</label>
              <button className="btn btn-indigo btn-xs" onClick={handleAiDraft} disabled={drafting || !apiKey}>
                {drafting ? <Loader2 size={12} className="spin" /> : <Sparkles size={12} />}
                Craft Personalized Content with Gemini
              </button>
            </div>
            <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>

          <div>
            <label className="label">Email Content / Cover Note</label>
            <textarea
              className="textarea"
              rows={9}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>

          <div
            style={{
              background: '#f8fafc',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
              <Paperclip size={15} color="#2563eb" />
              <span>
                Attached Resume: <strong className="mono">{pdfFilename}</strong>
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-outline btn-xs"
                onClick={() => downloadCvPdf(cv, vacancy.company)}
              >
                <Download size={12} /> Download PDF
              </button>
              <button
                className="btn btn-outline btn-xs"
                onClick={() => navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`)}
              >
                <Copy size={12} /> Copy Email Text
              </button>
            </div>
          </div>

          {!smtpConfig?.smtpUser && (
            <div
              style={{
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: 8,
                padding: '9px 12px',
                fontSize: 12,
                color: '#92400e',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <span>
                Tip: Use <strong>Open Gmail + Download PDF</strong> instantly, or configure Gmail App Password in Settings for 1-click direct SMTP sending with auto-attached PDF.
              </span>
              <button className="btn btn-outline btn-xs" onClick={onOpenSettings}>
                Configure SMTP
              </button>
            </div>
          )}

          {sendFeedback && (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: 8,
                fontSize: 12.5,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: sendFeedback.type === 'success' ? 'var(--success-soft)' : 'var(--danger-soft)',
                color: sendFeedback.type === 'success' ? '#065f46' : '#991b1b',
                border: `1px solid ${sendFeedback.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
              }}
            >
              {sendFeedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{sendFeedback.text}</span>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>
            Close
          </button>
          <button className="btn btn-outline" onClick={handleOpenMailto}>
            <Mail size={14} /> Default Mail App
          </button>
          <button className="btn btn-primary" onClick={handleOpenGmail}>
            <ExternalLink size={14} /> Open Gmail + Download PDF
          </button>
          <button className="btn btn-success" onClick={handleDirectSmtpSend} disabled={sending}>
            {sending ? <Loader2 size={14} className="spin" /> : <Send size={14} />}
            Send Directly via SMTP (PDF Attached)
          </button>
        </div>
      </div>
    </div>
  );
}
