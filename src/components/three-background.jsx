"use client"

import { Canvas, useFrame } from "@react-three/fiber"
import { useRef } from "react"
import { Sphere, MeshDistortMaterial } from "@react-three/drei"

function AnimatedSphere() {
  const sphereRef = useRef()

  useFrame(({ clock }) => {
    sphereRef.current.rotation.x = clock.getElapsedTime() * 0.2
    sphereRef.current.rotation.y = clock.getElapsedTime() * 0.3
  })

  return (
    <Sphere ref={sphereRef} args={[1, 64, 64]} position={[0, 0, 0]}>
      <MeshDistortMaterial
        color="#7928ca"
        attach="material"
        distort={0.4}
        speed={2}
        roughness={0.5}
      />
    </Sphere>
  )
}

export function ThreeBackground() {
  return (
    <div className="fixed inset-0 -z-10">
      <Canvas camera={{ position: [0, 0, 5] }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <AnimatedSphere />
      </Canvas>
    </div>
  )
}