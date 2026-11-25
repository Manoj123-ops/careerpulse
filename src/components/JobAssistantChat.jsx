import React, { useState, useEffect } from 'react';
import { Bot, Send, Loader2, Sparkles, User, Trash2 } from 'lucide-react';
import { askJobAssistant } from '../services/geminiService.js';

const QUICK_PROMPTS = [
  'Which tracked vacancies have the highest LPA and best match for my Dyashin internship?',
  'List all upcoming walk-in interviews with timings and preparation tips.',
  'Generate 10 technical interview questions tailored to my Diabetes ML & Library MySQL projects.',
  'What top 3 skills should I learn this week to boost my match score across these vacancies?',
];

export default function JobAssistantChat({
  apiKey,
  selectedModel,
  cv,
  vacancies,
  persistedMessages,
  onPersistMessage,
  onClearMessages,
}) {
  const welcomeMessage = {
    role: 'assistant',
    text: `Hi ${cv.fullName.split(' ')[0]}! I am your CareerPulse AI Job Assistant. I have full context of your CV (B.E. ISE 2026, Dyashin Data Analytics internship, VTU React & Cybersecurity Elite Gold, ML & MySQL projects) and all ${vacancies.length} tracked vacancies. Ask me anything about interview prep, walk-in strategies, HR outreach, or skill gaps!`,
  };

  const [messages, setMessages] = useState(
    persistedMessages?.length ? persistedMessages : [welcomeMessage]
  );
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (persistedMessages && persistedMessages.length > 0) {
      setMessages(persistedMessages);
    }
  }, [persistedMessages]);

  const sendQuestion = async (textToSend) => {
    const q = (textToSend ?? input).trim();
    if (!q || loading) return;

    const userMsg = { role: 'user', text: q };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput('');
    setLoading(true);
    onPersistMessage?.(userMsg);

    try {
      const reply = await askJobAssistant({
        apiKey,
        modelId: selectedModel,
        question: q,
        history: nextHistory,
        cv,
        vacancies,
      });
      const assistantMsg = { role: 'assistant', text: reply };
      setMessages((prev) => [...prev, assistantMsg]);
      onPersistMessage?.(assistantMsg);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `Error: ${err?.message || 'Could not reach Gemini API. Check your API key in Settings.'}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([welcomeMessage]);
    onClearMessages?.();
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 180px)', minHeight: 520 }}>
      <div className="card-header">
        <h3 className="card-title">
          <Bot size={18} color="#4f46e5" /> CareerPulse AI Job Assistant & Interview Coach
        </h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="badge badge-blue mono">Model: {selectedModel}</span>
          <button className="btn btn-outline btn-xs" onClick={handleClear} title="Clear Chat History">
            <Trash2 size={12} /> Clear Chat
          </button>
        </div>
      </div>

      <div style={{ padding: '10px 18px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, flexWrap: 'wrap', background: 'var(--surface-subtle)' }}>
        {QUICK_PROMPTS.map((qp, idx) => (
          <button
            key={idx}
            className="btn btn-outline btn-xs"
            onClick={() => sendQuestion(qp)}
            disabled={loading}
          >
            <Sparkles size={11} color="#4f46e5" /> {qp}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {messages.map((m, idx) => {
          const isUser = m.role === 'user';
          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                justifyContent: isUser ? 'flex-end' : 'flex-start',
                gap: 10,
              }}
            >
              {!isUser && (
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 9,
                    background: '#eef2ff',
                    color: '#4f46e5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Bot size={17} />
                </div>
              )}
              <div
                style={{
                  maxWidth: '78%',
                  padding: '11px 14px',
                  borderRadius: 12,
                  fontSize: 13,
                  lineHeight: 1.55,
                  whiteSpace: 'pre-wrap',
                  background: isUser ? 'var(--primary)' : 'var(--surface-subtle)',
                  color: isUser ? '#fff' : 'var(--text)',
                  border: isUser ? 'none' : '1px solid var(--border)',
                }}
              >
                {m.text}
              </div>
              {isUser && (
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 9,
                    background: '#dbeafe',
                    color: '#1d4ed8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <User size={17} />
                </div>
              )}
            </div>
          );
        })}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--text-soft)' }}>
            <Loader2 size={15} className="spin" /> Thinking with {selectedModel}...
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendQuestion();
        }}
        style={{
          padding: 14,
          borderTop: '1px solid var(--border)',
          display: 'flex',
          gap: 10,
          background: 'var(--surface)',
        }}
      >
        <input
          className="input"
          placeholder="Ask about interview prep, salary negotiation, walk-in prep, or HR follow-ups..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button className="btn btn-primary" type="submit" disabled={loading || !input.trim()}>
          <Send size={14} /> Ask
        </button>
      </form>
    </div>
  );
}
