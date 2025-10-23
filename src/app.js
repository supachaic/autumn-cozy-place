import * as THREE from 'three';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer, HDRLoader, OutputPass, RenderPass, SMAAPass } from 'three/examples/jsm/Addons.js';
import { GLTFLoader } from 'three/examples/jsm/Addons.js';
import { DRACOLoader } from 'three/examples/jsm/Addons.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import GUI from 'lil-gui';

class App {
  #threejs_ = null;
  #camera_ = null;
  #scene_ = null;
  #clock_ = null;
  #controls_ = null;
  #stats_ = null;
  #resolution_ = new THREE.Vector2(window.innerWidth, window.innerHeight);
  #dpr_ = Math.min(window.devicePixelRatio, 2);

  #gltfLoader_ = null;
  #composer_ = null;
  #debugUI_ = null;

  constructor() {
  }

  async initialize() {
    this.#clock_ = new THREE.Clock(true);

    window.addEventListener('resize', () => {
      this.#onWindowResize_();
    }, false);

    await this.#setupProject_();

    this.#onWindowResize_();
    this.#raf_();

    // add stats
    this.#stats_ = new Stats();
    document.body.appendChild(this.#stats_.dom);
    this.#stats_.showPanel(0);
    this.#stats_.dom.style.position = 'absolute';
  }

  async #setupProject_() {
    await this.#setupRenderer_();
    await this.#setupLoaders_();

    // Initialize post fx
    const postFXFolder = this.#debugUI_.addFolder('PostFX');

    await this.#setupPostprocessing_(postFXFolder);

    // Initialize project
    const projectFolder = this.#debugUI_.addFolder('Project');

    await this.onSetupProject(projectFolder);
  }

  async #setupLoaders_() {
    this.#gltfLoader_ = new GLTFLoader();

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('./libs/draco/');
    this.#gltfLoader_.setDRACOLoader(dracoLoader);
  }

  async #setupRenderer_() {
    this.#threejs_ = new THREE.WebGLRenderer( { antialias: true } );
    this.#threejs_.shadowMap.enabled = true;
    this.#threejs_.shadowMap.type = THREE.PCFSoftShadowMap;
    this.#threejs_.toneMapping = THREE.ACESFilmicToneMapping;
    this.#threejs_.toneMappingExposure = 1.0;
    this.#threejs_.setSize(window.innerWidth, window.innerHeight);
    this.#threejs_.setPixelRatio(this.#dpr_);
    document.body.appendChild(this.#threejs_.domElement);

    this.#debugUI_ = new GUI();

    const fov = 45;
    const aspect = window.innerWidth / window.innerHeight;
    const near = 0.1;
    const far = 1000;
    this.#camera_ = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this.#camera_.position.set(16.5, 1.5, 4);
    this.#camera_.lookAt(new THREE.Vector3(0, 2, 0));

    this.#debugUI_.add(this.#camera_.position, 'x', -100, 100, 0.1).name('Camera X');
    this.#debugUI_.add(this.#camera_.position, 'y', -100, 100, 0.1).name('Camera Y');
    this.#debugUI_.add(this.#camera_.position, 'z', -100, 100, 0.1).name('Camera Z');
    this.#debugUI_.add(this.#camera_, 'fov', 1, 180, 1).name('Camera FOV').onChange(() => {
      this.#camera_.updateProjectionMatrix();
    });


    this.#controls_ = new OrbitControls(this.#camera_, this.#threejs_.domElement);
    this.#controls_.enableDamping = true;
    this.#controls_.target.set(0, 0, 0);
    this.#controls_.update();

    this.#scene_ = new THREE.Scene();
    this.#scene_.background = new THREE.Color(0x000000);

    // Scene tweaks
    this.#scene_.backgroundIntensity = 1.5;
    this.#scene_.environmentIntensity = 1.0;
    this.#debugUI_.add(this.#scene_, 'backgroundIntensity', 0.0, 5.0, 0.1).name('BG Intensity');
    this.#debugUI_.add(this.#scene_, 'environmentIntensity', 0.0, 5.0, 0.1).name('Env Intensity');
  }

  createComposer() {
    return new EffectComposer(this.#threejs_);
  }

  createMainRenderPass() {
    return new RenderPass(this.#scene_, this.#camera_);
  }

  async #setupPostprocessing_(pane) {
    this.#composer_ = this.createComposer();
    const renderPass = this.createMainRenderPass();
    const outputPass = new OutputPass();

    const smaaPass = new SMAAPass(window.innerWidth, window.innerHeight);
    smaaPass.enabled = true;
    pane.add(smaaPass, 'enabled').name('SMAA');

    this.#composer_.addPass(renderPass);
    this.#composer_.addPass(outputPass);
    this.#composer_.addPass(smaaPass);
  }

  #onWindowResize_() {
    this.#dpr_ = Math.min(window.devicePixelRatio, 2);
    const canvas = this.#threejs_.domElement;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    const aspect = w / h;

    this.#threejs_.setSize(w * this.#dpr_, h * this.#dpr_, false);
    this.#threejs_.setPixelRatio(this.#dpr_);
    this.#camera_.aspect = aspect;
    this.#camera_.updateProjectionMatrix();
    this.#composer_.setSize(w * this.#dpr_, h * this.#dpr_);
    this.#resolution_.set(w * this.#dpr_, h * this.#dpr_);
  }

  #raf_() {
    requestAnimationFrame((t) => {
      this.#step_(this.#clock_.getDelta());
      this.#render_();
      this.#raf_();
      this.#stats_.update();
    });
  }

  #render_() {
    this.#composer_.render();
    this.onRender();
  }

  #step_(timeElapsed) {
    this.#controls_.update(timeElapsed);
    this.onStep(timeElapsed, this.#clock_.getElapsedTime());
  }

  addToScene(object) {
    this.#scene_.add(object);
  }

  async loadTexture(path, srgb=true) {
    return new Promise((resolve, reject) => {
      const loader = new THREE.TextureLoader();
      loader.load(path, (texture) => {
        if (srgb) {
          texture.colorSpace = THREE.SRGBColorSpace;
        }
        resolve(texture);
      });
    });  
  }

  async loadHDR(path) {
    const hdrLoader = new HDRLoader();

    return new Promise((resolve, reject) => {
      hdrLoader.load(path , (hdrTexture) => {
        hdrTexture.mapping = THREE.EquirectangularReflectionMapping;

        this.#scene_.background = hdrTexture;
        this.#scene_.environment = hdrTexture;

        resolve();
      });
    });
  }

  async loadGLTF(path) {
    return new Promise((resolve, reject) => {
      this.#gltfLoader_.load(path, (gltf) => {
        resolve(gltf.scene);
      });
    });
  }

  async loadGLTFFile(path) {
    return new Promise((resolve, reject) => {
      this.#gltfLoader_.load(path, (gltf) => {
        resolve(gltf);
      });
    });
  }

  async loadCubeTexture(paths, srgb=true) {
    return new Promise((resolve, reject) => {
      const loader = new THREE.CubeTextureLoader();
      loader.load(paths, (cubeTexture) => {
        if (srgb) {
          cubeTexture.colorSpace = THREE.SRGBColorSpace;
        }
        resolve(cubeTexture);
      });
    });
  }

  // Override these methods
  async onSetupProject() {
  }

  onRender() {
  }

  onStep(timeElapsed, totalTimeElapsed) {
  }

  onResize() {
  }

  // Getters
  get Scene() { return this.#scene_; }
  get Camera() { return this.#camera_; }
  get Renderer() { return this.#threejs_; }
  get Resolution() { return this.#resolution_; }
}

export { App };