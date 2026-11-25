import React, { useMemo, useRef, useEffect, Component } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import * as THREE from 'three';

class WebGLErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-0 bg-[#050507]"
        />
      );
    }
    return this.props.children;
  }
}

function createSoftGlowSprite() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.28, 'rgba(245,230,200,0.92)');
  g.addColorStop(0.65, 'rgba(245,230,200,0.22)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

function sampleTextPoints(text, count = 2100, scaleX = 11.5, scaleY = 2.6) {
  const canvas = document.createElement('canvas');
  canvas.width = 1000;
  canvas.height = 240;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const fontSize = text.length > 10 ? 86 : 128;
  ctx.font = `700 ${fontSize}px "Cormorant Garamond", Georgia, serif`;
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const img = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const candidates = [];
  for (let y = 0; y < canvas.height; y += 3) {
    for (let x = 0; x < canvas.width; x += 3) {
      const alpha = img[(y * canvas.width + x) * 4];
      if (alpha > 110) {
        candidates.push([
          ((x / canvas.width) - 0.5) * scaleX,
          (0.5 - (y / canvas.height)) * scaleY,
          (Math.random() - 0.5) * 0.35,
        ]);
      }
    }
  }

  const out = new Float32Array(count * 3);
  if (!candidates.length) return out;
  for (let i = 0; i < count; i++) {
    const p = candidates[(i * 7 + Math.floor(Math.random() * 5)) % candidates.length];
    out[i * 3] = p[0];
    out[i * 3 + 1] = p[1];
    out[i * 3 + 2] = p[2];
  }
  return out;
}

function ParticleTitleMorph({ scrollRef, glowMap, morphTarget }) {
  const pointsRef = useRef();
  const count = 2100;

  const { startPos, wordAPos, wordBPos, smokeOffsets, colors } = useMemo(() => {
    const s = new Float32Array(count * 3);
    const smoke = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const gold = new THREE.Color('#F5E6C8');
    const white = new THREE.Color('#FFFFFF');

    for (let i = 0; i < count; i++) {
      s[i * 3] = (Math.random() - 0.5) * 14;
      s[i * 3 + 1] = (Math.random() - 0.5) * 5 + 0.6;
      s[i * 3 + 2] = (Math.random() - 0.5) * 6;
      smoke[i * 3] = (Math.random() - 0.5) * 3.8;
      smoke[i * 3 + 1] = (Math.random() - 0.5) * 2.6;
      smoke[i * 3 + 2] = (Math.random() - 0.5) * 3.2;

      const c = i % 3 === 0 ? white : gold;
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }

    return {
      startPos: s,
      wordAPos: sampleTextPoints('PORTFOLIO', count, 10.5, 2.5),
      wordBPos: sampleTextPoints('MANOJ KUMAR PR', count, 12.2, 2.2),
      smokeOffsets: smoke,
      colors: col,
    };
  }, []);

  const currentPos = useMemo(() => new Float32Array(startPos), [startPos]);
  const elapsedRef = useRef(0);

  useFrame((state, delta) => {
    const pts = pointsRef.current;
    if (!pts) return;
    elapsedRef.current += delta;
    const t = elapsedRef.current;
    const sp = scrollRef.current;

    // Fade visibility as user scrolls out of Hero
    const heroVis = THREE.MathUtils.clamp(1 - (sp - 0.04) * 8.5, 0, 1);
    pts.visible = heroVis > 0.02;
    if (!pts.visible) return;
    pts.material.opacity = heroVis * 0.92;

    // 0 -> 1.1s: form "PORTFOLIO"; 1.5s -> 2.8s: smoke burst -> "MANOJ KUMAR PR"
    const formA = THREE.MathUtils.smoothstep(t, 0.1, 1.1);
    const morphB = morphTarget !== undefined
      ? morphTarget
      : THREE.MathUtils.smoothstep(t, 1.6, 3.0);
    const smokeWave = Math.sin(morphB * Math.PI);

    const attr = pts.geometry.attributes.position;
    for (let i = 0; i < count; i++) {
      const ix = i * 3;
      const ax = THREE.MathUtils.lerp(startPos[ix], wordAPos[ix], formA);
      const ay = THREE.MathUtils.lerp(startPos[ix + 1], wordAPos[ix + 1], formA);
      const az = THREE.MathUtils.lerp(startPos[ix + 2], wordAPos[ix + 2], formA);

      const tx = THREE.MathUtils.lerp(ax, wordBPos[ix], morphB) + smokeOffsets[ix] * smokeWave;
      const ty = THREE.MathUtils.lerp(ay, wordBPos[ix + 1], morphB) + smokeOffsets[ix + 1] * smokeWave + 0.55;
      const tz = THREE.MathUtils.lerp(az, wordBPos[ix + 2], morphB) + smokeOffsets[ix + 2] * smokeWave;

      currentPos[ix] += (tx - currentPos[ix]) * 0.1 + Math.sin(t * 1.4 + i) * 0.002;
      currentPos[ix + 1] += (ty - currentPos[ix + 1]) * 0.1 + Math.cos(t * 1.2 + i) * 0.002;
      currentPos[ix + 2] += (tz - currentPos[ix + 2]) * 0.1;

      attr.array[ix] = currentPos[ix];
      attr.array[ix + 1] = currentPos[ix + 1];
      attr.array[ix + 2] = currentPos[ix + 2];
    }
    attr.needsUpdate = true;

    pts.rotation.y = state.pointer.x * 0.14;
    pts.rotation.x = -state.pointer.y * 0.08;
  });

  return (
    <points ref={pointsRef} position={[0, 0.3, -1.5]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={currentPos} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={count} array={colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={0.14}
        map={glowMap}
        vertexColors
        transparent
        opacity={0.92}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function AmbientSpaceField({ glowMap }) {
  const ref = useRef();
  const count = 480;
  const { positions, colors } = useMemo(() => {
    const p = new Float32Array(count * 3);
    const c = new Float32Array(count * 3);
    const gold = new THREE.Color('#F5E6C8');
    const white = new THREE.Color('#FFFFFF');
    for (let i = 0; i < count; i++) {
      p[i * 3] = (Math.random() - 0.5) * 42;
      p[i * 3 + 1] = (Math.random() - 0.5) * 24;
      p[i * 3 + 2] = (Math.random() - 0.5) * 45 - 8;
      const col = i % 2 === 0 ? gold : white;
      c[i * 3] = col.r;
      c[i * 3 + 1] = col.g;
      c[i * 3 + 2] = col.b;
    }
    return { positions: p, colors: c };
  }, []);

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.elapsedTime * 0.018 + state.pointer.x * 0.06;
    ref.current.rotation.x = state.pointer.y * 0.04;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={count} array={colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={0.16}
        map={glowMap}
        vertexColors
        transparent
        opacity={0.62}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function OrbitalHalo3D({ scrollRef }) {
  const groupRef = useRef();
  useFrame((state) => {
    const g = groupRef.current;
    if (!g) return;
    const sp = scrollRef.current;
    const dist = Math.abs(sp - 0.17);
    const vis = THREE.MathUtils.clamp(1 - dist * 8.5, 0, 1);
    g.visible = vis > 0.02;
    if (!g.visible) return;
    g.rotation.z = state.clock.elapsedTime * 0.12;
    g.rotation.x = Math.PI * 0.36 + state.pointer.y * 0.14;
    g.rotation.y = state.pointer.x * 0.18;
    g.scale.setScalar(0.85 + vis * 0.25);
  });

  return (
    <group ref={groupRef} position={[0, 0.2, -3.5]}>
      <mesh>
        <torusGeometry args={[4.4, 0.028, 16, 128]} />
        <meshBasicMaterial color="#F5E6C8" transparent opacity={0.65} />
      </mesh>
      <mesh rotation={[0.45, 0.35, 0]}>
        <torusGeometry args={[5.1, 0.015, 16, 128]} />
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.28} />
      </mesh>
    </group>
  );
}

export const TOOLKIT_NODES = [
  { name: 'Python', cat: 'Languages', pos: [2.8, 1.4, 0.8] },
  { name: 'Java', cat: 'Languages', pos: [-2.6, 1.6, 1.0] },
  { name: 'C', cat: 'Languages', pos: [-1.8, -1.9, 1.4] },
  { name: 'SQL', cat: 'Languages', pos: [1.5, -2.1, 1.2] },
  { name: 'React.js', cat: 'Frontend', pos: [2.4, 1.8, -1.2] },
  { name: 'JavaScript', cat: 'Frontend', pos: [-2.2, 0.4, 2.2] },
  { name: 'HTML5 / CSS3', cat: 'Frontend', pos: [0.6, 2.8, 0.9] },
  { name: 'MySQL', cat: 'Backend', pos: [-1.2, -2.3, -1.6] },
  { name: 'PostgreSQL', cat: 'Backend', pos: [2.6, -0.7, -1.9] },
  { name: 'Node / APIs', cat: 'Backend', pos: [-2.8, -0.6, -1.2] },
  { name: 'Pandas / NumPy', cat: 'Data', pos: [0.3, -2.8, 1.5] },
  { name: 'TensorFlow / ML', cat: 'Data', pos: [2.9, 0.2, 1.4] },
  { name: 'Tableau / EDA', cat: 'Data', pos: [-0.8, 2.5, -1.8] },
  { name: 'Git / GitHub', cat: 'Tools', pos: [1.7, 2.1, 1.9] },
  { name: 'VS Code / Eclipse', cat: 'Tools', pos: [-2.5, -1.5, 0.6] },
  { name: 'Manual Testing', cat: 'Core', pos: [1.3, -1.4, -2.5] },
  { name: 'DSA & OOP', cat: 'Core', pos: [-1.5, 1.9, -2.0] },
  { name: 'TCP/IP & Sec', cat: 'Core', pos: [0.1, -0.3, 3.1] },
];

function ConstellationSphere3D({ scrollRef, activeSkillCategory }) {
  const groupRef = useRef();
  const targetRot = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const match = TOOLKIT_NODES.find((n) => n.cat === activeSkillCategory);
    if (match) {
      targetRot.current = {
        y: -Math.atan2(match.pos[0], match.pos[2]) * 0.6,
        x: match.pos[1] * 0.14,
      };
    } else {
      targetRot.current = { x: 0, y: 0 };
    }
  }, [activeSkillCategory]);

  useFrame((state, delta) => {
    const g = groupRef.current;
    if (!g) return;
    const sp = scrollRef.current;
    const dist = Math.abs(sp - 0.56);
    const vis = THREE.MathUtils.clamp(1 - dist * 8.0, 0, 1);
    g.visible = vis > 0.02;
    if (!g.visible) return;

    if (activeSkillCategory === 'All') {
      g.rotation.y += delta * 0.22;
    } else {
      g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, targetRot.current.y + Math.sin(state.clock.elapsedTime * 0.4) * 0.15, 0.06);
      g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, targetRot.current.x, 0.06);
    }
    g.scale.setScalar(0.85 + vis * 0.15);
  });

  const edges = useMemo(() => {
    const list = [];
    for (let i = 0; i < TOOLKIT_NODES.length; i++) {
      const next = (i + 1) % TOOLKIT_NODES.length;
      list.push([TOOLKIT_NODES[i].pos, TOOLKIT_NODES[next].pos]);
      const cross = (i + 4) % TOOLKIT_NODES.length;
      list.push([TOOLKIT_NODES[i].pos, TOOLKIT_NODES[cross].pos]);
    }
    return list;
  }, []);

  return (
    <group ref={groupRef} position={[1.9, 0.1, -1.0]}>
      <mesh>
        <icosahedronGeometry args={[2.1, 1]} />
        <meshBasicMaterial color="#F5E6C8" wireframe transparent opacity={0.18} />
      </mesh>

      {edges.map((pts, i) => (
        <Line key={i} points={pts} color="#F5E6C8" transparent opacity={0.14} lineWidth={1} />
      ))}

      {TOOLKIT_NODES.map((node) => {
        const active = activeSkillCategory === 'All' || node.cat === activeSkillCategory;
        return (
          <group key={node.name} position={node.pos}>
            <mesh>
              <sphereGeometry args={[active ? 0.11 : 0.065, 16, 16]} />
              <meshBasicMaterial color={active ? '#F5E6C8' : '#6b7280'} />
            </mesh>
            <Html center distanceFactor={11} style={{ pointerEvents: 'none' }}>
              <div
                className={`px-2 py-0.5 rounded-full font-mono-tech text-[10px] whitespace-nowrap border transition-all duration-300 ${
                  active
                    ? 'bg-[#050507]/85 text-[#F5E6C8] border-[#F5E6C8]/60 shadow-[0_0_12px_rgba(245,230,200,0.35)]'
                    : 'bg-[#050507]/55 text-white/35 border-white/10'
                }`}
              >
                {node.name}
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

function RisingPillars3D({ scrollRef }) {
  const groupRef = useRef();
  const barRefs = useRef([]);
  const heights = [4.2, 3.6, 4.7, 3.1];
  const xPositions = [-3.3, -1.1, 1.1, 3.3];

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    const sp = scrollRef.current;
    const dist = Math.abs(sp - 0.69);
    const vis = THREE.MathUtils.clamp(1 - dist * 8.5, 0, 1);
    g.visible = vis > 0.02;
    if (!g.visible) return;

    barRefs.current.forEach((mesh, idx) => {
      if (!mesh) return;
      const targetScaleY = Math.max(0.05, vis);
      mesh.scale.y = THREE.MathUtils.lerp(mesh.scale.y, targetScaleY, 0.12);
      mesh.position.y = -3.3 + (heights[idx] * mesh.scale.y) / 2;
    });
  });

  return (
    <group ref={groupRef} position={[0, 0, -2.5]}>
      {heights.map((h, i) => (
        <group key={i} position={[xPositions[i], 0, 0]}>
          <mesh
            ref={(el) => {
              barRefs.current[i] = el;
            }}
          >
            <boxGeometry args={[1.25, h, 1.25]} />
            <meshStandardMaterial color="#0b0b10" roughness={0.25} metalness={0.85} />
            <mesh position={[0, h / 2 + 0.02, 0]}>
              <boxGeometry args={[1.28, 0.05, 1.28]} />
              <meshBasicMaterial color="#F5E6C8" />
            </mesh>
          </mesh>
        </group>
      ))}
    </group>
  );
}

function PortalTunnel3D({ scrollRef }) {
  const groupRef = useRef();
  const frames = useMemo(() => Array.from({ length: 8 }, (_, i) => i), []);

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    const sp = scrollRef.current;
    const dist = Math.abs(sp - 0.80);
    const vis = THREE.MathUtils.clamp(1 - dist * 8.0, 0, 1);
    g.visible = vis > 0.02;
    if (!g.visible) return;

    // Glide forward through the portal frames as user scrolls through Journey
    const localProgress = THREE.MathUtils.clamp((sp - 0.72) / 0.16, 0, 1);
    g.position.z = localProgress * 18;
  });

  return (
    <group ref={groupRef} position={[1.4, 0.2, 0]}>
      {frames.map((i) => {
        const z = -i * 3.8;
        return (
          <group key={i} position={[0, 0, z]}>
            <Line
              points={[
                [-3.2, -2.1, 0],
                [3.2, -2.1, 0],
                [3.2, 2.1, 0],
                [-3.2, 2.1, 0],
                [-3.2, -2.1, 0],
              ]}
              color="#F5E6C8"
              transparent
              opacity={0.55 - i * 0.05}
              lineWidth={1.6}
            />
          </group>
        );
      })}
    </group>
  );
}

function MoonOrb3D({ scrollRef }) {
  const ref = useRef();
  useFrame((state) => {
    const m = ref.current;
    if (!m) return;
    const sp = scrollRef.current;
    const vis = THREE.MathUtils.clamp((sp - 0.88) * 9, 0, 1);
    m.visible = vis > 0.02;
    if (!m.visible) return;
    m.position.y = -1.2 + vis * 2.1;
    m.rotation.y = state.clock.elapsedTime * 0.08;
  });

  return (
    <group ref={ref} position={[0, 0.8, -6.5]}>
      <mesh>
        <sphereGeometry args={[2.5, 48, 48]} />
        <meshStandardMaterial
          color="#F5E6C8"
          emissive="#F5E6C8"
          emissiveIntensity={0.35}
          roughness={0.75}
        />
      </mesh>
      <mesh scale={1.18}>
        <sphereGeometry args={[2.5, 32, 32]} />
        <meshBasicMaterial color="#F5E6C8" transparent opacity={0.1} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

function MistyFloor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3.4, -4]}>
      <planeGeometry args={[90, 90]} />
      <meshStandardMaterial color="#07070b" roughness={0.4} metalness={0.7} />
    </mesh>
  );
}

function CameraRig({ scrollRef }) {
  const { camera } = useThree();
  useFrame((state) => {
    const sp = scrollRef.current;
    const targetX = state.pointer.x * 0.55;
    const targetY = 0.65 + state.pointer.y * 0.3 + Math.sin(sp * Math.PI) * 0.2;
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, 0.05);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 0.05);
    camera.lookAt(0, 0, -4);
  });
  return null;
}

