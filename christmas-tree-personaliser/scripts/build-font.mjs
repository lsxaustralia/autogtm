// Converts the OFL-licensed Anton font (from @fontsource/anton) into the
// typeface JSON format consumed by three.js FontLoader / TextGeometry.
// Run with: npm run build:font
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const src = path.join(root, 'node_modules/@fontsource/anton/files/anton-latin-400-normal.woff');
const out = path.join(root, 'src/assets/anton.typeface.json');

const buf = fs.readFileSync(src);
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
const r = (n) => Math.round(n);

const glyphs = {};
for (let i = 0; i < font.glyphs.length; i++) {
  const g = font.glyphs.get(i);
  const codes = g.unicodes?.length ? g.unicodes : g.unicode !== undefined ? [g.unicode] : [];
  if (!codes.length) continue;
  let o = '';
  for (const c of g.path.commands) {
    // three.js expects curve end points before control points.
    if (c.type === 'M') o += `m ${r(c.x)} ${r(c.y)} `;
    else if (c.type === 'L') o += `l ${r(c.x)} ${r(c.y)} `;
    else if (c.type === 'Q') o += `q ${r(c.x)} ${r(c.y)} ${r(c.x1)} ${r(c.y1)} `;
    else if (c.type === 'C') o += `b ${r(c.x)} ${r(c.y)} ${r(c.x1)} ${r(c.y1)} ${r(c.x2)} ${r(c.y2)} `;
  }
  const bb = g.getBoundingBox();
  const entry = { ha: r(g.advanceWidth), x_min: r(bb.x1), x_max: r(bb.x2), o: o.trim() };
  for (const code of codes) glyphs[String.fromCodePoint(code)] = entry;
}

const data = {
  glyphs,
  familyName: 'Anton',
  ascender: r(font.ascender),
  descender: r(font.descender),
  underlinePosition: r(font.tables.post.underlinePosition),
  underlineThickness: r(font.tables.post.underlineThickness),
  boundingBox: {
    xMin: r(font.tables.head.xMin),
    yMin: r(font.tables.head.yMin),
    xMax: r(font.tables.head.xMax),
    yMax: r(font.tables.head.yMax),
  },
  resolution: font.unitsPerEm,
  original_font_information: { format: 0, fontFamily: 'Anton', license: 'SIL Open Font License 1.1' },
  cssFontWeight: 'normal',
  cssFontStyle: 'normal',
};

fs.writeFileSync(out, JSON.stringify(data));
console.log(`Wrote ${Object.keys(glyphs).length} glyphs to ${path.relative(root, out)}`);
