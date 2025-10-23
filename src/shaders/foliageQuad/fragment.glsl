// FoliageQuadFS
precision highp float;

uniform sampler2D uTexture;
uniform vec3 uLeafColor;
uniform vec3 uDarkColor;

varying vec2 vUv;
varying vec3 vN;

void main() {
  vec4 tex = texture2D(uTexture, vUv);
  if (tex.a < 0.5) discard;        // alpha cutout (matches alphaTest)

  // simple lambert from a fixed key light (you can replace with real lights via onBeforeCompile)
  vec3 L = normalize(vec3(0.5, 1.0, 0.35));
  float ndl = max(dot(normalize(vN), L), 0.0);
  vec3 col = mix(uDarkColor, uLeafColor, ndl) * tex.rgb;

  gl_FragColor = vec4(col, 1.0);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}