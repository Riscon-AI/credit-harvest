/* RISCON Labs — field skin runtime (2026-09-26, Claude)
 *
 * The first screen is a field of points. Each family site is one cluster, and the point at the
 * middle of a cluster is that site's center question. One glass prompt names a topic and opens
 * the menu. The same nine questions can be seen as a field, as an index of cards, or on one line.
 * Principle taken from Kunumi Institute (Awwwards HM 2026-04-02); no code from the reference.
 * The canvas is decoration (aria-hidden): every question it shows is also in the page's HTML.
 */
(function () {
  'use strict';

  var root = document.documentElement;
  root.classList.add('fx-js');
  var mm = function (q) { return window.matchMedia ? window.matchMedia(q) : { matches: false, addEventListener: null }; };
  var reduceMQ = mm('(prefers-reduced-motion: reduce)');
  var darkMQ = mm('(prefers-color-scheme: dark)');

  function $(s, el) { return (el || document).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
  function store(k, v) {
    try {
      if (v === undefined) return window.localStorage.getItem(k);
      window.localStorage.setItem(k, v);
    } catch (e) { /* private window or blocked storage: the page still works */ }
    return null;
  }
  function lang() { return root.getAttribute('data-lang') === 'ko' ? 'ko' : 'en'; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function listen(q, fn) { if (q.addEventListener) q.addEventListener('change', fn); else if (q.addListener) q.addListener(fn); }

  var DATA = {};
  try { var node = document.getElementById('fx-data'); if (node) DATA = JSON.parse(node.textContent); } catch (e) { DATA = {}; }

  /* ================================================================ field */
  var Field = (function () {
    var canvas = null, ctx = null, cfg = { layout: 'quiet', anchors: [], interactive: false };
    var W = 0, H = 0, DPR = 1, S = 1, D = 3.3, spanX = 1.45;
    var pts = [], anchorIdx = [], anchorBase = {};
    var layout = 'field', userLayout = null;
    // ox, oy move the point the camera looks at across the screen (fractions of its width and height)
    var cam = { yaw: .55, pitch: -.22, px: 0, py: 0, pz: 0, zoom: 1, ox: 0, oy: 0 };
    var goal = { yaw: .55, pitch: -.22, px: 0, py: 0, pz: 0, zoom: 1, ox: 0, oy: 0 };
    var focusOpts = null, links = false, glow = [];
    var trackPos = 0, trackLift = 0, frameCb = null, frameOut = [];
    var run = null;   // the light running once round the family map's loop
    var par = { x: 0, y: 0 }, parGoal = { x: 0, y: 0 };
    var hover = -1, selected = -1, hint = -1, highlight = -1;
    var drag = null, onSelectCb = null, raf = 0, last = 0, seed = 20260926;
    var ink = [18, 19, 21], accent = [53, 82, 214];
    var proj = { v: false, x: 0, y: 0, p: 1 };
    // Many sites (2026-10-01, toward a hundred): past DENSE the field spreads its rings over a globe and keeps them
    // smaller, and once the line no longer fits the screen at LIN_GAP pixels a station it becomes an endless loop
    // that drifts slowly and can be dragged or wheeled along (wrapped at lin.L, moved by lin.off).
    var DENSE = 16, LIN_GAP = 118;
    var lin = { on: false, L: 1, off: 0, goal: 0, idle: 0 };

    function rng(s) {
      var a = s >>> 0;
      return function () {
        a = (a + 0x6D2B79F5) >>> 0;
        var t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }
    function gauss(r) { var u = 1 - r(), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

    function parseColor(str, fallback) {
      str = String(str || '').trim();
      var m = str.match(/^#([0-9a-f]{6})$/i);
      if (m) { var n = parseInt(m[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
      m = str.match(/rgba?\(([^)]+)\)/i);
      if (m) { var p = m[1].split(',').map(parseFloat); return [p[0], p[1], p[2]]; }
      return fallback;
    }
    function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }

    function anchorCount() { return (cfg.anchors || []).length; }

    // The record page's track: stations a fixed number of pixels apart, today followed by a wider gap before the
    // questions not yet adopted. t may fall between stations.
    function trackGapPx() { return W < 640 ? clamp(W * .8, 250, 330) : clamp(W * .3, 280, 440); }
    function trackX(t) {
      var n = anchorCount(), cur = cfg.current != null ? cfg.current : n - 1, gw = trackGapPx() / S;
      var shift = t > cur ? Math.min(1, t - cur) * .6 : 0;
      return (t + shift - (n - .4) / 2) * gw;
    }

    function dense() { return anchorCount() > DENSE; }
    function linLoops() { var n = anchorCount(); return n > 2 && 2 * spanX * S / (n - 1) < LIN_GAP; }
    function wrapX(v) { var L = lin.L; return ((v + L / 2) % L + L) % L - L / 2; }

    // Where anchor k of n sits in each layout (world units, +y is up).
    function anchorSpot(name, k, n, r) {
      if (name === 'track') return [trackX(k), 0, 0];
      var t = n > 1 ? k / (n - 1) : .5;
      if (name === 'linear') return [-spanX + 2 * spanX * t, -.5, 0];
      if (name === 'line') return [-spanX + 2 * spanX * t, 0, 0];
      if (name === 'ladder') return [-1.1 + 2.2 * t, -.72 + 1.44 * t, 0];
      if (name === 'ring') {
        var a = k / n * Math.PI * 2 - Math.PI / 2;
        return [Math.cos(a) * 1.05, Math.sin(a) * .18, Math.sin(a) * 1.05];
      }
      if (n > DENSE) {
        // a globe of rings (a Fibonacci sphere, flattened a little) instead of one band round the middle
        var gy = 1 - 2 * (k + .5) / n, gr = Math.sqrt(1 - gy * gy), th = k * 2.39996 + .4, gd = 1.12 + (r() - .5) * .2;
        return [Math.cos(th) * gr * gd, gy * .8 + (r() - .5) * .06, Math.sin(th) * gr * gd];
      }
      var ang = k / n * Math.PI * 2 + .4;
      var rad = .95 + (r() - .5) * .3;
      return [Math.cos(ang) * rad, (r() - .5) * .8, Math.sin(ang) * rad];
    }

    function build() {
      var r = rng(seed);
      var n = anchorCount();
      var narrow = W < 640;
      var area = W * H;
      var total = cfg.interactive || cfg.tour || cfg.labels || cfg.layout === 'track' ? (narrow ? 820 : Math.round(clamp(area / 900, 1200, 1900))) : (narrow ? 440 : 820);
      var aspect = clamp(W / Math.max(H, 1), .45, 2.6);
      pts = []; anchorIdx = [];
      var spots = [];
      var rs = rng(seed + 7);
      for (var k = 0; k < n; k++) spots.push(anchorSpot(cfg.layout === 'quiet' ? 'field' : cfg.layout, k, n, rs));
      anchorBase.field = spots;
      var clustered = n ? Math.round(total * .5) : 0;
      var spreadC = n > DENSE ? clamp(Math.sqrt(DENSE / n) * 1.2, .5, 1) : 1;
      lin.on = false;
      for (var i = 0; i < total; i++) {
        var q = r(), size;
        if (q < .78) size = .7 + r() * .9; else if (q < .965) size = 1.6 + r() * 1.0; else size = 2.7 + r() * 1.3;
        var pt = { x: 0, y: 0, z: 0, tx: 0, ty: 0, tz: 0, s: size, a: .55 + r() * .45, c: -1, ox: 0, oy: 0, oz: 0, bx: 0, by: 0, bz: 0, sx: 0, sy: 0, sr: 0, on: false };
        if (i < clustered) {
          pt.c = i % n;
          pt.ox = gauss(r) * .17 * spreadC; pt.oy = gauss(r) * .13 * spreadC; pt.oz = gauss(r) * .17 * spreadC;
        } else {
          pt.bx = (r() * 2 - 1) * 2.1 * Math.max(1, aspect * .85);
          pt.by = (r() * 2 - 1) * 1.35 * Math.max(1, 1.25 / aspect);
          pt.bz = (r() * 2 - 1) * 1.7;
        }
        pts.push(pt);
      }
      for (var j = 0; j < n; j++) {
        pts.push({ x: 0, y: 0, z: 0, tx: 0, ty: 0, tz: 0, s: 3.2, a: 1, c: j, anchor: true, k: j, ox: 0, oy: 0, oz: 0, bx: 0, by: 0, bz: 0, sx: 0, sy: 0, sr: 0, on: false });
        anchorIdx.push(pts.length - 1);
      }
      place(userLayout || cfg.layout, true);
    }

    function spotsFor(name) {
      var n = anchorCount();
      if (name === 'track') { var tr = []; for (var tk = 0; tk < n; tk++) tr.push(anchorSpot('track', tk, n, null)); return tr; }
      if (name === 'field' || name === cfg.layout) {
        if (name === 'field' && cfg.layout !== 'field') {
          var rs = rng(seed + 7), out = [];
          for (var k = 0; k < n; k++) out.push(anchorSpot('field', k, n, rs));
          return out;
        }
        return anchorBase.field;
      }
      var list = [];
      for (var i = 0; i < n; i++) list.push(anchorSpot(name, i, n, null));
      return list;
    }

    function place(name, snap) {
      // leaving the loop: every point keeps the spot it is drawn at, then travels on from there
      if (lin.on) {
        for (var b = 0; b < pts.length; b++) if (pts[b].c >= 0) pts[b].x = wrapX(pts[b].x - lin.off);
        lin.on = false;
      }
      layout = name;
      var spots = spotsFor(name);
      if (name === 'linear' && linLoops()) {
        // stations LIN_GAP apart (more if the loop would otherwise close on screen), the chosen site in the middle
        var nL = anchorCount(), gapW = Math.max(LIN_GAP, (W + 260) / nL) / S, c0 = selected >= 0 ? selected : 0;
        lin.on = true; lin.L = nL * gapW; lin.off = lin.goal = 0; lin.idle = Date.now() + 2500;
        spots = [];
        for (var sk = 0; sk < nL; sk++) spots.push([wrapX((sk - c0) * gapW), -.5, 0]);
      }
      var flat = name === 'linear' || name === 'line' || name === 'track';
      // on the track the loose points spread along its whole length
      var spread = 1;
      if (name === 'track' && anchorCount() > 1) {
        var bmax = 2.1 * Math.max(1, clamp(W / Math.max(H, 1), .45, 2.6) * .85);
        spread = Math.max(1, (Math.abs(trackX(anchorCount())) + 2.2) / bmax);
      }
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        if (p.anchor) {
          var s = spots[p.k] || [0, 0, 0];
          p.tx = s[0]; p.ty = s[1]; p.tz = s[2];
        } else if (p.c >= 0) {
          var c = spots[p.c] || [0, 0, 0];
          var fx = flat ? .5 : 1, fy = flat ? .16 : 1, fz = flat ? .35 : 1;
          if (name === 'ladder') { fx = .8; fy = .55; fz = .8; }
          // on the tour the world in view gathers round its center question
          if (cfg.tour && p.c === selected) { fx *= .5; fy *= .5; fz *= .5; }
          p.tx = c[0] + p.ox * fx; p.ty = c[1] + p.oy * fy; p.tz = c[2] + p.oz * fz;
        } else {
          p.tx = p.bx * spread; p.ty = flat ? p.by * .3 : p.by; p.tz = flat ? p.bz * .5 : p.bz;
        }
        if (snap) { p.x = p.tx; p.y = p.ty; p.z = p.tz; }
      }
      if (name === 'linear' || name === 'line' || name === 'ladder' || name === 'track') {
        goal.yaw = Math.round(cam.yaw / (Math.PI * 2)) * Math.PI * 2;
        goal.pitch = 0;
      } else if (Math.abs(goal.pitch) < .01) {
        goal.pitch = -.22;
      }
      if (snap) { cam.yaw = goal.yaw; cam.pitch = goal.pitch; }
      aim();
    }

    // select() leans in on a cluster (the home page); focus() flies all the way to it, closer, and can set it
    // off to one side of the screen (the sites page tour).
    function aim() {
      if (lin.on && selected >= 0 && anchorIdx[selected] !== undefined) {
        lin.goal += wrapX(pts[anchorIdx[selected]].tx - lin.goal);
        lin.idle = Date.now() + 9000;
      }
      if (layout === 'track') {
        // the camera rides the line; before the record's section arrives the line waits low on the screen
        goal.px = trackX(trackPos); goal.py = 0; goal.pz = 0; goal.zoom = 1;
        goal.ox = W < 640 ? -.22 : -.12; goal.oy = -.04 + .36 * trackLift;
        return;
      }
      var k = selected, o = focusOpts || {};
      if (k >= 0 && anchorIdx[k] !== undefined && layout === 'field') {
        var p = pts[anchorIdx[k]];
        var f = o.f != null ? o.f : .6;
        goal.px = p.tx * f; goal.py = p.ty * f; goal.pz = p.tz * f;
        goal.zoom = o.zoom || 1.32;
      } else {
        goal.px = 0; goal.py = 0; goal.pz = 0; goal.zoom = o.zoom || 1;
      }
      goal.ox = o.ox || 0; goal.oy = o.oy || 0;
    }

    function project(x, y, z) {
      x -= cam.px; y -= cam.py; z -= cam.pz;
      var yaw = cam.yaw + par.x, pitch = cam.pitch + par.y;
      var cy = Math.cos(yaw), sy = Math.sin(yaw);
      var x1 = x * cy - z * sy, z1 = x * sy + z * cy;
      var cp = Math.cos(pitch), sp = Math.sin(pitch);
      var y1 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
      var w = D + z2;
      if (w < .3) { proj.v = false; return proj; }
      var p = D / w;
      proj.v = true; proj.p = p;
      proj.x = W * (.5 + cam.ox) + x1 * p * S * cam.zoom;
      proj.y = H * (.5 + cam.oy) - y1 * p * S * cam.zoom;
      return proj;
    }

    function label(k) {
      var a = (cfg.anchors || [])[k];
      if (!a) return '';
      return a[lang()] || a.en || '';
    }

    function showLabels() { return (layout !== 'field' && cfg.interactive) || links; }

    function draw() {
      if (!ctx) return;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.clearRect(0, 0, W, H);
      var rects = [[], [], [], []], arcs = [[], [], [], []], lit = [[], [], [], []];
      var alphas = [.24, .46, .7, .94];
      var zoomSize = Math.sqrt(cam.zoom);
      for (var i = 0; i < pts.length; i++) {
        var pt = pts[i];
        var pr = project(lin.on && pt.c >= 0 ? wrapX(pt.x - lin.off) : pt.x, pt.y, pt.z);
        pt.on = false;
        if (!pr.v) continue;
        if (pr.x < -20 || pr.x > W + 20 || pr.y < -20 || pr.y > H + 20) continue;
        pt.on = true; pt.sx = pr.x; pt.sy = pr.y;
        if (pt.anchor) { pt.sr = (4 + 3 * pr.p) * zoomSize * (dense() && layout === 'field' ? .72 : 1); continue; }
        // flying close past a point would make it a blot; the tour keeps near points star-sized
        var pp = cfg.tour ? Math.min(pr.p, 2.2) : pr.p;
        var size = pt.s * (.5 + .5 * pp) * zoomSize;
        var a = clamp((pp - .62) / .75, .1, 1) * pt.a;
        var g = pt.c >= 0 ? glow[pt.c] || 0 : 0;
        if (g > .01) {
          var la = Math.min(1, a * 1.8 + .3) * g;
          lit[la > .78 ? 3 : la > .52 ? 2 : la > .28 ? 1 : 0].push(pr.x, pr.y, Math.max(1.1, size * (1 + .6 * g)) / 2);
          a *= 1 - .9 * g;
        }
        var b = a > .78 ? 3 : a > .52 ? 2 : a > .28 ? 1 : 0;
        if (size < 1.9) rects[b].push(pr.x, pr.y, size); else arcs[b].push(pr.x, pr.y, size / 2);
      }
      ctx.fillStyle = rgba(ink, 1);
      for (var bk = 0; bk < 4; bk++) {
        ctx.globalAlpha = alphas[bk];
        var R = rects[bk];
        for (var j = 0; j < R.length; j += 3) ctx.fillRect(R[j] - R[j + 2] / 2, R[j + 1] - R[j + 2] / 2, R[j + 2], R[j + 2]);
        var A = arcs[bk];
        if (A.length) {
          ctx.beginPath();
          for (var m = 0; m < A.length; m += 3) { ctx.moveTo(A[m] + A[m + 2], A[m + 1]); ctx.arc(A[m], A[m + 1], A[m + 2], 0, Math.PI * 2); }
          ctx.fill();
        }
      }
      // the lit world: a faint accent haze under it, then its points in the accent
      for (var gq = 0; gq < anchorIdx.length; gq++) {
        var gg = glow[gq] || 0, gp = pts[anchorIdx[gq]];
        if (gg < .01 || !gp.on) continue;
        var hr = 170 * zoomSize, grad = ctx.createRadialGradient(gp.sx, gp.sy, 0, gp.sx, gp.sy, hr);
        grad.addColorStop(0, rgba(accent, .3 * gg));
        grad.addColorStop(.4, rgba(accent, .1 * gg));
        grad.addColorStop(1, rgba(accent, 0));
        ctx.globalAlpha = 1;
        ctx.fillStyle = grad;
        ctx.fillRect(gp.sx - hr, gp.sy - hr, hr * 2, hr * 2);
      }
      ctx.fillStyle = rgba(accent, 1);
      for (var lb = 0; lb < 4; lb++) {
        var LA = lit[lb];
        if (!LA.length) continue;
        ctx.globalAlpha = alphas[lb];
        ctx.beginPath();
        for (var lm = 0; lm < LA.length; lm += 3) { ctx.moveTo(LA[lm] + LA[lm + 2], LA[lm + 1]); ctx.arc(LA[lm], LA[lm + 1], LA[lm + 2], 0, Math.PI * 2); }
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      // the record's line: solid up to today, dotted after it; the stretch already travelled is drawn in the accent
      if (layout === 'track' && anchorIdx.length > 1) {
        var nT = anchorIdx.length, cT = cfg.current != null ? cfg.current : nT - 1;
        var pj0 = project(trackX(-.6), 0, 0), x0 = pj0.x, y0 = pj0.y;
        var xc = project(trackX(cT), 0, 0).x, xe = project(trackX(nT - 1 + .8), 0, 0).x;
        var xf = W * (.5 + cam.ox);
        ctx.lineWidth = 1;
        ctx.strokeStyle = rgba(ink, .3);
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(xc, y0); ctx.stroke();
        ctx.setLineDash([3, 6]);
        ctx.beginPath(); ctx.moveTo(xc, y0); ctx.lineTo(xe, y0); ctx.stroke();
        ctx.setLineDash([]);
        var xa = Math.min(xf, xc);
        if (xa > x0) { ctx.strokeStyle = rgba(accent, .9); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(xa, y0); ctx.stroke(); }
      }
      // the family map: the rings joined in order, one closed line through every world
      if (links && anchorIdx.length > 1) {
        ctx.strokeStyle = rgba(accent, .55);
        ctx.lineWidth = 1;
        ctx.beginPath();
        var pen = false;
        for (var L = 0; L <= anchorIdx.length; L++) {
          var lp = pts[anchorIdx[L % anchorIdx.length]];
          if (!lp.on) { pen = false; continue; }
          if (pen) ctx.lineTo(lp.sx, lp.sy); else { ctx.moveTo(lp.sx, lp.sy); pen = true; }
        }
        ctx.stroke();
        if (run) drawRun();
      }
      var fontEn = '600 12px "Pretendard Variable", Pretendard, sans-serif';
      var fontKo = '600 12px "Pretendard Variable", Pretendard, sans-serif';
      ctx.textBaseline = 'middle';
      for (var q = 0; q < anchorIdx.length; q++) {
        var ap = pts[anchorIdx[q]];
        if (!ap.on) continue;
        var on = q === selected, near = q === hover || q === hint || q === highlight;
        var meta = (cfg.anchors || [])[q] || {}, today = layout === 'track' && q === cfg.current;
        var rr = ap.sr * (on ? 1.5 : near || today || meta.open ? 1.25 : 1);
        ctx.lineWidth = on ? 2 : 1.4;
        ctx.strokeStyle = on || near || today ? rgba(accent, 1) : rgba(ink, meta.open ? .85 : .55);
        // a question not yet adopted is a dotted ring with no star in it
        if (meta.open) ctx.setLineDash([2, 3]);
        ctx.beginPath(); ctx.arc(ap.sx, ap.sy, rr, 0, Math.PI * 2); ctx.stroke();
        if (meta.open) ctx.setLineDash([]);
        ctx.fillStyle = on || near || today ? rgba(accent, 1) : rgba(ink, .9);
        if (!meta.open) { ctx.beginPath(); ctx.arc(ap.sx, ap.sy, Math.max(1.6, rr * .34), 0, Math.PI * 2); ctx.fill(); }
        if (today && !reduceMQ.matches) {
          var beat = (Date.now() % 2400) / 2400;
          ctx.strokeStyle = rgba(accent, .55 * (1 - beat));
          ctx.beginPath(); ctx.arc(ap.sx, ap.sy, rr + 3 + beat * 18, 0, Math.PI * 2); ctx.stroke();
        }
        if ((cfg.interactive || cfg.tour || cfg.labels) && (on || near || showLabels())) {
          var text = label(q);
          if (text) {
            ctx.font = lang() === 'ko' ? fontKo : fontEn;
            ctx.fillStyle = on || near ? rgba(accent, 1) : rgba(ink, links ? .86 : .72);
            ctx.fillText(text, ap.sx + rr + 8, ap.sy + .5);
          }
        }
      }
      if (frameCb) {
        for (var fq = 0; fq < anchorIdx.length; fq++) {
          var fp = pts[anchorIdx[fq]], fj = project(fp.x, fp.y, fp.z);
          frameOut[fq] = fj.v ? [fj.x, fj.y] : [-9999, -9999];
        }
        frameCb(frameOut, W * (.5 + cam.ox));
      }
    }

    // A light leaves the first ring and runs the loop once, drawing the line bright behind it; when it closes the
    // loop the caller hears of it (the rings flare), and the bright line fades back into the plain one.
    function drawRun() {
      var nL = anchorIdx.length, seg = [], tot = 0, i;
      for (i = 0; i < nL; i++) {
        var a0 = pts[anchorIdx[i]], a1 = pts[anchorIdx[(i + 1) % nL]];
        if (!a0.on || !a1.on) return;
        var sl = Math.sqrt((a1.sx - a0.sx) * (a1.sx - a0.sx) + (a1.sy - a0.sy) * (a1.sy - a0.sy));
        seg.push(sl); tot += sl;
      }
      if (!tot) return;
      var el = (performance.now() - run.at) / run.ms;
      var reach = clamp(el, 0, 1) * tot, fade = el <= 1 ? 1 : clamp(1 - (el - 1) / .5, 0, 1);
      var p0 = pts[anchorIdx[0]], hx = p0.sx, hy = p0.sy, acc = 0;
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = rgba(accent, .95 * fade);
      ctx.shadowColor = rgba(accent, .75 * fade); ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.moveTo(hx, hy);
      for (i = 0; i < nL && acc < reach; i++) {
        var b0 = pts[anchorIdx[i]], b1 = pts[anchorIdx[(i + 1) % nL]], f = Math.min(1, (reach - acc) / seg[i]);
        hx = b0.sx + (b1.sx - b0.sx) * f; hy = b0.sy + (b1.sy - b0.sy) * f;
        ctx.lineTo(hx, hy); acc += seg[i];
      }
      ctx.stroke();
      if (el < 1) { ctx.shadowBlur = 16; ctx.fillStyle = rgba(accent, 1); ctx.beginPath(); ctx.arc(hx, hy, 3.2, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
      if (el >= 1 && !run.done) { run.done = true; if (run.onDone) run.onDone(); }
      if (el >= 1.5) run = null;
    }

    function step(now) {
      raf = 0;
      var dt = last ? Math.min(64, now - last) : 16;
      last = now;
      var still = reduceMQ.matches;
      var f = still ? 1 : 1 - Math.exp(-dt / 280);
      var fc = still ? 1 : 1 - Math.exp(-dt / 420);
      var moving = false;
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        var dx = p.tx - p.x, dy = p.ty - p.y, dz = p.tz - p.z;
        if (dx * dx + dy * dy + dz * dz > 1e-7) { p.x += dx * f; p.y += dy * f; p.z += dz * f; moving = true; }
      }
      if (!still && !drag && layout === 'field') goal.yaw += dt * (selected >= 0 ? .000018 : .00004);
      if (lin.on) {
        if (!still && !drag && Date.now() > lin.idle) lin.goal += dt * 16 / 1000 / S;
        var ld = lin.goal - lin.off;
        if (Math.abs(ld) > 1e-5) { lin.off += ld * (still || drag ? 1 : fc); moving = true; }
      }
      var keys = ['yaw', 'pitch', 'px', 'py', 'pz', 'zoom', 'ox', 'oy'];
      for (var k = 0; k < keys.length; k++) {
        var d = goal[keys[k]] - cam[keys[k]];
        if (Math.abs(d) > 1e-5) { cam[keys[k]] += d * fc; moving = true; }
      }
      // on the tour the world in view lights up in the accent; the one left behind fades back to ink
      if (cfg.tour) {
        var fg = still ? 1 : 1 - Math.exp(-dt / 360);
        for (var gk = 0; gk < anchorIdx.length; gk++) {
          var gt = gk === selected ? 1 : 0, gd = gt - (glow[gk] || 0);
          if (Math.abs(gd) > .002) { glow[gk] = (glow[gk] || 0) + gd * fg; moving = true; } else glow[gk] = gt;
        }
      }
      par.x += (parGoal.x - par.x) * (still ? 1 : .06);
      par.y += (parGoal.y - par.y) * (still ? 1 : .06);
      draw();
      if (!still || moving || drag) loop();
    }
    function loop() { if (!raf && !document.hidden) raf = window.requestAnimationFrame(step); }

    function resize() {
      if (!canvas) return;
      var w = window.innerWidth, h = window.innerHeight;
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      var rebuild = !pts.length || Math.abs(w / Math.max(h, 1) - W / Math.max(H, 1)) > .25 || Math.abs(w - W) > 240;
      W = w; H = h;
      canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
      S = Math.min(W, H) * (W < 640 ? .46 : .4);
      spanX = clamp((W / 2 - 90) / S, .6, 1.45);
      if (rebuild) build(); else if (layout !== cfg.layout || layout === 'line' || layout === 'track') place(layout, true);
      draw(); loop();
    }

    function hitTest(x, y) {
      var best = -1, bd = 1e9;
      for (var q = 0; q < anchorIdx.length; q++) {
        var ap = pts[anchorIdx[q]];
        if (!ap.on) continue;
        var dx = ap.sx - x, dy = ap.sy - y, d = dx * dx + dy * dy, lim = Math.max(22, ap.sr + 14);
        if (d < lim * lim && d < bd) { bd = d; best = q; }
      }
      return best;
    }

    function bindPointer() {
      canvas.addEventListener('pointerdown', function (e) {
        if (e.button !== 0) return;
        drag = { x: e.clientX, y: e.clientY, yaw: goal.yaw, pitch: goal.pitch, lin: lin.goal, moved: false };
        loop();
      });
      window.addEventListener('pointermove', function (e) {
        if (!canvas || !cfg.interactive) return;
        var inField = e.target === canvas;
        if (!drag && !inField) { if (hover !== -1) { hover = -1; canvas.classList.remove('is-pointing'); loop(); } return; }
        parGoal.x = reduceMQ.matches ? 0 : (e.clientX / Math.max(W, 1) - .5) * .28;
        parGoal.y = reduceMQ.matches ? 0 : (e.clientY / Math.max(H, 1) - .5) * .12;
        if (drag) {
          var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
          if (Math.abs(dx) + Math.abs(dy) > 5) drag.moved = true;
          if (drag.moved && lin.on) {
            lin.goal = drag.lin - dx / (S * cam.zoom);
            lin.idle = Date.now() + 9000;
            canvas.classList.add('is-dragging');
          } else if (drag.moved) {
            goal.yaw = drag.yaw + dx * .006;
            goal.pitch = clamp(drag.pitch + dy * .004, -.95, .55);
            canvas.classList.add('is-dragging');
          }
        } else {
          var h = hitTest(e.clientX, e.clientY);
          if (h !== hover) { hover = h; canvas.classList.toggle('is-pointing', h >= 0); }
        }
        loop();
      }, { passive: true });
      function end(e) {
        if (drag && !drag.moved && e && e.type === 'pointerup') {
          var h = hitTest(e.clientX, e.clientY);
          if (h >= 0) { select(h); if (onSelectCb) onSelectCb(h); }
        }
        drag = null;
        canvas.classList.remove('is-dragging');
        loop();
      }
      window.addEventListener('pointerup', end);
      // the loop moves under the wheel only while the pointer is on the line itself; anywhere else the page scrolls
      window.addEventListener('wheel', function (e) {
        if (!lin.on || e.target !== canvas || e.ctrlKey) return;
        var ly = project(0, -.5, 0).y;
        if (Math.abs(e.clientY - ly) > 70) return;
        e.preventDefault();
        var unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? W : 1;
        var dd = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        lin.goal += dd * unit / (S * cam.zoom);
        lin.idle = Date.now() + 9000;
        loop();
      }, { passive: false });
      window.addEventListener('pointercancel', end);
      canvas.addEventListener('pointerleave', function () { parGoal.x = 0; parGoal.y = 0; loop(); });
    }

    function select(k) { selected = k; hint = -1; focusOpts = null; aim(); draw(); loop(); }

    return {
      init: function (el, config) {
        canvas = el;
        if (!canvas || !canvas.getContext) return;
        ctx = canvas.getContext('2d');
        cfg = config || cfg;
        this.recolor(true);
        resize();
        var t = 0;
        window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(resize, 120); });
        document.addEventListener('visibilitychange', function () { if (!document.hidden) { last = 0; loop(); } });
        listen(reduceMQ, function () { loop(); });
        if (cfg.interactive) bindPointer();
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { draw(); });
      },
      select: select,
      focus: function (k, opts) {
        var was = selected;
        selected = k; hint = -1; focusOpts = opts || null;
        if (cfg.tour && was !== k) place(layout, reduceMQ.matches);
        aim(); draw(); loop();
      },
      setLinks: function (on) { links = !!on; draw(); loop(); },
      runLinks: function (ms, onDone) { if (reduceMQ.matches) return; run = { at: performance.now(), ms: ms || 2400, done: false, onDone: onDone }; loop(); },
      setTrack: function (p, lift) {
        trackPos = clamp(p, 0, 1) * Math.max(0, anchorCount() - 1);
        trackLift = clamp(lift || 0, 0, 1);
        highlight = Math.round(trackPos);
        aim(); loop();
      },
      onFrame: function (fn) { frameCb = fn; draw(); loop(); },
      // the charter: turn the ring the short way round until anchor k faces the camera, and light it
      turn: function (k, opts) {
        selected = -1; hint = -1; highlight = k; focusOpts = opts || null;
        var n = anchorCount(), two = Math.PI * 2;
        if (k >= 0 && n) { var aimYaw = -k / n * two; goal.yaw = aimYaw + Math.round((goal.yaw - aimYaw) / two) * two; }
        aim(); loop();
      },
      setLayout: function (name) { userLayout = name; place(name, reduceMQ.matches); draw(); loop(); },
      setHint: function (k) { hint = k; loop(); },
      setHighlight: function (k) { highlight = k; loop(); },
      onSelect: function (fn) { onSelectCb = fn; },
      recolor: function (quiet) {
        var cs = window.getComputedStyle(root);
        ink = parseColor(cs.getPropertyValue('--fx-dot'), ink);
        accent = parseColor(cs.getPropertyValue('--fx-accent'), accent);
        if (!quiet) { draw(); loop(); }
      },
      relabel: function () { draw(); loop(); },
      state: function () { return { layout: layout, userLayout: userLayout, cfgLayout: cfg.layout, pts: pts.length, anchors: anchorIdx.map(function (i) { var p = pts[i]; return [+p.x.toFixed(2), +p.y.toFixed(2), +p.tx.toFixed(2), +p.ty.toFixed(2)]; }), raf: !!raf, hidden: document.hidden, selected: selected, links: links, lin: { on: lin.on, off: +lin.off.toFixed(3), L: +lin.L.toFixed(2) }, rings: anchorIdx.map(function (i) { var p = pts[i]; return [Math.round(p.sx), Math.round(p.sy), p.on]; }), cam: { yaw: +cam.yaw.toFixed(2), pitch: +cam.pitch.toFixed(2), zoom: +cam.zoom.toFixed(2), ox: +cam.ox.toFixed(3), oy: +cam.oy.toFixed(3) } }; }
    };
  })();

  window.RisconField = Field;

  /* ================================================================ theme & language */
  function applyTheme(pref, persist) {
    if (pref !== 'light' && pref !== 'dark') pref = 'system';
    var eff = pref === 'system' ? (darkMQ.matches ? 'dark' : 'light') : pref;
    root.setAttribute('data-theme-pref', pref);
    root.setAttribute('data-theme', eff);
    if (persist) store('riscon_theme', pref);
    $$('[data-set-theme]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-set-theme') === pref)); });
    var meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', eff === 'dark' ? '#0e0f11' : '#e8e8e6');
    Field.recolor();
  }
  function applyLang(l, persist) {
    l = l === 'ko' ? 'ko' : 'en';
    root.setAttribute('data-lang', l);
    root.lang = l;
    if (persist) store('riscon_lang', l);
    var title = root.getAttribute('data-title-' + l);
    if (title) document.title = title;
    $$('[data-set-lang]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-set-lang') === l)); });
    Field.relabel();
  }
  window.setLang = function (l) { applyLang(l, true); };
  window.setTheme = function (p) { applyTheme(p, true); };
  listen(darkMQ, function () { if ((root.getAttribute('data-theme-pref') || 'system') === 'system') applyTheme('system', false); });

  /* ================================================================ glass pills */
  function setPill(pill, open) {
    pill.classList.toggle('is-open', open);
    var btn = $('[data-pill-toggle]', pill);
    if (btn) btn.setAttribute('aria-expanded', String(open));
    var panel = $('.fx-pill-panel', pill);
    if (panel) {
      panel.setAttribute('aria-hidden', String(!open));
      if (open) panel.removeAttribute('inert'); else panel.setAttribute('inert', '');
    }
  }
  function closePills(except) { $$('[data-pill].is-open').forEach(function (p) { if (p !== except) setPill(p, false); }); }

  /* ================================================================ index dialog */
  var lastFocus = null;
  function indexEl() { return document.getElementById('fx-index'); }
  function indexOpen() { var ix = indexEl(); return !!(ix && ix.classList.contains('is-open')); }
  function openIndex() {
    var ix = indexEl();
    if (!ix) return;
    lastFocus = document.activeElement;
    closePills();
    ix.removeAttribute('inert');
    ix.setAttribute('aria-hidden', 'false');
    ix.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    if (indexRow) indexRow.reset();
    // 첫 카드가 아니라 대화상자에 초점을 둔다 — 링크에 초점이 가면 창 아래에 주소 풍선이 뜬다
    window.setTimeout(function () { ix.focus({ preventScroll: true }); }, 40);
  }
  function closeIndex() {
    var ix = indexEl();
    if (!ix || !ix.classList.contains('is-open')) return;
    ix.classList.remove('is-open');
    ix.setAttribute('aria-hidden', 'true');
    ix.setAttribute('inert', '');
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  /* 색인 줄: 세로 휠·마우스 끌기·화살표 단추·← → 키로 움직인다. 휠과 끌기는 카드에 걸리지 않고 굴린 만큼
   * 부드럽게 흘러가며, 멈춘 자리가 카드 앞머리에 가까울 때만 살짝 붙는다. 단추와 키는 카드 한 장씩.
   * 가로로 미는 트랙패드와 폰의 밀기는 브라우저에 맡긴다(폰은 카드마다 선다).
   * (2026-09-26, 대표님: 휠로 안 움직인다 → 휠이 둔탁하다) */
  var indexRow = null;
  function initIndexRow() {
    var ix = indexEl();
    var row = ix && $('.fx-index-row', ix);
    if (!row) return;
    var all = Array.prototype.slice.call(row.querySelectorAll('.fx-icard'));
    if (!all.length) return;
    // 사이트 수에 따라 색인의 모양이 바뀐다(2026-10-01, 대표님 — 100개까지 늘어난다).
    //   20개 미만  : 세로로 긴 카드 한 줄을 옆으로 넘긴다(처음 모양 그대로)
    //   20–59개    : 다섯 줄 네 칸, 한 면에 스무 장씩 면 단위로 넘긴다
    //   60개 이상  : 다섯 줄 여덟 칸의 작은 패, 한 면에 마흔 장. 질문은 접고 번호·이름·분야만 남긴다
    // 아래의 미끄러지기·끌기·키는 그대로 두고, 움직이는 단위만 카드 한 장에서 면 하나로 바뀐다.
    var n = all.length, tier = n < 20 ? 'row' : n < 60 ? 'pages' : 'dense';
    var PAGE = tier === 'dense' ? 40 : 20, cards = all;
    if (tier !== 'row') {
      cards = [];
      for (var pg = 0; pg < n; pg += PAGE) {
        var page = document.createElement('div');
        page.className = 'fx-ipage';
        all.slice(pg, pg + PAGE).forEach(function (c, j) { c.style.setProperty('--i', Math.min(j, 23)); page.appendChild(c); });
        row.appendChild(page);
        cards.push(page);
      }
      row.classList.add('is-paged');
      ix.classList.add('is-paged');
      if (tier === 'dense') ix.classList.add('is-dense');
      $$('[data-index-step]', ix).forEach(function (b) {
        var back = b.getAttribute('data-index-step') === '-1';
        var en = $('.fx-sr .en-only', b), ko = $('.fx-sr .ko-only', b);
        if (en) en.textContent = back ? 'Previous page' : 'Next page';
        if (ko) ko.textContent = back ? '이전 쪽' : '다음 쪽';
      });
    }
    ix.setAttribute('data-index-tier', tier);
    function firstCard(i) { return tier === 'row' ? cards[i] : $('.fx-icard', cards[i]); }
    var count = $('[data-index-count]', ix);
    var prevB = $('[data-index-step="-1"]', ix), nextB = $('[data-index-step="1"]', ix);
    var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    function maxLeft() { return Math.max(0, row.scrollWidth - row.clientWidth); }
    function clamp(x) { return Math.max(0, Math.min(maxLeft(), x)); }
    function startX() { return row.getBoundingClientRect().left + (parseFloat(getComputedStyle(row).scrollPaddingLeft) || 0); }
    function snapLeft(i) { return clamp(row.scrollLeft + cards[i].getBoundingClientRect().left - startX()); }
    function nearest(pos) {
      var best = 0, bd = Infinity;
      for (var i = 0; i < cards.length; i++) { var d = Math.abs(snapLeft(i) - pos); if (d < bd - 0.5) { bd = d; best = i; } }
      return best;
    }

    // 미끄러지기: 목표 위치를 두고 매 프레임 남은 거리의 일정 비율만큼 다가간다(빠르게 출발해 천천히 선다).
    // 휠은 0.1(느긋하게), 단추·키·붙기는 0.16(한 장씩 또렷하게) — 한 프레임에 남은 거리의 이만큼 간다
    var goal = 0, pos = 0, raf = 0, lastT = 0, settling = false, ease = 0.1;
    var MAGNET = tier === 'row' ? 48 : Infinity;   // 면은 언제나 한 면에 붙어 선다
    function frame(t) {
      var dt = lastT ? Math.min(64, t - lastT) : 16.7;
      lastT = t;
      pos += (goal - pos) * (1 - Math.pow(1 - ease, dt / 16.7));
      if (Math.abs(goal - pos) < 0.5) {
        pos = goal;
        row.scrollLeft = pos;
        raf = 0;
        lastT = 0;
        if (settling) row.classList.remove('is-free');
        return;
      }
      row.scrollLeft = pos;
      raf = window.requestAnimationFrame(frame);
    }
    function glide(left, settle, k) {
      if (!raf) pos = row.scrollLeft;
      goal = clamp(left);
      settling = !!settle;
      ease = k || 0.1;
      row.classList.add('is-free');
      if (reduce) { pos = goal; row.scrollLeft = goal; if (settling) row.classList.remove('is-free'); return; }
      if (!raf) { lastT = 0; raf = window.requestAnimationFrame(frame); }
    }
    function halt() {
      var was = !!raf;
      if (raf) window.cancelAnimationFrame(raf);
      raf = 0;
      lastT = 0;
      pos = goal = row.scrollLeft;
      return was;
    }
    function go(i, focus) {
      i = Math.max(0, Math.min(cards.length - 1, i));
      glide(snapLeft(i), true, 0.16);
      if (focus) firstCard(i).focus({ preventScroll: true });
    }
    function step(dir, focus) {
      var f = -1;
      cards.forEach(function (c, i) { if (c.contains(document.activeElement)) f = i; });
      if (focus && f >= 0) { go(f + dir, true); return; }
      var at = raf ? goal : row.scrollLeft, i;
      if (dir > 0) { for (i = 0; i < cards.length; i++) if (snapLeft(i) > at + 4) break; }
      else { for (i = cards.length - 1; i >= 0; i--) if (snapLeft(i) < at - 4) break; }
      if (i >= 0 && i < cards.length) go(i, focus);
    }
    // 멈춘 자리가 카드 앞머리에서 MAGNET 안이면 거기 붙이고, 아니면 그 자리에 둔다.
    function rest(at) {
      var i = nearest(at);
      if (Math.abs(snapLeft(i) - at) <= MAGNET) go(i); else glide(at, true, 0.12);
    }

    function current() {
      var x = startX(), best = 0, bd = Infinity;
      cards.forEach(function (c, i) { var d = Math.abs(c.getBoundingClientRect().left - x); if (d < bd) { bd = d; best = i; } });
      return best;
    }
    function update() {
      var r = row.getBoundingClientRect(), first = -1, last = -1;
      cards.forEach(function (c, i) {
        var b = c.getBoundingClientRect();
        if (b.left >= r.left - 2 && b.right <= r.right + 2) { if (first < 0) first = i; last = i; }
      });
      if (first < 0) first = last = current();
      var lo = tier === 'row' ? first + 1 : first * PAGE + 1, hi = tier === 'row' ? last + 1 : Math.min(n, (last + 1) * PAGE);
      if (count) count.textContent = (lo === hi ? pad(lo) : pad(lo) + '–' + pad(hi)) + ' / ' + pad(all.length);
      if (prevB) prevB.disabled = row.scrollLeft <= 2;
      if (nextB) nextB.disabled = row.scrollLeft >= maxLeft() - 2;
    }
    var ticking = false;
    function schedule() {
      if (ticking) return;
      ticking = true;
      (window.requestAnimationFrame || window.setTimeout)(function () { ticking = false; update(); });
    }
    row.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    if (prevB) prevB.addEventListener('click', function () { step(-1); });
    if (nextB) nextB.addEventListener('click', function () { step(1); });

    // 세로 휠: 굴린 만큼 가로로 흘러간다. 220ms 동안 휠이 없으면 rest.
    var wheelTimer = 0;
    ix.addEventListener('wheel', function (e) {
      if (!indexOpen() || Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return;
      e.preventDefault();
      var unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? row.clientWidth : 1;
      glide((raf ? goal : row.scrollLeft) + e.deltaY * unit * 1.15, false);
      window.clearTimeout(wheelTimer);
      wheelTimer = window.setTimeout(function () { rest(goal); }, 220);
    }, { passive: false });

    // 마우스로 끌기. 6px 넘게 움직여야 끌기로 보고 그때만 포인터를 붙잡는다 — 그냥 누르면 카드 링크가 열린다.
    var drag = null, dragged = false;
    row.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      var wasGliding = halt();
      drag = { id: e.pointerId, x: e.clientX, left: row.scrollLeft, trail: [[e.clientX, e.timeStamp]], resume: wasGliding };
      dragged = false;
    });
    row.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.x;
      if (!dragged) {
        if (Math.abs(dx) < 6) return;
        dragged = true;
        row.classList.add('is-free', 'is-drag');
        try { row.setPointerCapture(e.pointerId); } catch (_) {}
      }
      row.scrollLeft = drag.left - dx;
      drag.trail.push([e.clientX, e.timeStamp]);
      if (drag.trail.length > 6) drag.trail.shift();
    });
    function endDrag(e) {
      if (!drag || e.pointerId !== drag.id) return;
      var d = drag;
      drag = null;
      if (!dragged) { if (d.resume) rest(row.scrollLeft); return; }
      row.classList.remove('is-drag');
      var a = d.trail[0], b = d.trail[d.trail.length - 1];
      var v = (b[1] > a[1] && e.timeStamp - b[1] < 90) ? (b[0] - a[0]) / (b[1] - a[1]) : 0;
      rest(clamp(row.scrollLeft - v * 320));   // 놓은 속도만큼 조금 더 흘러간 뒤 선다
    }
    row.addEventListener('pointerup', endDrag);
    row.addEventListener('pointercancel', endDrag);
    row.addEventListener('click', function (e) { if (dragged) { e.preventDefault(); e.stopPropagation(); dragged = false; } }, true);
    row.addEventListener('dragstart', function (e) { e.preventDefault(); });

    ix.addEventListener('keydown', function (e) {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); step(e.key === 'ArrowRight' ? 1 : -1, true); }
      else if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); go(e.key === 'Home' ? 0 : cards.length - 1, true); }
      else if (e.key === 'PageDown' || e.key === 'PageUp') { e.preventDefault(); step(e.key === 'PageDown' ? 1 : -1, true); }
    });
    indexRow = { reset: function () { halt(); row.classList.remove('is-free', 'is-drag'); row.scrollLeft = 0; update(); } };
  }

  /* 색인 — 백 개의 창(2026-10-01, 대표님). 열 칸씩 백 개의 창이 한 건물의 정면이고, 패밀리 사이트 하나가 창 하나다.
   * 사이트가 있는 창에는 불이 켜지고(열 때마다 차례로 켜진다), 아직 오지 않은 자리는 어둡게 남는다. 가장 최근에 켜진 창은 숨 쉰다.
   * 창에 올리거나 초점을 두면 옆 칸에 그 사이트의 중심 질문이 뜨고, 누르면 사이트가 열린다.
   * 손가락으로는 첫 번째 누름이 읽기, 같은 창을 한 번 더 누르면 열기다. 화살표 키로 켜진 창 사이를 옮겨 다닌다.
   * 사이트가 20개 미만이면 페이지에 창 대신 카드 줄이 쓰이고(build-family.mjs), 그때는 위의 initIndexRow 가 맡는다. */
  function initWindows() {
    var ix = indexEl();
    var facade = ix && $('.fx-facade', ix);
    if (!facade) return;
    var sites = DATA.sites || [];
    var wins = $$('.fx-win.is-lit', facade);
    var intro = $('.fx-win-intro', ix), site = $('.fx-win-site', ix);
    var coarse = mm('(hover: none), (pointer: coarse)');
    var cur = -1;
    function fill(name, value) { var el = $('[data-w="' + name + '"]', site); if (el) el.textContent = value; }
    function show(i) {
      var s = sites[i];
      if (!s || !site) return;
      cur = i;
      fill('meta', s.num + ' · ' + s.name + ' · ' + s.host);
      fill('q-en', s.question.en);
      fill('q-ko', s.question.ko);
      var link = $('[data-w="link"]', site);
      if (link) link.setAttribute('href', s.url);
      intro.hidden = true;
      site.hidden = false;
      wins.forEach(function (w, k) { w.classList.toggle('is-current', k === i); });
    }
    function clear() {
      cur = -1;
      if (intro) intro.hidden = false;
      if (site) site.hidden = true;
      wins.forEach(function (w) { w.classList.remove('is-current'); });
    }
    wins.forEach(function (w, k) {
      w.addEventListener('mouseenter', function () { show(k); });
      w.addEventListener('focus', function () { show(k); });
      w.addEventListener('click', function (e) { if (coarse.matches && cur !== k) { e.preventDefault(); show(k); } });
    });
    ix.addEventListener('keydown', function (e) {
      if (e.altKey || e.ctrlKey || e.metaKey || !wins.length) return;
      var step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 10, ArrowUp: -10 }[e.key];
      if (e.key === 'Home' || e.key === 'End') step = 0;
      if (step === undefined) return;
      e.preventDefault();
      var at = wins.indexOf(document.activeElement), next;
      if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = wins.length - 1;
      else if (at < 0) next = 0;
      else next = Math.max(0, Math.min(wins.length - 1, at + step));
      wins[next].focus({ preventScroll: true });
    });
    indexRow = { reset: clear };
  }

  /* ================================================================ home */
  function initHome() {
    var sites = DATA.sites || [];
    var topic = document.getElementById('fx-topic');
    var card = document.getElementById('fx-card');
    if (!topic || !card || !sites.length) return;
    var chips = $$('[data-site-chip]');
    var cur = 0, lastUser = 0;

    function setTopic(i, animate) {
      cur = i;
      var s = sites[i];
      var en = $('.en-only', topic), ko = $('.ko-only', topic);
      var write = function () { en.textContent = s.topic.en; ko.textContent = s.topic.ko; };
      if (animate && !reduceMQ.matches) {
        topic.classList.add('is-swapping');
        window.setTimeout(function () { write(); topic.classList.remove('is-swapping'); }, 220);
      } else write();
    }
    function fill(name, value) { var el = $('[data-f="' + name + '"]', card); if (el) el.textContent = value; }
    function setCard(i) {
      var s = sites[i];
      var link = $('.fx-card-link', card);
      var write = function () {
        fill('meta-en', s.num + ' · ' + s.name + ' · ' + s.host);
        fill('meta-ko', s.num + ' · ' + s.name + ' · ' + s.host);
        fill('text-en', s.question.en);
        fill('text-ko', s.question.ko);
        fill('link-en', '1-Click Dossier ↓');
        fill('link-ko', '원클릭 신청·사후관리 ↓');
        link.setAttribute('href', '#dossiers');
        link.removeAttribute('target');
        link.removeAttribute('rel');
        link.setAttribute('data-select-prog', String(i));
      };
      if (reduceMQ.matches) { write(); return; }
      card.classList.add('is-swapping');
      window.setTimeout(function () { write(); card.classList.remove('is-swapping'); }, 200);
    }
    function select(i, fromField) {
      lastUser = Date.now();
      setTopic(i, true);
      setCard(i);
      chips.forEach(function (c, k) { c.setAttribute('aria-pressed', String(k === i)); });
      showChip(i);
      if (!fromField) Field.select(i);
      Field.setHint(-1);
      if (window.RisconCosmos) {
        window.setTimeout(function () {
          window.RisconCosmos.burst({ where: window.RisconCosmos.ring(i), palette: 'cobalt', size: .46, ms: 2100, seed: i * 1.7 + 1.1 });
        }, 220);
      }
      if (window.selectHarvestProgram) window.selectHarvestProgram(i, true);
    }
    // 칩이 한 줄 띠일 때(사이트가 많을 때) 고른 칩을 띠 가운데로 옮긴다. 페이지는 움직이지 않는다.
    var strip = $('.fx-chips.is-strip');
    function showChip(i) {
      if (!strip || !chips[i]) return;
      var c = chips[i], left = strip.scrollLeft + c.getBoundingClientRect().left - strip.getBoundingClientRect().left - (strip.clientWidth - c.offsetWidth) / 2;
      if (strip.scrollTo) strip.scrollTo({ left: left, behavior: reduceMQ.matches ? 'auto' : 'smooth' }); else strip.scrollLeft = left;
    }
    if (strip) strip.addEventListener('wheel', function (e) {
      if (Math.abs(e.deltaX) >= Math.abs(e.deltaY) || e.ctrlKey) return;
      var max = strip.scrollWidth - strip.clientWidth;
      if ((e.deltaY < 0 && strip.scrollLeft <= 0) || (e.deltaY > 0 && strip.scrollLeft >= max - 1)) return;
      e.preventDefault();
      strip.scrollLeft += e.deltaY * (e.deltaMode === 1 ? 16 : 1);
    }, { passive: false });
    topic.addEventListener('click', function () { select(cur, false); });
    chips.forEach(function (c, k) { c.addEventListener('click', function () { select(k, false); }); });
    Field.onSelect(function (i) { select(i, true); });

    if (!reduceMQ.matches) {
      window.setInterval(function () {
        if (document.hidden || indexOpen() || $('.fx-prompt.is-open') || Date.now() - lastUser < 9000) return;
        var n = (cur + 1) % sites.length;
        setTopic(n, true);
        Field.setHint(n);
      }, 3400);
    }

    var bIndex = $('[data-mode="index"]'), bLinear = $('[data-mode="linear"]');
    if (bIndex) bIndex.addEventListener('click', openIndex);
    if (bLinear) bLinear.addEventListener('click', function () {
      var on = bLinear.getAttribute('aria-pressed') !== 'true';
      bLinear.setAttribute('aria-pressed', String(on));
      Field.setLayout(on ? 'linear' : 'field');
      lastUser = Date.now();
    });
    var close = $('[data-index-close]');
    if (close) close.addEventListener('click', closeIndex);

    var hero = $('.fx-hero');
    if (hero && 'IntersectionObserver' in window) {
      document.body.classList.add('fx-hero-in');
      new IntersectionObserver(function (entries) {
        var e = entries[0];
        document.body.classList.toggle('fx-hero-in', e.isIntersecting && e.intersectionRatio > .3);
      }, { threshold: [0, .3, .6, 1] }).observe(hero);
    }
  }

  /* ================================================================ ladder (definition page) */
  function initLadder() {
    var steps = $$('.fx-step');
    var levels = DATA.ladder || [];
    var detail = document.getElementById('fx-detail');
    if (!steps.length || !detail || !levels.length) return;
    // On the definition page the ladder is climbed: the rungs stand bottom (L0) to top, the rungs below the one in
    // view read as climbed, arrow up goes a rung higher, and two buttons climb and step down.
    var climb = !!$('[data-climb]');
    var moves = $$('[data-climb-step]');
    var cur = 0;
    function fill(name, value) { var el = $('[data-f="' + name + '"]', detail); if (el) el.textContent = value; }
    function show(i, focus, quiet) {
      var L = levels[i];
      if (!L) return;
      cur = i;
      steps.forEach(function (b, k) {
        b.setAttribute('aria-selected', String(k === i));
        b.setAttribute('tabindex', k === i ? '0' : '-1');
        b.classList.toggle('is-climbed', k < i);
      });
      fill('rung', String(i + 1)); fill('rung-ko', String(i + 1));
      moves.forEach(function (m) {
        var d = parseInt(m.getAttribute('data-climb-step'), 10);
        m.disabled = i + d < 0 || i + d > steps.length - 1;
      });
      fill('code', L.code);
      fill('name-en', L.name.en); fill('name-ko', L.name.ko);
      fill('role-en', L.role.en); fill('role-ko', L.role.ko);
      fill('can-en', L.can.en); fill('can-ko', L.can.ko);
      detail.setAttribute('aria-labelledby', steps[i].id);
      if (!quiet) Field.setHighlight(i);
      if (focus) steps[i].focus();
    }
    steps.forEach(function (b, k) {
      b.addEventListener('click', function () { show(k, false); });
      b.addEventListener('keydown', function (e) {
        var n = null;
        var up = climb ? 'ArrowUp' : 'ArrowDown', down = climb ? 'ArrowDown' : 'ArrowUp';
        if (e.key === up || e.key === 'ArrowRight') n = Math.min(steps.length - 1, k + 1);
        if (e.key === down || e.key === 'ArrowLeft') n = Math.max(0, k - 1);
        if (e.key === 'Home') n = 0;
        if (e.key === 'End') n = steps.length - 1;
        if (n !== null) { e.preventDefault(); show(n, true); }
      });
    });
    moves.forEach(function (m) {
      m.addEventListener('click', function () { show(clamp(cur + parseInt(m.getAttribute('data-climb-step'), 10), 0, steps.length - 1), false); });
    });
    show(0, false, true);
  }

  /* ================================================================ definition page: a reading light */
  // The four sentences are read one at a time: the one crossing the middle of the window is lit, the rest wait dim.
  function initCreed() {
    var items = $$('[data-creed]');
    if (!items.length) return;
    if (!('IntersectionObserver' in window)) { items.forEach(function (e) { e.classList.add('is-lit'); }); return; }
    document.body.classList.add('fx-creed-live');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { e.target.classList.toggle('is-lit', e.isIntersecting); });
    }, { rootMargin: '-38% 0px -38% 0px', threshold: 0 });
    items.forEach(function (e) { io.observe(e); });
  }

  /* ================================================================ sites page: cards light up their cluster */
  function initSiteCards() {
    $$('[data-field-anchor]').forEach(function (el) {
      var k = parseInt(el.getAttribute('data-field-anchor'), 10);
      var on = function () { Field.setHighlight(k); };
      var off = function () { Field.setHighlight(-1); };
      el.addEventListener('mouseenter', on);
      el.addEventListener('focusin', on);
      el.addEventListener('mouseleave', off);
      el.addEventListener('focusout', off);
    });
  }

  /* ================================================================ sites page: a tour through the field */
  // Each world is one screen. When its screen crosses the middle of the window the camera flies to its cluster and
  // sets it beside the text; the head shows the whole field, and the family map joins the rings.
  function initTour() {
    if (!$('[data-tour]') || !('IntersectionObserver' in window)) return;
    var marks = $$('[data-stop]');
    var rail = $$('[data-rail-k]');
    var narrow = mm('(max-width: 860px)');
    var cur = null, cometAt = -1e9, mapAt = -1e9, mapTimer = 0;
    var worlds = ((DATA.field && DATA.field.anchors) || []).length;
    function show(el, force) {
      var v = el.getAttribute('data-stop');
      if (v === cur && !force) return;
      var prev = cur;
      cur = v;
      var k = /^[0-9]+$/.test(v) ? parseInt(v, 10) : -1;
      Field.setLinks(v === 'map');
      // in the dark, between worlds, the camera pulls forward through the field while a place in deep space passes by
      if (v === 'passage') {
        Field.focus(-1, { zoom: 2.7 });
        rail.forEach(function (a) { a.removeAttribute('aria-current'); });
        return;
      }
      // in the light, on the way to the fourth world, a comet crosses the sky and breaks apart (going forward, now and
      // then); in the dark the cloud between the third and fourth worlds passes there instead
      if (k === 3 && prev === '2' && root.getAttribute('data-theme') !== 'dark' && window.RisconCosmos && performance.now() - cometAt > 15000) {
        cometAt = performance.now();
        window.RisconCosmos.comet(narrow.matches ? { from: [1.12, .08], to: [-.16, .5], ms: 2300 } : { from: [1.06, .04], to: [-.08, .62], ms: 2600 });
      }
      // at the family map a light runs round the nine rings; as it closes the loop they flare one after another
      window.clearTimeout(mapTimer);
      if (v === 'map' && performance.now() - mapAt > 12000) {
        mapTimer = window.setTimeout(function () {
          if (cur !== 'map') return;
          mapAt = performance.now();
          Field.runLinks(2400, function () {
            if (!window.RisconCosmos) return;
            for (var q = 0; q < worlds; q++) window.RisconCosmos.burst({ where: window.RisconCosmos.ring(q), palette: 'cobalt', size: .42, ms: 1900, delay: q * 90, seed: q * 1.7 });
          });
        }, 900);
      }
      // the head sets the whole field beside its text (below it on a phone); the map lifts it above the closing words
      if (v === 'map') Field.focus(-1, narrow.matches ? { zoom: .74, oy: -.3 } : { zoom: .9, oy: -.2 });
      else if (k < 0) Field.focus(-1, narrow.matches ? { zoom: .86, oy: .25 } : { ox: .17 });
      else {
        var side = el.classList.contains('is-right') ? -1 : 1;
        Field.focus(k, narrow.matches ? { f: 1, zoom: 1.6, oy: -.25 } : { f: 1, zoom: 1.85, ox: .22 * side, oy: -.02 });
      }
      rail.forEach(function (a) {
        if (a.getAttribute('data-rail-k') === v) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
      });
      document.body.classList.toggle('fx-tour-in', k >= 0);
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) show(e.target); });
    }, { rootMargin: '-48% 0px -48% 0px', threshold: 0 });
    marks.forEach(function (m) { io.observe(m); });
    listen(narrow, function () { var el = cur && $('[data-stop="' + cur + '"]'); if (el) show(el, true); });
  }

  /* ================================================================ record page: the line of time */
  // The section pins for a while and vertical scrolling runs along the field's line: each date is a station riding
  // its ring, today pulses in the accent, and past today the line turns dotted and the open questions float on it.
  function initChrono() {
    var sec = $('[data-chrono]');
    if (!sec || !sec.getBoundingClientRect) return;
    var pin = $('.fx-chrono-pin', sec);
    var items = $$('.fx-station', sec);
    var n = items.length;
    if (n < 2 || !pin) return;
    var cur = parseInt(sec.getAttribute('data-current'), 10) || 0;
    sec.classList.add('is-live');
    sec.style.setProperty('--steps', String(n - 1));
    var last = -1, lastLift = -1, ticking = false;
    function span() { return Math.max(1, sec.offsetHeight - window.innerHeight); }
    function update() {
      var top = sec.getBoundingClientRect().top;
      var p = clamp(-top / span(), 0, 1), lift = clamp(top / window.innerHeight, 0, 1);
      if (Math.abs(p - last) < 1e-5 && Math.abs(lift - lastLift) < 1e-4) return;
      last = p; lastLift = lift;
      Field.setTrack(p, lift);
      sec.classList.toggle('is-future', p * (n - 1) > cur + .5);
      sec.classList.toggle('is-moved', p > .004);
    }
    function schedule() {
      if (ticking) return;
      ticking = true;
      (window.requestAnimationFrame || window.setTimeout)(function () { ticking = false; update(); });
    }
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', function () { last = -1; schedule(); });
    Field.onFrame(function (list, fx) {
      // the stations come in once the section has risen into place
      var top = pin.getBoundingClientRect().top, w = Math.max(1, window.innerWidth), shown = clamp(1 - lastLift * 2.2, 0, 1);
      for (var i = 0; i < n; i++) {
        var a = list[i];
        if (!a) continue;
        items[i].style.transform = 'translate3d(' + a[0].toFixed(1) + 'px,' + (a[1] - top).toFixed(1) + 'px,0)';
        items[i].style.opacity = (clamp(1.2 - Math.abs(a[0] - fx) / w * 1.9, .08, 1) * shown).toFixed(3);
      }
    });
    function goTo(k) {
      var y = sec.getBoundingClientRect().top + window.pageYOffset + span() * k / (n - 1);
      window.scrollTo({ top: y, behavior: reduceMQ.matches ? 'auto' : 'smooth' });
    }
    $$('a[href="#review"]').forEach(function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); goTo(cur + 1); });
    });
    update();
    if (window.location.hash === '#review') window.setTimeout(function () { goTo(cur + 1); }, 80);
  }

  /* ================================================================ charter: laws on the ring, questions on an orbit */
  // As a clause crosses the middle of the window the field's ring turns to bring that clause's point to the front.
  function initCharter() {
    var laws = $$('[data-clause]');
    if (!laws.length || !('IntersectionObserver' in window)) return;
    var narrow = mm('(max-width: 860px)');
    var cur = null, pulse = 0;
    function show(el, force) {
      var v = el.getAttribute('data-clause') || el.getAttribute('data-phase');
      if (v === cur && !force) return;
      cur = v;
      window.clearTimeout(pulse);
      if (/^[0-9]+$/.test(v)) {
        var kk = parseInt(v, 10);
        Field.turn(kk, narrow.matches ? { oy: -.25, zoom: .9 } : { ox: .22 });
        // once the ring has brought the clause to the front, its point pulses once
        pulse = window.setTimeout(function () {
          if (window.RisconCosmos && cur === String(kk)) window.RisconCosmos.burst({ where: window.RisconCosmos.ring(kk), palette: 'cobalt', size: .38, ms: 1700, seed: kk * 2.3 });
        }, 850);
      }
      else if (v === 'head') Field.turn(-1, narrow.matches ? { oy: .28, zoom: .85 } : { ox: .2 });
      else Field.turn(-1, { oy: .4, zoom: .92 });
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) show(e.target); });
    }, { rootMargin: '-48% 0px -48% 0px', threshold: 0 });
    laws.concat($$('[data-phase]')).forEach(function (m) { io.observe(m); });
    listen(narrow, function () { var el = cur && ($('[data-clause="' + cur + '"]') || $('[data-phase="' + cur + '"]')); if (el) show(el, true); });
  }

  // Nine center questions on an ellipse. The one in front is read large in the middle; the rest wait round the back.
  function initOrbit() {
    var box = $('[data-orbit]');
    if (!box) return;
    var ring = $('.fx-orbit-ring', box);
    var dots = $$('.fx-orbit-dot', box), cards = $$('.fx-orbit-card', box), chips = $$('[data-orbit-go]', box);
    var n = cards.length;
    if (!n || !ring) return;
    box.classList.add('is-live');
    var cur = 0, turn = 0, goalTurn = 0, raf = 0;
    function place() {
      var w = ring.clientWidth, h = ring.clientHeight, rx = w * .47, ry = h * .5;
      dots.forEach(function (d, i) {
        var a = (i - turn) / n * Math.PI * 2 + Math.PI / 2, depth = (Math.sin(a) + 1) / 2;
        d.style.transform = 'translate3d(' + (w / 2 + Math.cos(a) * rx).toFixed(1) + 'px,' + (h / 2 + Math.sin(a) * ry).toFixed(1) + 'px,0) scale(' + (.7 + .5 * depth).toFixed(3) + ')';
        d.style.opacity = (.22 + .78 * depth).toFixed(3);
        d.style.zIndex = depth > .5 ? '3' : '1';
      });
    }
    function frame() {
      raf = 0;
      var d = goalTurn - turn;
      if (Math.abs(d) > .002 && !reduceMQ.matches) { turn += d * .1; raf = window.requestAnimationFrame(frame); } else turn = goalTurn;
      place();
    }
    function show(k, quiet) {
      k = ((k % n) + n) % n;
      var delta = k - cur;
      if (delta > n / 2) delta -= n;
      if (delta < -n / 2) delta += n;
      goalTurn += delta; cur = k;
      cards.forEach(function (c, i) { c.classList.toggle('is-on', i === k); c.setAttribute('aria-hidden', String(i !== k)); });
      dots.forEach(function (d, i) { d.classList.toggle('is-on', i === k); });
      chips.forEach(function (c, i) { c.setAttribute('aria-pressed', String(i === k)); });
      if (quiet) { turn = goalTurn; place(); } else if (!raf) raf = window.requestAnimationFrame(frame);
    }
    chips.forEach(function (c) { c.addEventListener('click', function () { show(parseInt(c.getAttribute('data-orbit-go'), 10)); }); });
    dots.forEach(function (d) { d.addEventListener('click', function () { show(parseInt(d.getAttribute('data-k'), 10)); }); });
    $$('[data-orbit-step]', box).forEach(function (b) { b.addEventListener('click', function () { show(cur + parseInt(b.getAttribute('data-orbit-step'), 10)); }); });
    box.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); show(cur + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); show(cur - 1); }
    });
    window.addEventListener('resize', place);
    show(0, true);
  }

  /* ================================================================ reveal on scroll */
  function initReveal() {
    var els = $$('.fx-reveal');
    if (!els.length) return;
    if (!('IntersectionObserver' in window) || reduceMQ.matches) { els.forEach(function (e) { e.classList.add('is-in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -6% 0px', threshold: .04 });
    els.forEach(function (e) { io.observe(e); });
    window.setTimeout(function () { els.forEach(function (e) { e.classList.add('is-in'); }); }, 2600);
  }

  /* ================================================================ start */
  function start() {
    $$('[data-set-lang]').forEach(function (b) { b.addEventListener('click', function () { applyLang(b.getAttribute('data-set-lang'), true); }); });
    $$('[data-set-theme]').forEach(function (b) { b.addEventListener('click', function () { applyTheme(b.getAttribute('data-set-theme'), true); }); });
    $$('[data-pill]').forEach(function (pill) {
      var btn = $('[data-pill-toggle]', pill);
      if (btn) btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = !pill.classList.contains('is-open');
        closePills(pill);
        setPill(pill, open);
      });
    });
    document.addEventListener('click', function (e) {
      $$('[data-pill].is-open').forEach(function (p) { if (!p.contains(e.target)) setPill(p, false); });
      var ix = indexEl();
      if (ix && ix.classList.contains('is-open') && e.target === ix) closeIndex();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closePills(); closeIndex(); }
    });

    var canvas = $('.fx-field');
    Field.init(canvas, DATA.field || { layout: 'quiet', anchors: [], interactive: false });
    applyTheme(store('riscon_theme'), false);
    applyLang(store('riscon_lang') === 'ko' ? 'ko' : (root.getAttribute('data-lang') === 'ko' ? 'ko' : 'en'), false);
    initIndexRow();
    initWindows();
    initHome();
    initLadder();
    initCreed();
    initSiteCards();
    initTour();
    initChrono();
    initCharter();
    initOrbit();
    initReveal();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
