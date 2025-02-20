import * as THREE from 'https://unpkg.com/three@0.150.0/build/three.module.js'; 
import { GLTFLoader } from 'https://unpkg.com/three@0.150.0/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'https://unpkg.com/three@0.150.0/examples/jsm/controls/OrbitControls.js';
import { PLYLoader } from 'https://unpkg.com/three@0.128.0/examples/jsm/loaders/PLYLoader.js';

let scene, camera, renderer;

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const aspect = window.innerWidth / window.innerHeight;
  camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 5000);
  camera.position.set(0.5, 0, 0);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.addEventListener('change', renderer);

  const ambientlight = new THREE.AmbientLight(0x404040, 5);
  scene.add(ambientlight);

  // Instantiate the PLYLoader
  const loader = new PLYLoader();

  // Load the PLY file
  loader.load('path/to/your/model.ply', (geometry) => {
    geometry.computeVertexNormals();

    // Ensure a 'size' attribute exists on the geometry.
    if (!geometry.getAttribute('size')) {
      const count = geometry.getAttribute('position').count;
      const sizes = new Float32Array(count);
      for (let i = 0; i < count; i++) {
        sizes[i] = 10.0; // Adjust default size as needed
      }
      geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    }

    // Define the custom shader material
    const customMaterial = new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          vec2 centered = gl_PointCoord - vec2(0.5);
          float r = length(centered);
          float alpha = exp(-r * r * 4.0);
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      vertexColors: true
    });

    // Create and add the points (point cloud) to the scene
    const points = new THREE.Points(geometry, customMaterial);
    scene.add(points);
  }, undefined, (error) => {
    console.error('Error loading PLY file:', error);
  });

  animate();
}

const animate = () => {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
};

init();
