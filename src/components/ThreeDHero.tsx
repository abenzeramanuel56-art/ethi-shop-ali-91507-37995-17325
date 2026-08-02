import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function DeliveryGlobe() {
  const group = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (group.current) {
      group.current.rotation.y += delta * 0.18;
      group.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.12;
    }
    if (inner.current) inner.current.rotation.y -= delta * 0.35;
  });

  return (
    <group ref={group}>
      {/* Wireframe globe = the network */}
      <mesh>
        <icosahedronGeometry args={[1.5, 3]} />
        <meshBasicMaterial color="#ff5a1f" wireframe transparent opacity={0.35} />
      </mesh>
      {/* Solid glowing core */}
      <mesh ref={inner}>
        <icosahedronGeometry args={[1.05, 1]} />
        <meshStandardMaterial
          color="#12202e"
          emissive="#0a6f9e"
          emissiveIntensity={0.18}
          roughness={0.3}
          metalness={0.85}
          flatShading
        />
      </mesh>

      {/* Orbiting delivery nodes */}
      <OrbitNodes />
    </group>
  );
}

function OrbitNodes() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const count = 22;

  const seeds = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        radius: 1.9 + (i % 4) * 0.22,
        speed: 0.25 + ((i * 37) % 60) / 160,
        phase: (i / count) * Math.PI * 2,
        tilt: ((i * 53) % 100) / 100 - 0.5,
      })),
    []
  );

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    seeds.forEach((s, i) => {
      const a = s.phase + t * s.speed;
      dummy.position.set(Math.cos(a) * s.radius, s.tilt * 1.6, Math.sin(a) * s.radius);
      dummy.scale.setScalar(0.055 + Math.abs(Math.sin(a * 2)) * 0.03);
      dummy.updateMatrix();
      ref.current!.setMatrixAt(i, dummy.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined as never, undefined as never, count]}>
      <sphereGeometry args={[1, 12, 12]} />
      <meshStandardMaterial color="#ffb020" emissive="#ff7a18" emissiveIntensity={1.4} />
    </instancedMesh>
  );
}

/** WebGL hero visual: an orbiting delivery network globe. */
export function ThreeDHero({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none select-none ${className}`} aria-hidden="true">
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 0.4, 5.2], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.6} />
          <pointLight position={[4, 4, 5]} intensity={2.4} color="#ff7a18" />
          <pointLight position={[-5, -2, -3]} intensity={1.6} color="#0aa2e0" />
          <DeliveryGlobe />
        </Suspense>
      </Canvas>
    </div>
  );
}

export default ThreeDHero;
