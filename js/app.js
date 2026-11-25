import { PNL_PROMPTS, TRIGGERS } from './data.js';
import {
  clearAllSessions,
  deleteSession,
  getProfile,
  getSessions,
  openVisualReport,
  saveProfile,
  saveSession
} from './storage.js';
import { BodyMapController } from './bodyMap3d.js';
import { renderBeforeAfterChart, renderSymptomRanking } from './charts.js';

const views = {
  home: document.getElementById('view-home'),
  session: document.getElementById('view-session'),
  dashboard: document.getElementById('view-dashboard'),
  guide: document.getElementById('view-guide')
};

const wizardContainer = document.getElementById('wizardContainer');
const wizardStepLabel = document.getElementById('wizardStepLabel');
const wizardStepPct = document.getElementById('wizardStepPct');
const wizardProgressFill = document.getElementById('wizardProgressFill');

let breathTimer = null;
let bodyMapCtrl = null;
let deferredInstallPrompt = null;
let activePnlPhase = 0;

function createEmptyDraft() {
  return {
    step: 1,
    trigger: TRIGGERS[0],
    contextNote: '',
    stressBefore: 7,
    zones: [],
    writing: {
      fase1: '',
      fase2: '',
      fase3: ''
    },
    stressAfter: 4
  };
}

let draft = createEmptyDraft();

function stopBreathTimer() {
  if (breathTimer) {
    clearInterval(breathTimer);
    breathTimer = null;
  }
}

function destroyBodyMap() {
  if (bodyMapCtrl) {
    bodyMapCtrl.destroy();
    bodyMapCtrl = null;
  }
}

function renderProfileHeaderAndPrompts() {
  const profile = getProfile();
  const greetingEl = document.getElementById('headerGreeting');
  const heroTitleEl = document.getElementById('heroTitle');
  const promptCard = document.getElementById('profilePromptCard');

  if (profile?.name) {
    greetingEl.textContent = `Hola, ${profile.name} · Modo Personal`;
    heroTitleEl.textContent = `Hola ${profile.name}, regula tu cuerpo y calma tu mente`;
    promptCard.classList.add('hidden');
  } else {
    greetingEl.textContent = 'Sistema Personal de Regulación';
    heroTitleEl.textContent = 'Regula tu cuerpo, calma tu mente';
    promptCard.classList.remove('hidden');
    promptCard.innerHTML = `
      <h3>Configura tu perfil personal (10 seg)</h3>
      <p class="muted small-note">Se guarda solo en tu teléfono para personalizar tus sesiones.</p>
      <div class="field" style="margin-top:12px;">
        <label for="quickName">Tu nombre</label>
        <input id="quickName" class="input" type="text" placeholder="Ej: Sofía, Héctor..." />
      </div>
      <div class="stats-grid" style="margin-bottom:10px;">
        <div class="field" style="margin:0;">
          <label for="quickAge">Edad</label>
          <input id="quickAge" class="input" type="number" min="10" max="99" placeholder="Ej: 18" />
        </div>
        <div class="field" style="margin:0;">
          <label for="quickOcc">Ocupación</label>
          <input id="quickOcc" class="input" type="text" placeholder="Ej: Estudiante / Diseño" />
        </div>
      </div>
      <button type="button" id="btnSaveQuickProfile" class="btn-primary btn-full">Guardar mi perfil</button>
    `;

    document.getElementById('btnSaveQuickProfile').addEventListener('click', () => {
      const name = document.getElementById('quickName').value.trim();
      if (!name) return;
      saveProfile({
        name,
        age: document.getElementById('quickAge').value.trim(),
        occupation: document.getElementById('quickOcc').value.trim()
      });
      renderProfileHeaderAndPrompts();
      renderProfileFormInGuide();
    });
  }
}

