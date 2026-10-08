// BPM (autocorrelação do ataque) e energia por segundo de uma música, em barrinhas.
// Serve pra achar música com introdução calma e entrada forte (a forma do roteiro).
//   node scripts/ferramentas/medir-musica.js <arquivo.mp3>
const { execFileSync } = require("child_process");
const f = process.argv[2];
const SR = 11025, HOP = 256;
const buf = execFileSync("ffmpeg", ["-v","error","-i",f,"-ac","1","-ar",String(SR),"-f","f32le","-"], {maxBuffer: 1<<30});
const x = new Float32Array(buf.buffer, buf.byteOffset, buf.length/4);
const n = Math.floor(x.length/HOP); const env = new Float32Array(n);
for (let i=0;i<n;i++){let s=0;for(let k=0;k<HOP;k++){const v=x[i*HOP+k];s+=v*v;}env[i]=Math.sqrt(s/HOP);}
const on = new Float32Array(n); for(let i=1;i<n;i++) on[i]=Math.max(0, Math.log(1e-4+env[i])-Math.log(1e-4+env[i-1]));
const fps = SR/HOP; let best=0, bl=0;
const scores=[];
for (let bpm=70; bpm<=180; bpm+=0.5){const lag=fps*60/bpm; let s=0;
  for(let i=0;i+lag*4<n;i++){const a=on[i]; s+=a*(lin(on,i+lag)+0.5*lin(on,i+2*lag)+0.25*lin(on,i+4*lag));}
  scores.push([bpm,s]); if(s>best){best=s;bl=bpm;}}
function lin(a,t){const i=Math.floor(t),fr=t-i;return a[i]*(1-fr)+(a[i+1]||0)*fr;}
const dur = x.length/SR;
const perSec=[];for(let s=0;s<Math.floor(dur);s++){let m=0,c=0;for(let i=Math.floor(s*fps);i<Math.floor((s+1)*fps)&&i<n;i++){m+=env[i];c++;}perSec.push(m/c);}
const mx=Math.max(...perSec); const bars=perSec.map(v=>" ▁▂▃▄▅▆▇█"[Math.min(8,Math.round(v/mx*8))]).join("");
console.log(`${f.padEnd(9)} ${dur.toFixed(0).padStart(3)}s  BPM ${bl}  |${bars}|`);
