'use client';

import * as THREE from 'three';

export interface TriangleGeometryProps {
  points: number[][];
}

export const TriangleGeometry = ({ points }: TriangleGeometryProps) => {
  const geom = new THREE.BufferGeometry();
  const vertices = new Float32Array(points.flat());
  geom.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geom.computeVertexNormals();
  return geom;
};

export default TriangleGeometry;
