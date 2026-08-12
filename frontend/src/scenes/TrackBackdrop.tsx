import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import * as random from "maath/random/dist/maath-random.esm";
import * as THREE from "three";

type Mood = "Calm" | "Stressed" | "Tired" | "Frustrated" | null;

// Target colors per mood (HSL-equivalent in hex)
const MOOD_COLORS: Record<string, THREE.Color> = {
  Stressed: new THREE.Color("#ff2b3c"),
  Tired: new THREE.Color("#e07b39"),
  Frustrated: new THREE.Color("#c45bff"),
  Calm: new THREE.Color("#00d4ff"),
  default: new THREE.Color("#ff2b3c"),
};

interface FieldProps {
  mood: Mood;
}

function ParticleField({ mood }: FieldProps) {
  const ref = useRef<THREE.Points>(null);
  const matRef = useRef<THREE.PointsMaterial>(null);
  const currentColor = useRef(new THREE.Color("#ff2b3c"));

  const sphere = (random as any).inSphere(new Float32Array(5000 * 3), {
    radius: 15,
  }) as Float32Array;

  useFrame((_state, delta) => {
    if (ref.current) {
      ref.current.rotation.x -= delta / 10;
      ref.current.rotation.y -= delta / 15;
    }

    // Smooth color interpolation — lerp at 0.5/s so it takes ~2s to fully shift
    if (matRef.current) {
      const target =
        mood && MOOD_COLORS[mood] ? MOOD_COLORS[mood] : MOOD_COLORS.default;
      currentColor.current.lerp(target, delta * 0.5);
      matRef.current.color.copy(currentColor.current);
    }
  });

  return (
    <group rotation={[0, 0, Math.PI / 4]}>
      <Points ref={ref} positions={sphere} stride={3} frustumCulled={false}>
        <PointMaterial
          ref={matRef}
          transparent
          color="#ff2b3c"
          size={0.03}
          sizeAttenuation={true}
          depthWrite={false}
          opacity={mood === "Stressed" || mood === "Tired" ? 0.55 : 0.4}
          blending={THREE.AdditiveBlending}
        />
      </Points>
    </group>
  );
}

interface Props {
  mood?: Mood;
}

export function TrackBackdrop({ mood = null }: Props) {
  return (
    <div className="fixed inset-0 z-[-1] pointer-events-none opacity-40">
      <Canvas camera={{ position: [0, 0, 8] }}>
        <ParticleField mood={mood} />
      </Canvas>
    </div>
  );
}
