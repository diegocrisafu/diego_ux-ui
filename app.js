/**
 * 3D Model Viewer - Interactive UI
 * JavaScript for handling all user interactions
 */

// ===================================
// DOM Elements
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
    axesToggle: document.getElementById('axesToggle'),
    gridHelper: document.getElementById('gridHelper'),
    axesHelper: document.getElementById('axesHelper'),
    cube: document.querySelector('.cube')
};

// ===================================
// Theme Toggle
// ===================================
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    elements.themeToggle.checked = savedTheme === 'light';
}

function toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const newTheme = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

elements.themeToggle.addEventListener('change', toggleTheme);

// ===================================
// File Upload with Progress Simulation
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
        simulateUpload(files[0]);
    }
}

function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length) {
        simulateUpload(files[0]);
    }
}

function simulateUpload(file) {
    // Show progress container
    elements.progressContainer.classList.add('active');
    elements.progressFill.style.width = '0%';
    elements.progressPercent.textContent = '0%';

    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress >= 100) {
            progress = 100;
            clearInterval(interval);

            // Update stats with random values based on "uploaded" file
            setTimeout(() => {
                updateModelStats();
                updatePerformanceScore();
                elements.progressContainer.classList.remove('active');
            }, 500);
        }

        elements.progressFill.style.width = `${progress}%`;
        elements.progressPercent.textContent = `${Math.round(progress)}%`;
    }, 100);
}

function updateModelStats() {
    // Simulate different model stats
    const stats = {
        vertices: Math.floor(Math.random() * 50000) + 5000,
        triangles: Math.floor(Math.random() * 30000) + 3000,
        meshes: Math.floor(Math.random() * 20) + 1,
        materials: Math.floor(Math.random() * 15) + 1
    };

    animateNumber(elements.vertexCount, stats.vertices);
    animateNumber(elements.triangleCount, stats.triangles);
    animateNumber(elements.meshCount, stats.meshes);
    animateNumber(elements.materialCount, stats.materials);
}

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

function updatePerformanceScore() {
    const score = Math.floor(Math.random() * 50) + 50; // 50-100
    const circumference = 264; // 2 * PI * 42
    const offset = circumference - (score / 100) * circumference;

    elements.gaugeFill.style.strokeDashoffset = offset;

    // Animate score number
    let currentScore = 0;
    const interval = setInterval(() => {
        currentScore += 2;
        if (currentScore >= score) {
            currentScore = score;
            clearInterval(interval);
        }
        elements.perfScore.textContent = currentScore;
    }, 20);

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
}

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
        // Remove active from all
        elements.renderModeBtns.forEach(b => b.classList.remove('active'));
        // Add active to clicked
        btn.classList.add('active');

        // Apply visual changes to cube based on mode
        const mode = btn.dataset.mode;
        updateCubeRenderMode(mode);
    });
});

function updateCubeRenderMode(mode) {
    const cubeFaces = document.querySelectorAll('.cube-face');

    cubeFaces.forEach(face => {
        // Reset styles
        face.style.background = '';
        face.style.borderStyle = '';
        face.style.borderWidth = '';

        switch (mode) {
            case 'pbr':
                face.style.background = 'linear-gradient(135deg, rgba(0, 217, 255, 0.15), rgba(14, 165, 233, 0.08))';
                face.style.borderWidth = '2px';
                break;
            case 'wireframe':
                face.style.background = 'transparent';
                face.style.borderStyle = 'dashed';
                face.style.borderWidth = '1px';
                break;
            case 'normals':
                face.style.background = 'linear-gradient(135deg, #ef4444 0%, #10b981 50%, #3b82f6 100%)';
                face.style.opacity = '0.7';
                break;
            case 'uv':
                face.style.background = `
                    repeating-conic-gradient(
                        #f0f0f0 0% 25%,
                        #333333 0% 50%
                    )
                `;
                face.style.backgroundSize = '20px 20px';
                break;
            case 'unlit':
                face.style.background = 'rgba(150, 150, 150, 0.3)';
                break;
        }
    });
}

// ===================================
// Lighting Controls
// ===================================
function updateSliderValue(slider, valueDisplay, suffix = '%') {
    valueDisplay.textContent = slider.value + suffix;
}

function updateColorValue(picker, valueDisplay) {
    valueDisplay.textContent = picker.value.toUpperCase();
}