export default function UniverseCanvas({ scrollRef, activeSkillCategory, morphTarget }) {
  const glowMap = useMemo(() => createSoftGlowSprite(), []);

  return (
    <WebGLErrorBoundary>
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0">
        <Canvas
          dpr={[1, 1.5]}
          camera={{ position: [0, 0.65, 10.5], fov: 46 }}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
        >
          <color attach="background" args={['#050507']} />
          <fogExp2 attach="fog" args={['#050507', 0.036]} />

          <ambientLight intensity={0.35} />
          <spotLight position={[0, 12, 6]} angle={0.5} penumbra={0.9} intensity={2.2} color="#F5E6C8" />
          <pointLight position={[-6, 4, 4]} intensity={0.9} color="#FFFFFF" />

          <CameraRig scrollRef={scrollRef} />
          <AmbientSpaceField glowMap={glowMap} />
          <ParticleTitleMorph scrollRef={scrollRef} glowMap={glowMap} morphTarget={morphTarget} />
          <OrbitalHalo3D scrollRef={scrollRef} />
          <ConstellationSphere3D scrollRef={scrollRef} activeSkillCategory={activeSkillCategory} />
          <RisingPillars3D scrollRef={scrollRef} />
          <PortalTunnel3D scrollRef={scrollRef} />
          <MoonOrb3D scrollRef={scrollRef} />
          <MistyFloor />
        </Canvas>
        <div className="horizon-mist pointer-events-none fixed inset-x-0 bottom-0 h-52" />
      </div>
    </WebGLErrorBoundary>
  );
}
