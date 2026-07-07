"use client";

/**
 * AiHandModel — the X-ray hand as a holographic 3D model that animates per
 * pipeline step. The X-ray luminance displaces a subdivided plane into a relief
 * of the bones, rendered with a holographic shader (scanlines, flicker, fresnel
 * rim, cyan glow). A projector base casts a light cone with rising motes.
 *
 * Per active step (0-indexed):
 *   0 Segmentation — black background, a laser sweeps and wipes it away.
 *   1 ROI extraction — the hand splits into 3 separated parts + highlight boxes.
 *   2 Bone age — analysis numbers float at the growth-plate joints.
 *   3 Fairness — per-continent map badges with equal error (no bias).
 *   4 Grad-CAM — one focused heat hotspot pulses on the wrist region.
 */

import * as THREE from "three";
import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useTexture, Html } from "@react-three/drei";
import { ContinentMap } from "../ContinentMap";

const IMG_W = 620;
const IMG_H = 710;
const PLANE_W = 4.3;
const PLANE_H = PLANE_W * (IMG_H / IMG_W);

const lerp = THREE.MathUtils.lerp;
const damp = (cur: number, tgt: number, k = 0.1) => lerp(cur, tgt, k);

const ROIS = [
  { l: 0.18, t: 0.06, w: 0.66, h: 0.44, c: "#38BDF8", dir: 1 },
  { l: 0.14, t: 0.5, w: 0.64, h: 0.24, c: "#34D399", dir: 0 },
  { l: 0.28, t: 0.74, w: 0.44, h: 0.22, c: "#FB923C", dir: -1 },
];
const EXPLODE = 0.45;

function roiToPlane(r: { l: number; t: number; w: number; h: number }) {
  return { x: (r.l + r.w / 2 - 0.5) * PLANE_W, y: (0.5 - (r.t + r.h / 2)) * PLANE_H, w: r.w * PLANE_W, h: r.h * PLANE_H };
}
function pt(u: number, v: number): [number, number, number] {
  return [(u - 0.5) * PLANE_W, (0.5 - v) * PLANE_H, 0.6];
}

