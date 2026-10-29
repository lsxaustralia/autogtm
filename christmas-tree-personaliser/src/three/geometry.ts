import * as THREE from 'three';

/**
 * All dimensions are in centimetres. The finished decoration is ~18 cm tall
 * and stands on a tabletop at y = 0.
 */

export interface TierSpec {
  /** y of the scalloped bottom edge */
  y: number;
  height: number;
  bottomWidth: number;
  topWidth: number;
  depth: number;
  /** z of the tier's centre, upper tiers sit slightly proud of lower ones */
  z: number;
  scallops: number;
}

export interface BannerSpec {
  /** centre y of the ribbon */
  y: number;
  width: number;
  height: number;
  /** tier the banner is mounted on */
  tier: number;
}

export const TIER_BEVEL = { thickness: 0.32, size: 0.28 };

export const TIERS: TierSpec[] = [
  { y: 2.7, height: 6.4, bottomWidth: 13.4, topWidth: 6.2, depth: 2.6, z: 0, scallops: 5 },
  { y: 7.0, height: 5.6, bottomWidth: 10.6, topWidth: 4.2, depth: 2.3, z: 0.22, scallops: 4 },
  { y: 10.9, height: 4.9, bottomWidth: 8.0, topWidth: 0.6, depth: 2.0, z: 0.42, scallops: 3 },
];

// Name 1 sits at the top, Name 3 on the widest tier at the bottom.
export const BANNERS: BannerSpec[] = [
  { y: 12.6, width: 5.9, height: 1.9, tier: 2 },
  { y: 8.95, width: 7.7, height: 2.1, tier: 1 },
  { y: 4.85, width: 9.6, height: 2.35, tier: 0 },
];

export const STAR = { y: 16.55, outer: 1.55, inner: 0.7, depth: 0.55 };

export function tierFrontZ(t: TierSpec) {
  return t.z + t.depth / 2 + TIER_BEVEL.thickness;
}

/** Stylised fir-tree tier: concave flanks, upturned branch tips, scalloped hem. */
export function createTierShape(t: TierSpec) {
  const { height: h, bottomWidth: bw, topWidth: tw, scallops } = t;
  const s = new THREE.Shape();
  const hb = bw / 2;
  const ht = tw / 2;
  const tipLift = 0.35;

  s.moveTo(-hb, tipLift);
  // scalloped hem, each scallop sagging between the branch tips
  const step = bw / scallops;
  for (let i = 0; i < scallops; i++) {
    const x0 = -hb + step * i;
    const x1 = x0 + step;
    const y1 = i === scallops - 1 ? tipLift : 0.12;
    s.quadraticCurveTo((x0 + x1) / 2, -0.55, x1, y1);
  }
  // right flank, gently concave
  s.quadraticCurveTo(hb * 0.62 + ht * 0.38, h * 0.32, ht, h);
  if (tw > 1.2) {
    s.lineTo(-ht, h);
  } else {
    // rounded apex on the top tier
    s.quadraticCurveTo(0, h + 0.55, -ht, h);
  }
  s.quadraticCurveTo(-(hb * 0.62 + ht * 0.38), h * 0.32, -hb, tipLift);
  return s;
}

export function createTierGeometry(t: TierSpec) {
  const g = new THREE.ExtrudeGeometry(createTierShape(t), {
    depth: t.depth,
    bevelEnabled: true,
    bevelThickness: TIER_BEVEL.thickness,
    bevelSize: TIER_BEVEL.size,
    bevelSegments: 6,
    curveSegments: 28,
  });
  g.translate(0, 0, -t.depth / 2);
  g.computeVertexNormals();
  return g;
}

function roundedRect(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** Main face of the ribbon banner: a softly bowed plate. */
export function createBannerGeometry(w: number, h: number) {
  const s = new THREE.Shape();
  const hw = w / 2;
  const hh = h / 2;
  const bow = 0.12;
  s.moveTo(-hw, -hh);
  s.quadraticCurveTo(0, -hh - bow, hw, -hh);
  s.lineTo(hw, hh);
  s.quadraticCurveTo(0, hh - bow, -hw, hh);
  s.lineTo(-hw, -hh);
  const g = new THREE.ExtrudeGeometry(s, {
    depth: 0.26,
    bevelEnabled: true,
    bevelThickness: 0.07,
    bevelSize: 0.07,
    bevelSegments: 4,
    curveSegments: 24,
  });
  g.computeVertexNormals();
  return g;
}

/** Swallow-tailed ribbon end, folded behind the main plate. Built for the right side. */
export function createRibbonTailGeometry(h: number) {
  const len = 1.05;
  const s = new THREE.Shape();
  const hh = h / 2;
  s.moveTo(0, -hh);
  s.lineTo(len, -hh - 0.05);
  s.lineTo(len - 0.5, 0);
  s.lineTo(len, hh + 0.05);
  s.lineTo(0, hh);
  s.lineTo(0, -hh);
  const g = new THREE.ExtrudeGeometry(s, {
    depth: 0.22,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.05,
    bevelSegments: 3,
  });
  g.computeVertexNormals();
  return g;
}

export function createStarGeometry(outer: number, inner: number, depth: number) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? outer : inner;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) s.moveTo(x, y);
    else s.lineTo(x, y);
  }
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.22,
    bevelSize: 0.16,
    bevelSegments: 6,
  });
  g.translate(0, 0, -depth / 2);
  g.computeVertexNormals();
  return g;
}

/** Two-step plinth with rounded corners and chamfered edges. */
export function createPlinthGeometry(w: number, d: number, h: number, r: number, bevel: number) {
  const g = new THREE.ExtrudeGeometry(roundedRect(w - bevel * 2, d - bevel * 2, r), {
    depth: h - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 5,
    curveSegments: 16,
  });
  // extrusion runs along z; stand it up so the height runs along y
  g.rotateX(-Math.PI / 2);
  g.translate(0, bevel, 0);
  g.computeVertexNormals();
  return g;
}
