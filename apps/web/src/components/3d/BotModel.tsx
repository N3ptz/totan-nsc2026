/*
 * HippoMascot — optimised 3-D mascot component with GLB animation support
 *
 * Auto-generated base:  npx gltfjsx@6.5.3 public/bot.glb --typescript --transform
 * Compressed asset:     public/bot-transformed.glb  (~1.9 MB, 91% reduction from 20 MB)
 *
 * Performance guarantees
 * ──────────────────────
 * • dpr={[1, 1.5]}         — caps GPU pixel rate; no 4× overdraw on Retina
 * • frameloop="never"      — completely stops rAF when component is off-screen
 * • IntersectionObserver   — toggles frameloop based on viewport visibility
 * • Single global pointer  — one passive window listener shared by all instances
 * • SSR guard (mounted)    — Canvas only renders on the client; no Node.js crash
 * • useGLTF.preload()      — fires the network request at module evaluation time
 *
 * Animation system
 * ────────────────
 * • useAnimations (drei)   — wires the GLB's AnimationMixer to the group ref
 * • idleName               — resolved by regex against common names, falls back to names[0]
 * • actionName             — resolved by regex, falls back to names[1]
 * • onPointerOver/Out      — crossfade idle ↔ action with 0.35s blend
 * • onClick                — re-triggers action from the start
 * • console.log on load    — prints exact clip names so you can hardcode them if needed
 */
"use client";

import * as THREE from "three";
import { useRef, useEffect, useState, useCallback, Suspense, type CSSProperties } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, Bounds, useBounds, useAnimations } from "@react-three/drei";

// ── Types ──────────────────────────────────────────────────────────────────────
type GLTFResult = ReturnType<typeof useGLTF> & {
  nodes: { mesh_0: THREE.Mesh };
  materials: Record<string, THREE.Material>;
  animations: THREE.AnimationClip[];
};

// ── Global pointer singleton ───────────────────────────────────────────────────
// One passive window listener shared across every HippoMascot instance.
// Module-level object is mutated in place — no React state, no re-renders.
const ptr = { x: 0, y: 0 };
if (typeof window !== "undefined") {
  window.addEventListener(
    "pointermove",
    (e: MouseEvent) => {
      ptr.x = (e.clientX / window.innerWidth  - 0.5) * 2;
      ptr.y = (e.clientY / window.innerHeight - 0.5) * -2;
    },
    { passive: true },
  );
}

// ── FitOnLoad ─────────────────────────────────────────────────────────────────
function FitOnLoad() {
  const bounds = useBounds();
  useEffect(() => { bounds.refresh().fit(); }, [bounds]);
  return null;
}

// ── Spring easing for bounce-in ───────────────────────────────────────────────
// Underdamped spring: overshoots ~8% then settles at 1.0
function springScale(t: number): number {
  return 1 - Math.exp(-6 * t) * Math.cos(t * 14);
}

