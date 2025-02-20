import * as THREE from 'https://unpkg.com/three@0.150.0/build/three.module.js'; 
import { GLTFLoader } from 'https://unpkg.com/three@0.150.0/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'https://unpkg.com/three@0.150.0/examples/jsm/controls/OrbitControls.js';

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

  const loader = new GLTFLoader();
  loader.load(
    './scene_september_bark.glb', // Replace with your model's path
    (gltf) => {
      scene.add(gltf.scene);
    },
    (xhr) => {
      console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
    },
    (error) => {
      console.error('An error occurred loading the model', error);
    }
  );

  animate();
}

const animate = () => {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
};

init();
