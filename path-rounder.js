/**
 * path-rounder.js
 * Rounds corners on paths consisting of lines and Bezier curves.
 *
 * A "path" is an array of segments. Each segment is one of:
 *   { type: 'L', p1: [x,y], p2: [x,y] }                              // line
 *   { type: 'Q', p1: [x,y], c:  [x,y], p2: [x,y] }                   // quadratic bezier
 *   { type: 'C', p1: [x,y], c1: [x,y], c2: [x,y], p2: [x,y] }        // cubic bezier
 *
 * Consecutive segments must share endpoints (segments[i].p2 === segments[i+1].p1).
 *
 * Output is an array of segments with the same shape, plus arcs:
 *   { type: 'A', p1, p2, center, radius, startAngle, endAngle, ccw } // circular arc
 */

// ---------- vector helpers ----------
const v = {
  sub: (a, b) => [a[0] - b[0], a[1] - b[1]],
  add: (a, b) => [a[0] + b[0], a[1] + b[1]],
  mul: (a, s) => [a[0] * s, a[1] * s],
  len: (a) => Math.hypot(a[0], a[1]),
  norm: (a) => {
    const l = Math.hypot(a[0], a[1]);
    return l < 1e-12 ? [0, 0] : [a[0] / l, a[1] / l];
  },
  dot: (a, b) => a[0] * b[0] + a[1] * b[1],
  cross: (a, b) => a[0] * b[1] - a[1] * b[0], // z-component
};

// ---------- tangent extraction ----------
// Outgoing unit tangent at p1 (start) of a segment.
function tangentOut(seg) {
  if (seg.type === 'L') return v.norm(v.sub(seg.p2, seg.p1));
  if (seg.type === 'Q') {
    let t = v.sub(seg.c, seg.p1);
    if (v.len(t) < 1e-9) t = v.sub(seg.p2, seg.p1); // degenerate control
    return v.norm(t);
  }
  if (seg.type === 'C') {
    let t = v.sub(seg.c1, seg.p1);
    if (v.len(t) < 1e-9) t = v.sub(seg.c2, seg.p1);
    if (v.len(t) < 1e-9) t = v.sub(seg.p2, seg.p1);
    return v.norm(t);
  }
  throw new Error('Unknown segment type: ' + seg.type);
}

// Incoming unit tangent at p2 (end) of a segment — direction of travel arriving at p2.
function tangentIn(seg) {
  if (seg.type === 'L') return v.norm(v.sub(seg.p2, seg.p1));
  if (seg.type === 'Q') {
    let t = v.sub(seg.p2, seg.c);
    if (v.len(t) < 1e-9) t = v.sub(seg.p2, seg.p1);
    return v.norm(t);
  }
  if (seg.type === 'C') {
    let t = v.sub(seg.p2, seg.c2);
    if (v.len(t) < 1e-9) t = v.sub(seg.p2, seg.c1);
    if (v.len(t) < 1e-9) t = v.sub(seg.p2, seg.p1);
    return v.norm(t);
  }
  throw new Error('Unknown segment type: ' + seg.type);
}

// ---------- bezier evaluation & splitting (de Casteljau) ----------
function evalQuad(p1, c, p2, t) {
  const u = 1 - t;
  return [
    u * u * p1[0] + 2 * u * t * c[0] + t * t * p2[0],
    u * u * p1[1] + 2 * u * t * c[1] + t * t * p2[1],
  ];
}
function evalCubic(p1, c1, c2, p2, t) {
  const u = 1 - t;
  return [
    u*u*u*p1[0] + 3*u*u*t*c1[0] + 3*u*t*t*c2[0] + t*t*t*p2[0],
    u*u*u*p1[1] + 3*u*u*t*c1[1] + 3*u*t*t*c2[1] + t*t*t*p2[1],
  ];
}

// Split a quadratic at parameter t. Returns {left, right} as Q segments.
function splitQuad(seg, t) {
  const { p1, c, p2 } = seg;
  const q0 = [p1[0] + (c[0]-p1[0])*t, p1[1] + (c[1]-p1[1])*t];
  const q1 = [c[0] + (p2[0]-c[0])*t,  c[1] + (p2[1]-c[1])*t];
  const m  = [q0[0] + (q1[0]-q0[0])*t, q0[1] + (q1[1]-q0[1])*t];
  return {
    left:  { type:'Q', p1, c: q0, p2: m },
    right: { type:'Q', p1: m, c: q1, p2 },
  };
}

