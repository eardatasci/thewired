"use client";

import { useRef, useMemo, useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { scrollState } from "./scrollState";
import * as THREE from "three";

const ASCII_CHARS = "@#&*+=-~:;.%$?!^";
const COLS = 4;
const ROWS = Math.ceil(ASCII_CHARS.length / COLS);
const PARTICLE_COUNT = 250000;

// Intro animation duration in seconds
const INTRO_DURATION = 1.4;
// Per-particle stagger window — particles arrive within this window
const STAGGER = 0.8;

function createAtlas(): THREE.CanvasTexture {
  const size = 512;
  const cellW = size / COLS;
  const cellH = size / ROWS;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "#fff";
  ctx.font = `bold ${Math.min(cellW, cellH) * 0.65}px monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let i = 0; i < ASCII_CHARS.length; i++) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    ctx.fillText(ASCII_CHARS[i], col * cellW + cellW / 2, row * cellH + cellH / 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

function sampleMeshSurface(
  geometry: THREE.BufferGeometry,
  count: number
): { positions: Float32Array; normals: Float32Array; morphDeltas: Float32Array[] } {
  const posAttr = geometry.getAttribute("position");
  const normalAttr = geometry.getAttribute("normal");
  const index = geometry.getIndex();

  if (!normalAttr) {
    geometry.computeVertexNormals();
  }
  const nAttr = geometry.getAttribute("normal");

  // Collect morph target position attributes
  const morphAttrs: THREE.BufferAttribute[] = [];
  for (let m = 0; ; m++) {
    const attr = geometry.morphAttributes.position?.[m];
    if (!attr) break;
    morphAttrs.push(attr as THREE.BufferAttribute);
  }

  const triCount = index ? index.count / 3 : posAttr.count / 3;

  const areas = new Float32Array(triCount);
  const va = new THREE.Vector3();
  const vb = new THREE.Vector3();
  const vc = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  let totalArea = 0;

  for (let t = 0; t < triCount; t++) {
    const i0 = index ? index.getX(t * 3) : t * 3;
    const i1 = index ? index.getX(t * 3 + 1) : t * 3 + 1;
    const i2 = index ? index.getX(t * 3 + 2) : t * 3 + 2;

    va.fromBufferAttribute(posAttr, i0);
    vb.fromBufferAttribute(posAttr, i1);
    vc.fromBufferAttribute(posAttr, i2);

    ab.subVectors(vb, va);
    ac.subVectors(vc, va);
    const area = ab.cross(ac).length() * 0.5;
    areas[t] = area;
    totalArea += area;
  }

  const cdf = new Float32Array(triCount);
  cdf[0] = areas[0] / totalArea;
  for (let i = 1; i < triCount; i++) {
    cdf[i] = cdf[i - 1] + areas[i] / totalArea;
  }

  const positions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  const morphDeltas: Float32Array[] = morphAttrs.map(() => new Float32Array(count * 3));

  const na = new THREE.Vector3();
  const nb = new THREE.Vector3();
  const nc = new THREE.Vector3();
  const ma = new THREE.Vector3();
  const mb = new THREE.Vector3();
  const mc = new THREE.Vector3();

  for (let i = 0; i < count; i++) {
    const r = Math.random();
    let triIdx = 0;
    for (let j = 0; j < triCount; j++) {
      if (r <= cdf[j]) {
        triIdx = j;
        break;
      }
    }

    const i0 = index ? index.getX(triIdx * 3) : triIdx * 3;
    const i1 = index ? index.getX(triIdx * 3 + 1) : triIdx * 3 + 1;
    const i2 = index ? index.getX(triIdx * 3 + 2) : triIdx * 3 + 2;

    va.fromBufferAttribute(posAttr, i0);
    vb.fromBufferAttribute(posAttr, i1);
    vc.fromBufferAttribute(posAttr, i2);

    if (nAttr) {
      na.fromBufferAttribute(nAttr, i0);
      nb.fromBufferAttribute(nAttr, i1);
      nc.fromBufferAttribute(nAttr, i2);
    }

    let u = Math.random();
    let v = Math.random();
    if (u + v > 1) {
      u = 1 - u;
      v = 1 - v;
    }
    const w = 1 - u - v;

    positions[i * 3] = va.x * w + vb.x * u + vc.x * v;
    positions[i * 3 + 1] = va.y * w + vb.y * u + vc.y * v;
    positions[i * 3 + 2] = va.z * w + vb.z * u + vc.z * v;

    if (nAttr) {
      normals[i * 3] = na.x * w + nb.x * u + nc.x * v;
      normals[i * 3 + 1] = na.y * w + nb.y * u + nc.y * v;
      normals[i * 3 + 2] = na.z * w + nb.z * u + nc.z * v;
    }

    // Sample morph target deltas with same barycentric coords
    for (let m = 0; m < morphAttrs.length; m++) {
      ma.fromBufferAttribute(morphAttrs[m], i0);
      mb.fromBufferAttribute(morphAttrs[m], i1);
      mc.fromBufferAttribute(morphAttrs[m], i2);
      morphDeltas[m][i * 3] = ma.x * w + mb.x * u + mc.x * v;
      morphDeltas[m][i * 3 + 1] = ma.y * w + mb.y * u + mc.y * v;
      morphDeltas[m][i * 3 + 2] = ma.z * w + mb.z * u + mc.z * v;
    }
  }

  return { positions, normals, morphDeltas };
}

export default function AsciiSwarm() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const groupRef = useRef<THREE.Group>(null);
  const [atlas, setAtlas] = useState<THREE.CanvasTexture | null>(null);
  const [meshData, setMeshData] = useState<{
    positions: Float32Array;
    normals: Float32Array;
    startPositions: Float32Array;
    blinkDelta: Float32Array;
    smileDelta: Float32Array;
    charIndices: Float32Array;
    seeds: Float32Array;
  } | null>(null);
  const gltf = useGLTF("/face2.glb");
  const { size } = useThree();

  const mouse = useRef({ x: 0, y: 0, smoothX: 0, smoothY: 0, worldX: 0, worldY: 0 });
  const blinkState = useRef({ nextBlink: 4, isDouble: false });
  const smileRef = useRef(0);
  const scrollRotRef = useRef({ rotY: 0, rotX: 0 });
  const { camera } = useThree();

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const ndcX = (e.clientX / size.width) * 2 - 1;
      const ndcY = -(e.clientY / size.height) * 2 + 1;

      const vec = new THREE.Vector3(ndcX, ndcY, 0.5);
      vec.unproject(camera);
      const dir = vec.sub(camera.position).normalize();
      const t = -camera.position.z / dir.z;
      const worldX = camera.position.x + dir.x * t;
      const worldY = camera.position.y + dir.y * t;

      const dist = 8;
      mouse.current.x = Math.atan2(worldX, dist);
      mouse.current.y = Math.atan2(worldY, dist);
      mouse.current.worldX = worldX;
      mouse.current.worldY = worldY;
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [size, camera]);

  useEffect(() => {
    setAtlas(createAtlas());
  }, []);

  useEffect(() => {
    if (!gltf.scene) return;

    let geo: THREE.BufferGeometry | null = null;
    gltf.scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh && !geo) {
        const mesh = child as THREE.Mesh;
        geo = mesh.geometry.clone();
        mesh.updateWorldMatrix(true, false);
        geo.applyMatrix4(mesh.matrixWorld);
      }
    });

    if (!geo) return;
    const geometry: THREE.BufferGeometry = geo;

    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    const center = new THREE.Vector3();
    const bsize = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(bsize);
    const maxDim = Math.max(bsize.x, bsize.y, bsize.z);
    const targetSize = 5;
    const scale = targetSize / maxDim;

    geometry.translate(-center.x, -center.y, -center.z);
    geometry.scale(scale, scale, scale);

    // Scale morph target deltas to match
    if (geometry.morphAttributes.position) {
      for (const morphAttr of geometry.morphAttributes.position) {
        const arr = morphAttr as THREE.BufferAttribute;
        for (let j = 0; j < arr.count; j++) {
          arr.setXYZ(j, arr.getX(j) * scale, arr.getY(j) * scale, arr.getZ(j) * scale);
        }
      }
    }

    // Bake the eye_closed morph into the base geometry so we sample from the closed-eye surface
    // Then we'll use the INVERSE delta to open the eyes at runtime
    const posAttr = geometry.getAttribute("position") as THREE.BufferAttribute;
    const blinkMorph = geometry.morphAttributes.position?.[0] as THREE.BufferAttribute | undefined;
    if (blinkMorph) {
      for (let j = 0; j < posAttr.count; j++) {
        posAttr.setXYZ(
          j,
          posAttr.getX(j) + blinkMorph.getX(j),
          posAttr.getY(j) + blinkMorph.getY(j),
          posAttr.getZ(j) + blinkMorph.getZ(j),
        );
      }
      // Invert the morph delta so applying it = opening the eyes
      for (let j = 0; j < blinkMorph.count; j++) {
        blinkMorph.setXYZ(j, -blinkMorph.getX(j), -blinkMorph.getY(j), -blinkMorph.getZ(j));
      }
    }

    const { positions, normals, morphDeltas } = sampleMeshSurface(geometry, PARTICLE_COUNT);

    // Generate start positions — single point behind the face center
    const startPositions = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const ox = 0;
      const oy = 0;
      const oz = -10;
      startPositions[i * 3] = ox;
      startPositions[i * 3 + 1] = oy;
      startPositions[i * 3 + 2] = oz;
    }

    const charIndices = new Float32Array(PARTICLE_COUNT);
    const seeds = new Float32Array(PARTICLE_COUNT);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      charIndices[i] = Math.floor(Math.random() * ASCII_CHARS.length);
      seeds[i] = Math.random() * 100.0;
    }

    setMeshData({
      positions,
      normals,
      startPositions,
      blinkDelta: morphDeltas[0] || new Float32Array(PARTICLE_COUNT * 3),
      smileDelta: morphDeltas[1] || new Float32Array(PARTICLE_COUNT * 3),
      charIndices,
      seeds,
    });
  }, [gltf]);

  const shader = useMemo(() => {
    if (!atlas) return null;
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uIntro: { value: 0 },
        uAtlas: { value: atlas },
        uColor: { value: new THREE.Color("#c8bfa9") },
        uCols: { value: COLS },
        uRows: { value: ROWS },
        uMouse: { value: new THREE.Vector2(0, 0) },
        uBlink: { value: 0 },
        uSmile: { value: 0 },
      },
      vertexShader: /* glsl */ `
        attribute float aChar;
        attribute vec3 aNormal;
        attribute vec3 aStartPos;
        attribute vec3 aBlinkDelta;
        attribute vec3 aSmileDelta;
        attribute float aSeed;
        uniform float uTime;
        uniform float uIntro;
        uniform vec2 uMouse;
        uniform float uBlink;
        uniform float uSmile;

        varying float vChar;
        varying float vAlpha;

        // Sharp deceleration — slams in fast, snaps to place
        float easeOutQuint(float x) {
          return 1.0 - pow(1.0 - x, 5.0);
        }

        void main() {
          // Base = closed eyes. Delta opens them. uBlink=1 closes by removing the delta.
          vec3 facePos = position + aBlinkDelta * (1.0 - uBlink) + aSmileDelta * uSmile;
          vec3 n = normalize(aNormal);
          float t = uTime;
          float s = aSeed;

          // --- Intro fly-in ---
          // Per-particle staggered delay based on seed
          float delay = fract(s * 7.31) * ${STAGGER.toFixed(1)};
          float introLocal = clamp((uIntro * ${(INTRO_DURATION + STAGGER).toFixed(1)} - delay) / ${INTRO_DURATION.toFixed(1)}, 0.0, 1.0);
          float ease = easeOutQuint(introLocal);

          // Start position
          vec3 startP = aStartPos;

          // Sine wave displacement during flight — fades to zero at endpoints
          float arc = sin(ease * 3.14159);
          float waveY = arc * sin(ease * 14.0 + s * 6.28) * 0.8;
          float waveX = arc * cos(ease * 12.0 + s * 4.0) * 0.6;

          vec3 p = mix(startP, facePos, ease) + vec3(waveX, waveY, 0.0);

          // --- Post-settle surface movement (only when arrived) ---
          float settled = smoothstep(0.8, 1.0, introLocal);

          // Flicker characters — slow cycle
          float charFlicker = floor(mod(aChar + t * 0.8 + s * 5.0, ${ASCII_CHARS.length.toFixed(1)}));
          // During flight, flicker fast
          float flightFlicker = floor(mod(aChar + t * 12.0 + s * 3.0, ${ASCII_CHARS.length.toFixed(1)}));
          vChar = mix(flightFlicker, charFlicker, settled);

          // Gentle surface breathing (only when settled)
          float burst = sin(t * 1.2 + s * 6.28) * cos(t * 0.9 + s * 3.14);
          float normalDisplace = burst * 0.03 * settled;

          vec3 tangent = normalize(cross(n, vec3(0.0, 1.0, 0.0)));
          vec3 bitangent = normalize(cross(n, tangent));
          float jitX = sin(t * 1.5 + s * 9.1) * 0.015 * settled;
          float jitY = cos(t * 1.8 + s * 8.4) * 0.015 * settled;

          p += n * normalDisplace + tangent * jitX + bitangent * jitY;

          float spike = pow(max(sin(t * 0.7 + s * 20.0), 0.0), 12.0);
          p += n * spike * 0.06 * settled;

          // Mouse look-at rotation
          float rotY = uMouse.x;
          float rotX = -uMouse.y;

          float cy = cos(rotY);
          float sy = sin(rotY);
          p = vec3(p.x * cy + p.z * sy, p.y, -p.x * sy + p.z * cy);
          n = vec3(n.x * cy + n.z * sy, n.y, -n.x * sy + n.z * cy);

          float cx = cos(rotX);
          float sx = sin(rotX);
          p = vec3(p.x, p.y * cx - p.z * sx, p.y * sx + p.z * cx);
          n = vec3(n.x, n.y * cx - n.z * sx, n.y * sx + n.z * cx);

          // Lighting
          vec3 lightDir = normalize(vec3(0.3, 0.5, 0.9));
          float diffuse = max(dot(n, lightDir), 0.0);

          vec3 fillDir = normalize(vec3(-0.5, 0.2, 0.6));
          float fill = max(dot(n, fillDir), 0.0) * 0.3;

          float rim = 1.0 - max(dot(n, vec3(0.0, 0.0, 1.0)), 0.0);
          rim = pow(rim, 2.5) * 0.4;

          float lighting = 0.06 + diffuse * 0.7 + fill + rim;

          float facing = dot(n, vec3(0.0, 0.0, 1.0));
          float backFade = smoothstep(-0.1, 0.15, facing);

          float flicker = 0.85 + 0.15 * sin(t * 2.0 + s * 10.0);

          // During flight: full brightness, no back-face culling
          float flightAlpha = 0.6 + 0.4 * sin(t * 8.0 + s * 5.0);
          float settledAlpha = lighting * backFade * flicker;
          vAlpha = mix(flightAlpha, settledAlpha, settled);


          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = clamp(26.0 / -mv.z, 1.5, 14.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D uAtlas;
        uniform vec3 uColor;
        uniform float uCols;
        uniform float uRows;

        varying float vChar;
        varying float vAlpha;

        void main() {
          float idx = floor(vChar + 0.5);
          float col = mod(idx, uCols);
          float row = floor(idx / uCols);

          vec2 uv = gl_PointCoord;
          uv.y = 1.0 - uv.y;
          vec2 cell = (vec2(col, row) + uv) / vec2(uCols, uRows);

          float a = texture2D(uAtlas, cell).r;
          if (a < 0.08) discard;

          gl_FragColor = vec4(uColor, a * vAlpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }, [atlas]);

  useFrame(({ clock }) => {
    if (!materialRef.current) return;

    const m = mouse.current;
    m.smoothX += (m.x - m.smoothX) * 0.04;
    m.smoothY += (m.y - m.smoothY) * 0.04;

    const elapsed = clock.elapsedTime;
    const intro = Math.min(elapsed / (INTRO_DURATION + STAGGER), 1.0);
    const offset = scrollState.offset;

    // --- Scroll-driven face position ---
    const moveT = Math.max(0, Math.min(1, (offset - 0.25) / 0.25));
    const easeMove = 1 - Math.pow(1 - moveT, 3); // easeOutCubic
    if (groupRef.current) {
      groupRef.current.position.set(
        easeMove * 3.8,   // push further right
        0,
        0
      );
      const s = 1 - easeMove * 0.1;
      groupRef.current.scale.setScalar(s);
    }

    // --- Scroll-driven rotation override ---
    let scriptedRotY = 0;
    if (offset > 0.48 && offset < 0.58) {
      scriptedRotY = -0.5; // face left toward messages
    } else if (offset >= 0.58 && offset < 0.68) {
      scriptedRotY = 0; // face viewer (4th wall)
    } else if (offset >= 0.68) {
      scriptedRotY = -0.5; // face left toward messages (sending reply)
    }

    // Blend: 0 = full mouse, 1 = full scripted
    const overrideBlend = Math.max(0, Math.min(1, (offset - 0.30) / 0.10));

    // Smooth lerp toward scripted target
    const sr = scrollRotRef.current;
    sr.rotY += (scriptedRotY - sr.rotY) * 0.08;
    sr.rotX += (0 - sr.rotX) * 0.08;

    const finalMouseX = m.smoothX * (1 - overrideBlend) + sr.rotY * overrideBlend;
    const finalMouseY = m.smoothY * (1 - overrideBlend) + sr.rotX * overrideBlend;

    // --- Blink logic ---
    const bs = blinkState.current;
    let blink = 0;

    if (elapsed >= bs.nextBlink) {
      bs.isDouble = Math.random() < 0.25;
      bs.nextBlink = elapsed + 4;
    }

    const timeSinceTrigger = elapsed - (bs.nextBlink - 4);
    if (timeSinceTrigger < 0.22) {
      const t = timeSinceTrigger / 0.22;
      blink = t < 0.4
        ? Math.pow(t / 0.4, 2.0)
        : Math.cos(((t - 0.4) / 0.6) * Math.PI * 0.5);
    } else if (bs.isDouble && timeSinceTrigger > 0.35 && timeSinceTrigger < 0.57) {
      const t = (timeSinceTrigger - 0.35) / 0.22;
      blink = t < 0.4
        ? Math.pow(t / 0.4, 2.0)
        : Math.cos(((t - 0.4) / 0.6) * Math.PI * 0.5);
    }

    // --- Smile logic ---
    // Mouse hover smile on screen 1, scripted smile during caption + reply
    const cursorDist = Math.sqrt(m.worldX * m.worldX + m.worldY * m.worldY);
    const mouseSmile = cursorDist < 2.5 ? 1 : 0;
    const scrollSmile = (offset >= 0.58 && offset < 0.70) || offset >= 0.68 ? 1 : 0;
    const smileTarget = overrideBlend > 0.5 ? scrollSmile : mouseSmile;
    smileRef.current += (smileTarget - smileRef.current) * 0.05;

    materialRef.current.uniforms.uTime.value = elapsed;
    materialRef.current.uniforms.uIntro.value = intro;
    materialRef.current.uniforms.uBlink.value = blink;
    materialRef.current.uniforms.uSmile.value = smileRef.current;
    materialRef.current.uniforms.uMouse.value.set(finalMouseX, finalMouseY);
  });

  if (!shader || !meshData) return null;

  return (
    <group ref={groupRef}>
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[meshData.positions, 3]}
            count={PARTICLE_COUNT}
          />
          <bufferAttribute
            attach="attributes-aNormal"
            args={[meshData.normals, 3]}
            count={PARTICLE_COUNT}
          />
          <bufferAttribute
            attach="attributes-aStartPos"
            args={[meshData.startPositions, 3]}
            count={PARTICLE_COUNT}
          />
          <bufferAttribute
            attach="attributes-aBlinkDelta"
            args={[meshData.blinkDelta, 3]}
            count={PARTICLE_COUNT}
          />
          <bufferAttribute
            attach="attributes-aSmileDelta"
            args={[meshData.smileDelta, 3]}
            count={PARTICLE_COUNT}
          />
          <bufferAttribute
            attach="attributes-aChar"
            args={[meshData.charIndices, 1]}
            count={PARTICLE_COUNT}
          />
          <bufferAttribute
            attach="attributes-aSeed"
            args={[meshData.seeds, 1]}
            count={PARTICLE_COUNT}
          />
        </bufferGeometry>
        <primitive object={shader} ref={materialRef} attach="material" />
      </points>
    </group>
  );
}

useGLTF.preload("/face2.glb");
