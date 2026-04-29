# Path Rounder

Small JavaScript helper that **replaces sharp joints** between line and Bézier segments with **circular fillets**, returning a new path you can turn into an SVG `d` string (or use elsewhere).

**File:** `path-rounder.js`  
**Browser:** `window.PathRounder`  
**Node / bundlers:** `const { roundCorners, toSVGPath } = require('./path-rounder.js')` (or equivalent ESM re-export)

---

## Path format

A path is an **array of segments** in order. Neighbors must **share endpoints**: `segments[i].p2` must match `segments[i + 1].p1` (same point).

### Line

```js
{ type: 'L', p1: [x, y], p2: [x, y] }
```

### Quadratic Bézier

```js
{ type: 'Q', p1: [x, y], c: [x, y], p2: [x, y] }
```

### Cubic Bézier

```js
{ type: 'C', p1: [x, y], c1: [x, y], c2: [x, y], p2: [x, y] }
```

### Arc (output only)

`roundCorners` may insert these; you can feed them to `toSVGPath` but you usually do not author them by hand.

```js
{ type: 'A', p1, p2, center, radius, startAngle, endAngle, ccw }
```

---

## `roundCorners(segments, radius, options?)`

**Returns:** a new array of segments (lines, `Q`/`C` as before, plus `A` where a fillet was added). Does not mutate the input.

### Parameters

| Argument | Type | Description |
|----------|------|-------------|
| `segments` | `Array` | Path as above; length ≥ 2 for any rounding. |
| `radius` | `number` \| `number[]` | Fillet radius. One number applies to every corner, or pass an **array of radii** (one per corner, see below). Use `0` to skip a corner. |
| `options` | `{ closed?: boolean }` | `closed: true` treats the last segment as connected back to the first. Default `false` (open path). |

**Corner count**

- **Open path:** one corner between each pair of consecutive segments → `radius` array length can be `segments.length - 1`.
- **Closed path:** one corner per segment, including between last and first → array length can be `segments.length`.

If `radius` is a single number, it is reused for every corner (subject to the rules below).

### When a corner is *not* rounded

- The **incoming** and **outgoing** tangents at the join are the **same direction** (smooth, collinear; no turn). Tangent at an endpoint follows standard Bézier rules (first/last control vs endpoints).
- `radius` for that corner is missing, `0`, or negative.
- The requested trim is invalid or would remove more than half of either adjacent segment (the implementation clamps and may skip the arc in edge cases).

So two curves that meet **tangent-continuous (G¹)** with no kink will generally **not** get a fillet; you need a **tangent break** to see a round.

### Example

```js
const { roundCorners, toSVGPath } = require('./path-rounder.js');

const segs = [
  { type: 'L', p1: [0, 0], p2: [100, 0] },
  { type: 'L', p1: [100, 0], p2: [100, 80] },
];

const smooth = roundCorners(segs, 12); // 12px fillet at the one corner
const d = toSVGPath(smooth);
// Use d as: <path d="..." />
```

Per-corner radii (open path with two segments → one corner):

```js
roundCorners(segs, [20]);
```

Open path with three segments, two corners, different radii:

```js
roundCorners(
  [ seg0, seg1, seg2 ],
  [10, 0]  // 10 on first corner, 0 = sharp on second
);
```

---

## `toSVGPath(segments)`

**Returns:** a string for SVG `d` (starts with `M`, then `L` / `Q` / `C` / `A` as needed). Empty string if `segments` is empty.

**Parameters:** a segment array, typically the **result** of `roundCorners` (or your own mix that includes `A` segments the library can emit).

```js
const d = toSVGPath(roundCorners(myPath, 16));
el.setAttribute('d', d);
```

---

## Demo

Open `demo.html` in a browser (via a local server if your environment blocks `file://` script loading) to see several examples, including line–line, line–curve, curve–curve, and a longer path.

---

## Coordinate system

The math assumes a **Cartesian-style plane**; SVG uses a **y-down** screen axis. Fillets and `toSVGPath` are written to match common SVG use; if you use other conventions, verify visually.
