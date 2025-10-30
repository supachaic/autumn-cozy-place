import * as THREE from 'three';

import { EffectComposer, HDRLoader, OutputPass, RenderPass, SMAAPass, PointerLockControls, OrbitControls } from 'three/examples/jsm/Addons.js';
import { GLTFLoader } from 'three/examples/jsm/Addons.js';
import { DRACOLoader } from 'three/examples/jsm/Addons.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import GUI from 'lil-gui';
import gsap from 'gsap';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';
import { lookAt } from './utils/cameraLookAt';

class App {
  #enableDebug_ = false;
  #skipLoading_ = false;

  #threejs_ = null;
  #camera_ = null;
  #scene_ = null;
  #clock_ = null;
  #controls_ = null;
  #stats_ = null;
  #resolution_ = new THREE.Vector2(window.innerWidth, window.innerHeight);
  #dpr_ = Math.min(window.devicePixelRatio, 2);

  #loadingManager_ = null;
  #gltfLoader_ = null;
  #composer_ = null;
  #debugUI_ = null;
  #tl_ = null;

  #cameraStart_ = new THREE.Vector3(13.0, 1.5, 13.0);
  // #cameraStartLookAt_ = new THREE.Vector3(13.0, 1.5, 13.0);
  #cameraLookTarget_ = new THREE.Vector3(0, 2, 0);
  #controlsMethod_ = null; // 'orbit' or 'pointer-lock'

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
    if (this.#enableDebug_) {
      this.#stats_ = new Stats();
      document.body.appendChild(this.#stats_.dom);
      this.#stats_.showPanel(0);
      this.#stats_.dom.style.position = 'absolute';
    }
  }

  async #setupProject_() {
    await this.#setupRenderer_();
    await this.#setupLoadingScene_();
    await this.#setupLoaders_();

    // Initialize post fx
    const postFXFolder = this.#debugUI_.addFolder('PostFX');

    await this.#setupPostprocessing_(postFXFolder);

    // Initialize project
    const projectFolder = this.#debugUI_.addFolder('Project');

