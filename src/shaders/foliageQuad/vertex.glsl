// FoliageQuadVS
precision highp float;

uniform vec3 uModelPosition;
uniform float uTime;
uniform vec2  uWindDir;
uniform float uWindStrength, uBendStrength, uFlutterAmp, uFlutterFreq, uPhaseGlobal;
uniform float uLeafSize;

attribute vec3 aOffset;  // per-leaf world position (from sphere points)
attribute vec3 aNormal;  // per-leaf surface normal (for lighting & optional tilt)
attribute float aPhase;  // per-leaf phase offset
attribute float aScale;  // per-leaf size variance

varying vec2 vUv;
varying vec3 vN;         // lighting pseudo-normal

// create a Y-billboarded quad around the instance offset
vec3 yBillboard(vec2 quad, mat4 viewMatrix, float size, float s){
  vec3 camRight = normalize(vec3(viewMatrix[0].x, 0.0, viewMatrix[0].z));
  vec3 camUp    = vec3(0.0, 1.0, 0.0);
  return camRight * (quad.x * size * s) + camUp * (quad.y * size * s);
}

// create full billboard quad
vec3 billboard(vec2 quad, mat4 viewMatrix, float size, float s){
  vec3 cameraRight = vec3(viewMatrix[0].x, viewMatrix[1].x, viewMatrix[2].x);
  vec3 cameraUp    = vec3(viewMatrix[0].y, viewMatrix[1].y, viewMatrix[2].y);
  return cameraRight * (quad.x * size * s) + cameraUp * (quad.y * size * s);
}

void main() {
  vec3 pos = position;

  // quad coordinates in -0.5..0.5 from PlaneGeometry
  vec2 quad = pos.xy;

  // height-based bend mask (assumes tree roughly 3m tall in model units; adjust as needed)
  float h = clamp(aOffset.y / 3.0, 0.0, 1.0);
  float bend = pow(h, 1.5) * uBendStrength;

  vec3 wdir = normalize(vec3(uWindDir.x, 0.0, uWindDir.y));
  float sway    = sin(uTime * 0.9 + aPhase + uPhaseGlobal) * uWindStrength;
  float flutter = sin(dot(aOffset.xz, vec2(3.17, 5.11)) + uTime * uFlutterFreq + aPhase) * uFlutterAmp;
  float push    = (sway + flutter) * bend;

  vec3 cardOffset = billboard(quad, viewMatrix, uLeafSize, aScale);

  // base + wind in XZ + card offset
  // vec3 worldPos = aOffset + wdir * push + cardOffset;
  vec3 localPos = aOffset + wdir * push + cardOffset;

  // simple pseudo-normal for lighting: mix leaf's surface normal with camera-facing up
  vN = normalize(mix(aNormal, vec3(0.0, 1.0, 0.0), 0.3));

  vUv = quad + 0.5;

  vec4 worldPos = modelMatrix * vec4(localPos + uModelPosition, 1.0);

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}