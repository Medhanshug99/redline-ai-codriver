import { useRef, useMemo, Component, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

type Mood = "Calm" | "Stressed" | "Tired" | "Frustrated" | null;

const MOOD_HEX: Record<string, string> = {
  Stressed: "#ff2b3c",
  Tired: "#ffb020",
  Frustrated: "#a855f7",
  Calm: "#2be8ff",
  default: "#b91c2c",
};

const MOOD_COLORS: Record<string, THREE.Color> = {
  Stressed: new THREE.Color("#ff2b3c"),
  Tired: new THREE.Color("#ffb020"),
  Frustrated: new THREE.Color("#a855f7"),
  Calm: new THREE.Color("#2be8ff"),
  default: new THREE.Color("#b91c2c"),
};

/* ── Mouse parallax ─────────────────────────────────────────────────────── */
const mouse = { x: 0, y: 0 };
if (typeof window !== "undefined") {
  window.addEventListener("mousemove", (e) => {
    mouse.x = (e.clientX / window.innerWidth  - 0.5) * 2;
    mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });
}

function ClearColor({ color }: { color: string }) {
  const { gl } = useThree();
  gl.setClearColor(new THREE.Color(color), 1);
  return null;
}

/* ── Circuit Wireframe Lattice (3D Line & Grid Network) ── */
function CircuitWireframeNetwork({ mood }: { mood: Mood }) {
  const groupRef = useRef<THREE.Group>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const gridRef = useRef<THREE.Mesh>(null);

  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const currentColor = useRef(new THREE.Color("#b91c2c"));

  // Procedural low-poly circuit wireframe track
  const circuitGeometry = useMemo(() => {
    const points = [
      new THREE.Vector3(-6, -2, 0),
      new THREE.Vector3(-4, 2.5, -1),
      new THREE.Vector3(1, 3.5, 1),
      new THREE.Vector3(5, 1, 0),
      new THREE.Vector3(6, -2.5, -1),
      new THREE.Vector3(2, -3.5, 1),
      new THREE.Vector3(-3, -1.5, 0),
      new THREE.Vector3(-6, -2, 0),
    ];
    const curve = new THREE.CatmullRomCurve3(points, true);
    return new THREE.TubeGeometry(curve, 64, 0.28, 6, true);
  }, []);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.05 + mouse.x * 0.08;
      groupRef.current.rotation.x = 0.15 + Math.sin(t * 0.2) * 0.04 + mouse.y * 0.06;
    }
    if (ring1Ref.current) ring1Ref.current.rotation.z = -t * 0.08;
    if (ring2Ref.current) ring2Ref.current.rotation.x = t * 0.06;
    if (gridRef.current) gridRef.current.rotation.z = t * 0.02;

    if (matRef.current) {
      const targetColor = mood && MOOD_COLORS[mood] ? MOOD_COLORS[mood] : MOOD_COLORS.default;
      currentColor.current.lerp(targetColor, delta * 0.6);
      matRef.current.color.copy(currentColor.current);
    }
  });

  return (
    <group ref={groupRef} position={[1.5, 0, -2]}>
      {/* 3D Wireframe Race Circuit Ribbon */}
      <mesh geometry={circuitGeometry}>
        <meshBasicMaterial
          ref={matRef}
          wireframe
          color="#b91c2c"
          transparent
          opacity={0.45}
        />
      </mesh>

      {/* Telemetry Radar Rings */}
      <mesh ref={ring1Ref} rotation={[Math.PI / 3, 0, 0]}>
        <torusGeometry args={[7.2, 0.02, 6, 48]} />
        <meshBasicMaterial color="#8b1a1a" wireframe transparent opacity={0.25} />
      </mesh>
      <mesh ref={ring2Ref} rotation={[0, Math.PI / 4, 0]}>
        <torusGeometry args={[5.6, 0.015, 6, 36]} />
        <meshBasicMaterial color="#7f1d1d" wireframe transparent opacity={0.20} />
      </mesh>

      {/* Ground Telemetry Coordinate Grid */}
      <mesh ref={gridRef} position={[0, -3.8, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[20, 20, 16, 16]} />
        <meshBasicMaterial color="#551111" wireframe transparent opacity={0.22} />
      </mesh>
    </group>
  );
}

/* ── Error boundary ── */
class SceneErrorBoundary extends Component<
  { children: ReactNode }, { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(e: unknown) { console.warn("3D backdrop error:", e); }
  render() { return this.state.hasError ? null : this.props.children; }
}

interface Props { mood?: Mood; }

export function TrackBackdrop({ mood = null }: Props) {
  const strokeColor = mood && MOOD_HEX[mood] ? MOOD_HEX[mood] : MOOD_HEX.default;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        overflow: "hidden",
        opacity: 0.40,
        backgroundColor: "#0a0202",
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 7.5], fov: 55 }}
        gl={{ antialias: true, alpha: false, powerPreference: "low-power" }}
      >
        <ClearColor color="#0a0202" />
        <SceneErrorBoundary>
          <CircuitWireframeNetwork mood={mood} />
        </SceneErrorBoundary>
      </Canvas>

      {/* SVG circuit line overlay */}
      <svg
        style={{
          position: "absolute", inset: 0,
          width: "100%", height: "100%",
          opacity: 0.15, pointerEvents: "none",
        }}
        viewBox="0 0 1000 600"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="cg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor={strokeColor} stopOpacity="0.8" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <ellipse cx="510" cy="320" rx="360" ry="200"
          fill="none" stroke="url(#cg)"
          strokeWidth="2.0" strokeDasharray="8 6"
        />
      </svg>
    </div>
  );
}
