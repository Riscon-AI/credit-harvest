/* RISCON Labs — cosmos moments (2026-09-27, Claude)
 *
 * Small events in the sky, where the page means something:
 *   the record — as the line reaches today, the star at today throws off its shell;
 *   the sites tour — in the dark, twice between the worlds the field gives way for a moment to a place in deep space
 *     (a star-forming cloud, a cluster of galaxies); in the light, where the page is a white hole and must not go
 *     dark, a comet crosses on the way to the fourth world instead; at the family map a light runs round the nine
 *     rings and, as it closes the loop, the rings flare one after another;
 *   the charter — as the ring brings a clause to the front, its point pulses once.
 * Drawn with WebGL from noise over the field, no photographs; on the light ground in darker inks. Without WebGL, or
 * when less motion is asked for, nothing is drawn and the passages take no room. The canvas is decoration.
 */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var canvas = null, gl = null, tried = false, progs = {}, W = 0, H = 0, scale = .7, raf = 0, start = 0;
  var bursts = [], comets = [], scene = null, passages = [], shown = false;
  var chrono = null, lastBurst = -1e9, wasNear = false;

  var HEAD = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH',
    'precision highp float;',
    '#else',
    'precision mediump float;',
    '#endif',
    'uniform vec2 R; uniform float T; uniform float P; uniform float A; uniform float S; uniform float L; uniform vec2 C; uniform vec2 D; uniform float K; uniform float Z;',
    'float h1(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
    'float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);',
    '  return mix(mix(h1(i), h1(i + vec2(1., 0.)), f.x), mix(h1(i + vec2(0., 1.)), h1(i + vec2(1., 1.)), f.x), f.y); }',
    'float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 5; i++) { v += a * n2(p); p = p * 2.03 + vec2(3.1, 1.7); a *= .5; } return v; }',
    'float sq(float x){ return x * x; }',
    'float spk(vec2 d, float s){ return exp(-dot(d, d) * 9000.) + .3 * exp(-length(d) * 40.)',
    '  + .75 * (exp(-abs(d.y) * 1100.) * exp(-abs(d.x) * s) + exp(-abs(d.x) * 1100.) * exp(-abs(d.y) * s)); }',
    // small stars, one per hashed cell at most
    'float stars(vec2 p, float dens){ vec2 c = floor(p), f = fract(p) - .5; if (h1(c + S) > dens) return 0.;',
    '  vec2 o = vec2(h1(c + 1.3), h1(c + 7.1)) - .5; float d = length(f - o * .7);',
    '  return exp(-d * d * 700.) * (.3 + .7 * h1(c + 3.7)); }',
    // a passage opens as a window in the middle of the screen and closes again
    'float win(vec2 uv){ return smoothstep(1.12, .22, length(uv * vec2(.7, 1.))); }',
    'float env(float t){ return smoothstep(0., .3, t) * smoothstep(1., .7, t); }',
  ].join('\n');

  var FRAG = {
    // in the dark, between the third and fourth worlds of the tour: a star-forming cloud — teal gas and rust ridges,
    // dust lanes lit at their edges, fine pale filaments, bright knots in the densest gas, young stars with spikes
    nebula: [
      'void main(){',
      '  vec2 uv = (gl_FragCoord.xy - .5 * R) / R.y; float t = P;',
      '  float z = mix(1.3, .6, t);',
      '  vec2 p = uv * z * 2.1 + vec2(S * 1.7, S * .9) + vec2(.35 * t, -.12 * t) + .012 * T;',
      '  vec2 q = vec2(fbm(p), fbm(p + vec2(5.2, 1.3)));',
      '  vec2 r = vec2(fbm(p + 2.6 * q + vec2(1.7, 9.2)), fbm(p + 2.6 * q + vec2(8.3, 2.8)));',
      '  float f = fbm(p + 2.4 * r) * .75 + .25 * fbm(p * 5.1 + r * 1.3);',
      '  vec3 deep = vec3(.02, .04, .1), teal = vec3(.16, .6, .7), rust = vec3(.95, .42, .17), rose = vec3(.96, .6, .62);',
      '  vec3 col = mix(deep, teal, smoothstep(.22, .82, f));',
      '  col = mix(col, rust, smoothstep(.5, 1., length(r) * .9) * .85);',
      '  col = mix(col, rose, smoothstep(.62, 1., q.y) * .3);',
      '  float dn = fbm(p * 1.6 + r * 1.8 + 7.);',
      '  float dust = smoothstep(.5, .78, dn);',
      '  col *= (.3 + 1.15 * smoothstep(.12, .9, f)) * (1. - .72 * dust);',
      '  col += vec3(.72, .94, 1.) * exp(-sq((dn - .5) / .016)) * smoothstep(.4, .82, f) * smoothstep(.48, .72, fbm(p * .7 + 5.)) * .24;',
      '  float rid = 1. - abs(fbm(p * 3.3 + r * 2.4 + 3.) * 2. - 1.);',
      '  col += vec3(1., .82, .72) * pow(rid, 26.) * .55 * smoothstep(.3, .75, f) * smoothstep(.45, .7, fbm(p * .8 + 11.)) * (1. - .7 * dust);',
      '  col += vec3(1., .9, .8) * pow(n2(p * 6.3 + r * 2.1), 30.) * 1.1 * smoothstep(.45, .85, f);',
      '  vec2 s = uv * z;',
      '  col += vec3(stars(p * 9., .5) + .7 * stars(p * 23. + 3., .6));',
      '  col += spk(s - vec2(-.42, .17), 22.) * 1.1 * vec3(1., .86, .72);',
      '  col += spk(s - vec2(.37, -.21), 26.) * .9 * vec3(.76, .86, 1.);',
      '  col += spk(s - vec2(.12, .3), 30.) * .6 * vec3(1.);',
      '  float a = clamp(A * env(t) * win(uv), 0., 1.);',
      '  gl_FragColor = vec4(clamp(col, 0., 1.) * a, a);',
      '}'
    ].join('\n'),
    // in the dark, between the sixth and seventh worlds: a cluster of galaxies — golden ellipticals, a few small blue
    // spirals, and thin broken arcs of light bent round the heavy middle
    cluster: [
      'float gal(vec2 d, float ang, float e, float s){ float c = cos(ang), n = sin(ang);',
      '  vec2 q = vec2(c * d.x - n * d.y, n * d.x + c * d.y); q.y /= e; return exp(-dot(q, q) / (s * s)); }',
      'vec3 spiral(vec2 d, float ang, float tilt, float s, float wind){ float c = cos(ang), n = sin(ang);',
      '  vec2 q = vec2(c * d.x - n * d.y, n * d.x + c * d.y); q.y /= tilt;',
      '  float r = length(q) / s, th = atan(q.y, q.x);',
      '  float arms = pow(.5 + .5 * cos(2. * th - wind * log(r + .06)), 4.);',
      '  return vec3(.55, .72, 1.) * exp(-r * 1.4) * arms * 1.4 + vec3(1., .86, .62) * exp(-r * r * 24.) * 1.3; }',
      'void main(){',
      '  vec2 uv = (gl_FragCoord.xy - .5 * R) / R.y; float t = P;',
      '  float z = mix(1.45, .72, t);',
      '  vec2 p = uv * z + vec2(.2 * t, .05 * t) + vec2(.004 * T, 0.);',
      '  vec3 col = vec3(.006, .008, .018);',
      '  vec2 g = p * 7. + S * 11.; vec2 ci = floor(g);',
      '  for (int j = -1; j <= 1; j++) { for (int i = -1; i <= 1; i++) {',
      '    vec2 c = ci + vec2(float(i), float(j));',
      '    if (h1(c + S * 3.1) < .6) {',
      '      vec2 d = g - (c + vec2(h1(c + 1.7), h1(c + 9.3)));',
      '      float s = .05 + .2 * h1(c + 4.4) * h1(c + 4.4) * h1(c + 4.4);',
      '      float gold = step(.3, h1(c + 8.8));',
      '      vec3 tint = mix(vec3(.55, .74, 1.), vec3(1., .77, .44), gold);',
      '      col += tint * gal(d, h1(c + 5.5) * 6.2832, .35 + .65 * h1(c + 2.2), s) * (.45 + 1.1 * h1(c + 6.6));',
      '    } } }',
      '  vec2 m = p - vec2(-.16, .06);',
      '  col += vec3(1., .82, .58) * (1.6 * gal(p - vec2(-.36, .12), .4, .75, .085) + 1.3 * gal(p - vec2(.04, .01), 1.1, .8, .07));',
      '  col += vec3(1., .84, .6) * .16 * exp(-dot(m, m) * 5.);',
      '  col += spiral(p - vec2(.6, .17), .6, .5, .05, 3.2) + spiral(p - vec2(-.7, -.34), 2.1, .78, .04, 2.6) + spiral(p - vec2(.25, -.41), 4., .42, .034, 3.6);',
      '  float lr = length(m), la = atan(m.y, m.x);',
      '  float arc = exp(-sq((lr - .33) / .003)) * smoothstep(.5, .95, sin(la * 2. + 1.3)) * smoothstep(.3, .62, n2(vec2(la * 7. + S, 1.3)))',
      '            + exp(-sq((lr - .47) / .0026)) * smoothstep(.7, 1., sin(la * 3. - .4)) * smoothstep(.36, .66, n2(vec2(la * 9. + S * 2., 4.1)))',
      '            + .8 * exp(-sq((lr - .255) / .0024)) * smoothstep(.9, 1., sin(la + 2.4));',
      '  col += vec3(.5, .7, 1.) * arc * 1.25;',
      '  col += spk(p - vec2(.29, .26), 20.) * 1.2 * vec3(1., .95, .9);',
      '  col += spk(p - vec2(-.53, -.21), 26.) * .8 * vec3(.8, .9, 1.);',
      '  col += vec3(.55 * stars(p * 30., .35));',
      '  float a = clamp(A * env(t) * win(uv), 0., 1.);',
      '  gl_FragColor = vec4(clamp(col, 0., 1.) * a, a);',
      '}'
    ].join('\n'),
    // a star throwing off its shell: a brief flash, a thin shock ring running out, a small filament shell round a
    // cool inside. K = 0 rust and sky blue (the record's today), K = 1 cobalt (the family map, the charter).
    // Z scales it. On the light ground the same strokes are drawn in darker inks.
    shell: [
      'void main(){',
      '  vec2 d = (gl_FragCoord.xy - C) / R.y; float t = P;',
      '  float r = length(d * vec2(.9, 1.)), ang = atan(d.y, d.x);',
      '  float flash = exp(-t * 10.) * exp(-r * r * 1600. / (Z * Z)) * 2.6;',
      // the record's shock runs out across the screen; a cobalt flare's stays a small ripple round its ring
      '  float rs = mix(.01, .45, 1. - (1. - t) * (1. - t)) * Z * mix(1., .3, K);',
      '  float shock = exp(-sq((r - rs) / .0035)) * mix(.45, .35, K) * (1. - t) * (.6 + .4 * fbm(vec2(ang * 5. + S, t * 3.)));',
      '  float rad = mix(.008, .06, 1. - (1. - t) * (1. - t) * (1. - t)) * Z;',
      '  float fil = fbm(vec2(ang * 3.1 + S, r * 44. / Z - t * 1.5));',
      '  float shell = exp(-sq((r - rad) / (.005 * Z + .03 * rad))) * (.25 + 1.2 * fil * fil);',
      '  float inner = smoothstep(rad, rad * .1, r) * (.2 + .45 * fbm(d * 34. / Z + S));',
      '  vec3 rust = mix(mix(vec3(1., .5, .17), vec3(.8, .29, .08), L), mix(vec3(.5, .6, 1.), vec3(.13, .22, .66), L), K);',
      '  vec3 teal = mix(mix(vec3(.3, .76, 1.), vec3(.08, .42, .6), L), mix(vec3(.7, .8, 1.), vec3(.3, .45, .95), L), K);',
      '  vec3 ink = mix(vec3(1., .97, .92), vec3(.2, .32, .84), L);',
      '  vec3 col = rust * shell * 1.15 + teal * inner * .7 + ink * (flash + shock);',
      '  col += spk(d / Z, 26.) * .6 * (1. - .7 * t) * ink;',
      '  col = min(col, vec3(1.));',
      '  float lum = max(col.r, max(col.g, col.b));',
      '  float k = A * smoothstep(0., .04, t) * (1. - smoothstep(.6, 1., t));',
      '  gl_FragColor = vec4(col * k, lum * k);',
      '}'
    ].join('\n'),
    // a comet: a small bright head with a long thin tail along D (the way it travels), breaking into three
    // pieces as it goes; drawn as light on the dark ground and as ink on the light
    comet: [
      'void main(){',
      '  vec2 px = gl_FragCoord.xy; vec2 n = vec2(-D.y, D.x);',
      '  float split = clamp((P - .42) / .5, 0., 1.), u = R.y / 900.;',
      '  float ih = 0., it = 0.;',
      '  for (int i = 0; i < 3; i++) {',
      '    float fi = float(i), side = fi == 1. ? 1. : -1.;',
      '    vec2 off = -D * fi * split * 70. * u + n * side * fi * split * 9. * u;',
      '    float b = i == 0 ? 1. : .6 * step(.001, split);',
      '    float hs = (i == 0 ? 3.2 : 2.2) * u;',
      '    vec2 d = px - (C + off);',
      '    float along = dot(d, -D), across = dot(d, n);',
      '    ih += b * (exp(-dot(d, d) / (hs * hs)) * 1.6 + .3 * exp(-length(d) / (hs * 5.)));',
      '    float tl = (i == 0 ? 210. : 110.) * u, w = hs * .8 + max(along, 0.) * .06;',
      '    float grain = .75 + .25 * n2(vec2(along * .05 + S, fi * 7.));',
      '    it += along > 0. ? b * .85 * exp(-along / tl) * exp(-across * across / (w * w)) * grain : 0.;',
      '  }',
      '  vec3 headc = mix(vec3(1., .98, .95), vec3(.12, .2, .62), L);',
      '  vec3 tailc = mix(vec3(.62, .78, 1.), vec3(.21, .32, .84), L);',
      '  float a = clamp(ih + it, 0., 1.) * A * smoothstep(0., .1, P) * (1. - smoothstep(.78, 1., P));',
      '  vec3 c = (headc * ih + tailc * it) / max(ih + it, 1e-4);',
      '  gl_FragColor = vec4(c * a, a);',
      '}'
    ].join('\n')
  };

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { if (window.console) console.warn('cosmos shader:', gl.getShaderInfoLog(s)); return null; }
    return s;
  }
  function program(name) {
    if (progs[name] !== undefined) return progs[name];
    var vs = compile(gl.VERTEX_SHADER, 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0., 1.); }');
    var fs = compile(gl.FRAGMENT_SHADER, HEAD + '\n' + FRAG[name]);
    if (!vs || !fs) { progs[name] = null; return null; }
    var p = gl.createProgram();
    gl.attachShader(p, vs); gl.attachShader(p, fs);
    gl.bindAttribLocation(p, 0, 'a');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { progs[name] = null; return null; }
    var u = {};
    ['R', 'T', 'P', 'A', 'S', 'L', 'C', 'D', 'K', 'Z'].forEach(function (k) { u[k] = gl.getUniformLocation(p, k); });
    progs[name] = { p: p, u: u };
    return progs[name];
  }

  // The canvas and its context are made the first time something is to be drawn.
  function ready() {
    if (gl) return true;
    if (tried || reduce.matches) return false;
    tried = true;
    canvas = document.createElement('canvas');
    canvas.className = 'fx-cosmos';
    canvas.setAttribute('aria-hidden', 'true');
    var field = document.querySelector('.fx-field');
    if (field && field.parentNode) field.parentNode.insertBefore(canvas, field.nextSibling);
    else document.body.insertBefore(canvas, document.body.firstChild);
    try { gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false }); } catch (e) { gl = null; }
    if (!gl) { canvas.parentNode.removeChild(canvas); canvas = null; return false; }
    start = performance.now();
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); progs = {}; bursts = []; comets = []; scene = null; });
    size();
    window.addEventListener('resize', size);
    return true;
  }

  function size() {
    if (!canvas) return;
    var host = canvas.parentElement || document.documentElement;
    W = host.clientWidth || window.innerWidth; H = host.clientHeight || window.innerHeight;
    scale = Math.max(.5, Math.min(1, 1100 / Math.max(W, 1)));
    canvas.width = Math.max(1, Math.round(W * scale));
    canvas.height = Math.max(1, Math.round(H * scale));
  }

  function light() { return root.getAttribute('data-theme') === 'light' ? 1 : 0; }

  function draw(name, u, box) {
    var pr = program(name);
    if (!pr) return;
    gl.useProgram(pr.p);
    gl.uniform2f(pr.u.R, canvas.width, canvas.height);
    gl.uniform1f(pr.u.T, (performance.now() - start) / 1000);
    gl.uniform1f(pr.u.P, u.p);
    gl.uniform1f(pr.u.A, u.a == null ? 1 : u.a);
    gl.uniform1f(pr.u.S, u.s || 0);
    gl.uniform1f(pr.u.L, light());
    gl.uniform2f(pr.u.C, u.x * scale, (H - u.y) * scale);
    gl.uniform2f(pr.u.D, u.dx || 1, u.dy || 0);
    gl.uniform1f(pr.u.K, u.k || 0);
    gl.uniform1f(pr.u.Z, u.z || 1);
    if (box) {
      // a burst only shades the square it can reach
      var r = box * canvas.height, cx = u.x * scale, cy = (H - u.y) * scale;
      var x0 = Math.max(0, Math.floor(cx - r)), y0 = Math.max(0, Math.floor(cy - r));
      var x1 = Math.min(canvas.width, Math.ceil(cx + r)), y1 = Math.min(canvas.height, Math.ceil(cy + r));
      if (x1 <= x0 || y1 <= y0) return;
      gl.enable(gl.SCISSOR_TEST);
      gl.scissor(x0, y0, x1 - x0, y1 - y0);
    }
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (box) gl.disable(gl.SCISSOR_TEST);
  }

  function frame() {
    raf = 0;
    if (!gl || document.hidden) return;
    var now = performance.now();
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (scene) draw(scene.name, { p: scene.t, x: 0, y: 0, s: scene.seed });
    bursts = bursts.filter(function (b) { return now - b.at < b.ms; });
    comets = comets.filter(function (c) { return now - c.at < c.ms; });
    bursts.forEach(function (b) {
      var t = (now - b.at) / b.ms;
      if (t < 0) return;
      var at = b.where();
      if (!at) return;
      draw('shell', { p: t, x: at[0], y: at[1], s: b.seed, k: b.k, z: b.z }, (b.k ? .2 : .5) * b.z + .03);
    });
    comets.forEach(function (c) {
      var t = (now - c.at) / c.ms;
      var x = c.x0 + (c.x1 - c.x0) * t, y = c.y0 + (c.y1 - c.y0) * t;
      var dx = c.x1 - c.x0, dy = -(c.y1 - c.y0), l = Math.sqrt(dx * dx + dy * dy) || 1;
      draw('comet', { p: t, x: x, y: y, dx: dx / l, dy: dy / l, s: c.seed });
    });
    var busy = !!scene || bursts.length > 0 || comets.length > 0;
    shown = busy;
    canvas.style.visibility = busy ? 'visible' : 'hidden';
    if (busy) raf = window.requestAnimationFrame(frame);
  }
  function kick() { if (!raf && gl && (scene || bursts.length || comets.length || shown)) raf = window.requestAnimationFrame(frame); }

  // where: a function giving the point in CSS pixels now (it may move while the burst runs), or null to skip a frame
  function burst(o) {
    if (!ready()) return;
    bursts.push({ at: performance.now() + (o.delay || 0), ms: o.ms || 3000, where: o.where, k: o.palette === 'cobalt' ? 1 : 0, z: o.size || 1, seed: o.seed || Math.random() * 10 });
    kick();
  }
  // from and to are fractions of the window, from off one edge to off another
  function comet(o) {
    if (!ready()) return;
    var w = window.innerWidth, h = window.innerHeight;
    comets.push({ at: performance.now(), ms: o.ms || 2600, x0: o.from[0] * w, y0: o.from[1] * h, x1: o.to[0] * w, y1: o.to[1] * h, seed: Math.random() * 10 });
    kick();
  }
  // the ringed point of anchor k on the field, as long as it is on screen
  function ring(k) {
    return function () {
      var st = window.RisconField && window.RisconField.state && window.RisconField.state();
      var r = st && st.rings && st.rings[k];
      return r && r[2] ? [r[0], r[1]] : null;
    };
  }

  // The record: when the line reaches today, the star at today throws off its shell, once per arrival.
  function watchToday() {
    var sec = chrono.sec, top = sec.getBoundingClientRect().top;
    var p = Math.max(0, Math.min(1, -top / Math.max(1, sec.offsetHeight - window.innerHeight)));
    var near = Math.abs(p * (chrono.n - 1) - chrono.cur) < .3 && top <= 1;
    var now = performance.now();
    if (near && !wasNear && now - lastBurst > 5000) {
      lastBurst = now;
      burst({ where: ring(chrono.cur), ms: 3000, seed: 2.7 });
    }
    wasNear = near;
  }

  // Where a passage stands: 0 as its top comes up at the foot of the window, 1 as its foot leaves at the top. The
  // passages are drawn in the dark only; on the light ground they take no room (field-skin.css) and nothing is drawn.
  function measure() {
    var best = null;
    if (passages.length && gl && root.getAttribute('data-theme') === 'dark') {
      var h = window.innerHeight;
      passages.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (!r.height) return;
        var t = (h - r.top) / (r.height + h);
        if (t > 0 && t < 1 && (!best || Math.abs(t - .5) < Math.abs(best.t - .5))) best = { name: el.getAttribute('data-passage'), t: t, seed: parseFloat(el.getAttribute('data-seed')) || 0 };
      });
    }
    scene = best;
    if (chrono) watchToday();
    kick();
  }

  function init() {
    passages = Array.prototype.slice.call(document.querySelectorAll('[data-passage]'));
    var sec = document.querySelector('[data-chrono]');
    if (sec) chrono = { sec: sec, n: sec.querySelectorAll('.fx-station').length, cur: parseInt(sec.getAttribute('data-current'), 10) || 0 };
    // the passages take room only once the layer is known to draw them
    if (passages.length && ready()) root.classList.add('fx-cosmos-live');
    if (passages.length || chrono) {
      var ticking = false;
      window.addEventListener('scroll', function () {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(function () { ticking = false; measure(); });
      }, { passive: true });
      window.addEventListener('resize', measure);
      if (window.MutationObserver) new MutationObserver(function () { measure(); }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
      measure();
    }
    document.addEventListener('visibilitychange', function () { if (!document.hidden) kick(); });
  }

  window.RisconCosmos = {
    burst: burst, comet: comet, ring: ring,
    state: function () { return { live: !!gl, scene: scene && { name: scene.name, t: +scene.t.toFixed(3) }, bursts: bursts.length, comets: comets.length, scale: scale }; }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
