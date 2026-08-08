"use client"

import { useEffect, useRef } from "react"
import styles from "./AgentOrbit.module.css"

/**
 * Agent orbit hero — a neural sphere with the 12-agent pipeline
 * orbiting it, draggable to rotate.
 *
 * Ported from the standalone public/agent-orbit_10.html. The canvas
 * rendering and trackball drag maths are carried over unchanged; what
 * changed is the shell:
 *   • The scene is sized by its PARENT (position:absolute inset:0)
 *     rather than position:fixed over the viewport, so it drops into
 *     the hero grid like any other block.
 *   • Styles live in AgentOrbit.module.css, so the dark palette and
 *     generic class names (.scene, .core, .agent) cannot leak.
 *   • The original's `html,body{height:100%;overflow:hidden}` is gone
 *     — it would have frozen page scroll.
 *   • Agent cards are React nodes with refs instead of innerHTML.
 *   • The whole simulation lives in one useEffect and is fully torn
 *     down on unmount: rAF cancelled, listeners removed, observer
 *     disconnected.
 *   • A ResizeObserver replaces the window-resize handler so the
 *     scene re-lays-out when the hero column changes width even if
 *     the window doesn't.
 */

interface AgentDef {
  name: string
  done: string
  path: React.ReactNode
}

const AGENTS: AgentDef[] = [
  {
    name: "Resume Parser",
    done: "Parsed",
    path: (
      <>
        <path d="M4 4h16v16H4z" />
        <path d="M8 9h8M8 13h5" />
      </>
    ),
  },
  {
    name: "Job Match",
    done: "Matched",
    path: (
      <>
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
  },
  {
    name: "Research",
    done: "Found 6",
    path: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </>
    ),
  },
  { name: "Tone", done: "Set", path: <path d="M4 15s2-6 8-6 8 6 8 6" /> },
  { name: "ATS Optimizer", done: "94/100", path: <path d="m12 3 8 5v8l-8 5-8-5V8z" /> },
  {
    name: "Draft Writer",
    done: "Drafted",
    path: (
      <>
        <path d="M4 20h16" />
        <path d="M14 4 6 12l-1 5 5-1 8-8z" />
      </>
    ),
  },
  { name: "Editor", done: "Clean", path: <path d="M20 6 9 17l-5-5" /> },
]

/** Slight vertical stagger so the ring reads as a 3D orbit, not a band. */
const RING_Y = [-0.3, 0.14, 0.4, -0.4, -0.08, 0.26, -0.2]

interface Node {
  x: number
  y: number
  z: number
  size: number
  white: boolean
  phase: number
  pulse: number
  px: number
  py: number
  pz: number
  ps: number
}

interface Edge {
  a?: number
  b?: number
  type: "net" | "long" | "conn"
  agent?: number
  dir?: number
}

interface Signal {
  edge: number
  t: number
  speed: number
  r: number
  white: boolean
}

interface AgentState {
  el: HTMLElement
  angle: number
  ringY: number
  ax: number
  ay: number
  node: number
  depth: number
}

