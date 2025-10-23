uniform float uTime;
uniform vec3 uBoundsMin;
uniform vec3 uBoundsMax;
uniform vec3 uWindDirection;
uniform float uWindStrength;
uniform float uFallSpeed;
uniform float uSpinMultiplier;

attribute vec3 aOffset;
attribute vec3 aVelocity;
attribute vec2 aSpin;
attribute float aScale;
attribute float aSeed;

varying vec2 vUv;
varying float vFade;

vec3 wrapXZ(vec3 position, vec3 boundsMin, vec3 boundsMax) {
  vec3 size = boundsMax - boundsMin;
  vec3 wrapped = position;
  wrapped.x = mod(wrapped.x - boundsMin.x, size.x) + boundsMin.x;
  wrapped.z = mod(wrapped.z - boundsMin.z, size.z) + boundsMin.z;
  return wrapped;
}

void main() {
  vUv = uv;

  float heightSpan = max(0.01, uBoundsMax.y - uBoundsMin.y);
  float fallSpeed = uFallSpeed + aVelocity.y;
  float cycleDuration = heightSpan / max(0.01, fallSpeed);

  float localTime = mod(uTime + aSeed * cycleDuration * 0.73, cycleDuration);
  float progress = localTime / cycleDuration;

  vec3 pos = aOffset;
  pos.y = uBoundsMax.y - progress * heightSpan;

  vec3 drift = (aVelocity + uWindDirection * uWindStrength) * localTime;
  pos += drift;
  // pos = wrapXZ(pos, uBoundsMin, uBoundsMax);

  float angle = aSpin.x + localTime * aSpin.y * uSpinMultiplier;
  float s = sin(angle);
  float c = cos(angle);

  vec2 rotated = vec2(
    c * position.x - s * position.y,
    s * position.x + c * position.y
  ) * aScale;

  vec3 right = vec3(modelViewMatrix[0][0], modelViewMatrix[1][0], modelViewMatrix[2][0]);
  vec3 up = vec3(modelViewMatrix[0][1], modelViewMatrix[1][1], modelViewMatrix[2][1]);
  vec3 billboardPos = pos + right * rotated.x + up * rotated.y;

  vFade = smoothstep(uBoundsMin.y, uBoundsMin.y + heightSpan * 0.15, pos.y);
  gl_Position = projectionMatrix * viewMatrix * vec4(billboardPos, 1.0);
}
