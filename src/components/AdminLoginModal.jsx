import React, { useState, useEffect, useRef } from 'react';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  X,
  ShieldCheck,
  Database,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { apiRequest, setAdminToken } from '../utils/apiClient.js';

export default function AdminLoginModal({ isOpen, onClose, onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [rememberedLogin, setRememberedLogin] = useState(null);
  const [showSavedDropdown, setShowSavedDropdown] = useState(false);
  const [autoFilledNotice, setAutoFilledNotice] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setShowSavedDropdown(false);
      setAutoFilledNotice(false);
      return;
    }

    let active = true;
    apiRequest('/api/auth?remembered=1')
      .then((res) => {
        if (!active) return;
        setRememberedLogin(res?.rememberedLogin || null);
      })
      .catch(() => {
        if (active) setRememberedLogin(null);
      });

    return () => {
      active = false;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!showSavedDropdown) return;
    const handleOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowSavedDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [showSavedDropdown]);

  if (!isOpen) return null;

  const applySavedCredentials = (saved) => {
    if (!saved) return;
    setUsername(saved.username || '');
    setPassword(saved.password || '');
    setAutoFilledNotice(true);
    setShowSavedDropdown(false);
  };

  const handleUsernameClickOrFocus = async () => {
    let saved = rememberedLogin;
    if (!saved) {
      try {
        const res = await apiRequest('/api/auth?remembered=1');
        saved = res?.rememberedLogin || null;
        setRememberedLogin(saved);
      } catch {
        saved = null;
      }
    }

    if (saved) {
      setShowSavedDropdown(true);
      // Automatically populate stored username & password when user clicks an empty username box
      if (!username && !password) {
        setUsername(saved.username || '');
        setPassword(saved.password || '');
        setAutoFilledNotice(true);
      }
    }
  };

  const handleForgetSaved = async (e) => {
    e.stopPropagation();
    try {
      await apiRequest('/api/auth?forget=1', { method: 'DELETE' });
    } catch {
      // ignore non-fatal network warning
    }
    setRememberedLogin(null);
    setShowSavedDropdown(false);
    setAutoFilledNotice(false);
    setUsername('');
    setPassword('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiRequest('/api/auth', {
        method: 'POST',
        body: {
          username: username.trim(),
          password,
          rememberMe,
        },
      });
      if (res.token) {
        setAdminToken(res.token);
      }
      setPassword('');
      onLoginSuccess(res.user);
    } catch (err) {
      setError(err?.message || 'Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: 440, borderRadius: 18, overflow: 'visible' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '20px 22px',
            background: 'linear-gradient(135deg, #e50914 0%, #ff8a1e 55%, #a855f7 100%)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 11,
                background: 'rgba(0,0,0,0.28)',
                border: '1px solid rgba(255,255,255,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16.5, fontWeight: 800 }}>Manoj Kumar Portal Login</h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, opacity: 0.92 }}>
                Access Manoj Kumar Portal, CSV Tracker, Website CMS &amp; HR Mailer
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.18)',
              border: 'none',
              borderRadius: 8,
              color: '#fff',
              padding: 6,
              cursor: 'pointer',
              display: 'flex',
            }}
            aria-label="Close Login"
          >
            <X size={17} />
          </button>
        </div>

        <form
          id="admin-login-form"
          onSubmit={handleSubmit}
          style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}
        >
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <label className="label" htmlFor="admin-username">
              Admin Username
            </label>
            <div style={{ position: 'relative' }}>
              <User
                size={15}
                style={{
                  position: 'absolute',
                  left: 11,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-soft)',
                }}
              />
              <input
                id="admin-username"
                name="username"
                autoComplete="username"
                className="input"
                style={{ paddingLeft: 34 }}
                placeholder="Click or enter admin username"
                value={username}
                onFocus={handleUsernameClickOrFocus}
                onClick={handleUsernameClickOrFocus}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setAutoFilledNotice(false);
                }}
                required
              />
            </div>

            {showSavedDropdown && rememberedLogin && (
              <div
                role="listbox"
                aria-label="Saved admin logins from Neon DB"
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: 6,
                  zIndex: 30,
                  borderRadius: 12,
                  background: '#111118',
                  border: '1px solid rgba(255, 138, 30, 0.45)',
                  boxShadow: '0 18px 44px rgba(0, 0, 0, 0.85)',
                  padding: 6,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    padding: '8px 10px',
                    borderRadius: 8,
                    background: 'rgba(229, 9, 20, 0.14)',
                    cursor: 'pointer',
                  }}
                  onClick={() => applySavedCredentials(rememberedLogin)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <Database size={15} color="#ff8a1e" />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>
                        {rememberedLogin.username}
                      </div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.68)' }}>
                        Saved in Neon DB • Password remembered (••••••••)
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleForgetSaved}
                    title="Forget saved login from database"
                    style={{
                      border: '1px solid rgba(229, 9, 20, 0.45)',
                      background: 'rgba(229, 9, 20, 0.2)',
                      color: '#fecaca',
                      borderRadius: 7,
                      padding: '4px 8px',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Trash2 size={12} /> Forget
                  </button>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="label" htmlFor="admin-password">
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={15}
                style={{
                  position: 'absolute',
                  left: 11,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-soft)',
                }}
              />
              <input
                id="admin-password"
                name="password"
                autoComplete="current-password"
                className="input"
                type={showPass ? 'text' : 'password'}
                style={{ paddingLeft: 34, paddingRight: 38 }}
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setAutoFilledNotice(false);
                }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPass((s) => !s)}
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
                aria-label="Toggle password visibility"
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {autoFilledNotice && (
            <div
              style={{
                padding: '8px 11px',
                borderRadius: 9,
                background: 'rgba(16, 185, 129, 0.16)',
                border: '1px solid rgba(52, 211, 153, 0.4)',
                color: '#6ee7b7',
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 7,
              }}
            >
              <CheckCircle2 size={15} />
              <span>Loaded saved username &amp; password from Neon DB for this device.</span>
            </div>
          )}

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 12.5,
              color: 'var(--text-muted)',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              style={{ accentColor: '#e50914', width: 15, height: 15 }}
            />
            Remember my username &amp; password in Neon DB on this device
          </label>

          {error && (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: 9,
                background: 'rgba(229, 9, 20, 0.16)',
                border: '1px solid rgba(255, 30, 45, 0.45)',
                color: '#fecaca',
                fontSize: 12.5,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn"
              disabled={loading}
              style={{
                background: 'linear-gradient(135deg, #e50914 0%, #ff8a1e 100%)',
                color: '#fff',
                boxShadow: '0 0 22px rgba(229, 9, 20, 0.4)',
              }}
            >
              {loading ? <Loader2 size={15} className="spin" /> : <Lock size={14} />}
              Sign In to Manoj Kumar Portal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
