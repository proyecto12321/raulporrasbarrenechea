/* =====================================================================
   CAPA DE DATOS (repositorios)
   ---------------------------------------------------------------------
   Ningún panel habla directamente con Supabase: todos pasan por aquí.
   Así, si mañana se cambia Supabase por MySQL + PHP, solo se reescribe
   este archivo y la interfaz no se entera.

   Cada repositorio ofrece las mismas cuatro operaciones (CRUD) más las
   consultas propias de su tabla. Todo devuelve promesas.
   ===================================================================== */
'use strict';

const Datos = (() => {

  /* ------------------------------------------------------------------
     Envoltura común: mide el tiempo, normaliza el error y lo traduce.
     ------------------------------------------------------------------ */
  async function ejecutar(consulta, etiqueta){
    if (!db) throw new Error('No hay conexión configurada con la base de datos.');
    const t0 = performance.now();
    const { data, error, count } = await consulta;
    const ms = Math.round(performance.now() - t0);
    if (error){
      console.error(`[Datos:${etiqueta}]`, error);
      const fallo = new Error(traducirError(error));
      fallo.original = error;          /* se conserva para poder reintentar */
      throw fallo;
    }
    return { datos: data, total: count, ms };
  }

  /* ------------------------------------------------------------------
     Escrituras tolerantes al esquema.

     Si la base todavía no tiene alguna columna nueva —porque no se corrió
     la migración, o porque el caché de PostgREST quedó viejo— Supabase
     responde PGRST204. Antes eso ensuciaba la consola en cada intento de
     acceso. Ahora se quita esa columna, se reintenta y el sistema sigue
     funcionando con lo que la base sí tiene; en la consola queda un aviso
     una sola vez con el archivo que hay que ejecutar.
     ------------------------------------------------------------------ */
  const columnasAusentes = new Set();
  const RE_COLUMNA = /could not find the '([^']+)' column/i;

  function podar(tabla, registro){
    if (!registro || typeof registro !== 'object') return registro;
    if (Array.isArray(registro)){
      const lista = registro.map(r => podar(tabla, r));
      return lista.some((r, i) => r !== registro[i]) ? lista : registro;
    }
    let quito = false;
    const limpio = {};
    for (const [campo, valor] of Object.entries(registro)){
      if (columnasAusentes.has(`${tabla}.${campo}`)){ quito = true; continue; }
      limpio[campo] = valor;
    }
    return quito ? limpio : registro;
  }

  function vacio(carga){
    return Array.isArray(carga)
      ? carga.every(r => !r || !Object.keys(r).length)
      : !carga || !Object.keys(carga).length;
  }

  async function escribir(tabla, etiqueta, armar, registro){
    let carga = podar(tabla, registro);
    for (let intento = 0; intento < 5; intento++){
      if (vacio(carga)) return { datos:null, total:0, ms:0 };
      try {
        return await ejecutar(armar(carga), etiqueta);
      } catch(e){
        const o = e.original || {};
        const columna = o.code === 'PGRST204'
          ? (RE_COLUMNA.exec(String(o.message || '')) || [])[1]
          : null;
        if (!columna) throw e;
        console.warn(
          `[Datos] La tabla "${tabla}" no tiene la columna "${columna}". Se guarda sin ella. ` +
          'Ejecuta sql/00_ACTUALIZAR.sql en Supabase para completar el esquema.');
        columnasAusentes.add(`${tabla}.${columna}`);
        const antes = carga;
        carga = podar(tabla, carga);
        if (carga === antes) throw e;   /* no había nada que quitar: error real */
      }
    }
    throw new Error('El esquema de la base no coincide con el sistema. Ejecuta sql/00_ACTUALIZAR.sql.');
  }

  function traducirError(e){
    const m = String(e.message || e.details || '').toLowerCase();
    if (m.includes('duplicate key') && m.includes('dni'))      return 'Ese DNI ya está registrado en el sistema.';
    if (m.includes('duplicate key') && m.includes('usuario'))  return 'Ese nombre de usuario ya existe.';
    if (m.includes('duplicate key') && m.includes('codigo'))   return 'Ese código ya fue usado.';
    if (m.includes('duplicate key'))                           return 'Ese registro ya existe (dato duplicado).';
    if (m.includes('violates foreign key'))                    return 'El registro está enlazado con otros datos y no se puede completar.';
    if (m.includes('violates check constraint'))               return 'Uno de los valores no está permitido para ese campo.';
    if (m.includes('violates row-level security'))             return 'Tu rol no tiene permiso para esta operación.';
    if (m.includes('not null'))                                return 'Falta completar un campo obligatorio.';
    if (m.includes('failed to fetch') || m.includes('network'))return 'Sin conexión con el servidor. Revisa tu internet.';
    if (m.includes('jwt') || m.includes('api key'))            return 'Las credenciales del sistema no son válidas. Avisa a soporte.';
    return e.message || 'No se pudo completar la operación.';
  }

  /* ------------------------------------------------------------------
     Fábrica de repositorios: todo lo repetitivo vive aquí.
     ------------------------------------------------------------------ */
  function repositorio(tabla, { orden = 'creado_en', desc = true } = {}){
    return {
      tabla,

      /* Lista con filtros simples: { campo: valor } */
      async listar(filtros = {}, opciones = {}){
        let c = db.from(tabla).select(opciones.columnas || '*', { count:'exact' });
        for (const [campo, valor] of Object.entries(filtros)){
          if (valor === undefined || valor === null || valor === '' || valor === 'todos') continue;
          if (Array.isArray(valor)) c = c.in(campo, valor);
          else if (typeof valor === 'object' && valor.like) c = c.ilike(campo, `%${Seg.filtroSeguro(valor.like)}%`);
          else if (typeof valor === 'object' && valor.desde) c = c.gte(campo, valor.desde);
          else c = c.eq(campo, valor);
        }
        c = c.order(opciones.orden || orden, { ascending: opciones.asc ?? !desc });
        if (opciones.limite) c = c.limit(opciones.limite);
        if (opciones.rango)  c = c.range(opciones.rango[0], opciones.rango[1]);
        const r = await ejecutar(c, `${tabla}.listar`);
        return { filas: r.datos || [], total: r.total ?? (r.datos || []).length, ms: r.ms };
      },

      async porId(id){
        const r = await ejecutar(db.from(tabla).select('*').eq('id', id).maybeSingle(), `${tabla}.porId`);
        return r.datos;
      },

      async buscarUno(filtros){
        let c = db.from(tabla).select('*');
        for (const [k, v] of Object.entries(filtros)) c = c.eq(k, v);
        const r = await ejecutar(c.maybeSingle(), `${tabla}.buscarUno`);
        return r.datos;
      },

      async crear(registro){
        const r = await escribir(tabla, `${tabla}.crear`,
          d => db.from(tabla).insert(d).select().single(), registro);
        return { fila: r.datos, ms: r.ms };
      },

      async crearVarios(registros){
        const r = await escribir(tabla, `${tabla}.crearVarios`,
          d => db.from(tabla).insert(d).select(), registros);
        return { filas: r.datos || [], ms: r.ms };
      },

      async actualizar(id, cambios){
        const r = await escribir(tabla, `${tabla}.actualizar`,
          d => db.from(tabla).update(d).eq('id', id).select().single(), cambios);
        return { fila: r.datos, ms: r.ms };
      },

      async eliminar(id){
        const r = await ejecutar(db.from(tabla).delete().eq('id', id), `${tabla}.eliminar`);
        return { ms: r.ms };
      },

      async contar(filtros = {}){
        let c = db.from(tabla).select('id', { count:'exact', head:true });
        for (const [k, v] of Object.entries(filtros)){
          if (v === undefined || v === null || v === '' || v === 'todos') continue;
          c = Array.isArray(v) ? c.in(k, v) : c.eq(k, v);
        }
        const r = await ejecutar(c, `${tabla}.contar`);
        return r.total || 0;
      },

      /* Escucha en vivo los cambios de la tabla (tiempo real). */
      escuchar(alCambiar, filtro){
        if (!db) return { cerrar(){} };
        const canal = db.channel(`vivo_${tabla}_${Math.random().toString(36).slice(2, 8)}`)
          .on('postgres_changes',
              { event:'*', schema:'public', table:tabla, ...(filtro ? { filter:filtro } : {}) },
              carga => { try { alCambiar(carga); } catch(e){ console.error(e); } })
          .subscribe();
        return { cerrar(){ try { db.removeChannel(canal); } catch {} } };
      },
    };
  }

  /* ==================================================================
     REPOSITORIOS
     ================================================================== */
  const usuarios      = repositorio('usuarios',      { orden:'nombres', desc:false });
  const estudiantes   = repositorio('estudiantes',   { orden:'apellidos', desc:false });
  const grados        = repositorio('grados',        { orden:'orden', desc:false });
  const cursos        = repositorio('cursos',        { orden:'nombre', desc:false });
  const matriculas    = repositorio('matriculas');
  const notas         = repositorio('notas');
  const tareas        = repositorio('tareas');
  const entregas      = repositorio('entregas');
  const asistencia    = repositorio('asistencia');
  const documentos    = repositorio('documentos');
  const constancias   = repositorio('constancias');
  const comunicados   = repositorio('comunicados');
  const mensajes      = repositorio('mensajes');
  const notificaciones= repositorio('notificaciones');
  const solicitudes   = repositorio('solicitudes');
  const tickets       = repositorio('tickets');
  const pagos         = repositorio('pagos');
  const auditoria     = repositorio('auditoria');
  const reportes      = repositorio('reportes');
  const consultas     = repositorio('consultas');
  const intentos      = repositorio('intentos_acceso');
  const config        = repositorio('config_sistema', { orden:'clave', desc:false });
  const evaluaciones  = repositorio('evaluaciones_docentes');
  const imagenes      = repositorio('imagenes', { orden:'clave', desc:false });

  /* ---- Imágenes del sistema (indicador 4: lo visual también se
     administra desde el sistema) -------------------------------------
     Aquí viven las fotos de las instalaciones y cualquier otra imagen
     que Soporte suba desde su panel. Se guardan en la base de datos
     (no en la carpeta assets/img ni en el navegador de una persona),
     así que lo que sube Soporte lo ve todo el mundo al instante, sin
     tocar archivos ni volver a publicar el sitio.

     Igual que config_sistema, esta tabla se identifica por "clave" y
     no por "id", así que las escrituras van por upsert. */
  let cacheImagenes = null;
  imagenes.todas = async function(forzar){
    if (cacheImagenes && !forzar) return cacheImagenes;
    const { filas } = await this.listar();
    cacheImagenes = Object.fromEntries(filas.filter(f => f.archivo).map(f => [f.clave, f.archivo]));
    return cacheImagenes;
  };
  imagenes.fijar = async function(clave, titulo, datos, descripcion){
    const existente = await this.buscarUno({ clave });
    /* Si no se manda foto nueva, se conserva la que ya estaba: así se
       puede corregir solo el nombre o la descripción de un lugar sin
       tener que volver a subir la imagen. */
    const archivo = datos !== undefined && datos !== null ? datos : (existente ? existente.archivo : null);
    await escribir('imagenes', 'imagenes.fijar',
      d => db.from('imagenes').upsert(d, { onConflict:'clave' }).select(),
      { ...(existente ? { id: existente.id } : {}), clave, titulo, archivo,
        ...(descripcion !== undefined ? { descripcion } : {}) });
    if (cacheImagenes && archivo) cacheImagenes[clave] = archivo;
    auditar(`Imagen actualizada: ${titulo || clave}`, 'Soporte');
    return archivo;
  };
  imagenes.quitar = async function(clave){
    const existente = await this.buscarUno({ clave });
    if (existente) await this.eliminar(existente.id);
    if (cacheImagenes) delete cacheImagenes[clave];
    auditar(`Imagen quitada: ${clave}`, 'Soporte');
  };

  /* ---- Configuración general (clave/valor) -------------------------
     Un solo lugar para ajustes que debe poder tocar Soporte y que se
     ven en todo el sistema (por ejemplo el logo). Se guarda en la base
     de datos —no en localStorage— para que lo que cambie Soporte lo
     vea todo el mundo, no solo su propio navegador. */
  let cacheConfig = null;
  config.obtenerTodo = async function(forzar){
    if (cacheConfig && !forzar) return cacheConfig;
    const { filas } = await this.listar();
    cacheConfig = Object.fromEntries(filas.map(f => [f.clave, f.valor]));
    return cacheConfig;
  };
  config.obtener = async function(clave, porDefecto = null){
    const todo = await this.obtenerTodo();
    return todo[clave] ?? porDefecto;
  };
  config.fijar = async function(clave, valor, descripcion){
    /* Ojo: en la tabla real la llave es "clave" (texto), no "id" —a
       diferencia del resto de tablas del sistema. Por eso no se usa
       this.actualizar()/crear() del repositorio genérico (que buscan por
       "id" y fallarían contra Supabase), sino un upsert directo por
       "clave". Se busca primero el registro local (si existe) para que
       la base local, que sí usa "id" internamente, actualice la misma
       fila en vez de ir acumulando una nueva en cada guardado; contra
       Supabase ese "id" de más se descarta solo (no existe esa columna
       ahí) gracias a la capa tolerante al esquema. */
    const existente = await this.buscarUno({ clave });
    await escribir('config_sistema', 'config_sistema.fijar',
      d => db.from('config_sistema').upsert(d, { onConflict:'clave' }).select(),
      { ...(existente ? { id: existente.id } : {}), clave, valor, descripcion: descripcion || null });
    if (cacheConfig) cacheConfig[clave] = valor;
    return valor;
  };

  /* ==================================================================
     CONSULTAS ESPECIALIZADAS
     ================================================================== */

  /* ---- Estudiantes ------------------------------------------------ */
  estudiantes.porDNI = async function(dni){
    return this.buscarUno({ dni: U.soloDigitos(dni, 8) });
  };

  estudiantes.matriculados = async function(filtros = {}){
    return this.listar({ estado:'Matriculado', anio: IE.anio, ...filtros }, { orden:'apellidos', asc:true });
  };

  /* Búsqueda en vivo por DNI, nombres o apellidos (indicador 1). */
  estudiantes.buscar = async function(texto, filtros = {}){
    const t = Seg.filtroSeguro(texto);
    let c = db.from('estudiantes').select('*', { count:'exact' });
    if (t) c = c.or(`dni.ilike.%${t}%,nombres.ilike.%${t}%,apellidos.ilike.%${t}%,codigo.ilike.%${t}%`);
    if (filtros.grado && filtros.grado !== 'todos')   c = c.eq('grado', filtros.grado);
    if (filtros.estado && filtros.estado !== 'todos') c = c.eq('estado', filtros.estado);
    const r = await ejecutar(c.order('apellidos', { ascending:true }).limit(400), 'estudiantes.buscar');
    return { filas: r.datos || [], total: r.total || 0, ms: r.ms };
  };

  /* Siguiente código correlativo, sin huecos ni repeticiones. */
  estudiantes.siguienteCodigo = async function(){
    const r = await ejecutar(
      db.from('estudiantes').select('codigo').ilike('codigo', `EST-${IE.anio}-%`).order('codigo', { ascending:false }).limit(1),
      'estudiantes.siguienteCodigo');
    const ultimo = (r.datos || [])[0];
    const n = ultimo ? parseInt(String(ultimo.codigo).split('-')[2], 10) + 1 : 1;
    return U.codigoEstudiante(n);
  };

  /* Comprueba si un DNI ya existe (validación en vivo, indicador 6). */
  estudiantes.dniOcupado = async function(dni, exceptoId){
    let c = db.from('estudiantes').select('id, nombres, apellidos').eq('dni', U.soloDigitos(dni, 8));
    if (exceptoId) c = c.neq('id', exceptoId);
    const r = await ejecutar(c.maybeSingle(), 'estudiantes.dniOcupado');
    return r.datos;
  };

  /* Autocompletado (indicador 2): busca la ficha completa por DNI, y la
     familia por apellidos, para no volver a teclear lo que el colegio ya
     tiene registrado —el caso típico es matricular al hermano menor. */
  estudiantes.porDni = async function(dni){
    const r = await ejecutar(
      db.from('estudiantes').select('*').eq('dni', U.soloDigitos(dni, 8)).maybeSingle(),
      'estudiantes.porDni');
    return r.datos;
  };

  estudiantes.familiaPorApellidos = async function(apellidos){
    const limpio = Seg.filtroSeguro(String(apellidos || '').trim());
    if (limpio.length < 4) return null;
    const r = await ejecutar(
      db.from('estudiantes')
        .select('apellidos, apoderado, celular, correo_apoderado, dni_apoderado, direccion')
        .ilike('apellidos', limpio)
        .not('apoderado', 'is', null)
        .order('creado_en', { ascending:false })
        .limit(1),
      'estudiantes.familiaPorApellidos');
    return (r.datos || [])[0] || null;
  };

  /* ---- Notas ------------------------------------------------------ */
  notas.deEstudiante = async function(estudianteId){
    return this.listar({ estudiante_id: estudianteId }, { orden:'curso', asc:true });
  };
  notas.deGrado = async function(grado, bimestre){
    const r = await ejecutar(
      db.from('notas').select('*').eq('grado', grado).eq('bimestre', bimestre),
      'notas.deGrado');
    return r.datos || [];
  };
  /* Guarda o reemplaza la nota de un alumno en un curso y bimestre. */
  notas.guardar = async function(registro){
    const existente = await this.buscarUno({
      estudiante_id: registro.estudiante_id,
      curso: registro.curso,
      bimestre: registro.bimestre,
    });
    return existente
      ? this.actualizar(existente.id, { nota: registro.nota, literal: registro.literal, docente: registro.docente })
      : this.crear(registro);
  };

  /* ---- Comunicados ------------------------------------------------ */
  comunicados.publicos = async function(limite = 10){
    return this.listar({ visible_portal: 1 }, { limite, orden:'creado_en' });
  };
  comunicados.para = async function(rol, grado, limite = 30){
    const destinos = ['Todos', ROLES[rol] ? ROLES[rol].nombre : rol];
    if (grado) destinos.push(grado);
    const r = await ejecutar(
      db.from('comunicados').select(COLUMNAS_SIN_ADJUNTO('comunicados'))
        .in('dirigido_a', destinos).order('creado_en', { ascending:false }).limit(limite),
      'comunicados.para');
    /* Un borrador no se ve, y un comunicado archivado tampoco: solo lo
       publicado llega a quien lo tiene que leer. El filtro va aquí y no
       en cada pantalla, para que no se escape por ningún lado. */
    return (r.datos || []).filter(c => (c.estado || 'Publicado') === 'Publicado');
  };

  /* ---- Tareas y entregas ----------------------------------------- */
  tareas.deGrado = async function(grado){
    return this.listar({ grado }, { orden:'vence', asc:true });
  };
  entregas.deTarea = async function(tareaId){
    return this.listar({ tarea_id: tareaId });
  };
  entregas.deEstudiante = async function(estudianteId){
    return this.listar({ estudiante_id: estudianteId });
  };

  /* ---- Asistencia ------------------------------------------------- */
  asistencia.delDia = async function(grado, fecha){
    const r = await ejecutar(
      db.from('asistencia').select('*').eq('grado', grado).eq('fecha', fecha),
      'asistencia.delDia');
    return r.datos || [];
  };
  asistencia.guardarDia = async function(filas){
    if (!filas.length) return { filas: [], ms: 0 };
    const r = await ejecutar(
      db.from('asistencia').upsert(filas, { onConflict:'estudiante_id,fecha' }).select(),
      'asistencia.guardarDia');
    return { filas: r.datos || [], ms: r.ms };
  };

  /* ---- Mensajería interna ----------------------------------------
     Un mensaje llega a alguien por cuatro caminos: va a todo el
     personal, va a su rol entero, lleva su nombre exacto, o lo escribió
     esa misma persona. `gruposExtra` añade los destinos de grupo que le
     corresponden por su aula —su grado y su sección— para que el docente
     pueda escribirle a "3.er grado «A»" de una sola vez y les llegue a
     todos los de esa sección. */
  /* ---- ADJUNTOS SIN SOBRECARGAR LA CONEXIÓN ----------------------
     Un adjunto se guarda como base64 dentro de su propia fila (el
     sistema no tiene servidor de archivos). Una foto de 3 MB ocupa unos
     4 MB de texto, así que pedir 200 mensajes con `select *` podría
     traerse cientos de megabytes de una sola vez: eso es exactamente lo
     que tumba una conexión de colegio y agota la cuota del plan.

     La regla, entonces: los listados NUNCA traen el contenido del
     archivo, solo su nombre y su tipo —que es lo único que hace falta
     para dibujar el enlace—. El archivo se descarga de a uno, cuando la
     persona lo pide, con adjuntos.traer(). */
  const COLUMNAS_SIN_ADJUNTO = tabla => {
    const propias = {
      mensajes:    'id,autor,rol,para,texto,creado_en',
      tareas:      'id,titulo,descripcion,curso,grado,docente,vence,creado_en',
      entregas:    'id,tarea_id,estudiante_id,estudiante,comentario,nota,estado,creado_en',
      comunicados: 'id,titulo,cuerpo,etiqueta,urgente,visible_portal,dirigido_a,estado,publicado_por,creado_en,archivado_en',
    }[tabla];
    return propias ? `${propias},adjunto_nombre,adjunto_tipo` : '*';
  };

  const adjuntos = {
    /* Trae el archivo de UNA fila, ya cuando alguien lo va a abrir. */
    async traer(tabla, id){
      const r = await ejecutar(
        db.from(tabla).select('adjunto_nombre,adjunto_tipo,adjunto_datos').eq('id', id).maybeSingle(),
        `${tabla}.adjunto`);
      return r.datos || null;
    },
    /* Columnas de una tabla sin el bulto del archivo. */
    columnas: COLUMNAS_SIN_ADJUNTO,
  };

  mensajes.bandeja = async function(nombreUsuario, rolNombre, limite = 80, gruposExtra = []){
    const destinos = [...new Set([
      'Todo el personal', rolNombre, nombreUsuario, ...gruposExtra,
    ].filter(Boolean))];
    const condiciones = destinos.map(d => `para.eq.${Seg.filtroSeguro(d)}`);
    condiciones.push(`autor.eq.${Seg.filtroSeguro(nombreUsuario)}`);
    const r = await ejecutar(
      db.from('mensajes').select(COLUMNAS_SIN_ADJUNTO('mensajes'))
        .or(condiciones.join(','))
        .order('creado_en', { ascending:false }).limit(limite),
      'mensajes.bandeja');
    return r.datos || [];
  };

  /* Conversaciones agrupadas por día: "chat de tal día".
     Devuelve [{ fecha:'2026-09-15', titulo:'martes 15 de setiembre',
     mensajes:[…] }] de lo más reciente a lo más antiguo, que es como
     se lee un historial. */
  mensajes.porDia = function(lista){
    const dias = new Map();
    (lista || []).forEach(m => {
      const fecha = String(m.creado_en || '').slice(0, 10) || U.hoyISO();
      if (!dias.has(fecha)) dias.set(fecha, []);
      dias.get(fecha).push(m);
    });
    return [...dias.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([fecha, mensajes]) => ({
        fecha,
        titulo: U.diaLargo(fecha),
        mensajes: mensajes.slice().sort((a, b) => String(a.creado_en).localeCompare(String(b.creado_en))),
      }));
  };

  /* ---- Notificaciones -------------------------------------------- */
  notificaciones.mias = async function(rolNombre, limite = 25, nombreUsuario){
    /* "Todos" y el rol llegan a todo el grupo; el nombre exacto es para
       los avisos de uno solo (un mensaje directo del directorio, o "tu
       tarea vence hoy"), igual que ya hace mensajes.bandeja(). */
    const destinos = [...new Set(['Todos', rolNombre, nombreUsuario].filter(Boolean))];
    const r = await ejecutar(
      db.from('notificaciones').select('*')
        .in('dirigido_a', destinos)
        .order('creado_en', { ascending:false }).limit(limite),
      'notificaciones.mias');
    return r.datos || [];
  };
  notificaciones.enviar = function(titulo, cuerpo, dirigidoA = 'Todos', enlace){
    if (!db) return Promise.resolve();
    return db.from('notificaciones').insert({
      titulo: U.limpiar(titulo, 120),
      cuerpo: U.limpiar(cuerpo, 400),
      dirigido_a: dirigidoA,
      enlace: enlace || null,
    }).then(() => {}, () => {});
  };

  /* ---- Auditoría (indicador 1 y 6) -------------------------------- */
  function auditar(accion, modulo, extra = {}){
    if (!db) return Promise.resolve();
    const s = (typeof Sesion !== 'undefined' && Sesion.actual()) || null;
    return db.from('auditoria').insert({
      usuario: s ? s.nombres : 'Visitante',
      rol:     s ? s.rol : 'publico',
      accion:  U.limpiar(accion, 120),
      modulo:  U.limpiar(modulo || 'General', 60),
      ms:      extra.ms || 0,
      detalle: extra.detalle ? U.limpiar(extra.detalle, 300) : null,
    }).then(() => {}, () => {});
  }

  /* ---- Evaluación docente (Likert, indicador 3) -------------------- */
  const PREGUNTAS_EVALUACION_POR_DEFECTO = [
    '¿Prepara y explica bien sus clases?',
    '¿Llega puntual y cumple el horario?',
    '¿Trata con respeto a los estudiantes?',
    '¿Se comunica bien con los padres de familia?',
    '¿Corrige y entrega las notas a tiempo?',
  ];
  const ESCALA_EVALUACION = ['Muy mal', 'Mal', 'Regular', 'Bien', 'Muy bien'];

  evaluaciones.preguntas = async function(){
    const guardadas = await config.obtener('preguntas_evaluacion_docente', null);
    if (!guardadas) return PREGUNTAS_EVALUACION_POR_DEFECTO;
    try { const l = JSON.parse(guardadas); return Array.isArray(l) && l.length ? l : PREGUNTAS_EVALUACION_POR_DEFECTO; }
    catch { return PREGUNTAS_EVALUACION_POR_DEFECTO; }
  };
  evaluaciones.guardarPreguntas = function(lista){
    return config.fijar('preguntas_evaluacion_docente', JSON.stringify(lista.filter(Boolean)),
      'Preguntas del formulario de evaluación docente (Likert)');
  };
  evaluaciones.registrar = async function({ docente, periodo, respuestas, comentario, evaluador }){
    const promedio = respuestas.length
      ? +(respuestas.reduce((a, r) => a + r.puntaje, 0) / respuestas.length).toFixed(2) : 0;
    const { fila } = await this.crear({
      docente, periodo: periodo || IE.anio,
      respuestas: JSON.stringify(respuestas),
      promedio, comentario: comentario || null,
      evaluado_por: evaluador.nombres, rol_evaluador: evaluador.rol,
    });
    auditar(`Evaluación registrada para ${docente}`, 'Recursos humanos', { detalle:`Promedio ${promedio}/5` });
    return fila;
  };
  evaluaciones.deDocente = async function(docente){
    const { filas } = await this.listar({ docente }, { orden:'creado_en', asc:false });
    return filas.map(f => ({ ...f, respuestas: (() => { try { return JSON.parse(f.respuestas); } catch { return []; } })() }));
  };

  /* ---- Reportes con control de versiones (indicador 6) ------------ */
  reportes.registrar = async function({ nombre, filas, ms, formato = 'PDF', parametros }){
    const s = (typeof Sesion !== 'undefined' && Sesion.actual()) || {};
    const previos = await this.listar({ nombre }, { limite:1 });
    const version = (previos.filas[0] ? previos.filas[0].version : 0) + 1;
    const sello = U.selloVerificacion(`${nombre}|${filas}|${version}|${new Date().toISOString()}`);
    await this.crear({
      nombre, filas, ms, formato, version,
      verificacion: sello,
      parametros: parametros ? JSON.stringify(parametros).slice(0, 500) : null,
      generado_por: s.nombres || 'Sistema',
    });
    return { version, verificacion: sello };
  };

  /* ---- Panorama general (KPIs de dirección) ----------------------- */
  async function panorama(){
    const [alumnos, docentes, comunicadosHoy, solicitudesPend, ticketsAbiertos, gradosLista] =
      await Promise.all([
        estudiantes.contar({ estado:'Matriculado', anio: IE.anio }),
        usuarios.contar({ rol:'docente', activo:1 }),
        comunicados.contar({}),
        solicitudes.contar({ estado:'Pendiente' }),
        tickets.contar({ estado:'Abierto' }),
        grados.listar({}, { orden:'orden', asc:true }),
      ]);
    const capacidad = gradosLista.filas.reduce((a, g) => a + (g.vacantes || IE.aforo_aula), 0);
    return {
      alumnos, docentes, comunicados: comunicadosHoy,
      solicitudes: solicitudesPend, tickets: ticketsAbiertos,
      grados: gradosLista.filas, capacidad,
      ocupacion: U.pct(alumnos, capacidad),
    };
  }

  /* ---- Estado de la conexión (panel de soporte) ------------------- */
  async function pulso(){
    const t0 = performance.now();
    try {
      await db.from('grados').select('id', { head:true, count:'exact' });
      return { en_linea:true, ms: Math.round(performance.now() - t0) };
    } catch(e){
      return { en_linea:false, ms: Math.round(performance.now() - t0), error: traducirError(e) };
    }
  }

  return {
    usuarios, estudiantes, grados, cursos, matriculas, notas, tareas, entregas,
    asistencia, documentos, constancias, comunicados, mensajes, notificaciones,
    solicitudes, tickets, pagos, auditoria, reportes, consultas, intentos, config,
    evaluaciones, imagenes, ESCALA_EVALUACION, adjuntos,
    auditar, panorama, pulso, traducirError, repositorio,
  };
})();
