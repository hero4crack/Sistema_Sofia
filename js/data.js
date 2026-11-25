export const PROJECT_INFO = {
  appName: 'SomaMap',
  tagline: 'Mapeo Somatosensorial & Reescritura PNL',
  subtitle: 'Regulación personal del estrés y respuesta somática'
};

// Posiciones 3D (x, y, z) calibradas sobre el avatar anatómico (altura aprox -1.6 a +1.6)
export const BODY_ZONES = [
  {
    id: 'cabeza',
    label: 'Cabeza',
    description: 'Dolor de cabeza, migraña o presión en las sienes',
    symptoms: ['Dolor de cabeza', 'Presión en sienes', 'Mareo / pesadez'],
    pos3d: [0, 1.32, 0.16],
    pos2d: { cx: 100, cy: 34 }
  },
  {
    id: 'cuello',
    label: 'Cuello y Hombros',
    description: 'Rigidez muscular, nudo o carga en trapecios',
    symptoms: ['Tensión muscular', 'Rigidez cervical', 'Hombros cargados'],
    pos3d: [0, 0.96, 0.14],
    pos2d: { cx: 100, cy: 66 }
  },
  {
    id: 'pecho',
    label: 'Pecho y Respiración',
    description: 'Taquicardia, opresión torácica o falta de aire',
    symptoms: ['Palpitaciones', 'Opresión en el pecho', 'Respiración corta'],
    pos3d: [0, 0.56, 0.24],
    pos2d: { cx: 100, cy: 96 }
  },
  {
    id: 'estomago',
    label: 'Estómago',
    description: 'Nudo en el estómago, acidez o náuseas',
    symptoms: ['Nudo estomacal', 'Náuseas', 'Acidez / presión'],
    pos3d: [0, 0.14, 0.22],
    pos2d: { cx: 100, cy: 132 }
  },
  {
    id: 'manos',
    label: 'Manos',
    description: 'Sudoración fría, temblor o manos heladas',
    symptoms: ['Sudoración en palmas', 'Temblor leve', 'Manos frías'],
    pos3d: [-0.62, 0.02, 0.12],
    pos2d: { cx: 36, cy: 146 }
  },
  {
    id: 'piel',
    label: 'Piel y Alergias',
    description: 'Brote alérgico, picazón o enrojecimiento por estrés',
    symptoms: ['Alergia / picazón', 'Enrojecimiento', 'Urticaria leve'],
    pos3d: [0.52, 0.38, 0.14],
    pos2d: { cx: 158, cy: 118 }
  },
  {
    id: 'temperatura',
    label: 'Temperatura / Fiebre',
    description: 'Sensación térmica alterada, febrícula o escalofríos sistémicos',
    symptoms: ['Fiebre / febrícula', 'Bochorno / calor', 'Escalofríos'],
    isSystemic: true,
    pos3d: [0, 1.46, 0.02],
    pos2d: { cx: 100, cy: 16 }
  }
];

export const TRIGGERS = [
  'Sobrecarga laboral o de estudios',
  'Recuerdo de una situación difícil',
  'Preocupación económica o familiar',
  'Evaluación, entrevista o exposición',
  'Incertidumbre o presión por el futuro',
  'Falta de descanso / agotamiento'
];

export const PNL_PROMPTS = [
  {
    id: 'fase1',
    badge: 'Fase 1 · Observación Somática',
    title: '¿Qué activó tu señal de alerta?',
    hint: 'Cierra los ojos 5 segundos, observa la sensación física sin pelear con ella y describe brevemente qué la disparó.',
    placeholder: 'Ej: Pensar en la entrega de mañana me generó presión en el pecho y dolor de cabeza...'
  },
  {
    id: 'fase2',
    badge: 'Fase 2 · Reescritura Neurolingüística (PNL)',
    title: 'Reencuadra el mensaje interno',
    hint: 'Tu amígdala activa una alarma para protegerte, aunque no haya peligro físico real. Reescribe el pensamiento en presente y con control.',
    placeholder: 'Ej: Esta sensación es solo una señal temporal; estoy a salvo y puedo avanzar paso a paso...',
    suggestions: [
      'Esta sensación física es una alerta temporal; estoy a salvo ahora.',
      'No tengo que resolver todo en este instante, puedo ir paso a paso.',
      'Reconozco la tensión en mi cuerpo y elijo respirar para regularla.'
    ]
  },
  {
    id: 'fase3',
    badge: 'Fase 3 · Activación Prefrontal',
    title: 'Una acción concreta para hoy',
    hint: 'Activa tu corteza prefrontal eligiendo un paso pequeño, medible y realista para los próximos 15 minutos.',
    placeholder: 'Ej: Tomar un vaso de agua, ordenar mis 3 prioridades y empezar por la más simple.'
  }
];

