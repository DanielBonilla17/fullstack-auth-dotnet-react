import React, { useRef, useMemo, useEffect, useCallback, useState } from 'react';
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber';
import { OrbitControls, shaderMaterial, Html } from '@react-three/drei';
import * as THREE from 'three';

// =============================================================
// 1. CUSTOM SHADER: Sol com Plasma Animado
// =============================================================
const SunShaderMaterial = shaderMaterial(
  { uTime: 0 },
  // Vertex Shader
  /* glsl */ `
    varying vec2 vUv;
    varying vec3 vNormal;
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment Shader — Plasma solar animado
  /* glsl */ `
    uniform float uTime;
    varying vec2 vUv;
    varying vec3 vNormal;

    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x * 34.0) + 10.0) * x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

    float snoise(vec3 v) {
      const vec2 C = vec2(1.0/6.0, 1.0/3.0);
      const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i  = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;
      i = mod289(i);
      vec4 p = permute(permute(permute(
                i.z + vec4(0.0, i1.z, i2.z, 1.0))
              + i.y + vec4(0.0, i1.y, i2.y, 1.0))
              + i.x + vec4(0.0, i1.x, i2.x, 1.0));
      float n_ = 0.142857142857;
      vec3 ns = n_ * D.wyz - D.xzx;
      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);
      vec4 x = x_ * ns.x + ns.yyyy;
      vec4 y = y_ * ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);
      vec4 s0 = floor(b0) * 2.0 + 1.0;
      vec4 s1 = floor(b1) * 2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
      vec3 p0 = vec3(a0.xy, h.x);
      vec3 p1 = vec3(a0.zw, h.y);
      vec3 p2 = vec3(a1.xy, h.z);
      vec3 p3 = vec3(a1.zw, h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
      p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }

    float fbm(vec3 p) {
      float f = 0.0;
      f += 0.5000 * snoise(p); p *= 2.01;
      f += 0.2500 * snoise(p); p *= 2.02;
      f += 0.1250 * snoise(p); p *= 2.03;
      f += 0.0625 * snoise(p);
      return f;
    }

    void main() {
      vec3 coord = vec3(vUv * 6.0, uTime * 0.15);
      float n = fbm(coord);
      float n2 = fbm(coord + vec3(5.2, 1.3, uTime * 0.08));

      vec3 deepRed   = vec3(0.6, 0.05, 0.0);
      vec3 orange     = vec3(1.0, 0.45, 0.0);
      vec3 yellow     = vec3(1.0, 0.85, 0.3);
      vec3 white      = vec3(1.0, 0.98, 0.9);

      float t = n * 0.5 + 0.5;
      vec3 col = mix(deepRed, orange, smoothstep(0.0, 0.35, t));
      col = mix(col, yellow, smoothstep(0.35, 0.65, t));
      col = mix(col, white, smoothstep(0.65, 0.95, t));

      float spots = smoothstep(0.15, 0.2, n2 * n2);
      col *= spots * 0.4 + 0.6;

      float limb = pow(max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0), 0.35);
      col *= limb * 0.45 + 0.55;

      col *= 1.6;
      gl_FragColor = vec4(col, 1.0);
    }
  `
);

extend({ SunShaderMaterial });

declare module '@react-three/fiber' {
  interface ThreeElements {
    sunShaderMaterial: ThreeElements['shaderMaterial'] & {
      uTime?: number;
    };
  }
}

// =============================================================
// COMPONENTE: Label Flutuante com Glassmorphism (Hover e Hold nos astros)
// =============================================================
function PlanetLabel({
  name,
  tag,
  description,
  isHeld = false,
  isMoon = false,
  yOffset,
}: {
  name: string;
  tag?: string;
  description?: string;
  isHeld?: boolean;
  isMoon?: boolean;
  yOffset: number;
}) {
  return (
    <Html distanceFactor={140} center position={[0, yOffset, 0]} pointerEvents="none">
      <div className="flex flex-col items-center pointer-events-none select-none transition-all duration-200">
        <div
          className={`backdrop-blur-md border rounded-xl shadow-2xl transition-all duration-200 ${
            isHeld
              ? 'bg-slate-950/95 border-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.45)] px-4 py-3 min-w-[220px] max-w-[280px] scale-105'
              : 'bg-slate-950/90 border-cyan-400/60 shadow-[0_0_20px_rgba(56,189,248,0.4)] px-3.5 py-1.5'
          }`}
        >
          {/* Cabeçalho */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  isHeld
                    ? 'bg-amber-400 animate-ping'
                    : isMoon
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-cyan-400 animate-pulse'
                }`}
              />
              <span className="text-white font-bold text-xs tracking-wider uppercase font-mono">
                {name}
              </span>
              {isMoon && (
                <span className="text-[10px] text-amber-300/80 font-sans">
                  (Satélite)
                </span>
              )}
            </div>

            {isHeld ? (
              <span className="text-[9px] text-amber-300 font-bold bg-amber-950/90 px-1.5 py-0.5 rounded border border-amber-500/70 font-mono tracking-wide">
                🔒 SEGURO
              </span>
            ) : (
              <span className="text-[9px] text-slate-400/80 font-sans italic">
                Segure o clique 🔒
              </span>
            )}
          </div>

          {/* Subtítulo / Tag */}
          {tag && (
            <div className="text-[11px] text-cyan-300/90 font-medium mt-0.5 font-sans">
              {tag}
            </div>
          )}

          {/* Descrição detalhada visível quando segurado */}
          {isHeld && description && (
            <div className="text-[11px] text-slate-200 leading-relaxed font-sans border-t border-slate-800/80 pt-2 mt-2">
              {description}
              <div className="text-[9px] text-amber-400/80 mt-1.5 font-mono">
                Solte o botão para continuar a órbita
              </div>
            </div>
          )}
        </div>

        {/* Linha indicadora vertical */}
        <div
          className={`w-[1px] h-3 transition-colors ${
            isHeld
              ? 'bg-gradient-to-b from-amber-400 to-transparent'
              : 'bg-gradient-to-b from-cyan-400/80 to-transparent'
          }`}
        />
      </div>
    </Html>
  );
}

