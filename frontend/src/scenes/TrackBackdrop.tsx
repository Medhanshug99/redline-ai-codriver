import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as random from 'maath/random/dist/maath-random.esm';
import * as THREE from 'three';

function ParticleField() {
  const ref = useRef<THREE.Points>(null);
  const sphere = (random as any).inSphere(new Float32Array(5000 * 3), { radius: 15 }) as Float32Array;

  useFrame((_state, delta) => {
    if (ref.current) {
      ref.current.rotation.x -= delta / 10;
      ref.current.rotation.y -= delta / 15;
    }
  });

  return (
    <group rotation={[0, 0, Math.PI / 4]}>
      <Points ref={ref} positions={sphere} stride={3} frustumCulled={false}>
        <PointMaterial
          transparent
          color="#ff2b3c"
          size={0.03}
          sizeAttenuation={true}
          depthWrite={false}
          opacity={0.4}
          blending={THREE.AdditiveBlending}
        />
      </Points>
    </group>
  );
}

export function TrackBackdrop() {
  return (
    <div className="fixed inset-0 z-[-1] pointer-events-none opacity-40">
      <Canvas camera={{ position: [0, 0, 8] }}>
        <ParticleField />
      </Canvas>
    </div>
  );
}
