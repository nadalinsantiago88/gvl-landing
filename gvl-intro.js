// GVL · intro 3D (1.5 s). Se ejecuta una vez por sesión.
(async () => {
  const KEY = 'gvl-intro-visto';
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let seen = false;
  const dbg = /intro-t=([\d.]+)/.exec(location.hash);
  const freezeT = dbg ? parseFloat(dbg[1]) : null;
  if (freezeT != null) seen = false;
  if (seen || reduce) { root.classList.remove('gvl-intro-on'); return; }

  root.classList.add('gvl-intro-on');
  const prevOverflow = root.style.overflow;
  root.style.overflow = 'hidden';
  window.scrollTo(0, 0);

  const overlay = document.createElement('div');
  overlay.setAttribute('aria-hidden', 'true');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:100001;background:#000;overflow:hidden;touch-action:none';
  overlay.style.setProperty('cursor', 'default', 'important');
  const block = e => e.preventDefault();
  overlay.addEventListener('wheel', block, { passive: false });
  overlay.addEventListener('touchmove', block, { passive: false });
  document.body.appendChild(overlay);

  const skip = document.createElement('button');
  skip.type = 'button';
  skip.textContent = 'Saltar';
  skip.setAttribute('aria-label', 'Saltar intro');
  skip.style.cssText = 'position:absolute;right:20px;bottom:20px;z-index:2;min-height:44px;padding:0 18px;border-radius:999px;border:1px solid rgba(255,255,255,0.32);background:rgba(0,0,0,0.4);color:rgba(255,255,255,0.8);font:300 12px/1 Unbounded,system-ui,sans-serif;letter-spacing:0.18em;text-transform:uppercase;transition:background .2s,color .2s';
  skip.style.setProperty('cursor', 'pointer', 'important');
  skip.onmouseenter = () => { skip.style.background = 'rgba(255,255,255,0.12)'; skip.style.color = '#fff'; };
  skip.onmouseleave = () => { skip.style.background = 'rgba(0,0,0,0.4)'; skip.style.color = 'rgba(255,255,255,0.8)'; };
  overlay.appendChild(skip);

  let finished = false, raf = 0, renderer = null;
  const keyBlock = e => { if ([' ', 'PageDown', 'PageUp', 'ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) e.preventDefault(); };
  window.addEventListener('keydown', keyBlock);
  const finish = () => {
    if (finished) return; finished = true;
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', keyBlock);
    window.removeEventListener('resize', onResize);
    root.style.overflow = prevOverflow;
    root.classList.remove('gvl-intro-on');
    overlay.remove();
    if (renderer) { renderer.dispose(); renderer.forceContextLoss && renderer.forceContextLoss(); }
  };
  skip.onclick = () => {
    if (finished) return;
    overlay.style.transition = 'opacity .3s';
    overlay.style.opacity = '0';
    setTimeout(finish, 300);
  };
  const timeout = setTimeout(() => { if (!renderer) finish(); }, 5000);

  let THREE;
  try { THREE = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js'); }
  catch (e) { finish(); return; }
  if (finished) return;
  clearTimeout(timeout);

  const mob = () => innerWidth < 700;
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: freezeT != null });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mob() ? 1.75 : 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0;
  renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
  overlay.insertBefore(renderer.domElement, skip);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  // Entorno de reflejos: softboxes blancos (sin assets externos)
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = new THREE.Scene();
  const box = (w, h, x, y, z, ry, rx, k) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(k, k, k), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.rotation.set(rx || 0, ry || 0, 0); env.add(m);
  };
  box(3, 8, -6, 2, 1, Math.PI / 2, 0, 3.2);
  box(6, 3, -2, 6, 2, 0, Math.PI / 2, 2.2);
  box(2, 7, 6, 1, -2, -Math.PI / 2, 0, 1.2);
  box(4, 6, 5, 1.5, 6, -Math.PI * 0.8, 0, 2.6);
  box(5, 1.2, 0, -3, 4, 0, -Math.PI / 3, 0.5);
  box(6, 2.5, 0.5, 5, -4, 0, Math.PI / 4, 1.8);
  scene.environment = pmrem.fromScene(env, 0.04).texture;

  const W = 1.0, H = 1.5, D = 0.95, bv = 0.07;
  const speaker = new THREE.Group();
  const body = new THREE.MeshPhysicalMaterial({ color: 0x050505, roughness: 0.16, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.25 });
  const gloss = new THREE.MeshPhysicalMaterial({ color: 0x070707, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.4 });
  const rubber = new THREE.MeshPhysicalMaterial({ color: 0x0b0b0b, roughness: 0.55, envMapIntensity: 0.7 });
  const coneMat = new THREE.MeshPhysicalMaterial({ color: 0x2a2a2a, roughness: 0.62, envMapIntensity: 0.9, side: THREE.DoubleSide });

  const sw = W - 2 * bv, sh = H - 2 * bv, r = 0.05;
  const shape = new THREE.Shape();
  shape.moveTo(-sw / 2 + r, -sh / 2);
  shape.lineTo(sw / 2 - r, -sh / 2); shape.quadraticCurveTo(sw / 2, -sh / 2, sw / 2, -sh / 2 + r);
  shape.lineTo(sw / 2, sh / 2 - r); shape.quadraticCurveTo(sw / 2, sh / 2, sw / 2 - r, sh / 2);
  shape.lineTo(-sw / 2 + r, sh / 2); shape.quadraticCurveTo(-sw / 2, sh / 2, -sw / 2, sh / 2 - r);
  shape.lineTo(-sw / 2, -sh / 2 + r); shape.quadraticCurveTo(-sw / 2, -sh / 2, -sw / 2 + r, -sh / 2);
  const hole = (x, y, rad) => { const p = new THREE.Path(); p.absarc(x, y, rad, 0, Math.PI * 2, true); shape.holes.push(p); };
  const bodyGeo = new THREE.ExtrudeGeometry(shape, { depth: D - 2 * bv, bevelEnabled: true, bevelThickness: bv, bevelSize: bv, bevelSegments: 5, curveSegments: 14 });
  bodyGeo.center();
  speaker.add(new THREE.Mesh(bodyGeo, body));
  const backMat = new THREE.MeshBasicMaterial({ color: 0x000000 });

  const driver = (R, plateIn, prof, domeR, seg, holeR) => {
    const g = new THREE.Group();
    const trim = new THREE.Mesh(new THREE.TorusGeometry(R * 1.02, R * 0.055, 12, seg), gloss); trim.position.z = 0.004; g.add(trim);
    const plate = new THREE.Mesh(new THREE.RingGeometry(plateIn, R * 1.03, seg), gloss); plate.position.z = -0.002; g.add(plate);
    const surround = new THREE.Mesh(new THREE.TorusGeometry(prof[0][0] + R * 0.04, R * 0.07, 10, seg), rubber); surround.position.z = -0.014; g.add(surround);
    const cone = new THREE.Group(); g.add(cone);
    const lathe = new THREE.Mesh(new THREE.LatheGeometry(prof.map(([u, v]) => new THREE.Vector2(u, v)), seg), coneMat); lathe.rotation.x = Math.PI / 2; cone.add(lathe);
    const depth = -prof[prof.length - 1][1];
    const dome = new THREE.Mesh(new THREE.SphereGeometry(domeR, seg, 12, 0, Math.PI * 2, 0, Math.PI / 2), gloss);
    dome.rotation.x = Math.PI / 2; dome.scale.set(1, 0.8, 1); dome.position.z = -depth; cone.add(dome);
    const back = new THREE.Mesh(new THREE.CircleGeometry(prof[0][0] + 0.01, seg), backMat); back.position.z = -depth - 0.006; g.add(back);
    const bezel = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.03, R * 1.08, depth + 0.01, seg, 1, true), gloss); bezel.rotation.x = Math.PI / 2; bezel.position.z = -(depth + 0.01) / 2; g.add(bezel);
    g.userData.depth = depth;
    return { g, cone, dome };
  };
  const woofer = driver(0.38, 0.30, [[0.313, -0.008], [0.285, -0.022], [0.209, -0.05], [0.138, -0.07], [0.095, -0.08]], 0.105, 64, 0.42);
  woofer.g.position.set(0, -0.2, D / 2 + woofer.g.userData.depth * 0.7);
  speaker.add(woofer.g);
  const tweeter = driver(0.13, 0.1, [[0.098, -0.006], [0.082, -0.016], [0.06, -0.028], [0.045, -0.034]], 0.046, 40, 0.19);
  tweeter.g.position.set(0, 0.45, D / 2 + tweeter.g.userData.depth * 0.7);
  speaker.add(tweeter.g);

  const waveMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
  const wave = new THREE.Mesh(new THREE.RingGeometry(0.992, 1, 128), waveMat);
  wave.position.z = 0.02; woofer.g.add(wave);

  speaker.rotation.set(0.26, -0.6, 0);
  scene.add(speaker);

  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(-3, 5, 3); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 1.4); rim.position.set(4, 1.5, -3); scene.add(rim);
  const fill = new THREE.DirectionalLight(0xffffff, 0.9); fill.position.set(-1.5, 2, 5); scene.add(fill);
  scene.add(new THREE.AmbientLight(0xffffff, 0.04));

  const floorY = -1.6;
  const floorMat = new THREE.ShaderMaterial({
    uniforms: { uCell: { value: 0.22 }, uFade: { value: 0 }, uC: { value: new THREE.Vector2() }, uR: { value: new THREE.Vector2(-1, -1) }, uA: { value: new THREE.Vector2() } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `
      uniform float uCell, uFade; uniform vec2 uC, uR, uA; varying vec3 vW;
      float rg(float d, float R, float s){ return exp(-pow((d - R) / s, 2.0)); }
      void main(){
        vec2 p = vW.xz; vec2 o = p - uC; float d = length(o);
        vec2 dir = o / max(d, 1e-4);
        float w = (uA.x * rg(d, uR.x, 0.35) + uA.y * rg(d, uR.y, 0.35)) * smoothstep(3.2, 1.2, d);
        vec2 q = (p + dir * w * 0.07) / uCell;
        vec2 g = abs(fract(q - 0.5) - 0.5) / fwidth(q);
        float line = 1.0 - min(min(g.x, g.y), 1.0);
        float far = smoothstep(17.0, 2.5, length(vW - cameraPosition));
        float halo = 0.2 * exp(-pow(d / 1.7, 2.0));
        float shadow = 1.0 - 0.85 * exp(-pow(length(o * vec2(1.0, 1.25)) / 0.55, 2.0));
        float ring = 0.55 * (uA.x * rg(d, uR.x, 0.025) + uA.y * rg(d, uR.y, 0.025)) * smoothstep(3.2, 1.2, d);
        float c = (line * 0.075 * far + halo) * shadow + ring * far;
        gl_FragColor = vec4(vec3(c) * uFade, 1.0);
      }`,
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.position.y = floorY; scene.add(floor);

  const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.01, 60);
  const look0 = new THREE.Vector3(0, -0.15, 0);
  const cam0 = new THREE.Vector3();
  const frame = () => {
    const a = innerWidth / innerHeight;
    const dist = Math.max(5.6, 4.4 / a);
    cam0.set(0, 0.55 + dist * 0.08, dist);
    camera.aspect = a; camera.updateProjectionMatrix();
    floorMat.uniforms.uCell.value = mob() ? 0.36 : 0.22;
  };
  frame();
  function onResize() { renderer.setSize(innerWidth, innerHeight); frame(); if (typeof frameFront === 'function') frameFront(); }
  window.addEventListener('resize', onResize);

  speaker.updateMatrixWorld(true);
  const domeW = new THREE.Vector3(); woofer.dome.getWorldPosition(domeW);
  const nW = new THREE.Vector3(0, 0, 1).applyQuaternion(speaker.quaternion).normalize();
  const wooferW = new THREE.Vector3(); woofer.g.getWorldPosition(wooferW);
  floorMat.uniforms.uC.value.set(wooferW.x, wooferW.z);
  const fillDist = 0.105 / Math.tan(THREE.MathUtils.degToRad(15)) * 0.46;
  const camEnd = domeW.clone().addScaledVector(nW, fillDist);
  const camThru = domeW.clone().addScaledVector(nW, fillDist * 0.45);
  const lookFront = new THREE.Vector3(0, -0.02, D / 2).applyMatrix4(speaker.matrixWorld);
  const camFront = new THREE.Vector3();
  const up0 = new THREE.Vector3(0, 1, 0), upS = new THREE.Vector3(0, 1, 0).applyQuaternion(speaker.quaternion).normalize(), upT = new THREE.Vector3();
  const frameFront = () => { const a = innerWidth / innerHeight; camFront.copy(lookFront).addScaledVector(nW, Math.max(3.4, 2.3 / a)); };
  frameFront();

  const clamp = v => Math.min(1, Math.max(0, v));
  const easeOut = x => 1 - Math.pow(1 - x, 3);
  const easeIn = x => x * x * x;
  const easeInOut = x => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  const coneK = u => {
    if (u <= 0 || u >= 1) return 1;
    if (u < 0.25) return 1 - 0.08 * easeOut(u / 0.25);
    if (u < 0.6) return 0.92 + 0.12 * easeInOut((u - 0.25) / 0.35);
    return 1.04 - 0.04 * easeOut((u - 0.6) / 0.4);
  };
  const tmpPos = new THREE.Vector3(), tmpLook = new THREE.Vector3();
  camera.position.copy(cam0); camera.lookAt(look0);
  renderer.compile(scene, camera);
  renderer.render(scene, camera);
  root.classList.remove('gvl-intro-on');

  const start = performance.now();
  window.__gvlI = { frames: 0 };
  const tick = () => {
    if (finished) return;
    raf = requestAnimationFrame(tick);
    window.__gvlI.frames++;
    try { step(); } catch (e) { window.__gvlI.err = String(e && e.stack || e); finish(); }
  };
  const step = () => {
    const t = freezeT != null ? freezeT : (performance.now() - start) / 1000;

    const f = easeOut(clamp(t / 0.3));
    renderer.toneMappingExposure = 1.15 * f;
    floorMat.uniforms.uFade.value = f;
    key.intensity = 2.2 * f; rim.intensity = 1.4 * f; fill.intensity = 0.9 * f;

    const b1 = (t - 0.3) / 0.3, b2 = (t - 0.7) / 0.3;
    const k = coneK(b1) * coneK(b2);
    woofer.cone.scale.set(1 + (k - 1) * 0.3, 1 + (k - 1) * 0.3, k);

    const sh = Math.max(0, 1 - Math.abs(b1 - 0.2) * 4) + Math.max(0, 1 - Math.abs(b2 - 0.2) * 4);
    speaker.position.set((Math.random() - 0.5) * 0.009 * sh, (Math.random() - 0.5) * 0.009 * sh, 0);

    const w1 = (t - 0.3) / 0.6, w2 = (t - 0.7) / 0.6;
    const wv = w2 > 0 ? w2 : w1;
    if (wv > 0 && wv < 1) { const s = 0.42 + easeOut(wv) * 0.5; wave.scale.set(s, s, 1); waveMat.opacity = 0.7 * Math.pow(1 - wv, 1.6); }
    else waveMat.opacity = 0;
    floorMat.uniforms.uR.value.set(w1 > 0 ? 0.4 + easeOut(clamp(w1)) * 2.4 : -1, w2 > 0 ? 0.4 + easeOut(clamp(w2)) * 2.4 : -1);
    floorMat.uniforms.uA.value.set(w1 > 0 && w1 < 1 ? 1 - w1 : 0, w2 > 0 && w2 < 1 ? 1 - w2 : 0);

    const fr = easeInOut(clamp((t - 0.3) / 0.42));
    const z = easeIn(clamp((t - 0.75) / 0.45));
    if (z <= 0) { tmpPos.lerpVectors(cam0, camFront, fr); tmpLook.lerpVectors(look0, lookFront, fr); }
    else { tmpPos.lerpVectors(camFront, camEnd, z); tmpLook.lerpVectors(lookFront, domeW, Math.min(1, z * 1.6)); }
    if (t > 1.2) tmpPos.lerpVectors(camEnd, camThru, easeOut(clamp((t - 1.2) / 0.3)));
    upT.lerpVectors(up0, upS, fr).normalize(); camera.up.copy(upT);
    camera.position.copy(tmpPos); camera.lookAt(tmpLook);

    renderer.render(scene, camera);

    if (t >= 1.2) {
      const m = easeInOut(clamp((t - 1.2) / 0.3));
      const R = m * Math.hypot(innerWidth, innerHeight) * 0.52;
      const g = `radial-gradient(circle at 50% 50%, transparent ${R.toFixed(1)}px, #000 ${(R + 1.5).toFixed(1)}px)`;
      overlay.style.webkitMaskImage = g; overlay.style.maskImage = g;
      skip.style.opacity = String(1 - m);
    }
    if (t >= 1.5 && freezeT == null) finish();
  };
  raf = requestAnimationFrame(tick);
})();
