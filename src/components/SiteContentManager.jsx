import React, { useState, useEffect, useRef } from 'react';
import {
  Save,
  RotateCcw,
  Upload,
  Plus,
  Trash2,
  Sparkles,
  Image as ImageIcon,
  Layout,
  Clock,
  Layers,
  Film,
  Loader2,
} from 'lucide-react';
import { DEFAULT_SITE_CONTENT } from '../data/defaultSiteContent.js';
import { compressPortraitFile } from '../utils/imageResize.js';

export default function SiteContentManager({
  siteContent,
  profilePhoto,
  silhouettePhoto,
  editorialPhoto,
  onSaveCms,
  onResetCms,
}) {
  const [draft, setDraft] = useState(() =>
    JSON.parse(JSON.stringify(siteContent || DEFAULT_SITE_CONTENT))
  );
  const [photos, setPhotos] = useState({
    profilePhoto: profilePhoto || '',
    silhouettePhoto: silhouettePhoto || '',
    editorialPhoto: editorialPhoto || '',
  });
  const [activeSection, setActiveSection] = useState('hero');
  const [saving, setSaving] = useState(false);

  const profileInputRef = useRef(null);
  const silhouetteInputRef = useRef(null);
  const editorialInputRef = useRef(null);

  useEffect(() => {
    setDraft(JSON.parse(JSON.stringify(siteContent || DEFAULT_SITE_CONTENT)));
  }, [siteContent]);

  useEffect(() => {
    setPhotos({
      profilePhoto: profilePhoto || '',
      silhouettePhoto: silhouettePhoto || '',
      editorialPhoto: editorialPhoto || '',
    });
  }, [profilePhoto, silhouettePhoto, editorialPhoto]);

  const handlePhotoUpload = async (field, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressPortraitFile(file, 1080);
      setPhotos((prev) => ({ ...prev, [field]: dataUrl }));
    } finally {
      e.target.value = '';
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveCms({
        siteContent: draft,
        ...photos,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResetAll = async () => {
    setSaving(true);
    try {
      const fresh = JSON.parse(JSON.stringify(DEFAULT_SITE_CONTENT));
      setDraft(fresh);
      setPhotos({ profilePhoto: '', silhouettePhoto: '', editorialPhoto: '' });
      await onResetCms();
    } finally {
      setSaving(false);
    }
  };

  const updateNested = (section, key, val) => {
    setDraft((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: val,
      },
    }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">
              <Layout size={18} color="#e50914" /> Website Content Management (Public 3D Portfolio CMS)
            </h2>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-soft)' }}>
              Edit every text, timeline milestone, 3D tool cube, showcase panel, and portrait image on your public portfolio — saved live to Neon PostgreSQL.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-outline btn-sm" onClick={handleResetAll} disabled={saving}>
              <RotateCcw size={14} /> Reset Defaults
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
              Save Website Content
            </button>
          </div>
        </div>

        {/* Sub-navigation */}
        <div
          style={{
            padding: '10px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            background: 'var(--surface-subtle)',
          }}
        >
          {[
            { id: 'hero', label: 'Hero & Navbar', Icon: Sparkles },
            { id: 'universe', label: 'Scene 02: Tool Cubes', Icon: Layers },
            { id: 'journey', label: 'Scene 03: Timeline', Icon: Clock },
            { id: 'showcase', label: 'Scene 04: 3D Showcase', Icon: Layout },
            { id: 'poster', label: 'Scene 05: Poster & Links', Icon: Film },
            { id: 'media', label: 'Portraits & Silhouettes', Icon: ImageIcon },
          ].map((tab) => {
            const Icon = tab.Icon;
            return (
              <button
                key={tab.id}
                className={`nav-tab ${activeSection === tab.id ? 'active' : ''}`}
                onClick={() => setActiveSection(tab.id)}
              >
                <Icon size={13} /> {tab.label}
              </button>
            );
          })}
        </div>

        <div className="card-body">
          {activeSection === 'hero' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="grid-3">
                <div>
                  <label className="label">Navbar Brand Name</label>
                  <input
                    className="input"
                    value={draft.brandName || ''}
                    onChange={(e) => setDraft({ ...draft, brandName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Navbar Stacked Micro-Text</label>
                  <input
                    className="input"
                    value={draft.brandMicroText || ''}
                    onChange={(e) => setDraft({ ...draft, brandMicroText: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Right Navbar Badge</label>
                  <input
                    className="input"
                    value={draft.navBadge || ''}
                    onChange={(e) => setDraft({ ...draft, navBadge: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid-2">
                <div>
                  <label className="label">Hero Top Label</label>
                  <input
                    className="input"
                    value={draft.hero?.topLabel || ''}
                    onChange={(e) => updateNested('hero', 'topLabel', e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Massive Red Display Name</label>
                  <input
                    className="input"
                    value={draft.hero?.displayName || ''}
                    onChange={(e) => updateNested('hero', 'displayName', e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Left Floating Pill Badge</label>
                  <input
                    className="input"
                    value={draft.hero?.leftBadge || ''}
                    onChange={(e) => updateNested('hero', 'leftBadge', e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Right Floating Pill Badge</label>
                  <input
                    className="input"
                    value={draft.hero?.rightBadge || ''}
                    onChange={(e) => updateNested('hero', 'rightBadge', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="label">Hero Role Subtitle</label>
                <input
                  className="input"
                  value={draft.hero?.subtitle || ''}
                  onChange={(e) => updateNested('hero', 'subtitle', e.target.value)}
                />
              </div>

              <div>
                <label className="label">Hero Value Proposition</label>
                <textarea
                  className="textarea"
                  rows={2}
                  value={draft.hero?.tagline || ''}
                  onChange={(e) => updateNested('hero', 'tagline', e.target.value)}
                />
              </div>
            </div>
          )}

          {activeSection === 'universe' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="grid-2">
                <div>
                  <label className="label">Scene Kicker</label>
                  <input
                    className="input"
                    value={draft.universe?.kicker || ''}
                    onChange={(e) => updateNested('universe', 'kicker', e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Scene Title</label>
                  <input
                    className="input"
                    value={draft.universe?.title || ''}
                    onChange={(e) => updateNested('universe', 'title', e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="label" style={{ margin: 0 }}>
                  Floating 3D Tool Cubes ({(draft.universe?.tools || []).length})
                </label>
                <button
                  className="btn btn-outline btn-xs"
                  onClick={() =>
                    updateNested('universe', 'tools', [
                      ...(draft.universe?.tools || []),
                      { name: 'New Tool', tag: 'Category', accent: '#e50914' },
                    ])
                  }
                >
                  <Plus size={12} /> Add Tool Cube
                </button>
              </div>

              <div className="grid-2">
                {(draft.universe?.tools || []).map((tool, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 70px 30px',
                      gap: 8,
                      alignItems: 'center',
                      padding: 8,
                      borderRadius: 8,
                      background: 'var(--surface-subtle)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <input
                      className="input"
                      style={{ padding: '6px 8px', fontSize: 12 }}
                      value={tool.name}
                      onChange={(e) => {
                        const next = [...draft.universe.tools];
                        next[idx] = { ...next[idx], name: e.target.value };
                        updateNested('universe', 'tools', next);
                      }}
                      placeholder="Tool Name"
                    />
                    <input
                      className="input"
                      style={{ padding: '6px 8px', fontSize: 12 }}
                      value={tool.tag}
                      onChange={(e) => {
                        const next = [...draft.universe.tools];
                        next[idx] = { ...next[idx], tag: e.target.value };
                        updateNested('universe', 'tools', next);
                      }}
                      placeholder="Role / Tag"
                    />
                    <input
                      type="color"
                      value={tool.accent || '#e50914'}
                      onChange={(e) => {
                        const next = [...draft.universe.tools];
                        next[idx] = { ...next[idx], accent: e.target.value };
                        updateNested('universe', 'tools', next);
                      }}
                      style={{ width: '100%', height: 32, border: 'none', background: 'none', cursor: 'pointer' }}
                    />
                    <button
                      className="btn btn-ghost btn-xs"
                      onClick={() =>
                        updateNested(
                          'universe',
                          'tools',
                          draft.universe.tools.filter((_, i) => i !== idx)
                        )
                      }
                    >
                      <Trash2 size={13} color="#dc2626" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'journey' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label className="label">Vertical Stage Title</label>
                  <input
                    className="input"
                    value={draft.journey?.verticalTitle || ''}
                    onChange={(e) => updateNested('journey', 'verticalTitle', e.target.value)}
                  />
                </div>
                <button
                  className="btn btn-outline btn-sm"
                  style={{ marginTop: 18 }}
                  onClick={() =>
                    updateNested('journey', 'milestones', [
                      ...(draft.journey?.milestones || []),
                      { year: '2026', title: 'New Milestone', subtitle: 'Role', bullets: ['Achievement 1'] },
                    ])
                  }
                >
                  <Plus size={14} /> Add Milestone
                </button>
              </div>

              <div className="grid-2">
                {(draft.journey?.milestones || []).map((m, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: 12,
                      borderRadius: 10,
                      background: 'var(--surface-subtle)',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 30px', gap: 8 }}>
                      <input
                        className="input"
                        style={{ fontSize: 12, padding: '6px 8px' }}
                        value={m.year}
                        onChange={(e) => {
                          const next = [...draft.journey.milestones];
                          next[idx] = { ...next[idx], year: e.target.value };
                          updateNested('journey', 'milestones', next);
                        }}
                        placeholder="Year"
                      />
                      <input
                        className="input"
                        style={{ fontSize: 12, padding: '6px 8px' }}
                        value={m.title}
                        onChange={(e) => {
                          const next = [...draft.journey.milestones];
                          next[idx] = { ...next[idx], title: e.target.value };
                          updateNested('journey', 'milestones', next);
                        }}
                        placeholder="Milestone Title"
                      />
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={() =>
                          updateNested(
                            'journey',
                            'milestones',
                            draft.journey.milestones.filter((_, i) => i !== idx)
                          )
                        }
                      >
                        <Trash2 size={13} color="#dc2626" />
                      </button>
                    </div>
                    <input
                      className="input"
                      style={{ fontSize: 12, padding: '6px 8px' }}
                      value={m.subtitle}
                      onChange={(e) => {
                        const next = [...draft.journey.milestones];
                        next[idx] = { ...next[idx], subtitle: e.target.value };
                        updateNested('journey', 'milestones', next);
                      }}
                      placeholder="Subtitle / Org"
                    />
                    <textarea
                      className="textarea"
                      rows={3}
                      style={{ fontSize: 12 }}
                      value={(m.bullets || []).join('\n')}
                      onChange={(e) => {
                        const next = [...draft.journey.milestones];
                        next[idx] = {
                          ...next[idx],
                          bullets: e.target.value.split('\n').filter((b) => b.trim().length > 0),
                        };
                        updateNested('journey', 'milestones', next);
                      }}
                      placeholder="One bullet per line"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'showcase' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="grid-3">
                <div>
                  <label className="label">Center Eyebrow</label>
                  <input
                    className="input"
                    value={draft.showcase?.centerEyebrow || ''}
                    onChange={(e) => updateNested('showcase', 'centerEyebrow', e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Center Panel Heading</label>
                  <input
                    className="input"
                    value={draft.showcase?.centerHeading || ''}
                    onChange={(e) => updateNested('showcase', 'centerHeading', e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Center CTA Button</label>
                  <input
                    className="input"
                    value={draft.showcase?.centerCta || ''}
                    onChange={(e) => updateNested('showcase', 'centerCta', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid-3">
                {(draft.showcase?.panels || []).map((panel, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: 10,
                      borderRadius: 9,
                      background: 'var(--surface-subtle)',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: '64px 1fr', gap: 6 }}>
                      <input
                        className="input mono"
                        style={{ fontSize: 11.5, padding: '5px 7px' }}
                        value={panel.num}
                        onChange={(e) => {
                          const next = [...draft.showcase.panels];
                          next[idx] = { ...next[idx], num: e.target.value };
                          updateNested('showcase', 'panels', next);
                        }}
                      />
                      <input
                        className="input"
                        style={{ fontSize: 12, padding: '5px 8px' }}
                        value={panel.title}
                        onChange={(e) => {
                          const next = [...draft.showcase.panels];
                          next[idx] = { ...next[idx], title: e.target.value };
                          updateNested('showcase', 'panels', next);
                        }}
                      />
                    </div>
                    <input
                      className="input"
                      style={{ fontSize: 11.5, padding: '5px 8px' }}
                      value={panel.tag}
                      onChange={(e) => {
                        const next = [...draft.showcase.panels];
                        next[idx] = { ...next[idx], tag: e.target.value };
                        updateNested('showcase', 'panels', next);
                      }}
                      placeholder="Tag"
                    />
                    <textarea
                      className="textarea"
                      rows={2}
                      style={{ fontSize: 11.5 }}
                      value={panel.desc}
                      onChange={(e) => {
                        const next = [...draft.showcase.panels];
                        next[idx] = { ...next[idx], desc: e.target.value };
                        updateNested('showcase', 'panels', next);
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'poster' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="grid-2">
                <div>
                  <label className="label">Poster Vertical Micro-Copy</label>
                  <input
                    className="input"
                    value={draft.poster?.verticalText || ''}
                    onChange={(e) => updateNested('poster', 'verticalText', e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Poster Tagline</label>
                  <input
                    className="input"
                    value={draft.poster?.posterTagline || ''}
                    onChange={(e) => updateNested('poster', 'posterTagline', e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Reveal Editorial Headline</label>
                  <input
                    className="input"
                    value={draft.poster?.revealHeadline || ''}
                    onChange={(e) => updateNested('poster', 'revealHeadline', e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Footer Copyright</label>
                  <input
                    className="input"
                    value={draft.poster?.copyright || ''}
                    onChange={(e) => updateNested('poster', 'copyright', e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Contact Email</label>
                  <input
                    className="input"
                    value={draft.poster?.email || ''}
                    onChange={(e) => updateNested('poster', 'email', e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Contact Phone</label>
                  <input
                    className="input"
                    value={draft.poster?.phone || ''}
                    onChange={(e) => updateNested('poster', 'phone', e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">GitHub URL</label>
                  <input
                    className="input"
                    value={draft.poster?.githubUrl || ''}
                    onChange={(e) => updateNested('poster', 'githubUrl', e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">LinkedIn URL</label>
                  <input
                    className="input"
                    value={draft.poster?.linkedinUrl || ''}
                    onChange={(e) => updateNested('poster', 'linkedinUrl', e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="label">Reveal Editorial Subtext</label>
                <textarea
                  className="textarea"
                  rows={2}
                  value={draft.poster?.revealSubtext || ''}
                  onChange={(e) => updateNested('poster', 'revealSubtext', e.target.value)}
                />
              </div>
            </div>
          )}

          {activeSection === 'media' && (
            <div className="grid-3">
              {/* Hero / Poster Suit Portrait */}
              <div className="card" style={{ padding: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 8 }}>
                  Hero Cutout &amp; Suit Portrait
                </div>
                <img
                  src={photos.profilePhoto || '/portrait-cutout.png'}
                  alt="Hero Cutout"
                  style={{
                    width: '100%',
                    height: 220,
                    objectFit: 'contain',
                    background: '#050508',
                    borderRadius: 8,
                    marginBottom: 10,
                  }}
                />
                <input
                  ref={profileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => handlePhotoUpload('profilePhoto', e)}
                />
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-primary btn-xs"
                    onClick={() => profileInputRef.current?.click()}
                  >
                    <Upload size={12} /> Upload
                  </button>
                  {photos.profilePhoto && (
                    <button
                      className="btn btn-outline btn-xs"
                      onClick={() => setPhotos((p) => ({ ...p, profilePhoto: '' }))}
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>

              {/* Back-View Silhouette */}
              <div className="card" style={{ padding: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 8 }}>
                  Back-View Silhouette (Scenes 2–4)
                </div>
                <img
                  src={photos.silhouettePhoto || '/silhouette-back.jpg'}
                  alt="Back Silhouette"
                  style={{
                    width: '100%',
                    height: 220,
                    objectFit: 'contain',
                    background: '#050508',
                    borderRadius: 8,
                    marginBottom: 10,
                  }}
                />
                <input
                  ref={silhouetteInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => handlePhotoUpload('silhouettePhoto', e)}
                />
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-primary btn-xs"
                    onClick={() => silhouetteInputRef.current?.click()}
                  >
                    <Upload size={12} /> Upload
                  </button>
                  {photos.silhouettePhoto && (
                    <button
                      className="btn btn-outline btn-xs"
                      onClick={() => setPhotos((p) => ({ ...p, silhouettePhoto: '' }))}
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>

              {/* Red & White Editorial Reveal Photo */}
              <div className="card" style={{ padding: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 8 }}>
                  Editorial Reveal Photo (Scene 5)
                </div>
                <img
                  src={photos.editorialPhoto || '/editorial-reveal.jpg'}
                  alt="Editorial Reveal"
                  style={{
                    width: '100%',
                    height: 220,
                    objectFit: 'cover',
                    objectPosition: 'top',
                    background: '#050508',
                    borderRadius: 8,
                    marginBottom: 10,
                  }}
                />
                <input
                  ref={editorialInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => handlePhotoUpload('editorialPhoto', e)}
                />
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-primary btn-xs"
                    onClick={() => editorialInputRef.current?.click()}
                  >
                    <Upload size={12} /> Upload
                  </button>
                  {photos.editorialPhoto && (
                    <button
                      className="btn btn-outline btn-xs"
                      onClick={() => setPhotos((p) => ({ ...p, editorialPhoto: '' }))}
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