// Main Light
elements.mainIntensity.addEventListener('input', () => {
    updateSliderValue(elements.mainIntensity, elements.mainIntensityValue);
    updateLighting();
});

elements.mainColor.addEventListener('input', () => {
    updateColorValue(elements.mainColor, elements.mainColorValue);
    updateLighting();
});

// Ambient Light
elements.ambientIntensity.addEventListener('input', () => {
    updateSliderValue(elements.ambientIntensity, elements.ambientIntensityValue);
    updateLighting();
});

elements.ambientColor.addEventListener('input', () => {
    updateColorValue(elements.ambientColor, elements.ambientColorValue);
    updateLighting();
});

// Reset Buttons
elements.resetMainLight.addEventListener('click', () => {
    elements.mainIntensity.value = 75;
    elements.mainColor.value = '#ffffff';
    updateSliderValue(elements.mainIntensity, elements.mainIntensityValue);
    updateColorValue(elements.mainColor, elements.mainColorValue);
    updateLighting();
});

elements.resetAmbientLight.addEventListener('click', () => {
    elements.ambientIntensity.value = 40;
    elements.ambientColor.value = '#b4c6e0';
    updateSliderValue(elements.ambientIntensity, elements.ambientIntensityValue);
    updateColorValue(elements.ambientColor, elements.ambientColorValue);
    updateLighting();
});

function updateLighting() {
    // This would update actual 3D lighting in a real implementation
    // For the mockup, we'll adjust the cube appearance
    const mainIntensity = elements.mainIntensity.value / 100;
    const mainColor = elements.mainColor.value;
    const ambientIntensity = elements.ambientIntensity.value / 100;

    const cubeFaces = document.querySelectorAll('.cube-face');
    cubeFaces.forEach(face => {
        const brightness = 0.3 + (mainIntensity * 0.5) + (ambientIntensity * 0.2);
        face.style.filter = `brightness(${brightness})`;
    });

    // Update light indicators
    document.querySelector('.light-indicator.main').style.background = mainColor;
    document.querySelector('.light-indicator.main').style.boxShadow = `0 0 8px ${mainColor}`;
}

// ===================================
// Camera Presets
// ===================================
elements.presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active from all
        elements.presetBtns.forEach(b => b.classList.remove('active'));
        // Add active to clicked
        btn.classList.add('active');

        // Apply camera rotation to cube
        const view = btn.dataset.view;
        applyCameraPreset(view);
    });
});

function applyCameraPreset(view) {
    // Stop the animation temporarily
    elements.cube.style.animation = 'none';

    const rotations = {
        front: 'rotateX(0deg) rotateY(0deg)',
        side: 'rotateX(0deg) rotateY(90deg)',
        top: 'rotateX(90deg) rotateY(0deg)',
        perspective: 'rotateX(-20deg) rotateY(-45deg)'
    };

    elements.cube.style.transform = rotations[view] || rotations.perspective;

    // Resume animation after a delay for perspective view
    if (view === 'perspective') {
        setTimeout(() => {
            elements.cube.style.animation = '';
        }, 100);
    }
}

// ===================================
// Viewport Controls
// ===================================
elements.gridToggle.addEventListener('change', () => {
    elements.gridHelper.classList.toggle('hidden', !elements.gridToggle.checked);
});

elements.axesToggle.addEventListener('change', () => {
    elements.axesHelper.classList.toggle('hidden', !elements.axesToggle.checked);
});

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

    // F/S/P/O for camera presets (Front, Side, Top=P, 3/4=O)
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
    updatePerformanceScore();
}

// Run initialization
init();

// Add some visual polish - subtle parallax on viewport
const viewport = document.querySelector('.viewport');
viewport.addEventListener('mousemove', (e) => {
    const rect = viewport.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;

    const cube = elements.cube;
    if (cube.style.animation === 'none') return; // Don't override preset views

    cube.style.transform = `rotateX(${-20 + y * 10}deg) rotateY(${x * 20}deg)`;
});

viewport.addEventListener('mouseleave', () => {
    if (elements.cube.style.animation !== 'none') {
        elements.cube.style.transform = '';
    }
});

console.log('🎮 3D Model Viewer UI Loaded');
console.log('⌨️ Keyboard shortcuts: 1-5 (render modes), G (grid), A (axes), T (theme), F/S/P/O (camera presets)');
