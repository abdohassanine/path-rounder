<<<<<<< HEAD
# path-rounder

`path-rounder` rounds sharp joints between line and Bezier path segments using circular fillets.
=======
# path-rounder-fillet

`path-rounder-fillet` rounds sharp joints between line and Bezier path segments using circular fillets.
>>>>>>> d06ffed (init)

- Runtime: plain JavaScript (no dependencies)
- API: `roundCorners()` and `toSVGPath()`
- Works in Node/CommonJS and browsers

<<<<<<< HEAD
## Live demo

Try it online: <https://abdohassanine.github.io/path-rounder/demo/>

## Install

```bash
npm install path-rounder
=======
## Install

```bash
npm install path-rounder-fillet
>>>>>>> d06ffed (init)
```

## Quick usage (Node / CommonJS)

```js
<<<<<<< HEAD
const { roundCorners, toSVGPath } = require('path-rounder');

const path = [
  { type: 'L', p1: [0, 0], p2: [120, 0] },
  { type: 'L', p1: [120, 0], p2: [120, 80] },
=======
const { roundCorners, toSVGPath } = require('path-rounder-fillet');

const path = [
  { type: 'L', p1: [0, 0], p2: [120, 0] },
  { type: 'L', p1: [120, 0], p2: [120, 80] }
>>>>>>> d06ffed (init)
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
<<<<<<< HEAD

  const path = [
    { type: 'L', p1: [0, 0], p2: [120, 0] },
    { type: 'L', p1: [120, 0], p2: [120, 80] },
  ];

  const rounded = roundCorners(path, 16);
  const d = toSVGPath(rounded);
  console.log(d);
=======
  // use roundCorners(...) and toSVGPath(...)
>>>>>>> d06ffed (init)
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
<<<<<<< HEAD
{
  type: ('A', p1, p2, center, radius, startAngle, endAngle, ccw);
}
```

## License

MIT
=======
{ type: 'A', p1, p2, center, radius, startAngle, endAngle, ccw }
```

## Package structure

- `path-rounder.js` - core implementation and exports
- `index.js` - package entry point
- `README.md` - package docs

## Publish checklist

1. Update `name` in `package.json` to an available npm package name.
2. Update `version` (SemVer).
3. Run:

```bash
npm pack --dry-run
```

4. Publish:

```bash
npm publish --access public
```

If you publish under a scope (for example `@your-scope/path-rounder-fillet`), use that scoped name in `package.json`.

## Author

- Abdo Hassanine
- Email: abdohassanine@gmail.com
- Website: https://www.abdohassanine.com
- Instagram: https://instagram.com/abdohassanine
>>>>>>> d06ffed (init)
