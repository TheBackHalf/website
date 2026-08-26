"use client";

import { useEffect, useRef } from "react";

type Kind = "swallowtail" | "lavender" | "cream" | "amber" | "rose";
type Layer = "deep" | "near";

type ButterflySpec = {
  id: string;
  kind: Kind;
  layer: Layer;
  /** Final on-screen width as a fraction of viewport width. Must stay <= 0.07. */
  span: number;
  depth: number;
  speed: number;
  flapHz: number;
  seed: number;
  entryDelay: number;
  spawnX?: number;
  spawnY?: number;
  minPx?: number;
};

const ASSETS: Record<Kind, string> = {
  swallowtail: "/images/entrance/butterfly-swallowtail.webp",
  lavender: "/images/entrance/butterfly-lavender.webp",
  cream: "/images/entrance/butterfly-cream.webp",
  amber: "/images/entrance/butterfly-amber.webp",
  rose: "/images/entrance/butterfly-rose.webp",
};

const FLOCK: ButterflySpec[] = [
  { id: "far-a", kind: "cream", layer: "deep", span: 0.018, depth: 0.16, speed: 0.018, flapHz: 4.2, seed: 0.12, entryDelay: 1.4 },
  { id: "far-b", kind: "lavender", layer: "deep", span: 0.022, depth: 0.22, speed: 0.016, flapHz: 4.8, seed: 0.41, entryDelay: 2.6 },
  { id: "mid-a", kind: "amber", layer: "deep", span: 0.034, depth: 0.46, speed: 0.028, flapHz: 5.1, seed: 0.23, entryDelay: 0.9 },
  { id: "mid-b", kind: "rose", layer: "deep", span: 0.03, depth: 0.4, speed: 0.024, flapHz: 4.6, seed: 0.67, entryDelay: 1.8 },
  { id: "mid-c", kind: "swallowtail", layer: "near", span: 0.038, depth: 0.52, speed: 0.026, flapHz: 5.4, seed: 0.84, entryDelay: 3.1 },
  { id: "near-a", kind: "lavender", layer: "near", span: 0.056, depth: 0.78, speed: 0.032, flapHz: 4.4, seed: 0.09, entryDelay: 2.2 },
  { id: "far-c", kind: "amber", layer: "deep", span: 0.024, depth: 0.22, speed: 0.015, flapHz: 3.7, seed: 0.58, entryDelay: 0.55, spawnX: 0.38, spawnY: 0.13, minPx: 20 },
  { id: "far-d", kind: "cream", layer: "deep", span: 0.026, depth: 0.28, speed: 0.017, flapHz: 5.6, seed: 0.73, entryDelay: 1.05, spawnX: 0.58, spawnY: 0.16, minPx: 20 },
  { id: "mid-d", kind: "lavender", layer: "deep", span: 0.036, depth: 0.43, speed: 0.022, flapHz: 4.0, seed: 0.31, entryDelay: 0.45, spawnX: 0.12, spawnY: 0.19, minPx: 28 },
  { id: "mid-e", kind: "swallowtail", layer: "deep", span: 0.038, depth: 0.5, speed: 0.025, flapHz: 5.8, seed: 0.91, entryDelay: 1.65, spawnX: 0.86, spawnY: 0.74, minPx: 28 },
  { id: "near-b", kind: "rose", layer: "near", span: 0.048, depth: 0.68, speed: 0.029, flapHz: 3.9, seed: 0.55, entryDelay: 1.3, spawnX: 0.74, spawnY: 0.14, minPx: 34 },
];

type Agent = {
  spec: ButterflySpec;
  x: number;
  y: number;
  heading: number;
  turn: number;
  glide: number;
  pause: number;
  bob: number;
};

