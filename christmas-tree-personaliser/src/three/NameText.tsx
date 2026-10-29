import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import antonJson from '../assets/anton.typeface.json';

const font = new FontLoader().parse(antonJson as never);
const SUPPORTED = new Set(Object.keys((antonJson as { glyphs: Record<string, unknown> }).glyphs));

/** Height of a capital letter at size 1, used to size names consistently. */
const CAP_HEIGHT = (() => {
  const g = new TextGeometry('H', { font, size: 1, depth: 0.01, curveSegments: 1 });
  g.computeBoundingBox();
  const h = g.boundingBox!.max.y - g.boundingBox!.min.y;
  g.dispose();
  return h;
})();

export const LETTER_DEPTH = 0.2;

export function normaliseName(name: string) {
  return Array.from(name.trim().toLocaleUpperCase())
    .filter((ch) => ch === ' ' || SUPPORTED.has(ch))
    .join('');
}

interface Props {
  text: string;
  maxWidth: number;
  capHeight: number;
  material: THREE.Material;
  /** reports the final glyph size, handy for automated checks */
  onLayout?: (info: { text: string; size: number; width: number }) => void;
}

/**
 * Raised 3D lettering. The text is built as real extruded geometry and
 * shrinks automatically so long names stay inside the banner.
 */
export function NameText({ text, maxWidth, capHeight, material, onLayout }: Props) {
  const label = normaliseName(text);

  const result = useMemo(() => {
    if (!label) return null;
    let size = capHeight / CAP_HEIGHT;
    const build = (s: number) =>
      new TextGeometry(label, {
        font,
        size: s,
        depth: LETTER_DEPTH,
        curveSegments: 7,
        bevelEnabled: true,
        bevelThickness: 0.025 * Math.min(1, s),
        bevelSize: 0.012 * s,
        bevelSegments: 2,
      });

    let geometry = build(size);
    geometry.computeBoundingBox();
    let width = geometry.boundingBox!.max.x - geometry.boundingBox!.min.x;
    if (width > maxWidth) {
      geometry.dispose();
      size *= maxWidth / width;
      geometry = build(size);
      geometry.computeBoundingBox();
      width = geometry.boundingBox!.max.x - geometry.boundingBox!.min.x;
    }
    const bb = geometry.boundingBox!;
    // centre horizontally; centre vertically on the cap height so accents don't shift the name
    geometry.translate(-(bb.min.x + bb.max.x) / 2, -(CAP_HEIGHT * size) / 2, 0);
    geometry.computeVertexNormals();
    return { geometry, size, width };
  }, [label, maxWidth, capHeight]);

  useEffect(() => () => result?.geometry.dispose(), [result]);

  useEffect(() => {
    onLayout?.({ text: label, size: result?.size ?? 0, width: result?.width ?? 0 });
  }, [result, label, onLayout]);

  if (!result) return null;
  return <mesh geometry={result.geometry} material={material} castShadow receiveShadow />;
}
