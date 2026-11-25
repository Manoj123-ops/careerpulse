import React, { Component, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
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
      return this.props.fallback || null;
    }
    return this.props.children;
  }
}

function createSoftGlowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.28, 'rgba(255, 255, 255, 0.72)');
    grad.addColorStop(0.65, 'rgba(255, 255, 255, 0.16)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function createBeamTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.48)');
    grad.addColorStop(0.45, 'rgba(255, 255, 255, 0.18)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 256);

    // Horizontal soft falloff
    ctx.globalCompositeOperation = 'destination-in';
    const horiz = ctx.createLinearGradient(0, 0, 128, 0);
    horiz.addColorStop(0, 'rgba(0,0,0,0)');
    horiz.addColorStop(0.5, 'rgba(0,0,0,1)');
    horiz.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = horiz;
    ctx.fillRect(0, 0, 128, 256);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function TrailerEmbers({ scrollRef, pointerRef }) {
  const pointsRef = useRef(null);
  const count = 820;

  const { positions, colors, speeds } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const spd = new Float32Array(count);

    const palette = [
      new THREE.Color('#E50914'),
      new THREE.Color('#FF4D2D'),
      new THREE.Color('#FF9A3C'),
      new THREE.Color('#A855F7'),
      new THREE.Color('#FFFFFF'),
    ];

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 34;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 24;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 56 - 6;
      spd[i] = 0.25 + Math.random() * 0.85;

      const pick = palette[Math.floor(Math.random() * palette.length)];
      col[i * 3] = pick.r;
      col[i * 3 + 1] = pick.g;
      col[i * 3 + 2] = pick.b;
    }
    return { positions: pos, colors: col, speeds: spd };
  }, []);

  const glowTex = useMemo(() => createSoftGlowTexture(), []);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;
    const t = state.clock.elapsedTime;
    const scrollP = scrollRef.current || 0;
    const attr = pointsRef.current.geometry.attributes.position;
    const arr = attr.array;

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      arr[idx + 1] += delta * 0.22 * speeds[i];
      arr[idx + 2] += delta * (0.45 + scrollP * 1.4) * speeds[i];
      arr[idx] += Math.sin(t * 0.4 + i * 0.31) * delta * 0.08;

      if (arr[idx + 1] > 12) arr[idx + 1] = -12;
      if (arr[idx + 2] > 16) arr[idx + 2] = -38;
    }
    attr.needsUpdate = true;
    pointsRef.current.rotation.z = Math.sin(t * 0.06) * 0.04 + pointerRef.current.x * 0.04;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={count} array={colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={0.22}
        map={glowTex}
        vertexColors
        transparent
        opacity={0.85}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}

function CinematicStageRig({ scrollRef, pointerRef }) {
  const rigRef = useRef(null);
  const ring1Ref = useRef(null);
  const ring2Ref = useRef(null);
  const beamCrimsonRef = useRef(null);
  const beamAmberRef = useRef(null);
  const beamPurpleRef = useRef(null);

  const beamTex = useMemo(() => createBeamTexture(), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const p = scrollRef.current || 0;
    const px = pointerRef.current?.x || 0;
    const py = pointerRef.current?.y || 0;

    // Smooth cinematic dolly + pointer tilt
    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, px * 1.15, 0.05);
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, -py * 0.65 + p * 0.4, 0.05);
    state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, 11 - p * 4.5, 0.06);
    state.camera.lookAt(0, 0, -14);

    if (ring1Ref.current) {
      ring1Ref.current.rotation.z = t * 0.08 + p * 1.6;
      ring1Ref.current.rotation.x = 1.15 + Math.sin(t * 0.25) * 0.08;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.z = -t * 0.06 - p * 1.1;
      ring2Ref.current.rotation.y = Math.cos(t * 0.2) * 0.22;
    }
    if (beamCrimsonRef.current) {
      beamCrimsonRef.current.rotation.z = -0.35 + Math.sin(t * 0.32) * 0.14;
      beamCrimsonRef.current.material.opacity = 0.24 + Math.max(0, 0.22 - p * 0.15);
    }
    if (beamPurpleRef.current) {
      beamPurpleRef.current.rotation.z = 0.42 + Math.cos(t * 0.26) * 0.12;
      beamPurpleRef.current.material.opacity = 0.16 + Math.sin(p * Math.PI) * 0.24;
    }
    if (beamAmberRef.current) {
      beamAmberRef.current.rotation.z = Math.sin(t * 0.4 + p * 2.5) * 0.28;
      beamAmberRef.current.material.opacity = 0.18 + Math.sin(p * Math.PI * 1.4) * 0.22;
    }
    if (rigRef.current) {
      rigRef.current.position.z = -12 + p * 3.5;
    }
  });

  return (
    <group ref={rigRef}>
      {/* Volumetric Spotlight Cones */}
      <mesh ref={beamCrimsonRef} position={[-3.2, 4.5, -4]}>
        <planeGeometry args={[9, 18]} />
        <meshBasicMaterial
          map={beamTex}
          color="#E50914"
          transparent
          opacity={0.32}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh ref={beamPurpleRef} position={[3.6, 4.2, -6]}>
        <planeGeometry args={[8.5, 18]} />
        <meshBasicMaterial
          map={beamTex}
          color="#A855F7"
          transparent
          opacity={0.24}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh ref={beamAmberRef} position={[0, 5.2, -5]}>
        <planeGeometry args={[7, 17]} />
        <meshBasicMaterial
          map={beamTex}
          color="#FF8A1E"
          transparent
          opacity={0.22}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Orbital Energy Wireframe Rings */}
      <mesh ref={ring1Ref} position={[0, 0, -5]}>
        <torusGeometry args={[6.2, 0.022, 12, 120]} />
        <meshBasicMaterial
          color="#E50914"
          transparent
          opacity={0.26}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={ring2Ref} position={[0, -0.4, -7]}>
        <torusGeometry args={[8.4, 0.018, 12, 140]} />
        <meshBasicMaterial
          color="#FF9A3C"
          transparent
          opacity={0.18}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

export default function TrailerSceneCanvas({ scrollRef, pointerRef }) {
  return (
    <div className="trailer-webgl-backdrop" aria-hidden="true">
      <WebGLErrorBoundary fallback={<div className="trailer-css-fallback" />}>
        <Canvas
          camera={{ position: [0, 0, 11], fov: 48, near: 0.1, far: 120 }}
          dpr={[1, 1.5]}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        >
          <color attach="background" args={['#000000']} />
          <fog attach="fog" args={['#000000', 12, 46]} />
          <TrailerEmbers scrollRef={scrollRef} pointerRef={pointerRef} />
          <CinematicStageRig scrollRef={scrollRef} pointerRef={pointerRef} />
        </Canvas>
      </WebGLErrorBoundary>
    </div>
  );
}
