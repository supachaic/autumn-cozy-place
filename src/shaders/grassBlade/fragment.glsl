precision mediump float;

uniform vec3 uGrassColor1;
uniform vec3 uGrassColor2;

varying float vHeight;

void main() {
    vec3 grassColor = mix(uGrassColor2, uGrassColor1, vHeight);

    // Assign the final color
    csm_DiffuseColor = vec4(grassColor, 1.0);
    
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
