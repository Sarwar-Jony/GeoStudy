"use client";

import React, { useEffect, useRef, useState } from "react";

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  elevation: number;
}

export default function DynamicGeoBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);

    // Generate geodetic nodes
    const NODE_COUNT = Math.min(Math.floor((width * height) / 30000), 55);
    const nodes: Node[] = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        radius: Math.random() * 2 + 1.2,
        elevation: Math.floor(Math.random() * 800) + 20,
      });
    }

    let pulseRadius = 0;
    let currentMouseX = width / 2;
    let currentMouseY = height / 2;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Pulse expansion
      pulseRadius += 0.4;
      if (pulseRadius > 140) pulseRadius = 0;

      // Draw subtle mouse radar ripple if mouse is active
      if (mousePos) {
        currentMouseX += (mousePos.x - currentMouseX) * 0.1;
        currentMouseY += (mousePos.y - currentMouseY) * 0.1;

        // Radar circle 1
        ctx.beginPath();
        ctx.arc(currentMouseX, currentMouseY, pulseRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(16, 185, 129, ${Math.max(0, 0.2 - pulseRadius / 140)})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Radar circle 2 (delayed)
        const delayedRadius = (pulseRadius + 70) % 140;
        ctx.beginPath();
        ctx.arc(currentMouseX, currentMouseY, delayedRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(56, 189, 248, ${Math.max(0, 0.15 - delayedRadius / 140)})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Update and draw geodetic nodes & TIN mesh links
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        node.x += node.vx;
        node.y += node.vy;

        // Wrap around boundaries
        if (node.x < 0) node.x = width;
        if (node.x > width) node.x = 0;
        if (node.y < 0) node.y = height;
        if (node.y > height) node.y = 0;

        // Connect nearby nodes with geodesic lines (TIN mesh)
        for (let j = i + 1; j < nodes.length; j++) {
          const other = nodes[j];
          const dx = node.x - other.x;
          const dy = node.y - other.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 150) {
            const alpha = (1 - dist / 150) * 0.14;
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(other.x, other.y);
            ctx.strokeStyle = `rgba(16, 185, 129, ${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }

        // Draw node elevation dot
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(16, 185, 129, 0.4)";
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [mousePos]);

  return (
    <div
      className="pointer-events-none fixed inset-0 -z-20 overflow-hidden select-none"
      onMouseMove={(e) => {
        setMousePos({ x: e.clientX, y: e.clientY });
      }}
    >
      {/* 1. Fluid Multi-Chromatic Radiant Ambient Gradient Orbs */}
      <div className="absolute -top-40 -left-40 h-[650px] w-[650px] rounded-full bg-emerald-500/15 blur-[120px] dark:bg-emerald-500/20 animate-pulse duration-1000" />
      <div className="absolute top-1/4 -right-40 h-[600px] w-[600px] rounded-full bg-sky-500/15 blur-[130px] dark:bg-sky-500/20 animate-pulse duration-700" />
      <div className="absolute -bottom-40 left-1/3 h-[550px] w-[550px] rounded-full bg-indigo-500/10 blur-[140px] dark:bg-teal-500/15 animate-pulse duration-1000" />

      {/* 2. Topographic Contour Line Waves (SVG Layer) */}
      <svg
        className="absolute inset-0 h-full w-full opacity-35 dark:opacity-20"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="topo-grid"
            width="80"
            height="80"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 80 0 L 0 0 0 80"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.6"
              className="text-slate-300 dark:text-slate-800"
            />
            <circle
              cx="40"
              cy="40"
              r="1.2"
              fill="currentColor"
              className="text-emerald-500/40"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#topo-grid)" />
      </svg>

      {/* 3. HTML5 Canvas for Real-Time Geodetic Node Movement & Radar Ripple */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
      />

      {/* 4. Ambient Spatial Telemetry Badges (Floating Margins) */}
      <div className="hidden lg:block absolute bottom-4 left-6 text-[9px] font-mono tracking-widest text-slate-400/50 dark:text-slate-600">
        LAT: 23°42&apos;37&quot;N · LON: 90°24&apos;26&quot;E · EPSG:4326 · WGS 84 DATUM
      </div>
      <div className="hidden lg:block absolute top-20 right-6 text-[9px] font-mono tracking-widest text-slate-400/50 dark:text-slate-600">
        SENTINEL-2B ORBIT ALT: 786 KM · RESOLUTION: 10M GSD · GLO-30 LIVE
      </div>
    </div>
  );
}