// =============================================================
// 2. COMPONENTE: Sol com Shader + Corona + Luz + Hover + Hold
// =============================================================
function Sun({ onHoldChange }: { onHoldChange?: (held: boolean) => void }) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const [hovered, setHovered] = useState(false);
  const [isHeld, setIsHeld] = useState(false);

  useEffect(() => {
    if (!isHeld) return;
    const handleUp = () => {
      setIsHeld(false);
      onHoldChange?.(false);
    };
    window.addEventListener('pointerup', handleUp);
    return () => window.removeEventListener('pointerup', handleUp);
  }, [isHeld, onHoldChange]);

  useFrame((_state, delta) => {
    if (isHeld) return;
    if (matRef.current) {
      (matRef.current as any).uTime += delta;
    }
  });

  return (
    <group
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'auto';
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
        setIsHeld(true);
        onHoldChange?.(true);
      }}
    >
      <mesh>
        <sphereGeometry args={[30, 32, 32]} />
        <meshBasicMaterial
          color="#f59e0b"
          transparent
          opacity={0.18}
          side={THREE.BackSide}
        />
      </mesh>

      <mesh>
        <sphereGeometry args={[26, 64, 64]} />
        <sunShaderMaterial ref={matRef} uTime={0} />
      </mesh>

      <pointLight intensity={4.0} distance={2000} decay={0.5} color="#fff7ed" />

      {(hovered || isHeld) && (
        <PlanetLabel
          name="Sol"
          tag="Estrela Central • Tipo G2V"
          description="Contém 99.86% da massa do Sistema Solar. Seu núcleo queima hidrogênio a mais de 15 milhões de °C."
          isHeld={isHeld}
          yOffset={35}
        />
      )}
    </group>
  );
}

// =============================================================
// 3. ESTRELAS FIXAS (partículas 100% estáticas — sem shader, sem piscada)
// =============================================================
function FixedStars({ count = 1800 }: { count?: number }) {
  const { geometry, material } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 650 + Math.random() * 450;

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      const temp = Math.random();
      if (temp < 0.65) {
        colors[i * 3] = 1; colors[i * 3 + 1] = 1; colors[i * 3 + 2] = 1;
      } else if (temp < 0.88) {
        colors[i * 3] = 1; colors[i * 3 + 1] = 0.95; colors[i * 3 + 2] = 0.82;
      } else {
        colors[i * 3] = 0.82; colors[i * 3 + 1] = 0.9; colors[i * 3 + 2] = 1;
      }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 1.2,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: false,
      depthWrite: false,
    });

    return { geometry: geom, material: mat };
  }, [count]);

  return <points geometry={geometry} material={material} />;
}

// =============================================================
// 4. COMETAS ALEATÓRIOS (pool pré-alocado, zero alocações por frame)
// =============================================================
const ORBIT_CEILING = 220;
const TAIL_SEGMENTS = 10;