// ── Displaced holographic hand ──────────────────────────────────────────────
function HandRelief({ step }: { step: number }) {
  const tex = useTexture("/Hand-nobg.png");
  const gl = useThree((s) => s.gl);
  useMemo(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = gl.capabilities.getMaxAnisotropy();
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.needsUpdate = true;
  }, [tex, gl]);

  const matRef = useRef<THREE.ShaderMaterial>(null);
  const lastStep = useRef(-1);
  const t0 = useRef(0);
  const uniforms = useMemo(
    () => ({
      uTex: { value: tex },
      uTexel: { value: new THREE.Vector2(1 / IMG_W, 1 / IMG_H) },
      uDisp: { value: 0.34 },
      uScan: { value: 0 },
      uReveal: { value: 1 },
      uExplode: { value: 0 },
      uHeat: { value: 0 },
      uHotspot: { value: new THREE.Vector2(0.46, 0.36) },
    }),
    [tex]
  );

  useFrame(({ clock }) => {
    if (!matRef.current) return;
    const u = matRef.current.uniforms;
    const t = clock.elapsedTime;
    if (step !== lastStep.current) { lastStep.current = step; t0.current = t; }
    const since = t - t0.current;
    u.uScan.value = (t % 5) / 5;
    u.uReveal.value = step === 0 ? Math.min(since / 2.2, 1) : damp(u.uReveal.value, 1, 0.2);
    u.uExplode.value = damp(u.uExplode.value, step === 1 ? 1 : 0, 0.08);
    u.uHeat.value = damp(u.uHeat.value, step === 4 ? 1 : 0, 0.08);
  });

  return (
    <mesh>
      <planeGeometry args={[PLANE_W, PLANE_H, 200, 230]} />
      <shaderMaterial
        ref={matRef}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        uniforms={uniforms}
        vertexShader={`
          uniform sampler2D uTex;
          uniform float uDisp;
          uniform float uExplode;
          varying vec2 vUv;
          varying float vLum;
          varying float vAlpha;
          void main() {
            vUv = uv;
            vec4 t = texture2D(uTex, uv);
            float lum = dot(t.rgb, vec3(0.299, 0.587, 0.114));
            vLum = lum;
            vAlpha = t.a;
            vec3 p = position;
            p.z += lum * t.a * uDisp;
            float off = 0.0;
            if (uv.y > 0.565) off = 1.0; else if (uv.y < 0.335) off = -1.0;
            p.y += off * uExplode * ${EXPLODE.toFixed(2)};
            gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
          }
        `}
        fragmentShader={`
          uniform sampler2D uTex;
          uniform vec2 uTexel;
          uniform float uScan;
          uniform float uReveal;
          uniform float uExplode;
          uniform float uHeat;
          uniform vec2 uHotspot;
          varying vec2 vUv;
          varying float vLum;
          varying float vAlpha;
          void main() {
            float l = vLum;
            float aBone = vAlpha * smoothstep(0.04, 0.26, l);   // respect the PNG transparent cutout
            float lx = dot(texture2D(uTex, vUv + vec2(uTexel.x, 0.0)).rgb, vec3(0.299,0.587,0.114));
            float ly = dot(texture2D(uTex, vUv + vec2(0.0, uTexel.y)).rgb, vec3(0.299,0.587,0.114));
            vec3 n = normalize(vec3(-(lx - l) * 7.0, -(ly - l) * 7.0, 1.0));
            float diff = clamp(dot(n, normalize(vec3(0.4, 0.55, 0.85))), 0.0, 1.0);
            // colour matched to the hero X-ray: sky-blue → white
            vec3 deep = vec3(0.16, 0.52, 0.74), mid = vec3(0.50, 0.82, 0.97), hi = vec3(0.96, 0.99, 1.0);
            vec3 col = mix(deep, mid, smoothstep(0.0, 0.5, l));
            col = mix(col, hi, smoothstep(0.5, 1.0, l));
            col *= (0.72 + 0.36 * diff);

            // alpha is ALWAYS just the hand cutout — never a background panel
            float a = aBone;
            // step 0: a bright laser sweeps across the hand only (no background)
            float laserY = 1.0 - uReveal;
            float laser = smoothstep(0.016, 0.0, abs(vUv.y - laserY)) * (1.0 - step(0.999, uReveal));
            col += vec3(0.6, 1.0, 1.0) * laser * aBone;

            // ── regular scanner (only when fully revealed) ──
            float band = smoothstep(0.05, 0.0, abs(vUv.y - uScan)) * smoothstep(0.95, 1.0, uReveal);
            col += vec3(0.45, 0.9, 1.0) * band * aBone;

            // ── step 1: hide stretched seams ──
            if (uExplode > 0.01) {
              float seam = max(smoothstep(0.014, 0.0, abs(vUv.y - 0.565)), smoothstep(0.014, 0.0, abs(vUv.y - 0.335)));
              a *= (1.0 - seam * uExplode);
            }

            // ── step 4: focused Grad-CAM hotspot ──
            float hd = distance(vUv, uHotspot);
            float hot = exp(-hd * hd * 70.0) * uHeat;
            col = mix(col, vec3(1.0, 0.30, 0.06) * 1.6, clamp(hot, 0.0, 1.0) * aBone);

            float d = distance(vUv, vec2(0.5));
            a *= smoothstep(0.8, 0.42, d) * 0.55 + 0.45;
            gl_FragColor = vec4(col, a);
          }
        `}
      />
    </mesh>
  );
}

