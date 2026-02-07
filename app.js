/**
 * 3D Model Viewer - Three.js Implementation
 * Professional web-based 3D model viewer
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

// ===================================
// Three.js Scene Setup
// ===================================
let scene, camera, renderer, controls;
let currentModel = null;
let gridHelper, axesHelper;
let directionalLight, ambientLight;
let originalMaterials = new Map();
let currentRenderMode = 'pbr';

// DOM Elements
const canvas = document.getElementById('three-canvas');
const viewport = document.getElementById('viewport');
const loadingOverlay = document.getElementById('loadingOverlay');

// Initialize Three.js
function initThreeJS() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    
    // Camera
    camera = new THREE.PerspectiveCamera(
        45,
        viewport.clientWidth / viewport.clientHeight,
        0.1,
        1000
    );
    camera.position.set(5, 3, 5);
    
    // Renderer
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: true
    });
    renderer.setSize(viewport.clientWidth, viewport.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    
    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = true;
    controls.minDistance = 0.5;
    controls.maxDistance = 100;
    controls.target.set(0, 0, 0);
    
    // Lights
    setupLights();
    
    // Helpers
    setupHelpers();
    
    // Load default cube to show something
    loadDefaultModel();
    
    // Start animation loop
    animate();
    
    // Handle resize
    window.addEventListener('resize', onWindowResize);
    
    console.log('✅ Three.js initialized');
}

function setupLights() {
    // Directional Light (Main Light)
    directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(5, 10, 7.5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -10;
    directionalLight.shadow.camera.right = 10;
    directionalLight.shadow.camera.top = 10;
    directionalLight.shadow.camera.bottom = -10;
    scene.add(directionalLight);
    
    // Ambient Light
    ambientLight = new THREE.AmbientLight(0xb4c6e0, 0.5);
    scene.add(ambientLight);
    
    // Hemisphere Light for better fill
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.3);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);
}

function setupHelpers() {
    // Grid Helper
    gridHelper = new THREE.GridHelper(10, 20, 0x00d9ff, 0x333344);
    gridHelper.material.opacity = 0.5;
    gridHelper.material.transparent = true;
    scene.add(gridHelper);
    
    // Axes Helper
    axesHelper = new THREE.AxesHelper(2);
    scene.add(axesHelper);
}

function loadDefaultModel() {
    // Create a demo cube
    const geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    const material = new THREE.MeshStandardMaterial({
        color: 0x00d9ff,
        metalness: 0.3,
        roughness: 0.4
    });
    const cube = new THREE.Mesh(geometry, material);
    cube.castShadow = true;
    cube.receiveShadow = true;
    cube.position.y = 0.75;
    
    currentModel = cube;
    scene.add(cube);
    
    // Update stats for default cube
    updateModelStats(cube);
    
    // Hide loading overlay
    loadingOverlay.style.display = 'none';
}

function onWindowResize() {
    const width = viewport.clientWidth;
    const height = viewport.clientHeight;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

// ===================================
// Model Loading
// ===================================
let currentFileURL = null;

function loadModel(file) {
    const fileName = file.name.toLowerCase();
    
    // Revoke previous URL to prevent memory leak
    if (currentFileURL) {
        URL.revokeObjectURL(currentFileURL);
    }
    currentFileURL = URL.createObjectURL(file);
    
    // Show loading
    loadingOverlay.style.display = 'flex';
    loadingOverlay.querySelector('p').textContent = 'Loading model...';
    
    // Clear previous model
    if (currentModel) {
        scene.remove(currentModel);
        disposeObject(currentModel);
        originalMaterials.clear();
    }
    
    let loader;
    
    if (fileName.endsWith('.glb') || fileName.endsWith('.gltf')) {
        loader = new GLTFLoader();
        
        // Setup Draco decoder for compressed models
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
        loader.setDRACOLoader(dracoLoader);
        
        loader.load(
            currentFileURL,
            (gltf) => {
                currentModel = gltf.scene;
                processLoadedModel(currentModel, file);
            },
            onProgress,
            (error) => onError(error, currentFileURL)
        );
    } else if (fileName.endsWith('.obj')) {
        loader = new OBJLoader();
        loader.load(
            currentFileURL,
            (obj) => {
                currentModel = obj;
                processLoadedModel(currentModel, file);
            },
            onProgress,
            (error) => onError(error, currentFileURL)
        );
    } else if (fileName.endsWith('.fbx')) {
        loader = new FBXLoader();
        loader.load(
            currentFileURL,
            (fbx) => {
                currentModel = fbx;
                processLoadedModel(currentModel, file);
            },
            onProgress,
            (error) => onError(error, currentFileURL)
        );
    } else {
        showError('Unsupported file format. Please use .glb, .gltf, .obj, or .fbx files.');
        URL.revokeObjectURL(currentFileURL);
        currentFileURL = null;
    }
}

function onProgress(xhr) {
    if (xhr.lengthComputable) {
        const percent = Math.round((xhr.loaded / xhr.total) * 100);
        elements.progressFill.style.width = `${percent}%`;
        elements.progressPercent.textContent = `${percent}%`;
    }
}

function onError(error, fileURL) {
    console.error('Error loading model:', error);
    const errorMessage = error.message || 'Unknown error occurred';
    showError(`Failed to load model: ${errorMessage}`);
    
    // Revoke URL on error
    if (fileURL) {
        URL.revokeObjectURL(fileURL);
        currentFileURL = null;
    }
}

function showError(message) {
    // Display error in loading overlay instead of using alert
    loadingOverlay.style.display = 'flex';
    loadingOverlay.querySelector('p').textContent = message;
    loadingOverlay.querySelector('p').style.color = '#ef4444';
    
    // Reset after 3 seconds
    setTimeout(() => {
        loadingOverlay.querySelector('p').textContent = 'Drop a 3D model to view';
        loadingOverlay.querySelector('p').style.color = '';
    }, 3000);
}

function processLoadedModel(model, file) {
    // Store original materials for render mode switching
    model.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            
            // Store original material
            originalMaterials.set(child.uuid, child.material.clone());
        }
    });
    
    // Auto-fit model in view
    fitModelInView(model);
    
    // Add to scene
    scene.add(model);
    
    // Update statistics
    updateModelStats(model, file);
    
    // Apply current render mode
    applyRenderMode(currentRenderMode);
    
    // Hide loading
    loadingOverlay.style.display = 'none';
    
    console.log('✅ Model loaded successfully');
}

function fitModelInView(model) {
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    
    // Center the model
    model.position.sub(center);
    model.position.y += size.y / 2;
    
    // Calculate ideal camera distance
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    let cameraDistance = Math.abs(maxDim / 2 / Math.tan(fov / 2));
    cameraDistance *= 1.5; // Add some padding
    
    // Update camera position
    camera.position.set(cameraDistance, cameraDistance * 0.6, cameraDistance);
    camera.lookAt(0, size.y / 4, 0);
    
    // Update controls target
    controls.target.set(0, size.y / 4, 0);
    controls.update();
}

function disposeObject(obj) {
    obj.traverse((child) => {
        if (child.isMesh) {
            child.geometry.dispose();
            if (Array.isArray(child.material)) {
                child.material.forEach(m => m.dispose());
            } else {
                child.material.dispose();
            }
        }
    });
}

// ===================================
// Model Statistics
// ===================================
function updateModelStats(model, file = null) {
    let vertexCount = 0;
    let triangleCount = 0;
    let meshCount = 0;
    let materialCount = 0;
    const materials = new Set();
    
    model.traverse((child) => {
        if (child.isMesh) {
            meshCount++;
            const geometry = child.geometry;
            
            if (geometry.index) {
                triangleCount += geometry.index.count / 3;
            } else if (geometry.attributes.position) {
                triangleCount += geometry.attributes.position.count / 3;
            }
            
            if (geometry.attributes.position) {
                vertexCount += geometry.attributes.position.count;
            }
            
            if (Array.isArray(child.material)) {
                child.material.forEach(m => materials.add(m.uuid));
            } else {
                materials.add(child.material.uuid);
            }
        }
    });
    
    materialCount = materials.size;
    
    // Get bounding box for dimensions
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    
    // Update DOM
    animateNumber(elements.vertexCount, Math.round(vertexCount));
    animateNumber(elements.triangleCount, Math.round(triangleCount));
    animateNumber(elements.meshCount, meshCount);
    animateNumber(elements.materialCount, materialCount);
    
    // Update dimensions
    const dimContainer = document.querySelector('.dimensions-value');
    if (dimContainer) {
        dimContainer.innerHTML = `
            <span class="dim"><strong>W</strong> ${size.x.toFixed(2)}m</span>
            <span class="dim-separator">×</span>
            <span class="dim"><strong>H</strong> ${size.y.toFixed(2)}m</span>
            <span class="dim-separator">×</span>
            <span class="dim"><strong>D</strong> ${size.z.toFixed(2)}m</span>
        `;
    }
    
    // Update performance metrics
    updatePerformanceMetrics(file, vertexCount, triangleCount);
}

function updatePerformanceMetrics(file, vertexCount, triangleCount) {
    // Calculate performance score
    let score = 100;
    
    // Deduct points based on complexity
    if (triangleCount > 100000) score -= 30;
    else if (triangleCount > 50000) score -= 20;
    else if (triangleCount > 20000) score -= 10;
    
    if (vertexCount > 200000) score -= 20;
    else if (vertexCount > 100000) score -= 10;
    
    score = Math.max(30, Math.min(100, score));
    
    // Update gauge
    const circumference = 264;
    const offset = circumference - (score / 100) * circumference;
    elements.gaugeFill.style.strokeDashoffset = offset;
    
    // Animate score number
    animateNumber(elements.perfScore, score);
    
    // Update status
    elements.perfStatus.className = 'gauge-status';
    elements.gaugeFill.className = 'gauge-fill';
    
    if (score >= 80) {
        elements.perfStatus.classList.add('status-green');
        elements.perfStatus.innerHTML = '<span class="status-dot"></span><span>Good</span>';
        elements.gaugeFill.classList.add('good');
    } else if (score >= 55) {
        elements.perfStatus.classList.add('status-yellow');
        elements.perfStatus.innerHTML = '<span class="status-dot"></span><span>Moderate</span>';
        elements.gaugeFill.classList.add('moderate');
    } else {
        elements.perfStatus.classList.add('status-red');
        elements.perfStatus.innerHTML = '<span class="status-dot"></span><span>Poor</span>';
        elements.gaugeFill.classList.add('poor');
    }
    
    // Update file size if available
    if (file) {
        const fileSizeElement = document.querySelector('.metric-card:nth-child(1) .metric-value');
        if (fileSizeElement) {
            const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
            fileSizeElement.textContent = `${sizeMB} MB`;
        }
    }
    
    // Update triangle count in metrics
    const triMetric = document.querySelector('.metric-card:nth-child(3) .metric-value');
    if (triMetric) {
        triMetric.textContent = Math.round(triangleCount).toLocaleString();
    }
}

// ===================================
// Render Modes
// ===================================
function applyRenderMode(mode) {
    currentRenderMode = mode;
    
    if (!currentModel) return;
    
    currentModel.traverse((child) => {
        if (child.isMesh) {
            const originalMaterial = originalMaterials.get(child.uuid);
            
            switch (mode) {
                case 'pbr':
                    // Restore original material
                    if (originalMaterial) {
                        child.material = originalMaterial.clone();
                    }
                    break;
                    
                case 'wireframe':
                    child.material = new THREE.MeshBasicMaterial({
                        color: 0x00d9ff,
                        wireframe: true
                    });
                    break;
                    
                case 'normals':
                    child.material = new THREE.MeshNormalMaterial();
                    break;
                    
                case 'uv':
                    // UV checker pattern
                    const uvTexture = createUVCheckerTexture();
                    child.material = new THREE.MeshBasicMaterial({
                        map: uvTexture
                    });
                    break;
                    
                case 'unlit':
                    const color = originalMaterial?.color || new THREE.Color(0x888888);
                    child.material = new THREE.MeshBasicMaterial({
                        color: color
                    });
                    break;
            }
        }
    });
}

function createUVCheckerTexture() {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    const gridSize = 16;
    const cellSize = size / gridSize;
    
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            ctx.fillStyle = (i + j) % 2 === 0 ? '#ffffff' : '#333333';
            ctx.fillRect(i * cellSize, j * cellSize, cellSize, cellSize);
        }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
}

// ===================================
// Camera Presets
// ===================================
function setCameraPreset(preset) {
    if (!currentModel) return;
    
    const box = new THREE.Box3().setFromObject(currentModel);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const distance = maxDim * 2;
    
    let position;
    
    switch (preset) {
        case 'front':
            position = new THREE.Vector3(0, center.y, distance);
            break;
        case 'side':
            position = new THREE.Vector3(distance, center.y, 0);
            break;
        case 'top':
            position = new THREE.Vector3(0, distance, 0.001);
            break;
        case 'perspective':
        default:
            position = new THREE.Vector3(distance * 0.7, distance * 0.5, distance * 0.7);
            break;
    }
    
    // Animate camera movement
    const startPos = camera.position.clone();
    const startTarget = controls.target.clone();
    const endTarget = new THREE.Vector3(center.x, center.y, center.z);
    
    let t = 0;
    function animateCamera() {
        t += 0.05;
        if (t >= 1) {
            camera.position.copy(position);
            controls.target.copy(endTarget);
            controls.update();
            return;
        }
        
        camera.position.lerpVectors(startPos, position, t);
        controls.target.lerpVectors(startTarget, endTarget, t);
        controls.update();
        requestAnimationFrame(animateCamera);
    }
    animateCamera();
}

// ===================================
// Lighting Controls
// ===================================
function updateMainLight(intensity, color) {
    if (directionalLight) {
        directionalLight.intensity = intensity * 2; // Scale to reasonable range
        directionalLight.color.set(color);
    }
}

function updateAmbientLight(intensity, color) {
    if (ambientLight) {
        ambientLight.intensity = intensity;
        ambientLight.color.set(color);
    }
}

// ===================================
// DOM Elements & Event Handlers
// ===================================
const elements = {
    // Theme
    themeToggle: document.getElementById('themeToggle'),

    // Upload
    uploadBtn: document.getElementById('uploadBtn'),
    uploadZone: document.getElementById('uploadZone'),
    fileInput: document.getElementById('fileInput'),
    progressContainer: document.getElementById('progressContainer'),
    progressFill: document.getElementById('progressFill'),
    progressPercent: document.getElementById('progressPercent'),

    // Statistics
    vertexCount: document.getElementById('vertexCount'),
    triangleCount: document.getElementById('triangleCount'),
    meshCount: document.getElementById('meshCount'),
    materialCount: document.getElementById('materialCount'),

    // Performance
    gaugeCircle: document.getElementById('gaugeCircle'),
    gaugeFill: document.getElementById('gaugeFill'),
    perfScore: document.getElementById('perfScore'),
    perfStatus: document.getElementById('perfStatus'),

    // Render Modes
    renderModeBtns: document.querySelectorAll('.render-mode-btn'),

    // Lighting
    mainIntensity: document.getElementById('mainIntensity'),
    mainIntensityValue: document.getElementById('mainIntensityValue'),
    mainColor: document.getElementById('mainColor'),
    mainColorValue: document.getElementById('mainColorValue'),
    ambientIntensity: document.getElementById('ambientIntensity'),
    ambientIntensityValue: document.getElementById('ambientIntensityValue'),
    ambientColor: document.getElementById('ambientColor'),
    ambientColorValue: document.getElementById('ambientColorValue'),
    resetMainLight: document.getElementById('resetMainLight'),
    resetAmbientLight: document.getElementById('resetAmbientLight'),

    // Camera
    presetBtns: document.querySelectorAll('.preset-btn'),

    // Viewport
    gridToggle: document.getElementById('gridToggle'),
    axesToggle: document.getElementById('axesToggle')
};

// ===================================
// Theme Toggle
// ===================================
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    elements.themeToggle.checked = savedTheme === 'light';
    updateSceneBackground(savedTheme);
}

function toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const newTheme = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateSceneBackground(newTheme);
}

function updateSceneBackground(theme) {
    if (scene) {
        scene.background = new THREE.Color(theme === 'dark' ? 0x1a1a2e : 0xe5e7eb);
    }
}

elements.themeToggle.addEventListener('change', toggleTheme);

// ===================================
// File Upload
// ===================================
function handleUploadClick() {
    elements.fileInput.click();
}

function handleDragOver(e) {
    e.preventDefault();
    elements.uploadZone.classList.add('dragover');
}

function handleDragLeave() {
    elements.uploadZone.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    elements.uploadZone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length) {
        loadModel(files[0]);
    }
}

function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length) {
        loadModel(files[0]);
    }
}

// Also allow drop on viewport
viewport.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
});

viewport.addEventListener('drop', (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length) {
        loadModel(files[0]);
    }
});

elements.uploadBtn.addEventListener('click', handleUploadClick);
elements.uploadZone.addEventListener('click', handleUploadClick);
elements.uploadZone.addEventListener('dragover', handleDragOver);
elements.uploadZone.addEventListener('dragleave', handleDragLeave);
elements.uploadZone.addEventListener('drop', handleDrop);
elements.fileInput.addEventListener('change', handleFileSelect);

// ===================================
// Render Modes
// ===================================
elements.renderModeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        elements.renderModeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        applyRenderMode(btn.dataset.mode);
    });
});

// ===================================
// Lighting Controls
// ===================================
function updateSliderValue(slider, valueDisplay, suffix = '%') {
    valueDisplay.textContent = slider.value + suffix;
}

function updateColorValue(picker, valueDisplay) {
    valueDisplay.textContent = picker.value.toUpperCase();
}

elements.mainIntensity.addEventListener('input', () => {
    updateSliderValue(elements.mainIntensity, elements.mainIntensityValue);
    updateMainLight(elements.mainIntensity.value / 100, elements.mainColor.value);
});

elements.mainColor.addEventListener('input', () => {
    updateColorValue(elements.mainColor, elements.mainColorValue);
    updateMainLight(elements.mainIntensity.value / 100, elements.mainColor.value);
    document.querySelector('.light-indicator.main').style.background = elements.mainColor.value;
    document.querySelector('.light-indicator.main').style.boxShadow = `0 0 8px ${elements.mainColor.value}`;
});

elements.ambientIntensity.addEventListener('input', () => {
    updateSliderValue(elements.ambientIntensity, elements.ambientIntensityValue);
    updateAmbientLight(elements.ambientIntensity.value / 100, elements.ambientColor.value);
});

elements.ambientColor.addEventListener('input', () => {
    updateColorValue(elements.ambientColor, elements.ambientColorValue);
    updateAmbientLight(elements.ambientIntensity.value / 100, elements.ambientColor.value);
});

elements.resetMainLight.addEventListener('click', () => {
    elements.mainIntensity.value = 75;
    elements.mainColor.value = '#ffffff';
    updateSliderValue(elements.mainIntensity, elements.mainIntensityValue);
    updateColorValue(elements.mainColor, elements.mainColorValue);
    updateMainLight(0.75, '#ffffff');
    document.querySelector('.light-indicator.main').style.background = '#ffffff';
    document.querySelector('.light-indicator.main').style.boxShadow = '0 0 8px #ffffff';
});

elements.resetAmbientLight.addEventListener('click', () => {
    elements.ambientIntensity.value = 40;
    elements.ambientColor.value = '#b4c6e0';
    updateSliderValue(elements.ambientIntensity, elements.ambientIntensityValue);
    updateColorValue(elements.ambientColor, elements.ambientColorValue);
    updateAmbientLight(0.4, '#b4c6e0');
});

// ===================================
// Camera Presets
// ===================================
elements.presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        elements.presetBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        setCameraPreset(btn.dataset.view);
    });
});

// ===================================
// Viewport Controls
// ===================================
elements.gridToggle.addEventListener('change', () => {
    if (gridHelper) {
        gridHelper.visible = elements.gridToggle.checked;
    }
});

elements.axesToggle.addEventListener('change', () => {
    if (axesHelper) {
        axesHelper.visible = elements.axesToggle.checked;
    }
});

// ===================================
// Utility Functions
// ===================================
function animateNumber(element, target) {
    const start = parseInt(element.textContent.replace(/,/g, '')) || 0;
    const duration = 500;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        const current = Math.floor(start + (target - start) * easeOutQuad(progress));
        element.textContent = current.toLocaleString();

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

function easeOutQuad(t) {
    return t * (2 - t);
}

// ===================================
// Keyboard Shortcuts
// ===================================
document.addEventListener('keydown', (e) => {
    // Number keys for render modes
    if (e.key >= '1' && e.key <= '5') {
        const index = parseInt(e.key) - 1;
        const btn = elements.renderModeBtns[index];
        if (btn) btn.click();
    }

    // G for grid toggle
    if (e.key.toLowerCase() === 'g') {
        elements.gridToggle.checked = !elements.gridToggle.checked;
        elements.gridToggle.dispatchEvent(new Event('change'));
    }

    // A for axes toggle
    if (e.key.toLowerCase() === 'a' && !e.ctrlKey && !e.metaKey) {
        elements.axesToggle.checked = !elements.axesToggle.checked;
        elements.axesToggle.dispatchEvent(new Event('change'));
    }

    // T for theme toggle
    if (e.key.toLowerCase() === 't') {
        elements.themeToggle.checked = !elements.themeToggle.checked;
        toggleTheme();
    }

    // Camera presets
    const presetKeys = { 'f': 'front', 's': 'side', 'p': 'top', 'o': 'perspective' };
    if (presetKeys[e.key.toLowerCase()]) {
        elements.presetBtns.forEach(btn => {
            if (btn.dataset.view === presetKeys[e.key.toLowerCase()]) {
                btn.click();
            }
        });
    }
});

// ===================================
// Initialize
// ===================================
function init() {
    initTheme();
    initThreeJS();
    
    // Initialize lights with current values
    updateMainLight(elements.mainIntensity.value / 100, elements.mainColor.value);
    updateAmbientLight(elements.ambientIntensity.value / 100, elements.ambientColor.value);
}

// Run initialization
init();

console.log('🎮 3D Model Viewer Loaded with Three.js');
console.log('⌨️ Keyboard shortcuts: 1-5 (render modes), G (grid), A (axes), T (theme), F/S/P/O (camera presets)');
console.log('📦 Supported formats: .glb, .gltf, .obj, .fbx');
