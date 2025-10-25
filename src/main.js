import * as THREE from 'three';
import CustomShaderMaterial from 'three-custom-shader-material/vanilla';
import { Howl } from 'howler';

import { App } from './app';
import multiplyQuaternions from './utils/MultiplyQuaternion';
import GrassBladeVertexShader from './shaders/grassBlade/vertex.glsl';
import GrassBladeFragmentShader from './shaders/grassBlade/fragment.glsl';
import FoliageQuadVS from './shaders/foliageQuad/vertex.glsl';
import FoliageQuadFS from './shaders/foliageQuad/fragment.glsl';
import GroundVertexShader from './shaders/ground/vertex.glsl';
import GroundFragmentShader from './shaders/ground/fragment.glsl';
import LeavesVertexShader from './shaders/leaves/vertex.glsl';
import LeavesFragmentShader from './shaders/leaves/fragment.glsl';
import WaterVertexShader from './shaders/water/vertex.glsl';
import WaterFragmentShader from './shaders/water/fragment.glsl';
import { getImageData } from './utils/image-helper';

class GrassProject extends App {
  #uiButtonIds_ = [
    'btn-enter',
    'btn-maple-green',
    'btn-maple-yellow',
    'btn-maple-red',
    'btn-coffee',
    'btn-bench',
    'btn-pond',
    'btn-music',
    'btn-info',
    'btn-close-info',
  ];
  #enableAnimation_ = true;
  #sound_ = null;
  #soundMuted_ = false;

  #playlist_ = {
    green: './resources/audio/chill-lofi-music-409356.mp3',
    yellow: './resources/audio/lofi-boy-serene-strings-lofi-instrumental-278238.mp3',
    red: './resources/audio/wave-of-you-relaxing-lofi-305565.mp3',
  }

  #grassBladeGeometry_ = null;
  #grassMaterial_ = null;
  #groundWidth_ = 30;
  #noiseGrassHeightTexture_ = null;
  #groundRepeat_ = 2;
  #grassHeightData_ = null;
  #groundUV_ = new THREE.Vector2();

  #groundHeightData_ = null;
  #groundHeightDataWidth_ = 0;
  #groundHeightDataHeight_ = 0;
  #noiseGroundHeightTexture_ = null;

  #grassColorParams_ = {
    greenTipColor: '#b8df2a',
    greenBaseColor: '#43731c',
    yellowTipColor: '#d4e029',
    yellowBaseColor: '#43731c',
    redTipColor: '#dcdf2a',
    redBaseColor: '#54731c',
  }

  #waterParams_ = {
    color: '#0abae6',
    opacity: 0.7,
    speed: 0.3,
    repeat: 10.0,
    foam: 0.4,
    foamTop: 0.7
  }
  #waterMaterial_ = null;

  #terrainParams_ = {
    grassColor1: '#b8df2a',
    grassColor2: '#43731c',
    groundColor1: '#df8f43',
    groundColor2: '#965b17',
  }

  #foliageMaterial_ = null;
  #foliageUniforms_ = null;

  #leafColor_ = 'yellow'; // green, yellow, red
  #leafTexture_ = null;
  #leafMaterial_ = null;
  #leafMesh_ = null;
  #leafUniforms_ = null;
  #leafParams_ = {
    center: new THREE.Vector3(-12, 0, 0),
    count: 20,
    areaSize: 10,
    maxHeight: 4,
    fallSpeed: 0.1,
    windStrength: 0.5,
    spinSpeed: 0.5,
    windDirection: new THREE.Vector3(1, 0, 0.75).normalize(),

    // leaf colors
    // leafGreenLight: '#33FF33',
    // leafGreenDark: '#006600',
    leafGreenLight: '#b8df2a',
    leafGreenDark: '#43731c',
    leafYellowLight: '#FFE300',
    leafYellowDark: '#FF5B00',
    leafRedLight: '#FF5C33',
    leafRedDark: '#761800',
  };

  constructor() {
    super();
  }

  async onSetupProject(gui) {
    await this.#setupEnvironment(gui);
    await this.#loadTexture_();

    await this.#sceneModel_(gui);

    await this.#ground_(gui);
    await this.#grassBlades_(gui);
    await this.#fallenLeaves_(gui);
    await this.#pond_(gui);

    await this.#initSound_();
  }

  async #initSound_() {
    this.#sound_ = new Howl({
      src: [this.#playlist_[this.#leafColor_]],
      autoplay: false,
      loop: true,
      volume: 0,
      muted: this.#soundMuted_,
    });
  }

  async #setupEnvironment(gui) {
    await this.loadHDR('./resources/sky/kloofendal_48d_partly_cloudy_puresky_2k.hdr');
    const skybox = new THREE.CubeTextureLoader()
      .setPath('/resources/sky/sky_44_cubemap_2k_rotated/')
      .load([
      'px.png',
      'nx.png',
      'py.png',
      'ny.png',
      'pz.png',
      'nz.png',
    ])
    this.Scene.background = skybox;

    // add sun light
    const sunLight = new THREE.DirectionalLight(0xffffff, 3);
    sunLight.position.set(5, 10, 5);
    sunLight.castShadow = true;
    sunLight.shadow.radius = 3;
    sunLight.shadow.mapSize.width = 512;
    sunLight.shadow.mapSize.height = 512;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 100;
    sunLight.shadow.camera.left = -30;
    sunLight.shadow.camera.right = 30;
    sunLight.shadow.camera.top = 30;
    sunLight.shadow.camera.bottom = -30;
    sunLight.shadow.bias = -0.01;
    this.Scene.add(sunLight);
  }

  async #loadTexture_() {
    this.#noiseGrassHeightTexture_ = await this.loadTexture('/resources/textures/noise-grass-height3.png');
    this.#noiseGrassHeightTexture_.wrapS = this.#noiseGrassHeightTexture_.wrapT = THREE.RepeatWrapping;
    this.#noiseGrassHeightTexture_.colorSpace = THREE.SRGBColorSpace;
    this.#noiseGrassHeightTexture_.flipY = false; // grass height texture is not flipped
    this.#prepareGrassHeightData_();

    this.#noiseGroundHeightTexture_ = await this.loadTexture('/resources/textures/noise-ground-height.png');
    this.#noiseGroundHeightTexture_.wrapS = this.#noiseGroundHeightTexture_.wrapT = THREE.RepeatWrapping;
    this.#noiseGroundHeightTexture_.colorSpace = THREE.SRGBColorSpace;
    this.#noiseGroundHeightTexture_.flipY = true; // ground noise texture is flipped
    this.#prepareGroundHeightData_();

    this.#leafTexture_ = await this.loadTexture('/resources/textures/leaf.png');
    this.#leafTexture_.encoding = THREE.sRGBEncoding;
    this.#leafTexture_.anisotropy = this.Renderer.capabilities.getMaxAnisotropy();
    this.#leafTexture_.flipY = false;
  }

  async #sceneModel_(gui) {
    const gltf = await this.loadGLTFFile('/models/cozy-scene2.glb');
    console.log(gltf);

    gltf.scene.traverse((child) => {
      if (child.isMesh) {
        if (child.name === 'foliage' || child.name === 'grass-blade') {
          child.visible = false;
          return;
        }

        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    this.Scene.add(gltf.scene);

    const foliages = gltf.scene.getObjectByName('foliage');
    const foliageInstanced = await this.#createFoliageInstanced_(foliages, 0.34);
    this.Scene.add(foliageInstanced);

    this.#grassBladeGeometry_ = gltf.scene.getObjectByName('grass-blade').geometry;
  }

  async #createFoliageInstanced_(model, density) {
    const geometry = model.geometry;
    const texture = await this.loadTexture('/resources/textures/momiji.png');
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.flipY = true;

    // randomly remove some vertices based on density
    const maxCount = geometry.attributes.position.count;
    const removeCount = Math.floor(maxCount * (1 - density));
    const indicesToRemove = new Set();
    while (indicesToRemove.size < removeCount) indicesToRemove.add((Math.random() * maxCount) | 0);

    const posArr = geometry.attributes.position.array;
    const norArr = geometry.attributes.normal.array;

    const offsets = [];
    const norms = [];
    const phases = [];
    const scales = [];

    for (let i = 0; i < maxCount; i++) {
      if (indicesToRemove.has(i)) continue;
      const ix = i * 3;
      offsets.push(posArr[ix], posArr[ix + 1], posArr[ix + 2]);
      norms.push(norArr[ix], norArr[ix + 1], norArr[ix + 2]);
      phases.push(Math.random() * Math.PI * 2);
      scales.push(0.85 + Math.random() * 0.4);
    }

    const count = offsets.length / 3;

    const card = new THREE.PlaneGeometry(1, 1, 1, 1);

    // instanced attributes
    const aOffset = new THREE.InstancedBufferAttribute(new Float32Array(offsets), 3);
    const aNormal = new THREE.InstancedBufferAttribute(new Float32Array(norms), 3);
    const aPhase  = new THREE.InstancedBufferAttribute(new Float32Array(phases), 1);
    const aScale  = new THREE.InstancedBufferAttribute(new Float32Array(scales), 1);

    card.setAttribute('aOffset', aOffset);
    card.setAttribute('aNormal', aNormal);
    card.setAttribute('aPhase',  aPhase);
    card.setAttribute('aScale',  aScale);

    // shared uniforms
    this.#foliageUniforms_ = {
      uModelPosition: { value: model.position },
      uTime:         { value: 0 },
      uTexture:      { value: texture },
      uLeafColor:  { value: new THREE.Color(this.#leafParams_.leafYellowLight) },
      uDarkColor:  { value: new THREE.Color(this.#leafParams_.leafYellowDark) },
      uLeafSize:     { value: 0.8 },        // world size of the card (meters)
      uWindDir:      { value: new THREE.Vector2(1, 0).normalize() },
      uWindStrength: { value: 0.5 },
      uBendStrength: { value: 0.1 },
      uFlutterAmp:   { value: 0.015 },
      uFlutterFreq:  { value: 1.0 },
      uPhaseGlobal:  { value: Math.random() * 100.0 }, // mesh-level phase
    };

    // main material (cutout, no blending)
    this.#foliageMaterial_ = new THREE.ShaderMaterial({
      uniforms: this.#foliageUniforms_,
      vertexShader: FoliageQuadVS,
      fragmentShader: FoliageQuadFS,
      transparent: false,
      alphaTest: 0.5,
      depthTest: true,
      depthWrite: true,
      side: THREE.DoubleSide,
    });
    // WebGL2 + MSAA only; helps on cutout edges
    this.#foliageMaterial_.alphaToCoverage = true;

    // depth material with same deformation + alpha discard
    const depthMat = new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking,
      alphaTest: 0.5,
      side: THREE.DoubleSide,
    });
    depthMat.onBeforeCompile = (shader) => {
      // pass uniforms and attributes to depth shader
      shader.uniforms.uTime         = this.#foliageUniforms_.uTime;
      shader.uniforms.uTexture      = this.#foliageUniforms_.uTexture;
      shader.uniforms.uLeafSize     = this.#foliageUniforms_.uLeafSize;
      shader.uniforms.uWindDir      = this.#foliageUniforms_.uWindDir;
      shader.uniforms.uWindStrength = this.#foliageUniforms_.uWindStrength;
      shader.uniforms.uBendStrength = this.#foliageUniforms_.uBendStrength;
      shader.uniforms.uFlutterAmp   = this.#foliageUniforms_.uFlutterAmp;
      shader.uniforms.uFlutterFreq  = this.#foliageUniforms_.uFlutterFreq;
      shader.uniforms.uPhaseGlobal  = this.#foliageUniforms_.uPhaseGlobal;

      // inject varyings & attributes
      shader.vertexShader = `
        attribute vec3 aOffset;
        attribute vec3 aNormal;
        attribute float aPhase;
        attribute float aScale;

        uniform float uTime;
        uniform vec2  uWindDir;
        uniform float uWindStrength, uBendStrength, uFlutterAmp, uFlutterFreq, uPhaseGlobal;
        uniform float uLeafSize;

        varying vec2 vUvDepth;

        vec3 yBillboard(vec2 quad, mat4 viewMatrix, float size, float s){
          vec3 camRight = normalize(vec3(viewMatrix[0].x, 0.0, viewMatrix[0].z));
          vec3 camUp    = vec3(0.0, 1.0, 0.0);
          return camRight * (quad.x * size * s) + camUp * (quad.y * size * s);
        }

        vec3 billboard(vec2 quad, mat4 viewMatrix, float size, float s){
          vec3 cameraRight = vec3(viewMatrix[0].x, viewMatrix[1].x, viewMatrix[2].x);
          vec3 cameraUp    = vec3(viewMatrix[0].y, viewMatrix[1].y, viewMatrix[2].y);
          return cameraRight * (quad.x * size * s) + cameraUp * (quad.y * size * s);
        }
      ` + shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        // original: vec3 transformed = vec3( position );
        vec2 quad = position.xy;               // -0.5..0.5 from PlaneGeometry
        float h = clamp(aOffset.y / 3.0, 0.0, 1.0);
        float bend = pow(h, 1.5) * uBendStrength;

        vec3 wdir = normalize(vec3(uWindDir.x, 0.0, uWindDir.y));
        float sway    = sin(uTime * 0.9 + aPhase + uPhaseGlobal) * uWindStrength;
        float flutter = sin(dot(aOffset.xz, vec2(3.17,5.11)) + uTime * uFlutterFreq + aPhase) * uFlutterAmp;
        float push    = (sway + flutter) * bend;

        vec3 cardOffset = billboard(quad, viewMatrix, uLeafSize, aScale);

        vec3 transformed = aOffset + wdir * push + cardOffset;
        vUvDepth = quad + 0.5;
        `
      );

      // sample texture alpha in depth fragment to discard masked pixels
      shader.fragmentShader = `
        uniform sampler2D uTexture;
        varying vec2 vUvDepth;
      ` + shader.fragmentShader.replace(
        '#include <alphatest_fragment>',
        `
        vec4 t = texture2D(uTexture, vUvDepth);
        if ( t.a < 0.5 ) discard;
        #include <alphatest_fragment>
        `
      );
    };

    // instanced mesh
    const mesh = new THREE.InstancedMesh(card, this.#foliageMaterial_, count);
    mesh.castShadow = true;
    mesh.receiveShadow = false;
    mesh.customDepthMaterial = depthMat;      // for shadow maps
    mesh.frustumCulled = false;               // better stability for such thin cards

    return mesh;
  }

  async #fallenLeaves_(gui) {
    const leaf = new THREE.PlaneGeometry(0.2, 0.2, 1, 1);

    const { count, areaSize, maxHeight, center } = this.#leafParams_;
    const offsets = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const spins = new Float32Array(count * 2);
    const scales = new Float32Array(count);
    const seeds = new Float32Array(count);

    for (let i = 0; i < count; i += 1) {
      const i3 = i * 3;
      offsets[i3 + 0] = center.x + (Math.random() - 0.5) * areaSize;
      offsets[i3 + 1] = Math.random() * maxHeight + 1.0;
      offsets[i3 + 2] = center.z + (Math.random() - 0.5) * 20.0;

      velocities[i3 + 0] = (Math.random() - 0.5) * 0.6;
      velocities[i3 + 1] = Math.random() * 0.35;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.6;

      const i2 = i * 2;
      spins[i2 + 0] = Math.random() * Math.PI * 2.0;
      spins[i2 + 1] = THREE.MathUtils.lerp(0.4, 1.0, Math.random());

      scales[i] = THREE.MathUtils.lerp(0.65, 1.35, Math.random());
      seeds[i] = Math.random();
    }

    const aOffset = new THREE.InstancedBufferAttribute(offsets, 3);
    const aVelocity = new THREE.InstancedBufferAttribute(velocities, 3);
    const aSpin = new THREE.InstancedBufferAttribute(spins, 2);
    const aScale = new THREE.InstancedBufferAttribute(scales, 1);
    const aSeed = new THREE.InstancedBufferAttribute(seeds, 1);

    leaf.setAttribute('aOffset', aOffset);
    leaf.setAttribute('aVelocity', aVelocity);
    leaf.setAttribute('aSpin', aSpin);
    leaf.setAttribute('aScale', aScale);
    leaf.setAttribute('aSeed', aSeed);

    const boundsHalf = areaSize * 0.5;
    this.#leafUniforms_ = {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(this.#leafParams_.leafYellowLight) },
      uBoundsMin: { value: new THREE.Vector3(center.x - boundsHalf, 0, center.z - boundsHalf) },
      uBoundsMax: { value: new THREE.Vector3(center.x + boundsHalf, maxHeight, center.z + boundsHalf) },
      uBoundCenter: { value: center.clone() },
      uWindDirection: { value: this.#leafParams_.windDirection.clone() },
      uWindStrength: { value: this.#leafParams_.windStrength },
      uFallSpeed: { value: this.#leafParams_.fallSpeed },
      uSpinMultiplier: { value: this.#leafParams_.spinSpeed },
      uTexture: { value: this.#leafTexture_ },
    };

    this.#leafMaterial_ = new THREE.ShaderMaterial({
      vertexShader: LeavesVertexShader,
      fragmentShader: LeavesFragmentShader,
      uniforms: this.#leafUniforms_,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.#leafMesh_ = new THREE.InstancedMesh(leaf, this.#leafMaterial_, count);
    this.#leafMesh_.frustumCulled = false;
    this.#leafMesh_.renderOrder = 2;
    this.#leafMesh_.visible = true;
    this.Scene.add(this.#leafMesh_);

    const folder = gui.addFolder('Fallen Leaves');
    folder.add(this.#leafParams_, 'windStrength', 0, 3, 0.01).name('Wind Strength').onChange((v) => {
      this.#leafUniforms_.uWindStrength.value = v;
    });
    folder.add(this.#leafParams_, 'fallSpeed', 0.1, 3, 0.01).name('Fall Speed').onChange((v) => {
      this.#leafUniforms_.uFallSpeed.value = v;
    });
    folder.add(this.#leafParams_, 'spinSpeed', 0.2, 3, 0.01).name('Spin Speed').onChange((v) => {
      this.#leafUniforms_.uSpinMultiplier.value = v;
    });
    folder.add(this.#leafParams_.windDirection, 'x', -1, 1, 0.01).name('Wind Dir X').onChange(() => {
      this.#leafUniforms_.uWindDirection.value.copy(this.#leafParams_.windDirection).normalize();
    });
    folder.add(this.#leafParams_.windDirection, 'z', -1, 1, 0.01).name('Wind Dir Z').onChange(() => {
      this.#leafUniforms_.uWindDirection.value.copy(this.#leafParams_.windDirection).normalize();
    });
  }

  async #ground_(gui) {
    const groundGeometry = new THREE.PlaneGeometry(this.#groundWidth_, this.#groundWidth_, 200, 200);
    groundGeometry.rotateX(-Math.PI / 2);

    // copy groundGeometry UV to groundUV_
    this.#groundUV_.set(0, 0);
    const uvAttr = groundGeometry.attributes.uv;
    if (uvAttr && uvAttr.count > 0) {
      this.#groundUV_.set(uvAttr.array[0], uvAttr.array[1]);
    }

    // Ground material
    const groundMaterial = new CustomShaderMaterial({
      // CSM base material
      baseMaterial: THREE.MeshStandardMaterial,
      vertexShader: GroundVertexShader,
      fragmentShader: GroundFragmentShader,
      uniforms: {
        uTexture: { value: this.#noiseGrassHeightTexture_ },
        uTextureRepeat: { value: this.#groundRepeat_ },
        uNoiseTexture: { value: this.#noiseGroundHeightTexture_ },
        uGrassColor1: { value: new THREE.Color(this.#terrainParams_.grassColor1) },
        uGrassColor2: { value: new THREE.Color(this.#terrainParams_.grassColor2) },
        uGroundColor1: { value: new THREE.Color(this.#terrainParams_.groundColor1) },
        uGroundColor2: { value: new THREE.Color(this.#terrainParams_.groundColor2) },
      },
      
      // Mesh standard props
      color: new THREE.Color('#1aaa1a'),
      roughness: 1.0,
      metalness: 0.0,
      side: THREE.DoubleSide,
      wireframe: false,
    })

    const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    groundMesh.castShadow = false;
    groundMesh.receiveShadow = true;
    this.Scene.add(groundMesh);
  }

  async #prepareGrassHeightData_() {
    if (this.#grassHeightData_) return;

    const {data} = await getImageData(this.#noiseGrassHeightTexture_?.image);
    if (!data) return;

    this.#grassHeightData_ = data;
  }

  async #prepareGroundHeightData_() {
    if (this.#groundHeightData_) return;

    const {data, width, height} = await getImageData(this.#noiseGroundHeightTexture_?.image);
    if (!data) return;

    this.#groundHeightData_ = data;
    this.#groundHeightDataWidth_ = width;
    this.#groundHeightDataHeight_ = height;
  }

  #sampleGroundHeightData_(x, z) {
    const data = this.#groundHeightData_;
    const width = this.#groundHeightDataWidth_;
    const height = this.#groundHeightDataHeight_;
    if (!data || !width || !height) return 0;

    let u = (x / this.#groundWidth_ + 0.5);
    let v = (z / this.#groundWidth_ + 0.5);
    u -= Math.floor(u);
    v -= Math.floor(v);

    const px = Math.min(width - 1, (u * width) | 0);
    const py = Math.min(height - 1, (v * height) | 0);

    return data[py * width + px];
  }

  async #grassBlades_(gui) {
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.index = this.#grassBladeGeometry_.index;
    geometry.attributes.position = this.#grassBladeGeometry_.attributes.position;
    geometry.attributes.uv = this.#grassBladeGeometry_.attributes.uv;
    geometry.attributes.normal = this.#grassBladeGeometry_.attributes.normal;

    const instanceCount = 60000 * 10;

    const offsets = [];
    const stretches = [];
    const orientations = [];
    const halfRootAngles = [];
    const groundY = 0;

    let quaternion_0 = new THREE.Vector4();
    let quaternion_1 = new THREE.Vector4();

    for (let i = 0; i < instanceCount; i++) {
      // offset of each blade
      const x = (Math.random() - 0.5) * this.#groundWidth_;
      const z = (Math.random() - 0.5) * this.#groundWidth_;
      let groundHeight = this.#sampleGroundHeightData_(x, z);
      if (groundHeight < 0.475) continue;
      groundHeight = Math.pow(groundHeight + 0.5, 2.5) - 1.1;
      offsets.push(x, groundY + groundHeight, z);

      // define random growth directions
      // Rotation around Y axis
      const angle = Math.PI - Math.random() * (2 * Math.PI);
      const halfAngle = angle / 2;
      const s = Math.sin(halfAngle);
      const c = Math.cos(halfAngle);
      quaternion_0.set(0, s, 0, c).normalize();
      halfRootAngles.push(halfAngle);

      // Rotation around X axis
      const maxTiltAngle = 0.3; // about 30 degree
      const tiltAngle = (Math.random() - 0.5) * maxTiltAngle;
      const halfTiltAngle = tiltAngle / 2;
      const s2 = Math.sin(halfTiltAngle);
      const c2 = Math.cos(halfTiltAngle);
      quaternion_1.set(s2, 0, 0, c2).normalize();

      // Combine two quaternions
      quaternion_0 = multiplyQuaternions(quaternion_1, quaternion_0);

      // Rotation around Z axis
      const maxRollAngle = 0.2; // about 20 degree
      const rollAngle = (Math.random() - 0.5) * maxRollAngle;
      const halfRollAngle = rollAngle / 2;
      const s3 = Math.sin(halfRollAngle);
      const c3 = Math.cos(halfRollAngle);
      quaternion_1.set(0, 0, s3, c3).normalize();

      // Combine two quaternions
      quaternion_0 = multiplyQuaternions(quaternion_1, quaternion_0);

      orientations.push(quaternion_0.x, quaternion_0.y, quaternion_0.z, quaternion_0.w);

      // stretch (scale)
      //variation in height
      if (i < instanceCount / 3) {
          stretches.push(Math.random() * 0.5 + 0.5);
      } else {
          stretches.push(Math.random() * 0.5 + 0.25);
      }
    }

    geometry.instanceCount = offsets.length / 3;

    geometry.setAttribute('aOffset', new THREE.InstancedBufferAttribute(new Float32Array(offsets), 3));
    geometry.setAttribute('aOrientation', new THREE.InstancedBufferAttribute(new Float32Array(orientations), 4));
    geometry.setAttribute('aStretch', new THREE.InstancedBufferAttribute(new Float32Array(stretches), 1));
    geometry.setAttribute('aHalfRootAngle', new THREE.InstancedBufferAttribute(new Float32Array(halfRootAngles), 1));

    this.#grassMaterial_ = new CustomShaderMaterial({
      baseMaterial: THREE.MeshBasicMaterial,
      vertexShader: GrassBladeVertexShader,
      fragmentShader: GrassBladeFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uNoiseTexture: { value: this.#noiseGroundHeightTexture_ },
        // uTipColor: { value: new THREE.Color(this.#terrainParams_.grassColor1) },
        // uBaseColor: { value: new THREE.Color(this.#terrainParams_.grassColor2) },
        uTipColor: { value: new THREE.Color(this.#grassColorParams_.yellowTipColor) },
        uBaseColor: { value: new THREE.Color(this.#grassColorParams_.yellowBaseColor) },
        uGroundTexture: { value: this.#noiseGrassHeightTexture_ },
        uGroundTextureRepeat: { value: this.#groundRepeat_ },
        uGroundWidth: { value: this.#groundWidth_ },
      },

      // props
      side: THREE.DoubleSide,
    });

    const depthMaterial = new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking,
      // Other properties can be set here
    })

    const instancedMesh = new THREE.Mesh(geometry, this.#grassMaterial_);
    instancedMesh.castShadow = false;
    instancedMesh.receiveShadow = true;
    instancedMesh.customDepthMaterial = depthMaterial;
    instancedMesh.frustumCulled = false;
    this.Scene.add(instancedMesh);

    // GUI tweaks grass colors
    const folder = gui.addFolder('Grass Blades');
    folder.addColor(this.#terrainParams_, 'grassColor1').name('Tip Color').onChange((v) => {
      this.#grassMaterial_.uniforms.uTipColor.value.set(v);
    });
    folder.addColor(this.#terrainParams_, 'grassColor2').name('Base Color').onChange((v) => {
      this.#grassMaterial_.uniforms.uBaseColor.value.set(v);
    });
  }

  async #pond_(gui) {
    const pondGeometry = new THREE.PlaneGeometry(18, 10.3, 22, 22);
    pondGeometry.rotateX(-Math.PI / 2);

    this.#waterMaterial_ = new THREE.ShaderMaterial({
      vertexShader: WaterVertexShader,
      fragmentShader: WaterFragmentShader,
      uniforms: {
        uColor: { value: new THREE.Color(this.#waterParams_.color) },
        uOpacity: { value: this.#waterParams_.opacity },
        uTime: { value: 0 },
        uSpeed: { value: this.#waterParams_.speed },
        uRepeat: { value: this.#waterParams_.repeat },
        uFoam: { value: this.#waterParams_.foam },
        uFoamTop: { value: this.#waterParams_.foamTop },
      },
      transparent: true,
      wireframe: false,
    });

    const depthMaterial = new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking,
      // Other properties can be set here
    });

    const pondMesh = new THREE.Mesh(pondGeometry, this.#waterMaterial_);
    pondMesh.customDepthMaterial = depthMaterial;
    pondMesh.position.set(0, -0.2, -9.8);
    pondMesh.castShadow = false;
    pondMesh.receiveShadow = true;
    this.Scene.add(pondMesh);
  }

  #audioTrackChange_(color) {
    const track = this.#playlist_[color];
    if (!track) return;

    const next = new Howl({
      src: [track],
      volume: 0.5,
      loop: true,
    })

    const current = this.#sound_;
    current.fade(current.volume(), 0, 1500);
    current.once('fade', () => {
      current.stop();
      this.#sound_ = next;
      this.#sound_.mute(this.#soundMuted_);
      this.#sound_.play();
    });
  }

  #leafColorChange_(color) {
    if (!this.#leafUniforms_ || color === this.#leafColor_) return;

    let lightColor, darkColor, tipColor, baseColor;
    switch (color) {
      case 'green':
        lightColor = this.#leafParams_.leafGreenLight;
        darkColor = this.#leafParams_.leafGreenDark;
        tipColor = this.#grassColorParams_.greenTipColor;
        baseColor = this.#grassColorParams_.greenBaseColor;
        break;
      case 'yellow':
        lightColor = this.#leafParams_.leafYellowLight;
        darkColor = this.#leafParams_.leafYellowDark;
        tipColor = this.#grassColorParams_.yellowTipColor;
        baseColor = this.#grassColorParams_.yellowBaseColor;
        break;
      case 'red':
        lightColor = this.#leafParams_.leafRedLight;
        darkColor = this.#leafParams_.leafRedDark;
        tipColor = this.#grassColorParams_.redTipColor;
        baseColor = this.#grassColorParams_.redBaseColor;
        break;
      default:
        lightColor = this.#leafParams_.leafYellowLight;
        darkColor = this.#leafParams_.leafYellowDark;
        tipColor = this.#grassColorParams_.greenTipColor;
        baseColor = this.#grassColorParams_.greenBaseColor;
        break;
    }

    this.#audioTrackChange_(color);

    // animate color change
    this.Timeline
      .to(this.#leafUniforms_.uColor.value, {
        r: new THREE.Color(lightColor).r,
        g: new THREE.Color(lightColor).g,
        b: new THREE.Color(lightColor).b,
        duration: 1.5,
        ease: 'power2.inOut',
        onComplete: () => {
          this.#leafMesh_.visible = this.#leafColor_ !== 'green';
          this.#leafMesh_.needUpdate = true;
        },
      })
      .to(this.#foliageUniforms_.uLeafColor.value, {
        r: new THREE.Color(lightColor).r,
        g: new THREE.Color(lightColor).g,
        b: new THREE.Color(lightColor).b,
        duration: 1.5,
        ease: 'power2.inOut',
      }, '<')
      .to(this.#foliageUniforms_.uDarkColor.value, {
        r: new THREE.Color(darkColor).r,
        g: new THREE.Color(darkColor).g,
        b: new THREE.Color(darkColor).b,
        duration: 1.5,
        ease: 'power2.inOut',
      }, '<')
      .to(this.#grassMaterial_.uniforms.uTipColor.value, {
        r: new THREE.Color(tipColor).r,
        g: new THREE.Color(tipColor).g,
        b: new THREE.Color(tipColor).b,
        duration: 1.5,
        ease: 'power2.inOut',
      }, '<')
      .to(this.#grassMaterial_.uniforms.uBaseColor.value, {
        r: new THREE.Color(baseColor).r,
        g: new THREE.Color(baseColor).g,
        b: new THREE.Color(baseColor).b,
        duration: 1.5,
        ease: 'power2.inOut',
      }, '<');

      this.#leafColor_ = color;
  }

  registerUiEvents() {
    this.#uiButtonIds_.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;

      const handler = () => this.#onUiButtonClick_(id);
      el.addEventListener('click', handler, { once: false });
    });
  }

  registerCoverEvent() {
    const coverEl = document.getElementById('cover-container');
    if (!coverEl) return;
    
    coverEl.addEventListener('asset-loaded', () => {
      this.#onAssetLoaded_();
    }, { once: true });
  }

  #onAssetLoaded_() {
    this.Timeline
      .to('#cover-container', { autoAlpha: 0, duration: 0.5, display: 'none', ease: 'power1.out', delay: 0.5 })
      .fromTo('#menu-bar', { y: "10%", opacity: 0 }, { y: "0%", opacity: 1, duration: 1.0, ease: 'power2.inOut', onComplete: () => {
        // play sound
        this.#sound_.play();
        this.#sound_.fade(0, 0.5, 2000);
      }})
  }

  #onCoffeeButtonClick_() {
    console.log('coffee button clicked');
  }

  #onBenchButtonClick_() {
    console.log('bench button clicked');
  }

  #onPondButtonClick_() {
    console.log('pond button clicked');
  }

  #onMusicButtonClick_() {
    this.Timeline.to('#img-music-stop', { opacity: this.#soundMuted_ ? 1.0 : 0.0, duration: 0.3 });
    this.#soundMuted_ = !this.#soundMuted_;
    if (this.#soundMuted_) {
      this.#sound_.fade(this.#sound_.volume(), 0, 1500);
      this.#sound_.once('fade', () => {
        this.#sound_.mute(true);
      });
    } else {
      this.#sound_.mute(false);
      this.#sound_.fade(0, 0.5, 2000);
    }
  }

  #onInfoButtonClick_() {
    this.Timeline
      .to('#info-modal', { autoAlpha: 1, duration: 0.5, display: 'flex', ease: 'power3.out' })
      .fromTo('#info-panel', { scale: 0.8 }, { scale: 1.0, duration: 0.5, ease: 'power3.out' }, '<');
  }

  #onCloseInfoButtonClick_() {
    this.Timeline
      .to('#info-modal', { autoAlpha: 0, duration: 0.5, display: 'none', ease: 'power3.out' })
      .to('#info-panel', { scale: 0.8, duration: 0.5, ease: 'power3.out' }, '<');
  }

  #onUiButtonClick_(id) {
    switch (id) {
      case 'btn-maple-green':
        this.#leafColorChange_('green');
        break;
      case 'btn-maple-yellow':
        this.#leafColorChange_('yellow');
        break;
      case 'btn-maple-red':
        this.#leafColorChange_('red');
        break;
      case 'btn-coffee':
        this.#onCoffeeButtonClick_();
        break;
      case 'btn-bench':
        this.#onBenchButtonClick_();
        break;
      case 'btn-pond':
        this.#onPondButtonClick_();
        break;
      case 'btn-music':
        this.#onMusicButtonClick_();
        break;
      case 'btn-info':
        this.#onInfoButtonClick_();
        break;
      case 'btn-close-info':
        this.#onCloseInfoButtonClick_();
        break;
      default: break;
    }
  }

  onStep(timeElapsed, totalTime) {
    if (this.#enableAnimation_) {
      if (this.#grassMaterial_) {
        this.#grassMaterial_.uniforms.uTime.value = totalTime;
      }

      if (this.#foliageMaterial_) {
        this.#foliageMaterial_.uniforms.uTime.value = totalTime;
      }

      if (this.#leafUniforms_) {
        this.#leafUniforms_.uTime.value = totalTime;
      }

      if (this.#waterMaterial_) {
        this.#waterMaterial_.uniforms.uTime.value = totalTime;
      }
    }
  }
}

let APP_ = new GrassProject();

window.addEventListener('DOMContentLoaded', async () => {
  await APP_.initialize();
  APP_.registerCoverEvent();
  APP_.registerUiEvents();
});