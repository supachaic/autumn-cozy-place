import * as THREE from "three";
import { gsap } from "gsap";

export function lookAt(camera, target) {
    const tempCamera = camera.clone();
    tempCamera.lookAt(target);
    const targetQuaternion = tempCamera.quaternion.clone();

    // calculate shortest path for rotation
    const dot = camera.quaternion.dot(targetQuaternion);
    if (dot < 0) {
      targetQuaternion.x *= -1;
      targetQuaternion.y *= -1;
      targetQuaternion.z *= -1;
      targetQuaternion.w *= -1;
    }

    // calculate duration based on angle distance
    let duration = 5.0;
    const angleDiff = camera.quaternion.angleTo(targetQuaternion);
    duration *= THREE.MathUtils.clamp(angleDiff / Math.PI, 0.5, 2.5);

    const state = { t: 0 };
    const tween = gsap.to(state, {
      t: 1,
      duration: duration,
      ease: "power2.inOut",
      onUpdate: () => {
        camera.quaternion.slerp(targetQuaternion, state.t);
      },
    });

    return tween;
  }