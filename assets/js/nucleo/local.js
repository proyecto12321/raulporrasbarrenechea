/* =====================================================================
   BASE DE DATOS LOCAL
   ---------------------------------------------------------------------
   Un cliente con la misma forma que el de Supabase, pero que trabaja
   contra el navegador. Sirve para que el sistema funcione siempre:

     · sin conexión,
     · sin haber configurado Supabase,
     · y aunque la base remota se haya quedado atrás.

   No es un simulacro: guarda de verdad. Lo que se registra aquí queda en
   el navegador (localStorage) y sigue estando al volver, incluso después
   de cerrar. Los datos de arranque son los mismos del SQL (semilla.js).

   La clave del diseño está en que imita la *interfaz* de Supabase:

       db.from('estudiantes').select('*').eq('grado', '1.er grado').order('apellidos')

   se escribe igual contra los dos. Por eso ni datos.js ni los paneles
   saben con cuál están hablando, y cambiar de uno a otro es una línea en
   config.js. Es la misma razón por la que el patrón repositorio existe.
   ===================================================================== */
'use strict';

const BaseLocal = (() => {

  const LLAVE   = 'rpb_base_local_v2';
  const TABLAS  = [
    'usuarios','estudiantes','grados','cursos','matriculas','notas','tareas',
    'entregas','asistencia','documentos','constancias','comunicados','lecturas',
    'mensajes','notificaciones','solicitudes','tickets','pagos','auditoria',
    'reportes','consultas','intentos_acceso','imagenes','config_sistema',
    'evaluaciones_docentes',
  ];

  let base = null;

  /* ------------------------------------------------------------------
     1. ARRANQUE Y PERSISTENCIA
     ------------------------------------------------------------------ */
  function semillaCompleta(){
    const b = {};
    TABLAS.forEach(t => b[t] = []);

    const ahora = new Date().toISOString();
    const haceHoras = h => new Date(Date.now() - h * 3600000).toISOString();

    b.usuarios    = (SEMILLA.usuarios    || []).map(u => ({ ...u, creado_en: haceHoras(720) }));
    b.grados      = (SEMILLA.grados      || []).map(g => ({ ...g, creado_en: haceHoras(720) }));
    b.cursos      = (SEMILLA.cursos      || []).map(c => ({ ...c, creado_en: haceHoras(720) }));
    b.config_sistema = (SEMILLA.config_sistema || []).map(c => ({ ...c, creado_en: haceHoras(720) }));
    b.estudiantes = (SEMILLA.estudiantes || []).map((e, i) => ({
      ...e, creado_en: haceHoras(600 - i), actualizado_en: haceHoras(600 - i),
    }));
    b.comunicados = (SEMILLA.comunicados || []).map((c, i) => ({
      ...c, creado_en: haceHoras(i * 26 + 3),
    }));

    /* La matrícula y el pago de cada estudiante se derivan del padrón, en
       vez de repetir 65 filas más en el archivo de semilla. */
    b.matriculas = b.estudiantes.map((e, i) => ({
      id: i + 1, estudiante_id: e.id, dni: e.dni, anio: e.anio, grado: e.grado,
      seccion: e.seccion, estado: 'Activa', monto: 300, ms: 0,
      registrado_por: 'Carga inicial SIAGIE', creado_en: e.creado_en,
    }));
    b.pagos = b.estudiantes.map((e, i) => ({
      id: i + 1, estudiante_id: e.id, dni: e.dni, concepto: 'Matrícula',
      mes: 'Marzo', monto: 300, estado: 'Pagado', fecha_pago: '2026-03-05',
      registrado_por: 'Carga inicial SIAGIE', creado_en: e.creado_en,
    }));

    b.__secuencias = {};
    TABLAS.forEach(t => {
      b.__secuencias[t] = (b[t] || []).reduce((m, f) => Math.max(m, +f.id || 0), 0);
    });
    b.__creada = ahora;
    b.__version = 2;
    return b;
  }

  function cargar(){
    if (base) return base;
    try {
      const crudo = localStorage.getItem(LLAVE);
      if (crudo){
        const guardada = JSON.parse(crudo);
        if (guardada && guardada.__version === 2){
          base = guardada;
          /* Si el sistema estrena una tabla, aparece vacía en vez de romper. */
          TABLAS.forEach(t => { if (!Array.isArray(base[t])) base[t] = []; });
          if (!base.__secuencias) base.__secuencias = {};
          return base;
        }
      }
    } catch(e){
      console.warn('[BaseLocal] No se pudo leer lo guardado; se empieza de nuevo.', e);
    }
    base = semillaCompleta();
    guardar();
    return base;
  }

  let pendiente = null;
  function guardar(){
    /* Se agrupan las escrituras: en una importación de 65 filas no tiene
       sentido serializar la base entera 65 veces. */
    if (pendiente) return;
    pendiente = setTimeout(() => {
      pendiente = null;
      try {
        localStorage.setItem(LLAVE, JSON.stringify(base));
      } catch(e){
        console.warn('[BaseLocal] El navegador no dejó guardar (¿sin espacio?).', e);
      }
    }, 40);
  }

  function reiniciar(){
    base = semillaCompleta();
    try { localStorage.setItem(LLAVE, JSON.stringify(base)); } catch(e){}
    return base;
  }

  /* ------------------------------------------------------------------
     2. TIEMPO REAL
     ---------------------------------------------------------------------
     Los canales de Supabase avisan cuando una tabla cambia. Aquí se hace
     lo mismo con un bus de eventos: en la misma pestaña, al instante; y
     entre pestañas del mismo navegador, por el evento 'storage'.
     ------------------------------------------------------------------ */
  const oyentes = new Set();

  function avisar(tabla, tipo, fila){
    const carga = { eventType: tipo, table: tabla, new: fila, old: fila, schema: 'public' };
    oyentes.forEach(o => {
      if (o.tabla && o.tabla !== tabla) return;
      try { o.fn(carga); } catch(e){ console.error(e); }
    });
  }

  if (typeof addEventListener === 'function'){
    addEventListener('storage', e => {
      if (e.key !== LLAVE) return;
      base = null;                 /* otra pestaña escribió: se relee */
      oyentes.forEach(o => {
        try { o.fn({ eventType: 'SYNC', table: o.tabla, new: null }); } catch(err){}
      });
    });
  }

  /* ------------------------------------------------------------------
     3. FILTROS
     ------------------------------------------------------------------ */
  const texto = v => v == null ? '' : String(v);

  function deComodin(patron){
    const escapado = texto(patron).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp('^' + escapado.replace(/%/g, '.*').replace(/_/g, '.') + '$', 'i');
  }

  /* Traduce la sintaxis "campo.operador.valor,campo.operador.valor" que usa
     PostgREST en .or() a una función que evalúa la fila. */
  function deOr(expresion){
    const partes = texto(expresion).split(',').map(p => {
      const primero = p.indexOf('.');
      const segundo = p.indexOf('.', primero + 1);
      if (primero < 0 || segundo < 0) return () => false;
      const campo = p.slice(0, primero);
      const op    = p.slice(primero + 1, segundo);
      const valor = p.slice(segundo + 1);
      if (op === 'ilike' || op === 'like'){
        const re = deComodin(valor);
        return f => re.test(texto(f[campo]));
      }
      if (op === 'neq') return f => texto(f[campo]) !== valor;
      if (op === 'gte') return f => f[campo] != null && f[campo] >= valor;
      if (op === 'lte') return f => f[campo] != null && f[campo] <= valor;
      if (op === 'is')  return f => valor === 'null' ? f[campo] == null : texto(f[campo]) === valor;
      return f => texto(f[campo]) === valor;                 /* eq */
    });
    return f => partes.some(p => p(f));
  }

  /* ------------------------------------------------------------------
     4. CONSTRUCTOR DE CONSULTAS  (la misma forma que Supabase)
     ------------------------------------------------------------------ */
  function consulta(tabla){
    const st = {
      tabla, filtros: [], orden: null, limite: null, rango: null,
      columnas: '*', contar: false, soloCabeza: false,
      op: 'select', carga: null, unico: null,
    };

    const api = {
      select(columnas, opciones){
        if (st.op === 'select') st.columnas = columnas || '*';
        if (opciones){
          st.contar = opciones.count === 'exact';
          st.soloCabeza = !!opciones.head;
        }
        return api;
      },
      insert(v){ st.op = 'insert'; st.carga = v; return api; },
      upsert(v){ st.op = 'upsert'; st.carga = v; return api; },
      update(v){ st.op = 'update'; st.carga = v; return api; },
      delete(){ st.op = 'delete'; return api; },

      eq(c, v){  st.filtros.push(f => texto(f[c]) === texto(v)); return api; },
      neq(c, v){ st.filtros.push(f => texto(f[c]) !== texto(v)); return api; },
      in(c, v){  const s = (v || []).map(texto); st.filtros.push(f => s.includes(texto(f[c]))); return api; },
      gt(c, v){  st.filtros.push(f => f[c] != null && f[c] >  v); return api; },
      gte(c, v){ st.filtros.push(f => f[c] != null && f[c] >= v); return api; },
      lt(c, v){  st.filtros.push(f => f[c] != null && f[c] <  v); return api; },
      lte(c, v){ st.filtros.push(f => f[c] != null && f[c] <= v); return api; },
      is(c, v){  st.filtros.push(f => v === null ? f[c] == null : f[c] === v); return api; },
      not(c, op, v){
        if (op === 'is' && v === null) st.filtros.push(f => f[c] != null);
        else st.filtros.push(f => texto(f[c]) !== texto(v));
        return api;
      },
      ilike(c, p){ const re = deComodin(p); st.filtros.push(f => re.test(texto(f[c]))); return api; },
      like(c, p){  const re = deComodin(p); st.filtros.push(f => re.test(texto(f[c]))); return api; },
      or(expresion){ st.filtros.push(deOr(expresion)); return api; },

      order(campo, opciones){
        st.orden = { campo, asc: !opciones || opciones.ascending !== false };
        return api;
      },
      limit(n){ st.limite = n; return api; },
      range(a, b){ st.rango = [a, b]; return api; },
      maybeSingle(){ st.unico = 'quizas'; return api; },
      single(){ st.unico = 'exacto'; return api; },

      /* Es "thenable": se comporta como una promesa al hacerle await. */
      then(alCumplir, alFallar){ return Promise.resolve(correr(st)).then(alCumplir, alFallar); },
      catch(fn){ return Promise.resolve(correr(st)).catch(fn); },
      finally(fn){ return Promise.resolve(correr(st)).finally(fn); },
    };
    return api;
  }

  /* ------------------------------------------------------------------
     5. EJECUCIÓN
     ------------------------------------------------------------------ */
  function error(mensaje, codigo){
    return { data: null, error: { message: mensaje, code: codigo || 'LOCAL', details: null, hint: null }, count: null };
  }

  function siguienteId(tabla){
    const b = cargar();
    b.__secuencias[tabla] = (b.__secuencias[tabla] || 0) + 1;
    return b.__secuencias[tabla];
  }

  function recortar(fila, columnas){
    if (!columnas || columnas === '*' || columnas.includes('*')) return { ...fila };
    const pedidas = columnas.split(',').map(c => c.trim()).filter(Boolean);
    const salida = {};
    pedidas.forEach(c => { salida[c] = fila[c]; });
    return salida;
  }

  function correr(st){
    const b = cargar();
    const tabla = b[st.tabla];
    if (!tabla) return error(`La tabla "${st.tabla}" no existe en la base local.`, 'LOCAL_TABLA');

    /* ---- Escrituras ---- */
    if (st.op === 'insert' || st.op === 'upsert'){
      const lista = Array.isArray(st.carga) ? st.carga : [st.carga];
      const creadas = [];
      for (const bruta of lista){
        if (!bruta) continue;
        const fila = { ...bruta };
        if (fila.id == null) fila.id = siguienteId(st.tabla);
        else b.__secuencias[st.tabla] = Math.max(b.__secuencias[st.tabla] || 0, +fila.id || 0);
        if (fila.creado_en == null) fila.creado_en = new Date().toISOString();

        const yaEsta = st.op === 'upsert'
          ? tabla.findIndex(f => String(f.id) === String(fila.id))
          : -1;
        if (yaEsta >= 0) tabla[yaEsta] = { ...tabla[yaEsta], ...fila };
        else tabla.push(fila);
        creadas.push(fila);
      }
      guardar();
      creadas.forEach(f => avisar(st.tabla, 'INSERT', f));
      const datos = creadas.map(f => recortar(f, st.columnas));
      if (st.unico) return { data: datos[0] || null, error: null, count: datos.length };
      return { data: datos, error: null, count: datos.length };
    }

    if (st.op === 'update'){
      const tocadas = [];
      tabla.forEach((f, i) => {
        if (!st.filtros.every(p => p(f))) return;
        tabla[i] = { ...f, ...st.carga };
        if ('actualizado_en' in f) tabla[i].actualizado_en = new Date().toISOString();
        tocadas.push(tabla[i]);
      });
      guardar();
      tocadas.forEach(f => avisar(st.tabla, 'UPDATE', f));
      if (st.unico === 'exacto' && !tocadas.length)
        return error('No se encontró el registro que se quería actualizar.', 'PGRST116');
      const datos = tocadas.map(f => recortar(f, st.columnas));
      if (st.unico) return { data: datos[0] || null, error: null, count: datos.length };
      return { data: datos, error: null, count: datos.length };
    }

    if (st.op === 'delete'){
      const quedan = [], fuera = [];
      tabla.forEach(f => (st.filtros.every(p => p(f)) ? fuera : quedan).push(f));
      b[st.tabla] = quedan;
      guardar();
      fuera.forEach(f => avisar(st.tabla, 'DELETE', f));
      return { data: fuera, error: null, count: fuera.length };
    }

    /* ---- Lectura ---- */
    let filas = tabla.filter(f => st.filtros.every(p => p(f)));
    const total = filas.length;

    if (st.orden){
      const { campo, asc } = st.orden;
      filas = filas.slice().sort((a, c) => {
        const x = a[campo], y = c[campo];
        if (x == null && y == null) return 0;
        if (x == null) return 1;            /* los vacíos, al final */
        if (y == null) return -1;
        const cmp = typeof x === 'number' && typeof y === 'number'
          ? x - y
          : String(x).localeCompare(String(y), 'es', { numeric: true, sensitivity: 'base' });
        return asc ? cmp : -cmp;
      });
    }

    if (st.rango) filas = filas.slice(st.rango[0], st.rango[1] + 1);
    if (st.limite != null) filas = filas.slice(0, st.limite);

    if (st.soloCabeza) return { data: null, error: null, count: total };

    if (st.unico === 'exacto'){
      if (filas.length !== 1)
        return error(filas.length ? 'Se esperaba un solo registro.' : 'No se encontró el registro.', 'PGRST116');
      return { data: recortar(filas[0], st.columnas), error: null, count: 1 };
    }
    if (st.unico === 'quizas'){
      return { data: filas[0] ? recortar(filas[0], st.columnas) : null, error: null, count: filas.length };
    }
    return { data: filas.map(f => recortar(f, st.columnas)), error: null, count: total };
  }

  /* ------------------------------------------------------------------
     6. EL CLIENTE
     ------------------------------------------------------------------ */
  function cliente(){
    return {
      __local: true,
      from: consulta,
      channel(nombre){
        const propios = [];
        const canal = {
          on(_evento, opciones, fn){
            const o = { tabla: (opciones && opciones.table) || null, fn };
            oyentes.add(o); propios.push(o);
            return canal;
          },
          subscribe(){ return canal; },
          __propios: propios,
        };
        return canal;
      },
      removeChannel(canal){
        if (canal && canal.__propios) canal.__propios.forEach(o => oyentes.delete(o));
      },
    };
  }

  /* Cuántas filas hay en cada tabla: lo usa el panel de soporte. */
  function resumen(){
    const b = cargar();
    const r = {};
    TABLAS.forEach(t => r[t] = (b[t] || []).length);
    return r;
  }

  /* Copia completa, para el respaldo del panel de soporte. */
  function exportar(){
    const b = cargar();
    const copia = {};
    TABLAS.forEach(t => copia[t] = b[t]);
    return copia;
  }

  /* ------------------------------------------------------------------
     7. CLIENTE REMOTO CON RED DE SEGURIDAD
     ---------------------------------------------------------------------
     Envuelve al cliente de Supabase. Cada consulta se *graba* como una
     lista de pasos —from, select, eq, order…— en vez de ejecutarse de
     inmediato. Al pedir el resultado se reproduce contra Supabase; si
     Supabase contesta con un fallo de esquema, de tabla inexistente o de
     red, la misma lista se reproduce contra la base local y el sistema
     sigue andando.

     Un error del negocio (un DNI duplicado, un permiso denegado) NO
     dispara el respaldo: ese error tiene que llegarle al usuario tal cual.
     ------------------------------------------------------------------ */
  const METODOS = [
    'select','insert','upsert','update','delete',
    'eq','neq','in','gt','gte','lt','lte','is','not','ilike','like','or',
    'order','limit','range','maybeSingle','single',
  ];

  function esFalloDeInfraestructura(e){
    if (!e) return false;
    const codigo = String(e.code || '');
    const msg = String(e.message || e.details || '').toLowerCase();
    if (codigo.startsWith('PGRST2')) return true;             /* esquema/tabla */
    return /schema cache|does not exist|relation .* does not exist|failed to fetch|networkerror|load failed|jwt|invalid api key|no api key/.test(msg);
  }

  function conRespaldo(remoto, alCaer){
    const local = cliente();
    let caido = false;

    const reproducir = (destino, pasos) =>
      pasos.reduce((q, [metodo, args]) => q[metodo](...args), destino);

    function caer(e){
      if (caido) return;
      caido = true;
      console.warn('[BaseLocal] Supabase no está disponible o su esquema no coincide; ' +
                   'el sistema sigue con la base local. Ejecuta sql/00_ACTUALIZAR.sql ' +
                   'para volver a usar la base remota.', e);
      if (alCaer) { try { alCaer(e); } catch(err){} }
    }

    function grabadora(pasos){
      const api = {};
      METODOS.forEach(m => { api[m] = (...args) => grabadora(pasos.concat([[m, args]])); });

      const correr = async () => {
        if (!caido){
          try {
            const r = await reproducir(remoto, pasos);
            if (!r || !r.error) return r;
            if (!esFalloDeInfraestructura(r.error)) return r;
            caer(r.error);
          } catch(e){
            if (!esFalloDeInfraestructura(e)) throw e;
            caer(e);
          }
        }
        return reproducir(local, pasos);
      };

      api.then = (ok, mal) => correr().then(ok, mal);
      api.catch = fn => correr().catch(fn);
      api.finally = fn => correr().finally(fn);
      return api;
    }

    return {
      get __local(){ return caido; },
      __conRespaldo: true,
      from(tabla){ return grabadora([['from', [tabla]]]); },
      channel(nombre){
        try { return caido ? local.channel(nombre) : remoto.channel(nombre); }
        catch(e){ return local.channel(nombre); }
      },
      removeChannel(canal){
        try { (caido ? local : remoto).removeChannel(canal); } catch(e){}
      },
    };
  }

  return { cliente, conRespaldo, reiniciar, resumen, exportar, LLAVE };
})();