function SingleComet({ initialDelay }: { initialDelay: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const tailGroupRef = useRef<THREE.Group>(null);

  const stateRef = useRef({
    active: false,
    cooldown: initialDelay,
    progress: 0,
    speed: 0.04,
    startPos: new THREE.Vector3(),
    endPos: new THREE.Vector3(),
    controlPoint: new THREE.Vector3(),
  });

  const respawn = useCallback(() => {
    const s = stateRef.current;
    const angleIn = Math.random() * Math.PI * 2;
    const angleOut = angleIn + Math.PI * (0.6 + Math.random() * 0.8);
    const distIn = 550 + Math.random() * 250;
    const distOut = 550 + Math.random() * 250;
    const goAbove = Math.random() > 0.3;
    const baseY = goAbove ? ORBIT_CEILING : -ORBIT_CEILING;
    const peakY = baseY + (goAbove ? 1 : -1) * (60 + Math.random() * 120);

    s.startPos.set(
      Math.cos(angleIn) * distIn,
      baseY * 0.35 + (Math.random() - 0.5) * 40,
      Math.sin(angleIn) * distIn
    );
    s.endPos.set(
      Math.cos(angleOut) * distOut,
      baseY * 0.35 + (Math.random() - 0.5) * 40,
      Math.sin(angleOut) * distOut
    );
    s.controlPoint.set(
      (s.startPos.x + s.endPos.x) / 2,
      peakY,
      (s.startPos.z + s.endPos.z) / 2
    );
    s.speed = 0.035 + Math.random() * 0.045;
    s.progress = 0;
    s.active = true;
    s.cooldown = 0;
  }, []);

  useFrame((_state, delta) => {
    const s = stateRef.current;
    const group = groupRef.current;
    if (!group) return;

    if (!s.active) {
      s.cooldown -= delta;
      if (s.cooldown <= 0) {
        respawn();
        group.visible = true;
      } else {
        group.visible = false;
        return;
      }
    }

    s.progress += s.speed * delta;
    if (s.progress >= 1) {
      s.active = false;
      s.cooldown = 6 + Math.random() * 16;
      group.visible = false;
      return;
    }

    const t = s.progress;
    const oneMinusT = 1 - t;
    const posX = oneMinusT * oneMinusT * s.startPos.x + 2 * oneMinusT * t * s.controlPoint.x + t * t * s.endPos.x;
    const posY = oneMinusT * oneMinusT * s.startPos.y + 2 * oneMinusT * t * s.controlPoint.y + t * t * s.endPos.y;
    const posZ = oneMinusT * oneMinusT * s.startPos.z + 2 * oneMinusT * t * s.controlPoint.z + t * t * s.endPos.z;

    if (headRef.current) {
      headRef.current.position.set(posX, posY, posZ);
      const alpha = Math.min(1, t * 6) * Math.min(1, (1 - t) * 6);
      (headRef.current.material as THREE.MeshBasicMaterial).opacity = alpha;
    }

    if (glowRef.current) {
      glowRef.current.position.set(posX, posY, posZ);
      const alpha = Math.min(1, t * 6) * Math.min(1, (1 - t) * 6) * 0.2;
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity = alpha;
    }

    if (tailGroupRef.current) {
      const alpha = Math.min(1, t * 6) * Math.min(1, (1 - t) * 6);
      const children = tailGroupRef.current.children as THREE.Mesh[];
      for (let i = 0; i < children.length; i++) {
        const segT = Math.max(0, t - (i + 1) * 0.007);
        const omt = 1 - segT;
        const segX = omt * omt * s.startPos.x + 2 * omt * segT * s.controlPoint.x + segT * segT * s.endPos.x;
        const segY = omt * omt * s.startPos.y + 2 * omt * segT * s.controlPoint.y + segT * segT * s.endPos.y;
        const segZ = omt * omt * s.startPos.z + 2 * omt * segT * s.controlPoint.z + segT * segT * s.endPos.z;
        children[i].position.set(segX, segY, segZ);
        const fade = (1 - (i + 1) / (children.length + 1)) * alpha * 0.55;
        (children[i].material as THREE.MeshBasicMaterial).opacity = fade;
      }
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      {/* Cabeça */}
      <mesh ref={headRef}>
        <sphereGeometry args={[0.7, 10, 10]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0} />
      </mesh>
      {/* Glow */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[2.5, 8, 8]} />
        <meshBasicMaterial color="#60a5fa" transparent opacity={0} side={THREE.BackSide} />
      </mesh>
      {/* Cauda pré-alocada */}
      <group ref={tailGroupRef}>
        {Array.from({ length: TAIL_SEGMENTS }).map((_, i) => {
          const scale = 0.45 * (1 - i / TAIL_SEGMENTS) + 0.12;
          return (
            <mesh key={i}>
              <sphereGeometry args={[scale, 6, 6]} />
              <meshBasicMaterial color="#93c5fd" transparent opacity={0} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

function Comets({ maxComets = 3 }: { maxComets?: number }) {
  return (
    <group>
      {Array.from({ length: maxComets }).map((_, i) => (
        <SingleComet key={i} initialDelay={2 + i * 5 + Math.random() * 4} />
      ))}
    </group>
  );
}

// =============================================================
// 4b. ASTERÓIDES (pool pré-alocado, sem recriação por frame)
// =============================================================
function SingleAsteroid({ initialDelay, geomIndex }: { initialDelay: number; geomIndex: number }) {
  const meshRef = useRef<THREE.Mesh>(null);

  const stateRef = useRef({
    active: false,
    cooldown: initialDelay,
    progress: 0,
    speed: 0.025,
    startPos: new THREE.Vector3(),
    endPos: new THREE.Vector3(),
    rotSpeed: new THREE.Vector3(
      (Math.random() - 0.5) * 3,
      (Math.random() - 0.5) * 3,
      (Math.random() - 0.5) * 3
    ),
    scale: 0.5 + Math.random() * 1.6,
  });

  const respawn = useCallback(() => {
    const s = stateRef.current;
    const angle = Math.random() * Math.PI * 2;
    const dist = 480 + Math.random() * 180;
    const exitAngle = angle + Math.PI * (0.6 + Math.random() * 0.8);
    const exitDist = 480 + Math.random() * 180;
    const ySign = Math.random() > 0.5 ? 1 : -1;
    const yVal = ySign * (40 + Math.random() * 80);

    s.startPos.set(Math.cos(angle) * dist, yVal, Math.sin(angle) * dist);
    s.endPos.set(Math.cos(exitAngle) * exitDist, yVal + (Math.random() - 0.5) * 40, Math.sin(exitAngle) * exitDist);
    s.speed = 0.02 + Math.random() * 0.05;
    s.progress = 0;
    s.active = true;
    s.cooldown = 0;
  }, []);

  const geometry = useMemo(() => {
    const geom = new THREE.IcosahedronGeometry(1, geomIndex % 2 === 0 ? 0 : 1);
    const pos = geom.attributes.position;
    for (let j = 0; j < pos.count; j++) {
      const x = pos.getX(j);
      const y = pos.getY(j);
      const z = pos.getZ(j);
      const noise = 0.7 + Math.random() * 0.6;
      pos.setXYZ(j, x * noise, y * noise, z * noise);
    }
    pos.needsUpdate = true;
    geom.computeVertexNormals();
    return geom;
  }, [geomIndex]);

  const material = useMemo(() => {
    const colors = ['#78716c', '#57534e', '#a8a29e', '#52525b', '#64748b'];
    return new THREE.MeshStandardMaterial({
      color: colors[geomIndex % colors.length],
      roughness: 0.95,
      metalness: 0.15,
      flatShading: true,
      transparent: true,
      opacity: 0,
    });
  }, [geomIndex]);

  useFrame((_state, delta) => {
    const s = stateRef.current;
    const mesh = meshRef.current;
    if (!mesh) return;

    if (!s.active) {
      s.cooldown -= delta;
      if (s.cooldown <= 0) {
        respawn();
        mesh.visible = true;
      } else {
        mesh.visible = false;
        return;
      }
    }

    s.progress += s.speed * delta;
    if (s.progress >= 1) {
      s.active = false;
      s.cooldown = 4 + Math.random() * 12;
      mesh.visible = false;
      return;
    }

    const t = s.progress;
    mesh.position.lerpVectors(s.startPos, s.endPos, t);
    mesh.position.y += Math.sin(t * Math.PI) * 30;

    mesh.rotation.x += s.rotSpeed.x * delta;
    mesh.rotation.y += s.rotSpeed.y * delta;
    mesh.rotation.z += s.rotSpeed.z * delta;

    const fade = Math.min(1, t * 6) * Math.min(1, (1 - t) * 6);
    (mesh.material as THREE.MeshStandardMaterial).opacity = fade;
  });

  return <mesh ref={meshRef} geometry={geometry} material={material} scale={stateRef.current.scale} visible={false} />;
}

function Asteroids({ maxAsteroids = 6 }: { maxAsteroids?: number }) {
  return (
    <group>
      {Array.from({ length: maxAsteroids }).map((_, i) => (
        <SingleAsteroid key={i} geomIndex={i} initialDelay={1 + i * 3 + Math.random() * 3} />
      ))}
    </group>
  );
}

// =============================================================
// 5. LUZ QUE ACOMPANHA A CÂMERA (iluminação adaptativa ao zoom)
// =============================================================
function CameraFollowLight() {
  const lightRef = useRef<THREE.PointLight>(null);
  const { camera } = useThree();

  useFrame(() => {
    if (lightRef.current) {
      // A luz segue a posição da câmera
      lightRef.current.position.copy(camera.position);

      // Quanto mais perto a câmera, mais intensa a luz fill
      const dist = camera.position.length();
      // De 100 (perto) a 700 (longe) → intensidade de 2.5 a 0.3
      const intensity = THREE.MathUtils.clamp(
        THREE.MathUtils.mapLinear(dist, 100, 700, 2.5, 0.3),
        0.3,
        2.5
      );
      lightRef.current.intensity = intensity;
    }
  });

  return (
    <pointLight
      ref={lightRef}
      color="#94a3b8"
      intensity={1.0}
      distance={600}
      decay={1.2}
    />
  );
}

// =============================================================
// 6. GERADOR DE TEXTURAS PROCEDURAIS
// =============================================================
function useProceduralTexture(
  baseColor: string,
  accentColor: string,
  options?: {
    isStriped?: boolean;
    stripeColors?: string[];
    noiseScale?: number;
    noiseCount?: number;
  }
): THREE.CanvasTexture {
  return useMemo(() => {
    const size = 1024;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size / 2;
    const ctx = c.getContext('2d')!;

    const grad = ctx.createLinearGradient(0, 0, 0, c.height);
    grad.addColorStop(0, baseColor);
    grad.addColorStop(0.5, accentColor);
    grad.addColorStop(1, baseColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, c.width, c.height);

    if (options?.isStriped) {
      const colors = options.stripeColors || [baseColor, accentColor, '#fde68a', '#78350f', '#fef3c7'];
      for (let y = 0; y < c.height; y += 8) {
        const bandIdx = Math.floor((y / 8) % colors.length);
        ctx.fillStyle = colors[bandIdx];
        ctx.globalAlpha = 0.6 + Math.random() * 0.3;
        ctx.fillRect(0, y, c.width, 8 + Math.random() * 4);
      }
      ctx.globalAlpha = 1;

      for (let i = 0; i < 250; i++) {
        ctx.fillStyle = `rgba(${Math.floor(Math.random() * 80 + 120)}, ${Math.floor(Math.random() * 60 + 60)}, ${Math.floor(Math.random() * 30)}, 0.15)`;
        const rx = Math.random() * c.width;
        const ry = Math.random() * c.height;
        ctx.beginPath();
        ctx.ellipse(rx, ry, Math.random() * 60 + 20, Math.random() * 6 + 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      const count = options?.noiseCount ?? 120;
      for (let i = 0; i < count; i++) {
        const r = Math.random() * 255;
        const g = Math.random() * 200;
        const b = Math.random() * 150;
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${Math.random() * 0.25 + 0.05})`;
        ctx.beginPath();
        ctx.arc(
          Math.random() * c.width,
          Math.random() * c.height,
          Math.random() * (options?.noiseScale ?? 50) + 8,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }

      for (let i = 0; i < 30; i++) {
        ctx.strokeStyle = `rgba(0, 0, 0, ${Math.random() * 0.15})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(
          Math.random() * c.width,
          Math.random() * c.height,
          Math.random() * 15 + 3,
          0,
          Math.PI * 2
        );
        ctx.stroke();
      }
    }

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }, [baseColor, accentColor]);
}

// =============================================================
// 7. COMPONENTE: Linha de órbita
// =============================================================
function OrbitLine({ radius }: { radius: number }) {
  const geometry = useMemo(() => {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= 128; i++) {
      const angle = (i / 128) * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [radius]);

  return (
    <line geometry={geometry}>
      <lineBasicMaterial color="#ffffff" transparent opacity={0.06} />
    </line>
  );
}

// =============================================================
// COMPONENTE: Satélite Natural (Lua) orbitando o planeta + Hold
// =============================================================
interface MoonProps {
  name: string;
  size: number;
  distance: number;
  orbitSpeed: number;
  color: string;
  description?: string;
  roughness?: number;
  inclination?: number;
  onHoldChange?: (held: boolean) => void;
}

function Moon({
  name,
  size,
  distance,
  orbitSpeed,
  color,
  description,
  roughness = 0.85,
  inclination = 0,
  onHoldChange,
}: MoonProps) {
  const pivotRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const [isHeld, setIsHeld] = useState(false);

  useEffect(() => {
    if (!isHeld) return;
    const handleUp = () => {
      setIsHeld(false);
      onHoldChange?.(false);
    };
    window.addEventListener('pointerup', handleUp);
    return () => window.removeEventListener('pointerup', handleUp);
  }, [isHeld, onHoldChange]);

  useFrame((_state, delta) => {
    if (isHeld) return; // Pausa se segurado!
    if (pivotRef.current) {
      pivotRef.current.rotation.y += orbitSpeed * delta;
    }
  });

  return (
    <group rotation={[inclination, 0, 0]}>
      {/* Órbita suave da lua */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[distance - 0.06, distance + 0.06, 48]} />
        <meshBasicMaterial color="#94a3b8" transparent opacity={0.12} side={THREE.DoubleSide} />
      </mesh>

      <group ref={pivotRef}>
        <group position={[distance, 0, 0]}>
          <mesh
            onPointerOver={(e) => {
              e.stopPropagation();
              setHovered(true);
              document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
              setHovered(false);
              document.body.style.cursor = 'auto';
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
              setIsHeld(true);
              onHoldChange?.(true);
            }}
          >
            <sphereGeometry args={[size, 20, 20]} />
            <meshStandardMaterial color={color} roughness={roughness} metalness={0.1} />
          </mesh>

          {(hovered || isHeld) && (
            <PlanetLabel
              name={name}
              description={description}
              isHeld={isHeld}
              isMoon={true}
              yOffset={size + 2.2}
            />
          )}
        </group>
      </group>
    </group>
  );
}

// =============================================================
// 8. COMPONENTE: Planeta Genérico com Material PBR + Hover + Hold + Luas
// =============================================================
interface PlanetProps {
  name: string;
  tag?: string;
  description?: string;
  size: number;
  distance: number;
  orbitSpeed: number;
  rotationSpeed: number;
  baseColor: string;
  accentColor: string;
  tilt?: number;
  isStriped?: boolean;
  stripeColors?: string[];
  roughness?: number;
  metalness?: number;
  onHoldChange?: (held: boolean) => void;
  children?: React.ReactNode;
}

function Planet({
  name,
  tag,
  description,
  size,
  distance,
  orbitSpeed,
  rotationSpeed,
  baseColor,
  accentColor,
  tilt = 0,
  isStriped = false,
  stripeColors,
  roughness = 0.75,
  metalness = 0.1,
  onHoldChange,
  children,
}: PlanetProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const pivotRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const [isHeld, setIsHeld] = useState(false);
  const texture = useProceduralTexture(baseColor, accentColor, { isStriped, stripeColors });

  useEffect(() => {
    if (!isHeld) return;
    const handleUp = () => {
      setIsHeld(false);
      onHoldChange?.(false);
    };
    window.addEventListener('pointerup', handleUp);
    return () => window.removeEventListener('pointerup', handleUp);
  }, [isHeld, onHoldChange]);

  useFrame((_state, delta) => {
    if (isHeld) return; // Congela órbita e rotação se segurado!
    if (meshRef.current) meshRef.current.rotation.y += rotationSpeed * delta;
    if (pivotRef.current) pivotRef.current.rotation.y += orbitSpeed * delta;
  });

  return (
    <>
      <OrbitLine radius={distance} />
      <group ref={pivotRef}>
        <group position={[distance, 0, 0]}>
          <mesh
            ref={meshRef}
            rotation={[0, 0, tilt]}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHovered(true);
              document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
              setHovered(false);
              document.body.style.cursor = 'auto';
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
              setIsHeld(true);
              onHoldChange?.(true);
            }}
          >
            <sphereGeometry args={[size, 48, 48]} />
            <meshStandardMaterial
              map={texture}
              roughness={roughness}
              metalness={metalness}
            />
          </mesh>

          {(hovered || isHeld) && (
            <PlanetLabel
              name={name}
              tag={tag}
              description={description}
              isHeld={isHeld}
              yOffset={size * 1.25 + 3.2}
            />
          )}

          {/* Satélites / Luas do planeta */}
          {children}
        </group>
      </group>
    </>
  );
}

// =============================================================
// 9. COMPONENTE: Terra com Nuvens + Halo + Hover + Hold + Lua
// =============================================================
function Earth({
  distance,
  onHoldChange,
}: {
  distance: number;
  onHoldChange?: (held: boolean) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const pivotRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const [isHeld, setIsHeld] = useState(false);

  useEffect(() => {
    if (!isHeld) return;
    const handleUp = () => {
      setIsHeld(false);
      onHoldChange?.(false);
    };
    window.addEventListener('pointerup', handleUp);
    return () => window.removeEventListener('pointerup', handleUp);
  }, [isHeld, onHoldChange]);

  const earthTexture = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 512;
    const ctx = c.getContext('2d')!;

    const oceanGrad = ctx.createLinearGradient(0, 0, 0, c.height);
    oceanGrad.addColorStop(0, '#0c4a6e');
    oceanGrad.addColorStop(0.3, '#0369a1');
    oceanGrad.addColorStop(0.5, '#0284c7');
    oceanGrad.addColorStop(0.7, '#0369a1');
    oceanGrad.addColorStop(1, '#0c4a6e');
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, 0, c.width, c.height);

    const continentColors = ['#15803d', '#166534', '#22c55e', '#a16207', '#854d0e', '#78716c'];
    for (let i = 0; i < 50; i++) {
      ctx.fillStyle = continentColors[Math.floor(Math.random() * continentColors.length)];
      ctx.globalAlpha = 0.5 + Math.random() * 0.4;
      ctx.beginPath();
      const cx = Math.random() * c.width;
      const cy = c.height * 0.15 + Math.random() * c.height * 0.7;
      ctx.ellipse(cx, cy, Math.random() * 100 + 30, Math.random() * 50 + 15, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 0.7;
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(0, 0, c.width, 25);
    ctx.fillRect(0, c.height - 25, c.width, 25);
    ctx.globalAlpha = 1;

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    return tex;
  }, []);

  const cloudTexture = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 512;
    const ctx = c.getContext('2d')!;

    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fillRect(0, 0, c.width, c.height);

    for (let i = 0; i < 180; i++) {
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.25 + 0.05})`;
      ctx.beginPath();
      ctx.ellipse(
        Math.random() * c.width,
        Math.random() * c.height,
        Math.random() * 80 + 20,
        Math.random() * 20 + 5,
        Math.random() * Math.PI,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    return new THREE.CanvasTexture(c);
  }, []);

  useFrame((_state, delta) => {
    if (isHeld) return; // Pausa se segurado!
    if (meshRef.current) meshRef.current.rotation.y += 0.4 * delta;
    if (cloudsRef.current) cloudsRef.current.rotation.y += 0.5 * delta;
    if (pivotRef.current) pivotRef.current.rotation.y += 0.08 * delta;
  });

  return (
    <>
      <OrbitLine radius={distance} />
      <group ref={pivotRef}>
        <group position={[distance, 0, 0]}>
          <mesh
            ref={meshRef}
            rotation={[0, 0, 0.41]}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHovered(true);
              document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
              setHovered(false);
              document.body.style.cursor = 'auto';
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
              setIsHeld(true);
              onHoldChange?.(true);
            }}
          >
            <sphereGeometry args={[6.2, 64, 64]} />
            <meshStandardMaterial
              map={earthTexture}
              roughness={0.6}
              metalness={0.15}
            />
          </mesh>

          <mesh ref={cloudsRef} rotation={[0, 0, 0.41]}>
            <sphereGeometry args={[6.35, 48, 48]} />
            <meshStandardMaterial
              map={cloudTexture}
              transparent
              opacity={0.4}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>

          <mesh>
            <sphereGeometry args={[6.6, 32, 32]} />
            <meshBasicMaterial
              color="#38bdf8"
              transparent
              opacity={0.08}
              side={THREE.BackSide}
            />
          </mesh>

          {(hovered || isHeld) && (
            <PlanetLabel
              name="Terra"
              tag="Planeta Rochoso • Nosso Lar"
              description="Único mundo conhecido com água líquida em abundância e vida. Possui atmosfera rica em N₂ e O₂ e 1 satélite natural."
              isHeld={isHeld}
              yOffset={6.2 * 1.25 + 3.2}
            />
          )}

          {/* Lua da Terra */}
          <Moon
            name="Lua"
            description="Quinto maior satélite natural do sistema solar, influencia as marés oceânicas e estabiliza o eixo de rotação da Terra."
            size={1.5}
            distance={13.5}
            orbitSpeed={0.9}
            color="#e2e8f0"
            onHoldChange={onHoldChange}
          />
        </group>
      </group>
    </>
  );
}

// =============================================================
// 10. COMPONENTE: Saturno com Anel 3D + Hover + Hold + Luas
// =============================================================
function Saturn({
  distance,
  onHoldChange,
}: {
  distance: number;
  onHoldChange?: (held: boolean) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const pivotRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const [isHeld, setIsHeld] = useState(false);

  useEffect(() => {
    if (!isHeld) return;
    const handleUp = () => {
      setIsHeld(false);
      onHoldChange?.(false);
    };
    window.addEventListener('pointerup', handleUp);
    return () => window.removeEventListener('pointerup', handleUp);
  }, [isHeld, onHoldChange]);

  const texture = useProceduralTexture('#fef08a', '#ca8a04', {
    isStriped: true,
    stripeColors: ['#fef08a', '#ca8a04', '#fde68a', '#a16207', '#fef3c7'],
  });

  const ringTexture = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 64;
    const ctx = c.getContext('2d')!;

    const grad = ctx.createLinearGradient(0, 0, c.width, 0);
    grad.addColorStop(0.0, 'rgba(210, 180, 120, 0.0)');
    grad.addColorStop(0.08, 'rgba(210, 180, 120, 0.6)');
    grad.addColorStop(0.2, 'rgba(230, 200, 140, 0.8)');
    grad.addColorStop(0.32, 'rgba(180, 150, 100, 0.2)');
    grad.addColorStop(0.38, 'rgba(180, 150, 100, 0.2)');
    grad.addColorStop(0.42, 'rgba(220, 190, 130, 0.7)');
    grad.addColorStop(0.65, 'rgba(200, 170, 110, 0.5)');
    grad.addColorStop(0.85, 'rgba(180, 150, 90, 0.3)');
    grad.addColorStop(1.0, 'rgba(160, 130, 70, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, c.width, c.height);

    for (let i = 0; i < 500; i++) {
      ctx.fillStyle = `rgba(255, 240, 200, ${Math.random() * 0.12})`;
      ctx.fillRect(Math.random() * c.width, Math.random() * c.height, Math.random() * 3 + 1, c.height);
    }

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    return tex;
  }, []);

  useFrame((_state, delta) => {
    if (isHeld) return; // Pausa se segurado!
    if (meshRef.current) meshRef.current.rotation.y += 0.35 * delta;
    if (pivotRef.current) pivotRef.current.rotation.y += 0.026 * delta;
  });

  return (
    <>
      <OrbitLine radius={distance} />
      <group ref={pivotRef}>
        <group position={[distance, 0, 0]}>
          <mesh
            ref={meshRef}
            rotation={[0, 0, 0.47]}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHovered(true);
              document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
              setHovered(false);
              document.body.style.cursor = 'auto';
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
              setIsHeld(true);
              onHoldChange?.(true);
            }}
          >
            <sphereGeometry args={[11.5, 64, 64]} />
            <meshStandardMaterial map={texture} roughness={0.7} metalness={0.05} />
          </mesh>

          <mesh rotation={[Math.PI / 2.2, 0, 0]}>
            <ringGeometry args={[14, 28, 80]} />
            <meshStandardMaterial
              map={ringTexture}
              side={THREE.DoubleSide}
              transparent
              opacity={0.75}
              roughness={0.5}
            />
          </mesh>

          {(hovered || isHeld) && (
            <PlanetLabel
              name="Saturno"
              tag="Gigante Gasoso • Sistema de Anéis"
              description="Famoso por seus anéis magníficos de gelo e poeira. Sua densidade média é tão baixa que flutuaria na água."
              isHeld={isHeld}
              yOffset={11.5 * 1.25 + 3.5}
            />
          )}

          {/* Luas de Saturno */}
          <Moon
            name="Titã"
            description="Segunda maior lua do sistema solar, com densa atmosfera alaranjada e rios e mares de metano líquido."
            size={1.7}
            distance={36}
            orbitSpeed={0.85}
            color="#fbbf24"
            inclination={0.08}
            onHoldChange={onHoldChange}
          />
          <Moon
            name="Encélado"
            description="Lua congelada ultra-reflexiva que ejeta jatos de vapor d'água e matéria orgânica através de fendas no polo sul."
            size={0.75}
            distance={30}
            orbitSpeed={1.3}
            color="#f8fafc"
            inclination={-0.05}
            onHoldChange={onHoldChange}
          />
        </group>
      </group>
    </>
  );
}

// =============================================================
// 11. MOUSE TRAIL — Canvas 2D overlay
// =============================================================
interface TrailParticle {
  x: number;
  y: number;
  size: number;
  alpha: number;
  color: string;
}

function MouseTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: TrailParticle[] = [];
    const colors = ['#818cf8', '#c084fc', '#38bdf8', '#fbbf24', '#f43f5e', '#ec4899'];

    const onResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const onMove = (e: PointerEvent) => {
      if (particles.length > 25) return;
      particles.push({
        x: e.clientX + (Math.random() - 0.5) * 10,
        y: e.clientY + (Math.random() - 0.5) * 10,
        size: Math.random() * 3 + 1.2,
        alpha: 0.9,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    };

    let animId: number;
    const render = () => {
      animId = requestAnimationFrame(render);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = particles.length - 1; i >= 0; i--) {
        const pt = particles[i];
        pt.alpha -= 0.03;
        pt.size *= 0.95;

        if (pt.alpha <= 0) {
          particles.splice(i, 1);
        } else {
          ctx.save();
          ctx.globalAlpha = pt.alpha;
          ctx.fillStyle = pt.color;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    };

    window.addEventListener('resize', onResize);
    window.addEventListener('pointermove', onMove);
    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-10"
    />
  );
}

// =============================================================
// 13. COMPONENTE PRINCIPAL EXPORTADO
// =============================================================
interface SolarBackgroundProps {
  isModalOpen?: boolean;
}

export const SolarBackground: React.FC<SolarBackgroundProps> = ({ isModalOpen = false }) => {
  const [isAnyHeld, setIsAnyHeld] = useState(false);

  return (
    <>
      <div className="fixed inset-0 w-full h-full z-0">
        <Canvas
          dpr={[1, 1.5]}
          gl={{
            antialias: true,
            toneMappingExposure: 1.3,
            toneMapping: THREE.ACESFilmicToneMapping,
            powerPreference: 'high-performance',
          }}
          camera={{ position: [0, 190, 480], fov: 45, near: 0.1, far: 2500 }}
        >
          {/* Iluminação base */}
          <ambientLight intensity={0.15} color="#334155" />
          <hemisphereLight
            color="#e0f2fe"
            groundColor="#1e1b4b"
            intensity={0.4}
          />

          {/* Luz que segue a câmera (ilumina planetas ao fazer zoom) */}
          <CameraFollowLight />

          {/* Estrelas fixas (partículas estáticas) */}
          <FixedStars count={1800} />

          {/* Sol com shader de plasma + Hold */}
          <Sun onHoldChange={setIsAnyHeld} />

          {/* Cometas aleatórios (trajetórias acima do plano orbital) */}
          <Comets maxComets={3} />

          {/* Asteróides rochosos passando */}
          <Asteroids maxAsteroids={6} />

          {/* Mercúrio */}
          <Planet
            name="Mercúrio"
            tag="Planeta Rochoso • Sem luas"
            description="O menor e mais interno planeta. Sua superfície repleta de crateras atinge 430°C de dia e -180°C à noite devido à ausência de atmosfera protetora."
            baseColor="#9ca3af"
            accentColor="#4b5563"
            size={3.2}
            distance={55}
            orbitSpeed={0.15}
            rotationSpeed={0.05}
            roughness={0.9}
            onHoldChange={setIsAnyHeld}
          />

          {/* Vênus */}
          <Planet
            name="Vênus"
            tag="Planeta Rochoso • Atmosfera Densa"
            description="Planeta com efeito estufa descontrolado. Nuvens de ácido sulfúrico e temperaturas constantes de 465°C tornam Vênus o mais quente do sistema solar."
            baseColor="#fde68a"
            accentColor="#d97706"
            size={5.2}
            distance={85}
            orbitSpeed={0.11}
            rotationSpeed={-0.03}
            roughness={0.85}
            onHoldChange={setIsAnyHeld}
          />

          {/* Terra */}
          <Earth distance={125} onHoldChange={setIsAnyHeld} />

          {/* Marte */}
          <Planet
            name="Marte"
            tag="Planeta Vermelho • 2 Luas"
            description="Mundo desértico de óxido de ferro com calotas polares. Abriga o Monte Olimpo, o vulcão mais colossal de todo o sistema solar."
            baseColor="#ef4444"
            accentColor="#991b1b"
            size={4.4}
            distance={170}
            orbitSpeed={0.065}
            rotationSpeed={0.45}
            roughness={0.88}
            onHoldChange={setIsAnyHeld}
          >
            <Moon
              name="Fobos"
              description="Maior lua de Marte com órbita ultra-rápida, completando três voltas ao redor do planeta a cada dia marciano."
              size={0.65}
              distance={7.5}
              orbitSpeed={1.8}
              color="#a8a29e"
              onHoldChange={setIsAnyHeld}
            />
            <Moon
              name="Deimos"
              description="Segunda lua de Marte, menor e mais distante, com relevo suave e coberta por uma grossa camada de regolito."
              size={0.45}
              distance={11}
              orbitSpeed={1.1}
              color="#78716c"
              onHoldChange={setIsAnyHeld}
            />
          </Planet>

          {/* Júpiter */}
          <Planet
            name="Júpiter"
            tag="Maior Planeta • 4 Luas Galileanas"
            description="O titã gasoso com massa 2.5x superior a todos os planetas somados. Ostenta a Grande Mancha Vermelha, uma tempestade secular imensa."
            baseColor="#d97706"
            accentColor="#78350f"
            size={14.5}
            distance={235}
            orbitSpeed={0.035}
            rotationSpeed={0.8}
            isStriped
            stripeColors={['#d97706', '#78350f', '#fde68a', '#92400e', '#fef3c7']}
            roughness={0.7}
            onHoldChange={setIsAnyHeld}
          >
            <Moon
              name="Io"
              description="O corpo mais vulcanicamente ativo do sistema solar, com centenas de vulcões de enxofre em erupção contínua."
              size={1.3}
              distance={21}
              orbitSpeed={2.0}
              color="#facc15"
              onHoldChange={setIsAnyHeld}
            />
            <Moon
              name="Europa"
              description="Mundo recoberto por uma espessa crosta de gelo liso que oculta um vasto oceano salgado líquido com alto potencial biológico."
              size={1.1}
              distance={26}
              orbitSpeed={1.5}
              color="#e0f2fe"
              onHoldChange={setIsAnyHeld}
            />
            <Moon
              name="Ganímedes"
              description="A maior lua de todo o sistema solar, superior ao planeta Mercúrio em diâmetro e a única com campo magnético próprio."
              size={1.7}
              distance={32}
              orbitSpeed={1.0}
              color="#cbd5e1"
              onHoldChange={setIsAnyHeld}
            />
            <Moon
              name="Calisto"
              description="Superfície intensamente cravejada de crateras antigas e inalteradas há 4 bilhões de anos, com baixa atividade geológica."
              size={1.4}
              distance={39}
              orbitSpeed={0.7}
              color="#64748b"
              onHoldChange={setIsAnyHeld}
            />
          </Planet>

          {/* Saturno */}
          <Saturn distance={305} onHoldChange={setIsAnyHeld} />

          {/* Urano */}
          <Planet
            name="Urano"
            tag="Gigante de Gelo • 2 Luas"
            description="Planeta que orbita quase deitado com inclinação axial de 98°. Sua atmosfera azul-esverdeada é rica em metano gelado e hidrogênio."
            baseColor="#a5f3fc"
            accentColor="#0891b2"
            size={7.2}
            distance={370}
            orbitSpeed={0.018}
            rotationSpeed={0.5}
            tilt={1.71}
            roughness={0.65}
            metalness={0.2}
            onHoldChange={setIsAnyHeld}
          >
            <Moon
              name="Titânia"
              description="A maior lua de Urano, composta por rochas e gelo, cortada por profundos cânions e escarpamentos geológicos."
              size={1.0}
              distance={13}
              orbitSpeed={0.9}
              color="#cbd5e1"
              onHoldChange={setIsAnyHeld}
            />
            <Moon
              name="Oberon"
              description="Segunda maior lua uraniana, caracterizada por uma crosta antiga densamente pontilhada de crateras de impacto escuras."
              size={0.9}
              distance={17}
              orbitSpeed={0.65}
              color="#94a3b8"
              onHoldChange={setIsAnyHeld}
            />
          </Planet>

          {/* Netuno */}
          <Planet
            name="Netuno"
            tag="Gigante de Gelo • Tritão"
            description="O planeta mais afastado do Sol, azul e gélido. Possui os ventos supersônicos mais impetuosos do sistema solar, de até 2.100 km/h."
            baseColor="#818cf8"
            accentColor="#3730a3"
            size={7.0}
            distance={430}
            orbitSpeed={0.013}
            rotationSpeed={0.55}
            roughness={0.6}
            metalness={0.2}
            onHoldChange={setIsAnyHeld}
          >
            <Moon
              name="Tritão"
              description="Maior lua de Netuno e a única grande lua com órbita retrógrada. Possui criovulcões que disparam jatos de nitrogênio congelado."
              size={1.3}
              distance={14}
              orbitSpeed={-0.85}
              color="#a5f3fc"
              onHoldChange={setIsAnyHeld}
            />
          </Planet>

          {/* Controles orbitais — pausados se o usuário estiver segurando um planeta ou lua ou se o modal estiver aberto */}
          <OrbitControls
            enabled={!isAnyHeld && !isModalOpen}
            enablePan={false}
            minDistance={100}
            maxDistance={700}
            maxPolarAngle={Math.PI / 1.8}
            autoRotate={!isAnyHeld && !isModalOpen}
            autoRotateSpeed={0.12}
          />
        </Canvas>
      </div>

      <MouseTrail />
    </>
  );
};