function renderProfileFormInGuide() {
  const host = document.getElementById('profileFormHost');
  if (!host) return;
  const profile = getProfile() || { name: '', age: '', occupation: '' };

  host.innerHTML = `
    <div class="field">
      <label for="profName">Nombre</label>
      <input id="profName" class="input" type="text" value="${profile.name || ''}" placeholder="Tu nombre" />
    </div>
    <div class="stats-grid" style="margin-bottom:12px;">
      <div class="field" style="margin:0;">
        <label for="profAge">Edad</label>
        <input id="profAge" class="input" type="number" min="10" max="99" value="${profile.age || ''}" placeholder="Edad" />
      </div>
      <div class="field" style="margin:0;">
        <label for="profOcc">Ocupación</label>
        <input id="profOcc" class="input" type="text" value="${profile.occupation || ''}" placeholder="Ocupación" />
      </div>
    </div>
    <button type="button" id="btnSaveGuideProfile" class="btn-primary btn-full">Actualizar Perfil</button>
    <p id="profSavedMsg" class="small-note hidden" style="color:#059669;margin-top:8px;">Perfil guardado correctamente.</p>
  `;

  document.getElementById('btnSaveGuideProfile').addEventListener('click', () => {
    saveProfile({
      name: document.getElementById('profName').value.trim(),
      age: document.getElementById('profAge').value.trim(),
      occupation: document.getElementById('profOcc').value.trim()
    });
    renderProfileHeaderAndPrompts();
    document.getElementById('profSavedMsg').classList.remove('hidden');
  });
}

function switchView(target) {
  stopBreathTimer();
  destroyBodyMap();
  Object.entries(views).forEach(([key, el]) => {
    el.classList.toggle('active', key === target);
  });
  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.nav === target);
  });

  if (target === 'home') renderHomeStats();
  if (target === 'session') renderWizard();
  if (target === 'dashboard') renderDashboard();
  if (target === 'guide') renderProfileFormInGuide();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderHomeStats() {
  const sessions = getSessions();
  const el = document.getElementById('homeQuickStats');
  if (!sessions.length) {
    el.innerHTML = `
      <div class="stat-box">
        <div class="stat-value">0</div>
        <div class="stat-label">Sesiones registradas</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">3D</div>
        <div class="stat-label">Escáner somático activo</div>
      </div>
    `;
    return;
  }

  const avgReduction =
    sessions.reduce((acc, s) => acc + (Number(s.stressBefore) - Number(s.stressAfter)), 0) /
    sessions.length;

  el.innerHTML = `
    <div class="stat-box">
      <div class="stat-value">${sessions.length}</div>
      <div class="stat-label">Tus sesiones</div>
    </div>
    <div class="stat-box">
      <div class="stat-value">-${avgReduction.toFixed(1)} pts</div>
      <div class="stat-label">Reducción promedio</div>
    </div>
  `;
}

function buildBreathCharacterSvg() {
  return `
    <svg class="breath-character" viewBox="0 0 140 140" aria-hidden="true">
      <!-- Cojín / base -->
      <ellipse cx="70" cy="126" rx="44" ry="8" fill="#cbd5e1" opacity="0.6" />
      <!-- Piernas cruzadas -->
      <path d="M34 118 C34 104, 52 102, 70 104 C88 102, 106 104, 106 118 C106 124, 88 126, 70 126 C52 126, 34 124, 34 118 Z" fill="#0f766e" />
      <!-- Torso y hombros que suben al inhalar -->
      <g class="char-shoulders">
        <path d="M46 105 L50 68 C51 58, 60 54, 70 54 C80 54, 89 58, 90 68 L94 105 Z" fill="#14b8a6" />
        <!-- Brazos relajados sobre rodillas -->
        <path d="M50 66 C40 76, 38 96, 44 108" fill="none" stroke="#0d9488" stroke-width="8" stroke-linecap="round" />
        <path d="M90 66 C100 76, 102 96, 96 108" fill="none" stroke="#0d9488" stroke-width="8" stroke-linecap="round" />
        <circle cx="44" cy="110" r="5" fill="#fde68a" />
        <circle cx="96" cy="110" r="5" fill="#fde68a" />
      </g>
      <!-- Pecho / corazón que se expande -->
      <circle class="char-chest" cx="70" cy="78" r="13" fill="#99f6e4" opacity="0.85" />
      <!-- Cabeza serena -->
      <circle cx="70" cy="37" r="16" fill="#fde68a" />
      <path d="M54 34 C54 22, 86 22, 86 34 C82 28, 58 28, 54 34 Z" fill="#334155" />
      <!-- Ojos cerrados en calma -->
      <path d="M61 38 Q64 41 67 38" fill="none" stroke="#334155" stroke-width="1.8" stroke-linecap="round" />
      <path d="M73 38 Q76 41 79 38" fill="none" stroke="#334155" stroke-width="1.8" stroke-linecap="round" />
      <path d="M66 45 Q70 48 74 45" fill="none" stroke="#b45309" stroke-width="1.5" stroke-linecap="round" />
      <!-- Ondas de aire -->
      <g class="char-air" opacity="0.45">
        <path d="M26 52 Q36 46 44 52" fill="none" stroke="#0d9488" stroke-width="2" stroke-linecap="round" />
        <path d="M96 52 Q104 46 114 52" fill="none" stroke="#7c3aed" stroke-width="2" stroke-linecap="round" />
      </g>
    </svg>
  `;
}

