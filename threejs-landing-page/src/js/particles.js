import * as THREE from 'three';

/**
 * Creates a GPU-rendered particle field — a slowly swirling "nebula" of points
 * distributed inside a sphere. Returns a THREE.Points object plus an `update`
 * method that animates the swirl each frame.
 */
export function createParticleField({
  count = 3500,
  radius = 18,
  colorA = '#7b5cff',
  colorB = '#22d3ee',
} = {}) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const scales = new Float32Array(count);

  const cA = new THREE.Color(colorA);
  const cB = new THREE.Color(colorB);

  for (let i = 0; i < count; i++) {
    // Distribute points inside a sphere (cube-root keeps density uniform).
    const r = radius * Math.cbrt(Math.random());
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);

    positions.set([x, y, z], i * 3);

    // Blend the two accent colours by distance from the centre.
    const mixed = cA.clone().lerp(cB, r / radius);
    colors.set([mixed.r, mixed.g, mixed.b], i * 3);

    scales[i] = Math.random() * 1.5 + 0.5;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));

  // Custom shader: round, soft, additive points that twinkle over time.
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uSize: { value: 9.0 * Math.min(window.devicePixelRatio, 2) },
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uSize;
      attribute float aScale;
      varying vec3 vColor;

      void main() {
        vColor = color;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        // Gentle twinkle so points pulse slightly out of phase.
        float twinkle = 0.6 + 0.4 * sin(uTime * 2.0 + aScale * 12.0);
        gl_PointSize = uSize * aScale * twinkle * (1.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;

      void main() {
        // Soft circular falloff -> glowing dot.
        float d = distance(gl_PointCoord, vec2(0.5));
        float alpha = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(vColor, alpha);
      }
    `,
    vertexColors: true,
  });

  const points = new THREE.Points(geometry, material);

  points.userData.update = (elapsed) => {
    material.uniforms.uTime.value = elapsed;
    points.rotation.y = elapsed * 0.03;
    points.rotation.x = Math.sin(elapsed * 0.05) * 0.1;
  };

  return points;
}
