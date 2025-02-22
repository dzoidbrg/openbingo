"use client";

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export function BingoScene() {
  const containerRef = useRef();

  useEffect(() => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    containerRef.current.appendChild(renderer.domElement);

    const balls = [];
    const colors = [
      0xff4444,
      0x44ff44,
      0x4444ff,
      0xffff44,
      0xff44ff,
      0x44ffff
    ];

    const textureLoader = new THREE.TextureLoader();
    const ballTexture = new THREE.CanvasTexture(createBallTexture());

    for (let i = 0; i < 12; i++) {
      const geometry = new THREE.SphereGeometry(0.5, 32, 32);
      const material = new THREE.MeshPhysicalMaterial({
        color: colors[i % colors.length],
        metalness: 0.1,
        roughness: 0.2,
        transparent: true,
        opacity: 0.9,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
        map: ballTexture
      });
      const ball = new THREE.Mesh(geometry, material);
      
      ball.position.x = Math.random() * 16 - 8;
      ball.position.y = Math.random() * 16 - 8;
      ball.position.z = Math.random() * 8 - 12;
      
      ball.userData.rotationSpeed = {
        x: Math.random() * 0.02 - 0.01,
        y: Math.random() * 0.02 - 0.01,
        z: Math.random() * 0.02 - 0.01
      };

      ball.userData.floatPhase = Math.random() * Math.PI * 2;
      ball.userData.floatSpeed = 0.001 + Math.random() * 0.001;
      ball.userData.floatAmplitude = 0.1 + Math.random() * 0.1;
      
      balls.push(ball);
      scene.add(ball);
    }

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0xffffff, 1);
    pointLight1.position.set(5, 5, 5);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xffffaa, 0.8);
    pointLight2.position.set(-5, -5, 5);
    scene.add(pointLight2);

    camera.position.z = 8;
    camera.position.y = 2;
    camera.lookAt(scene.position);

    function animate() {
      requestAnimationFrame(animate);

      balls.forEach(ball => {
        ball.rotation.x += ball.userData.rotationSpeed.x;
        ball.rotation.y += ball.userData.rotationSpeed.y;
        ball.rotation.z += ball.userData.rotationSpeed.z;

        const time = Date.now();
        ball.position.y += Math.sin(time * ball.userData.floatSpeed + ball.userData.floatPhase) * ball.userData.floatAmplitude * 0.01;
        ball.position.x += Math.cos(time * ball.userData.floatSpeed * 0.5 + ball.userData.floatPhase) * ball.userData.floatAmplitude * 0.005;
      });

      renderer.render(scene, camera);
    }

    function handleResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }

    window.addEventListener('resize', handleResize);
    animate();

    function createBallTexture() {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const context = canvas.getContext('2d');

      const gradient = context.createRadialGradient(
        canvas.width / 2,
        canvas.height / 2,
        0,
        canvas.width / 2,
        canvas.height / 2,
        canvas.width / 2
      );

      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
      gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

      context.fillStyle = gradient;
      context.fillRect(0, 0, canvas.width, canvas.height);

      return canvas;
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      containerRef.current?.removeChild(renderer.domElement);
      balls.forEach(ball => {
        ball.geometry.dispose();
        ball.material.dispose();
      });
      ballTexture.dispose();
    };
  }, []);

  return (
    <div className="relative">
      <div ref={containerRef} className="absolute inset-0 -z-10" />
      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce z-10">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-white"
        >
          <path d="M12 5v14M19 12l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}