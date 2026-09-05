// @ts-nocheck
/* Neural-portal engine -- the <script> from the approved standalone
   design (agent-orbit-portal), ported byte-identical. The ONLY edits
   are the lifecycle seams React needs: pointer/resize handlers are
   named so they can be removed, the rAF id is captured so the loop
   can be cancelled, and a cleanup function is returned at the end.
   All rendering, drag and parallax logic is untouched -- if the
   visual needs to change, change the standalone file and re-port.
   ADDITION: the interior background layers (atmosphere, energy
   horizon + grid, firmament) are implemented from the numbers in
   frame-and-background-specs.md Part 2. */
export function startNeuralPortal() {
  "use strict";

  var sceneEl = document.getElementById("scene");
  var canvas = document.getElementById("net");
  var ctx = canvas.getContext("2d");
  var hint = document.getElementById("hint");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ─────────────────────────────────────────────────────
  //  Configuration
  // ─────────────────────────────────────────────────────
  var NODE_COUNT = 260;
  var MAX_LINKS = 5;
  var LINK_DISTANCE = 0.42;
  var SIGNAL_COUNT = 150;
  var LONG_LINKS = 70;
  var RING_RADIUS = 1.14;        // agent orbit hugs the sphere's limb

  var ICON = {
    parse:  '<path d="M4 4h16v16H4z"/><path d="M8 9h8M8 13h5"/>',
    match:  '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    tone:   '<path d="M4 15s2-6 8-6 8 6 8 6"/>',
    ats:    '<path d="m12 3 8 5v8l-8 5-8-5V8z"/>',
    write:  '<path d="M4 20h16"/><path d="M14 4 6 12l-1 5 5-1 8-8z"/>',
    edit:   '<path d="M20 6 9 17l-5-5"/>'
  };

  var AGENTS = [
    { id: "parser",   name: "Resume Parser", icon: ICON.parse,  done: "Parsed"  },
    { id: "match",    name: "Job Match",     icon: ICON.match,  done: "Matched" },
    { id: "research", name: "Research",      icon: ICON.search, done: "Found 6" },
    { id: "tone",     name: "Tone",          icon: ICON.tone,   done: "Set"     },
    { id: "ats",      name: "ATS Optimizer", icon: ICON.ats,    done: "94/100"  },
    { id: "writer",   name: "Draft Writer",  icon: ICON.write,  done: "Drafted" },
    { id: "editor",   name: "Editor",        icon: ICON.edit,   done: "Clean"   }
  ];

  // Slight vertical stagger so the ring reads as a 3D orbit, not a band
  var RING_Y = [-0.30, 0.14, 0.40, -0.40, -0.08, 0.26, -0.20];

  AGENTS.forEach(function (a, i) {
    var el = document.createElement("article");
    el.className = "agent";
    el.innerHTML =
      '<span class="ico"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
      a.icon + '</svg></span>' +
      '<span class="meta"><b>' + a.name + '</b>' +
      '<span class="status"><i class="dot"></i>' + a.done + '</span></span>';
    sceneEl.appendChild(el);
    a.el = el;
    a.angle = (i / AGENTS.length) * Math.PI * 2;
    a.ringY = RING_Y[i];
    a.ax = 0; a.ay = 0;          // live tendril anchor
    a.node = 0;
  });

  // ─────────────────────────────────────────────────────
  //  Sphere data
  // ─────────────────────────────────────────────────────
  var nodes = [], edges = [], signals = [];
  var para = { x: 0, y: 0, tx: 0, ty: 0 };
  var baseCx = 0, baseCy = 0;
  var DUST = [];
  var width = 0, height = 0, dpr = 1;
  var cx = 0, cy = 0, sphereScale = 0;
  var time = 0;

  function spherePoint() {
    var theta = Math.random() * Math.PI * 2;
    var phi = Math.acos(2 * Math.random() - 1);
    var r = 0.18 + Math.pow(Math.random(), 0.56) * 0.82;
    return {
      x: r * Math.sin(phi) * Math.cos(theta),
      y: r * Math.cos(phi),
      z: r * Math.sin(phi) * Math.sin(theta)
    };
  }

  function buildNodes() {
    for (var i = 0; i < NODE_COUNT; i++) {
      var p = spherePoint();
      nodes.push({
        x: p.x, y: p.y, z: p.z,
        size: 0.5 + Math.random() * 1.7,
        white: Math.random() > 0.72,
        phase: Math.random() * Math.PI * 2,
        pulse: 0.014 + Math.random() * 0.024,
        px: 0, py: 0, pz: 0, ps: 1
      });
    }
  }

  function buildEdges() {
    var i, j;
    var degree = new Array(nodes.length).fill(0);
    var seen = {};

    function key(a, b) { return a < b ? a + ":" + b : b + ":" + a; }
    function addNet(a, b) {
      var k = key(a, b);
      if (a === b || seen[k]) return false;
      seen[k] = 1;
      edges.push({ a: a, b: b, type: "net" });
      degree[a]++; degree[b]++;
      return true;
    }
    function dist2(a, b) {
      var dx = nodes[a].x - nodes[b].x;
      var dy = nodes[a].y - nodes[b].y;
      var dz = nodes[a].z - nodes[b].z;
      return dx * dx + dy * dy + dz * dz;
    }

    // Pass 1 — local neighbourhoods, as before
    var LD2 = LINK_DISTANCE * LINK_DISTANCE;
    for (i = 0; i < nodes.length; i++) {
      var near = [];
      for (j = i + 1; j < nodes.length; j++) {
        var d = dist2(i, j);
        if (d < LD2) near.push({ j: j, d: d });
      }
      near.sort(function (a, b) { return a.d - b.d; });
      for (j = 0; j < Math.min(near.length, MAX_LINKS); j++) addNet(i, near[j].j);
    }

    // Pass 2 — no neuron is left dangling: any node below minimum
    // degree gets wired to its globally nearest neighbours, distance
    // cap ignored. This is what closes the ragged perimeter.
    var MIN_DEGREE = 3;
    for (i = 0; i < nodes.length; i++) {
      if (degree[i] >= MIN_DEGREE) continue;
      var all = [];
      for (j = 0; j < nodes.length; j++) {
        if (j !== i) all.push({ j: j, d: dist2(i, j) });
      }
      all.sort(function (a, b) { return a.d - b.d; });
      for (j = 0; j < all.length && degree[i] < MIN_DEGREE; j++) addNet(i, all[j].j);
    }

    // Pass 2b — a dedicated shell mesh. Every outer neuron is stitched
    // to its nearest fellow shell neurons, so the silhouette itself is
    // a continuous web at every rotation angle, not a scatter of tips.
    var shell = [];
    for (i = 0; i < nodes.length; i++) {
      var rr = nodes[i].x * nodes[i].x + nodes[i].y * nodes[i].y + nodes[i].z * nodes[i].z;
      if (rr > 0.72 * 0.72) shell.push(i);
    }
    for (i = 0; i < shell.length; i++) {
      var si = shell[i], sNear = [];
      for (j = 0; j < shell.length; j++) {
        if (i !== j) sNear.push({ j: shell[j], d: dist2(si, shell[j]) });
      }
      sNear.sort(function (a, b) { return a.d - b.d; });
      var added = 0;
      for (j = 0; j < sNear.length && added < 3; j++) {
        if (addNet(si, sNear[j].j)) added++;
        else added++;   // already linked to this shell neighbour — counts
      }
    }

    // Pass 3 — bridge any isolated clusters so the whole sphere is one
    // connected network: union-find over components, then join each
    // stray component to the rest through its closest pair of nodes
    var parent = [];
    for (i = 0; i < nodes.length; i++) parent[i] = i;
    function find(x) { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; }
    function union(a, b) { parent[find(a)] = find(b); }
    for (i = 0; i < edges.length; i++) {
      if (edges[i].type === "net") union(edges[i].a, edges[i].b);
    }
    var changed = true;
    while (changed) {
      changed = false;
      var root0 = find(0);
      var bestA = -1, bestB = -1, bestD = Infinity;
      for (i = 0; i < nodes.length; i++) {
        if (find(i) === root0) continue;
        for (j = 0; j < nodes.length; j++) {
          if (find(j) !== root0) continue;
          var dd = dist2(i, j);
          if (dd < bestD) { bestD = dd; bestA = i; bestB = j; }
        }
      }
      if (bestA >= 0) { addNet(bestA, bestB); union(bestA, bestB); changed = true; }
    }

    for (i = 0; i < LONG_LINKS; i++) {
      var a = (Math.random() * nodes.length) | 0;
      var b = (Math.random() * nodes.length) | 0;
      if (a !== b) edges.push({ a: a, b: b, type: "long" });
    }
    AGENTS.forEach(function (ag, k) {
      edges.push({ type: "conn", agent: k, dir: (k % 2 ? 1 : -1) });
    });
  }

  function buildSignals() {
    for (var i = 0; i < SIGNAL_COUNT; i++) {
      signals.push({
        edge: (Math.random() * edges.length) | 0,
        t: Math.random(),
        speed: 0.0016 + Math.random() * 0.0044,
        r: 0.6 + Math.random() * 1.4,
        white: Math.random() > 0.72
      });
    }
  }

  // ─────────────────────────────────────────────────────
  //  Sprites
  // ─────────────────────────────────────────────────────
  function glowSprite(rgb) {
    var s = 64, c = document.createElement("canvas");
    c.width = c.height = s;
    var g = c.getContext("2d");
    var grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    grad.addColorStop(0.00, "rgba(" + rgb + ",1)");
    grad.addColorStop(0.13, "rgba(" + rgb + ",.78)");
    grad.addColorStop(0.32, "rgba(" + rgb + ",.30)");
    grad.addColorStop(0.60, "rgba(" + rgb + ",.10)");
    grad.addColorStop(1.00, "rgba(" + rgb + ",0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, s, s);
    return c;
  }
  var NEURON_GLOW = 1.12;   // slight halo lift, nodes only
  var SPR_BLUE = glowSprite("45,212,191");
  var SPR_WHITE = glowSprite("255,206,118");
  var SPR_DEEP = glowSprite("14,86,92");

  // ─────────────────────────────────────────────────────
  //  Interaction — a free orientation matrix, so the sphere
  //  can tumble in any direction with no pole clamp
  // ─────────────────────────────────────────────────────
  var M = [1, 0, 0, 0, 1, 0, 0, 0, 1];   // row-major 3×3
  var velX = 0, velY = 0;                 // coast, about screen axes
  var dragging = false, lastX = 0, lastY = 0, lastMove = 0;
  var wanderBlend = 1, interacted = false;

  var SENS = 0.0052;
  var MAX_SPIN = 0.09;
  var WANDER = [];
  for (var ws = 0; ws < 18; ws++) WANDER.push(Math.random() * Math.PI * 2);

  var envTempo = 1, envFire = 1, envGlow = 1, envAtmo = 1, envFireStep = 1, frameNorm = 1;

  // Premultiplied screen-axis rotations: the drag always behaves the
  // same regardless of the sphere's current orientation
  function rotX(a) {
    var c = Math.cos(a), s = Math.sin(a);
    for (var col = 0; col < 3; col++) {
      var y = M[3 + col], z = M[6 + col];
      M[3 + col] = c * y - s * z;
      M[6 + col] = s * y + c * z;
    }
  }
  function rotY(a) {
    var c = Math.cos(a), s = Math.sin(a);
    for (var col = 0; col < 3; col++) {
      var x = M[col], z = M[6 + col];
      M[col] = c * x + s * z;
      M[6 + col] = -s * x + c * z;
    }
  }
  function rotZ(a) {
    var c = Math.cos(a), s = Math.sin(a);
    for (var col = 0; col < 3; col++) {
      var x = M[col], y = M[3 + col];
      M[col] = c * x - s * y;
      M[3 + col] = s * x + c * y;
    }
  }

  // Re-square the matrix now and then so numeric drift never shears it
  function orthonormalize() {
    var i;
    var l0 = Math.hypot(M[0], M[1], M[2]) || 1;
    for (i = 0; i < 3; i++) M[i] /= l0;
    var d = M[0] * M[3] + M[1] * M[4] + M[2] * M[5];
    for (i = 0; i < 3; i++) M[3 + i] -= d * M[i];
    var l1 = Math.hypot(M[3], M[4], M[5]) || 1;
    for (i = 0; i < 3; i++) M[3 + i] /= l1;
    M[6] = M[1] * M[5] - M[2] * M[4];
    M[7] = M[2] * M[3] - M[0] * M[5];
    M[8] = M[0] * M[4] - M[1] * M[3];
  }

  var onPointerDown = function (e) {
    dragging = true;
    lastX = e.clientX; lastY = e.clientY;
    lastMove = performance.now();
    velX = 0; velY = 0;
    wanderBlend = 0;
    sceneEl.classList.add("dragging");
    sceneEl.setPointerCapture(e.pointerId);
    if (!interacted) { interacted = true; hint.classList.add("gone"); }
  };
  sceneEl.addEventListener("pointerdown", onPointerDown);

  var onPointerMove = function (e) {
    var rr = sceneEl.getBoundingClientRect();
    para.tx = ((e.clientX - rr.left) / rr.width - 0.5) * -26;
    para.ty = ((e.clientY - rr.top) / rr.height - 0.5) * -18;
    if (!dragging) return;
    var now = performance.now();
    var dx = e.clientX - lastX;
    var dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;

    // Trackball: horizontal spins about the screen's vertical axis,
    // vertical tumbles over the top — no clamp, full 360 both ways
    rotY(dx * SENS);
    rotX(dy * SENS * 0.85);

    var blend = Math.min(1, (now - lastMove) / 40);
    velY = velY * (1 - blend) + (dx * SENS) * blend;
    velX = velX * (1 - blend) + (dy * SENS * 0.85) * blend;
    lastMove = now;
  };
  sceneEl.addEventListener("pointermove", onPointerMove);

  function endDrag() {
    if (!dragging) return;
    dragging = false;
    sceneEl.classList.remove("dragging");
    if (performance.now() - lastMove > 90) { velX = 0; velY = 0; }
    velX = Math.max(-MAX_SPIN, Math.min(MAX_SPIN, velX));
    velY = Math.max(-MAX_SPIN, Math.min(MAX_SPIN, velY));
  }
  sceneEl.addEventListener("pointerup", endDrag);
  sceneEl.addEventListener("pointercancel", endDrag);
  var onPointerLeave = function () { para.tx = 0; para.ty = 0; };
  sceneEl.addEventListener("pointerleave", onPointerLeave);

  // ─────────────────────────────────────────────────────
  //  Layout
  // ─────────────────────────────────────────────────────
  function layout() {
    // offsetWidth/offsetHeight, NOT getBoundingClientRect() -- the
    // frame's 3D tilt makes the bounding rect return the projected
    // box, which would distort the canvas backing store.
    width = sceneEl.offsetWidth; height = sceneEl.offsetHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    baseCx = width * 0.5;
    baseCy = height * 0.5;
    sphereScale = Math.min(width, height) * 0.55;
  }

  // ─────────────────────────────────────────────────────
  //  Projection — nodes and cards share it exactly
  // ─────────────────────────────────────────────────────
  function projectPoint(x0, y0, z0, out) {
    var x = M[0] * x0 + M[1] * y0 + M[2] * z0;
    var y = M[3] * x0 + M[4] * y0 + M[5] * z0;
    var z = M[6] * x0 + M[7] * y0 + M[8] * z0;
    var persp = 1 / (1.55 - z * 0.55);
    out.px = cx + x * sphereScale * persp;
    out.py = cy + y * sphereScale * persp;
    out.pz = z;
    out.ps = persp;
  }

  function projectNodes() {
    for (var i = 0; i < nodes.length; i++) projectPoint(nodes[i].x, nodes[i].y, nodes[i].z, nodes[i]);
  }

  // Cards orbit at RING_RADIUS on the same rotation. Depth drives
  // scale, opacity and stacking: cards behind the sphere shrink, dim
  // and slip beneath the canvas so the network passes in front.
  var _cp = { px: 0, py: 0, pz: 0, ps: 1 };

  function placeAgents() {
    for (var i = 0; i < AGENTS.length; i++) {
      var a = AGENTS[i];
      projectPoint(
        Math.cos(a.angle) * RING_RADIUS,
        a.ringY,
        Math.sin(a.angle) * RING_RADIUS,
        _cp
      );
      var depth = Math.max(0, Math.min(1, (_cp.pz / RING_RADIUS + 1) / 2));
      var scale = 0.62 + depth * 0.5;
      var alpha = 0.30 + Math.pow(depth, 1.4) * 0.70;

      a.el.style.transform =
        "translate(" + (_cp.px) + "px," + (_cp.py) + "px) translate(-50%,-50%) scale(" + scale.toFixed(3) + ")";
      a.el.style.opacity = alpha.toFixed(3);
      a.el.style.zIndex = depth > 0.5 ? 5 : 1;

      // Tendril anchor: the card's sphere-facing edge
      var dx = cx - _cp.px, dy = cy - _cp.py;
      var len = Math.hypot(dx, dy) || 1;
      var reach = 72 * scale;
      a.ax = _cp.px + dx / len * reach;
      a.ay = _cp.py + dy / len * reach;
      a.depth = depth;
    }
  }

  // ─────────────────────────────────────────────────────
  //  Geometry helpers
  // ─────────────────────────────────────────────────────
  function controls(ax, ay, bx, by, bend, out) {
    var dx = bx - ax, dy = by - ay;
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    var nx = -dy / len * bend * len * 0.18;
    var ny = dx / len * bend * len * 0.18;
    out.c1x = ax + dx * 0.32 + nx; out.c1y = ay + dy * 0.32 + ny;
    out.c2x = ax + dx * 0.68 + nx; out.c2y = ay + dy * 0.68 + ny;
  }
  var _c = { c1x: 0, c1y: 0, c2x: 0, c2y: 0 };

  function bezier(ax, ay, c1x, c1y, c2x, c2y, bx, by, t, out) {
    var u = 1 - t, uu = u * u, tt = t * t;
    out.x = uu * u * ax + 3 * uu * t * c1x + 3 * u * tt * c2x + tt * t * bx;
    out.y = uu * u * ay + 3 * uu * t * c1y + 3 * u * tt * c2y + tt * t * by;
  }
  var _p = { x: 0, y: 0 }, _q = { x: 0, y: 0 };

  function edgeEnds(e, out) {
    if (e.type === "conn") {
      var a = AGENTS[e.agent], n = nodes[a.node];
      out.ax = a.ax; out.ay = a.ay; out.bx = n.px; out.by = n.py; out.depth = n.pz;
    } else {
      var p = nodes[e.a], q = nodes[e.b];
      out.ax = p.px; out.ay = p.py; out.bx = q.px; out.by = q.py;
      out.depth = (p.pz + q.pz) * 0.5;
    }
  }
  var _e = { ax: 0, ay: 0, bx: 0, by: 0, depth: 0 };

  function nearestFrontNodes(tx, ty, count) {
    var best = [];
    for (var k = 0; k < nodes.length; k++) {
      var n = nodes[k];
      if (n.pz < -0.15) continue;
      var dx = n.px - tx, dy = n.py - ty;
      var d = dx * dx + dy * dy;
      if (best.length < count) {
        best.push({ k: k, d: d });
        best.sort(function (p, q) { return p.d - q.d; });
      } else if (d < best[best.length - 1].d) {
        best[best.length - 1] = { k: k, d: d };
        best.sort(function (p, q) { return p.d - q.d; });
      }
    }
    return best.map(function (b) { return b.k; });
  }

  // A gentle highlight wanders the ring so the scene stays alive
  var liveAgent = 0;
  function isLive(e) { return e.type === "conn" && e.agent === liveAgent; }

  // ─────────────────────────────────────────────────────
  //  Drawing
  // ─────────────────────────────────────────────────────
  var DEPTH_BUCKETS = 5;
  var buckets = [];
  for (var b = 0; b < DEPTH_BUCKETS; b++) buckets.push(new Path2D());

  // Far dust plane: faint motes that drift more slowly than the
  // sphere as it turns, and shift less under parallax — the depth cue
  // that turns the aperture from an image into a volume
  function drawDust() {
    var fx = M[2], fy = M[5];   // where the sphere's "forward" points
    for (var i = 0; i < DUST.length; i++) {
      var d = DUST[i];
      var x = d.u * width + fx * width * 0.045 * d.depth + para.x * d.depth * 0.55;
      var y = d.v * height + fy * height * 0.045 * d.depth + para.y * d.depth * 0.55;
      if (x < -4 || x > width + 4 || y < -4 || y > height + 4) continue;
      ctx.globalAlpha = d.a * envGlow;
      ctx.fillStyle = "rgba(90,200,185,1)";
      ctx.beginPath();
      ctx.arc(x, y, d.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawOcclusion() {
    var R = sphereScale * 0.74;
    var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    g.addColorStop(0, "rgba(2,12,11,.55)");
    g.addColorStop(0.75, "rgba(2,12,11,.28)");
    g.addColorStop(1, "rgba(2,12,11,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawEdges() {
    var i;
    for (i = 0; i < DEPTH_BUCKETS; i++) buckets[i] = new Path2D();
    var longPath = new Path2D();

    for (i = 0; i < edges.length; i++) {
      var e = edges[i];
      if (e.type === "conn") continue;
      edgeEnds(e, _e);
      var bend = e.type === "long" ? 0.62 : 0.22;
      controls(_e.ax, _e.ay, _e.bx, _e.by, bend, _c);

      var target;
      if (e.type === "long") target = longPath;
      else {
        var d = Math.max(0, Math.min(0.999, (_e.depth + 1) / 2));
        target = buckets[(d * DEPTH_BUCKETS) | 0];
      }
      target.moveTo(_e.ax, _e.ay);
      target.bezierCurveTo(_c.c1x, _c.c1y, _c.c2x, _c.c2y, _e.bx, _e.by);
    }

    for (i = 0; i < DEPTH_BUCKETS; i++) {
      var f = i / (DEPTH_BUCKETS - 1);
      ctx.strokeStyle = "rgba(48,190,172," + (0.055 + f * f * 0.145).toFixed(3) + ")";
      ctx.lineWidth = 0.45 + f * 0.4;
      ctx.stroke(buckets[i]);
    }
    ctx.strokeStyle = "rgba(34,128,120,.05)";
    ctx.lineWidth = 0.45;
    ctx.stroke(longPath);

    // Tendrils: the sphere's own network reaching toward each card,
    // re-rooted every frame on the nearest front-facing neurons
    for (i = 0; i < edges.length; i++) {
      var e2 = edges[i];
      if (e2.type !== "conn") continue;
      var ag = AGENTS[e2.agent];
      var roots = nearestFrontNodes(ag.ax, ag.ay, 3);
      if (!roots.length) continue;
      ag.node = roots[0];

      var live = isLive(e2);
      var dimBack = 0.35 + ag.depth * 0.65;   // rear cards get fainter tendrils
      var bend2 = 0.14 * e2.dir;
      var root0 = nodes[roots[0]];

      controls(root0.px, root0.py, ag.ax, ag.ay, bend2, _c);
      var grad = ctx.createLinearGradient(root0.px, root0.py, ag.ax, ag.ay);
      if (live) {
        grad.addColorStop(0, "rgba(255,214,150," + (0.5 * dimBack).toFixed(2) + ")");
        grad.addColorStop(0.62, "rgba(255,196,110," + (0.22 * dimBack).toFixed(2) + ")");
        grad.addColorStop(1, "rgba(255,196,110,0)");
        ctx.lineWidth = 1.1;
      } else {
        grad.addColorStop(0, "rgba(48,190,172," + (0.15 * dimBack).toFixed(2) + ")");
        grad.addColorStop(0.55, "rgba(48,190,172," + (0.06 * dimBack).toFixed(2) + ")");
        grad.addColorStop(1, "rgba(48,190,172,0)");
        ctx.lineWidth = 0.6;
      }
      ctx.strokeStyle = grad;
      ctx.beginPath();
      ctx.moveTo(root0.px, root0.py);
      ctx.bezierCurveTo(_c.c1x, _c.c1y, _c.c2x, _c.c2y, ag.ax, ag.ay);
      ctx.stroke();

      bezier(root0.px, root0.py, _c.c1x, _c.c1y, _c.c2x, _c.c2y, ag.ax, ag.ay, 0.42, _p);
      for (var b2 = 1; b2 < roots.length; b2++) {
        var rn = nodes[roots[b2]];
        var g2 = ctx.createLinearGradient(rn.px, rn.py, _p.x, _p.y);
        g2.addColorStop(0, "rgba(48,190,172," + ((live ? 0.26 : 0.09) * dimBack).toFixed(2) + ")");
        g2.addColorStop(1, "rgba(48,190,172,0)");
        ctx.strokeStyle = g2;
        ctx.lineWidth = live ? 0.8 : 0.5;
        ctx.beginPath();
        ctx.moveTo(rn.px, rn.py);
        ctx.quadraticCurveTo(
          (rn.px + _p.x) / 2 - (_p.y - rn.py) * 0.18 * e2.dir,
          (rn.py + _p.y) / 2 + (_p.x - rn.px) * 0.18 * e2.dir,
          _p.x, _p.y
        );
        ctx.stroke();
      }
    }
  }

  function drawSignals() {
    var whiteTails = new Path2D(), blueTails = new Path2D();

    for (var i = 0; i < signals.length; i++) {
      var s = signals[i];
      var e = edges[s.edge];
      if (!reduce || dragging) s.t += s.speed * (isLive(e) ? 2.1 : 1) * (0.55 + 0.55 * envFire) * frameNorm;
      if (s.t > 1) { s.t = 0; s.edge = pickEdge(); e = edges[s.edge]; }

      edgeEnds(e, _e);
      var bend = e.type === "long" ? 0.62 : (e.type === "conn" ? -0.14 * (e.dir || 1) : 0.22);
      controls(_e.ax, _e.ay, _e.bx, _e.by, bend, _c);

      if (e.type === "conn") {
        bezier(_e.ax, _e.ay, _c.c1x, _c.c1y, _c.c2x, _c.c2y, _e.bx, _e.by, s.t, _p);
        var ease = Math.sin(Math.min(1, s.t) * Math.PI);
        var live2 = isLive(e);
        var spr2 = s.white ? SPR_WHITE : SPR_BLUE;
        var r2 = s.r * (live2 ? 3.2 : 2.1);
        ctx.globalAlpha = ease * (live2 ? 0.9 : 0.4) * (0.35 + AGENTS[e.agent].depth * 0.65);
        ctx.drawImage(spr2, _p.x - r2, _p.y - r2, r2 * 2, r2 * 2);
        continue;
      }

      bezier(_e.ax, _e.ay, _c.c1x, _c.c1y, _c.c2x, _c.c2y, _e.bx, _e.by, s.t, _p);
      bezier(_e.ax, _e.ay, _c.c1x, _c.c1y, _c.c2x, _c.c2y, _e.bx, _e.by, Math.max(0, s.t - 0.035), _q);

      var tail = s.white ? whiteTails : blueTails;
      tail.moveTo(_q.x, _q.y);
      tail.lineTo(_p.x, _p.y);

      var spr = s.white ? SPR_WHITE : SPR_BLUE;
      var dScale = 0.65 + Math.max(0, Math.min(1, (_e.depth + 1) / 2)) * 0.7;
      var r = s.r * 3.4 * dScale;
      ctx.globalAlpha = 0.85 * (0.45 + dScale * 0.5);
      ctx.drawImage(spr, _p.x - r, _p.y - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;

    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255,222,160,.44)";
    ctx.stroke(whiteTails);
    ctx.strokeStyle = "rgba(72,224,202,.40)";
    ctx.stroke(blueTails);
  }

  function pickEdge() { return (Math.random() * edges.length) | 0; }

  var order = [];
  function drawNodes() {
    if (order.length !== nodes.length) order = nodes.map(function (_, i) { return i; });
    order.sort(function (a, b) { return nodes[a].pz - nodes[b].pz; });

    for (var k = 0; k < order.length; k++) {
      var n = nodes[order[k]];
      if (!reduce || dragging) n.phase += n.pulse * envFireStep;
      // Sharper firing curve: long dim rest, brief hot peak
      var w = Math.sin(n.phase);
      var flicker = 0.35 + 0.65 * Math.pow(Math.max(0, w), 2.2);
      var depth = Math.max(0, Math.min(1, (n.pz + 1) / 2));
      var r = (n.size + flicker * 0.7) * n.ps * 1.25;

      var spr;
      if (depth < 0.42) {
        spr = SPR_DEEP;
        ctx.globalAlpha = Math.min(1, (0.06 + depth * 0.42) * (0.55 + flicker * 0.45) * envGlow * NEURON_GLOW);
      } else {
        spr = n.white ? SPR_WHITE : SPR_BLUE;
        ctx.globalAlpha = Math.min(1,
          ((n.white ? 0.34 : 0.24) + Math.pow(depth, 1.6) * 0.62) * (0.45 + flicker * 0.9) * envGlow * NEURON_GLOW);
      }
      var g = r * 5.2;
      var haloA = ctx.globalAlpha;
      ctx.drawImage(spr, n.px - g, n.py - g, g * 2, g * 2);
      if (depth > 0.42 && (n.white || flicker > 0.72)) {
        // Bloom flare: a faint double-size copy that swells with firing
        ctx.globalAlpha = haloA * 0.38 * flicker;
        var g2b = g * 2.1;
        ctx.drawImage(spr, n.px - g2b, n.py - g2b, g2b * 2, g2b * 2);
      }

      ctx.globalAlpha = 1;
      if (depth > 0.5 && (n.white || r > 1.5)) {
        // Specular core rides the flicker — at peak it burns white
        ctx.fillStyle = "rgba(255,255,255," + Math.min(1, (0.25 + depth * 0.45) * (0.5 + flicker) * envGlow).toFixed(2) + ")";
        ctx.beginPath();
        ctx.arc(n.px, n.py, Math.max(0.4, r * 0.3), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawCoreGlow() {
    var r = Math.min(width, height) * 0.13;
    var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, "rgba(255,255,255,.16)");
    g.addColorStop(0.22, "rgba(45,212,191,.14)");
    g.addColorStop(1, "rgba(45,212,191,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // ─────────────────────────────────────────────────────
  //  Interior background — frame-and-background-specs.md Part 2:
  //  atmosphere fields, energy horizon + receding grid, firmament.
  //  All drawn additively behind the sphere.
  // ─────────────────────────────────────────────────────
  var ATMO = [
    { rgb: "26,150,138", a: 0.055, r: 0.75, speed: 0.021, u: 0.28, v: 0.30, px: 0.0, py: 1.9 },
    { rgb: "18,110,132", a: 0.050, r: 0.68, speed: 0.016, u: 0.74, v: 0.62, px: 2.1, py: 4.0 },
    { rgb: "214,158,64", a: 0.030, r: 0.52, speed: 0.027, u: 0.52, v: 0.20, px: 4.2, py: 6.1 }
  ];

  function drawAtmosphere() {
    for (var i = 0; i < ATMO.length; i++) {
      var f = ATMO[i];
      var x = (f.u + Math.sin(time * f.speed + f.px) * 0.05) * width + para.x * 0.25;
      var y = (f.v + Math.sin(time * f.speed + f.py) * 0.04) * height + para.y * 0.25;
      var R = f.r * Math.min(width, height);
      var g = ctx.createRadialGradient(x, y, 0, x, y, R);
      g.addColorStop(0, "rgba(" + f.rgb + "," + (f.a * envAtmo).toFixed(3) + ")");
      g.addColorStop(1, "rgba(" + f.rgb + ",0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width, height);
    }
  }

  // Horizon glow centred below the frame so only its upper limb
  // shows, plus a receding grid: 8 horizontals eased by t², 13
  // radials from a vanishing point that shifts with sphere rotation
  // and 0.3x parallax.
  function drawHorizonGrid() {
    var hy = height * 0.88;
    var g = ctx.createRadialGradient(width * 0.5, hy + height * 0.30, 0, width * 0.5, hy + height * 0.30, height * 0.62);
    g.addColorStop(0, "rgba(45,212,191,.16)");
    g.addColorStop(0.55, "rgba(30,150,138,.06)");
    g.addColorStop(1, "rgba(30,150,138,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "rgba(64,210,190,.045)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    var i, t;
    for (i = 1; i <= 8; i++) {
      t = i / 8;
      var y = hy + t * t * (height - hy);
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    var vx = width * 0.5 + M[2] * width * 0.05 + para.x * 0.3;
    for (i = 0; i < 13; i++) {
      ctx.moveTo(vx, hy);
      ctx.lineTo((i / 12) * width * 1.5 - width * 0.25, height);
    }
    ctx.stroke();
  }

  var STARS = [];
  (function buildStars() {
    for (var i = 0; i < 170; i++) {
      STARS.push({
        u: Math.random(), v: Math.random(),
        size: 0.4 + Math.random() * 0.9,
        a: 0.10 + Math.random() * 0.30,
        depth: 0.04 + Math.random() * 0.12,
        phase: Math.random() * Math.PI * 2
      });
    }
  })();

  function drawStars() {
    ctx.fillStyle = "rgba(190,235,228,1)";
    for (var i = 0; i < STARS.length; i++) {
      var st = STARS[i];
      var x = st.u * width + para.x * st.depth;
      var y = st.v * height + para.y * st.depth;
      ctx.globalAlpha = st.a * (0.6 + 0.4 * Math.sin(time * 1.3 + st.phase));
      ctx.beginPath();
      ctx.arc(x, y, st.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ─────────────────────────────────────────────────────
  //  Loop
  // ─────────────────────────────────────────────────────
  var rafId = 0;
  var prevNow = performance.now();

  function frame(now) {
    now = now || performance.now();
    var dt = Math.min((now - prevNow) / 1000, 0.05);
    prevNow = now;
    var norm = dt / 0.01667;     // 1.0 at 60fps — same feel on 144Hz
    frameNorm = norm;
    time += dt;

    // The scene's mood: three independent slow signals, each a pair of
    // never-aligning sines shaped through a power curve, so surges are
    // brief and lulls are long — fast, slower, normal, fast again,
    // never on a schedule.
    var sTempo = Math.sin(time * 0.157 + WANDER[4]) * 0.5 +
                 Math.sin(time * 0.071 + WANDER[5]) * 0.3 +
                 Math.sin(time * 0.223 + WANDER[14]) * 0.2;
    var sBurst = Math.sin(time * 0.049 + WANDER[15]) * Math.sin(time * 0.131 + WANDER[16]);
    envTempo = 0.10 + 2.6 * Math.pow(0.5 + 0.5 * sTempo, 2.6) + 1.6 * Math.pow(Math.max(0, sBurst), 3);

    var sFire = Math.sin(time * 0.190 + WANDER[6]) * 0.6 + Math.sin(time * 0.083 + WANDER[7]) * 0.4;
    envFire = 0.75 + 1.65 * Math.pow(0.5 + 0.5 * sFire, 1.9);
    envFireStep = envFire * norm;

    var sGlow = Math.sin(time * 0.127 + WANDER[8]) * 0.6 + Math.sin(time * 0.053 + WANDER[9]) * 0.4;
    envGlow = 0.68 + 0.62 * (0.5 + 0.5 * sGlow);
    envAtmo = 0.90 + 0.26 * (0.5 + 0.5 * sGlow);

    if (!dragging) {
      // Coast on the throw — and the ambient wander runs underneath
      // it at all times, so the sphere never comes to rest
      rotY(velY * norm);
      rotX(velX * norm);
      var fr = Math.pow(0.945, norm);
      velX *= fr; velY *= fr;

      wanderBlend = Math.min(1, wanderBlend + dt * 0.6);
      var w = wanderBlend * wanderBlend;

      // Angular velocity wanders on all three axes: yaw, pitch, and a
      // touch of roll. The bias term is a slowly precessing minimum
      // spin — even when every sine crosses zero, the ball keeps
      // turning somewhere.
      var wy = (Math.sin(time * 0.110 + WANDER[0]) * 0.0016 +
                Math.sin(time * 0.041 + WANDER[1]) * 0.0011 +
                Math.cos(time * 0.050 + WANDER[10]) * 0.0007) * envTempo;
      var wx = (Math.sin(time * 0.089 + WANDER[2]) * 0.0013 +
                Math.sin(time * 0.033 + WANDER[3]) * 0.0009 +
                Math.sin(time * 0.037 + WANDER[11]) * 0.0007) * envTempo;
      var wz = (Math.sin(time * 0.061 + WANDER[12]) * 0.0009 +
                Math.sin(time * 0.027 + WANDER[13]) * 0.0007) * envTempo;

      rotY(wy * norm * w);
      rotX(wx * norm * w);
      rotZ(wz * norm * w);
    }
    orthonormalize();

    liveAgent = ((time / 2.8) | 0) % AGENTS.length;

    para.x += (para.tx - para.x) * 0.055;
    para.y += (para.ty - para.y) * 0.055;
    cx = baseCx + para.x;
    cy = baseCy + para.y;

    ctx.clearRect(0, 0, width, height);
    projectNodes();
    placeAgents();

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    drawAtmosphere();
    drawHorizonGrid();
    drawStars();
    ctx.restore();

    drawOcclusion();
    drawDust();

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    drawEdges();
    drawSignals();
    drawNodes();
    drawCoreGlow();
    ctx.restore();

    rafId = requestAnimationFrame(frame);
  }

  // ─────────────────────────────────────────────────────
  //  Start
  // ─────────────────────────────────────────────────────
  buildNodes();
  buildEdges();
  buildSignals();
  (function buildDust() {
    for (var i = 0; i < 110; i++) {
      DUST.push({
        u: Math.random(), v: Math.random(),
        depth: 0.15 + Math.random() * 0.4,     // how far "behind" it sits
        size: 0.6 + Math.random() * 1.6,
        a: 0.04 + Math.random() * 0.09
      });
    }
  })();
  layout();
  rafId = requestAnimationFrame(frame);

  var rt;
  var onResize = function () {
    clearTimeout(rt);
    rt = setTimeout(layout, 120);
  };
  window.addEventListener("resize", onResize);

  return function stopNeuralPortal() {
    cancelAnimationFrame(rafId);
    clearTimeout(rt);
    window.removeEventListener("resize", onResize);
    sceneEl.removeEventListener("pointerdown", onPointerDown);
    sceneEl.removeEventListener("pointermove", onPointerMove);
    sceneEl.removeEventListener("pointerup", endDrag);
    sceneEl.removeEventListener("pointercancel", endDrag);
    sceneEl.removeEventListener("pointerleave", onPointerLeave);
    // The agent cards are script-created, not React-rendered, so React
    // will not remove them on unmount (and Strict Mode's double mount
    // would duplicate them without this).
    AGENTS.forEach(function (a) {
      if (a.el && a.el.parentNode) a.el.parentNode.removeChild(a.el);
    });
  };
}
