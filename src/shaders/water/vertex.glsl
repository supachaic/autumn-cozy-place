uniform float uTime;
uniform float uSpeed;
uniform float uRepeat;
varying vec2 vUv;

void main() {
  vUv = uv;
  
  // Animate UVs for water ripples
  vec2 animatedUv = uv;
  animatedUv.y += uTime * uSpeed * 0.1;
  animatedUv.x += uTime * uSpeed * 0.1;
  animatedUv = mod(animatedUv, uRepeat);

  vec3 pos = position;
  pos.y += (sin((animatedUv.x + animatedUv.y + uTime * uSpeed) * 5.0) * 0.01);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}