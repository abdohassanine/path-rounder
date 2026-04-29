# path-rounder-fillet

`path-rounder-fillet` rounds sharp joints between line and Bezier path segments using circular fillets.

- Runtime: plain JavaScript (no dependencies)
- API: `roundCorners()` and `toSVGPath()`
- Works in Node/CommonJS and browsers

## Live demo

Try it online: <https://abdohassanine.github.io/path-rounder/demo/>
Open `demo/index.html` to run the demo locally.

## Install

```bash
npm install path-rounder-fillet
```

## Quick usage (Node / CommonJS)

```js
const { roundCorners, toSVGPath } = require('path-rounder-fillet');

const path = [
  { type: 'L', p1: [0, 0], p2: [120, 0] },
  { type: 'L', p1: [120, 0], p2: [120, 80] },
];

const rounded = roundCorners(path, 16);
const d = toSVGPath(rounded);
console.log(d);
```

## Browser usage

```html
<script src="./path-rounder.js"></script>
<script>
  const { roundCorners, toSVGPath } = window.PathRounder;

  const path = [
    { type: 'L', p1: [0, 0], p2: [120, 0] },
    { type: 'L', p1: [120, 0], p2: [120, 80] },
  ];

  const rounded = roundCorners(path, 16);
  const d = toSVGPath(rounded);
  console.log(d);
</script>
```

## API

## `roundCorners(segments, radius, options?)`

Rounds every corner in a path and returns a new segment array.

- `segments: Array`  
  Ordered list of path segments. Adjacent segments must share endpoints (`segments[i].p2 === segments[i+1].p1`).
- `radius: number | number[]`  
  A global radius, or per-corner radii.
- `options?: { closed?: boolean }`  
  Set `closed: true` when the path wraps from last segment back to first.

Returns: `Array` of segments (original line/Bezier types plus inserted `A` arc segments).

### Radius array length rules

- Open path: `segments.length - 1`
- Closed path: `segments.length`

### Corner skip rules

A corner is not rounded when:

- Incoming and outgoing tangents are collinear in the same direction (no turn).
- Corner radius is `0`, negative, or missing.
- Numerical/length constraints make trim invalid.

## `toSVGPath(segments)`

Converts a segment array into an SVG `d` string (`M`, `L`, `Q`, `C`, `A` commands).

- Input: any segment array accepted/emitted by this package.
- Output: string suitable for `<path d="...">`.

## Segment shapes

Line:

```js
{ type: 'L', p1: [x, y], p2: [x, y] }
```

Quadratic Bezier:

```js
{ type: 'Q', p1: [x, y], c: [x, y], p2: [x, y] }
```

Cubic Bezier:

```js
{ type: 'C', p1: [x, y], c1: [x, y], c2: [x, y], p2: [x, y] }
```

Arc (output from the library):

```js
{
  type: ('A', p1, p2, center, radius, startAngle, endAngle, ccw);
}
```

## License

MIT
