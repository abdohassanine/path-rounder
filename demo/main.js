// Use PathRounder.* — path-rounder.js already defines global `roundCorners` / `toSVGPath`
// (function decls), so `const { roundCorners }` would redeclare and throw.
const { roundCorners: fillet, toSVGPath: toPathD } = window.PathRounder;

// ---- demo paths ----
const paths = {
  svg1: [
    { type: 'L', p1: [40, 40], p2: [200, 60] },
    { type: 'L', p1: [200, 60], p2: [60, 180] },
  ],
  svg2: [
    { type: 'L', p1: [40, 180], p2: [140, 60] },
    { type: 'C', p1: [140, 60], c1: [200, 60], c2: [220, 120], p2: [240, 180] },
  ],
  // G1 break at (160,100): end tangent ->, start tangent up.
  svg3: [
    { type: 'C', p1: [32, 100], c1: [70, 30], c2: [120, 100], p2: [160, 100] },
    { type: 'C', p1: [160, 100], c1: [160, 50], c2: [220, 40], p2: [240, 30] },
  ],
  svg4: [
    { type: 'L', p1: [40, 40], p2: [200, 40] },
    { type: 'L', p1: [200, 40], p2: [260, 140] },
    { type: 'C', p1: [260, 140], c1: [300, 200], c2: [360, 200], p2: [400, 140] },
    { type: 'C', p1: [400, 140], c1: [440, 80], c2: [480, 80], p2: [520, 140] },
    { type: 'L', p1: [520, 140], p2: [520, 240] },
    { type: 'L', p1: [520, 240], p2: [60, 240] },
  ],
};

function draw(svgId, segs, r) {
  const svg = document.getElementById(svgId);
  svg.innerHTML = '';

  const originalPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  originalPath.setAttribute('d', toPathD(segs));
  originalPath.setAttribute('class', 'original');
  svg.appendChild(originalPath);

  const rounded = fillet(segs, r);
  const roundedPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  roundedPath.setAttribute('d', toPathD(rounded));
  roundedPath.setAttribute('class', 'rounded');
  svg.appendChild(roundedPath);

  for (const segment of segs) {
    for (const pt of [segment.p1, segment.p2]) {
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('cx', pt[0]);
      dot.setAttribute('cy', pt[1]);
      dot.setAttribute('r', 2.5);
      dot.setAttribute('class', 'pt');
      svg.appendChild(dot);
    }
  }
}

function redraw() {
  const r = +document.getElementById('radius').value;
  document.getElementById('rval').textContent = r;
  for (const id of Object.keys(paths)) {
    draw(id, paths[id], r);
  }
}

document.getElementById('radius').addEventListener('input', redraw);
redraw();