export function AgentOrbit() {
  const sceneRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hintRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<Array<HTMLElement | null>>([])

  useEffect(() => {
    const sceneEl = sceneRef.current
    const canvas = canvasRef.current
    const hint = hintRef.current
    if (!sceneEl || !canvas || !hint) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    // ── Configuration ────────────────────────────────────
    const NODE_COUNT = 260
    const MAX_LINKS = 5
    const LINK_DISTANCE = 0.42
    const SIGNAL_COUNT = 150
    const LONG_LINKS = 70
    const RING_RADIUS = 1.14

    const agents: AgentState[] = []
    cardRefs.current.forEach((el, i) => {
      if (!el) return
      agents.push({
        el,
        angle: (i / AGENTS.length) * Math.PI * 2,
        ringY: RING_Y[i],
        ax: 0,
        ay: 0,
        node: 0,
        depth: 0,
      })
    })
    if (!agents.length) return

    // ── Sphere data ──────────────────────────────────────
    const nodes: Node[] = []
    const edges: Edge[] = []
    const signals: Signal[] = []
    let width = 0
    let height = 0
    let dpr = 1
    let cx = 0
    let cy = 0
    let sphereScale = 0
    let time = 0

    function spherePoint() {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = 0.18 + Math.pow(Math.random(), 0.56) * 0.82
      return {
        x: r * Math.sin(phi) * Math.cos(theta),
        y: r * Math.cos(phi),
        z: r * Math.sin(phi) * Math.sin(theta),
      }
    }

    function buildNodes() {
      for (let i = 0; i < NODE_COUNT; i++) {
        const p = spherePoint()
        nodes.push({
          x: p.x,
          y: p.y,
          z: p.z,
          size: 0.5 + Math.random() * 1.7,
          white: Math.random() > 0.72,
          phase: Math.random() * Math.PI * 2,
          pulse: 0.014 + Math.random() * 0.024,
          px: 0,
          py: 0,
          pz: 0,
          ps: 1,
        })
      }
    }

    function buildEdges() {
      const degree = new Array(nodes.length).fill(0)
      const seen: Record<string, number> = {}
      const key = (a: number, b: number) => (a < b ? `${a}:${b}` : `${b}:${a}`)

      function addNet(a: number, b: number) {
        const k = key(a, b)
        if (a === b || seen[k]) return false
        seen[k] = 1
        edges.push({ a, b, type: "net" })
        degree[a]++
        degree[b]++
        return true
      }
      function dist2(a: number, b: number) {
        const dx = nodes[a].x - nodes[b].x
        const dy = nodes[a].y - nodes[b].y
        const dz = nodes[a].z - nodes[b].z
        return dx * dx + dy * dy + dz * dz
      }

      // Pass 1 — local neighbourhoods
      const LD2 = LINK_DISTANCE * LINK_DISTANCE
      for (let i = 0; i < nodes.length; i++) {
        const near: Array<{ j: number; d: number }> = []
        for (let j = i + 1; j < nodes.length; j++) {
          const d = dist2(i, j)
          if (d < LD2) near.push({ j, d })
        }
        near.sort((a, b) => a.d - b.d)
        for (let j = 0; j < Math.min(near.length, MAX_LINKS); j++) addNet(i, near[j].j)
      }

      // Pass 2 — no neuron left dangling
      const MIN_DEGREE = 3
      for (let i = 0; i < nodes.length; i++) {
        if (degree[i] >= MIN_DEGREE) continue
        const all: Array<{ j: number; d: number }> = []
        for (let j = 0; j < nodes.length; j++) if (j !== i) all.push({ j, d: dist2(i, j) })
        all.sort((a, b) => a.d - b.d)
        for (let j = 0; j < all.length && degree[i] < MIN_DEGREE; j++) addNet(i, all[j].j)
      }

      // Pass 2b — shell mesh so the silhouette is continuous
      const shell: number[] = []
      for (let i = 0; i < nodes.length; i++) {
        const rr = nodes[i].x ** 2 + nodes[i].y ** 2 + nodes[i].z ** 2
        if (rr > 0.72 * 0.72) shell.push(i)
      }
      for (let i = 0; i < shell.length; i++) {
        const si = shell[i]
        const sNear: Array<{ j: number; d: number }> = []
        for (let j = 0; j < shell.length; j++) {
          if (i !== j) sNear.push({ j: shell[j], d: dist2(si, shell[j]) })
        }
        sNear.sort((a, b) => a.d - b.d)
        let added = 0
        for (let j = 0; j < sNear.length && added < 3; j++) {
          addNet(si, sNear[j].j)
          added++
        }
      }

      // Pass 3 — bridge isolated clusters (union-find)
      const parent: number[] = []
      for (let i = 0; i < nodes.length; i++) parent[i] = i
      function find(x: number): number {
        while (parent[x] !== x) {
          parent[x] = parent[parent[x]]
          x = parent[x]
        }
        return x
      }
      const union = (a: number, b: number) => {
        parent[find(a)] = find(b)
      }
      for (const e of edges) {
        if (e.type === "net") union(e.a as number, e.b as number)
      }
      let changed = true
      while (changed) {
        changed = false
        const root0 = find(0)
        let bestA = -1
        let bestB = -1
        let bestD = Infinity
        for (let i = 0; i < nodes.length; i++) {
          if (find(i) === root0) continue
          for (let j = 0; j < nodes.length; j++) {
            if (find(j) !== root0) continue
            const dd = dist2(i, j)
            if (dd < bestD) {
              bestD = dd
              bestA = i
              bestB = j
            }
          }
        }
        if (bestA >= 0) {
          addNet(bestA, bestB)
          union(bestA, bestB)
          changed = true
        }
      }

      for (let i = 0; i < LONG_LINKS; i++) {
        const a = (Math.random() * nodes.length) | 0
        const b = (Math.random() * nodes.length) | 0
        if (a !== b) edges.push({ a, b, type: "long" })
      }
      agents.forEach((_, k) => {
        edges.push({ type: "conn", agent: k, dir: k % 2 ? 1 : -1 })
      })
    }

    function buildSignals() {
      for (let i = 0; i < SIGNAL_COUNT; i++) {
        signals.push({
          edge: (Math.random() * edges.length) | 0,
          t: Math.random(),
          speed: 0.0016 + Math.random() * 0.0044,
          r: 0.6 + Math.random() * 1.4,
          white: Math.random() > 0.72,
        })
      }
    }

    // ── Sprites ──────────────────────────────────────────
    function glowSprite(rgb: string) {
      const s = 64
      const c = document.createElement("canvas")
      c.width = c.height = s
      const g = c.getContext("2d")
      if (!g) return c
      const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
      grad.addColorStop(0.0, `rgba(${rgb},1)`)
      grad.addColorStop(0.16, `rgba(${rgb},.68)`)
      grad.addColorStop(0.42, `rgba(${rgb},.16)`)
      grad.addColorStop(1.0, `rgba(${rgb},0)`)
      g.fillStyle = grad
      g.fillRect(0, 0, s, s)
      return c
    }
    const SPR_BLUE = glowSprite("16,82,80")
    const SPR_WHITE = glowSprite("199,155,60")
    const SPR_DEEP = glowSprite("120,140,142")

    // ── Interaction — free orientation matrix ────────────
    const M = [1, 0, 0, 0, 1, 0, 0, 0, 1]
    let velX = 0
    let velY = 0
    let dragging = false
    let lastX = 0
    let lastY = 0
    let lastMove = 0
    let wanderBlend = 1
    let interacted = false

    const SENS = 0.0052
    const MAX_SPIN = 0.09
    const WANDER: number[] = []
    for (let ws = 0; ws < 14; ws++) WANDER.push(Math.random() * Math.PI * 2)

    let envTempo = 1
    let envFire = 1
    let envGlow = 1
    let envFireStep = 1
    let frameNorm = 1

    function rotX(a: number) {
      const c = Math.cos(a)
      const s = Math.sin(a)
      for (let col = 0; col < 3; col++) {
        const y = M[3 + col]
        const z = M[6 + col]
        M[3 + col] = c * y - s * z
        M[6 + col] = s * y + c * z
      }
    }
    function rotY(a: number) {
      const c = Math.cos(a)
      const s = Math.sin(a)
      for (let col = 0; col < 3; col++) {
        const x = M[col]
        const z = M[6 + col]
        M[col] = c * x + s * z
        M[6 + col] = -s * x + c * z
      }
    }
    function rotZ(a: number) {
      const c = Math.cos(a)
      const s = Math.sin(a)
      for (let col = 0; col < 3; col++) {
        const x = M[col]
        const y = M[3 + col]
        M[col] = c * x - s * y
        M[3 + col] = s * x + c * y
      }
    }
    function orthonormalize() {
      const l0 = Math.hypot(M[0], M[1], M[2]) || 1
      for (let i = 0; i < 3; i++) M[i] /= l0
      const d = M[0] * M[3] + M[1] * M[4] + M[2] * M[5]
      for (let i = 0; i < 3; i++) M[3 + i] -= d * M[i]
      const l1 = Math.hypot(M[3], M[4], M[5]) || 1
      for (let i = 0; i < 3; i++) M[3 + i] /= l1
      M[6] = M[1] * M[5] - M[2] * M[4]
      M[7] = M[2] * M[3] - M[0] * M[5]
      M[8] = M[0] * M[4] - M[1] * M[3]
    }

    function onPointerDown(e: PointerEvent) {
      dragging = true
      lastX = e.clientX
      lastY = e.clientY
      lastMove = performance.now()
      velX = 0
      velY = 0
      wanderBlend = 0
      sceneEl!.classList.add(styles.dragging)
      try {
        sceneEl!.setPointerCapture(e.pointerId)
      } catch {
        /* capture unsupported — drag still tracks via move events */
      }
      if (!interacted) {
        interacted = true
        hint!.classList.add(styles.hintGone)
      }
    }

    function onPointerMove(e: PointerEvent) {
      if (!dragging) return
      const now = performance.now()
      const dx = e.clientX - lastX
      const dy = e.clientY - lastY
      lastX = e.clientX
      lastY = e.clientY

      rotY(dx * SENS)
      rotX(dy * SENS * 0.85)

      const blend = Math.min(1, (now - lastMove) / 40)
      velY = velY * (1 - blend) + dx * SENS * blend
      velX = velX * (1 - blend) + dy * SENS * 0.85 * blend
      lastMove = now
    }

    function endDrag() {
      if (!dragging) return
      dragging = false
      sceneEl!.classList.remove(styles.dragging)
      if (performance.now() - lastMove > 90) {
        velX = 0
        velY = 0
      }
      velX = Math.max(-MAX_SPIN, Math.min(MAX_SPIN, velX))
      velY = Math.max(-MAX_SPIN, Math.min(MAX_SPIN, velY))
    }

    sceneEl.addEventListener("pointerdown", onPointerDown)
    sceneEl.addEventListener("pointermove", onPointerMove)
    sceneEl.addEventListener("pointerup", endDrag)
    sceneEl.addEventListener("pointercancel", endDrag)

    // ── Layout ───────────────────────────────────────────
    function layout() {
      const r = sceneEl!.getBoundingClientRect()
      width = r.width
      height = r.height
      if (!width || !height) return
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas!.width = Math.round(width * dpr)
      canvas!.height = Math.round(height * dpr)
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
      cx = width * 0.5
      cy = height * 0.5
      sphereScale = Math.min(width, height) * 0.47
    }

    // ── Projection ───────────────────────────────────────
    interface Proj {
      px: number
      py: number
      pz: number
      ps: number
    }
    function projectPoint(x0: number, y0: number, z0: number, out: Proj) {
      const x = M[0] * x0 + M[1] * y0 + M[2] * z0
      const y = M[3] * x0 + M[4] * y0 + M[5] * z0
      const z = M[6] * x0 + M[7] * y0 + M[8] * z0
      const persp = 1 / (1.55 - z * 0.55)
      out.px = cx + x * sphereScale * persp
      out.py = cy + y * sphereScale * persp
      out.pz = z
      out.ps = persp
    }
    function projectNodes() {
      for (const n of nodes) projectPoint(n.x, n.y, n.z, n)
    }

    const _cp: Proj = { px: 0, py: 0, pz: 0, ps: 1 }
    function placeAgents() {
      for (const a of agents) {
        projectPoint(
          Math.cos(a.angle) * RING_RADIUS,
          a.ringY,
          Math.sin(a.angle) * RING_RADIUS,
          _cp
        )
        const depth = Math.max(0, Math.min(1, (_cp.pz / RING_RADIUS + 1) / 2))
        const scale = 0.62 + depth * 0.5
        const alpha = 0.3 + Math.pow(depth, 1.4) * 0.7

        a.el.style.transform = `translate(${_cp.px}px,${_cp.py}px) translate(-50%,-50%) scale(${scale.toFixed(3)})`
        a.el.style.opacity = alpha.toFixed(3)
        a.el.style.zIndex = depth > 0.5 ? "5" : "1"

        const dx = cx - _cp.px
        const dy = cy - _cp.py
        const len = Math.hypot(dx, dy) || 1
        const reach = 72 * scale
        a.ax = _cp.px + (dx / len) * reach
        a.ay = _cp.py + (dy / len) * reach
        a.depth = depth
      }
    }

    // ── Geometry helpers ─────────────────────────────────
    interface Ctrl {
      c1x: number
      c1y: number
      c2x: number
      c2y: number
    }
    function controls(ax: number, ay: number, bx: number, by: number, bend: number, out: Ctrl) {
      const dx = bx - ax
      const dy = by - ay
      const len = Math.sqrt(dx * dx + dy * dy) || 1
      const nx = (-dy / len) * bend * len * 0.18
      const ny = (dx / len) * bend * len * 0.18
      out.c1x = ax + dx * 0.32 + nx
      out.c1y = ay + dy * 0.32 + ny
      out.c2x = ax + dx * 0.68 + nx
      out.c2y = ay + dy * 0.68 + ny
    }
    const _c: Ctrl = { c1x: 0, c1y: 0, c2x: 0, c2y: 0 }

    interface Pt {
      x: number
      y: number
    }
    function bezier(
      ax: number, ay: number, c1x: number, c1y: number,
      c2x: number, c2y: number, bx: number, by: number,
      t: number, out: Pt
    ) {
      const u = 1 - t
      const uu = u * u
      const tt = t * t
      out.x = uu * u * ax + 3 * uu * t * c1x + 3 * u * tt * c2x + tt * t * bx
      out.y = uu * u * ay + 3 * uu * t * c1y + 3 * u * tt * c2y + tt * t * by
    }
    const _p: Pt = { x: 0, y: 0 }
    const _q: Pt = { x: 0, y: 0 }

    interface Ends {
      ax: number
      ay: number
      bx: number
      by: number
      depth: number
    }
    function edgeEnds(e: Edge, out: Ends) {
      if (e.type === "conn") {
        const a = agents[e.agent as number]
        const n = nodes[a.node]
        out.ax = a.ax
        out.ay = a.ay
        out.bx = n.px
        out.by = n.py
        out.depth = n.pz
      } else {
        const p = nodes[e.a as number]
        const q = nodes[e.b as number]
        out.ax = p.px
        out.ay = p.py
        out.bx = q.px
        out.by = q.py
        out.depth = (p.pz + q.pz) * 0.5
      }
    }
    const _e: Ends = { ax: 0, ay: 0, bx: 0, by: 0, depth: 0 }

    function nearestFrontNodes(tx: number, ty: number, count: number) {
      const best: Array<{ k: number; d: number }> = []
      for (let k = 0; k < nodes.length; k++) {
        const n = nodes[k]
        if (n.pz < -0.15) continue
        const dx = n.px - tx
        const dy = n.py - ty
        const d = dx * dx + dy * dy
        if (best.length < count) {
          best.push({ k, d })
          best.sort((p, q) => p.d - q.d)
        } else if (d < best[best.length - 1].d) {
          best[best.length - 1] = { k, d }
          best.sort((p, q) => p.d - q.d)
        }
      }
      return best.map((b) => b.k)
    }

    let liveAgent = 0
    const isLive = (e: Edge) => e.type === "conn" && e.agent === liveAgent

    // ── Drawing ──────────────────────────────────────────
    const DEPTH_BUCKETS = 5
    let bucketPaths: Path2D[] = []
    for (let b = 0; b < DEPTH_BUCKETS; b++) bucketPaths.push(new Path2D())

    function drawEdges() {
      bucketPaths = []
      for (let i = 0; i < DEPTH_BUCKETS; i++) bucketPaths.push(new Path2D())
      const longPath = new Path2D()

      for (const e of edges) {
        if (e.type === "conn") continue
        edgeEnds(e, _e)
        const bend = e.type === "long" ? 0.62 : 0.22
        controls(_e.ax, _e.ay, _e.bx, _e.by, bend, _c)

        let target: Path2D
        if (e.type === "long") target = longPath
        else {
          const d = Math.max(0, Math.min(0.999, (_e.depth + 1) / 2))
          target = bucketPaths[(d * DEPTH_BUCKETS) | 0]
        }
        target.moveTo(_e.ax, _e.ay)
        target.bezierCurveTo(_c.c1x, _c.c1y, _c.c2x, _c.c2y, _e.bx, _e.by)
      }

      for (let i = 0; i < DEPTH_BUCKETS; i++) {
        const f = i / (DEPTH_BUCKETS - 1)
        ctx!.strokeStyle = `rgba(16,82,80,${(0.07 + f * f * 0.20).toFixed(3)})`
        ctx!.lineWidth = 0.45 + f * 0.4
        ctx!.stroke(bucketPaths[i])
      }
      ctx!.strokeStyle = "rgba(16,82,80,.055)"
      ctx!.lineWidth = 0.45
      ctx!.stroke(longPath)

      // Tendrils reaching from the sphere toward each card
      for (const e2 of edges) {
        if (e2.type !== "conn") continue
        const ag = agents[e2.agent as number]
        const roots = nearestFrontNodes(ag.ax, ag.ay, 3)
        if (!roots.length) continue
        ag.node = roots[0]

        const live = isLive(e2)
        const dimBack = 0.35 + ag.depth * 0.65
        const bend2 = 0.14 * (e2.dir as number)
        const root0 = nodes[roots[0]]

        controls(root0.px, root0.py, ag.ax, ag.ay, bend2, _c)
        const grad = ctx!.createLinearGradient(root0.px, root0.py, ag.ax, ag.ay)
        if (live) {
          grad.addColorStop(0, `rgba(199,155,60,${(0.85 * dimBack).toFixed(2)})`)
          grad.addColorStop(0.62, `rgba(199,155,60,${(0.38 * dimBack).toFixed(2)})`)
          grad.addColorStop(1, "rgba(199,155,60,0)")
          ctx!.lineWidth = 1.1
        } else {
          grad.addColorStop(0, `rgba(16,82,80,${(0.24 * dimBack).toFixed(2)})`)
          grad.addColorStop(0.55, `rgba(16,82,80,${(0.10 * dimBack).toFixed(2)})`)
          grad.addColorStop(1, "rgba(16,82,80,0)")
          ctx!.lineWidth = 0.6
        }
        ctx!.strokeStyle = grad
        ctx!.beginPath()
        ctx!.moveTo(root0.px, root0.py)
        ctx!.bezierCurveTo(_c.c1x, _c.c1y, _c.c2x, _c.c2y, ag.ax, ag.ay)
        ctx!.stroke()

        bezier(root0.px, root0.py, _c.c1x, _c.c1y, _c.c2x, _c.c2y, ag.ax, ag.ay, 0.42, _p)
        for (let b2 = 1; b2 < roots.length; b2++) {
          const rn = nodes[roots[b2]]
          const g2 = ctx!.createLinearGradient(rn.px, rn.py, _p.x, _p.y)
          g2.addColorStop(0, `rgba(16,82,80,${((live ? 0.40 : 0.15) * dimBack).toFixed(2)})`)
          g2.addColorStop(1, "rgba(16,82,80,0)")
          ctx!.strokeStyle = g2
          ctx!.lineWidth = live ? 0.8 : 0.5
          ctx!.beginPath()
          ctx!.moveTo(rn.px, rn.py)
          ctx!.quadraticCurveTo(
            (rn.px + _p.x) / 2 - (_p.y - rn.py) * 0.18 * (e2.dir as number),
            (rn.py + _p.y) / 2 + (_p.x - rn.px) * 0.18 * (e2.dir as number),
            _p.x,
            _p.y
          )
          ctx!.stroke()
        }
      }
    }

    const pickEdge = () => (Math.random() * edges.length) | 0

    function drawSignals() {
      const whiteTails = new Path2D()
      const blueTails = new Path2D()

      for (const s of signals) {
        let e = edges[s.edge]
        if (!reduce || dragging) {
          s.t += s.speed * (isLive(e) ? 2.1 : 1) * (0.55 + 0.55 * envFire) * frameNorm
        }
        if (s.t > 1) {
          s.t = 0
          s.edge = pickEdge()
          e = edges[s.edge]
        }

        edgeEnds(e, _e)
        const bend =
          e.type === "long" ? 0.62 : e.type === "conn" ? -0.14 * (e.dir || 1) : 0.22
        controls(_e.ax, _e.ay, _e.bx, _e.by, bend, _c)

        if (e.type === "conn") {
          bezier(_e.ax, _e.ay, _c.c1x, _c.c1y, _c.c2x, _c.c2y, _e.bx, _e.by, s.t, _p)
          const ease = Math.sin(Math.min(1, s.t) * Math.PI)
          const live2 = isLive(e)
          const spr2 = s.white ? SPR_WHITE : SPR_BLUE
          const r2 = s.r * (live2 ? 3.2 : 2.1)
          ctx!.globalAlpha =
            ease * (live2 ? 0.9 : 0.4) * (0.35 + agents[e.agent as number].depth * 0.65)
          ctx!.drawImage(spr2, _p.x - r2, _p.y - r2, r2 * 2, r2 * 2)
          continue
        }

        bezier(_e.ax, _e.ay, _c.c1x, _c.c1y, _c.c2x, _c.c2y, _e.bx, _e.by, s.t, _p)
        bezier(
          _e.ax, _e.ay, _c.c1x, _c.c1y, _c.c2x, _c.c2y, _e.bx, _e.by,
          Math.max(0, s.t - 0.035), _q
        )

        const tail = s.white ? whiteTails : blueTails
        tail.moveTo(_q.x, _q.y)
        tail.lineTo(_p.x, _p.y)

        const spr = s.white ? SPR_WHITE : SPR_BLUE
        const dScale = 0.65 + Math.max(0, Math.min(1, (_e.depth + 1) / 2)) * 0.7
        const r = s.r * 2.8 * dScale
        ctx!.globalAlpha = 0.85 * (0.45 + dScale * 0.5)
        ctx!.drawImage(spr, _p.x - r, _p.y - r, r * 2, r * 2)
      }
      ctx!.globalAlpha = 1

      ctx!.lineWidth = 1
      ctx!.strokeStyle = "rgba(199,155,60,.65)"
      ctx!.stroke(whiteTails)
      ctx!.strokeStyle = "rgba(16,82,80,.55)"
      ctx!.stroke(blueTails)
    }

    let order: number[] = []
    function drawNodes() {
      if (order.length !== nodes.length) order = nodes.map((_, i) => i)
      order.sort((a, b) => nodes[a].pz - nodes[b].pz)

      for (const idx of order) {
        const n = nodes[idx]
        if (!reduce || dragging) n.phase += n.pulse * envFireStep
        const w = Math.sin(n.phase)
        const flicker = 0.35 + 0.65 * Math.pow(Math.max(0, w), 2.2)
        const depth = Math.max(0, Math.min(1, (n.pz + 1) / 2))
        const r = (n.size + flicker * 0.7) * n.ps * 1.25

        let spr: HTMLCanvasElement
        if (depth < 0.42) {
          spr = SPR_DEEP
          ctx!.globalAlpha = Math.min(1, (0.06 + depth * 0.42) * (0.55 + flicker * 0.45) * envGlow)
        } else {
          spr = n.white ? SPR_WHITE : SPR_BLUE
          ctx!.globalAlpha = Math.min(
            1,
            ((n.white ? 0.22 : 0.14) + Math.pow(depth, 1.6) * 0.55) *
              (0.45 + flicker * 0.85) *
              envGlow
          )
        }
        const g = r * 4.2
        ctx!.drawImage(spr, n.px - g, n.py - g, g * 2, g * 2)

        ctx!.globalAlpha = 1
        if (depth > 0.5 && (n.white || r > 1.5)) {
          ctx!.fillStyle = `rgba(13,63,61,${Math.min(1, (0.30 + depth * 0.5) * (0.5 + flicker) * envGlow).toFixed(2)})`
          ctx!.beginPath()
          ctx!.arc(n.px, n.py, Math.max(0.4, r * 0.3), 0, Math.PI * 2)
          ctx!.fill()
        }
      }
      ctx!.globalAlpha = 1
    }

    function drawCoreGlow() {
      const r = Math.min(width, height) * 0.13
      const g = ctx!.createRadialGradient(cx, cy, 0, cx, cy, r)
      g.addColorStop(0, "rgba(199,155,60,.16)")
      g.addColorStop(0.22, "rgba(199,155,60,.09)")
      g.addColorStop(1, "rgba(199,155,60,0)")
      ctx!.fillStyle = g
      ctx!.beginPath()
      ctx!.arc(cx, cy, r, 0, Math.PI * 2)
      ctx!.fill()
    }

    // ── Loop ─────────────────────────────────────────────
    let prevNow = performance.now()
    let rafId = 0

    function frame(now?: number) {
      const t = now || performance.now()
      const dt = Math.min((t - prevNow) / 1000, 0.05)
      prevNow = t
      const norm = dt / 0.01667
      frameNorm = norm
      time += dt

      const sTempo =
        Math.sin(time * 0.157 + WANDER[4]) * 0.6 + Math.sin(time * 0.071 + WANDER[5]) * 0.4
      envTempo = 0.35 + 1.55 * Math.pow(0.5 + 0.5 * sTempo, 1.7)

      const sFire =
        Math.sin(time * 0.19 + WANDER[6]) * 0.6 + Math.sin(time * 0.083 + WANDER[7]) * 0.4
      envFire = 0.75 + 1.65 * Math.pow(0.5 + 0.5 * sFire, 1.9)
      envFireStep = envFire * norm

      const sGlow =
        Math.sin(time * 0.127 + WANDER[8]) * 0.6 + Math.sin(time * 0.053 + WANDER[9]) * 0.4
      envGlow = 0.68 + 0.62 * (0.5 + 0.5 * sGlow)

      if (!dragging) {
        rotY(velY * norm)
        rotX(velX * norm)
        const fr = Math.pow(0.945, norm)
        velX *= fr
        velY *= fr

        wanderBlend = Math.min(1, wanderBlend + dt * 0.6)
        const w = wanderBlend * wanderBlend

        const wy =
          (Math.sin(time * 0.11 + WANDER[0]) * 0.0016 +
            Math.sin(time * 0.041 + WANDER[1]) * 0.0011 +
            Math.cos(time * 0.05 + WANDER[10]) * 0.0007) * envTempo
        const wx =
          (Math.sin(time * 0.089 + WANDER[2]) * 0.0013 +
            Math.sin(time * 0.033 + WANDER[3]) * 0.0009 +
            Math.sin(time * 0.037 + WANDER[11]) * 0.0007) * envTempo
        const wz =
          (Math.sin(time * 0.061 + WANDER[12]) * 0.0005 +
            Math.sin(time * 0.027 + WANDER[13]) * 0.0004) * envTempo

        rotY(wy * norm * w)
        rotX(wx * norm * w)
        rotZ(wz * norm * w)
      }
      orthonormalize()

      liveAgent = ((time / 2.8) | 0) % agents.length

      ctx!.clearRect(0, 0, width, height)
      projectNodes()
      placeAgents()

      // drawOcclusion() intentionally not called: it painted a dark
      // radial to sink the sphere's far side into a black backdrop.
      // On cream that reads as a grey smudge.

      ctx!.save()
      ctx!.globalCompositeOperation = "source-over"
      drawEdges()
      drawSignals()
      drawNodes()
      drawCoreGlow()
      ctx!.restore()

      rafId = requestAnimationFrame(frame)
    }

    // ── Start ────────────────────────────────────────────
    buildNodes()
    buildEdges()
    buildSignals()
    layout()
    rafId = requestAnimationFrame(frame)

    // The hero column can change width without the window resizing
    // (breakpoints, scrollbar appearing), so observe the element.
    let resizeTimer: ReturnType<typeof setTimeout> | undefined
    const observer = new ResizeObserver(() => {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(layout, 120)
    })
    observer.observe(sceneEl)

    // A hidden document suspends rAF AND stops ResizeObserver firing,
    // so a tab that was resized while in the background comes back
    // with a stale canvas. Re-measure on return, and reset the frame
    // clock so the first frame after resume isn't a huge dt.
    function onVisibility() {
      if (document.hidden) return
      prevNow = performance.now()
      layout()
    }
    document.addEventListener("visibilitychange", onVisibility)

    return () => {
      cancelAnimationFrame(rafId)
      clearTimeout(resizeTimer)
      observer.disconnect()
      document.removeEventListener("visibilitychange", onVisibility)
      sceneEl.removeEventListener("pointerdown", onPointerDown)
      sceneEl.removeEventListener("pointermove", onPointerMove)
      sceneEl.removeEventListener("pointerup", endDrag)
      sceneEl.removeEventListener("pointercancel", endDrag)
    }
  }, [])

  return (
    <div
      ref={sceneRef}
      className={styles.scene}
      role="img"
      aria-label="An interactive neural sphere with ForgeLetter's AI agents orbiting it. Drag to rotate."
    >
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />

      {AGENTS.map((agent, i) => (
        <article
          key={agent.name}
          ref={(el) => {
            cardRefs.current[i] = el
          }}
          className={styles.agent}
          aria-hidden="true"
        >
          <span className={styles.ico}>
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {agent.path}
            </svg>
          </span>
          <span>
            <b>{agent.name}</b>
            <span className={styles.status}>
              <i className={styles.dot} />
              {agent.done}
            </span>
          </span>
        </article>
      ))}

      <div className={styles.core} aria-hidden="true">
        <span className={styles.corePulse} />
        ORCHESTRATOR
      </div>
      <div ref={hintRef} className={styles.hint} aria-hidden="true">
        Drag to rotate
      </div>
    </div>
  )
}
