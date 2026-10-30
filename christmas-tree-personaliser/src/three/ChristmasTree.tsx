import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { RoundedBox } from '@react-three/drei';
import {
  BANNERS,
  STAR,
  TIERS,
  createBannerGeometry,
  createPlinthGeometry,
  createRibbonTailGeometry,
  createStarGeometry,
  createTierGeometry,
  tierFrontZ,
} from './geometry';
import { NameText } from './NameText';
import { createLayerLineTexture } from './textures';
import {
  getLetterColour,
  getTreeColour,
  type LetterColourId,
  type MaterialSpec,
  type TreeColourId,
} from '../config/options';

export interface NameLayout {
  text: string;
  size: number;
  width: number;
}

interface Props {
  names: [string, string, string];
  treeColour: TreeColourId;
  letterColour: LetterColourId;
  onNameLayout?: (index: number, layout: NameLayout) => void;
}

const PLINTH = { lower: { w: 13.6, d: 7.2, h: 1.15 }, upper: { w: 11.6, d: 5.8, h: 0.7 } };

function applySpec(m: THREE.MeshStandardMaterial, spec: MaterialSpec) {
  m.color.set(spec.color);
  m.roughness = spec.roughness;
  m.metalness = spec.metalness;
}

function usePrintedMaterial(bump: THREE.Texture, bumpScale = 0.35) {
  return useMemo(
    () => new THREE.MeshStandardMaterial({ bumpMap: bump, bumpScale, envMapIntensity: 0.9 }),
    [bump, bumpScale],
  );
}

export function ChristmasTree({ names, treeColour, letterColour, onNameLayout }: Props) {
  const bump = useMemo(() => {
    const t = createLayerLineTexture();
    // ~0.1 mm print layers would alias on screen, so we exaggerate them slightly
    t.repeat.set(0.25, 0.25);
    return t;
  }, []);

  // The product prints in exactly two filaments: the main colour for the tree,
  // banners, trunk and base, and the accent colour for names, star and baubles.
  const bodyMat = usePrintedMaterial(bump);
  const letterMat = usePrintedMaterial(bump, 0.25);

  // Colour changes only update the existing materials, so they apply instantly
  // and the camera and geometry are left untouched.
  useEffect(() => {
    applySpec(bodyMat, getTreeColour(treeColour).body);
    applySpec(letterMat, getLetterColour(letterColour).material);
  }, [treeColour, letterColour, bodyMat, letterMat]);

  const tierGeos = useMemo(() => TIERS.map(createTierGeometry), []);
  const bannerGeos = useMemo(() => BANNERS.map((b) => createBannerGeometry(b.width, b.height)), []);
  const tailGeos = useMemo(() => BANNERS.map((b) => createRibbonTailGeometry(b.height * 0.82)), []);
  const starGeo = useMemo(() => createStarGeometry(STAR.outer, STAR.inner, STAR.depth), []);
  const plinthGeos = useMemo(
    () => [
      createPlinthGeometry(PLINTH.lower.w, PLINTH.lower.d, PLINTH.lower.h, 1.3, 0.2),
      createPlinthGeometry(PLINTH.upper.w, PLINTH.upper.d, PLINTH.upper.h, 1.0, 0.16),
    ],
    [],
  );

  const baubles = useMemo(() => {
    const list: { pos: [number, number, number]; r: number }[] = [];
    TIERS.forEach((t) => {
      const hb = t.bottomWidth / 2;
      const z = tierFrontZ(t) - 0.35;
      list.push({ pos: [-hb - 0.05, t.y + 0.05, z], r: 0.46 });
      list.push({ pos: [hb + 0.05, t.y + 0.05, z], r: 0.46 });
      const step = t.bottomWidth / t.scallops;
      for (let i = 1; i < t.scallops; i++) {
        list.push({ pos: [-hb + step * i, t.y - 0.12, z + 0.1], r: 0.3 });
      }
    });
    return list;
  }, []);

  useEffect(
    () => () => {
      [...tierGeos, ...bannerGeos, ...tailGeos, starGeo, ...plinthGeos].forEach((g) => g.dispose());
    },
    [tierGeos, bannerGeos, tailGeos, starGeo, plinthGeos],
  );

  const topTier = TIERS[TIERS.length - 1];
  const apexY = topTier.y + topTier.height;

  return (
    <group name="christmas-tree">
      {/* Base */}
      <mesh geometry={plinthGeos[0]} material={bodyMat} castShadow receiveShadow />
      <mesh geometry={plinthGeos[1]} material={bodyMat} position={[0, PLINTH.lower.h, 0]} castShadow receiveShadow />
      <group position={[0, PLINTH.lower.h / 2, PLINTH.lower.d / 2 + 0.01]}>
        <NameText text="Merry Christmas" maxWidth={9} capHeight={0.52} material={letterMat} />
      </group>

      {/* Trunk */}
      <RoundedBox
        args={[2.4, 1.6, 2.0]}
        radius={0.25}
        smoothness={4}
        position={[0, PLINTH.lower.h + PLINTH.upper.h + 0.7, 0]}
        material={bodyMat}
        castShadow
        receiveShadow
      />

      {/* Layered branches */}
      {TIERS.map((t, i) => (
        <mesh key={i} geometry={tierGeos[i]} material={bodyMat} position={[0, t.y, t.z]} castShadow receiveShadow />
      ))}

      {/* Ornaments */}
      {baubles.map((b, i) => (
        <mesh key={i} position={b.pos} material={letterMat} castShadow>
          <sphereGeometry args={[b.r, 24, 16]} />
        </mesh>
      ))}

      {/* Name banners */}
      {BANNERS.map((b, i) => {
        const z = tierFrontZ(TIERS[b.tier]) + 0.03;
        const plateFront = 0.26 + 0.07;
        return (
          <group key={i} position={[0, b.y, z]}>
            <mesh geometry={bannerGeos[i]} material={bodyMat} castShadow receiveShadow />
            {[-1, 1].map((side) => (
              <mesh
                key={side}
                geometry={tailGeos[i]}
                material={bodyMat}
                position={[side * (b.width / 2 - 0.25), -0.28, -0.24]}
                rotation={[0, 0, side * -0.12]}
                scale={[side, 1, 1]}
                castShadow
                receiveShadow
              />
            ))}
            <group position={[0, 0, plateFront - 0.01]}>
              <NameText
                text={names[i]}
                maxWidth={b.width - 0.9}
                capHeight={b.height * 0.6}
                material={letterMat}
                onLayout={onNameLayout ? (l) => onNameLayout(i, l) : undefined}
              />
            </group>
          </group>
        );
      })}

      {/* Star topper */}
      <mesh position={[0, apexY - 0.1, topTier.z]} material={letterMat} castShadow>
        <cylinderGeometry args={[0.28, 0.34, 1.0, 20]} />
      </mesh>
      <mesh geometry={starGeo} material={letterMat} position={[0, STAR.y, topTier.z]} castShadow receiveShadow />
    </group>
  );
}