// ── ROI highlight boxes that move apart with the parts (step 1) ─────────────
function RoiBoxes({ step }: { step: number }) {
  const grp = useRef<THREE.Group>(null);
  const amt = useRef(0);
  const baseY = useMemo(() => ROIS.map((r) => roiToPlane(r).y), []);
  useFrame(() => {
    if (!grp.current) return;
    amt.current = damp(amt.current, step === 1 ? 1 : 0, 0.08);
    grp.current.children.forEach((child, i) => {
      child.position.y = baseY[i] + ROIS[i].dir * EXPLODE * amt.current;
      child.traverse((o) => {
        const m = (o as THREE.Mesh).material as (THREE.Material & { opacity?: number }) | undefined;
        if (m && "opacity" in m) m.opacity = ((o as THREE.Mesh).userData.max ?? 0) * amt.current;
      });
    });
  });
  return (
    <group ref={grp} position={[0, 0, 0.85]}>
      {ROIS.map((r, i) => {
        const p = roiToPlane(r);
        return (
          <group key={i} position={[p.x, p.y, 0]}>
            <lineSegments userData={{ max: 1 }}>
              <edgesGeometry args={[new THREE.PlaneGeometry(p.w, p.h)]} />
              <lineBasicMaterial color={r.c} transparent opacity={0} toneMapped={false} />
            </lineSegments>
            <mesh userData={{ max: 0.14 }}>
              <planeGeometry args={[p.w, p.h]} />
              <meshBasicMaterial color={r.c} transparent opacity={0} toneMapped={false} side={THREE.DoubleSide} depthWrite={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// ── Step-2 neural net node layout (shared by NeuralNet + the HUD labels) ────
const NN_INPUTS: [number, number, number][] = [
  pt(0.30, 0.30), pt(0.50, 0.24), pt(0.66, 0.31), pt(0.34, 0.47), pt(0.46, 0.60),
];
const NN_SCORES = ["0.88", "0.93", "0.85", "0.79", "0.81"];
const NN_HUB: [number, number, number] = pt(0.5, 0.46);
const NN_OUT: [number, number, number] = [2.15, 0.15, 0.6];

// ── Sci-fi neural network overlay (step 2): nodes at the joints feed a hub,
//    the hub feeds the output, with data pulses travelling the edges ─────────
function NeuralNet() {
  const inputs = useMemo(() => NN_INPUTS.map((p) => new THREE.Vector3(...p)), []);
  const hub = useMemo(() => new THREE.Vector3(...NN_HUB), []);
  const out = useMemo(() => new THREE.Vector3(...NN_OUT), []);
  const edges = useMemo(() => {
    const e: [THREE.Vector3, THREE.Vector3][] = inputs.map((p) => [p, hub] as [THREE.Vector3, THREE.Vector3]);
    e.push([hub, out]);
    return e;
  }, [inputs, hub, out]);
  const nodes = useMemo(() => [...inputs, hub, out], [inputs, hub, out]);
  const lineGeo = useMemo(() => {
    const arr: number[] = [];
    edges.forEach(([a, b]) => arr.push(a.x, a.y, a.z, b.x, b.y, b.z));
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
    return g;
  }, [edges]);
  const ringRef = useRef<THREE.Mesh>(null);
  const nodeRefs = useRef<THREE.Mesh[]>([]);
  const pulseRefs = useRef<THREE.Mesh[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    nodeRefs.current.forEach((m, i) => { if (m) m.scale.setScalar(1 + 0.35 * Math.sin(t * 3 + i * 0.7)); });
    edges.forEach((edge, i) => {
      const m = pulseRefs.current[i];
      if (!m) return;
      const ph = (t * 0.7 + i * 0.15) % 1;
      m.position.lerpVectors(edge[0], edge[1], ph);
      (m.material as THREE.MeshBasicMaterial).opacity = Math.sin(ph * Math.PI);
    });
    if (ringRef.current) ringRef.current.rotation.z = t * 0.8;
  });
  return (
    <group>
      <lineSegments geometry={lineGeo}>
        <lineBasicMaterial color="#38BDF8" transparent opacity={0.4} toneMapped={false} />
      </lineSegments>
      {nodes.map((p, i) => (
        <mesh key={i} position={p} ref={(el) => { if (el) nodeRefs.current[i] = el as THREE.Mesh; }}>
          <sphereGeometry args={[i >= inputs.length ? 0.1 : 0.06, 16, 16]} />
          <meshBasicMaterial color={i === nodes.length - 1 ? "#FB8E5E" : "#67E8F9"} transparent opacity={0.95} toneMapped={false} />
        </mesh>
      ))}
      {edges.map((_, i) => (
        <mesh key={`pl${i}`} ref={(el) => { if (el) pulseRefs.current[i] = el as THREE.Mesh; }}>
          <sphereGeometry args={[0.05, 10, 10]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0} toneMapped={false} />
        </mesh>
      ))}
      {/* rotating targeting reticle on the hub */}
      <mesh ref={ringRef} position={hub}>
        <ringGeometry args={[0.18, 0.21, 40, 1, 0, Math.PI * 1.5]} />
        <meshBasicMaterial color="#67E8F9" transparent opacity={0.7} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
    </group>
  );
}


// Sci-fi corner brackets for HUD panels.
function HudCorners({ c = "rgba(103,232,249,0.9)" }: { c?: string }) {
  const base: React.CSSProperties = { position: "absolute", width: 5, height: 5, borderStyle: "solid", borderColor: c };
  return (
    <>
      <span style={{ ...base, top: -1, left: -1, borderWidth: "1px 0 0 1px" }} />
      <span style={{ ...base, top: -1, right: -1, borderWidth: "1px 1px 0 0" }} />
      <span style={{ ...base, bottom: -1, left: -1, borderWidth: "0 0 1px 1px" }} />
      <span style={{ ...base, bottom: -1, right: -1, borderWidth: "0 1px 1px 0" }} />
    </>
  );
}

// ── HTML overlays: analysis numbers (step 2) + continent maps (step 3) ──────
function Overlays({ step, th }: { step: number; th: boolean }) {
  // Continent silhouette per region — pushed wide to use the horizontal space.
  // Colours match the per-ethnicity bars in the chart below.
  const regions: { p: [number, number, number]; k: string; v: string; c: string; th: string; en: string }[] = [
    { p: [-2.55, 1.55, 0.6], k: "asia", v: "6.5", c: "#38BDF8", th: "เอเชีย", en: "Asia" },
    { p: [2.55, 1.55, 0.6], k: "europe", v: "6.6", c: "#34D399", th: "ยุโรป", en: "Europe" },
    { p: [-2.55, -1.45, 0.6], k: "africa", v: "6.4", c: "#FB923C", th: "แอฟริกา", en: "Africa" },
    { p: [2.55, -1.45, 0.6], k: "samerica", v: "6.5", c: "#A78BFA", th: "อเมริกาใต้", en: "S. America" },
  ];
  return (
    <>
      {step === 2 && (
        <>
          {NN_INPUTS.map((p, i) => (
            <Html key={`n${i}`} position={p} center distanceFactor={8.5} zIndexRange={[20, 0]}>
              <div style={{ position: "relative", pointerEvents: "none", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5,
                fontFamily: "'JetBrains Mono', ui-monospace, monospace", padding: "2px 8px 2px 6px",
                background: "rgba(2,11,22,0.94)", border: "1px solid rgba(103,232,249,0.55)", boxShadow: "0 0 12px rgba(56,189,248,0.5)" }}>
                <HudCorners />
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#67E8F9", boxShadow: "0 0 6px #67E8F9" }} />
                <span style={{ fontSize: 7, color: "rgba(125,211,252,0.7)", letterSpacing: "0.14em", fontWeight: 700 }}>R{i + 1}</span>
                <span style={{ fontSize: 11, fontWeight: 800, color: "#eafdff", textShadow: "0 0 6px rgba(56,189,248,0.9)" }}>{NN_SCORES[i]}</span>
              </div>
            </Html>
          ))}
          <Html position={NN_OUT} center distanceFactor={7.5} zIndexRange={[20, 0]}>
            <div style={{ position: "relative", pointerEvents: "none", whiteSpace: "nowrap", textAlign: "left",
              fontFamily: "'JetBrains Mono', ui-monospace, monospace", padding: "6px 11px 7px",
              background: "linear-gradient(180deg, rgba(3,15,30,0.96), rgba(2,10,20,0.94))",
              border: "1px solid rgba(103,232,249,0.6)", boxShadow: "0 0 18px rgba(56,189,248,0.5), inset 0 0 12px rgba(56,189,248,0.1)" }}>
              <HudCorners />
              <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.5,
                background: "repeating-linear-gradient(0deg, rgba(103,232,249,0.07) 0 1px, transparent 1px 3px)" }} />
              <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#34D399", boxShadow: "0 0 6px #34D399" }} />
                <span style={{ fontSize: 7, letterSpacing: "0.2em", color: "rgba(125,211,252,0.85)", fontWeight: 700 }}>BONE&nbsp;AGE · CONVNEXT</span>
              </div>
              <div style={{ position: "relative", display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ fontSize: 21, fontWeight: 800, color: "#fff", lineHeight: 1, textShadow: "0 0 9px rgba(56,189,248,0.9)" }}>100</span>
                <span style={{ fontSize: 9, color: "#7dd3fc", fontWeight: 700 }}>mo</span>
                <span style={{ fontSize: 9, color: "rgba(148,163,184,0.85)" }}>· 8y 4m</span>
              </div>
              <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 5, marginTop: 5 }}>
                <span style={{ fontSize: 7, color: "rgba(148,163,184,0.85)", letterSpacing: "0.1em" }}>CONF</span>
                <div style={{ width: 56, height: 3, background: "rgba(56,189,248,0.18)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ width: "96%", height: "100%", background: "linear-gradient(90deg,#22D3EE,#34D399)", boxShadow: "0 0 6px #34D399" }} />
                </div>
                <span style={{ fontSize: 8.5, fontWeight: 800, color: "#6ee7b7" }}>96%</span>
              </div>
            </div>
          </Html>
        </>
      )}
      {step === 3 && regions.map((g, i) => (
        <Html key={`g${i}`} position={g.p} center distanceFactor={8.5} zIndexRange={[20, 0]}>
          <div style={{ pointerEvents: "none", whiteSpace: "nowrap", textAlign: "center",
            background: "rgba(6,18,32,0.86)", border: `1px solid ${g.c}80`, borderRadius: 11, padding: "5px 8px 4px",
            boxShadow: `0 0 16px ${g.c}55` }}>
            <ContinentMap k={g.k} c={g.c} />
            <div style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", fontSize: 11, color: "#fff", fontWeight: 700, marginTop: 2, letterSpacing: "0.01em" }}>{th ? g.th : g.en}</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginTop: 2 }}>
              <span style={{ fontFamily: "monospace", fontSize: 10, color: g.c, fontWeight: 700 }}>{g.v} mo</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 2, fontSize: 8, fontWeight: 800, color: "#6ee7b7",
                background: "rgba(52,211,153,0.16)", border: "1px solid rgba(52,211,153,0.45)", borderRadius: 999, padding: "1px 5px" }}>
                ✓ {th ? "เท่าเทียม" : "fair"}
              </span>
            </div>
          </div>
        </Html>
      ))}
    </>
  );
}

// ── Rig ─────────────────────────────────────────────────────────────────────
function Rig({ step, interactive, th }: { step: number; interactive: boolean; th: boolean }) {
  const grp = useRef<THREE.Group>(null);
  const { pointer } = useThree();
  useFrame(({ clock }) => {
    if (!grp.current) return;
    const t = clock.elapsedTime;
    // Face perfectly front (no tilt) until interactive; then follow the pointer.
    const ty = interactive ? pointer.x * 0.35 : 0;
    const tx = interactive ? pointer.y * 0.14 : 0;
    grp.current.rotation.y = damp(grp.current.rotation.y, ty, 0.06);
    grp.current.rotation.x = damp(grp.current.rotation.x, tx, 0.06);
    grp.current.position.y = interactive ? Math.sin(t * 0.6) * 0.03 : 0;
  });
  return (
    <group ref={grp}>
      <HandRelief step={step} />
      <RoiBoxes step={step} />
      {step === 2 && <NeuralNet />}
      <Overlays step={step} th={th} />
    </group>
  );
}

export default function AiHandModel({ step = 0, interactive = true, th = false, fov = 50 }: { step?: number; interactive?: boolean; th?: boolean; fov?: number }) {
  // Pause the render loop while off-screen (same pattern as 3d/BotModel) —
  // the landing page mounts two of these canvases at once.
  const hostRef = useRef<HTMLDivElement>(null);
  const [frameloop, setFrameloop] = useState<"always" | "never">("always");
  useEffect(() => {
    const el = hostRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([e]) => setFrameloop(e.isIntersecting ? "always" : "never"),
      { rootMargin: "120px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={hostRef} style={{ width: "100%", height: "100%" }}>
      <Canvas
        camera={{ position: [0, 0, 10], fov }}
        dpr={[1, 1.5]}
        frameloop={frameloop}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <Rig step={step} interactive={interactive} th={th} />
        </Suspense>
      </Canvas>
    </div>
  );
}
