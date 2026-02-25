/**
 * WaterCup.tsx
 * Physics-simulated cylindrical water cup with:
 * - 1D height-field wave simulation (N=128, c=0.7, damping=0.04)
 * - Particle splash system (≤30 particles/event)
 * - Canvas 2D glass/water rendering with gradients and highlights
 * - Safe-line / danger-line visual feedback
 */

import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  r: number;
  color: string;
}

export interface WaterCupHandle {
  pourOut: (normalizedAmount: number) => void;
  pourIn: (normalizedAmount: number) => void;
}

export interface WaterCupProps {
  targetWaterLevel: number;   // 0–1
  safeLevel: number;          // 0–1
  dangerLevel: number;        // 0–1
  onWaterLevelChange?: (level: number) => void;
  onSafeLineCrossed?: (crossed: 'above' | 'below') => void;
  className?: string;
  width?: number | string;
  height?: number | string;
}

// ─── Canvas constants ─────────────────────────────────────────────────────────

const CW = 380;   // canvas internal width
const CH = 580;   // canvas internal height

// Cup geometry (internal pixels)
const CUP_TOP_L   = 28;
const CUP_TOP_R   = 352;
const CUP_BOT_L   = 52;
const CUP_BOT_R   = 328;
const CUP_TOP_Y   = 50;
const CUP_BOT_Y   = 510;
const CUP_CORNER  = 26;
const CUP_HEIGHT  = CUP_BOT_Y - CUP_TOP_Y;   // 460px

// Wave physics
const N           = 128;
const WAVE_C      = 0.7;
const WAVE_DAMP   = 0.04;
const BASE_AMP    = 10;    // px per unit height displacement
const GRAVITY     = 980;   // pixels/s² for particles

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Interpolate cup left/right X at a given canvas Y */
function cupLeftX(y: number): number {
  const t = (y - CUP_TOP_Y) / CUP_HEIGHT;
  return CUP_TOP_L + (CUP_BOT_L - CUP_TOP_L) * t;
}
function cupRightX(y: number): number {
  const t = (y - CUP_TOP_Y) / CUP_HEIGHT;
  return CUP_TOP_R + (CUP_BOT_R - CUP_TOP_R) * t;
}

/** Water base Y from normalised level */
function waterBaseY(level: number): number {
  return CUP_BOT_Y - level * CUP_HEIGHT;
}