// Split a cubic at parameter t. Returns {left, right} as C segments.
function splitCubic(seg, t) {
  const { p1, c1, c2, p2 } = seg;
  const a = [p1[0] + (c1[0]-p1[0])*t, p1[1] + (c1[1]-p1[1])*t];
  const b = [c1[0] + (c2[0]-c1[0])*t, c1[1] + (c2[1]-c1[1])*t];
  const c = [c2[0] + (p2[0]-c2[0])*t, c2[1] + (p2[1]-c2[1])*t];
  const d = [a[0]  + (b[0]-a[0])*t,   a[1]  + (b[1]-a[1])*t];
  const e = [b[0]  + (c[0]-b[0])*t,   b[1]  + (c[1]-b[1])*t];
  const m = [d[0]  + (e[0]-d[0])*t,   d[1]  + (e[1]-d[1])*t];
  return {
    left:  { type:'C', p1, c1: a, c2: d, p2: m },
    right: { type:'C', p1: m, c1: e, c2: c, p2 },
  };
}

// Approximate arc length of a segment (used to bound the trim distance).
function segLength(seg) {
  if (seg.type === 'L') return v.len(v.sub(seg.p2, seg.p1));
  // Subdivide bezier; simple Simpson-ish approximation by polyline.
  const N = 24;
  let last = seg.p1;
  let total = 0;
  for (let i = 1; i <= N; i++) {
    const t = i / N;
    const p = seg.type === 'Q'
      ? evalQuad(seg.p1, seg.c, seg.p2, t)
      : evalCubic(seg.p1, seg.c1, seg.c2, seg.p2, t);
    total += v.len(v.sub(p, last));
    last = p;
  }
  return total;
}

// Find parameter t such that the segment from t..1 has approximately `dist` arc length.
// Returns t in (0,1). Used to trim the END of an incoming segment.
function paramAtDistFromEnd(seg, dist) {
  const total = segLength(seg);
  if (dist >= total) return 0; // trim entire segment
  // Walk from t=1 backwards.
  const N = 64;
  let acc = 0;
  let last = seg.p2;
  for (let i = 1; i <= N; i++) {
    const t = 1 - i / N;
    const p = seg.type === 'L'
      ? [seg.p1[0] + (seg.p2[0]-seg.p1[0])*t, seg.p1[1] + (seg.p2[1]-seg.p1[1])*t]
      : seg.type === 'Q'
      ? evalQuad(seg.p1, seg.c, seg.p2, t)
      : evalCubic(seg.p1, seg.c1, seg.c2, seg.p2, t);
    const step = v.len(v.sub(p, last));
    if (acc + step >= dist) {
      // linearly interpolate within this slice
      const frac = (dist - acc) / step;
      return t + (1/N) * (1 - frac);
    }
    acc += step;
    last = p;
  }
  return 0;
}

// Find parameter t such that the segment from 0..t has approximately `dist` arc length.
// Used to trim the START of an outgoing segment.
function paramAtDistFromStart(seg, dist) {
  const total = segLength(seg);
  if (dist >= total) return 1;
  const N = 64;
  let acc = 0;
  let last = seg.p1;
  for (let i = 1; i <= N; i++) {
    const t = i / N;
    const p = seg.type === 'L'
      ? [seg.p1[0] + (seg.p2[0]-seg.p1[0])*t, seg.p1[1] + (seg.p2[1]-seg.p1[1])*t]
      : seg.type === 'Q'
      ? evalQuad(seg.p1, seg.c, seg.p2, t)
      : evalCubic(seg.p1, seg.c1, seg.c2, seg.p2, t);
    const step = v.len(v.sub(p, last));
    if (acc + step >= dist) {
      const frac = (dist - acc) / step;
      return t - (1/N) * (1 - frac);
    }
    acc += step;
    last = p;
  }
  return 1;
}

// Trim a segment, keeping only [t..1].
function trimSegStart(seg, t) {
  if (t <= 1e-9) return seg;
  if (seg.type === 'L') {
    const np1 = [seg.p1[0] + (seg.p2[0]-seg.p1[0])*t, seg.p1[1] + (seg.p2[1]-seg.p1[1])*t];
    return { type:'L', p1: np1, p2: seg.p2 };
  }
  if (seg.type === 'Q') return splitQuad(seg, t).right;
  if (seg.type === 'C') return splitCubic(seg, t).right;
}

// Trim a segment, keeping only [0..t].
function trimSegEnd(seg, t) {
  if (t >= 1 - 1e-9) return seg;
  if (seg.type === 'L') {
    const np2 = [seg.p1[0] + (seg.p2[0]-seg.p1[0])*t, seg.p1[1] + (seg.p2[1]-seg.p1[1])*t];
    return { type:'L', p1: seg.p1, p2: np2 };
  }
  if (seg.type === 'Q') return splitQuad(seg, t).left;
  if (seg.type === 'C') return splitCubic(seg, t).left;
}

