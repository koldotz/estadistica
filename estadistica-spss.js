/* ============================================================
   Estadística Armairua · motor estadístico "a modo de SPSS"
   Funciones puras, sin dependencias ni DOM: se pueden testear
   con Node. La interfaz (index.html) llama a window.SPSS.
   Convención SPSS: varianza y desviación típica con n−1
   (cuasivarianza). La S² descriptiva del tema 2 usa ÷n; por eso
   se ofrece también varianzaN() y se avisa en la salida.
   ============================================================ */
(function(){
  const S = {};
  const sum = a => a.reduce((x,y)=>x+y, 0);
  const asNum = a => a.map(Number).filter(v=>Number.isFinite(v));

  /* ---------- descriptivos básicos ---------- */
  S.n        = a => a.length;
  S.suma     = a => sum(a);
  S.mean     = a => a.length ? sum(a)/a.length : NaN;
  S.min      = a => a.length ? Math.min(...a) : NaN;
  S.max      = a => a.length ? Math.max(...a) : NaN;
  S.rango    = a => a.length ? Math.max(...a) - Math.min(...a) : NaN;
  S.varianza = a => { const n=a.length; if(n<2) return NaN; const m=S.mean(a);
                      return sum(a.map(x=>(x-m)*(x-m)))/(n-1); };          // n−1 (SPSS)
  S.sd       = a => Math.sqrt(S.varianza(a));
  S.varianzaN= a => { const n=a.length; if(!n) return NaN; const m=S.mean(a);
                      return sum(a.map(x=>(x-m)*(x-m)))/n; };              // ÷n (descriptiva T2)
  S.sdN      = a => Math.sqrt(S.varianzaN(a));
  S.errorTipico = a => S.sd(a)/Math.sqrt(a.length);
  S.median = a => { const b=[...a].sort((x,y)=>x-y), n=b.length; if(!n) return NaN;
                    return n%2 ? b[(n-1)/2] : (b[n/2-1]+b[n/2])/2; };
  S.moda = a => { const m=new Map(); a.forEach(x=>m.set(x,(m.get(x)||0)+1));
    let best=0, modes=[]; m.forEach((c,v)=>{ if(c>best){best=c;modes=[v];} else if(c===best) modes.push(v); });
    modes.sort((x,y)=>x-y); return {modes, freq:best, amodal: best<=1}; };
  /* Percentil, método por defecto de SPSS Frecuencias (media ponderada,
     j = k(n+1)/100). Coincide con la fórmula del tema 2. */
  S.percentil = (a,k) => { const b=[...a].sort((x,y)=>x-y), n=b.length; if(!n) return NaN;
    const j = k*(n+1)/100;
    if(j<=1) return b[0];
    if(j>=n) return b[n-1];
    const i=Math.floor(j), d=j-i;                 // i = posición entera (1-based)
    return (1-d)*b[i-1] + d*b[i]; };
  /* Asimetría (G1) y curtosis (G2) con la corrección de sesgo de SPSS. */
  S.asimetria = a => { const n=a.length; if(n<3) return NaN; const m=S.mean(a), s=S.sd(a);
    if(!(s>0)) return NaN;
    return (n/((n-1)*(n-2))) * sum(a.map(x=>Math.pow((x-m)/s,3))); };
  S.eeAsimetria = n => n<3 ? NaN :
    Math.sqrt(6*n*(n-1)/((n-2)*(n+1)*(n+3)));
  S.curtosis = a => { const n=a.length; if(n<4) return NaN; const m=S.mean(a), s=S.sd(a);
    if(!(s>0)) return NaN;
    const S4 = sum(a.map(x=>Math.pow((x-m)/s,4)));
    return (n*(n+1)/((n-1)*(n-2)*(n-3)))*S4 - 3*(n-1)*(n-1)/((n-2)*(n-3)); };
  S.eeCurtosis = n => n<4 ? NaN :
    2*S.eeAsimetria(n)*Math.sqrt((n*n-1)/((n-3)*(n+5)));
  S.z = a => { const m=S.mean(a), s=S.sd(a); return a.map(x=>(x-m)/s); };

  /* ---------- funciones especiales (Numerical Recipes) ---------- */
  function gammln(xx){
    const cof=[76.18009172947146,-86.50532032941677,24.01409824083091,
      -1.231739572450155,0.1208650973866179e-2,-0.5395239384953e-5];
    let x=xx, y=xx, tmp=x+5.5; tmp-=(x+0.5)*Math.log(tmp);
    let ser=1.000000000190015;
    for(let j=0;j<6;j++){ y++; ser+=cof[j]/y; }
    return -tmp+Math.log(2.5066282746310005*ser/x);
  }
  function gser(a,x){ const ITMAX=300, EPS=3e-14; const gln=gammln(a);
    if(x<=0) return 0;
    let ap=a, del=1/a, sum=del;
    for(let i=0;i<ITMAX;i++){ ap++; del*=x/ap; sum+=del; if(Math.abs(del)<Math.abs(sum)*EPS) break; }
    return sum*Math.exp(-x+a*Math.log(x)-gln); }                 // P(a,x)
  function gcf(a,x){ const ITMAX=300, EPS=3e-14, FPMIN=1e-300; const gln=gammln(a);
    let b=x+1-a, c=1/FPMIN, d=1/b, h=d;
    for(let i=1;i<=ITMAX;i++){ const an=-i*(i-a); b+=2; d=an*d+b; if(Math.abs(d)<FPMIN) d=FPMIN;
      c=b+an/c; if(Math.abs(c)<FPMIN) c=FPMIN; d=1/d; const del=d*c; h*=del; if(Math.abs(del-1)<EPS) break; }
    return Math.exp(-x+a*Math.log(x)-gln)*h; }                   // Q(a,x)
  function gammp(a,x){ if(x<0||a<=0) return NaN; return x<a+1 ? gser(a,x) : 1-gcf(a,x); }
  function gammq(a,x){ if(x<0||a<=0) return NaN; return x<a+1 ? 1-gser(a,x) : gcf(a,x); }
  function betacf(a,b,x){ const MAXIT=300, EPS=3e-14, FPMIN=1e-300;
    const qab=a+b, qap=a+1, qam=a-1; let c=1, d=1-qab*x/qap;
    if(Math.abs(d)<FPMIN) d=FPMIN; d=1/d; let h=d;
    for(let m=1;m<=MAXIT;m++){ const m2=2*m;
      let aa=m*(b-m)*x/((qam+m2)*(a+m2)); d=1+aa*d; if(Math.abs(d)<FPMIN) d=FPMIN;
      c=1+aa/c; if(Math.abs(c)<FPMIN) c=FPMIN; d=1/d; h*=d*c;
      aa=-(a+m)*(qab+m)*x/((a+m2)*(qap+m2)); d=1+aa*d; if(Math.abs(d)<FPMIN) d=FPMIN;
      c=1+aa/c; if(Math.abs(c)<FPMIN) c=FPMIN; d=1/d; const del=d*c; h*=del;
      if(Math.abs(del-1)<EPS) break; }
    return h; }
  function betai(a,b,x){ if(x<=0) return 0; if(x>=1) return 1;
    const bt=Math.exp(gammln(a+b)-gammln(a)-gammln(b)+a*Math.log(x)+b*Math.log(1-x));
    return x<(a+1)/(a+b+2) ? bt*betacf(a,b,x)/a : 1-bt*betacf(b,a,1-x)/b; }

  /* ---------- distribuciones ---------- */
  S.normalCDF = z => 0.5*(1+erf(z/Math.SQRT2));
  function erf(x){ // Abramowitz & Stegun 7.1.26
    const t=1/(1+0.3275911*Math.abs(x));
    const y=1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-0.284496736)*t+0.254829592)*t*Math.exp(-x*x);
    return x>=0 ? y : -y; }
  S.tSig2  = (t,df) => (!isFinite(t)||df<=0) ? NaN : betai(df/2, 0.5, df/(df+t*t)); // p bilateral
  S.tCDF   = (t,df) => { const x=betai(df/2,0.5, df/(df+t*t))/2; return t>=0 ? 1-x : x; };
  S.tCrit  = (conf,df) => { const p=1-(1-conf)/2; let lo=0, hi=2000;   // t de dos colas
    for(let i=0;i<200;i++){ const mid=(lo+hi)/2; (S.tCDF(mid,df)<p) ? lo=mid : hi=mid; }
    return (lo+hi)/2; };
  S.chiSig = (x,df) => (x<0||df<=0) ? NaN : gammq(df/2, x/2);          // P(χ² > x)

  /* ---------- inferencia ---------- */
  S.pearson = (a,b) => { const n=Math.min(a.length,b.length);
    const ma=S.mean(a.slice(0,n)), mb=S.mean(b.slice(0,n));
    let sab=0,saa=0,sbb=0;
    for(let i=0;i<n;i++){ const da=a[i]-ma, db=b[i]-mb; sab+=da*db; saa+=da*da; sbb+=db*db; }
    const r=sab/Math.sqrt(saa*sbb);
    const df=n-2;
    const t=r*Math.sqrt(df/(1-r*r));
    return {r, n, df, sig: S.tSig2(t,df)}; };
  /* Prueba T para una muestra sobre datos crudos. */
  S.tUnaMuestra = (a, mu0, conf) => { conf=conf||0.95; const n=a.length, m=S.mean(a),
    s=S.sd(a), ee=s/Math.sqrt(n), df=n-1, t=(m-mu0)/ee, dif=m-mu0, tc=S.tCrit(conf,df);
    return {n, media:m, sd:s, ee, df, t, sig:S.tSig2(t,df), dif,
            ic:[dif - tc*ee, dif + tc*ee], conf}; };

  /* ---------- tabla de frecuencias ---------- */
  S.frecuencias = a => { const m=new Map(); a.forEach(x=>m.set(x,(m.get(x)||0)+1));
    const vals=[...m.keys()].sort((x,y)=>x-y); const n=a.length; let acAbs=0;
    const filas=vals.map(v=>{ const f=m.get(v); acAbs+=f;
      return {valor:v, f, pct:100*f/n, pctAcum:100*acAbs/n}; });
    return {filas, n}; };
  S.descriptivos = a => ({ n:a.length, min:S.min(a), max:S.max(a), suma:S.suma(a),
    media:S.mean(a), sd:S.sd(a), varianza:S.varianza(a), ee:S.errorTipico(a),
    mediana:S.median(a), moda:S.moda(a), rango:S.rango(a),
    varianzaN:S.varianzaN(a), sdN:S.sdN(a),
    asimetria:S.asimetria(a), eeAsimetria:S.eeAsimetria(a.length),
    curtosis:S.curtosis(a), eeCurtosis:S.eeCurtosis(a.length),
    p25:S.percentil(a,25), p50:S.percentil(a,50), p75:S.percentil(a,75) });

  /* ---------- tablas cruzadas (χ², φ, V de Cramer) ---------- */
  /* filas/cols: valores categóricos alineados; pesos: recuento opcional por fila. */
  S.tablaCruzada = (filaVar, colVar, pesos) => {
    const n0=Math.min(filaVar.length, colVar.length);
    const rCats=[], cCats=[];
    const key = v => String(v);
    const rIndex=new Map(), cIndex=new Map();
    for(let i=0;i<n0;i++){
      const rk=key(filaVar[i]), ck=key(colVar[i]);
      if(!rIndex.has(rk)){ rIndex.set(rk, rCats.length); rCats.push(rk); }
      if(!cIndex.has(ck)){ cIndex.set(ck, cCats.length); cCats.push(ck); }
    }
    ordena(rCats); ordena(cCats);   // numéricas ascendente; texto en orden de entrada
    rCats.forEach((v,i)=>rIndex.set(v,i)); cCats.forEach((v,i)=>cIndex.set(v,i));
    const R=rCats.length, C=cCats.length;
    const obs=Array.from({length:R},()=>new Array(C).fill(0));
    for(let i=0;i<n0;i++){ const w = pesos ? Number(pesos[i])||0 : 1;
      obs[rIndex.get(key(filaVar[i]))][cIndex.get(key(colVar[i]))] += w; }
    const rowT=obs.map(r=>sum(r));
    const colT=cCats.map((_,j)=>sum(obs.map(r=>r[j])));
    const n=sum(rowT);
    const esp=obs.map((r,i)=>r.map((_,j)=>rowT[i]*colT[j]/n));
    let chi2=0; for(let i=0;i<R;i++) for(let j=0;j<C;j++){ const e=esp[i][j];
      if(e>0) chi2+=Math.pow(obs[i][j]-e,2)/e; }
    const df=(R-1)*(C-1);
    const k=Math.min(R,C);
    const phi=Math.sqrt(chi2/n);
    const cramer=Math.sqrt(chi2/(n*(k-1)));
    return {rCats, cCats, obs, esp, rowT, colT, n, chi2, df,
            sig:S.chiSig(chi2,df), phi, cramer, es2x2:(R===2&&C===2)};
    function ordena(cats){ // ordena in-place: numéricas ascendente; texto se deja como entró
      if(cats.every(v=>v!=="" && Number.isFinite(Number(v))))
        cats.sort((x,y)=>Number(x)-Number(y)); }
  };

  S.limpiaColumna = asNum;   // convierte una columna a números válidos
  if(typeof window!=="undefined") window.SPSS = S;
  if(typeof module!=="undefined" && module.exports) module.exports = S;
})();