/** Build the cup interior clip path (once, reused every frame) */
function buildCupPath(): Path2D {
  const p = new Path2D();
  p.moveTo(CUP_TOP_L, CUP_TOP_Y);
  p.lineTo(CUP_TOP_R, CUP_TOP_Y);
  p.lineTo(CUP_BOT_R, CUP_BOT_Y - CUP_CORNER);
  p.quadraticCurveTo(CUP_BOT_R, CUP_BOT_Y, CUP_BOT_R - CUP_CORNER, CUP_BOT_Y);
  p.lineTo(CUP_BOT_L + CUP_CORNER, CUP_BOT_Y);
  p.quadraticCurveTo(CUP_BOT_L, CUP_BOT_Y, CUP_BOT_L, CUP_BOT_Y - CUP_CORNER);
  p.closePath();
  return p;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const WaterCup = forwardRef<WaterCupHandle, WaterCupProps>((props, ref) => {
  const {
    targetWaterLevel,
    safeLevel,
    dangerLevel,
    onWaterLevelChange,
    onSafeLineCrossed,
    className = '',
    width  = CW,
    height = CH,
  } = props;

  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const stateRef   = useRef({
    actualLevel:  targetWaterLevel,
    targetLevel:  targetWaterLevel,
    hCurr:        new Float32Array(N),
    hPrev:        new Float32Array(N),
    hNext:        new Float32Array(N),
    particles:    [] as Particle[],
    lastTime:     0,
    prevLevel:    targetWaterLevel,   // for safe-line crossing detection
    alertPulse:   0,                  // glow intensity when near safe line
    pourEffect:   null as { type: 'in'|'out'; ttl: number; x: number } | null,
    cupPath:      null as Path2D | null,
    frameId:      0,
  });

  // ── Imperative API ──────────────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    pourOut(normalizedAmount: number) {
      const s = stateRef.current;
      // Disturbance on the left side (simulating pouring out)
      const cx = Math.floor(N * 0.15);
      const spread = 12;
      const amp = normalizedAmount * 80;
      for (let i = Math.max(0, cx - spread); i < Math.min(N, cx + spread); i++) {
        s.hCurr[i] -= amp * (1 - Math.abs(i - cx) / spread);
        s.hPrev[i] = s.hCurr[i];
      }
      // Emit particles from left side
      const baseY = waterBaseY(s.actualLevel);
      const baseX = cupLeftX(baseY) - 10;
      spawnParticles(s, baseX, baseY, 'out', Math.min(30, Math.ceil(normalizedAmount * 40)));
      s.pourEffect = { type: 'out', ttl: 0.8, x: baseX };
    },
    pourIn(normalizedAmount: number) {
      const s = stateRef.current;
      // Disturbance at center (water falling in from top)
      const cx = Math.floor(N * 0.5);
      const spread = 14;
      const amp = normalizedAmount * 60;
      for (let i = Math.max(0, cx - spread); i < Math.min(N, cx + spread); i++) {
        s.hCurr[i] += amp * (1 - Math.abs(i - cx) / spread);
        s.hPrev[i] = s.hCurr[i];
      }
      // Emit upward splash particles
      const baseY = waterBaseY(s.actualLevel);
      const baseX = (CW / 2);
      spawnParticles(s, baseX, baseY, 'in', Math.min(30, Math.ceil(normalizedAmount * 35)));
      s.pourEffect = { type: 'in', ttl: 1.0, x: baseX };
    },
  }));

  // ── Particle factory ────────────────────────────────────────────────────────
  function spawnParticles(
    s: typeof stateRef.current,
    x: number, y: number,
    type: 'in' | 'out',
    count: number
  ) {
    for (let i = 0; i < count; i++) {
      const angle = type === 'out'
        ? (Math.random() * Math.PI * 0.6 + Math.PI * 0.5)   // downward-left fan
        : (Math.random() * Math.PI * 0.8 - Math.PI * 0.4 - Math.PI / 2); // upward fan
      const speed = 60 + Math.random() * 180;
      const life  = 0.3 + Math.random() * 0.5;
      s.particles.push({
        x: x + (Math.random() - 0.5) * 14,
        y: y + (Math.random() - 0.5) * 6,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        maxLife: life,
        r: 1.5 + Math.random() * 2.5,
        color: type === 'in' ? '#93C5FD' : '#60A5FA',
      });
    }
    // Trim to max 60
    if (s.particles.length > 60) s.particles = s.particles.slice(-60);
  }

  // ── Physics step ────────────────────────────────────────────────────────────
  function stepPhysics(s: typeof stateRef.current, dt: number) {
    const h = s.hCurr, hp = s.hPrev, hn = s.hNext;
    const c = WAVE_C, d = WAVE_DAMP;
    // Amplify waves near danger level
    const amp = s.actualLevel < dangerLevel + 0.05 ? 1.4 : 1.0;

    for (let i = 1; i < N - 1; i++) {
      hn[i] = (2 * h[i] - hp[i])
        + c * (h[i - 1] - 2 * h[i] + h[i + 1])
        - d * (h[i] - hp[i]);
      hn[i] *= amp;
    }
    hn[0]     = hn[1];
    hn[N - 1] = hn[N - 2];

    // Swap buffers
    s.hPrev.set(h);
    s.hCurr.set(hn);
    s.hNext.fill(0);
  }

  // ── Update water level ──────────────────────────────────────────────────────
  function updateLevel(s: typeof stateRef.current, _dt: number) {
    const lerpSpeed = 0.018;
    const diff = s.targetLevel - s.actualLevel;

    if (Math.abs(diff) > 0.0001) {
      s.actualLevel += diff * lerpSpeed;
      onWaterLevelChange?.(s.actualLevel);
    }

    // Safe-line crossing detection
    const sl = safeLevel;
    if (s.prevLevel >= sl && s.actualLevel < sl) {
      onSafeLineCrossed?.('below');
    } else if (s.prevLevel < sl && s.actualLevel >= sl) {
      onSafeLineCrossed?.('above');
    }
    s.prevLevel = s.actualLevel;

    // Alert pulse near safe line
    if (s.actualLevel < sl + 0.05) {
      s.alertPulse = Math.min(1, s.alertPulse + 0.06);
    } else {
      s.alertPulse = Math.max(0, s.alertPulse - 0.04);
    }
  }

  // ── Update particles ────────────────────────────────────────────────────────
  function updateParticles(s: typeof stateRef.current, dt: number) {
    const alive: Particle[] = [];
    for (const p of s.particles) {
      p.x  += p.vx * dt;
      p.y  += p.vy * dt;
      p.vy += GRAVITY * dt;
      p.vx *= (1 - 0.04);
      p.life -= dt;
      if (p.life > 0) alive.push(p);
    }
    s.particles = alive;

    // Pour effect TTL
    if (s.pourEffect) {
      s.pourEffect.ttl -= dt;
      if (s.pourEffect.ttl <= 0) s.pourEffect = null;
    }
  }

  // ── Draw ─────────────────────────────────────────────────────────────────────
  function draw(ctx: CanvasRenderingContext2D, s: typeof stateRef.current) {
    ctx.clearRect(0, 0, CW, CH);

    const lv = s.actualLevel;
    const baseY = waterBaseY(lv);
    const leftX  = cupLeftX(baseY);
    const rightX = cupRightX(baseY);

    // 1) Ambient glow behind cup
    const glowGrad = ctx.createRadialGradient(CW / 2, CH / 2, 40, CW / 2, CH / 2, 220);
    glowGrad.addColorStop(0, 'rgba(30,58,138,0.45)');
    glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, CW, CH);

    // 2) Draw glass cup body (back layer)
    drawCupBack(ctx, s);

    // 3) Water (clipped inside cup)
    if (lv > 0.002) {
      drawWater(ctx, s, baseY, leftX, rightX);
    }

    // 4) Draw particles
    drawParticles(ctx, s);

    // 5) Cup glass highlights (front layer)
    drawCupFront(ctx, s);

    // 6) HUD: safe line, danger line, percentage
    drawHUD(ctx, s);

    // 7) Pour-in faucet stream
    if (s.pourEffect?.type === 'in') {
      drawFaucetStream(ctx, s, baseY);
    }
  }

  function drawCupBack(ctx: CanvasRenderingContext2D, _s: typeof stateRef.current) {
    // Cup interior – dark glass fill
    const cp = stateRef.current.cupPath!;
    ctx.save();
    ctx.fillStyle = 'rgba(11,30,61,0.85)';
    ctx.fill(cp);

    // Outer cup wall (border)
    ctx.strokeStyle = 'rgba(59,130,246,0.35)';
    ctx.lineWidth = 2;
    ctx.stroke(cp);
    ctx.restore();
  }

  function drawWater(
    ctx: CanvasRenderingContext2D,
    s: typeof stateRef.current,
    baseY: number,
    leftX: number,
    rightX: number,
  ) {
    const cp = s.cupPath!;
    ctx.save();
    ctx.clip(cp);

    // Water gradient (bottom to surface)
    const wGrad = ctx.createLinearGradient(0, baseY, 0, CUP_BOT_Y);
    wGrad.addColorStop(0, '#3B82F6');
    wGrad.addColorStop(0.5, '#2563EB');
    wGrad.addColorStop(1, '#1D4ED8');

    // Build wave surface path
    ctx.beginPath();
    ctx.moveTo(leftX, baseY);

    const amp = BASE_AMP * (s.actualLevel < dangerLevel + 0.05 ? 1.4 : 1.0);
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      const x = leftX + t * (rightX - leftX);
      const y = baseY - s.hCurr[i] * amp;
      ctx.lineTo(x, y);
    }

    // Close path along cup interior bottom
    ctx.lineTo(rightX, baseY);
    ctx.lineTo(CUP_BOT_R, CUP_BOT_Y - CUP_CORNER);
    ctx.quadraticCurveTo(CUP_BOT_R, CUP_BOT_Y, CUP_BOT_R - CUP_CORNER, CUP_BOT_Y);
    ctx.lineTo(CUP_BOT_L + CUP_CORNER, CUP_BOT_Y);
    ctx.quadraticCurveTo(CUP_BOT_L, CUP_BOT_Y, CUP_BOT_L, CUP_BOT_Y - CUP_CORNER);
    ctx.closePath();

    ctx.fillStyle = wGrad;
    ctx.fill();

    // Wave shimmer highlight at surface
    const shimmerGrad = ctx.createLinearGradient(leftX, baseY - 18, rightX, baseY + 4);
    shimmerGrad.addColorStop(0, 'rgba(147,197,253,0.0)');
    shimmerGrad.addColorStop(0.4, 'rgba(147,197,253,0.55)');
    shimmerGrad.addColorStop(1, 'rgba(147,197,253,0.0)');
    ctx.beginPath();
    ctx.moveTo(leftX, baseY);
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      const x = leftX + t * (rightX - leftX);
      const y = baseY - s.hCurr[i] * amp - 3;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(rightX, baseY - 3);
    ctx.lineTo(rightX, baseY + 4);
    ctx.lineTo(leftX, baseY + 4);
    ctx.closePath();
    ctx.fillStyle = shimmerGrad;
    ctx.fill();

    // Interior underwater glow (top 25% of water body)
    const depth = (CUP_BOT_Y - baseY);
    const depthGrad = ctx.createLinearGradient(0, baseY, 0, baseY + depth * 0.25);
    depthGrad.addColorStop(0, 'rgba(96,165,250,0.28)');
    depthGrad.addColorStop(1, 'rgba(96,165,250,0)');
    ctx.fillRect(leftX, baseY, rightX - leftX, depth * 0.25);

    ctx.restore();
  }

  function drawParticles(ctx: CanvasRenderingContext2D, s: typeof stateRef.current) {
    for (const p of s.particles) {
      const alpha = (p.life / p.maxLife);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * alpha, 0, Math.PI * 2);
      ctx.fillStyle = p.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
      ctx.fill();

      // Motion trail
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 0.012, p.y - p.vy * 0.012);
      ctx.strokeStyle = p.color + Math.floor(alpha * 100).toString(16).padStart(2, '0');
      ctx.lineWidth = p.r * 0.6;
      ctx.stroke();
    }
  }

  function drawCupFront(ctx: CanvasRenderingContext2D, _s: typeof stateRef.current) {
    // Left edge highlight (Fresnel)
    const leftHighlight = ctx.createLinearGradient(CUP_TOP_L, 0, CUP_TOP_L + 20, 0);
    leftHighlight.addColorStop(0, 'rgba(186,230,253,0.7)');
    leftHighlight.addColorStop(0.5, 'rgba(147,197,253,0.3)');
    leftHighlight.addColorStop(1, 'rgba(147,197,253,0)');
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(CUP_TOP_L, CUP_TOP_Y);
    ctx.lineTo(CUP_TOP_L + 20, CUP_TOP_Y);
    ctx.lineTo(CUP_BOT_L + 20, CUP_BOT_Y);
    ctx.lineTo(CUP_BOT_L, CUP_BOT_Y - CUP_CORNER);
    ctx.quadraticCurveTo(CUP_BOT_L, CUP_BOT_Y, CUP_BOT_L + CUP_CORNER, CUP_BOT_Y);
    ctx.lineTo(CUP_BOT_L, CUP_BOT_Y);
    ctx.closePath();
    ctx.fillStyle = leftHighlight;
    ctx.fill();
    ctx.restore();

    // Right edge soft rim
    const rightHighlight = ctx.createLinearGradient(CUP_TOP_R - 16, 0, CUP_TOP_R, 0);
    rightHighlight.addColorStop(0, 'rgba(147,197,253,0)');
    rightHighlight.addColorStop(1, 'rgba(147,197,253,0.22)');
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(CUP_TOP_R - 16, CUP_TOP_Y);
    ctx.lineTo(CUP_TOP_R, CUP_TOP_Y);
    ctx.lineTo(CUP_BOT_R, CUP_BOT_Y - CUP_CORNER);
    ctx.quadraticCurveTo(CUP_BOT_R, CUP_BOT_Y, CUP_BOT_R - CUP_CORNER, CUP_BOT_Y);
    ctx.lineTo(CUP_BOT_R - 16, CUP_BOT_Y);
    ctx.closePath();
    ctx.fillStyle = rightHighlight;
    ctx.fill();
    ctx.restore();

    // Top rim highlight
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(CUP_TOP_L, CUP_TOP_Y);
    ctx.lineTo(CUP_TOP_R, CUP_TOP_Y);
    ctx.strokeStyle = 'rgba(186,230,253,0.75)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();

    // Bottom rim subtle line
    ctx.save();
    const rimGrad = ctx.createLinearGradient(CUP_BOT_L, CUP_BOT_Y, CUP_BOT_R, CUP_BOT_Y);
    rimGrad.addColorStop(0,   'rgba(59,130,246,0)');
    rimGrad.addColorStop(0.3, 'rgba(96,165,250,0.4)');
    rimGrad.addColorStop(0.7, 'rgba(96,165,250,0.4)');
    rimGrad.addColorStop(1,   'rgba(59,130,246,0)');
    ctx.beginPath();
    ctx.moveTo(CUP_BOT_L + CUP_CORNER, CUP_BOT_Y);
    ctx.lineTo(CUP_BOT_R - CUP_CORNER, CUP_BOT_Y);
    ctx.strokeStyle = rimGrad;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  function drawHUD(ctx: CanvasRenderingContext2D, s: typeof stateRef.current) {
    // --- Safe line ---
    const sY = waterBaseY(safeLevel);
    const sLX = cupLeftX(sY) - 12;
    const sRX = cupRightX(sY) + 12;
    const pulse = s.alertPulse;

    // Glow when near
    if (pulse > 0.05) {
      ctx.save();
      ctx.shadowColor = '#38BDF8';
      ctx.shadowBlur  = 12 * pulse;
      ctx.beginPath();
      ctx.moveTo(sLX, sY);
      ctx.lineTo(sRX, sY);
      ctx.strokeStyle = `rgba(56,189,248,${0.3 + 0.7 * pulse})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }

    // Safe line
    ctx.save();
    ctx.setLineDash([8, 5]);
    ctx.beginPath();
    ctx.moveTo(sLX, sY);
    ctx.lineTo(sRX, sY);
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.75 + 0.25 * Math.sin(Date.now() / 400) * pulse;
    ctx.stroke();
    ctx.setLineDash([]);

    // Safe label
    ctx.globalAlpha = 1;
    ctx.font = 'bold 10px Inter, sans-serif';
    ctx.fillStyle = '#38BDF8';
    ctx.textAlign = 'right';
    ctx.fillText('安全线', sLX - 4, sY + 4);
    ctx.restore();

    // --- Danger line ---
    const dY = waterBaseY(dangerLevel);
    const dLX = cupLeftX(dY) - 12;
    const dRX = cupRightX(dY) + 12;

    ctx.save();
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(dLX, dY);
    ctx.lineTo(dRX, dY);
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.55;
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.globalAlpha = 1;
    ctx.font = 'bold 10px Inter, sans-serif';
    ctx.fillStyle = '#EF4444';
    ctx.textAlign = 'right';
    ctx.fillText('危险线', dLX - 4, dY + 4);
    ctx.restore();

    // --- Percentage text inside cup ---
    const pct = Math.round(s.actualLevel * 100);
    const midX = CW / 2;
    const textY = Math.max(CUP_TOP_Y + 60, waterBaseY(s.actualLevel) + 30);

    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 28px Inter, sans-serif';
    ctx.fillStyle = 'rgba(230,240,255,0.9)';
    ctx.fillText(`${pct}%`, midX, textY);

    ctx.font = '11px Inter, sans-serif';
    ctx.fillStyle = 'rgba(147,197,253,0.7)';
    ctx.fillText('储蓄水位', midX, textY + 18);
    ctx.restore();
  }

  function drawFaucetStream(
    ctx: CanvasRenderingContext2D,
    s: typeof stateRef.current,
    baseY: number,
  ) {
    if (!s.pourEffect) return;
    const alpha = Math.min(1, s.pourEffect.ttl / 0.3);
    const cx = CW / 2;
    const topY = CUP_TOP_Y - 20;

    ctx.save();
    const streamGrad = ctx.createLinearGradient(cx, topY, cx, baseY);
    streamGrad.addColorStop(0, `rgba(96,165,250,0)`);
    streamGrad.addColorStop(0.3, `rgba(147,197,253,${0.5 * alpha})`);
    streamGrad.addColorStop(1, `rgba(59,130,246,0)`);
    ctx.beginPath();
    ctx.moveTo(cx - 4, topY);
    ctx.bezierCurveTo(cx - 4, topY + 80, cx - 8, baseY - 60, cx - 3, baseY);
    ctx.bezierCurveTo(cx + 3, baseY, cx + 8, baseY - 60, cx + 4, topY + 80);
    ctx.lineTo(cx + 4, topY);
    ctx.closePath();
    ctx.fillStyle = streamGrad;
    ctx.fill();
    ctx.restore();
  }

  // ── RAF loop ────────────────────────────────────────────────────────────────
  const animate = useCallback((timestamp: number) => {
    const s = stateRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!s.cupPath) s.cupPath = buildCupPath();

    const dt = s.lastTime ? Math.min((timestamp - s.lastTime) / 1000, 0.05) : 0.016;
    s.lastTime = timestamp;

    stepPhysics(s, dt);
    updateLevel(s, dt);
    updateParticles(s, dt);
    draw(ctx, s);

    s.frameId = requestAnimationFrame(animate);
  }, []);  // eslint-disable-line

  // ── Sync target level from props ────────────────────────────────────────────
  useEffect(() => {
    stateRef.current.targetLevel = targetWaterLevel;
  }, [targetWaterLevel]);

  // ── Start / stop RAF ────────────────────────────────────────────────────────
  useEffect(() => {
    const s = stateRef.current;
    s.cupPath = buildCupPath();
    s.frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(s.frameId);
  }, [animate]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <canvas
      ref={canvasRef}
      width={CW}
      height={CH}
      className={className}
      style={{ width, height, display: 'block' }}
    />
  );
});

WaterCup.displayName = 'WaterCup';