function seeded(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function inCopyZone(x: number, y: number) {
  return x > 0.2 && x < 0.8 && y > 0.26 && y < 0.78;
}

function wingPx(spec: ButterflySpec, width: number) {
  const raw = spec.span * width;
  const floor = spec.minPx ?? 0;
  const cap = (spec.minPx != null ? 0.09 : 0.065) * width;
  return Math.min(Math.max(raw, floor), cap);
}

function spawnInWorld(agent: Agent) {
  if (agent.spec.spawnX != null && agent.spec.spawnY != null) {
    agent.x = agent.spec.spawnX;
    agent.y = agent.spec.spawnY;
    const toward = agent.x < 0.45 ? 0.22 : agent.x > 0.55 ? Math.PI - 0.22 : 0.5;
    agent.heading = toward + (seeded(agent.spec.seed + 13) - 0.5) * 0.7;
    agent.turn = (seeded(agent.spec.seed + 14) - 0.5) * 0.2;
    agent.glide = seeded(agent.spec.seed + 15) * 0.8;
    return;
  }
  const deep = agent.spec.depth < 0.35;
  const near = agent.spec.depth > 0.6;
  const side = seeded(agent.spec.seed * 3) > 0.5 ? 0.1 : 0.78;
  agent.x = side + seeded(agent.spec.seed + 9) * 0.12;
  if (near) {
    agent.y = 0.14 + seeded(agent.spec.seed + 10) * 0.12;
  } else if (deep) {
    agent.y = 0.16 + seeded(agent.spec.seed + 11) * 0.14;
  } else {
    agent.y = seeded(agent.spec.seed + 12) > 0.5 ? 0.18 : 0.74;
  }
  agent.heading = (seeded(agent.spec.seed + 13) - 0.5) * 1.4;
  agent.turn = (seeded(agent.spec.seed + 14) - 0.5) * 0.2;
  agent.glide = seeded(agent.spec.seed + 15) * 0.8;
}

function spawnEdge(agent: Agent) {
  const roll = seeded(agent.spec.seed * 11 + agent.heading);
  if (roll < 0.34) {
    agent.x = -0.06;
    agent.y = 0.12 + seeded(agent.spec.seed + 1) * 0.22;
    agent.heading = -0.15 + seeded(agent.spec.seed + 2) * 0.55;
  } else if (roll < 0.68) {
    agent.x = 1.06;
    agent.y = 0.1 + seeded(agent.spec.seed + 3) * 0.24;
    agent.heading = Math.PI - 0.2 + seeded(agent.spec.seed + 4) * 0.5;
  } else {
    agent.x = 0.08 + seeded(agent.spec.seed + 5) * 0.84;
    agent.y = agent.spec.depth > 0.6 ? 0.82 : 0.08;
    agent.heading = agent.y < 0.3 ? 0.55 : -0.55;
    agent.heading += (seeded(agent.spec.seed + 6) - 0.5) * 0.6;
  }
  if (inCopyZone(agent.x, agent.y)) {
    agent.y = agent.spec.depth > 0.55 ? 0.84 : 0.14;
  }
  agent.turn = (seeded(agent.spec.seed + 7) - 0.5) * 0.25;
  agent.glide = 0;
}

function createAgents(layer: Layer): Agent[] {
  return FLOCK.filter((spec) => spec.layer === layer).map((spec) => {
    const agent: Agent = {
      spec,
      x: 0.12,
      y: 0.18,
      heading: 0,
      turn: 0,
      glide: 0,
      pause: spec.entryDelay,
      bob: spec.seed * 5.1,
    };
    if (spec.entryDelay > 2.4) {
      spawnEdge(agent);
    } else {
      spawnInWorld(agent);
      agent.pause = Math.min(spec.entryDelay, 1.15);
    }
    return agent;
  });
}

function ButterflyMark({ spec }: { spec: ButterflySpec }) {
  return (
    <div className="bh-bfly-rig">
      <div className="bh-bfly-wing is-left" data-wing="left">
        <img src={ASSETS[spec.kind]} alt="" draggable={false} />
      </div>
      <div className="bh-bfly-wing is-right" data-wing="right">
        <img src={ASSETS[spec.kind]} alt="" draggable={false} />
      </div>
    </div>
  );
}

export function EntranceButterflies({
  active,
  reduced,
  layer,
}: {
  active: boolean;
  reduced: boolean;
  layer: Layer;
}) {
  const layerRef = useRef<HTMLDivElement>(null);
  const agentsRef = useRef<Agent[] | null>(null);
  const cursor = useRef({ x: -9999, y: -9999 });
  const flock = FLOCK.filter((spec) => spec.layer === layer);

  if (!agentsRef.current) {
    agentsRef.current = createAgents(layer);
  }

  useEffect(() => {
    const root = layerRef.current;
    const agents = agentsRef.current;
    if (!root || !agents) return;
    const nodes = Array.from(root.querySelectorAll<HTMLElement>("[data-fly]"));
    const place = (node: HTMLElement, spec: ButterflySpec, x: number, y: number, facing = 1) => {
      const px = wingPx(spec, window.innerWidth);
      node.style.width = `${px}px`;
      node.style.height = `${px * 0.78}px`;
      node.style.opacity = String(0.38 + spec.depth * 0.42);
      node.style.filter = spec.depth < 0.3 ? "blur(0.55px)" : "drop-shadow(0 3px 5px oklch(0.16 0.04 300 / 0.18))";
      node.style.transform = `translate3d(${x}px, ${y}px, 0) rotateX(${8 + spec.depth * 8}deg) scale(${facing}, 1)`;
    };

    if (reduced) {
      const quiet =
        layer === "deep"
          ? [
              { x: 0.12, y: 0.18 },
              { x: 0.86, y: 0.16 },
              { x: 0.18, y: 0.72 },
              { x: 0.82, y: 0.68 },
              { x: 0.22, y: 0.12 },
              { x: 0.78, y: 0.22 },
              { x: 0.08, y: 0.58 },
              { x: 0.9, y: 0.48 },
            ]
          : [
              { x: 0.1, y: 0.4 },
              { x: 0.88, y: 0.36 },
              { x: 0.16, y: 0.14 },
            ];
      nodes.forEach((node, index) => {
        const spec = flock[index];
        const spot = quiet[index];
        place(node, spec, spot.x * window.innerWidth, spot.y * window.innerHeight);
        const left = node.querySelector<HTMLElement>('[data-wing="left"]');
        const right = node.querySelector<HTMLElement>('[data-wing="right"]');
        if (left) left.style.transform = "rotateY(12deg)";
        if (right) right.style.transform = "rotateY(-12deg)";
      });
      return;
    }

    if (!active) {
      nodes.forEach((node) => {
        node.style.opacity = "0";
      });
      return;
    }

    let frame = 0;
    let last = performance.now();
    const onMove = (event: PointerEvent) => {
      cursor.current = { x: event.clientX, y: event.clientY };
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    const tick = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const t = now / 1000;

      nodes.forEach((node, index) => {
        const agent = agents[index];
        const spec = agent.spec;
        if (agent.pause > 0) {
          agent.pause -= dt;
          node.style.opacity = "0";
          return;
        }

        const wander =
          Math.sin(t * (0.19 + spec.seed * 0.2) + spec.seed * 9) * 0.38 +
          Math.cos(t * (0.11 + spec.seed) + agent.bob) * 0.22;
        agent.turn += wander * dt * 0.45;
        if (seeded(spec.seed + Math.floor(t * 0.7) + index) > 0.96) {
          agent.turn += (seeded(t * 0.02 + index) - 0.5) * 0.9;
        }
        agent.heading += agent.turn * dt;
        agent.turn *= 0.985;

        if (agent.glide > 0) {
          agent.glide -= dt;
        } else if (seeded(spec.seed * 6 + Math.floor(t * 1.4)) > 0.86) {
          agent.glide = 0.8 + spec.seed * 1.6;
        }

        const hover = agent.glide > 0.2;
        const speed = spec.speed * (hover ? 0.18 : 0.85 + 0.2 * Math.sin(t * 0.33 + spec.seed));
        agent.x += Math.cos(agent.heading) * speed * dt;
        agent.y +=
          Math.sin(agent.heading) * speed * dt * 0.62 +
          Math.sin(t * (0.55 + spec.seed) + agent.bob) * (hover ? 0.01 : 0.004) * dt;

        if (inCopyZone(agent.x, agent.y)) {
          agent.y += agent.y < 0.5 ? -0.35 * dt : 0.35 * dt;
          agent.heading += agent.x < 0.5 ? 0.5 * dt : -0.5 * dt;
        }

        if (agent.x < -0.12 || agent.x > 1.12 || agent.y < -0.1 || agent.y > 1.1) {
          spawnEdge(agent);
          agent.pause = 0.35 + seeded(spec.seed + 8) * 1.4;
          node.style.opacity = "0";
          return;
        }

        const x = agent.x * w;
        const y = agent.y * h;
        const dx = x - cursor.current.x;
        const dy = y - cursor.current.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 0 && dist < 70) {
          agent.heading += (dx > 0 ? 0.2 : -0.2) * dt;
        }

        const facing = Math.cos(agent.heading) < 0 ? -1 : 1;
        const bank = Math.max(-1, Math.min(1, agent.turn * 1.4));
        const px = wingPx(spec, w);
        node.style.width = `${px}px`;
        node.style.height = `${px * 0.78}px`;
        node.style.opacity = String(0.34 + spec.depth * 0.46);
        node.style.filter =
          spec.depth < 0.28
            ? "blur(0.6px)"
            : "drop-shadow(0 3px 6px oklch(0.16 0.04 300 / 0.16))";
        node.style.zIndex = spec.depth < 0.5 ? "1" : "3";
        node.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${bank * -14}deg) rotateX(${8 + spec.depth * 10}deg) scale(${facing}, 1)`;

        const left = node.querySelector<HTMLElement>('[data-wing="left"]');
        const right = node.querySelector<HTMLElement>('[data-wing="right"]');
        const beat = 0.5 + 0.5 * Math.sin(t * spec.flapHz * Math.PI * 2 + spec.seed * 8);
        const shaped = Math.pow(beat, hover ? 2.8 : 1.45);
        const angle = 8 + shaped * (hover ? 18 : 42);
        if (left) left.style.transform = `rotateY(${angle}deg)`;
        if (right) right.style.transform = `rotateY(${-angle}deg)`;
      });
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
    };
  }, [active, reduced, layer]);

  return (
    <div ref={layerRef} className={`bh-ent-butterflies is-${layer}`} aria-hidden="true">
      {flock.map((spec) => (
        <div key={spec.id} className="bh-ent-butterfly" data-fly>
          <ButterflyMark spec={spec} />
        </div>
      ))}
    </div>
  );
}