// ---------- the corner fillet ----------
// Build a circular arc tangent to both segments at the junction.
// tIn : unit tangent of incoming seg at corner (direction of travel arriving)
// tOut: unit tangent of outgoing seg at corner (direction of travel leaving)
// corner: the shared point
// trim: distance back along each segment where the arc touches
//
// For a true circular fillet, the arc radius is: r = trim * tan(theta/2),
// where theta is the turn angle. We instead pick `trim` from the user's
// requested radius: trim = r / tan(theta/2).
function buildArc(corner, tIn, tOut, trim) {
  // Points where arc meets each segment
  const pStart = v.sub(corner, v.mul(tIn,  trim)); // back along incoming
  const pEnd   = v.add(corner, v.mul(tOut, trim)); // forward along outgoing

  // Normals perpendicular to each tangent, pointing toward the arc center.
  // Decide side from the cross product of tangents.
  const turn = v.cross(tIn, tOut); // >0 = left turn, <0 = right turn
  const sign = turn >= 0 ? 1 : -1;
  // Left-perp of tIn:
  const nIn  = [-tIn[1] * sign,  tIn[0] * sign];
  // The center lies along pStart + r * nIn. We need r.
  // r relates to trim by: trim = r * tan((π - |theta|)/2)... let's just solve.
  // Center = pStart + r*nIn = pEnd + r*nOut. Solve for r.
  const nOut = [-tOut[1] * sign, tOut[0] * sign];

  // (pStart + r*nIn) - (pEnd + r*nOut) = 0
  // r*(nIn - nOut) = pEnd - pStart
  const diff = v.sub(pEnd, pStart);
  const dn = v.sub(nIn, nOut);
  // Use whichever component has larger magnitude for stability
  let r;
  if (Math.abs(dn[0]) > Math.abs(dn[1])) r = diff[0] / dn[0];
  else r = diff[1] / dn[1];

  if (!isFinite(r) || r <= 0) return null;

  const center = v.add(pStart, v.mul(nIn, r));
  const startAngle = Math.atan2(pStart[1] - center[1], pStart[0] - center[0]);
  const endAngle   = Math.atan2(pEnd[1]   - center[1], pEnd[0]   - center[0]);
  const ccw = sign < 0; // right turn = ccw arc in screen coords (y-down) — depends on coord system

  return {
    type: 'A',
    p1: pStart,
    p2: pEnd,
    center,
    radius: r,
    startAngle,
    endAngle,
    ccw,
  };
}

// ---------- main entry point ----------
/**
 * Round all corners of a path.
 * @param {Array} segments - array of segment objects
 * @param {number|Array<number>} radius - global radius, or per-corner radii
 *        (length = segments.length - 1 for open, or segments.length for closed)
 * @param {Object} opts - { closed: false }
 * @returns {Array} new segments (lines, beziers, arcs)
 */