    await this.onSetupProject(projectFolder);
  }

  async #setupLoadingScene_() {
    gsap.registerPlugin(MorphSVGPlugin);
    this.#tl_ = gsap.timeline();

    if (this.#skipLoading_) {
      this.#tl_.to('#cover-container', { autoAlpha: 0, duration: 0.1, display: 'none', ease: 'power1.out', onComplete: () => {
        document.getElementById('cover-container').dispatchEvent(new CustomEvent('asset-loaded', { detail: { via: 'gsap' } }) );
      }});
      return;
    }

    this.#tl_
      .to('#cover-container', { autoAlpha: 1, duration: 0.1, display: 'flex', ease: 'power1.out' })
      .fromTo('#autumn-panel', { scale: 0.2, opacity: 0.5 }, { scale: 1.0, opacity: 1, duration: 1.5, ease: 'power2.out' }, '<')
      .to('#coffee-pot', { autoAlpha: 1, duration: 1.5, display: 'block', ease: "power3.out" })
      .to('#Brewing', { autoAlpha: 1, duration: 1.0, display: 'block', ease: "power1.out" }, '<')
      .set('#progress-0', { autoAlpha: 1, display: 'block'})
      .to('#progress-0', { morphSVG: '#progress-10', duration: 1.0, ease: "elastic.out(1,0.75)"} )
      .to('#progress-0', { morphSVG: '#progress-50', duration: 1.0, ease: "elastic.out(1,0.75)" })
      .to('#progress-0', { morphSVG: '#progress-80', duration: 1.0, ease: "elastic.out(1,0.75)" });

  }

  async #setupLoaders_() {
    this.#loadingManager_ = new THREE.LoadingManager(
      () => {
      },
      (itemUrl, itemsLoaded, itemsTotal) => {
        const progress = (itemsLoaded / itemsTotal * 100);

        if (progress >= 50) {
          this.#tl_
            .to('#progress-0', { morphSVG: '#progress-100', duration: 1.5, ease: "elastic.out(1,0.75)" });
        }

        if (progress >= 100) {
          // Show enter button
          this.#tl_
            .to('#Brewing', { autoAlpha: 1, duration: 0.1, display: 'block', ease: "power1.out", onComplete: () => {
              document.getElementById('cover-container').dispatchEvent(new CustomEvent('asset-loaded', { detail: { via: 'gsap' } }) );
            }})
        }
      },
      (url) => {
        console.error(`There was an error loading ${url}`);
      }
    );
    this.#gltfLoader_ = new GLTFLoader(this.#loadingManager_);

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
    if (!this.#enableDebug_) {
      this.#debugUI_.hide();
    }

    // Setup camera
    const fov = 45;
    const aspect = window.innerWidth / window.innerHeight;
    const near = 0.1;
    const far = 1000;
    this.#camera_ = new THREE.PerspectiveCamera(fov, aspect, near, far);
    // this.#camera_.position.set(11.5, 1.5, 4);
    this.#camera_.position.copy(this.#cameraStart_);
    this.#camera_.lookAt(this.#cameraLookTarget_);
    this.#camera_.updateMatrixWorld();

    // this.#debugUI_.add(this.#camera_.position, 'x', -100, 100, 0.01).name('Camera X');
    // this.#debugUI_.add(this.#camera_.position, 'y', -100, 100, 0.01).name('Camera Y');
    // this.#debugUI_.add(this.#camera_.position, 'z', -100, 100, 0.01).name('Camera Z');
    // this.#debugUI_.add(this.#camera_, 'fov', 1, 180, 1).name('Camera FOV').onChange(() => {
    //   this.#camera_.updateProjectionMatrix();
    // });
    // this.#debugUI_.add(this.#camera_.quaternion, 'x', -1, 1, 0.01).name('Camera QX');
    // this.#debugUI_.add(this.#camera_.quaternion, 'y', -1, 1, 0.01).name('Camera QY');
    // this.#debugUI_.add(this.#camera_.quaternion, 'z', -1, 1, 0.01).name('Camera QZ');
    // this.#debugUI_.add(this.#camera_.quaternion, 'w', -1, 1, 0.01).name('Camera QW');

    // Setup controls
    this.switchControlsMethod( 'pointer-lock' );

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
      if (this.#stats_) {
        this.#stats_.update();
      }
    });
  }

  #render_() {
    this.#composer_.render();
    this.onRender();
  }

  #step_(timeElapsed) {
    this.#controls_?.update(timeElapsed);
    this.onStep(timeElapsed, this.#clock_.getElapsedTime());
  }

  cameraLookAt(target) {
    if (this.#controls_.isLocked) {
      this.#controls_.unlock();
    }

    const tween = lookAt(this.#camera_, target, 'none');
    return tween;
  }

  addToScene(object) {
    this.#scene_.add(object);
  }

  switchControlsMethod(method) {
    if (this.#controlsMethod_ === method) {
      return;
    }

    if (this.#controls_) {
      this.#controls_.dispose();
    } 

    this.#controlsMethod_ = method;

    // Setup controls
    if (method === 'orbit') {
      this.#controls_ = new OrbitControls(this.#camera_, this.#threejs_.domElement);
      this.#controls_.target.copy(this.#cameraLookTarget_);
      this.#controls_.enableDamping = true;
      this.#controls_.dampingFactor = 0.05;
      this.#controls_.enablePan = true;
      this.#controls_.minDistance = 2;
      this.#controls_.maxDistance = 50;
      this.#controls_.maxPolarAngle = Math.PI / 2 + 0.1; // prevent going below ground
    } else if (method === 'pointer-lock') {
      this.#controls_ = new PointerLockControls(this.#camera_, this.#threejs_.domElement);
      this.#controls_.addEventListener('lock', () => {
        this.#tl_
          .to('#menu-bar', { autoAlpha: 0, duration: 0.5, ease: 'power1.out' })
          .set('#bottom-message-text', { innerText: 'Move your mouse to look around or click to exit.' })
          .fromTo('#bottom-message', {y: "10%", autoAlpha: 0, display: 'none'}, { y: "0%", autoAlpha: 1.0, duration: 0.5, pointerEvents: 'none', display: 'flex', ease: 'power2.inOut' }, '<')
          .to('#bottom-message', { autoAlpha: 0, duration: 0.5, display: 'none', ease: 'power2.inOut', delay: 3.0 });
      });
      this.#controls_.addEventListener('unlock', () => {
        this.#tl_
          .to('#menu-bar', { autoAlpha: 1, duration: 0.5, ease: 'power1.out', delay: 1.0 })
          

      });
    }
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
  get Controls() { return this.#controls_; }
  get Renderer() { return this.#threejs_; }
  get Resolution() { return this.#resolution_; }
  get Timeline() { return this.#tl_; }
  get CameraLookTarget() { return this.#cameraLookTarget_; }
  get ControlsMethod() { return this.#controlsMethod_;  }
}

export { App };