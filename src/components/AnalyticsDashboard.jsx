import React from 'react';
import {
  BarChart3,
  CheckCircle2,
  Briefcase,
  TrendingUp,
  Clock,
  Award,
  Send,
  AlertTriangle,
} from 'lucide-react';

export default function AnalyticsDashboard({ vacancies, tailoredMap, applicationLogs }) {
  const totalAnalyzed = vacancies.length;
  const appliedList = vacancies.filter((v) => ['Applied', 'Interview', 'Offer'].includes(v.status));
  const appliedCount = appliedList.length;
  const interviewCount = vacancies.filter((v) => v.status === 'Interview').length;
  const offerCount = vacancies.filter((v) => v.status === 'Offer').length;
  const tailoredCount = Object.keys(tailoredMap).length;
  const walkInCount = vacancies.filter((v) => v.interviewType === 'walk-in').length;
  const onlineCount = vacancies.filter((v) => v.interviewType !== 'walk-in').length;

  const avgMatch = totalAnalyzed
    ? Math.round(vacancies.reduce((acc, v) => acc + (v.matchScore || 0), 0) / totalAnalyzed)
    : 0;

  const lpaValues = vacancies.map((v) => v.lpaNumericMax || v.lpaNumericMin || 0).filter((n) => n > 0);
  const maxLpa = lpaValues.length ? Math.max(...lpaValues) : 0;
  const avgLpa = lpaValues.length
    ? (lpaValues.reduce((a, b) => a + b, 0) / lpaValues.length).toFixed(1)
    : '0.0';

  const appliedLpaValues = appliedList
    .map((v) => v.lpaNumericMax || v.lpaNumericMin || 0)
    .filter((n) => n > 0);
  const avgAppliedLpa = appliedLpaValues.length
    ? (appliedLpaValues.reduce((a, b) => a + b, 0) / appliedLpaValues.length).toFixed(1)
    : '0.0';

  const funnelStages = [
    { label: 'Analyzed Vacancies', count: totalAnalyzed, color: '#64748b' },
    { label: 'CV Tailored', count: tailoredCount, color: '#7c3aed' },
    { label: 'Companies Applied', count: appliedCount, color: '#2563eb' },
    { label: 'Interviews', count: interviewCount, color: '#d97706' },
    { label: 'Offers', count: offerCount, color: '#059669' },
  ];
  const maxFunnel = Math.max(1, ...funnelStages.map((s) => s.count));

  // Missing skills frequency across analyzed vacancies
  const gapCounts = {};
  vacancies.forEach((v) => {
    (v.missingSkills || []).forEach((s) => {
      const key = s.trim();
      if (key) gapCounts[key] = (gapCounts[key] || 0) + 1;
    });
  });
  const topGaps = Object.entries(gapCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="kpi-grid">
        <div className="kpi-card">
          <div>
            <div className="kpi-label">Companies Applied</div>
            <div className="kpi-value" style={{ color: '#2563eb' }}>{appliedCount}</div>
            <div className="kpi-sub">
              {totalAnalyzed ? `${Math.round((appliedCount / totalAnalyzed) * 100)}% of tracked vacancies` : 'Start applying'}
            </div>
          </div>
          <div className="kpi-icon" style={{ background: '#dbeafe', color: '#1d4ed8' }}>
            <Send size={19} />
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-label">Vacancies Analyzed</div>
            <div className="kpi-value">{totalAnalyzed}</div>
            <div className="kpi-sub">{walkInCount} Walk-In • {onlineCount} Online</div>
          </div>
          <div className="kpi-icon" style={{ background: '#ede9fe', color: '#5b21b6' }}>
            <Briefcase size={19} />
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-label">Package Benchmark</div>
            <div className="kpi-value" style={{ color: '#059669' }}>{avgLpa} LPA</div>
            <div className="kpi-sub">Peak: {maxLpa} LPA • Applied Avg: {avgAppliedLpa} LPA</div>
          </div>
          <div className="kpi-icon" style={{ background: '#d1fae5', color: '#047857' }}>
            <TrendingUp size={19} />
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-label">Interviews & Offers</div>
            <div className="kpi-value" style={{ color: '#d97706' }}>
              {interviewCount} / {offerCount}
            </div>
            <div className="kpi-sub">Avg CV Fit: {avgMatch}% • {tailoredCount} CVs tailored</div>
          </div>
          <div className="kpi-icon" style={{ background: '#fef3c7', color: '#b45309' }}>
            <Award size={19} />
          </div>
        </div>
      </div>

      <div className="grid-2">
        {/* Application Funnel */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <BarChart3 size={17} color="#2563eb" /> Application Conversion Funnel
            </h3>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            {funnelStages.map((stage) => {
              const pct = Math.round((stage.count / maxFunnel) * 100);
              return (
                <div key={stage.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{stage.label}</span>
                    <span style={{ fontWeight: 700 }}>{stage.count}</span>
                  </div>
                  <div style={{ height: 10, borderRadius: 999, background: '#f1f5f9', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${Math.max(stage.count ? 6 : 0, pct)}%`,
                        height: '100%',
                        background: stage.color,
                        borderRadius: 999,
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Skill Gap Radar / Top Missing Skills */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <AlertTriangle size={17} color="#d97706" /> Deep Skill Gap Analysis Across Vacancies
            </h3>
          </div>
          <div className="card-body">
            {topGaps.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {topGaps.map(([skill, count]) => (
                  <div key={skill} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{skill}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="badge badge-amber">Requested in {count} job{count > 1 ? 's' : ''}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-soft)' }}>
                Analyze vacancies to surface the highest-ROI skills requested by hiring companies that aren&apos;t yet prominent on your CV.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Applied Companies Log */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <CheckCircle2 size={17} color="#059669" /> Applied Companies Tracker ({appliedCount})
          </h3>
          <span style={{ fontSize: 12, color: 'var(--text-soft)' }}>
            Tracks every company you applied to via direct HR send or status update
          </span>
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Role</th>
                <th>Package (LPA)</th>
                <th>Drive Mode</th>
                <th>HR Contact</th>
                <th>Status</th>
                <th>Activity Log</th>
              </tr>
            </thead>
            <tbody>
              {appliedList.length ? (
                appliedList.map((v) => {
                  const log = [...(applicationLogs || [])].reverse().find((l) => l.vacancyId === v.id);
                  return (
                    <tr key={v.id}>
                      <td style={{ fontWeight: 700 }}>{v.company}</td>
                      <td>{v.role}</td>
                      <td style={{ fontWeight: 600, color: '#065f46' }}>{v.packageLpa}</td>
                      <td>
                        <span className={`badge ${v.interviewType === 'walk-in' ? 'badge-amber' : 'badge-blue'}`}>
                          {v.interviewType === 'walk-in' ? 'Walk-In' : 'Online'}
                        </span>
                      </td>
                      <td className="mono" style={{ fontSize: 12 }}>
                        {v.hrEmail || v.hrName || 'Portal'}
                      </td>
                      <td>
                        <span className="badge badge-green">{v.status}</span>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-soft)' }}>
                        {log ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                            <Clock size={12} /> {log.method} ({new Date(log.timestamp).toLocaleDateString()})
                          </span>
                        ) : (
                          'Marked Applied manually'
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-soft)', padding: 28 }}>
                    No companies marked as Applied yet. Click <strong>Send to HR</strong> on any vacancy or change its Status to Applied!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
