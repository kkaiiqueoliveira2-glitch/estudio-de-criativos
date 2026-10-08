import { useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { staticFile, useCurrentFrame, useRemotionEnvironment, useVideoConfig } from "remotion";
import {
  CanvasTexture,
  PMREMGenerator,
  SRGBColorSpace,
  type Texture,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { useEspera } from "./espera";
import { molaEm, progresso } from "../movimento";

// Ícones de app em 3D de verdade (bloco arredondado com verniz), com o logo oficial
// na face da frente. Regra dos logos (07/10/2026): SVG oficial, cores originais, sem
// deformar, recolorir nem recortar; o logo vai inteiro numa face e o bloco é que se
// mexe. Pedido de 08/10: entrar "pulando, subindo", como no anúncio de referência.

export type Icone = {
  logo: string; // arquivo em public/assets/imagens (SVG com viewBox, ou PNG/JPG)
  x: number; // mundo CSS (y pra baixo)
  y: number;
  z: number;
  entra: number; // s
  sai?: number; // s
  lado?: number;
  semente?: number;
  // de onde o ícone sai (mundo CSS): sem isso ele sobe de baixo; com isso, explode desse ponto
  de?: { x: number; y: number; z: number };
};

// lado do bloco em px
export const ICONE = { lado: 168, profundidade: 46, raio: 40 };

const TEXTURA = 512;
const OCUPA = 0.62; // fração da face que o logo ocupa

// Desenha o logo num canvas quadrado, centrado e com a proporção dele
const carregarLogo = async (arquivo: string): Promise<Texture> => {
  if (!/.svg$/i.test(arquivo)) return carregarImagem(arquivo);
  const texto = await fetch(staticFile(`assets/imagens/${arquivo}`)).then((r) => r.text());
  const vb = texto.match(/viewBox="([-\d.\s]+)"/)?.[1].trim().split(/\s+/).map(Number);
  if (!vb) throw new Error(`${arquivo} sem viewBox`);
  const proporcao = vb[2] / vb[3];
  const caixa = TEXTURA * OCUPA;
  const w = proporcao >= 1 ? caixa : caixa * proporcao;
  const h = proporcao >= 1 ? caixa / proporcao : caixa;
  // tamanho explícito no <svg> (o que já houver sai, senão o atributo duplica e a imagem não carrega)
  const comTamanho = texto.replace(
    /<svg\b([^>]*)>/,
    (_, attrs: string) => `<svg${attrs.replace(/\s(width|height)="[^"]*"/g, "")} width="${w}" height="${h}">`,
  );
  const url = URL.createObjectURL(new Blob([comTamanho], { type: "image/svg+xml" }));
  const img = new Image();
  await new Promise<void>((ok, falha) => {
    img.onload = () => ok();
    img.onerror = () => falha(new Error(`Não carregou ${arquivo}`));
    img.src = url;
  });
  const canvas = new OffscreenCanvas(TEXTURA, TEXTURA);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, (TEXTURA - w) / 2, (TEXTURA - h) / 2, w, h);
  URL.revokeObjectURL(url);
  const textura = new CanvasTexture(canvas);
  textura.colorSpace = SRGBColorSpace;
  textura.anisotropy = 8;
  return textura;
};

// Logo em PNG/JPG (produto, parceiro, forma de pagamento): mesma caixa, proporção do arquivo
const carregarImagem = async (arquivo: string): Promise<Texture> => {
  const img = new Image();
  await new Promise<void>((ok, falha) => {
    img.onload = () => ok();
    img.onerror = () => falha(new Error(`Não carregou ${arquivo}`));
    img.src = staticFile(`assets/imagens/${arquivo}`);
  });
  const proporcao = img.naturalWidth / img.naturalHeight;
  const caixa = TEXTURA * OCUPA;
  const w = proporcao >= 1 ? caixa : caixa * proporcao;
  const h = proporcao >= 1 ? caixa / proporcao : caixa;
  const canvas = new OffscreenCanvas(TEXTURA, TEXTURA);
  canvas.getContext("2d")!.drawImage(img, (TEXTURA - w) / 2, (TEXTURA - h) / 2, w, h);
  const textura = new CanvasTexture(canvas);
  textura.colorSpace = SRGBColorSpace;
  textura.anisotropy = 8;
  return textura;
};

const sombraTextura = () => {
  const c = new OffscreenCanvas(256, 256);
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "rgba(0, 4, 24, .75)");
  g.addColorStop(1, "rgba(0, 4, 24, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const t = new CanvasTexture(c);
  return t;
};

// `todos`: todos os ícones da composição, pra carregar os logos de uma vez na montagem
// (só os da tela deixava os que entram depois em branco, 08/10/2026)
export const Icones3D: React.FC<{ icones: Icone[]; todos: Icone[] }> = ({ icones, todos }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const { gl, scene, invalidate, advance } = useThree();
  const { isRendering } = useRemotionEnvironment();

  useLayoutEffect(() => {
    const pmrem = new PMREMGenerator(gl);
    const ambiente = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = ambiente;
    return () => {
      ambiente.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);

  const logos = useMemo(() => [...new Set(todos.map((i) => i.logo))], [todos]);
  // em estado: quando os logos chegam, a cena redesenha com eles na face
  const [texturas, setTexturas] = useState<Map<string, Texture>>(() => new Map());
  useEspera("Carregando logos dos ícones 3D", async () => {
    const prontas = new Map<string, Texture>();
    for (const l of logos) prontas.set(l, await carregarLogo(l));
    setTexturas(prontas);
    // segura o quadro até o canvas redesenhar com os logos (o efeito abaixo pede o desenho)
    await new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
  });
  // o canvas do three só desenha quando pedem: com os logos novos, pede
  useEffect(() => {
    if (texturas.size === 0) return;
    if (isRendering) advance(performance.now());
    else invalidate();
  }, [texturas, isRendering, advance, invalidate]);

  const geos = useMemo(() => new Map<number, RoundedBoxGeometry>(), []);
  const geo = (lado: number) => {
    if (!geos.has(lado)) {
      geos.set(lado, new RoundedBoxGeometry(lado, lado, ICONE.profundidade * (lado / ICONE.lado), 6, ICONE.raio * (lado / ICONE.lado)));
    }
    return geos.get(lado)!;
  };
  const sombra = useMemo(sombraTextura, []);

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[-600, 900, 1600]} intensity={1.6} />
      <directionalLight position={[800, -300, 900]} intensity={0.4} />
      {icones.map((ic, i) => {
        if (t < ic.entra - 0.05) return null;
        const lado = ic.lado ?? ICONE.lado;
        const semente = ic.semente ?? i;
        const s = molaEm(frame, fps, ic.entra, "mola");
        const vida = t - ic.entra;
        const saindo = ic.sai !== undefined ? progresso(t, ic.sai, ic.sai + 0.35, "partida") : 0;
        if (saindo >= 1) return null;
        // pulo: sobe de baixo girando e assenta com overshoot; depois flutua
        const flutua = Math.min(1, vida / 0.6);
        const ox = ic.de ? ic.de.x + (ic.x - ic.de.x) * s : ic.x;
        const oz = ic.de ? ic.de.z + (ic.z - ic.de.z) * s : ic.z;
        const y =
          (ic.de ? ic.de.y + (ic.y - ic.de.y) * s : ic.y + (1 - s) * 280) +
          Math.sin(vida * 2.3 + semente * 1.7) * 7 * flutua -
          saindo * 420;
        const escala = (0.25 + 0.75 * s) * (1 - 0.5 * saindo);
        const rx = (1 - s) * -1.05 + Math.sin(vida * 1.7 + semente) * 0.07 * flutua;
        const ry = (1 - s) * 0.95 + Math.sin(vida * 1.3 + semente * 2.1) * 0.24 * flutua;
        const rz = Math.sin(vida * 1.1 + semente) * 0.04 * flutua;
        const opacidade = Math.min(1, s * 3) * (1 - saindo);
        const tex = texturas.get(ic.logo);
        const prof = ICONE.profundidade * (lado / ICONE.lado);
        return (
          <group key={`${ic.logo}-${i}`}>
            <mesh position={[ox + 18, -(y + 34), oz - prof - 10]} renderOrder={0}>
              <planeGeometry args={[lado * 1.9, lado * 1.9]} />
              <meshBasicMaterial transparent opacity={0.55 * opacidade} depthWrite={false} map={sombra} />
            </mesh>
            <group position={[ox, -y, oz]} rotation={[rx, ry, rz]} scale={escala}>
              <mesh geometry={geo(lado)} renderOrder={1}>
                <meshPhysicalMaterial
                  color="#ffffff"
                  roughness={0.32}
                  metalness={0}
                  clearcoat={1}
                  clearcoatRoughness={0.12}
                  envMapIntensity={0.85}
                  transparent
                  opacity={opacidade}
                />
              </mesh>
              {tex ? (
                <mesh position={[0, 0, prof / 2 + 0.6]} renderOrder={2}>
                  <planeGeometry args={[lado, lado]} />
                  <meshBasicMaterial map={tex} transparent opacity={opacidade} toneMapped={false} depthWrite={false} />
                </mesh>
              ) : null}
            </group>
          </group>
        );
      })}
    </>
  );
};
