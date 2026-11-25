import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

export default function TiltCard({ children, className = '', intensity = 14, style = {} }) {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });

  const springConfig = { stiffness: 240, damping: 20, mass: 0.5 };
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [intensity, -intensity]), springConfig);
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-intensity, intensity]), springConfig);

  const handleMouseMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    x.set(px - 0.5);
    y.set(py - 0.5);
    setGlare({ x: px * 100, y: py * 100, opacity: 1 });
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
    setGlare((prev) => ({ ...prev, opacity: 0 }));
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformPerspective: 1000,
        transformStyle: 'preserve-3d',
        position: 'relative',
        ...style,
      }}
      whileHover={{ y: -6, scale: 1.015 }}
      transition={{ duration: 0.2 }}
      className={className}
    >
      {/* Dynamic 3D Specular Crimson Spotlight Glare */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 'inherit',
          pointerEvents: 'none',
          opacity: glare.opacity,
          transition: 'opacity 0.25s ease',
          background: `radial-gradient(circle 240px at ${glare.x}% ${glare.y}%, rgba(255, 30, 45, 0.16), rgba(255, 255, 255, 0.04) 45%, transparent 75%)`,
          zIndex: 20,
        }}
      />
      {children}
    </motion.div>
  );
}