function renderWizard() {
  stopBreathTimer();
  destroyBodyMap();
  const pct = draft.step * 25;
  wizardStepLabel.textContent = `Paso ${draft.step} de 4`;
  wizardStepPct.textContent = `${pct}%`;
  wizardProgressFill.style.width = `${pct}%`;

  if (draft.step === 1) {
    const triggerOpts = TRIGGERS.map(
      (t) => `<option value="${t}" ${draft.trigger === t ? 'selected' : ''}>${t}</option>`
    ).join('');

    wizardContainer.innerHTML = `
      <div class="glass-card">
        <span class="pill-teal">Paso 1 · Contexto Actual</span>
        <h2 style="margin-top:8px;">¿Qué está generando tensión hoy?</h2>
        <div class="field">
          <label for="inpTrigger">Disparador principal</label>
          <select id="inpTrigger" class="select">${triggerOpts}</select>
        </div>
        <div class="field">
          <label for="inpContextNote">Nota rápida del momento (opcional)</label>
          <input id="inpContextNote" class="input" type="text" placeholder="Ej: Antes de una reunión o al recordar algo..." value="${draft.contextNote}" />
        </div>
        <div class="btn-row">
          <button type="button" id="btnStep1Next" class="btn-primary">Abrir Escáner 3D</button>
        </div>
      </div>
    `;

    document.getElementById('btnStep1Next').addEventListener('click', () => {
      draft.trigger = document.getElementById('inpTrigger').value;
      draft.contextNote = document.getElementById('inpContextNote').value.trim();
      draft.step = 2;
      renderWizard();
    });
    return;
  }

  if (draft.step === 2) {
    wizardContainer.innerHTML = `
      <div class="glass-card">
        <span class="pill-teal">Paso 2 · Mapeo Somatosensorial 3D</span>
        <h2 style="margin-top:8px;">¿Dónde sientes el estrés?</h2>
        <div class="field">
          <label for="rngBefore">Nivel de estrés actual (1 = calma, 10 = máximo)</label>
          <div class="range-wrap">
            <input id="rngBefore" type="range" min="1" max="10" value="${draft.stressBefore}" />
            <span id="valBefore" class="range-badge">${draft.stressBefore}</span>
          </div>
        </div>
        <div id="bodyMapMount"></div>
        <div class="btn-row">
          <button type="button" id="btnStep2Back" class="btn-secondary">Atrás</button>
          <button type="button" id="btnStep2Next" class="btn-primary">Ir al Kit PNL</button>
        </div>
      </div>
    `;

    const rngBefore = document.getElementById('rngBefore');
    const valBefore = document.getElementById('valBefore');
    rngBefore.addEventListener('input', () => {
      draft.stressBefore = Number(rngBefore.value);
      valBefore.textContent = rngBefore.value;
    });

    const mount = document.getElementById('bodyMapMount');
    bodyMapCtrl = new BodyMapController(mount, (updatedZones) => {
      draft.zones = updatedZones;
    });
    bodyMapCtrl.setZones(draft.zones);

    document.getElementById('btnStep2Back').addEventListener('click', () => {
      draft.step = 1;
      renderWizard();
    });
    document.getElementById('btnStep2Next').addEventListener('click', () => {
      activePnlPhase = 0;
      draft.step = 3;
      renderWizard();
    });
    return;
  }

  if (draft.step === 3) {
    const p = PNL_PROMPTS[activePnlPhase];
    const tabsHtml = PNL_PROMPTS.map((item, idx) => {
      const isDone = Boolean(draft.writing[item.id]?.trim());
      return `
        <button type="button" class="phase-tab ${idx === activePnlPhase ? 'active' : ''} ${isDone ? 'done' : ''}" data-phase="${idx}">
          ${isDone ? '✓ ' : ''}Fase ${idx + 1}
        </button>
      `;
    }).join('');

    const suggestionsHtml = p.suggestions
      ? `<div class="chip-row" style="margin-bottom:10px;">
          ${p.suggestions
            .map(
              (sug) =>
                `<button type="button" class="chip" data-fill="${p.id}" data-text="${sug}">+ ${sug}</button>`
            )
            .join('')}
         </div>`
      : '';

    wizardContainer.innerHTML = `
      <div class="glass-card">
        <span class="pill-teal">Paso 3 · Kit Somatolingüístico</span>
        <h2 style="margin-top:8px;">Regulación y Escritura PNL</h2>

        <div id="breathBox" class="breath-box">
          <strong>Guía de Respiración 4-4-6</strong>
          <div class="breath-stage">
            <div class="breath-aura"></div>
            ${buildBreathCharacterSvg()}
          </div>
          <div id="breathInstruction" class="breath-instruction">Sigue a tu guía</div>
          <div id="breathSub" class="breath-sub">42 segundos (3 ciclos completos) para calmar la amígdala</div>
          <button type="button" id="btnBreath" class="btn-secondary">Iniciar respiración (42s)</button>
        </div>

        <div class="phase-tabs">${tabsHtml}</div>

        <div class="phase-panel">
          <span class="pill-teal">${p.badge}</span>
          <h3 style="margin-top:8px;">${p.title}</h3>
          <p class="muted small-note" style="margin-bottom:10px;">${p.hint}</p>
          ${suggestionsHtml}
          <textarea id="txtPhase" class="textarea" placeholder="${p.placeholder}">${draft.writing[p.id] || ''}</textarea>
          <div class="btn-row" style="margin-top:12px;">
            ${activePnlPhase > 0 ? '<button type="button" id="btnPrevPhase" class="btn-secondary">Fase anterior</button>' : ''}
            ${
              activePnlPhase < PNL_PROMPTS.length - 1
                ? '<button type="button" id="btnNextPhase" class="btn-primary">Siguiente fase →</button>'
                : ''
            }
          </div>
        </div>

        <div class="btn-row">
          <button type="button" id="btnStep3Back" class="btn-secondary">Volver al 3D</button>
          <button type="button" id="btnStep3Next" class="btn-primary">Medir resultado</button>
        </div>
      </div>
    `;

    const breathBox = document.getElementById('breathBox');
    const breathInstruction = document.getElementById('breathInstruction');
    const breathSub = document.getElementById('breathSub');
    const btnBreath = document.getElementById('btnBreath');

    btnBreath.addEventListener('click', () => {
      if (breathTimer) {
        stopBreathTimer();
        breathBox.className = 'breath-box';
        breathInstruction.textContent = 'Sigue a tu guía';
        breathSub.textContent = '42 segundos (3 ciclos completos) para calmar la amígdala';
        btnBreath.textContent = 'Iniciar respiración (42s)';
        return;
      }
      let sec = 0;
      const totalSeconds = 42;
      btnBreath.textContent = 'Detener guía';
      const tick = () => {
        if (sec >= totalSeconds) {
          stopBreathTimer();
          breathBox.className = 'breath-box';
          breathInstruction.textContent = '¡3 ciclos completados!';
          breathSub.textContent = 'Tu sistema nervioso ya está listo para escribir';
          btnBreath.textContent = 'Repetir guía (42s)';
          return;
        }
        const cycle = Math.floor(sec / 14) + 1;
        const phase = sec % 14;
        if (phase < 4) {
          breathBox.className = 'breath-box inhale';
          breathInstruction.textContent = `Ciclo ${cycle}/3 · Inhala (${4 - phase}s)`;
          breathSub.textContent = 'Siente cómo se expande tu pecho suavemente';
        } else if (phase < 8) {
          breathBox.className = 'breath-box hold';
          breathInstruction.textContent = `Ciclo ${cycle}/3 · Mantén (${8 - phase}s)`;
          breathSub.textContent = 'Sostén la calma sin tensar los hombros';
        } else {
          breathBox.className = 'breath-box exhale';
          breathInstruction.textContent = `Ciclo ${cycle}/3 · Exhala (${14 - phase}s)`;
          breathSub.textContent = 'Suelta toda la tensión acumulada';
        }
        sec += 1;
      };
      tick();
      breathTimer = setInterval(tick, 1000);
    });

    const saveCurrentPhase = () => {
      draft.writing[p.id] = document.getElementById('txtPhase').value.trim();
    };

    wizardContainer.querySelectorAll('button[data-phase]').forEach((btn) => {
      btn.addEventListener('click', () => {
        saveCurrentPhase();
        activePnlPhase = Number(btn.dataset.phase);
        renderWizard();
      });
    });

    wizardContainer.querySelectorAll('button[data-fill]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const txt = document.getElementById('txtPhase');
        txt.value = btn.dataset.text;
        draft.writing[p.id] = btn.dataset.text;
      });
    });

    document.getElementById('btnPrevPhase')?.addEventListener('click', () => {
      saveCurrentPhase();
      activePnlPhase -= 1;
      renderWizard();
    });

    document.getElementById('btnNextPhase')?.addEventListener('click', () => {
      saveCurrentPhase();
      activePnlPhase += 1;
      renderWizard();
    });

    document.getElementById('btnStep3Back').addEventListener('click', () => {
      saveCurrentPhase();
      draft.step = 2;
      renderWizard();
    });

    document.getElementById('btnStep3Next').addEventListener('click', () => {
      saveCurrentPhase();
      draft.step = 4;
      renderWizard();
    });
    return;
  }

  // Paso 4: Chequeo Post-Intervención
  wizardContainer.innerHTML = `
    <div class="glass-card">
      <span class="pill-teal">Paso 4 · Chequeo Post-Intervención</span>
      <h2 style="margin-top:8px;">¿Cómo está tu nivel ahora?</h2>
      <p class="muted small-note">
        Al iniciar marcaste un nivel de estrés de <strong>${draft.stressBefore}/10</strong>.
        Mide nuevamente después de completar el protocolo.
      </p>
      <div class="field" style="margin-top:16px;">
        <label for="rngAfter">Nivel de estrés actual (1–10)</label>
        <div class="range-wrap">
          <input id="rngAfter" type="range" min="1" max="10" value="${draft.stressAfter}" />
          <span id="valAfter" class="range-badge">${draft.stressAfter}</span>
        </div>
      </div>
      <div class="btn-row">
        <button type="button" id="btnStep4Back" class="btn-secondary">Atrás</button>
        <button type="button" id="btnSaveSession" class="btn-primary">Guardar Sesión</button>
      </div>
    </div>
  `;

  const rngAfter = document.getElementById('rngAfter');
  const valAfter = document.getElementById('valAfter');
  rngAfter.addEventListener('input', () => {
    draft.stressAfter = Number(rngAfter.value);
    valAfter.textContent = rngAfter.value;
  });

  document.getElementById('btnStep4Back').addEventListener('click', () => {
    draft.step = 3;
    renderWizard();
  });

  document.getElementById('btnSaveSession').addEventListener('click', () => {
    const newSession = {
      id: `ses-${Date.now()}`,
      createdAt: new Date().toISOString(),
      trigger: draft.trigger,
      contextNote: draft.contextNote,
      stressBefore: draft.stressBefore,
      stressAfter: draft.stressAfter,
      zones: draft.zones,
      writing: draft.writing
    };
    saveSession(newSession);
    draft = createEmptyDraft();
    switchView('dashboard');
  });
}

