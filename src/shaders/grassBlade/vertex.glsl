precision highp float;
attribute vec3 aOffset;
attribute vec4 aOrientation;
attribute float aHalfRootAngle;
attribute float aStretch;

uniform float uTime;
uniform float uGroundTextureRepeat;
uniform float uGroundWidth;
uniform sampler2D uGroundTexture;
// uniform sampler2D uNoiseGroundHeightTexture; // IGNORE

varying float vHeight;

#include ../includes/simplexNoise2d.glsl

vec4 slerp(vec4 v0, vec4 v1, float t) {
  // Only unit quaternions are valid rotations.
  // Normalize to avoid undefined behavior.
  normalize(v0);
  normalize(v1);

  // Compute the cosine of the angle between the two vectors.
  float dot_ = dot(v0, v1);

  // If the dot product is negative, slerp won't take
  // the shorter path. Note that v1 and -v1 are equivalent when
  // the negation is applied to all four components. Fix by 
  // reversing one quaternion.
  if (dot_ < 0.0) {
    v1 = -v1;
    dot_ = -dot_;
  }  

  const float DOT_THRESHOLD = 0.9995;
  if (dot_ > DOT_THRESHOLD) {
    // If the inputs are too close for comfort, linearly interpolate
    // and normalize the result.
    vec4 result = t*(v1 - v0) + v0;
    normalize(result);
    return result;
  }

  // Since dot is in range [0, DOT_THRESHOLD], acos is safe
  float theta_0 = acos(dot_);       // theta_0 = angle between input vectors
  float theta = theta_0*t;          // theta = angle between v0 and result
  float sin_theta = sin(theta);     // compute this value only once
  float sin_theta_0 = sin(theta_0); // compute this value only once
  float s0 = cos(theta) - dot_ * sin_theta / sin_theta_0;  // == sin(theta_0 - theta) / sin(theta_0)
  float s1 = sin_theta / sin_theta_0;
  return (s0 * v0) + (s1 * v1);
}

vec3 rotateVectorByQuaternion( vec3 v, vec4 q){
  return 2.0 * cross(q.xyz, v * q.w + cross(q.xyz, v)) + v;
}

void main() {
    vec3 offset = aOffset;

    vec2 groundUv = (offset.xz / uGroundWidth + 0.5) * uGroundTextureRepeat;
    float height = texture2D(uGroundTexture, groundUv).r;
    offset.y += height * 0.15; // scale the height effect

    float frc = position.y/float(6.0);

    float factor = 0.075;

    float noise = 1.0 - (simplexNoise2d(vec2((uTime * factor - offset.x/100.0), (uTime * factor - offset.z/100.0))));

    // vec4 direction = vec4(0.0, halfRootAngleSin, 0.0, halfRootAngleCos);
    vec4 direction = vec4(0.0, aHalfRootAngle, 0.0, aHalfRootAngle);

    direction = slerp(direction, aOrientation, frc);

    vec3 basePosition = vec3(position.x, position.y + position.y * aStretch, position.z);
    // vec3 basePosition = vec3(position.x, position.y, position.z);
    vec3 tempPosition = rotateVectorByQuaternion(basePosition, direction);

    float halfAngle = noise * 0.35; // max angle of 45 degrees (in radians)
    vec3 bentPosition = rotateVectorByQuaternion(tempPosition, normalize(vec4(sin(halfAngle), 0.0, -sin(halfAngle), cos(halfAngle))));

    vec3 finalPos = offset + bentPosition * 1.5;
    
    csm_Position = finalPos;

    // varying
    vHeight = height;
}