function roundCorners(segments, radius, opts = {}) {
  const closed = !!opts.closed;
  const n = segments.length;
  if (n < 2) return segments.slice();

  const out = segments.map(s => ({ ...s })); // shallow clone, may be replaced
  // Per-corner radius
  const radii = Array.isArray(radius)
    ? radius
    : new Array(closed ? n : n - 1).fill(radius);

  // We process corners and replace segments in `out`. To avoid index drift while
  // splicing, build a result array by walking through.
  const result = [];

  // For each corner i (between segment i and i+1), compute fillet, then trim
  // the relevant ends of the adjacent segments.
  const cornerCount = closed ? n : n - 1;
  // Track trimmed versions of each segment.
  const trimmed = out.map(s => s);
  const arcs = new Array(cornerCount).fill(null);

  for (let i = 0; i < cornerCount; i++) {
    const ai = i;                // incoming segment index
    const bi = (i + 1) % n;      // outgoing segment index
    const a = trimmed[ai];
    const b = trimmed[bi];
    const corner = a.p2;

    const tIn  = tangentIn(a);
    const tOut = tangentOut(b);

    // Skip if collinear (no corner to round)
    const cr = v.cross(tIn, tOut);
    const dt = v.dot(tIn, tOut);
    if (Math.abs(cr) < 1e-9 && dt > 0) continue;

    const r = radii[i];
    if (!r || r <= 0) continue;

    // Compute trim distance from radius and angle.
    // Half the EXTERIOR angle: phi = (π - theta)/2 where theta = angle between tangents.
    // trim = r / tan(phi)... equivalently trim = r * tan(theta/2) where theta = turn angle.
    const turnAngle = Math.acos(Math.max(-1, Math.min(1, dt))); // 0..π
    let trim = r / Math.tan((Math.PI - turnAngle) / 2);
    if (!isFinite(trim) || trim <= 0) continue;

    // Don't trim more than half of either segment.
    const lenA = segLength(a);
    const lenB = segLength(b);
    const maxTrim = Math.min(lenA, lenB) * 0.5;
    if (trim > maxTrim) trim = maxTrim;

    // Find params and trim
    const tA = paramAtDistFromEnd(a, trim);
    const tB = paramAtDistFromStart(b, trim);

    const newA = trimSegEnd(a, tA);
    const newB = trimSegStart(b, tB);

    // Recompute tangents at the new endpoints (important for curves!)
    const tIn2  = tangentIn(newA);
    const tOut2 = tangentOut(newB);

    const arc = buildArc(newA.p2, tIn2, tOut2, 0); // trim=0 because we already moved the points
    // buildArc with trim=0 doesn't quite work — we need a version that takes the two
    // touch points directly. Let's compute the arc center directly from the two points
    // and tangents.
    const builtArc = arcFromPointsAndTangents(newA.p2, tIn2, newB.p1, tOut2);
    if (!builtArc) continue;

    trimmed[ai] = newA;
    trimmed[bi] = newB;
    arcs[i] = builtArc;
  }

  // Stitch result: seg0, arc0, seg1, arc1, ..., seg(n-1) [, arc(n-1) if closed]
  for (let i = 0; i < n; i++) {
    result.push(trimmed[i]);
    if (i < cornerCount && arcs[i]) result.push(arcs[i]);
  }
  return result;
}

// Build an arc given two touch points and the tangent directions at each
// (tangents pointing "into" the arc at p1, "out of" the arc at p2).
function arcFromPointsAndTangents(p1, t1, p2, t2) {
  // Normal to t1 (perpendicular). The center lies along p1 + r*n1.
  // Choose the side using the turn direction.
  const turn = v.cross(t1, t2);
  if (Math.abs(turn) < 1e-9) return null;
  const sign = turn >= 0 ? 1 : -1;
  const n1 = [-t1[1] * sign,  t1[0] * sign];
  const n2 = [-t2[1] * sign,  t2[0] * sign];

  // Solve p1 + r*n1 = p2 + r*n2  =>  r*(n1 - n2) = p2 - p1
  const diff = v.sub(p2, p1);
  const dn = v.sub(n1, n2);
  let r;
  if (Math.abs(dn[0]) > Math.abs(dn[1])) r = diff[0] / dn[0];
  else r = diff[1] / dn[1];
  if (!isFinite(r) || r <= 0) return null;

  const center = v.add(p1, v.mul(n1, r));
  const startAngle = Math.atan2(p1[1] - center[1], p1[0] - center[0]);
  const endAngle   = Math.atan2(p2[1] - center[1], p2[0] - center[0]);

  return {
    type: 'A',
    p1, p2,
    center,
    radius: r,
    startAngle,
    endAngle,
    ccw: sign < 0,
  };
}

// ---------- SVG output ----------
function toSVGPath(segments) {
  if (!segments.length) return '';
  let d = `M ${segments[0].p1[0]} ${segments[0].p1[1]}`;
  for (const s of segments) {
    if (s.type === 'L') d += ` L ${s.p2[0]} ${s.p2[1]}`;
    else if (s.type === 'Q') d += ` Q ${s.c[0]} ${s.c[1]} ${s.p2[0]} ${s.p2[1]}`;
    else if (s.type === 'C') d += ` C ${s.c1[0]} ${s.c1[1]} ${s.c2[0]} ${s.c2[1]} ${s.p2[0]} ${s.p2[1]}`;
    else if (s.type === 'A') {
      // SVG arc flags
      const dx = s.p2[0] - s.p1[0], dy = s.p2[1] - s.p1[1];
      const chord = Math.hypot(dx, dy);
      const largeArc = 0; // fillets are always minor arcs
      // sweep flag: 1 = clockwise in SVG (y-down), 0 = ccw
      const sweep = s.ccw ? 0 : 1;
      d += ` A ${s.radius} ${s.radius} 0 ${largeArc} ${sweep} ${s.p2[0]} ${s.p2[1]}`;
    }
  }
  return d;
}

// ---------- exports ----------
if (typeof module !== 'undefined') {
  module.exports = { roundCorners, toSVGPath };
}
if (typeof window !== 'undefined') {
  window.PathRounder = { roundCorners, toSVGPath };
}
