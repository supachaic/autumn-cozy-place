precision mediump float;

uniform vec3 uTipColor;
uniform vec3 uBaseColor;

varying float vHeight;

void main() {
    vec3 baseColor = mix(uBaseColor, uTipColor, vHeight);

    // Assign the final color
    csm_DiffuseColor = vec4(baseColor, 1.0);
    
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
