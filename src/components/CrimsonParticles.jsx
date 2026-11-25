import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

function createEmberTexture(colorHex) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.25, colorHex);
  grad.addColorStop(0.6, `${colorHex}55`);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

export default function CrimsonParticles() {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer;
    let frameId;
    let disposed = false;

    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    const onMouseMove = (e) => {
      mouse.targetX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.targetY = -(e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', onMouseMove, { passive: true });

    try {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        58,
        window.innerWidth / window.innerHeight,
        0.1,
        100
      );
      camera.position.z = 16;

      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(window.innerWidth, window.innerHeight);
      container.appendChild(renderer.domElement);

      // 3D Crimson Wireframe Sculptural Mesh + Orbital Rings for deeper 3D parallax
      const geoGroup = new THREE.Group();
      geoGroup.position.set(5.2, 0.4, -3.5);

      const icoGeo = new THREE.IcosahedronGeometry(3.6, 1);
      const icoMat = new THREE.MeshBasicMaterial({
        color: 0xff1e2d,
        wireframe: true,
        transparent: true,
        opacity: 0.14,
      });
      const icoMesh = new THREE.Mesh(icoGeo, icoMat);
      geoGroup.add(icoMesh);

      const ringGeo1 = new THREE.TorusGeometry(5.1, 0.025, 12, 96);
      const ringMat1 = new THREE.MeshBasicMaterial({
        color: 0xe50914,
        transparent: true,
        opacity: 0.28,
      });
      const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
      ring1.rotation.x = Math.PI * 0.35;
      ring1.rotation.y = Math.PI * 0.15;
      geoGroup.add(ring1);

      const ringGeo2 = new THREE.TorusGeometry(6.1, 0.018, 12, 108);
      const ringMat2 = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.12,
      });
      const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
      ring2.rotation.x = -Math.PI * 0.28;
      ring2.rotation.z = Math.PI * 0.22;
      geoGroup.add(ring2);

      scene.add(geoGroup);

      // Crimson embers
      const redCount = 210;
      const redPositions = new Float32Array(redCount * 3);
      const redVelocities = new Float32Array(redCount * 3);
      for (let i = 0; i < redCount; i++) {
        redPositions[i * 3] = (Math.random() - 0.5) * 34;
        redPositions[i * 3 + 1] = (Math.random() - 0.5) * 22;
        redPositions[i * 3 + 2] = (Math.random() - 0.5) * 14;
        redVelocities[i * 3] = (Math.random() - 0.5) * 0.008;
        redVelocities[i * 3 + 1] = 0.008 + Math.random() * 0.015;
        redVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.005;
      }

      const redGeo = new THREE.BufferGeometry();
      redGeo.setAttribute('position', new THREE.BufferAttribute(redPositions, 3));
      const redMat = new THREE.PointsMaterial({
        size: 0.44,
        map: createEmberTexture('#FF1E2D'),
        transparent: true,
        opacity: 0.92,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const redPoints = new THREE.Points(redGeo, redMat);
      scene.add(redPoints);

      // Crisp white specks
      const whiteCount = 120;
      const whitePositions = new Float32Array(whiteCount * 3);
      const whiteVelocities = new Float32Array(whiteCount * 3);
      for (let i = 0; i < whiteCount; i++) {
        whitePositions[i * 3] = (Math.random() - 0.5) * 36;
        whitePositions[i * 3 + 1] = (Math.random() - 0.5) * 24;
        whitePositions[i * 3 + 2] = (Math.random() - 0.5) * 16;
        whiteVelocities[i * 3] = (Math.random() - 0.5) * 0.006;
        whiteVelocities[i * 3 + 1] = 0.004 + Math.random() * 0.011;
        whiteVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.004;
      }

      const whiteGeo = new THREE.BufferGeometry();
      whiteGeo.setAttribute('position', new THREE.BufferAttribute(whitePositions, 3));
      const whiteMat = new THREE.PointsMaterial({
        size: 0.25,
        map: createEmberTexture('#FFFFFF'),
        transparent: true,
        opacity: 0.58,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const whitePoints = new THREE.Points(whiteGeo, whiteMat);
      scene.add(whitePoints);

      const handleResize = () => {
        if (!renderer) return;
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      };
      window.addEventListener('resize', handleResize);

      const animate = () => {
        if (disposed) return;
        frameId = requestAnimationFrame(animate);

        mouse.x += (mouse.targetX - mouse.x) * 0.045;
        mouse.y += (mouse.targetY - mouse.y) * 0.045;

        const scrollFactor = Math.min(1, (window.scrollY || 0) / 1400);

        camera.position.x = mouse.x * 1.35;
        camera.position.y = mouse.y * 0.85;
        camera.lookAt(0, 0, 0);

        // Smooth 3D rotation & interactive mouse tilt on wireframe + rings
        icoMesh.rotation.y += 0.0032;
        icoMesh.rotation.x += 0.0018;
        ring1.rotation.z += 0.0024;
        ring2.rotation.z -= 0.0018;
        geoGroup.rotation.y = mouse.x * 0.35;
        geoGroup.rotation.x = -mouse.y * 0.25;
        geoGroup.position.y = 0.4 - scrollFactor * 3.5;

        const rAttr = redGeo.attributes.position;
        for (let i = 0; i < redCount; i++) {
          let x = rAttr.array[i * 3] + redVelocities[i * 3];
          let y = rAttr.array[i * 3 + 1] + redVelocities[i * 3 + 1];
          let z = rAttr.array[i * 3 + 2] + redVelocities[i * 3 + 2];
          if (y > 12) y = -12;
          if (x > 18) x = -18;
          if (x < -18) x = 18;
          rAttr.array[i * 3] = x;
          rAttr.array[i * 3 + 1] = y;
          rAttr.array[i * 3 + 2] = z;
        }
        rAttr.needsUpdate = true;

        const wAttr = whiteGeo.attributes.position;
        for (let i = 0; i < whiteCount; i++) {
          let x = wAttr.array[i * 3] + whiteVelocities[i * 3];
          let y = wAttr.array[i * 3 + 1] + whiteVelocities[i * 3 + 1];
          let z = wAttr.array[i * 3 + 2] + whiteVelocities[i * 3 + 2];
          if (y > 13) y = -13;
          if (x > 19) x = -19;
          if (x < -19) x = 19;
          wAttr.array[i * 3] = x;
          wAttr.array[i * 3 + 1] = y;
          wAttr.array[i * 3 + 2] = z;
        }
        wAttr.needsUpdate = true;

        redPoints.rotation.y += 0.0005;
        whitePoints.rotation.y -= 0.00035;

        renderer.render(scene, camera);
      };

      animate();

      return () => {
        disposed = true;
        cancelAnimationFrame(frameId);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('resize', handleResize);
        icoGeo.dispose();
        icoMat.dispose();
        ringGeo1.dispose();
        ringMat1.dispose();
        ringGeo2.dispose();
        ringMat2.dispose();
        redGeo.dispose();
        redMat.dispose();
        whiteGeo.dispose();
        whiteMat.dispose();
        renderer.dispose();
        if (renderer.domElement && container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
      };
    } catch {
      window.removeEventListener('mousemove', onMouseMove);
      return undefined;
    }
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    />
  );
}