// ── HippoScene — inner R3F component (lives inside Canvas) ────────────────────
function HippoScene() {
  const ref = useRef<THREE.Group>(null!);
  const gltf = useGLTF("/bot-transformed.glb") as GLTFResult;
  const { nodes } = gltf;
  const { actions, names } = useAnimations(gltf.animations, ref);
  const { gl } = useThree();

  // ── GLB clip support (future-proof: works automatically if a rigged GLB is swapped in) ──
  useEffect(() => {
    if (names.length === 0) return;
    console.log("[HippoMascot] animation clips:", names);
    const idle = names.find(n => /idle|breath|rest|stand|float/i.test(n)) ?? names[0];
    if (idle) actions[idle]?.reset().fadeIn(0.5).play();
    return () => { Object.values(actions).forEach(a => a?.stop()); };
  }, [actions, names]);

  const crossfadeTo = useCallback((name: string, duration = 0.35) => {
    const next = actions[name];
    if (!next) return;
    Object.entries(actions).forEach(([n, a]) => { if (n !== name) a?.fadeOut(duration); });
    next.reset().fadeIn(duration).play();
  }, [actions]);

  // ── Procedural gesture state (refs = zero re-renders) ────────────────────
  const hovering  = useRef(false);
  const clockRef  = useRef(0);
  const mountAge  = useRef(0);     // seconds since mount — drives bounce-in
  const jumpAge   = useRef(-1);    // -1 = inactive; ≥0 = seconds into jump
  const wobbleAge = useRef(-1);    // -1 = inactive; ≥0 = seconds into wobble

  // ── Composite useFrame ────────────────────────────────────────────────────
  useFrame((_, delta) => {
    if (!ref.current) return;
    const d = Math.min(delta, 0.1);
    clockRef.current += d;
    mountAge.current += d;
    const c = clockRef.current;

    // 1. Bounce-in — spring scale from 0 → 1 over first 0.75 s
    const mt = Math.min(mountAge.current / 0.75, 1);
    ref.current.scale.setScalar(mt < 1 ? Math.max(0, springScale(mt)) : 1);

    // 2. Idle float — gentle sine on Y
    const floatY = Math.sin(c * 1.1) * 0.07;

    // 3. Idle sway — slow sine on Z rotation
    const sway = Math.sin(c * 0.65) * 0.022;

    // 4. Jump — parabolic Y arc on click (0.55 s)
    let jumpY = 0;
    if (jumpAge.current >= 0) {
      jumpAge.current += d;
      const jt = jumpAge.current;
      if (jt < 0.55) {
        jumpY = Math.sin((jt / 0.55) * Math.PI) * 0.32;
      } else {
        jumpAge.current = -1;
      }
    }

    // 5. Wobble — decaying Z oscillation on hover/click (0.5 s)
    let wobble = 0;
    if (wobbleAge.current >= 0) {
      wobbleAge.current += d;
      const wt = wobbleAge.current;
      if (wt < 0.5) {
        wobble = Math.sin(wt * Math.PI * 8) * 0.11 * (1 - wt / 0.5);
      } else {
        wobbleAge.current = -1;
      }
    }

    // 6. Cursor lean — lerp toward pointer (framerate-independent)
    const lerpT = 1 - Math.pow(0.008, d);
    ref.current.rotation.y = THREE.MathUtils.lerp(ref.current.rotation.y, ptr.x * 0.42, lerpT);
    ref.current.rotation.x = THREE.MathUtils.lerp(ref.current.rotation.x, ptr.y * 0.22, lerpT);

    // Composite Z + Y
    ref.current.rotation.z = sway + wobble;
    ref.current.position.y = floatY + jumpY;
  });

  return (
    <group
      ref={ref}
      dispose={null}
      onPointerOver={() => {
        if (hovering.current) return;
        hovering.current = true;
        gl.domElement.style.cursor = "pointer";
        wobbleAge.current = 0;
        // Also crossfade if GLB clips exist
        const actionName = names.find(n => /wave|jump|dance|hop|bounce|happy|cheer|excited/i.test(n))
          ?? (names.length > 1 ? names[1] : "");
        if (actionName) crossfadeTo(actionName);
      }}
      onPointerOut={() => {
        if (!hovering.current) return;
        hovering.current = false;
        gl.domElement.style.cursor = "default";
        const idleName = names.find(n => /idle|breath|rest|stand|float/i.test(n)) ?? names[0] ?? "";
        if (idleName) crossfadeTo(idleName);
      }}
      onClick={() => {
        jumpAge.current   = 0;
        wobbleAge.current = 0;
        const actionName = names.find(n => /wave|jump|dance|hop|bounce|happy|cheer|excited/i.test(n))
          ?? (names.length > 1 ? names[1] : "");
        if (actionName) crossfadeTo(actionName, 0.2);
      }}
    >
      <mesh castShadow geometry={nodes.mesh_0.geometry} material={nodes.mesh_0.material} />
    </group>
  );
}

// Fire the network request at module-load time — avoids a loading waterfall
// when the component first enters the viewport.
useGLTF.preload("/bot-transformed.glb");

// ── Size map ───────────────────────────────────────────────────────────────────
// Values are canvas WIDTH in px. Height = width × 1.25 (portrait).
const SZ: Record<string, number> = { xs: 72, sm: 120, md: 200, lg: 240, xl: 300 };
export type HippoSize = "xs" | "sm" | "md" | "lg" | "xl";

