// BPM fino e fase da grade de batidas num trecho da música (pra encaixar fala e cortes).
//   node scripts/ferramentas/grade-batida.js <arquivo.mp3> <de s> <ate s>
const { execFileSync } = require("child_process");
const [f, de, ate] = [process.argv[2], +process.argv[3], +process.argv[4]];
const SR = 22050, HOP = 64;
const buf = execFileSync("ffmpeg", ["-v","error","-ss",String(de),"-to",String(ate),"-i",f,"-ac","1","-ar",String(SR),"-af","highpass=f=40,lowpass=f=8000","-f","f32le","-"], {maxBuffer: 1<<30});
const x = new Float32Array(buf.buffer, buf.byteOffset, buf.length/4);
const n = Math.floor(x.length/HOP), fps = SR/HOP, env = new Float32Array(n);
for (let i=0;i<n;i++){let s=0;for(let k=0;k<HOP;k++){const v=x[i*HOP+k];s+=v*v;}env[i]=Math.log(1e-6+Math.sqrt(s/HOP));}
const on = new Float32Array(n); for(let i=1;i<n;i++) on[i]=Math.max(0, env[i]-env[i-1]);
let best={s:-1};
for (let bpm=110; bpm<=135; bpm+=0.05){const per=fps*60/bpm;
  for (let ph=0; ph<per; ph+=0.5){let s=0,c=0; for(let k=ph;k<n;k+=per){const i=Math.round(k); s+=Math.max(on[i]||0,on[i-1]||0,on[i+1]||0); c++;} s/=c; if(s>best.s) best={s,bpm,ph};}}
const periodo = 60/best.bpm, fase = de + best.ph/fps;
// fase de compasso: qual das 4 batidas tem mais ataque
const forca=[0,0,0,0]; let k=0; for(let t=fase;t<ate;t+=periodo,k++){const i=Math.round((t-de)*fps); forca[k%4]+=Math.max(on[i]||0,on[i-1]||0,on[i+1]||0);}
console.log(JSON.stringify({bpm:+best.bpm.toFixed(2), periodo:+periodo.toFixed(5), primeiraBatida:+fase.toFixed(4), forcaPorTempo:forca.map(v=>+v.toFixed(1))}));