function renderDashboard() {
  const sessions = getSessions();
  const dashStats = document.getElementById('dashStats');
  const sessionsList = document.getElementById('sessionsList');

  const avgDiff = sessions.length
    ? (
        sessions.reduce((acc, s) => acc + (Number(s.stressBefore) - Number(s.stressAfter)), 0) /
        sessions.length
      ).toFixed(1)
    : '0.0';

  const bestDrop = sessions.length
    ? Math.max(...sessions.map((s) => Number(s.stressBefore) - Number(s.stressAfter)))
    : 0;

  const zoneCounts = new Map();
  for (const s of sessions) {
    for (const z of s.zones || []) {
      zoneCounts.set(z.label, (zoneCounts.get(z.label) || 0) + 1);
    }
  }
  const topZone = [...zoneCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

  dashStats.innerHTML = `
    <div class="stat-box">
      <div class="stat-value">${sessions.length}</div>
      <div class="stat-label">Sesiones guardadas</div>
    </div>
    <div class="stat-box">
      <div class="stat-value">-${avgDiff} pts</div>
      <div class="stat-label">Reducción promedio</div>
    </div>
    <div class="stat-box">
      <div class="stat-value">-${bestDrop} pts</div>
      <div class="stat-label">Mayor alivio logrado</div>
    </div>
    <div class="stat-box">
      <div class="stat-value" style="font-size:1.05rem;">${topZone}</div>
      <div class="stat-label">Zona más frecuente</div>
    </div>
  `;

  renderBeforeAfterChart(document.getElementById('chartBeforeAfter'), sessions);
  renderSymptomRanking(document.getElementById('chartZones'), sessions);

  if (!sessions.length) {
    sessionsList.innerHTML =
      '<p class="muted small-note">Aún no tienes sesiones registradas. Completa tu primer <strong>Escáner 3D</strong> para ver aquí tu evolución.</p>';
    return;
  }

  sessionsList.innerHTML = sessions
    .map((s) => {
      const zonesText =
        (s.zones || []).map((z) => `${z.label} (${z.symptom})`).join(', ') || 'Sin zonas marcadas';
      const diff = Number(s.stressBefore) - Number(s.stressAfter);
      const diffLabel = diff >= 0 ? `-${diff} pts` : `+${Math.abs(diff)} pts`;
      const quote = s.writing?.fase2
        ? `<div class="session-quote"><strong>Reescritura PNL:</strong> "${s.writing.fase2}"</div>`
        : '';

      return `
        <div class="session-item">
          <div class="session-top">
            <strong>${s.trigger}</strong>
            <span class="badge-success">${s.stressBefore} → ${s.stressAfter} (${diffLabel})</span>
          </div>
          <div class="session-meta">${new Date(s.createdAt).toLocaleString('es-VE')}</div>
          <div class="session-meta"><strong>Somatización:</strong> ${zonesText}</div>
          ${quote}
          <button type="button" class="btn-link-danger" style="margin-top:6px;" data-delete-id="${s.id}">Eliminar</button>
        </div>
      `;
    })
    .join('');

  sessionsList.querySelectorAll('button[data-delete-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      deleteSession(btn.dataset.deleteId);
      renderDashboard();
    });
  });
}

// Eventos globales
document.querySelectorAll('[data-nav]').forEach((el) => {
  el.addEventListener('click', () => switchView(el.dataset.nav));
});

document.getElementById('btnOpenProfile').addEventListener('click', () => {
  switchView('guide');
});

document.getElementById('btnReportPdf').addEventListener('click', () => {
  const sessions = getSessions();
  if (!sessions.length) {
    alert('Completa al menos una sesión para generar tu reporte.');
    return;
  }
  openVisualReport(sessions, getProfile());
});

document.getElementById('btnClearData').addEventListener('click', () => {
  if (confirm('¿Seguro que quieres borrar tu historial local?')) {
    clearAllSessions();
    renderDashboard();
  }
});

// PWA install prompt
const installBtn = document.getElementById('installBtn');
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  installBtn.classList.remove('hidden');
});

installBtn.addEventListener('click', async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  installBtn.classList.add('hidden');
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('./sw.js')
    .then((reg) => reg.update())
    .catch(() => {});
}

renderProfileHeaderAndPrompts();
renderHomeStats();
