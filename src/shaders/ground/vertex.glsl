uniform sampler2D uNoiseTexture;
uniform sampler2D uTexture;
uniform float uTextureRepeat;

varying float vTone;
varying vec3 vPosition;

#include ../includes/simplexNoise2d.glsl

void main() {
  float height = texture2D(uNoiseTexture, uv).r - 0.5;
  height *= 2.0; // scale to [-1, 1]
  height += 0.5; // adjust to [0, 1]

  // float height = simplexNoise2d(uv);
  vec3 pos = position;
  pos.y += height * 1.2; // adjust the height effect

  csm_Position = pos;
  
  // varying
  vPosition = pos;
  vTone = texture2D(uTexture, uv * uTextureRepeat).r;
}