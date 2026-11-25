import { BODY_ZONES } from './data.js';

let threePromise = null;

function loadThree() {
  if (!threePromise) {
    threePromise = import('https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js');
  }
  return threePromise;
}

export class BodyMapController {
  constructor(container, onChange) {
    this.container = container;
    this.onChange = onChange;
    this.selectedZones = [];
    this.hotspots = new Map();
    this.thermalRing = null;
    this.destroyed = false;
    this.animFrame = null;
    this.mount();
  }

  setZones(zones) {
    this.selectedZones = zones;
    this.updateHotspotVisuals();
    this.renderControls();
  }

  toggleZone(zoneId) {
    const exists = this.selectedZones.some((z) => z.zoneId === zoneId);
    let next;
    if (exists) {
      next = this.selectedZones.filter((z) => z.zoneId !== zoneId);
    } else {
      const def = BODY_ZONES.find((z) => z.id === zoneId);
      if (!def) return;
      next = [
        ...this.selectedZones,
        {
          zoneId: def.id,
          label: def.label,
          intensity: 2,
          symptom: def.symptoms[0]
        }
      ];
    }
    this.selectedZones = next;
    this.updateHotspotVisuals();
    this.renderControls();
    this.onChange(next);
  }

  async mount() {
    this.container.innerHTML = `
      <div class="scanner-shell">
        <div class="scanner-stage" id="scannerStage">
          <div class="scanner-hud-top">
            <span class="hud-badge"><span class="hud-dot"></span> ESCÁNER SOMÁTICO 3D</span>
            <button type="button" class="hud-reset" id="btnResetCam">Centrar 360°</button>
          </div>
          <div class="scanner-canvas-host" id="threeHost">
            <div class="scanner-loading">Cargando modelo anatómico 3D...</div>
          </div>
          <div class="scanner-hud-bottom">Arrastra para girar 360° · Toca los puntos de color</div>
        </div>
        <div id="zoneControlsHost" class="bodymap-controls"></div>
      </div>
    `;

    this.renderControls();

    try {
      const THREE = await loadThree();
      if (this.destroyed) return;
      this.initThree(THREE);
    } catch {
      if (this.destroyed) return;
      this.initFallback();
    }
  }

