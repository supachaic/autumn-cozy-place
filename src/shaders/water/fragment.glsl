varying vec2 vUv;
uniform vec3 uColor;
uniform float uOpacity;
uniform float uTime;
uniform float uSpeed;
uniform float uRepeat;
uniform float uFoam;
uniform float uFoamTop;

#include "../includes/lygia/generative/pnoise.glsl"

void main() {
  float adjustedTime = uTime * uSpeed;

  // NOISE GENERATION
  float noise = pnoise(vec3(vUv * uRepeat, adjustedTime * 0.5), vec3(100.0, 24.0, 112.0));

  // FOAM
  noise = smoothstep(uFoam, uFoamTop, noise);

  //  COLOR
  vec3 intermediateColor = uColor * 1.8;
  vec3 topColor = intermediateColor * 2.0;
  vec3 finalColor = uColor;
  finalColor = mix(uColor, intermediateColor, step(0.01, noise));
  finalColor = mix(finalColor, topColor, step(1.0, noise));

  gl_FragColor = vec4(finalColor, uOpacity);

  #include <tonemapping_fragment>
}