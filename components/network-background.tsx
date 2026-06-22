"use client";
import { useEffect, useRef } from "react";

// ─── Tunables ────────────────────────────────────────────────────────────────
const CONNECT_DIST = 155;
const DIST_SQ = CONNECT_DIST * CONNECT_DIST;
const MAX_SPEED = 0.28;
const BUCKETS = 5; // alpha tiers → 5 stroke() calls for all edges
const MAX_N = 220; // upper cap for pre-allocation

// ─── Pre-allocated edge storage (module-level = allocated once, never GC'd) ──
// Worst case: all MAX_N*(MAX_N-1)/2 edges land in one bucket.
// biome-ignore lint/suspicious/noBitwiseOperators: integer division via bit shift
const MAX_EDGES = (MAX_N * (MAX_N - 1)) >> 1; // 24 090
const _bufs = Array.from(
  { length: BUCKETS },
  () => new Float32Array(MAX_EDGES * 4)
);
const _lens = new Int32Array(BUCKETS);
const TAU = Math.PI * 2;

// ─── Helpers ─────────────────────────────────────────────────────────────────
interface Node {
  vx: number;
  vy: number;
  x: number;
  y: number;
}

/** Node density scales with viewport area so density looks consistent everywhere. */
function targetCount(w: number, h: number): number {
  return Math.max(60, Math.min(MAX_N, Math.round((w * h) / 10_000)));
}

function spawnNode(w: number, h: number): Node {
  const a = Math.random() * TAU;
  const s = MAX_SPEED * (0.5 + Math.random() * 0.5);
  return {
    x: Math.random() * w,
    y: Math.random() * h,
    vx: Math.cos(a) * s,
    vy: Math.sin(a) * s,
  };
}

// ─── Component ───────────────────────────────────────────────────────────────
export function NetworkBackground() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) {
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    let raf = 0;
    let W = window.innerWidth;
    let H = window.innerHeight;

    const nodes: Node[] = Array.from({ length: targetCount(W, H) }, () =>
      spawnNode(W, H)
    );

    // Sets canvas resolution to physical pixels, resets the transform.
    const applySize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.scale(dpr, dpr);
    };
    applySize();

    const onResize = () => {
      const pW = W,
        pH = H;
      W = window.innerWidth;
      H = window.innerHeight;
      // Preserve relative positions across resize.
      for (const n of nodes) {
        n.x = (n.x / pW) * W;
        n.y = (n.y / pH) * H;
      }
      // Grow/shrink node pool to match new viewport density.
      const next = targetCount(W, H);
      while (nodes.length < next) {
        nodes.push(spawnNode(W, H));
      }
      nodes.length = next;
      applySize();
    };

    window.addEventListener("resize", onResize);

    // ── Main loop ─────────────────────────────────────────────────────────────
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: intentional hot-path canvas animation
    const tick = () => {
      const dark = document.documentElement.classList.contains("dark");
      const fg = dark ? "#ffffff" : "#000000";
      const n = nodes.length;

      ctx.clearRect(0, 0, W, H);

      // Phase 1 — update positions, bounce off walls.
      for (let i = 0; i < n; i++) {
        const nd = nodes[i];
        nd.x += nd.vx;
        nd.y += nd.vy;
        if (nd.x < 0) {
          nd.x = 0;
          nd.vx = -nd.vx;
        } else if (nd.x > W) {
          nd.x = W;
          nd.vx = -nd.vx;
        }
        if (nd.y < 0) {
          nd.y = 0;
          nd.vy = -nd.vy;
        } else if (nd.y > H) {
          nd.y = H;
          nd.vy = -nd.vy;
        }
      }

      // Phase 2 — bucket edges by proximity tier (one O(n²) pass, no per-frame alloc).
      _lens.fill(0);
      for (let i = 0; i < n; i++) {
        const ax = nodes[i].x,
          ay = nodes[i].y;
        for (let j = i + 1; j < n; j++) {
          const dx = ax - nodes[j].x;
          const dy = ay - nodes[j].y;
          const d2 = dx * dx + dy * dy;
          if (d2 < DIST_SQ) {
            const t = 1 - Math.sqrt(d2) / CONNECT_DIST;
            // biome-ignore lint/suspicious/noBitwiseOperators: integer floor/shift for hot-path perf
            const b = Math.min(BUCKETS - 1, (t * BUCKETS) | 0);
            // biome-ignore lint/suspicious/noBitwiseOperators: multiply by 4 via shift in hot path
            const off = _lens[b] << 2; // * 4 — flat [x1,y1,x2,y2] layout
            _bufs[b][off] = ax;
            _bufs[b][off + 1] = ay;
            _bufs[b][off + 2] = nodes[j].x;
            _bufs[b][off + 3] = nodes[j].y;
            _lens[b]++;
          }
        }
      }

      ctx.strokeStyle = fg;

      // Phase 3a — halo pass: all edges as one wide, near-invisible stroke (replaces shadowBlur).
      ctx.lineWidth = 4;
      ctx.globalAlpha = dark ? 0.048 : 0.03;
      ctx.beginPath();
      for (let b = 0; b < BUCKETS; b++) {
        const c = _lens[b];
        const buf = _bufs[b];
        for (let e = 0; e < c; e++) {
          // biome-ignore lint/suspicious/noBitwiseOperators: multiply by 4 via shift in hot path
          const o = e << 2;
          ctx.moveTo(buf[o], buf[o + 1]);
          ctx.lineTo(buf[o + 2], buf[o + 3]);
        }
      }
      ctx.stroke();

      // Phase 3b — detail pass: one stroke per bucket, brightness driven by proximity (t²).
      for (let b = 0; b < BUCKETS; b++) {
        const c = _lens[b];
        if (c === 0) {
          continue;
        }
        const tMid = (b + 0.5) / BUCKETS;
        ctx.globalAlpha = dark ? tMid * tMid * 0.65 : tMid * tMid * 0.46;
        ctx.lineWidth = tMid * 1.4 + 0.1;
        const buf = _bufs[b];
        ctx.beginPath();
        for (let e = 0; e < c; e++) {
          // biome-ignore lint/suspicious/noBitwiseOperators: multiply by 4 via shift in hot path
          const o = e << 2;
          ctx.moveTo(buf[o], buf[o + 1]);
          ctx.lineTo(buf[o + 2], buf[o + 3]);
        }
        ctx.stroke();
      }

      // Phase 4 — nodes: outer halo + bright core, batched into 2 fill() calls.
      ctx.fillStyle = fg;

      ctx.globalAlpha = dark ? 0.1 : 0.06;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        ctx.moveTo(nodes[i].x + 5, nodes[i].y);
        ctx.arc(nodes[i].x, nodes[i].y, 5, 0, TAU);
      }
      ctx.fill();

      ctx.globalAlpha = dark ? 0.55 : 0.38;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        ctx.moveTo(nodes[i].x + 1.5, nodes[i].y);
        ctx.arc(nodes[i].x, nodes[i].y, 1.5, 0, TAU);
      }
      ctx.fill();

      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      aria-hidden="true"
      className="pointer-events-none fixed inset-0"
      ref={ref}
      style={{ zIndex: 0 }}
      tabIndex={-1}
    />
  );
}