  initThree(THREE) {
    const host = this.container.querySelector('#threeHost');
    if (!host) return;
    host.innerHTML = '';

    const width = host.clientWidth || 320;
    const height = 340;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
    camera.position.set(0, 0.22, 5.15);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    host.appendChild(renderer.domElement);

    // Iluminación de estudio clara y suave
    scene.add(new THREE.HemisphereLight(0xffffff, 0xcbd5e1, 1.35));

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
    keyLight.position.set(3, 5, 4);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x99f6e4, 0.9);
    fillLight.position.set(-4, 2, 3);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xc4b5fd, 0.8);
    rimLight.position.set(0, 3, -4);
    scene.add(rimLight);

    const avatar = new THREE.Group();
    scene.add(avatar);

    // Material satinado sólido (sin transparencia para evitar líneas internas en uniones)
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xe2f3f0,
      emissive: 0x0d9488,
      emissiveIntensity: 0.05,
      roughness: 0.38,
      metalness: 0.04
    });

    // Cabeza y cuello
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 32, 28), bodyMat);
    head.position.set(0, 1.32, 0);
    head.scale.set(0.92, 1.08, 0.96);
    avatar.add(head);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.105, 0.24, 24), bodyMat);
    neck.position.set(0, 1.05, 0);
    avatar.add(neck);

    // Torso orgánico continuo
    const torsoPts = [
      new THREE.Vector2(0.01, -0.05),
      new THREE.Vector2(0.23, 0.0),
      new THREE.Vector2(0.24, 0.14),
      new THREE.Vector2(0.20, 0.34),
      new THREE.Vector2(0.27, 0.62),
      new THREE.Vector2(0.30, 0.80),
      new THREE.Vector2(0.14, 0.92),
      new THREE.Vector2(0.01, 0.94)
    ];
    const torso = new THREE.Mesh(new THREE.LatheGeometry(torsoPts, 32), bodyMat);
    torso.position.set(0, 0.04, 0);
    torso.scale.set(1.04, 1.0, 0.64);
    avatar.add(torso);

    // Brazos en postura natural abierta (A-pose) sin pegarse al cuerpo
    let leftHandAnchor = null;
    let rightForearmAnchor = null;

    const buildArm = (side) => {
      const shoulder = new THREE.Group();
      shoulder.position.set(side * 0.33, 0.85, 0);
      // side = -1 (izquierda) -> rotación negativa abre hacia -X; side = +1 -> positiva abre hacia +X
      shoulder.rotation.z = side * 0.24;

      const shoulderJoint = new THREE.Mesh(new THREE.SphereGeometry(0.095, 24, 24), bodyMat);
      shoulder.add(shoulderJoint);

      const upperArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.078, 0.30, 12, 20), bodyMat);
      upperArm.position.set(0, -0.18, 0);
      shoulder.add(upperArm);

      const elbow = new THREE.Group();
      elbow.position.set(0, -0.36, 0);
      elbow.rotation.x = -0.16;
      elbow.rotation.z = side * -0.06;
      shoulder.add(elbow);

      const elbowJoint = new THREE.Mesh(new THREE.SphereGeometry(0.072, 20, 20), bodyMat);
      elbow.add(elbowJoint);

      const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.066, 0.28, 12, 20), bodyMat);
      forearm.position.set(0, -0.17, 0);
      elbow.add(forearm);

      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.072, 20, 20), bodyMat);
      hand.position.set(0, -0.35, 0);
      hand.scale.set(0.85, 1.15, 0.65);
      elbow.add(hand);

      if (side === -1) leftHandAnchor = hand;
      if (side === 1) rightForearmAnchor = forearm;

      avatar.add(shoulder);
    };

    buildArm(-1);
    buildArm(1);

    // Piernas suaves y continuas
    const buildLeg = (side) => {
      const hip = new THREE.Group();
      hip.position.set(side * 0.145, 0.04, 0);

      const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.105, 0.48, 12, 24), bodyMat);
      thigh.position.set(0, -0.26, 0);
      hip.add(thigh);

      const calf = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.48, 12, 24), bodyMat);
      calf.position.set(0, -0.80, 0);
      hip.add(calf);

      const foot = new THREE.Mesh(new THREE.SphereGeometry(0.085, 18, 18), bodyMat);
      foot.position.set(0, -1.08, 0.06);
      foot.scale.set(0.85, 0.55, 1.45);
      hip.add(foot);

      avatar.add(hip);
    };

    buildLeg(-1);
    buildLeg(1);

    // Base escáner elegante
    const baseRing = new THREE.Mesh(
      new THREE.RingGeometry(0.68, 0.74, 48),
      new THREE.MeshBasicMaterial({
        color: 0x0d9488,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.35
      })
    );
    baseRing.rotation.x = -Math.PI / 2;
    baseRing.position.y = -1.13;
    avatar.add(baseRing);

    // Anillo térmico para Temperatura / Fiebre
    this.thermalRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.68, 0.014, 12, 64),
      new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0 })
    );
    this.thermalRing.rotation.x = Math.PI / 2;
    this.thermalRing.position.y = 0.5;
    avatar.add(this.thermalRing);

    // Coordenadas exactas sobre este avatar articulado
    const posOverrides = {
      cabeza: [0, 1.33, 0.20],
      cuello: [0, 1.03, 0.11],
      pecho: [0, 0.66, 0.21],
      estomago: [0, 0.26, 0.18],
      temperatura: [0, 1.62, 0]
    };

    const clickableMeshes = [];
    this.hotspots.clear();

    for (const zone of BODY_ZONES) {
      const group = new THREE.Group();

      const coreMat = new THREE.MeshStandardMaterial({
        color: 0x0d9488,
        emissive: 0x0d9488,
        emissiveIntensity: 0.55,
        roughness: 0.2
      });
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.064, 22, 22), coreMat);
      core.userData.zoneId = zone.id;

      const haloMat = new THREE.MeshBasicMaterial({
        color: 0x14b8a6,
        transparent: true,
        opacity: 0.28
      });
      const halo = new THREE.Mesh(new THREE.SphereGeometry(0.108, 22, 22), haloMat);
      halo.userData.zoneId = zone.id;

      group.add(core);
      group.add(halo);

      if (zone.id === 'manos' && leftHandAnchor) {
        group.position.set(0, 0, 0.09);
        leftHandAnchor.add(group);
      } else if (zone.id === 'piel' && rightForearmAnchor) {
        group.position.set(0.06, 0.02, 0.06);
        rightForearmAnchor.add(group);
      } else {
        const pos = posOverrides[zone.id] || zone.pos3d;
        group.position.set(...pos);
        avatar.add(group);
      }

      clickableMeshes.push(core, halo);
      this.hotspots.set(zone.id, { group, core, halo, coreMat, haloMat });
    }

    this.updateHotspotVisuals();

    let isDragging = false;
    let moved = false;
    let startX = 0;
    let startY = 0;
    let targetRotY = 0.22;
    let targetRotX = 0;

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const dom = renderer.domElement;

    const onDown = (e) => {
      isDragging = true;
      moved = false;
      startX = e.clientX;
      startY = e.clientY;
    };

    const onMove = (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true;
      targetRotY += dx * 0.012;
      targetRotX = Math.max(-0.3, Math.min(0.3, targetRotX + dy * 0.006));
      startX = e.clientX;
      startY = e.clientY;
    };

    const onUp = (e) => {
      if (!isDragging) return;
      isDragging = false;
      if (!moved) {
        const rect = dom.getBoundingClientRect();
        pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(clickableMeshes, false);
        if (hits.length > 0 && hits[0].object.userData.zoneId) {
          this.toggleZone(hits[0].object.userData.zoneId);
        }
      }
    };

    dom.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);

    this.container.querySelector('#btnResetCam')?.addEventListener('click', () => {
      targetRotY = 0.22;
      targetRotX = 0;
    });

    const onResize = () => {
      if (this.destroyed || !host.clientWidth) return;
      camera.aspect = host.clientWidth / height;
      camera.updateProjectionMatrix();
      renderer.setSize(host.clientWidth, height);
    };
    window.addEventListener('resize', onResize);

    const clock = new THREE.Clock();
    const animate = () => {
      if (this.destroyed) {
        renderer.dispose();
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('resize', onResize);
        return;
      }
      const t = clock.getElapsedTime();
      avatar.rotation.y += (targetRotY - avatar.rotation.y) * 0.1;
      avatar.rotation.x += (targetRotX - avatar.rotation.x) * 0.1;
      if (!isDragging) targetRotY += 0.0014;

      for (const [zoneId, obj] of this.hotspots.entries()) {
        const active = this.selectedZones.find((z) => z.zoneId === zoneId);
        const pulse = active ? 1.16 + Math.sin(t * 4.5) * 0.18 : 0.94 + Math.sin(t * 2) * 0.06;
        obj.halo.scale.setScalar(pulse);
      }

      if (this.thermalRing && this.thermalRing.material.opacity > 0) {
        this.thermalRing.position.y = Math.sin(t * 2) * 0.85 + 0.2;
      }

      renderer.render(scene, camera);
      this.animFrame = requestAnimationFrame(animate);
    };
    animate();
  }

  updateHotspotVisuals() {
    const activeMap = new Map(this.selectedZones.map((z) => [z.zoneId, z]));

    for (const [zoneId, obj] of this.hotspots.entries()) {
      const active = activeMap.get(zoneId);
      if (!active) {
        obj.coreMat.color.setHex(0x0d9488);
        obj.coreMat.emissive.setHex(0x0d9488);
        obj.coreMat.emissiveIntensity = 0.4;
        obj.haloMat.color.setHex(0x14b8a6);
        obj.haloMat.opacity = 0.22;
        obj.core.scale.setScalar(1);
      } else {
        const hex =
          active.intensity === 3 ? 0xe11d48 : active.intensity === 2 ? 0xf59e0b : 0x059669;
        obj.coreMat.color.setHex(hex);
        obj.coreMat.emissive.setHex(hex);
        obj.coreMat.emissiveIntensity = 0.9;
        obj.haloMat.color.setHex(hex);
        obj.haloMat.opacity = 0.42;
        obj.core.scale.setScalar(1.3);
      }
    }

    if (this.thermalRing) {
      this.thermalRing.material.opacity = activeMap.has('temperatura') ? 0.65 : 0;
    }
  }

  initFallback() {
    const host = this.container.querySelector('#threeHost');
    if (host) {
      host.innerHTML = `<p class="muted small-note" style="padding:16px;">Usa los botones de abajo para seleccionar tus zonas somáticas.</p>`;
    }
  }

  renderControls() {
    const host = this.container.querySelector('#zoneControlsHost');
    if (!host) return;

    const mapById = new Map(this.selectedZones.map((z) => [z.zoneId, z]));

    const quickButtons = BODY_ZONES.map((zone) => {
      const active = mapById.has(zone.id);
      return `
        <button type="button" class="chip ${active ? 'chip-active' : ''}" data-action="toggle" data-zone="${zone.id}">
          ${zone.label}
        </button>
      `;
    }).join('');

    const cards =
      this.selectedZones.length === 0
        ? `<p class="muted small-note">Toca un punto en el modelo 3D o elige una zona arriba.</p>`
        : this.selectedZones
            .map((item) => {
              const zone = BODY_ZONES.find((z) => z.id === item.zoneId);
              if (!zone) return '';
              const symptomBtns = zone.symptoms
                .map(
                  (sym) => `
                    <button type="button" class="chip ${item.symptom === sym ? 'chip-active' : ''}" data-action="symptom" data-zone="${zone.id}" data-symptom="${sym}">
                      ${sym}
                    </button>
                  `
                )
                .join('');

              const intBtns = [
                { val: 1, label: 'Leve' },
                { val: 2, label: 'Moderada' },
                { val: 3, label: 'Alta' }
              ]
                .map(
                  (lvl) => `
                    <button type="button" class="chip ${item.intensity === lvl.val ? 'chip-intensity-' + lvl.val : ''}" data-action="intensity" data-zone="${zone.id}" data-intensity="${lvl.val}">
                      ${lvl.label}
                    </button>
                  `
                )
                .join('');

              return `
                <div class="zone-card">
                  <div class="zone-card-header">
                    <strong>${zone.label}</strong>
                    <button type="button" class="btn-link-danger" data-action="remove" data-zone="${zone.id}">Quitar</button>
                  </div>
                  <div class="zone-sublabel">Síntoma principal:</div>
                  <div class="chip-row">${symptomBtns}</div>
                  <div class="zone-sublabel">Intensidad:</div>
                  <div class="chip-row">${intBtns}</div>
                </div>
              `;
            })
            .join('');

    host.innerHTML = `
      <div class="zone-sublabel">Zonas somáticas:</div>
      <div class="chip-row">${quickButtons}</div>
      <div class="selected-zones-list">${cards}</div>
    `;

    host.querySelectorAll('button[data-action]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const { action, zone, symptom, intensity } = btn.dataset;
        if (action === 'toggle' || action === 'remove') {
          this.toggleZone(zone);
        } else if (action === 'symptom') {
          this.selectedZones = this.selectedZones.map((z) =>
            z.zoneId === zone ? { ...z, symptom } : z
          );
          this.renderControls();
          this.onChange(this.selectedZones);
        } else if (action === 'intensity') {
          this.selectedZones = this.selectedZones.map((z) =>
            z.zoneId === zone ? { ...z, intensity: Number(intensity) } : z
          );
          this.updateHotspotVisuals();
          this.renderControls();
          this.onChange(this.selectedZones);
        }
      });
    });
  }

  destroy() {
    this.destroyed = true;
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
  }
}
