import { useThree } from "@react-three/fiber";
import { createContext, useContext, useLayoutEffect } from "react";
import { AbsoluteFill } from "remotion";
import type { PerspectiveCamera } from "three";
import {
  type Camera,
  CAMERA_PADRAO,
  desfoque,
  fovThree,
  matrizCameraThree,
  PERSPECTIVA,
  transformDoMundo,
} from "../camera";
import { REEL } from "../tema";

type Estado = { camera: Camera; focoZ: number; dof: number };

const ContextoCamera = createContext<Estado>({
  camera: CAMERA_PADRAO,
  focoZ: 0,
  dof: 1,
});

export const useCamera = () => useContext(ContextoCamera);

// Uma camada de mundo em CSS 3D vista pela câmera. Várias camadas com a mesma
// câmera formam um mundo só (uma atrás do canvas 3D, outra na frente).
export const Mundo: React.FC<{
  camera: Camera;
  focoZ?: number;
  dof?: number;
  children: React.ReactNode;
}> = ({ camera, focoZ = 0, dof = 1, children }) => (
  <ContextoCamera.Provider value={{ camera, focoZ, dof }}>
    <AbsoluteFill
      style={{
        perspective: PERSPECTIVA,
        perspectiveOrigin: "50% 50%",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: REEL.largura / 2,
          top: REEL.altura / 2,
          width: 0,
          height: 0,
          transformStyle: "preserve-3d",
          transform: transformDoMundo(camera),
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  </ContextoCamera.Provider>
);

// Plano plano no mundo, centrado em (x, y, z). Desfoca pela distância ao foco.
export const Plano: React.FC<{
  x: number;
  y: number;
  z: number;
  largura: number;
  altura: number;
  rx?: number;
  ry?: number;
  rz?: number;
  escala?: number;
  semDesfoque?: boolean;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}> = ({
  x,
  y,
  z,
  largura,
  altura,
  rx = 0,
  ry = 0,
  rz = 0,
  escala = 1,
  semDesfoque,
  style,
  children,
}) => {
  const { camera, focoZ, dof } = useCamera();
  const blur = semDesfoque ? 0 : desfoque(camera, x, y, z, focoZ, dof);
  return (
    <div
      style={{
        position: "absolute",
        left: -largura / 2,
        top: -altura / 2,
        width: largura,
        height: altura,
        transform: `translate3d(${x}px, ${y}px, ${z}px) rotateY(${ry}deg) rotateX(${rx}deg) rotateZ(${rz}deg) scale(${escala})`,
        filter: blur > 0.3 ? `blur(${blur.toFixed(2)}px)` : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// Dentro do <ThreeCanvas>: copia a câmera do mundo pra câmera do three
export const CameraNoThree: React.FC<{ camera: Camera }> = ({ camera }) => {
  const { camera: cam } = useThree();
  useLayoutEffect(() => {
    const c = cam as PerspectiveCamera;
    c.fov = fovThree;
    c.aspect = REEL.largura / REEL.altura;
    c.near = 10;
    c.far = 30000;
    c.updateProjectionMatrix();
    // O renderer recalcula matrixWorld a partir de `matrix` a cada quadro: grava ali
    const inversa = matrizCameraThree(camera);
    const mundo = inversa.clone().invert();
    c.matrixAutoUpdate = false;
    c.matrix.copy(mundo);
    c.matrixWorld.copy(mundo);
    c.matrixWorldInverse.copy(inversa);
  }, [cam, camera]);
  return null;
};