// ── Props ──────────────────────────────────────────────────────────────────────
export interface HippoMascotProps {
  size?: HippoSize;
  /** Optional speech bubble text — rendered as a CSS overlay above the canvas */
  message?: string;
  className?: string;
  style?: CSSProperties;
}

// ── HippoMascot — Canvas wrapper with IntersectionObserver + DPR cap ──────────
export function HippoMascot({
  size      = "md",
  message,
  className = "",
  style,
}: HippoMascotProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  // SSR guard — Canvas calls WebGL APIs that do not exist in Node.js
  const [mounted,      setMounted]      = useState(false);
  // "never" stops rAF entirely; "always" runs every frame
  const [frameloop,    setFrameloop]    = useState<"always" | "never">("always");
  // Speech bubble is hidden until the user clicks the mascot
  const [showMessage,  setShowMessage]  = useState(false);

  const px = SZ[size] ?? 72;

  useEffect(() => { setMounted(true); }, []);

  // Auto-hide message after 5s; cleanup prevents leak on unmount or re-toggle
  useEffect(() => {
    if (!showMessage) return;
    timerRef.current = setTimeout(() => setShowMessage(false), 5000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [showMessage]);

  // Pause the WebGL loop whenever the canvas is fully off-screen
  useEffect(() => {
    if (!mounted) return;
    const el = containerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setFrameloop(entry.isIntersecting ? "always" : "never"),
      { threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [mounted]);

  return (
    <div
      className={`relative inline-flex flex-col items-center gap-2 select-none cursor-pointer ${className}`}
      style={style}
      aria-hidden="true"
      onClick={() => setShowMessage(prev => !prev)}
    >
      {/* Speech bubble — hidden until mascot is clicked */}
      {message && showMessage && (
        <div
          className="relative px-4 py-2 rounded-xl text-center"
          style={{
            width:      px,
            minWidth:   120,
            background: "rgb(var(--surface))",
            border:     "1.5px solid rgb(var(--primary)/0.2)",
            boxShadow:  "0 4px 14px rgb(var(--primary)/0.1)",
            animation:  "hippo-msg-in 0.3s ease both",
          }}
        >
          <p className="font-body text-[11px] font-semibold text-ink leading-snug">
            {message}
          </p>
          {/* Arrow tail pointing down toward the mascot — border-trick, no extra image */}
          <div
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0"
            style={{
              borderLeft:  "6px solid transparent",
              borderRight: "6px solid transparent",
              borderTop:   "8px solid rgb(var(--primary)/0.2)",
            }}
          />
          <div
            className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0"
            style={{
              borderLeft:  "5px solid transparent",
              borderRight: "5px solid transparent",
              borderTop:   "7px solid rgb(var(--surface))",
            }}
          />
        </div>
      )}

      {/* Canvas container — outer div clips the transparent ground area via overflow:hidden.
           Canvas stays at full height so Bounds/camera math is unaffected. */}
      <div
        ref={containerRef}
        style={{ width: px, height: px, overflow: "hidden", flexShrink: 0 }}
      >
        <div style={{ width: px, height: Math.round(px * 1.25) }}>
        {mounted && (
          <Canvas
            frameloop={frameloop}
            dpr={[1, 1.5]}
            camera={{ position: [0, 0, 6], fov: 50 }}
            gl={{ antialias: true, alpha: true }}
            style={{ background: "transparent" }}
          >
            {/* Three-point lighting — key, fill, rim */}
            <ambientLight intensity={1.4} />
            <directionalLight position={[3, 5, 3]}   intensity={2.0} />
            <directionalLight position={[-2, -1, -3]} intensity={0.5} color="#a0c0ff" />

            <Suspense fallback={null}>
              {/* Bounds auto-fits the camera to the model's bounding box on load */}
              <Bounds fit clip observe>
                <HippoScene />
                <FitOnLoad />
              </Bounds>
            </Suspense>
          </Canvas>
        )}
        </div>
      </div>
    </div>
  );
}
