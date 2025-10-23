uniform vec3 uGrassColor1;
uniform vec3 uGrassColor2;
uniform vec3 uGroundColor1;
uniform vec3 uGroundColor2;

varying vec3 vPosition;
varying float vTone;



void main() {
  vec3 color = vec3(1.0);

  // Grass
  float grassThreshold = -2.0;
  float grassMix = step(grassThreshold, vPosition.y);
  vec3 grassColor = mix(uGrassColor2, uGrassColor1, vTone);
  color = mix(color, grassColor, grassMix);

  // Ground
  float groundThreshold = -0.2;
  float groundMix = smoothstep(0.05, groundThreshold, vPosition.y);
  vec3 groundColor = mix(uGroundColor2, uGroundColor1, vTone);
  color = mix(color, groundColor, groundMix);

  csm_DiffuseColor = vec4(color, 1.0);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}