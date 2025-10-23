// src/shaders/leaves/fragment.glsl
uniform sampler2D uTexture;
uniform vec3 uColor;

varying vec2 vUv;
varying float vFade;

void main() {
  vec4 color = texture2D(uTexture, vUv);
  if (color.a < 0.5) discard;
  gl_FragColor = vec4(uColor, color.a * vFade);
}
