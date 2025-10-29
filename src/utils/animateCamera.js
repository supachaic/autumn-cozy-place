import * as THREE from "three";
import { gsap } from "gsap";

/**
 * Smooth camera flight along a path with eased rotation.
 * @param {THREE.Camera} camera
 * @param {THREE.Vector3[]} pathVec3 - control points (already smoothed/orderly)
 * @param {Object} opt
 * @param {number} [opt.duration=6] - seconds for whole path (auto-scaled by length if scaleByLength)
 * @param {boolean} [opt.scaleByLength=true] - scale duration by curve length (units/sec feel)
 * @param {number} [opt.speed=12] - units per second if scaleByLength=true
 * @param {number} [opt.lookAhead=0.02] - how far ahead on curve to look (normalized)
 * @param {number} [opt.rotLerp=0.15] - rotation smoothing (0..1) per frame update
 * @param {Function} [opt.onUpdate] - optional callback each frame
 * @returns {gsap.core.Tween} GSAP timeline
 */
export function flyAlong(camera, pathVec3, opt = {}) {
  const {
    duration = 6,
    scaleByLength = true,
    speed = 12,
    lookAhead = 0.02,
    rotLerp = 0.15,
    onUpdate
  } = opt;

  // 1) make a smooth curve from your points
  const curve = new THREE.CatmullRomCurve3(pathVec3, false, "catmullrom", 0.3);
  const length = curve.getLength();
  const totalDuration = scaleByLength ? Math.max(0.1, length / Math.max(0.001, speed)) : duration;

  // temp objects to avoid GC
  const pos = new THREE.Vector3();
  const posAhead = new THREE.Vector3();
  const dir = new THREE.Vector3();

  // 2) tween a normalized t 0→1; onUpdate sample curve & rotate smoothly
  const state = { t: 0 };

  const tween = gsap.to(state, {
    t: 1,
    duration: totalDuration,
    ease: "power1.inOut",
    onUpdate: () => {
      const t = state.t;

      // position
      curve.getPoint(t, pos);
      camera.position.copy(pos);

      // forward direction: look slightly ahead on curve
      const tAhead = Math.min(1, t + lookAhead);
      curve.getPoint(tAhead, posAhead);
      dir.subVectors(posAhead, pos).normalize();

      // smooth rotation
      const tempCamera = camera.clone();
      tempCamera.lookAt(pos.clone().add(dir));
      if (tempCamera.quaternion.x === 0 && tempCamera.quaternion.y === 0 && tempCamera.quaternion.z === 0) {
        // do nothing to avoid NaN slerp
      } else {
        camera.quaternion.slerp(tempCamera.quaternion, rotLerp);
      }

      if (onUpdate) onUpdate({ t, length, pos: pos.clone(), dir: dir.clone() });
    }
  });


  // initial lookAt position for chaining
  const pos0 = new THREE.Vector3();
  curve.getPoint(0, pos0);

  const tAhead0 = Math.min(1, 0 + lookAhead);
  const posAhead0 = new THREE.Vector3();
  curve.getPoint(tAhead0, posAhead0);
  const dir0 = new THREE.Vector3();
  dir0.subVectors(posAhead0, pos0).normalize();

  const lookAtPos0 = new THREE.Vector3(); 
  lookAtPos0.copy(pos0).add(dir0);

  return {  tween, lookAtPos0  };
}
