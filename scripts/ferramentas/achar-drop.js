// Instante em que a música "entra" (maior salto de energia entre 2 s antes e 2 s depois)
// dentro de uma janela. Conferir depois com a grade de batida: o salto pode ser um prato
// antes do grave (na Vlog Hip-Hop o salto deu 63,88 s e o grave entra em 64,54 s).
//   node scripts/ferramentas/achar-drop.js <arquivo.mp3> <de s> <ate s>
// dentro da janela [de, ate]; refina pro pico de ataque mais próximo
const { execFileSync } = require("child_process");
const [f, de, ate] = [process.argv[2], +process.argv[3], +process.argv[4]];
const SR = 11025, HOP = 128;
const buf = execFileSync("ffmpeg", ["-v","error","-i",f,"-ac","1","-ar",String(SR),"-f","f32le","-"], {maxBuffer: 1<<30});
const x = new Float32Array(buf.buffer, buf.byteOffset, buf.length/4);
const n = Math.floor(x.length/HOP), fps = SR/HOP, env = new Float32Array(n);
for (let i=0;i<n;i++){let s=0;for(let k=0;k<HOP;k++){const v=x[i*HOP+k];s+=v*v;}env[i]=Math.sqrt(s/HOP);}
const media=(a,b)=>{let s=0;for(let i=a;i<b;i++)s+=env[i];return s/(b-a);};
let best=-1,bt=0; const W=Math.round(2*fps);
for(let i=Math.round(de*fps);i<Math.round(ate*fps);i++){const r=media(i,i+W)/(media(i-W,i)+1e-6); if(r>best){best=r;bt=i;}}
let pk=bt,pv=0; for(let i=bt-Math.round(0.15*fps);i<bt+Math.round(0.15*fps);i++){const d=env[i+1]-env[i]; if(d>pv){pv=d;pk=i;}}
console.log(`${f}: drop em ${(pk/fps).toFixed(2)} s (energia x${best.toFixed(1)})`);
