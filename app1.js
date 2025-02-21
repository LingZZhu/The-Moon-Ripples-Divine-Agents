import * as THREE from 'https://unpkg.com/three@0.150.0/build/three.module.js'; 
import { OrbitControls } from 'https://unpkg.com/three@0.150.0/examples/jsm/controls/OrbitControls.js';
import { PLYLoader } from 'https://unpkg.com/three@0.150.0/examples/jsm/loaders/PLYLoader.js';

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

  const ambientlight = new THREE.AmbientLight(0x404040, 20);
  scene.add(ambientlight);

  const loader = new PLYLoader();
  loader.load('./scene_september_bark_Gaussian_Splatting.ply', function (geometry) {
    geometry.computeVertexNormals();
    const material = new THREE.PointsMaterial({
      vertexColors: true,
      size: 0.0005,
      sizeAttenuation: true
    });
    const points = new THREE.Points(geometry, material);
    scene.add(points);
  }, undefined, function (error) {
    console.error('Error loading PLY file:', error);
  });

  animate();
}

const animate = () => {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
};

init();