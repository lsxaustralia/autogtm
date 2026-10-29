import { useMemo } from 'react';
import * as THREE from 'three';
import { MeshReflectorMaterial } from '@react-three/drei';
import { createBackdropTexture, createWoodTextures } from './textures';

const TABLE = { w: 200, d: 170, h: 4 };

export function Tabletop({ reflections = true }: { reflections?: boolean }) {
  const { map, roughnessMap } = useMemo(() => {
    const t = createWoodTextures();
    // one texture spans ~75 cm of planks
    t.map.repeat.set(2.6, 2.2);
    t.roughnessMap.repeat.set(2.6, 2.2);
    return t;
  }, []);
  const backdrop = useMemo(createBackdropTexture, []);

  return (
    <group>
      {/* table top surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[TABLE.w, TABLE.d]} />
        {reflections ? (
          <MeshReflectorMaterial
            map={map}
            roughnessMap={roughnessMap}
            roughness={0.62}
            metalness={0}
            color="#ffffff"
            envMapIntensity={0.6}
            blur={[400, 120]}
            resolution={512}
            mixBlur={1}
            mixStrength={0.55}
            mixContrast={1}
            depthScale={0.6}
            minDepthThreshold={0.6}
            maxDepthThreshold={1.2}
            mirror={0}
          />
        ) : (
          <meshStandardMaterial map={map} roughnessMap={roughnessMap} roughness={0.65} envMapIntensity={0.6} />
        )}
      </mesh>
      {/* table body, so the slab has a visible edge when orbiting */}
      <mesh position={[0, -TABLE.h / 2 - 0.01, 0]} receiveShadow>
        <boxGeometry args={[TABLE.w, TABLE.h, TABLE.d]} />
        <meshStandardMaterial color="#7d5532" roughness={0.7} map={map} />
      </mesh>
      {/* studio sweep surrounding the set */}
      <mesh position={[0, 30, 0]}>
        <sphereGeometry args={[260, 48, 32]} />
        <meshBasicMaterial map={backdrop} side={THREE.BackSide} toneMapped={false} fog={false} />
      </mesh>
    </group>
  );
}
