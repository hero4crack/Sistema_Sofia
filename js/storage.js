const SESSIONS_KEY = 'somamap_personal_sessions_v2';
const PROFILE_KEY = 'somamap_personal_profile_v2';

export function getProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveProfile(profile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  return profile;
}

export function getSessions() {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSession(session) {
  const sessions = getSessions();
  const next = [session, ...sessions];
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(next));
  return next;
}

export function deleteSession(id) {
  const sessions = getSessions().filter((s) => s.id !== id);
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  return sessions;
}

export function clearAllSessions() {
  localStorage.removeItem(SESSIONS_KEY);
  return [];
}

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function openVisualReport(sessions, profile) {
  const avgBefore = (
    sessions.reduce((acc, s) => acc + Number(s.stressBefore || 0), 0) / sessions.length
  ).toFixed(1);
  const avgAfter = (
    sessions.reduce((acc, s) => acc + Number(s.stressAfter || 0), 0) / sessions.length
  ).toFixed(1);
  const avgDrop = (Number(avgBefore) - Number(avgAfter)).toFixed(1);

  const sessionRows = sessions
    .map((s, idx) => {
      const zones =
        (s.zones || [])
          .map((z) => `${escapeHtml(z.label)}: ${escapeHtml(z.symptom)} (${z.intensity}/3)`)
          .join(' · ') || 'Sin zonas marcadas';
      const diff = Number(s.stressBefore) - Number(s.stressAfter);
      return `
        <div class="rep-card">
          <div class="rep-card-head">
            <strong>#${sessions.length - idx} · ${escapeHtml(s.trigger)}</strong>
            <span class="rep-badge">Estrés: ${s.stressBefore} → ${s.stressAfter} (-${diff})</span>
          </div>
          <div class="rep-meta">${new Date(s.createdAt).toLocaleString('es-VE')}</div>
          <div class="rep-line"><strong>Somatización:</strong> ${zones}</div>
          ${s.writing?.fase1 ? `<div class="rep-line"><strong>Observación:</strong> ${escapeHtml(s.writing.fase1)}</div>` : ''}
          ${s.writing?.fase2 ? `<div class="rep-line"><strong>Reescritura PNL:</strong> "${escapeHtml(s.writing.fase2)}"</div>` : ''}
          ${s.writing?.fase3 ? `<div class="rep-line"><strong>Acción:</strong> ${escapeHtml(s.writing.fase3)}</div>` : ''}
        </div>
      `;
    })
    .join('');

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <title>Reporte Personal SomaMap</title>
      <style>
        body { font-family: system-ui, -apple-system, sans-serif; color: #0f172a; margin: 28px; line-height: 1.45; }
        .head { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #0d9488; padding-bottom: 12px; margin-bottom: 18px; }
        h1 { margin: 0; font-size: 20px; color: #0f766e; }
        .sub { font-size: 12px; color: #64748b; margin-top: 2px; }
        .kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
        .kpi { background: #f1f5f9; border-radius: 10px; padding: 12px; }
        .kpi-val { font-size: 20px; font-weight: 800; color: #0f766e; }
        .kpi-lbl { font-size: 11px; color: #475569; }
        .rep-card { border: 1px solid #cbd5e1; border-radius: 10px; padding: 12px 14px; margin-bottom: 10px; break-inside: avoid; }
        .rep-card-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
        .rep-badge { background: #d1fae5; color: #065f46; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 999px; }
        .rep-meta { font-size: 11px; color: #64748b; margin: 3px 0 6px; }
        .rep-line { font-size: 12px; margin-top: 4px; }
        .print-btn { background: #0d9488; color: #fff; border: none; padding: 10px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; margin-bottom: 16px; }
        @media print { .print-btn { display: none; } body { margin: 12px; } }
      </style>
    </head>
    <body>
      <button class="print-btn" onclick="window.print()">Guardar como PDF / Imprimir</button>
      <div class="head">
        <div>
          <h1>SomaMap · Reporte Personal de Regulación</h1>
          <div class="sub">Usuario: ${escapeHtml(profile?.name || 'Personal')} ${profile?.age ? `· ${escapeHtml(profile.age)} años` : ''} ${profile?.occupation ? `· ${escapeHtml(profile.occupation)}` : ''}</div>
        </div>
        <div class="sub">Generado: ${new Date().toLocaleDateString('es-VE')}</div>
      </div>
      <div class="kpis">
        <div class="kpi"><div class="kpi-val">${sessions.length}</div><div class="kpi-lbl">Sesiones totales</div></div>
        <div class="kpi"><div class="kpi-val">${avgBefore} → ${avgAfter}</div><div class="kpi-lbl">Estrés promedio</div></div>
        <div class="kpi"><div class="kpi-val">-${avgDrop} pts</div><div class="kpi-lbl">Alivio promedio</div></div>
      </div>
      ${sessionRows}
    </body>
    </html>
  `;

  const win = window.open('', '_blank');
  if (win) {
    win.document.open();
    win.document.write(html);
    win.document.close();
  } else {
    alert('Permite las ventanas emergentes para abrir tu reporte PDF.');
  }
}