export function buildPersonalDemoSessions() {
  const now = Date.now();
  return [
    {
      id: 'demo-p1',
      createdAt: new Date(now - 86400000 * 5).toISOString(),
      trigger: 'Sobrecarga laboral o de estudios',
      stressBefore: 8,
      stressAfter: 4,
      zones: [
        { zoneId: 'cabeza', label: 'Cabeza', intensity: 3, symptom: 'Dolor de cabeza' },
        { zoneId: 'cuello', label: 'Cuello y Hombros', intensity: 2, symptom: 'Tensión muscular' }
      ],
      writing: {
        fase1: 'Acumulé muchas pendientes y sentí presión en la frente y hombros.',
        fase2: 'No tengo que resolver todo en este instante, puedo ir paso a paso.',
        fase3: 'Elegir una sola tarea de 15 minutos y cerrar las demás pestañas.'
      }
    },
    {
      id: 'demo-p2',
      createdAt: new Date(now - 86400000 * 3).toISOString(),
      trigger: 'Evaluación, entrevista o exposición',
      stressBefore: 9,
      stressAfter: 5,
      zones: [
        { zoneId: 'pecho', label: 'Pecho y Respiración', intensity: 3, symptom: 'Palpitaciones' },
        { zoneId: 'manos', label: 'Manos', intensity: 2, symptom: 'Sudoración en palmas' }
      ],
      writing: {
        fase1: 'Antes de hablar frente al grupo sentí el corazón acelerado.',
        fase2: 'Esta sensación física es una alerta temporal; estoy a salvo ahora.',
        fase3: 'Hacer 3 ciclos de respiración 4-4-6 y revisar mi primer punto.'
      }
    },
    {
      id: 'demo-p3',
      createdAt: new Date(now - 86400000 * 2).toISOString(),
      trigger: 'Recuerdo de una situación difícil',
      stressBefore: 7,
      stressAfter: 3,
      zones: [
        { zoneId: 'estomago', label: 'Estómago', intensity: 3, symptom: 'Nudo estomacal' },
        { zoneId: 'temperatura', label: 'Temperatura / Fiebre', intensity: 2, symptom: 'Bochorno / calor' }
      ],
      writing: {
        fase1: 'Al recordar una discusión pasada sentí calor repentino y nudo en el estómago.',
        fase2: 'Reconozco la tensión en mi cuerpo y elijo respirar para regularla.',
        fase3: 'Tomar agua fría y caminar 5 minutos para cambiar de entorno.'
      }
    },
    {
      id: 'demo-p4',
      createdAt: new Date(now - 3600000 * 14).toISOString(),
      trigger: 'Falta de descanso / agotamiento',
      stressBefore: 6,
      stressAfter: 2,
      zones: [
        { zoneId: 'piel', label: 'Piel y Alergias', intensity: 2, symptom: 'Alergia / picazón' },
        { zoneId: 'cabeza', label: 'Cabeza', intensity: 2, symptom: 'Presión en sienes' }
      ],
      writing: {
        fase1: 'Dormí poco y me empezó picazón leve en los brazos.',
        fase2: 'Mi cuerpo pide pausa; cuidarme también es parte de avanzar.',
        fase3: 'Desconectarme de pantallas 30 minutos antes de dormir hoy.'
      }
    }
  ];
}
