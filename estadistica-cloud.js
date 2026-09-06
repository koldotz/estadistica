/* ============================================================
   Estadística Armairua · capa de sincronización con Supabase
   Sin dependencias: llamadas directas a la API REST (PostgREST).
   Si config.js está vacío, todo sigue funcionando en local.
   ============================================================ */
(function(){
  const C = window.EST_CONFIG || {};
  const URL_ = (C.SUPABASE_URL || "").replace(/\/+$/,"");
  const KEY  = C.SUPABASE_ANON_KEY || "";
  const ON   = !!(URL_ && KEY);

  const H = extra => Object.assign({
    "apikey": KEY,
    "Authorization": "Bearer " + KEY,
    "Content-Type": "application/json"
  }, extra||{});

  async function req(ruta, opts){
    const r = await fetch(URL_ + "/rest/v1/" + ruta, opts);
    if(!r.ok){
      const t = await r.text().catch(()=> "");
      throw new Error("Supabase " + r.status + ": " + t.slice(0,300));
    }
    return r.status === 204 ? null : r.json();
  }
  const sel = (tabla, q) => req(tabla + "?" + q, {headers:H()});
  const upsert = (tabla, filas, conflicto) => req(
    tabla + (conflicto ? "?on_conflict=" + conflicto : ""),
    {method:"POST", headers:H({"Prefer":"resolution=merge-duplicates,return=representation"}),
     body: JSON.stringify(Array.isArray(filas)?filas:[filas])});

  const Cloud = {
    activo: ON,
    /* Perfil por nombre, sin contraseña: lo crea si no existe. */
    async entrar(nombre){
      const n = nombre.trim();
      if(!n) throw new Error("El nombre no puede estar vacío.");
      const ya = await sel("perfiles", "nombre=eq." + encodeURIComponent(n) + "&select=id,nombre");
      if(ya && ya.length) return ya[0];
      const nuevo = await upsert("perfiles", {nombre:n}, "nombre");
      return nuevo[0];
    },
    async descargar(perfilId){
      const p = "perfil_id=eq." + perfilId;
      const [progreso, respuestas, notas, simulacros] = await Promise.all([
        sel("progreso",   p + "&select=fecha,hecho"),
        sel("respuestas", p + "&select=ejercicio,respuesta,correcta"),
        sel("notas",      p + "&select=ambito,clave,texto"),
        sel("simulacros", p + "&select=id,fecha,aciertos,errores,blancos,nota,comentario&order=fecha.asc")
      ]);
      return {progreso, respuestas, notas, simulacros};
    },
    guardarProgreso: (perfilId, fecha, hecho) =>
      upsert("progreso", {perfil_id:perfilId, fecha, hecho, actualizado:new Date().toISOString()}, "perfil_id,fecha"),
    guardarRespuesta: (perfilId, ejercicio, respuesta, correcta) =>
      upsert("respuestas", {perfil_id:perfilId, ejercicio, respuesta:String(respuesta), correcta,
        actualizado:new Date().toISOString()}, "perfil_id,ejercicio"),
    guardarNota: (perfilId, ambito, clave, texto) =>
      upsert("notas", {perfil_id:perfilId, ambito, clave, texto, actualizado:new Date().toISOString()},
        "perfil_id,ambito,clave"),
    guardarSimulacro: (perfilId, s) =>
      upsert("simulacros", Object.assign({perfil_id:perfilId}, s)),
    borrarSimulacro: (id) =>
      req("simulacros?id=eq." + id, {method:"DELETE", headers:H({"Prefer":"return=minimal"})}),
    /* Sube todo el estado local de una vez (primera vez que entras con un perfil). */
    async subirTodo(perfilId, est){
      const t = new Date().toISOString();
      const jobs = [];
      const prog = Object.entries(est.hechos||{}).filter(([,v])=>v)
        .map(([fecha])=>({perfil_id:perfilId, fecha, hecho:true, actualizado:t}));
      if(prog.length) jobs.push(upsert("progreso", prog, "perfil_id,fecha"));
      const resp = Object.entries(est.respu||{})
        .map(([ej,v])=>({perfil_id:perfilId, ejercicio:+ej, respuesta:String(v), correcta:null, actualizado:t}));
      if(resp.length) jobs.push(upsert("respuestas", resp, "perfil_id,ejercicio"));
      const nots = Object.entries(est.notas||{}).filter(([,v])=>v && v.trim())
        .map(([k,texto])=>{ const i=k.indexOf(":");
          return {perfil_id:perfilId, ambito:k.slice(0,i), clave:k.slice(i+1), texto, actualizado:t}; });
      if(nots.length) jobs.push(upsert("notas", nots, "perfil_id,ambito,clave"));
      await Promise.all(jobs);
    }
  };
  window.Cloud = Cloud;
})();
