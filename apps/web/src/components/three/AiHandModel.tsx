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

// ── Real continent silhouettes (paths from a 672x315 equirectangular world
//    map; each carries its own cropped viewBox). Source: react-basic-world-map.
const CONTINENTS: Record<string, { vb: string; d: string }> = {
  asia: { vb: "453.3 56.0 124.4 159.2", d: "M563.826 80.01l-.22-.625c-.09.068-.266.186-.26.196.11.183.242.35.37.524-.166 1.17 1.466 1.9.63 3.34-1.11 1.913-.78 2.61 1.426 4.105.115-.878-.667-2.7 1.068-2.09 2.394.834 4.014.275 5.508-1.74-2.823-1.23-5.67-2.47-8.522-3.71zM542.656 183.11c-.19-.267-.387-.548-.59-.828-1.89-2.548-2.482-4.92.117-7.568 1.364-1.39-.698-2.145-1.426-3.027-.616-.745-1.607-2.077-2.503-.96-1.676 2.082-4.86 2.994-5.785 4.7-1.645 3.03-5.388 3.535-6.48 6.715-.215.636-.76.403-1.307.27-1.883-.458-2.908.484-2.506 2.35.378 1.76.94 3.484 1.395 5.232.572 2.192 1.99 2.974 4.212 3.455 2.027.434 4.12-.64 5.984.535 2.024 1.278 2.94.02 3.79-1.545 1.598-2.95 1.838-6.638 4.786-8.86.127-.098.19-.283.31-.47zM492.48 172.796c.398 2.03 1.385 3.21 2.56 4.267 3.85 3.465 6.463 7.942 8.86 12.337 1.682 3.08 3.66 5.798 5.82 8.45.727.89 1.793 1.683 3.138 1.295a3.047 3.047 0 002.212-2.664c.12-1.37-.138-2.742-1.28-3.946-1.713-1.8-3.424-3.735-4.54-5.917-.625-1.216-.985-2.357-2.204-3.182-2.054-1.395-4.514-2.516-5.798-4.643-1.996-3.313-4.97-4.798-8.768-5.994zM565.46 106.815c1.06-2.906 1.06-2.906 3.614-3.267 3.424-.483 4.355-2.182 3.166-5.536-.305-.864-.865-1.733-.613-2.738.59-2.353-.683-3.89-2.345-5.194-.687-.538-1.475-1.513-2.45-.69-.94.798.168 1.527.37 2.288.378 1.44 2.108 2.516 1.37 4.222-1.31 3.03-4.095 5.588-6.805 5.695-2.86.113-3.99 1.95-6.315 2.838 3.374 1.746 7.63-3.202 10.007 2.382zM552.177 188.043c-1.16.266-2.35.444-3.475.818-1.423.475-1.982-.65-2.392-1.433-.483-.926.178-1.916 1.096-2.294 1.334-.546 2.673-1 4.226-.25 2.86 1.383 3.984.772 5.068-2.998-2.152 2.17-4.34 1.827-6.54 1.518-2.95-.415-4.083.224-4.834 3.006-.616 2.28-.284 4.83-2.067 6.774-.433.468-.01 1.073.267 1.417.712.877 1.137 1.678.498 2.805-.262.466-.004 1.017.475 1.36.545.396.968-.002 1.42-.222.595-.287.606-.772.463-1.314-.196-.75-.31-1.528-.607-2.236-.54-1.29.493-1.87 1.203-2.24 1.08-.568 1.225.716 1.407 1.285.444 1.403 1.048 2.45 2.824 2.57-.062-1.098.23-2.063-.367-2.93-1.632-2.38-1.192-4.17 1.333-5.636zM535.197 205.555c-2.236-1.525-5.075-1.93-7.21-3.665-.525-.43-1.14.04-1.72.14-1.797.31-3.508.846-5.346-.438-1.17-.815-2.86-1.293-4.44-.81-.684.21-1.707.4-1.685 1.35.02.783.952.83 1.557 1.098 2.008.892 4.392.2 6.157.822 3.644 1.286 7.457 1.093 11.06 2.17.626.187 1.207.172 1.628-.667zM552.743 155.018c-.677-2.027-.897-2.283-1.863-2.354-3.69-.264-4.7-1.772-3.36-5.117.87-2.174-.4-3.637-1.77-4.868-1.085-.977-1.708-.1-1.814 1.06-.095 1.023-.018 2.026-.47 3.04-.947 2.13 3 7.81 5.323 7.787.08 0 .166-.04.24-.08 1.26-.773 2.307.144 3.712.53zM550.498 168.35c2.586-1.304 3.528.042 3.995 2.223.105.486.436.94.735 1.36.482.673 1.063.32 1.612.067.32-.148 1.036.01.728-.68-1.413-3.17.93-1.37 1.963-1.4-.05-2.603-1.276-4.78-2.306-7.018-1.343 3.1-1.678 3.326-5.037 3.343-1.227.007-1.535.806-1.688 2.106zM561.177 70.273c-2.185-2.732-4.12-4.07-6.555-4.448 2.496 2.9 3.98 6.103 5.615 9.23.574 1.095 1.47 2.347 3.246 1.634-.624-2.01-2.407-2.874-3.484-4.31-.894-1.185-1.173-2.19 1.176-2.108zM459.167 163.702c-1.307 2.007-.894 3.82-.45 5.68.243 1.013.048 2.223 1.74 1.696 1.295-.405 2.034-.916 1.61-2.573-.475-1.87-1.852-3.046-2.9-4.803zM542.705 126.675c-1.378.634-1.965 2.03-2.204 3.285-.206 1.078.454 2.31 1.65 2.92.39.2.633.062.72-.38.32-1.622 1.426-3.146.59-4.92-.176-.372-.14-.867-.754-.905zM560.882 206.897c-4.303-1.72-6.326-.855-8.423 3.335 2.827-1.02 4.65-3.57 8.42-3.335zM557.23 112.488c1.587-2.33 1.214-3.86-.99-5.163-.475-.28-.874-.967-1.446-.108-.408.62-.304 1.11.248 1.546 1.117.886 1.613 2.16 2.19 3.725zM521.892 139.15c-1.76-.195-3.2-.105-3.945 1.44-.403.836.396 1.74 1.045 1.798 2.148.19 1.972-1.87 2.9-3.24zM543.214 159.992c-1.89 1.585-3.346 3.248-4.48 5.468 2.805-.74 4.462-2.755 4.48-5.468zM564.356 180.726c-1.55-.513-1.775.56-2.22 1.34-.442.774.563 1.596-.16 2.418-.473.533-.537 1.248.212 1.76.35.238.738.607 1.086.127.383-.53.805-1.075.378-1.86-.74-1.353-.78-2.68.704-3.783zM550.31 206.694c-.846-1.096-2.04-.703-2.944-1.183-.642-.34-1.528-.247-1.545.644-.01.64.7 1.25 1.457 1.176.995-.1 1.973-.405 3.033-.636zM550.376 60.996c1.136 1.65 1.652 3.168 3.625 3.76-.486-1.984-1.24-3.277-3.623-3.76zM542.305 206.455c-1.587-.842-2.855-.805-4.13-.23-.072.036-.083.494.027.605 1.09 1.09 2.22.068 3.34.015.15-.007.29-.143.763-.39z" }, // Asia
  europe: { vb: "263.1 2.6 131.2 103.9", d: "M315.54 12.017c-.95.52-2.082-.24-2.718.828 1.143.663 2.173 1.27 3.214 1.86.726.413 1.568.678 1.98-.274.474-1.097 1.535-1.59 2.175-2.51 1.29-1.85 2.49-1.655 3.312.56.157.425.237.99.616.713 1.317-.97 2.53.273 4.03.078-1.355-2.037-4.132-1.85-5.448-3.937 2.526.016 4.722 1.5 7.046.302.48-.248 1.064-.418 1.012-.996-.066-.715-.765-.55-1.246-.562-1.736-.038-3.628.388-5.175-.163-2.225-.794-2.97.183-3.69 2.165-.646-1.42-1.195-2.776-2.865-1.106-.43.43-1.75.282-2.516.002-1.715-.624-3.44-.287-5.16-.37-.56-.027-1.32-.193-1.46.67-.134.818.615 1.025 1.13 1.215 1.353.498 2.62 1.547 4.237.492.774-.507 1.17.304 1.528 1.035zM369.185 87.545c.68.07 1.6.203 3.463.162 1.22-.026 2.524-.132 3.695-.39 1.17-.258 2.21-.67 2.896-1.305.61-.567 1.063-1.253 1.395-2.017.332-.765.54-1.607.666-2.48.25-1.75.16-3.63.015-5.292-.056-.644-.233-1.282-.49-1.916a12.92 12.92 0 00-.987-1.887c-.778-1.247-1.743-2.473-2.608-3.675-.866-1.203-1.633-2.382-2.012-3.534-.19-.574-.282-1.142-.242-1.705.04-.562.21-1.12.552-1.668.262-.42.764-.658 1.37-.78.605-.12 1.314-.123 1.99-.073 1.352.1 2.574.41 2.574.41s.916.513 2.113 1.088c1.198.576 2.678 1.214 3.8 1.46.725.158 1.195.067 1.493-.197.3-.265.425-.702.463-1.243.077-1.08-.205-2.57-.184-3.88.02-1.23-.34-2.653-.66-4.372a29.076 29.076 0 01-.39-2.812 20.632 20.632 0 01-.01-3.334c.12-.414.06-1.166-.102-2.133-.163-.966-.427-2.145-.723-3.412-.59-2.533-1.304-5.414-1.542-7.633-.123-1.144.227-2.392.402-3.592.088-.6.13-1.188.05-1.746-.057-.384-.283-.728-.485-1.078-.08.023-.1.092-.252.064-3.3-.615-6.512 2.358-9.766.04-.39-.28-1.2-.102-1.774.038-1.847.45-3.572 1.125-5.2 2.212-1.44.96-3.622 2.236-4.66-.04-.83-1.816-1.71-1.054-2.675-1.136-.537 1.22 2.034 2.685-.544 3.492-1.764.552-4.196.022-4.63 2.895-.056.37-1.14.838-2.075.484-.77-.295-1.58-.937-2.6-.577.55.844 1.74.714 2 1.706-2.47 1.53-5.52.7-7.078-2.03-.58-1.014-1.148-1.92-2.287-2.34-.49-.18-1.15-.42-1.018-1.004.16-.69.906-.722 1.527-.674.6.045 1.192.195 1.79.235 2.32.157 4.35 1.685 6.798 1.348 1.31-.178 2.946-.323 3.172-1.578.235-1.28-1.458-1.405-2.488-1.76-1.635-.563-3.25-1.215-4.918-1.642-1.395-.356-2.816-1.2-4.278-.63-1.06.413-1.728.14-2.594-.443-4.967-3.332-10.502-3.06-16.03-2.203-1.575.24-2.997 1.624-4.558 1.782-4.802.484-7.253 4.187-9.8 7.315-2.51 3.08-5.278 5.313-8.98 6.46-3.05.944-4.05 2.317-3.585 5.218.764 4.768 2.865 5.867 6.91 3.373 1.187-.733 1.852-.695 2.564.31.643.91 1.33 1.824 1.745 2.838.28.68 1.187 1.643.06 2.287-1.15.66-2.37 1.885-3.704 1.36-1.243-.493.33-1.63.044-2.513-.102-.316-.07-.675-.104-1.043-3.082 1.48-3.65 2.46-2.332 5.406.842 1.88-.168 2.99-1.39 2.934-2.882-.13-4.55 1.467-6.44 3.15-1.63 1.456-4.06 2.196-5.293 3.873-2.366 3.217-6.22 2.734-9.172 4.383-.596.333-2.31-.804-2.614.482-.306 1.308 1.41 1.085 2.233 1.545.3.17.63.294.933.46 2.07 1.153 2.593 3.53 1.707 7.43-.512 2.258-2.19 2.33-4.022 2.333-2.44.004-4.78-.58-7.154-.996-1.744-.305-3.93.095-3.72 2.096.31 2.972-.8 5.55-1.085 8.312-.157 1.5-.846 4.13 1.26 4.483 2.41.406 4.063 1.542 5.79 3.283.703-1.97 2.14-2.125 3.81-2.09 2.645.05 6.444-2.163 6.577-4.237.275-4.202 3.554-5.62 6.264-7.623.44-.326 1.03-.166.97-1.145-.12-1.952 1.33-3.18 3.246-2.488 2.535.916 4.42-.198 6.265-1.408 2.59-1.7 3.394-1.665 4.724 1.192 1.074 2.304 3.113 4.37 4.93 4.997 3.827 1.32 6.6 2.745 6.303 7.487 1.095-.98 2.356-1.516 1.564-3.11-1.124-2.262.304-2.087 1.77-1.77.464.102.893.54 1.33-.016-.114-.53-.54-.672-.947-.815-4.473-1.582-7.53-5.046-10.79-8.21-.74-.725-1.588-1.844-.33-2.92 1.097-.944 1.622.12 2.525.59 2.636 1.38 4.57 3.92 7.393 4.782 3.024.924 4.338 2.77 4.61 5.737.213 2.35 1.616 3.74 3.886 4.25.726.164 1.9-.206 2.002.74.125 1.19-1.426.535-1.93 1.166.068.876.663 1.422 1.123 2.046 1.02 1.38 1.495 1.472 2.376-.342.928-1.915.12-3.122-.793-4.43-.9-1.285-.912-2.196.71-2.744 2.2-.743 4.28-1.707 6.803-1.015 1.093.297 2.66.022 3.87-1.1-2.237-.976-2.114-2.503-1.424-4.342 1.22-3.26 2.417-6.512 5.806-8.193 1.33-.658 3.584.975 3.535 2.475-.04 1.313 1.472 2.358 2.83 1.845.936-.352 1.8-.907 2.96-1.508-1.333-.265-2.706-.325-2.735-1.552-.018-.83 1.25-1.013 2.065-1.287 1.702-.576 3.195-1.704 5.048-1.944.057.687-.02 1.245-.264 1.934-1.455 4.02-1.392 4.038 2.486 6.19 1.057.587 2.137 1.146 3.133 1.827 1.086.74 2.357 1.76 2.088 3.044zM385.816 25.78c-1.236-.632-2.444-1.58-3.953-.43 1.243 1.145 2.547.888 3.862.548" }, // Europe
  africa: { vb: "244.0 93.9 156.6 179.2", d: "M346.402 113.802c-.17.07-.465-.25-.712-.27-4.522-.397-8.758-1.617-12.802-3.765-3.034-1.612-4.46-.522-4.662 2.886-.083 1.41-1.59 2.89-2.388 2.6-2.33-.84-5.66-.743-6.844-2.497-1.98-2.928-4.745-3.15-7.454-3.954-2.822-.838-3.82-2.355-3.362-5.1.232-1.41-.062-3.027-.87-4.077-1.022-1.326-2.538-.395-3.773.174-2.42 1.114-5.057.88-7.43.463-3.982-.7-7.45.41-10.57 2.353-3.217 2.005-6.126 2.44-9.33.388-.89-.568-1.57-.542-2.092.522-.986 2.016-2.6 3.41-4.584 4.4-2.34 1.162-3.488 3.376-3.594 5.652-.13 2.84-1.84 4.387-3.778 5.472-2.85 1.593-4.95 3.8-6.516 6.475-1.57 2.686-3.01 5.426-4.79 7.998-.936 1.353-1.45 3.018-.583 4.844 1.364 2.873 1.865 5.848.457 8.94-1.026 2.25-3.17 4.5-.41 7.02.17.157-.84.53-.112.962-2.044 1.885.48 2.86 1.136 3.413 2.413 2.036 4.23 4.46 5.466 7.25.53 1.202 1.027 2.303 1.875 3.315 1.513 1.808 3.355 3.207 5.19 4.632 2.15 1.66 4.487 2.358 7.178 1.57 1.965-.573 4.045-1.78 5.958-1.218 2.726.802 5.014.213 7.458-.707 2.313-.868 4.68-1.602 7.055-2.278 2.103-.6 5.36.928 5.86 2.954.424 1.7.94 1.963 2.638 1.51 3.457-.927 6.375 1.536 6.468 5.097.045 1.752-.163 3.427-.74 5.1-.643 1.857-1.513 3.932.178 5.61 3.446 3.41 5.434 7.51 7.28 11.96.896 2.16-.156 4.12.832 5.864 1.913 3.39.45 6.11-1.116 9.128-2.437 4.693-3.19 9.58.055 14.384 2.876 4.262 4.066 9.067 4.505 14.142.152 1.773-.015 3.83 1.088 5.245 2.082 2.677 3.54 5.682 5.264 8.55.564.938.853 1.618.55 2.82-.747 2.93 1.544 5 4.478 4.35 2.745-.605 5.488-1.696 8.314-.373.563.263.974.07 1.46-.147 3.6-1.622 6.623-3.885 9.203-6.964 1.934-2.312 3.53-4.934 5.783-6.935.9-.8 1.245-1.22.97-2.485-.54-2.477.076-4.417 2.812-5.604 4.124-1.79 4.638-3.683 2.556-7.79-.642-1.263-1.128-2.546-.002-3.562 2.824-2.547 4.426-6.274 8.454-7.728 3.474-1.255 4.783-4.753 4.377-8.378-.44-3.88-.828-7.66-2.61-11.294-.963-1.958-1.395-4.338-.81-6.787 1.685-7.023 7.57-10.894 11.763-16.02 1.952-2.39 5.308-3.368 6.88-6.143 2.305-4.066 4.287-8.315 6.575-12.39 1.193-2.124 1.39-4.085.162-6.344-3.516 2.275-7.657 2.108-11.426 3.32-1.82.583-4.3-1.108-4.76-3.08-.65-2.768-2.467-4.555-4.49-6.396-1.663-1.508-4.207-2.326-4.675-4.952-.25-1.41-.9-2.558-1.822-3.618-1.9-2.177-3.655-4.407-3.25-7.61.06-.477-.496-1.06-.826-1.55-3.618-5.377-5.79-11.577-9.615-16.83-.366-.5-.496-.97.034-1.334M390.758 215.407c-1.126 4.07-4.206 6.355-7.395 8.04-3.08 1.623-4.565 3.03-3.67 6.426.538 2.044.475 3.746-.954 5.293-2.31 2.5-1.826 5.44-1.14 8.27.46 1.886 2.024 2.625 4.012 2.35 2.547-.35 4.203-1.945 5.528-4.27.878-6.33 3.857-11.94 5.758-17.912.96-3.024.438-5.497-1.14-8.197z" }, // Africa
  samerica: { vb: "104.0 152.9 110.8 167.3", d: "M116.118 167.174c-.415 1.425.243 2.418.6 3.565 1.137 3.644.977 7.03-1.524 10.18-2.03 2.56-4.198 5.048-5.47 8.15-.393.966-.787 2.178.092 2.588 3.028 1.41.873 2.67.053 3.96-1.37 2.154-1.048 4.542 1 6.016 1.174.848 1.857 1.98 2.586 3.18 1.58 2.6 1.826 5.79 3.77 8.22 1.605 2.013 3.28 3.943 4.124 6.505.725 2.197 2.425 3.567 4.602 4.603 5.66 2.694 10.344 6.27 10.638 13.36.15 3.602-.243 7.18-.033 10.82.198 3.464.227 6.988.716 10.46.625 4.445 2.04 8.945.958 13.358-.95 3.9 1.106 7.085 1.628 10.576.352 2.36 3.356 3.75 4.09 6.826.866 3.615 1.584 4.13-1.22 6.74 1.314.826 2.84 1.408 3.365 3.066 1.238 3.9 3.232 7.28 6.362 10.034 1.42 1.25 5.01 1.734 6.428.405.427-.402.932-.71.423-1.495-1.376-2.128-.534-4.14.584-6.04 1.206-2.053 1.067-3.652-1.116-4.982-1.025-.625-2.42-2.097-1.822-2.843 1.68-2.098 1.874-4.722 3.084-7.057-1.285-.557-2.43-1.407-2.888-2.943-.145-.49-.527-.903-.074-1.424.555-.638 1.052-.168 1.63-.03.885.21 1.667 1.71 2.665.49.745-.912 1.322-1.992.48-3.305-.818-1.272.053-1.71 1.183-1.798.778-.06 1.59.107 2.342-.05 2.254-.46 4.63-1.172 5.095-3.717.39-2.127-1.12-3.816-2.623-5.265-.516-.497-1.858-.546-1.458-1.48.383-.906 1.49-.477 2.3-.208.736.247 1.513.444 2.173.833 2.03 1.192 3.83.246 4.808-1.202 3.157-4.665 5.83-9.626 7.665-14.997.438-1.285.54-2.54-.095-3.736-.59-1.11-.343-1.89.518-2.752 2.245-2.25 5.44-2.937 7.85-4.903.213-.174.723-.165 1.008-.042 2.866 1.232 4.393-.71 5.25-2.72 2.402-5.634 4.383-11.423 3.233-17.752-.203-1.113-.26-2.46.613-3.22 2.544-2.218 3.312-5.68 5.685-7.918 1.616-1.523 1.937-3.455 2.37-5.33.55-2.396-.897-4.25-3.3-4.924-2.624-.736-5.027-1.852-6.545-4.304-.174-.282-.47-.673-.727-.69-3.424-.2-6.822-2.28-10.27-.255-.964.568-1.528.082-1.33-.65.87-3.205-1.976-3.083-3.512-4.054-1.675-1.06-2.744.294-3.78 1.298-1.18 1.15-2.397 1.63-3.943.62.774-.364 1.553-.687 2.087-1.387.44-.58 1.382-.977.698-1.928-.6-.828-1.408-1.364-2.433-.913-.698.304-1.33.798-1.918 1.295-.663.56-1.23 1.228-1.864 1.825-.418.397-.845 1.084-1.514.552-.8-.628-.15-1.316.236-1.784.71-.86 1.557-1.586 2.48-2.265 1.01-.745 2.167-2.147 1.472-3.222-.894-1.387-1.017-2.896-1.56-4.314-1.174-3.07-5.613-6.326-8.444-5.77-3.636.712-6.402-.76-8.173-3.595a11.701 11.701 0 00-4.895-4.405c-2.033-.98-3.938-2.6-6.434-2.435-3.293.22-6.36-.177-9.023-2.47-.862-.74-2.192-2.053-3.404-.793-.89.923-3.702 1.082-1.93 3.597.534.755-.227 1.43-.725 2.004-.283.327-.672.67-1.07.187-.432-.532-.912-1.15-.717-1.864.48-1.767.28-3.723 1.71-5.283-2.368-.584-2.823 2.05-4.29 2.204-3.052.317-4.325 2.25-5.64 4.628-.806 1.455-2.192 3.004-4.224.975M169.258 314.69c-2.768-.79-4.725-2.848-7.143-4.092-.854-.44-1.802-1.486-2.774-.485-.535.556-.99 1.625-.83 2.312.22.956 1.198 1.495 2.18 1.995 2.835 1.442 5.705.296 8.57.27zM178.366 306.535c-1.333-.773-2.788-.467-4.18-.606-.96-.1-1.134.7-1.27 1.21-.196.735.636.665 1.093.9 1.92.987 4.192.083 4.355-1.506z" }, // South America
};

function ContinentMap({ k, c }: { k: string; c: string }) {
  const id = `cm-${k}`;
  const m = CONTINENTS[k];
  return (
    <svg viewBox={m.vb} width="56" height="56" preserveAspectRatio="xMidYMid meet" aria-hidden
      style={{ display: "block", margin: "0 auto", filter: `drop-shadow(0 0 7px ${c}cc)` }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.92" />
          <stop offset="55%" stopColor={c} stopOpacity="1" />
          <stop offset="100%" stopColor={c} stopOpacity="0.78" />
        </linearGradient>
      </defs>
      <path d={m.d} fill={`url(#${id})`} stroke={c} strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
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
