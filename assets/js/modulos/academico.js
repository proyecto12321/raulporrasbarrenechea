/* =====================================================================
   MÓDULO: ACADÉMICO
   ---------------------------------------------------------------------
   Cuaderno de notas, asistencia diaria, tareas y entregas.
   Indicador 2 (rapidez): el docente escribe las notas de todo el aula en
     una sola tabla y se guardan sin recargar la página.
   Indicador 6 (precisión): la nota se valida al escribirla (0 a 20) y el
     literal se calcula solo, sin que nadie lo tipee.
   ===================================================================== */
'use strict';

const ModAcademico = (() => {
  const { q, qq, esc } = U;

  /* ------------------------------------------------------------------
     ADJUNTOS
     ------------------------------------------------------------------
     Campo reutilizable por tareas, entregas, mensajes y comunicados:
     foto, video, audio MP3, PDF y archivos comunes. Se guarda como
     archivo de verdad, no como enlace roto: al no haber servidor
     propio, se codifica en base64 y viaja junto al registro. De ahí el
     tope de tamaño — un video largo no cabría en una fila de la base.
     ------------------------------------------------------------------ */
  const TOPE_ADJUNTO_MB = 8;
  const TIPOS_ADJUNTO = [
    'image/*', 'audio/*', 'video/*', 'application/pdf',
    '.mp3', '.m4a', '.ogg', '.wav', '.mp4', '.webm', '.mov',
    '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv',
    '.zip', '.rar', 'application/x-rar-compressed',
  ].join(',');

  /* Qué clase de archivo es, para decidir cómo mostrarlo. */
  function claseArchivo(nombre, tipo){
    const t = String(tipo || '').toLowerCase();
    const n = String(nombre || '').toLowerCase();
    if (t.startsWith('image/') || /\.(png|jpe?g|gif|webp|avif|bmp)$/.test(n)) return 'imagen';
    if (t.startsWith('audio/') || /\.(mp3|m4a|ogg|wav|aac)$/.test(n))        return 'audio';
    if (t.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/.test(n))           return 'video';
    if (t === 'application/pdf' || /\.pdf$/.test(n))                         return 'pdf';
    return 'archivo';
  }
  const ICONO_ARCHIVO = { imagen:'🖼️', audio:'🎵', video:'🎬', pdf:'📄', archivo:'📎' };

  function campoAdjunto(etiqueta){
    const id = 'adj_' + Math.random().toString(36).slice(2, 8);
    const campo = U.crear('div', { clase:'campo campo-adjunto' });
    campo.innerHTML = `
      <label for="${id}">${esc(etiqueta)}</label>
      <input type="file" id="${id}" accept="${TIPOS_ADJUNTO}">
      <p class="t-xs t-mudo mt4" id="${id}_aviso">Foto, video, audio MP3, PDF o archivo · hasta ${TOPE_ADJUNTO_MB} MB.</p>
      <div class="vista-adjunto oculto" id="${id}_previa"></div>`;

    const input  = campo.querySelector('input[type=file]');
    const aviso  = campo.querySelector(`#${id}_aviso`);
    const previa = campo.querySelector(`#${id}_previa`);

    /* Vista previa antes de enviar: quien adjunta un audio o una foto
       comprueba que eligió el archivo correcto. */
    input.onchange = () => {
      const a = input.files[0];
      previa.classList.toggle('oculto', !a);
      if (!a) return;
      const clase = claseArchivo(a.name, a.type);
      const mb = (a.size / 1048576).toFixed(1);
      previa.innerHTML = `<span class="etiqueta e-azul">${ICONO_ARCHIVO[clase]} ${esc(a.name)}</span>
        <span class="t-xs t-mudo">${mb} MB</span>`;
      aviso.innerHTML = a.size > TOPE_ADJUNTO_MB * 1048576
        ? `<span class="t-mal">Ese archivo pesa más de ${TOPE_ADJUNTO_MB} MB; elige uno más liviano.</span>`
        : `Listo para enviar · hasta ${TOPE_ADJUNTO_MB} MB.`;
    };

    async function leer(){
      const archivo = input.files[0];
      if (!archivo) return {};
      if (archivo.size > TOPE_ADJUNTO_MB * 1048576){
        aviso.innerHTML = `<span class="t-mal">Ese archivo pesa más de ${TOPE_ADJUNTO_MB} MB; no se adjuntó.</span>`;
        return {};
      }
      const datos = await new Promise((resolve, reject) => {
        const lector = new FileReader();
        lector.onload  = () => resolve(lector.result);
        lector.onerror = reject;
        lector.readAsDataURL(archivo);
      });
      return {
        adjunto_nombre: archivo.name,
        adjunto_tipo: archivo.type || 'application/octet-stream',
        adjunto_datos: datos,
      };
    }

    function limpiar(){
      input.value = '';
      previa.innerHTML = '';
      previa.classList.add('oculto');
      aviso.textContent = `Foto, video, audio MP3, PDF o archivo · hasta ${TOPE_ADJUNTO_MB} MB.`;
    }

    return { campo, leer, limpiar };
  }

  /* Adjunto ya guardado. Hay dos situaciones:

       · La fila trae el archivo (viene de un formulario que se acaba de
         llenar, o de una consulta que lo pidió): se pinta ya —la foto se
         ve, el audio se escucha, el video se reproduce—.

       · La fila trae solo el nombre y el tipo, porque el listado NO se
         trajo los megas del archivo (ver Datos.adjuntos en datos.js):
         se pinta un botón y el archivo se descarga cuando la persona lo
         pide. Es la diferencia entre abrir la bandeja en un segundo o
         esperar a que bajen doscientos adjuntos que nadie pidió. */
  function enlaceAdjunto(fila, tabla){
    if (!fila) return '';
    const nombre = fila.adjunto_nombre || 'archivo';
    const clase = claseArchivo(nombre, fila.adjunto_tipo);

    if (!fila.adjunto_datos){
      if (!fila.adjunto_nombre) return '';
      return `<div class="adjunto">
        <button type="button" class="etiqueta e-azul cursor-mano"
          data-abrir-adjunto="${fila.id}" data-tabla-adjunto="${esc(tabla || 'mensajes')}">
          ${ICONO_ARCHIVO[clase]} ${esc(nombre)} · abrir</button></div>`;
    }

    const descarga = `<a href="${fila.adjunto_datos}" download="${esc(nombre)}"
        class="etiqueta e-azul enlace-limpio">⬇️ ${esc(nombre)}</a>`;
    if (clase === 'imagen')
      return `<figure class="adjunto adjunto-imagen">
                <img src="${fila.adjunto_datos}" alt="${esc(nombre)}" loading="lazy">
                <figcaption>${descarga}</figcaption></figure>`;
    if (clase === 'audio')
      return `<div class="adjunto adjunto-audio">
                <audio controls preload="none" src="${fila.adjunto_datos}"></audio>${descarga}</div>`;
    if (clase === 'video')
      return `<div class="adjunto adjunto-video">
                <video controls preload="metadata" src="${fila.adjunto_datos}"></video>${descarga}</div>`;
    return `<div class="adjunto">${descarga}</div>`;
  }

  /* Un solo escuchador, para todo el sistema: al pulsar "abrir", baja
     ese archivo y lo reemplaza en su sitio por la foto, el reproductor
     o el enlace de descarga. */
  document.addEventListener('click', async e => {
    const b = e.target.closest('[data-abrir-adjunto]');
    if (!b) return;
    const id = b.dataset.abrirAdjunto;
    const tabla = b.dataset.tablaAdjunto || 'mensajes';
    const antes = b.innerHTML;
    b.disabled = true;
    b.innerHTML = '<span class="rueda"></span> abriendo…';
    try {
      const fila = await Datos.adjuntos.traer(tabla, id);
      if (!fila || !fila.adjunto_datos) throw new Error('El archivo ya no está disponible.');
      const caja = b.closest('.adjunto');
      caja.outerHTML = enlaceAdjunto({ ...fila, id }, tabla);
    } catch(err){
      b.disabled = false;
      b.innerHTML = antes;
      UI.fallo(err.message);
    }
  });

  /* ==================================================================
     1. CUADERNO DE NOTAS
     ================================================================== */
  async function vistaNotas(cont, { grados, docente }){
    let alumnos = [], notas = [], gradoActual = grados[0], bimestreActual = 'I', cursoActual = null;
    const cambios = new Map();     // "estudianteId" → nota pendiente de guardar

    cont.innerHTML = `
      <div class="herramientas">
        <select class="filtro-sel" id="selGrado">
          ${grados.map(g => `<option value="${esc(g)}">${esc(g)}</option>`).join('')}
        </select>
        <select class="filtro-sel" id="selCurso"></select>
        <select class="filtro-sel" id="selBimestre">
          ${BIMESTRES.map(b => `<option value="${b}">${b} bimestre</option>`).join('')}
        </select>
        <span class="contador-res" id="estadoGuardado"></span>
        <span class="crece"></span>
        <button class="btn btn-claro btn-s" id="btnLlenarFalta">Marcar faltantes con 0</button>
        <button class="btn btn-claro btn-s" id="btnExportarNotas">⬇️ Excel</button>
        <button class="btn btn-oro btn-s" id="btnGuardarNotas">💾 Guardar cambios</button>
      </div>
      <div id="zonaCuaderno">${UI.esqueleto(3)}</div>`;

    function cursosDelGrado(){ return U.cursosDe(gradoActual); }

    function pintarCursos(){
      q('#selCurso', cont).innerHTML = cursosDelGrado()
        .map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
      cursoActual = cursosDelGrado()[0];
    }

    async function cargar(){
      q('#zonaCuaderno', cont).innerHTML = UI.cargando('Trayendo el aula…');
      const [{ filas: lista }, listaNotas] = await Promise.all([
        Datos.estudiantes.listar({ grado: gradoActual, estado:'Matriculado', anio: IE.anio }, { orden:'apellidos', asc:true }),
        Datos.notas.deGrado(gradoActual, bimestreActual),
      ]);
      alumnos = lista; notas = listaNotas;
      cambios.clear();
      pintar();
    }

    function notaDe(estudianteId, curso){
      const n = notas.find(x => x.estudiante_id === estudianteId && x.curso === curso && x.bimestre === bimestreActual);
      return n ? Number(n.nota) : null;
    }

    function pintar(){
      if (!alumnos.length){
        q('#zonaCuaderno', cont).innerHTML = UI.sinDatos(`No hay estudiantes matriculados en ${gradoActual}.`, '🎒');
        return;
      }
      const cursos = cursosDelGrado();

      q('#zonaCuaderno', cont).innerHTML = `
        <div class="banda banda-info mb16"><span class="ic">⌨️</span>
          <div>Escribe la nota (0 a 20) y pasa al siguiente con <b>Enter</b> o <b>Tab</b>.
          El literal (AD, A, B, C) se calcula solo. Recuerda pulsar <b>Guardar cambios</b>.</div></div>

        <div class="cuaderno">
          <table class="notas-tabla">
            <thead><tr>
              <th>Estudiante</th>
              ${cursos.map(c => `<th>${esc(c.length > 16 ? c.slice(0, 15) + '…' : c)}</th>`).join('')}
              <th>Prom.</th><th>Logro</th>
            </tr></thead>
            <tbody>
              ${alumnos.map((a, fila) => {
                const valores = cursos.map(c => notaDe(a.id, c));
                const prom = U.promedio(valores.filter(v => v !== null));
                return `<tr>
                  <td>${esc(a.apellidos)}, ${esc(a.nombres)}
                      <div class="t-xs t-mudo">${esc(a.dni)}</div></td>
                  ${cursos.map((c, col) => {
                    const v = valores[col];
                    return `<td><input class="celda-nota ${v !== null ? U.claseNota(v) : ''}"
                      inputmode="numeric" maxlength="2" value="${v !== null ? v : ''}"
                      data-est="${a.id}" data-curso="${esc(c)}" data-fila="${fila}" data-col="${col}"
                      aria-label="Nota de ${esc(a.apellidos)} en ${esc(c)}"></td>`;
                  }).join('')}
                  <td class="t-fuerte" id="prom_${a.id}">${prom ?? '—'}</td>
                  <td id="lit_${a.id}">${prom !== null ? UI.etiqueta(U.literal(prom), claseLiteral(prom)) : '—'}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>

        <div class="rejilla rejilla-4 mt16" id="resumenNotas"></div>`;

      conectarCeldas(cursos);
      pintarResumen(cursos);
    }

    const claseLiteral = n => ({ AD:'e-verde', A:'e-azul', B:'e-naranja', C:'e-rojo' })[U.literal(n)] || 'e-gris';

    function conectarCeldas(cursos){
      const celdas = qq('.celda-nota', cont);

      celdas.forEach(celda => {
        celda.addEventListener('input', () => {
          celda.value = celda.value.replace(/\D/g, '').slice(0, 2);
          const v = celda.value === '' ? null : parseInt(celda.value, 10);

          celda.classList.remove('ad','a','b','c');
          if (v !== null && (v < 0 || v > 20)){
            celda.style.borderColor = 'var(--rojo)';
            UI.ojo('La nota debe estar entre 0 y 20.');
            return;
          }
          celda.style.borderColor = '';
          if (v !== null) celda.classList.add(U.claseNota(v));

          cambios.set(`${celda.dataset.est}|${celda.dataset.curso}`, {
            estudiante_id: +celda.dataset.est,
            curso: celda.dataset.curso,
            nota: v,
          });
          actualizarFila(+celda.dataset.est, cursos);
          marcarPendientes();
        });

        /* Enter y flechas se mueven por la tabla como en Excel. */
        celda.addEventListener('keydown', e => {
          const fila = +celda.dataset.fila, col = +celda.dataset.col;
          let destino = null;
          if (e.key === 'Enter' || e.key === 'ArrowDown') destino = [fila + 1, col];
          else if (e.key === 'ArrowUp')    destino = [fila - 1, col];
          else if (e.key === 'ArrowRight' && celda.selectionStart === celda.value.length) destino = [fila, col + 1];
          else if (e.key === 'ArrowLeft'  && celda.selectionStart === 0) destino = [fila, col - 1];
          if (destino){
            e.preventDefault();
            const sig = q(`.celda-nota[data-fila="${destino[0]}"][data-col="${destino[1]}"]`, cont);
            if (sig){ sig.focus(); sig.select(); }
          }
        });
      });
    }

    function actualizarFila(estudianteId, cursos){
      const valores = cursos.map(c => {
        const pendiente = cambios.get(`${estudianteId}|${c}`);
        if (pendiente) return pendiente.nota;
        return notaDe(estudianteId, c);
      }).filter(v => v !== null && v !== undefined);
      const prom = U.promedio(valores);
      const celdaProm = q('#prom_' + estudianteId, cont);
      const celdaLit  = q('#lit_' + estudianteId, cont);
      if (celdaProm) celdaProm.textContent = prom ?? '—';
      if (celdaLit)  celdaLit.innerHTML = prom !== null ? UI.etiqueta(U.literal(prom), claseLiteral(prom)) : '—';
    }

    function marcarPendientes(){
      const n = cambios.size;
      q('#estadoGuardado', cont).innerHTML = n
        ? `<span class="t-rojo t-fuerte">● ${n} cambio${n === 1 ? '' : 's'} sin guardar</span>`
        : `<span class="t-verde">✓ Todo guardado</span>`;
    }

    function pintarResumen(cursos){
      const todasLasNotas = [];
      alumnos.forEach(a => cursos.forEach(c => {
        const v = notaDe(a.id, c);
        if (v !== null) todasLasNotas.push(v);
      }));
      const esperadas = alumnos.length * cursos.length;
      q('#resumenNotas', cont).innerHTML = `
        ${UI.kpi({ icono:'👥', clase:'l-azul',  valor:alumnos.length, rotulo:'Estudiantes del aula' })}
        ${UI.kpi({ icono:'📝', clase:'l-oro',   valor:`${todasLasNotas.length}/${esperadas}`, rotulo:'Notas registradas' })}
        ${UI.kpi({ icono:'📊', clase:'l-verde', valor:U.promedio(todasLasNotas) ?? '—', rotulo:'Promedio del aula' })}
        ${UI.kpi({ icono:'⚠️', clase:'l-rojo',  valor:todasLasNotas.filter(n => n < 11).length, rotulo:'En inicio (C)' })}`;
    }

    /* --- Guardado --- */
    q('#btnGuardarNotas', cont).onclick = async (ev) => {
      if (!cambios.size){ UI.dato('No hay cambios que guardar.'); return; }
      const btn = ev.currentTarget;
      btn.disabled = true; btn.textContent = 'Guardando…';
      const t0 = performance.now();
      let ok = 0, error = null;

      try {
        for (const [, c] of cambios){
          if (c.nota === null) continue;
          const alumno = alumnos.find(a => a.id === c.estudiante_id);
          await Datos.notas.guardar({
            estudiante_id: c.estudiante_id,
            dni_estudiante: alumno ? alumno.dni : null,
            grado: gradoActual,
            curso: c.curso,
            bimestre: bimestreActual,
            nota: c.nota,
            literal: U.literal(c.nota),
            docente,
          });
          ok++;
        }
      } catch(e){ error = e; }

      const ms = Math.round(performance.now() - t0);
      btn.disabled = false; btn.textContent = '💾 Guardar cambios';

      if (error){
        UI.fallo('Se guardaron ' + ok + ' notas y luego ocurrió un error: ' + error.message);
      } else {
        Datos.auditar(`Notas registradas · ${gradoActual} · ${bimestreActual} bim.`, 'Académico',
          { ms, detalle: `${ok} notas` });
        UI.exito(`${ok} nota${ok === 1 ? '' : 's'} guardada${ok === 1 ? '' : 's'} en ${U.ms(ms)}`);
        Datos.notificaciones.enviar('Notas actualizadas',
          `${docente} registró notas de ${gradoActual} (${bimestreActual} bimestre).`, ROLES.director.nombre);
        /* Ya están en la base: la lista de pendientes queda en cero y el
           rótulo pasa a "Todo guardado". Si hubo error NO se limpia, para
           que el docente vea qué le falta por guardar y pueda reintentar. */
        cambios.clear();
      }
      await cargar();
      marcarPendientes();
    };

    q('#btnLlenarFalta', cont).onclick = async () => {
      const ok = await UI.confirmar({
        titulo:'Marcar faltantes con 0',
        texto:'Las casillas vacías del cuadro visible quedarán con 0. Podrás corregirlas antes de guardar.',
        aceptar:'Sí, completar',
      });
      if (!ok) return;
      qq('.celda-nota', cont).forEach(c => {
        if (c.value === ''){ c.value = '0'; c.dispatchEvent(new Event('input')); }
      });
    };

    q('#selGrado', cont).onchange = e => { gradoActual = e.target.value; pintarCursos(); cargar(); };
    q('#selCurso', cont).onchange = e => { cursoActual = e.target.value; };
    q('#selBimestre', cont).onchange = e => { bimestreActual = e.target.value; cargar(); };

    q('#btnExportarNotas', cont).onclick = () => {
      const cursos = cursosDelGrado();
      const filas = alumnos.map(a => {
        const fila = { estudiante:`${a.apellidos}, ${a.nombres}`, dni:a.dni };
        cursos.forEach(c => { fila[c] = notaDe(a.id, c) ?? ''; });
        return fila;
      });
      U.descargar(U.aCSV(filas, [
        { titulo:'Estudiante', campo:'estudiante' },
        { titulo:'DNI', campo:'dni' },
        ...cursos.map(c => ({ titulo:c, campo:c })),
      ]), `notas_${U.limpiarNombre(gradoActual)}_${bimestreActual}_${U.hoyISO()}.csv`);
      Datos.auditar('Notas exportadas a Excel', 'Académico', { detalle:`${gradoActual} · ${bimestreActual}` });
      UI.exito('Notas exportadas.');
    };

    pintarCursos();
    await cargar();
    marcarPendientes();
  }

  /* ==================================================================
     2. ASISTENCIA DIARIA
     ================================================================== */
  async function vistaAsistencia(cont, { grados, docente }){
    let alumnos = [], registros = [], gradoActual = grados[0], fechaActual = U.hoyISO();

    cont.innerHTML = `
      <div class="herramientas">
        <select class="filtro-sel" id="selGradoA">
          ${grados.map(g => `<option value="${esc(g)}">${esc(g)}</option>`).join('')}
        </select>
        <input type="date" class="filtro-sel" id="fechaA" value="${fechaActual}" max="${U.hoyISO()}"
               class="sel-liso">
        <span class="contador-res" id="resumenA"></span>
        <span class="crece"></span>
        <button class="btn btn-claro btn-s" id="btnTodosPresentes">Todos presentes</button>
        <button class="btn btn-oro btn-s" id="btnGuardarA">💾 Guardar asistencia</button>
      </div>
      <div id="zonaAsistencia">${UI.esqueleto(3)}</div>`;

    async function cargar(){
      q('#zonaAsistencia', cont).innerHTML = UI.cargando();
      const [{ filas }, hechos] = await Promise.all([
        Datos.estudiantes.listar({ grado: gradoActual, estado:'Matriculado', anio: IE.anio }, { orden:'apellidos', asc:true }),
        Datos.asistencia.delDia(gradoActual, fechaActual),
      ]);
      alumnos = filas; registros = hechos;
      pintar();
    }

    function estadoDe(id){
      const r = registros.find(x => x.estudiante_id === id);
      return r ? r.estado : 'Presente';
    }

    function pintar(){
      if (!alumnos.length){
        q('#zonaAsistencia', cont).innerHTML = UI.sinDatos(`Sin estudiantes en ${gradoActual}.`, '🎒');
        return;
      }
      q('#zonaAsistencia', cont).innerHTML = `
        <div class="tarjeta tarjeta-solida">
          <div class="pila g8">
            ${alumnos.map(a => `
              <div class="fila g12 entre celda-cuaderno">
                <div class="fila g12 min0">
                  ${UI.avatar(a.apellidos + ' ' + a.nombres)}
                  <div class="min0">
                    <b class="t-s">${esc(a.apellidos)}, ${esc(a.nombres)}</b>
                    <div class="t-xs t-mudo">${esc(a.dni)}</div>
                  </div>
                </div>
                <div class="segmentado" data-est="${a.id}">
                  ${ESTADOS_ASISTENCIA.map(e => `
                    <button type="button" data-estado="${e}"
                      class="${estadoDe(a.id) === e ? 'activo' : ''}">${e}</button>`).join('')}
                </div>
              </div>`).join('')}
          </div>
        </div>`;

      qq('.segmentado', cont).forEach(seg => {
        seg.onclick = e => {
          const b = e.target.closest('button');
          if (!b) return;
          qq('button', seg).forEach(x => x.classList.remove('activo'));
          b.classList.add('activo');
          contar();
        };
      });
      contar();
    }

    function leerEstados(){
      return qq('.segmentado', cont).map(seg => ({
        estudiante_id: +seg.dataset.est,
        estado: (q('button.activo', seg) || {}).dataset?.estado || 'Presente',
      }));
    }

    function contar(){
      const e = leerEstados();
      const c = U.contarPor(e, 'estado');
      q('#resumenA', cont).innerHTML = ESTADOS_ASISTENCIA
        .map(x => `${x}: <b>${c[x] || 0}</b>`).join(' · ');
    }

    q('#btnTodosPresentes', cont).onclick = () => {
      qq('.segmentado', cont).forEach(seg => {
        qq('button', seg).forEach(b => b.classList.toggle('activo', b.dataset.estado === 'Presente'));
      });
      contar();
    };

    q('#btnGuardarA', cont).onclick = async (ev) => {
      const btn = ev.currentTarget;
      btn.disabled = true; btn.textContent = 'Guardando…';
      const t0 = performance.now();
      try {
        const filas = leerEstados().map(e => {
          const a = alumnos.find(x => x.id === e.estudiante_id);
          return {
            estudiante_id: e.estudiante_id,
            dni: a ? a.dni : null,
            grado: gradoActual,
            fecha: fechaActual,
            estado: e.estado,
            registrado_por: docente,
          };
        });
        await Datos.asistencia.guardarDia(filas);
        const ms = Math.round(performance.now() - t0);
        Datos.auditar(`Asistencia registrada · ${gradoActual}`, 'Académico', { ms, detalle: fechaActual });
        UI.exito(`Asistencia de ${filas.length} estudiantes guardada en ${U.ms(ms)}`);

        /* Avisa a administración de las faltas del día. */
        const faltas = filas.filter(f => f.estado === 'Falta').length;
        if (faltas) Datos.notificaciones.enviar('Faltas del día',
          `${gradoActual}: ${faltas} estudiante(s) sin asistir el ${U.fecha(fechaActual)}.`,
          ROLES.administrativo.nombre);

        await cargar();
      } catch(e){ UI.fallo(e.message); }
      btn.disabled = false; btn.textContent = '💾 Guardar asistencia';
    };

    q('#selGradoA', cont).onchange = e => { gradoActual = e.target.value; cargar(); };
    q('#fechaA', cont).onchange   = e => { fechaActual = e.target.value; cargar(); };

    await cargar();
  }

  /* ==================================================================
     3. TAREAS Y ENTREGAS
     ================================================================== */
  async function vistaTareas(cont, { grados, docente }){
    let tareas = [], entregas = [];

    cont.innerHTML = `
      <div class="herramientas">
        <span class="contador-res" id="contTareas"></span>
        <span class="crece"></span>
        <button class="btn btn-oro btn-s" id="btnNuevaTarea">＋ Nueva tarea</button>
      </div>
      <div id="zonaTareas">${UI.esqueleto(3)}</div>`;

    async function cargar(){
      const { filas } = await Datos.tareas.listar({ grado: grados },
        { orden:'vence', asc:true, columnas: Datos.adjuntos.columnas('tareas') });
      tareas = filas;
      const { filas: e } = await Datos.entregas.listar({},
        { columnas: Datos.adjuntos.columnas('entregas') });
      entregas = e;
      pintar();
    }

    function pintar(){
      q('#contTareas', cont).textContent = `${tareas.length} tarea${tareas.length === 1 ? '' : 's'} asignada${tareas.length === 1 ? '' : 's'}`;
      if (!tareas.length){
        q('#zonaTareas', cont).innerHTML = UI.sinDatos('Todavía no asignaste tareas.', '📋');
        return;
      }
      q('#zonaTareas', cont).innerHTML = `<div class="pila g12">` + tareas.map(t => {
        const dias = U.diasHasta(t.vence);
        const mias = entregas.filter(e => e.tarea_id === t.id);
        const vencida = dias !== null && dias < 0;
        return `
          <div class="tarea-item ${vencida ? 'vencida' : ''}">
            <span class="loseta ${vencida ? 'l-rojo' : 'l-azul'}">${vencida ? '⏰' : '📋'}</span>
            <div class="txt">
              <b>${esc(t.titulo)}</b>
              <p>${esc(t.descripcion || 'Sin descripción.')}</p>
              <div class="meta">
                ${UI.etiqueta(t.grado, 'e-azul')}
                ${UI.etiqueta(t.curso, 'e-gris')}
                <span>📅 ${t.vence ? U.fecha(t.vence) : 'Sin fecha'}</span>
                ${dias !== null ? `<span>${vencida ? `venció hace ${Math.abs(dias)} día(s)` : `faltan ${dias} día(s)`}</span>` : ''}
                <span>📤 ${mias.length} entrega(s)</span>
                ${enlaceAdjunto(t, 'tareas')}
              </div>
            </div>
            <div class="pila g8">
              <button class="btn btn-claro btn-s" data-entregas="${t.id}">Ver entregas</button>
              <button class="btn btn-fantasma btn-s" data-borrar-tarea="${t.id}">Eliminar</button>
            </div>
          </div>`;
      }).join('') + '</div>';
    }

    cont.addEventListener('click', async e => {
      const ver = e.target.closest('[data-entregas]');
      const borrar = e.target.closest('[data-borrar-tarea]');

      if (ver){
        const t = tareas.find(x => x.id === +ver.dataset.entregas);
        const mias = entregas.filter(x => x.tarea_id === t.id);
        UI.modal({
          titulo:`Entregas · ${t.titulo}`,
          subtitulo:`${t.grado} · ${t.curso}`,
          ancho:'ancha',
          cuerpo: UI.tabla({
            columnas:[
              { titulo:'Estudiante', campo:'estudiante' },
              { titulo:'Entregado', valor:f => U.fechaHora(f.creado_en) },
              { titulo:'Comentario', valor:f => esc(f.comentario || '—') },
              { titulo:'Archivo', valor:f => enlaceAdjunto(f, 'entregas') || '—' },
              { titulo:'Estado', valor:f => UI.etiqueta(f.estado, UI.claseEstado(f.estado)) },
            ],
            filas: mias,
            vacio:'Nadie ha entregado todavía.',
            iconoVacio:'📭',
          }),
          botones:[{ texto:'Cerrar', clase:'btn-claro', esperando:false }],
        });
      }

      if (borrar){
        const t = tareas.find(x => x.id === +borrar.dataset.borrarTarea);
        const ok = await UI.confirmar({
          titulo:'Eliminar tarea', peligro:true, aceptar:'Sí, eliminar',
          texto:`Se eliminará "${t.titulo}". Las entregas registradas se conservarán.`,
        });
        if (!ok) return;
        await Datos.tareas.eliminar(t.id);
        Datos.auditar('Tarea eliminada', 'Académico', { detalle: t.titulo });
        UI.exito('Tarea eliminada.');
        cargar();
      }
    });

    q('#btnNuevaTarea', cont).onclick = () => {
      const campos = [
        { id:'titulo', etiqueta:'Título de la tarea', icono:'📌', requerido:true, ancho:'completo',
          valida:v => U.val.largo(v, 4, 100) || 'Escribe un título claro.' },
        { id:'grado', etiqueta:'Grado', tipo:'select', icono:'🏫', requerido:true, opciones:grados },
        { id:'curso', etiqueta:'Área curricular', tipo:'select', icono:'📚', requerido:true,
          opciones:[...new Set([...CURSOS_INICIAL, ...CURSOS_PRIMARIA])].sort() },
        { id:'vence', etiqueta:'Fecha de entrega', tipo:'date', icono:'📅', requerido:true,
          valor:U.hoyISO(), atributos:{ min:U.hoyISO() },
          valida:v => (U.diasHasta(v) >= 0) || 'La fecha debe ser hoy o posterior.' },
        { id:'descripcion', etiqueta:'Indicaciones', tipo:'area', filas:4, ancho:'completo',
          pista:'Qué deben hacer y cómo lo entregan.' },
      ];
      const cuerpo = U.crear('div');
      cuerpo.append(UI.formulario(campos, { columnas:2 }));
      const { campo: campoArchivo, leer: leerArchivo } = campoAdjunto('Material adjunto (opcional)');
      cuerpo.append(campoArchivo);

      UI.modal({
        titulo:'Nueva tarea', subtitulo:'Los estudiantes la verán al instante en su panel.',
        cuerpo, ancho:'ancha',
        botones:[
          { texto:'Cancelar', clase:'btn-fantasma', esperando:false, accion: () => {} },
          { texto:'Asignar tarea', clase:'btn-oro', esperandoTexto:'Asignando…',
            accion: async ({ zona }) => {
              const d = UI.leerFormulario(zona, campos);
              if (!UI.validarFormulario(zona, campos, d)) return false;
              const adjunto = await leerArchivo();
              await Datos.tareas.crear({ ...d, docente, ...adjunto });
              Datos.notificaciones.enviar('Nueva tarea asignada',
                `${d.curso}: ${d.titulo} — entrega ${U.fecha(d.vence)}`, d.grado);
              Datos.auditar('Tarea asignada', 'Académico', { detalle: d.titulo });
              UI.exito('Tarea asignada y notificada al aula.');
              cargar();
            } },
        ],
      });
    };

    await cargar();
  }

  /* ==================================================================
     4. CONSOLIDADO ACADÉMICO (para dirección)
     ================================================================== */
  async function vistaConsolidado(cont){
    cont.innerHTML = `
      <div class="herramientas">
        <select class="filtro-sel" id="selBim">
          ${BIMESTRES.map(b => `<option value="${b}">${b} bimestre</option>`).join('')}
        </select>
        <span class="contador-res" id="contConsol"></span>
        <span class="crece"></span>
        <button class="btn btn-marino btn-s" id="btnRepConsol">📄 Reporte consolidado</button>
      </div>
      <div id="zonaConsol">${UI.esqueleto(3)}</div>`;

    let datos = [];

    async function cargar(){
      const bim = q('#selBim', cont).value;
      q('#zonaConsol', cont).innerHTML = UI.cargando('Calculando promedios…');

      const [{ filas: alumnos }, { filas: notas }] = await Promise.all([
        Datos.estudiantes.listar({ estado:'Matriculado', anio: IE.anio }),
        Datos.notas.listar({ bimestre: bim }, { limite:5000 }),
      ]);

      datos = U.ordenarGrados(GRADOS.map(g => {
        const delGrado = alumnos.filter(a => a.grado === g);
        const ids = new Set(delGrado.map(a => a.id));
        const susNotas = notas.filter(n => ids.has(n.estudiante_id)).map(n => Number(n.nota));
        const cursos = U.cursosDe(g).length;
        return {
          grado: g,
          alumnos: delGrado.length,
          notas: susNotas.length,
          esperadas: delGrado.length * cursos,
          promedio: U.promedio(susNotas),
          destacados: susNotas.filter(n => n >= 18).length,
          enInicio: susNotas.filter(n => n < 11).length,
        };
      }).filter(d => d.alumnos > 0), 'grado');

      q('#contConsol', cont).textContent = `${datos.reduce((a, d) => a + d.alumnos, 0)} estudiantes · ${bim} bimestre`;
      pintar();
    }

    function pintar(){
      const totalNotas = datos.reduce((a, d) => a + d.notas, 0);
      const totalEsp   = datos.reduce((a, d) => a + d.esperadas, 0);

      q('#zonaConsol', cont).innerHTML = `
        <div class="rejilla rejilla-4 mb16">
          ${UI.kpi({ icono:'📊', clase:'l-oro', valor: U.promedio(datos.map(d => d.promedio).filter(Boolean)) ?? '—', rotulo:'Promedio institucional' })}
          ${UI.kpi({ icono:'✅', clase:'l-verde', valor: U.pct(totalNotas, totalEsp) + '%', rotulo:'Avance del registro' })}
          ${UI.kpi({ icono:'🏆', clase:'l-azul', valor: datos.reduce((a, d) => a + d.destacados, 0), rotulo:'Logros destacados (AD)' })}
          ${UI.kpi({ icono:'⚠️', clase:'l-rojo', valor: datos.reduce((a, d) => a + d.enInicio, 0), rotulo:'En inicio (C)' })}
        </div>

        <div class="tarjeta tarjeta-solida mb16">
          <div class="cabeza"><h3>📈 Promedio por grado</h3></div>
          ${UI.barras(datos.map(d => ({
            etiqueta: d.grado.replace('Inicial ', 'Ini ').replace(' grado', '°'),
            valor: d.promedio || 0,
            color: (d.promedio || 0) >= 14 ? 'verde' : (d.promedio || 0) >= 11 ? '' : 'azul',
          })))}
        </div>

        <div class="tarjeta tarjeta-solida">
          <div class="cabeza"><h3>📋 Detalle por aula</h3></div>
          ${UI.tabla({
            columnas:[
              { titulo:'Grado', campo:'grado' },
              { titulo:'Estudiantes', campo:'alumnos', clase:'num' },
              { titulo:'Notas', valor:d => `${d.notas}/${d.esperadas}` },
              { titulo:'Avance', valor:d => `<div class="min-110">${UI.barra(d.notas, d.esperadas, d.notas >= d.esperadas ? 'verde' : '')}
                  <div class="t-xs t-mudo mt8">${U.pct(d.notas, d.esperadas)}%</div></div>` },
              { titulo:'Promedio', clase:'num', valor:d => d.promedio !== null
                  ? `<b>${d.promedio}</b> ${UI.etiqueta(U.literal(d.promedio), { AD:'e-verde', A:'e-azul', B:'e-naranja', C:'e-rojo' }[U.literal(d.promedio)])}`
                  : '—' },
              { titulo:'En inicio', campo:'enInicio', clase:'num' },
            ],
            filas: datos,
          })}
        </div>`;
    }

    q('#selBim', cont).onchange = cargar;
    q('#btnRepConsol', cont).onclick = () => Reporte.listado({
      titulo:'Consolidado académico por grado',
      subtitulo:`${q('#selBim', cont).value} bimestre · año ${IE.anio}`,
      columnas:[
        { titulo:'Grado', campo:'grado' },
        { titulo:'Estudiantes', campo:'alumnos', num:true },
        { titulo:'Notas registradas', campo:'notas', num:true },
        { titulo:'Notas esperadas', campo:'esperadas', num:true },
        { titulo:'Avance', valor:d => U.pct(d.notas, d.esperadas) + '%', num:true },
        { titulo:'Promedio', campo:'promedio', num:true },
        { titulo:'Logro', valor:d => U.literal(d.promedio) },
      ],
      filas: datos,
      filtros:{ Bimestre: q('#selBim', cont).value },
      resumen:[
        { valor: datos.reduce((a, d) => a + d.alumnos, 0), rotulo:'Estudiantes' },
        { valor: U.promedio(datos.map(d => d.promedio).filter(Boolean)) ?? '—', rotulo:'Promedio' },
        { valor: datos.reduce((a, d) => a + d.destacados, 0), rotulo:'AD' },
        { valor: datos.reduce((a, d) => a + d.enInicio, 0), rotulo:'C' },
      ],
      obligatorios:['grado'],
    });

    await cargar();
  }

  return { vistaNotas, vistaAsistencia, vistaTareas, vistaConsolidado,
           campoAdjunto, enlaceAdjunto, claseArchivo, ICONO_ARCHIVO, TOPE_ADJUNTO_MB };
})();
