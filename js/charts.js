export function renderBeforeAfterChart(container, sessions) {
  if (!sessions.length) {
    container.innerHTML = '<p class="muted small-note">Aún no hay sesiones para graficar.</p>';
    return;
  }

  const avgBefore =
    sessions.reduce((acc, s) => acc + Number(s.stressBefore || 0), 0) / sessions.length;
  const avgAfter =
    sessions.reduce((acc, s) => acc + Number(s.stressAfter || 0), 0) / sessions.length;

  const beforePct = Math.min(100, (avgBefore / 10) * 100);
  const afterPct = Math.min(100, (avgAfter / 10) * 100);
  const reductionPct = avgBefore > 0 ? Math.round(((avgBefore - avgAfter) / avgBefore) * 100) : 0;

  // Gráfica SVG de evolución por sesión (últimas 8, orden cronológico)
  const recent = [...sessions].slice(0, 8).reverse();
  let trendSvg = '';
  if (recent.length >= 2) {
    const w = 320;
    const h = 110;
    const padX = 18;
    const padY = 14;
    const plotW = w - padX * 2;
    const plotH = h - padY * 2;

    const toX = (i) => padX + (i / (recent.length - 1)) * plotW;
    const toY = (val) => padY + plotH - ((Number(val) - 1) / 9) * plotH;

    const ptsBefore = recent.map((s, i) => `${toX(i).toFixed(1)},${toY(s.stressBefore).toFixed(1)}`).join(' ');
    const ptsAfter = recent.map((s, i) => `${toX(i).toFixed(1)},${toY(s.stressAfter).toFixed(1)}`).join(' ');

    const dotsBefore = recent
      .map((s, i) => `<circle cx="${toX(i)}" cy="${toY(s.stressBefore)}" r="3.5" fill="#e11d48" />`)
      .join('');
    const dotsAfter = recent
      .map((s, i) => `<circle cx="${toX(i)}" cy="${toY(s.stressAfter)}" r="3.5" fill="#059669" />`)
      .join('');

    trendSvg = `
      <div style="margin-top:14px; padding-top:12px; border-top:1px solid #e2e8f0;">
        <div class="chart-head" style="margin-bottom:6px;">
          <span class="muted">Evolución en tus últimas ${recent.length} sesiones</span>
          <span class="muted" style="font-size:0.75rem;">
            <span style="color:#e11d48;">● Antes</span> &nbsp;
            <span style="color:#059669;">● Después</span>
          </span>
        </div>
        <svg viewBox="0 0 ${w} ${h}" class="trend-svg" aria-label="Evolución de estrés">
          <line x1="${padX}" y1="${toY(5)}" x2="${w - padX}" y2="${toY(5)}" stroke="#cbd5e1" stroke-dasharray="4 4" stroke-width="1" />
          <polyline fill="none" stroke="#e11d48" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="${ptsBefore}" />
          <polyline fill="none" stroke="#059669" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="${ptsAfter}" />
          ${dotsBefore}
          ${dotsAfter}
        </svg>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="chart-card">
      <div class="chart-head">
        <span>Promedio de estrés (escala 1–10)</span>
        <strong class="badge-success">-${reductionPct}% de reducción</strong>
      </div>
      <div class="bar-compare">
        <div class="bar-row">
          <div class="bar-label">Antes del Kit</div>
          <div class="bar-track">
            <div class="bar-fill bar-before" style="width: ${beforePct}%"></div>
          </div>
          <div class="bar-value">${avgBefore.toFixed(1)}</div>
        </div>
        <div class="bar-row">
          <div class="bar-label">Después del Kit</div>
          <div class="bar-track">
            <div class="bar-fill bar-after" style="width: ${afterPct}%"></div>
          </div>
          <div class="bar-value">${avgAfter.toFixed(1)}</div>
        </div>
      </div>
      ${trendSvg}
    </div>
  `;
}

export function renderSymptomRanking(container, sessions) {
  if (!sessions.length) {
    container.innerHTML = '<p class="muted small-note">Sin síntomas registrados todavía.</p>';
    return;
  }

  const counts = new Map();
  for (const s of sessions) {
    for (const z of s.zones || []) {
      counts.set(z.label, (counts.get(z.label) || 0) + 1);
    }
  }

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  if (!sorted.length) {
    container.innerHTML = '<p class="muted small-note">Sin zonas somáticas marcadas.</p>';
    return;
  }

  const maxVal = sorted[0][1];
  const rows = sorted
    .map(([label, count]) => {
      const pct = Math.round((count / maxVal) * 100);
      return `
        <div class="bar-row">
          <div class="bar-label">${label}</div>
          <div class="bar-track">
            <div class="bar-fill bar-zone" style="width: ${pct}%"></div>
          </div>
          <div class="bar-value">${count}</div>
        </div>
      `;
    })
    .join('');

  container.innerHTML = `<div class="chart-card"><div class="bar-compare">${rows}</div></div>`;
}
