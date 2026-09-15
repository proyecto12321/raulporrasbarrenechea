/* =====================================================================
   MÓDULO: REGISTROS ADMINISTRATIVOS
   ---------------------------------------------------------------------
   Matrícula rápida, solicitudes de vacante, documentos, constancias
   emitidas y control de pagos.
   Indicador 2 (rapidez): la matrícula se hace en un formulario corto y
     el sistema cronometra cuánto tardó.
   Indicador 5 (reportes): todo lo de aquí se exporta o se imprime.
   ===================================================================== */
'use strict';

const ModRegistros = (() => {
  const { q, qq, esc } = U;

  /* ==================================================================
     1. MATRÍCULA RÁPIDA
     ------------------------------------------------------------------
     Pensada para atender al apoderado en mostrador: pocos campos, DNI
     verificado en vivo y confirmación con el tiempo que tomó.
     ================================================================== */
  async function vistaMatricula(cont, sesion){
    cont.innerHTML = `
      <div class="rejilla-casi-par">

        <div class="tarjeta">
          <div class="cabeza">
            <div>
              <h3>⚡ Matrícula rápida</h3>
              <p>Registro en mostrador: seis datos y listo.</p>
            </div>
            <span class="etiqueta e-oro" id="cronometro">—</span>
          </div>
          <div id="formRapido"></div>
          <button class="btn btn-oro btn-xg mt16" id="btnMatricular">Matricular estudiante</button>
          <p class="t-xs t-mudo t-c mt12">
            El código de matrícula y la ficha PDF se generan solos.
          </p>
        </div>

        <div class="pila g16">
          <div class="rejilla rejilla-2" id="kpiMat"></div>
          <div class="tarjeta">
            <div class="cabeza">
              <h3>🕒 Últimas matrículas</h3>
              <button class="btn btn-plano btn-s" id="btnVerTodas">Ver padrón →</button>
            </div>
            <div id="ultimasMat">${UI.esqueleto(3)}</div>
          </div>
        </div>
      </div>`;

    /* --- Formulario corto --- */
    const campos = [
      { id:'nombres', etiqueta:'Nombres', icono:'🧒', requerido:true, limpiar:'nombre',
        valida:v => U.val.largo(v, 2, 60) || 'Escribe el nombre.' },
      { id:'apellidos', etiqueta:'Apellidos', icono:'👪', requerido:true, limpiar:'nombre',
        valida:v => U.val.largo(v, 2, 60) || 'Escribe los apellidos.' },
      { id:'dni', etiqueta:'DNI del estudiante', icono:'🪪', requerido:true, limpiar:'dni',
        atributos:{ inputmode:'numeric', maxlength:8 },
        valida:v => U.dniPlausible(v) || 'DNI de 8 dígitos.' },
      { id:'grado', etiqueta:'Grado', tipo:'select', icono:'🏫', requerido:true, opciones:GRADOS },
      { id:'apoderado', etiqueta:'Apoderado', icono:'🧑', requerido:true, limpiar:'nombre',
        valida:v => U.val.largo(v, 4, 90) || 'Nombres y apellidos del apoderado.' },
      { id:'celular', etiqueta:'Celular', icono:'📱', requerido:true, limpiar:'num',
        atributos:{ inputmode:'numeric', maxlength:9 },
        valida:v => U.val.celular(v) || 'Celular de 9 dígitos que empiece en 9.' },
    ];
    q('#formRapido', cont).append(UI.formulario(campos, { columnas:2 }));

    /* Cronómetro visible: mide cuánto tarda el registro (indicador 2). */
    let inicio = null, relojId = null;
    const arrancarCronometro = () => {
      if (inicio) return;
      inicio = performance.now();
      relojId = setInterval(() => {
        q('#cronometro', cont).textContent = `⏱ ${((performance.now() - inicio) / 1000).toFixed(1)} s`;
      }, 100);
    };
    qq('#formRapido input, #formRapido select', cont).forEach(el =>
      el.addEventListener('input', arrancarCronometro, { once:false }));

    /* --- Autocompletado (indicador 2) -------------------------------
       Dos atajos que ahorran teclear lo que la institución ya sabe:

         · Si el DNI ya está en el padrón, se traen sus datos completos
           (es el caso de rematricular o corregir una ficha).
         · Si los apellidos coinciden con los de un estudiante ya
           registrado, se rellenan apoderado y celular: el hermano menor
           se matricula con tres datos en vez de seis.
       ---------------------------------------------------------------- */
    const poner = (id, valor) => {
      const el = q('#' + id, cont);
      if (el && valor != null && valor !== '') el.value = valor;
    };

    const campoDni = q('#dni', cont);
    campoDni.addEventListener('input', () => campoDni.value = U.soloDigitos(campoDni.value, 8));
    campoDni.addEventListener('blur', async () => {
      if (!U.dniPlausible(campoDni.value)) return;
      let ficha = null;
      try { ficha = await Datos.estudiantes.porDni(campoDni.value); } catch(e){ /* sin conexión: sigue a mano */ }
      if (!ficha){
        UI.marcarCampo(cont, 'dni', 'DNI libre.', true);
        return;
      }
      UI.marcarCampo(cont, 'dni',
        `Ya matriculado: ${ficha.apellidos}, ${ficha.nombres}.`, false);
      ['nombres','apellidos','grado','apoderado','celular'].forEach(k => poner(k, ficha[k]));
      UI.dato(`Se trajeron los datos de ${ficha.apellidos}, ${ficha.nombres}. Revisa el grado antes de guardar.`);
    });

    const campoApellidos = q('#apellidos', cont);
    let familiaTraida = '';
    campoApellidos.addEventListener('blur', async () => {
      const ap = campoApellidos.value.trim();
      if (ap.length < 4 || ap === familiaTraida) return;
      if (q('#apoderado', cont).value.trim()) return;   /* el usuario ya lo escribió */
      let fam = null;
      try { fam = await Datos.estudiantes.familiaPorApellidos(ap); } catch(e){ /* sin conexión */ }
      if (!fam || !fam.apoderado) return;
      familiaTraida = ap;
      poner('apoderado', fam.apoderado);
      poner('celular', fam.celular);
      UI.marcarCampo(cont, 'apoderado', `Traído de la familia ${fam.apellidos}. Corrígelo si no es el mismo apoderado.`, true);
    });

    q('#celular', cont).addEventListener('input', e => e.target.value = U.soloDigitos(e.target.value, 9));

    /* --- Guardar --- */
    q('#btnMatricular', cont).onclick = async (ev) => {
      const btn = ev.currentTarget;
      const datos = UI.leerFormulario(cont, campos);
      if (!UI.validarFormulario(cont, campos, datos)) return;

      btn.disabled = true; btn.textContent = 'Matriculando…';
      const t0 = performance.now();

      try {
        const ya = await Datos.estudiantes.dniOcupado(datos.dni);
        if (ya) throw new Error(`El DNI ${datos.dni} ya pertenece a ${ya.apellidos}, ${ya.nombres}.`);

        const codigo = await Datos.estudiantes.siguienteCodigo();
        const { fila } = await Datos.estudiantes.crear({
          ...datos, codigo, seccion:'Única', estado:'Matriculado', anio: IE.anio,
          registrado_por: sesion.nombres,
          segundos: Math.round((performance.now() - (inicio || t0)) / 1000),
          completo: 1,
        });

        await Datos.matriculas.crear({
          estudiante_id: fila.id, dni: fila.dni, anio: IE.anio,
          grado: fila.grado, seccion:'Única', estado:'Activa',
          monto: IE.costo_matricula, registrado_por: sesion.nombres,
          ms: Math.round(performance.now() - t0),
        });

        /* Genera el cargo de matrícula pendiente. */
        await Datos.pagos.crear({
          estudiante_id: fila.id, dni: fila.dni, concepto:'Matrícula',
          mes: new Date().toLocaleDateString('es-PE', { month:'long' }),
          monto: IE.costo_matricula, estado:'Pendiente',
          registrado_por: sesion.nombres,
        }).catch(() => {});

        const total = Math.round(performance.now() - (inicio || t0));
        clearInterval(relojId); inicio = null;
        Datos.auditar('Matrícula registrada', 'Matrícula', { ms: total, detalle: `${codigo} · ${fila.dni}` });
        Datos.notificaciones.enviar('Nueva matrícula',
          `${fila.apellidos}, ${fila.nombres} — ${fila.grado}`, ROLES.director.nombre);

        UI.modal({
          titulo:'¡Estudiante matriculado!',
          subtitulo:codigo,
          cuerpo:`
            <div class="banda banda-ok mb16"><span class="ic">✅</span>
              <div>Registro completado en <b>${U.ms(total)}</b>.</div></div>
            <dl class="ficha-lista">
              <div><dt>Estudiante</dt><dd>${esc(fila.apellidos)}, ${esc(fila.nombres)}</dd></div>
              <div><dt>DNI</dt><dd>${esc(fila.dni)}</dd></div>
              <div><dt>Grado</dt><dd>${esc(fila.grado)}</dd></div>
              <div><dt>Código</dt><dd>${esc(codigo)}</dd></div>
            </dl>
            <div class="banda banda-info mt16"><span class="ic">🎒</span>
              <div>El estudiante ya puede ingresar al sistema con su DNI
              <b class="t-mono">${esc(fila.dni)}</b>.</div></div>`,
          botones:[
            { texto:'Cerrar', clase:'btn-fantasma', esperando:false, accion: () => {} },
            { texto:'Imprimir ficha', clase:'btn-oro', esperando:false,
              accion: () => { Reporte.fichaMatricula(fila, 'pdf'); } },
          ],
        });

        q('#formRapido', cont).innerHTML = '';
        q('#formRapido', cont).append(UI.formulario(campos, { columnas:2 }));
        q('#cronometro', cont).textContent = '—';
        cargarLateral();

      } catch(e){
        UI.fallo(e.message);
      }
      btn.disabled = false; btn.textContent = 'Matricular estudiante';
    };

    /* --- Columna derecha --- */
    async function cargarLateral(){
      try {
        const [{ filas: alumnos }, { filas: ultimas }] = await Promise.all([
          Datos.estudiantes.listar({ estado:'Matriculado', anio: IE.anio }, { columnas:'id,grado,creado_en,segundos' }),
          Datos.estudiantes.listar({}, { limite:6, orden:'creado_en' }),
        ]);

        const hoy = alumnos.filter(a => U.diasHasta(a.creado_en) === 0).length;
        const tiempos = alumnos.map(a => a.segundos).filter(s => s > 0);

        q('#kpiMat', cont).innerHTML = `
          ${UI.kpi({ icono:'🎒', clase:'l-oro',   valor: alumnos.length, rotulo:'Matriculados ' + IE.anio })}
          ${UI.kpi({ icono:'📅', clase:'l-verde', valor: hoy, rotulo:'Registrados hoy' })}
          ${UI.kpi({ icono:'⚡', clase:'l-azul',  valor: tiempos.length ? U.redondear(tiempos.reduce((a,b)=>a+b,0)/tiempos.length, 0) + ' s' : '—', rotulo:'Tiempo promedio' })}
          ${UI.kpi({ icono:'🏫', clase:'l-morado',valor: new Set(alumnos.map(a => a.grado)).size, rotulo:'Grados activos' })}`;

        q('#ultimasMat', cont).innerHTML = ultimas.length ? ultimas.map(e => `
          <div class="fila-ios">
            ${UI.avatar(e.apellidos + ' ' + e.nombres)}
            <div class="txt">
              <b>${esc(e.apellidos)}, ${esc(e.nombres)}</b>
              <small>${esc(e.grado)} · ${esc(e.codigo || '')} · ${esc(U.hace(e.creado_en))}</small>
            </div>
            ${UI.etiqueta(e.estado, UI.claseEstado(e.estado))}
          </div>`).join('') : UI.sinDatos('Sin matrículas aún.', '🎒');

      } catch(e){
        q('#ultimasMat', cont).innerHTML = `<div class="banda banda-mal"><span class="ic">⚠️</span><div>${esc(e.message)}</div></div>`;
      }
    }

    q('#btnVerTodas', cont).onclick = () => Panel.ir('estudiantes');
    await cargarLateral();
  }

  /* ==================================================================
     2. SOLICITUDES DE VACANTE
     ------------------------------------------------------------------
     Llegan del portal público. Aprobar una crea al estudiante en el
     padrón; rechazar deja constancia del motivo.
     ================================================================== */
  async function vistaSolicitudes(cont, sesion){
    let todas = [];

    cont.innerHTML = `
      ${UI.herramientas({
        pista:'Buscar por nombre, DNI o folio…',
        filtros:[{ id:'filtroEstadoSol', opciones:[{ valor:'todos', texto:'Todos los estados' }, ...ESTADOS_SOLICITUD] }],
        acciones:`<button class="btn btn-claro btn-s" id="btnExpSol">⬇️ Exportar</button>`,
      })}
      <div id="zonaSol">${UI.esqueleto(3)}</div>`;

    async function cargar(){
      const { filas } = await Datos.solicitudes.listar({}, { orden:'creado_en' });
      todas = filas;
      pintar();
    }

    function filtradas(){
      const t = q('#buscador', cont).value;
      const e = q('#filtroEstadoSol', cont).value;
      return todas.filter(s =>
        U.coincide(s, t, ['nombres','apellidos','dni','folio','apoderado']) &&
        (e === 'todos' || s.estado === e));
    }

    function pintar(){
      const lista = filtradas();
      const pend = todas.filter(s => s.estado === 'Pendiente').length;
      UI.contador('solicitudes', pend);
      q('#contadorRes', cont).textContent = `${lista.length} solicitud${lista.length === 1 ? '' : 'es'} · ${pend} pendiente${pend === 1 ? '' : 's'}`;

      if (!lista.length){
        q('#zonaSol', cont).innerHTML = UI.sinDatos('No hay solicitudes con esos filtros.', '📬');
        return;
      }

      q('#zonaSol', cont).innerHTML = `<div class="pila g12">` + lista.map(s => `
        <div class="ticket p-${s.estado === 'Pendiente' ? 'media' : s.estado === 'Aprobada' ? 'baja' : 'alta'}">
          <span class="loseta l-azul">📬</span>
          <div class="txt">
            <b>${esc(s.apellidos)}, ${esc(s.nombres)}</b>
            <p>DNI ${esc(s.dni)} · postula a <b>${esc(s.grado_solicitado)}</b>
               ${s.fecha_nac ? `· ${U.edad(s.fecha_nac)} años` : ''}</p>
            <p class="t-s">👪 ${esc(s.apoderado || '—')} · 📱 ${esc(s.celular || '—')}
               ${s.correo ? `· ✉️ ${esc(s.correo)}` : ''}</p>
            ${s.mensaje ? `<p class="t-s t-mudo">"${esc(s.mensaje)}"</p>` : ''}
            <div class="meta">
              ${UI.etiqueta(s.estado, UI.claseEstado(s.estado))}
              <span class="t-mono t-xs">${esc(s.folio || '')}</span>
              <span>🕒 ${esc(U.hace(s.creado_en))}</span>
              ${s.atendido_por ? `<span>👤 ${esc(s.atendido_por)}</span>` : ''}
            </div>
          </div>
          ${s.estado === 'Pendiente' ? `
            <div class="pila g8">
              <button class="btn btn-verde btn-s" data-aprobar="${s.id}">✓ Aprobar</button>
              <button class="btn btn-fantasma btn-s" data-rechazar="${s.id}">✕ Rechazar</button>
            </div>` : ''}
        </div>`).join('') + '</div>';
    }

    cont.addEventListener('click', async e => {
      const ap = e.target.closest('[data-aprobar]');
      const re = e.target.closest('[data-rechazar]');
      if (!ap && !re) return;
      const sol = todas.find(x => x.id === +((ap || re).dataset.aprobar || (ap || re).dataset.rechazar));
      if (!sol) return;

      if (ap) await aprobar(sol, sesion, cargar);
      else    await rechazar(sol, sesion, cargar);
    });

    q('#btnExpSol', cont).onclick = () => {
      U.descargar(U.aCSV(filtradas(), [
        { titulo:'Folio', campo:'folio' }, { titulo:'Apellidos', campo:'apellidos' },
        { titulo:'Nombres', campo:'nombres' }, { titulo:'DNI', campo:'dni' },
        { titulo:'Grado', campo:'grado_solicitado' }, { titulo:'Apoderado', campo:'apoderado' },
        { titulo:'Celular', campo:'celular' }, { titulo:'Estado', campo:'estado' },
        { titulo:'Recibida', valor:s => U.fechaHora(s.creado_en) },
      ]), `solicitudes_${IE.anio}.csv`);
      UI.exito('Solicitudes exportadas.');
    };

    Panel.conectarHerramientas(cont, pintar);
    await cargar();
  }

  async function aprobar(sol, sesion, alTerminar){
    const campos = [
      { id:'grado', etiqueta:'Grado asignado', tipo:'select', icono:'🏫', requerido:true,
        opciones:GRADOS, valor:sol.grado_solicitado, ancho:'completo' },
      { id:'seccion', etiqueta:'Sección', icono:'🔤', valor:'Única' },
      { id:'nota', etiqueta:'Observación (opcional)', icono:'📝' },
    ];
    const cuerpo = U.crear('div');
    cuerpo.innerHTML = `<div class="banda banda-info mb16"><span class="ic">✅</span>
      <div>Al aprobar se crea la ficha del estudiante en el padrón y podrá
      ingresar al sistema con su DNI.</div></div>`;
    cuerpo.append(UI.formulario(campos, { columnas:2 }));

    UI.modal({
      titulo:'Aprobar solicitud',
      subtitulo:`${sol.apellidos}, ${sol.nombres} · ${sol.folio || ''}`,
      cuerpo,
      botones:[
        { texto:'Cancelar', clase:'btn-fantasma', esperando:false, accion: () => {} },
        { texto:'Aprobar y matricular', clase:'btn-verde', esperandoTexto:'Procesando…',
          accion: async ({ zona }) => {
            const d = UI.leerFormulario(zona, campos);
            if (!UI.validarFormulario(zona, campos, d)) return false;

            const ya = await Datos.estudiantes.dniOcupado(sol.dni);
            if (ya) throw new Error(`El DNI ${sol.dni} ya está en el padrón.`);

            const t0 = performance.now();
            const codigo = await Datos.estudiantes.siguienteCodigo();
            const { fila } = await Datos.estudiantes.crear({
              codigo,
              nombres: U.may(sol.nombres), apellidos: U.may(sol.apellidos),
              dni: sol.dni, fecha_nac: sol.fecha_nac,
              grado: d.grado, seccion: d.seccion || 'Única',
              apoderado: sol.apoderado, dni_apoderado: sol.dni_apoderado,
              celular: sol.celular, correo_apoderado: sol.correo,
              estado:'Matriculado', anio: IE.anio,
              observaciones: d.nota || `Admitido desde la solicitud ${sol.folio}.`,
              registrado_por: sesion.nombres, completo:1,
            });

            await Datos.matriculas.crear({
              estudiante_id: fila.id, dni: fila.dni, anio: IE.anio,
              grado: d.grado, seccion: d.seccion || 'Única', estado:'Activa',
              monto: IE.costo_matricula, registrado_por: sesion.nombres,
              ms: Math.round(performance.now() - t0),
            });

            await Datos.solicitudes.actualizar(sol.id, {
              estado:'Aprobada', atendido_por: sesion.nombres,
              respuesta:`Aprobada y matriculado en ${d.grado}. Código ${codigo}.`,
              atendido_en: new Date().toISOString(),
            });

            Datos.auditar('Solicitud aprobada', 'Admisión', { detalle: sol.folio });
            UI.exito(`${sol.nombres} matriculado con el código ${codigo}.`);
            if (alTerminar) alTerminar();
          } },
      ],
    });
  }

  async function rechazar(sol, sesion, alTerminar){
    const campos = [
      { id:'respuesta', etiqueta:'Motivo del rechazo', tipo:'area', filas:3, requerido:true, ancho:'completo',
        pista:'Ej.: no quedan vacantes en el grado solicitado.',
        valida:v => U.val.largo(v, 8, 300) || 'Explica brevemente el motivo.' },
    ];
    const cuerpo = UI.formulario(campos, { columnas:1 });
    UI.modal({
      titulo:'Rechazar solicitud',
      subtitulo:`${sol.apellidos}, ${sol.nombres}`,
      cuerpo,
      botones:[
        { texto:'Cancelar', clase:'btn-fantasma', esperando:false, accion: () => {} },
        { texto:'Rechazar', clase:'btn-rojo', esperandoTexto:'Guardando…',
          accion: async ({ zona }) => {
            const d = UI.leerFormulario(zona, campos);
            if (!UI.validarFormulario(zona, campos, d)) return false;
            await Datos.solicitudes.actualizar(sol.id, {
              estado:'Rechazada', respuesta: d.respuesta,
              atendido_por: sesion.nombres, atendido_en: new Date().toISOString(),
            });
            Datos.auditar('Solicitud rechazada', 'Admisión', { detalle: sol.folio });
            UI.dato('Solicitud marcada como rechazada.');
            if (alTerminar) alTerminar();
          } },
      ],
    });
  }

  /* ==================================================================
     3. DOCUMENTOS (mesa de partes interna)
     ================================================================== */
  async function vistaDocumentos(cont, sesion){
    let todos = [];

    cont.innerHTML = `
      ${UI.herramientas({
        pista:'Buscar por asunto, código o remitente…',
        filtros:[
          { id:'filtroTipoDoc', opciones:[{ valor:'todos', texto:'Todos los tipos' }, ...TIPOS_DOCUMENTO] },
          { id:'filtroEstadoDoc', opciones:[{ valor:'todos', texto:'Todos los estados' }, 'Recibido','En revisión','Archivado','Observado'] },
        ],
        acciones:`
          <button class="btn btn-marino btn-s" id="btnRepDoc">📄 Reporte</button>
          <button class="btn btn-oro btn-s" id="btnNuevoDoc">＋ Registrar</button>`,
      })}
      <div id="zonaDoc">${UI.esqueleto(3)}</div>`;

    async function cargar(){
      const { filas } = await Datos.documentos.listar({}, { orden:'creado_en' });
      todos = filas;
      pintar();
    }

    function filtradas(){
      const t = q('#buscador', cont).value;
      const ti = q('#filtroTipoDoc', cont).value;
      const es = q('#filtroEstadoDoc', cont).value;
      return todos.filter(d =>
        U.coincide(d, t, ['asunto','codigo','remitente','detalle']) &&
        (ti === 'todos' || d.tipo === ti) &&
        (es === 'todos' || d.estado === es));
    }

    function pintar(){
      const lista = filtradas();
      q('#contadorRes', cont).textContent = `${lista.length} de ${todos.length} documentos`;
      q('#zonaDoc', cont).innerHTML = UI.tabla({
        columnas:[
          { titulo:'Código', valor:d => `<span class="t-mono t-xs">${esc(d.codigo || '—')}</span>` },
          { titulo:'Asunto', valor:d => `<b class="t-s">${esc(d.asunto)}</b>
              <div class="t-xs t-mudo">${esc((d.detalle || '').slice(0, 60))}</div>` },
          { titulo:'Tipo', valor:d => UI.etiqueta(d.tipo, 'e-azul') },
          { titulo:'Remitente', campo:'remitente' },
          { titulo:'Fecha', valor:d => U.fecha(d.creado_en) },
          { titulo:'Estado', valor:d => `<select class="filtro-sel btn-chico-fijo" data-estado-doc="${d.id}">
              ${['Recibido','En revisión','Archivado','Observado'].map(e =>
                `<option ${d.estado === e ? 'selected' : ''}>${e}</option>`).join('')}</select>` },
        ],
        filas: lista,
        vacio:'No hay documentos registrados.',
        iconoVacio:'🗂️',
      });

      qq('[data-estado-doc]', cont).forEach(sel => {
        sel.onchange = async () => {
          await Datos.documentos.actualizar(+sel.dataset.estadoDoc, { estado: sel.value });
          Datos.auditar('Estado de documento actualizado', 'Documentos', { detalle: sel.value });
          UI.exito('Estado actualizado.');
          cargar();
        };
      });
    }

    q('#btnNuevoDoc', cont).onclick = () => {
      const campos = [
        { id:'tipo', etiqueta:'Tipo de documento', tipo:'select', icono:'📄', requerido:true, opciones:TIPOS_DOCUMENTO },
        { id:'remitente', etiqueta:'Remitente', icono:'🧑', requerido:true, limpiar:'nombre',
          valida:v => U.val.largo(v, 3, 80) || 'Escribe quién lo envía.' },
        { id:'asunto', etiqueta:'Asunto', icono:'📌', requerido:true, ancho:'completo',
          valida:v => U.val.largo(v, 5, 120) || 'Resume el asunto.' },
        { id:'grado', etiqueta:'Grado relacionado', tipo:'select', icono:'🏫',
          opciones:[{ valor:'', texto:'No aplica' }, ...GRADOS] },
        { id:'destino', etiqueta:'Derivar a', tipo:'select', icono:'➡️',
          opciones:['Personal administrativo','Dirección','Docentes','Soporte técnico'] },
        { id:'detalle', etiqueta:'Detalle', tipo:'area', filas:3, ancho:'completo' },
      ];
      const cuerpo = UI.formulario(campos, { columnas:2 });
      UI.modal({
        titulo:'Registrar documento', subtitulo:'Se numera automáticamente.',
        cuerpo, ancho:'ancha',
        botones:[
          { texto:'Cancelar', clase:'btn-fantasma', esperando:false, accion: () => {} },
          { texto:'Registrar', clase:'btn-oro', esperandoTexto:'Guardando…',
            accion: async ({ zona }) => {
              const d = UI.leerFormulario(zona, campos);
              if (!UI.validarFormulario(zona, campos, d)) return false;
              const t0 = performance.now();
              await Datos.documentos.crear({ ...d, codigo: U.folio('DOC'), estado:'Recibido',
                segundos: 0, completo:1 });
              Datos.auditar('Documento registrado', 'Documentos',
                { ms: Math.round(performance.now() - t0), detalle: d.asunto });
              UI.exito('Documento registrado.');
              cargar();
            } },
        ],
      });
    };

    q('#btnRepDoc', cont).onclick = () => Reporte.listado({
      titulo:'Registro de documentos',
      columnas:[
        { titulo:'Código', campo:'codigo' }, { titulo:'Tipo', campo:'tipo' },
        { titulo:'Asunto', campo:'asunto' }, { titulo:'Remitente', campo:'remitente' },
        { titulo:'Destino', campo:'destino' }, { titulo:'Estado', campo:'estado' },
        { titulo:'Fecha', valor:d => U.fecha(d.creado_en) },
      ],
      filas: filtradas(),
      resumen:[{ valor: filtradas().length, rotulo:'Documentos' }],
      obligatorios:['asunto','tipo'],
    });

    Panel.conectarHerramientas(cont, pintar);
    await cargar();
  }

  /* ==================================================================
     4. CONSTANCIAS EMITIDAS
     ================================================================== */
  async function vistaConstancias(cont){
    let todas = [], alumnos = [];

    cont.innerHTML = `
      ${UI.herramientas({
        pista:'Buscar por nombre, DNI o número…',
        filtros:[],
        acciones:`
          <button class="btn btn-marino btn-s" id="btnRepConst">📄 Reporte</button>
          <button class="btn btn-oro btn-s" id="btnNuevaConst">＋ Emitir constancia</button>`,
      })}
      <div id="zonaConst">${UI.esqueleto(3)}</div>`;

    async function cargar(){
      const [c, e] = await Promise.all([
        Datos.constancias.listar({}, { orden:'creado_en' }),
        Datos.estudiantes.listar({ estado:'Matriculado', anio: IE.anio }, { orden:'apellidos', asc:true }),
      ]);
      todas = c.filas; alumnos = e.filas;
      pintar();
    }

    function filtradas(){
      const t = q('#buscador', cont).value;
      return todas.filter(c => U.coincide(c, t, ['nombre','dni','numero','tipo']));
    }

    function pintar(){
      const lista = filtradas();
      q('#contadorRes', cont).textContent = `${lista.length} constancia${lista.length === 1 ? '' : 's'}`;
      q('#zonaConst', cont).innerHTML = UI.tabla({
        columnas:[
          { titulo:'N.°', valor:c => `<span class="t-mono t-xs">${esc(c.numero)}</span>` },
          { titulo:'Estudiante', valor:c => `<b class="t-s">${esc(c.nombre)}</b>
              <div class="t-xs t-mudo">DNI ${esc(c.dni)} · ${esc(c.aula || '')}</div>` },
          { titulo:'Tipo', valor:c => UI.etiqueta(c.tipo || 'Constancia', 'e-azul') },
          { titulo:'Emitida', valor:c => U.fechaHora(c.creado_en) },
          { titulo:'Por', campo:'emitido_por' },
          { titulo:'Verificación', valor:c => `<span class="t-mono t-xs">${esc(c.verificacion || '—')}</span>` },
        ],
        filas: lista,
        vacio:'Aún no se emitieron constancias.',
        iconoVacio:'📄',
      });
    }

    q('#btnNuevaConst', cont).onclick = () => {
      if (!alumnos.length){ UI.ojo('No hay estudiantes matriculados.'); return; }
      const campos = [
        { id:'estudiante_id', etiqueta:'Estudiante', tipo:'select', icono:'🎒', requerido:true, ancho:'completo',
          opciones: alumnos.map(a => ({ valor:a.id, texto:`${a.apellidos}, ${a.nombres} — ${a.dni}` })) },
      ];
      const cuerpo = UI.formulario(campos, { columnas:1 });
      UI.modal({
        titulo:'Emitir constancia', subtitulo:'Elige al estudiante del padrón.',
        cuerpo,
        botones:[
          { texto:'Cancelar', clase:'btn-fantasma', esperando:false, accion: () => {} },
          { texto:'Continuar', clase:'btn-oro', esperando:false,
            accion: ({ zona, cerrar }) => {
              const id = +q('#estudiante_id', zona).value;
              const est = alumnos.find(a => a.id === id);
              cerrar();
              ModEstudiantes.emitirConstancia(est);
              setTimeout(cargar, 2500);
            } },
        ],
      });
    };

    q('#btnRepConst', cont).onclick = () => Reporte.listado({
      titulo:'Constancias emitidas',
      columnas:[
        { titulo:'N.°', campo:'numero' }, { titulo:'Tipo', campo:'tipo' },
        { titulo:'Estudiante', campo:'nombre' }, { titulo:'DNI', campo:'dni' },
        { titulo:'Aula', campo:'aula' }, { titulo:'Emitida por', campo:'emitido_por' },
        { titulo:'Fecha', valor:c => U.fechaHora(c.creado_en) },
        { titulo:'Verificación', campo:'verificacion' },
      ],
      filas: filtradas(),
      resumen:[{ valor: filtradas().length, rotulo:'Documentos emitidos' }],
      obligatorios:['numero','nombre','dni'],
    });

    Panel.conectarHerramientas(cont, pintar);
    await cargar();
  }

  /* ==================================================================
     5. PAGOS Y PENSIONES
     ================================================================== */
  async function vistaPagos(cont, sesion){
    let todos = [], alumnos = [];

    cont.innerHTML = `
      ${UI.herramientas({
        pista:'Buscar por DNI o nombre…',
        filtros:[{ id:'filtroEstadoPago', opciones:[{ valor:'todos', texto:'Todos' }, 'Pendiente','Pagado','Vencido'] }],
        acciones:`
          <button class="btn btn-claro btn-s" id="btnRecordar">🔔 Recordar pendientes</button>
          <button class="btn btn-marino btn-s" id="btnRepPagos">📄 Reporte</button>
          <button class="btn btn-oro btn-s" id="btnNuevoPago">＋ Registrar pago</button>`,
      })}
      <div class="rejilla rejilla-4 mb16" id="kpiPagos"></div>
      <div id="zonaPagos">${UI.esqueleto(3)}</div>`;

    async function cargar(){
      const [p, a] = await Promise.all([
        Datos.pagos.listar({}, { orden:'creado_en' }),
        Datos.estudiantes.listar({ estado:'Matriculado', anio: IE.anio }, { orden:'apellidos', asc:true }),
      ]);
      todos = p.filas; alumnos = a.filas;
      pintar();
    }

    const nombreDe = id => {
      const a = alumnos.find(x => x.id === id);
      return a ? `${a.apellidos}, ${a.nombres}` : '—';
    };

    function filtradas(){
      const t = q('#buscador', cont).value;
      const e = q('#filtroEstadoPago', cont).value;
      return todos
        .map(p => ({ ...p, nombre: nombreDe(p.estudiante_id) }))
        .filter(p => U.coincide(p, t, ['nombre','dni','concepto']) && (e === 'todos' || p.estado === e));
    }

    function pintar(){
      const lista = filtradas();
      const pagados = todos.filter(p => p.estado === 'Pagado');
      const pendientes = todos.filter(p => p.estado !== 'Pagado');

      q('#kpiPagos', cont).innerHTML = `
        ${UI.kpi({ icono:'💰', clase:'l-verde', valor:U.soles(pagados.reduce((a, p) => a + Number(p.monto || 0), 0)), rotulo:'Recaudado' })}
        ${UI.kpi({ icono:'⏳', clase:'l-naranja', valor:U.soles(pendientes.reduce((a, p) => a + Number(p.monto || 0), 0)), rotulo:'Por cobrar' })}
        ${UI.kpi({ icono:'✅', clase:'l-azul', valor:pagados.length, rotulo:'Pagos registrados' })}
        ${UI.kpi({ icono:'⚠️', clase:'l-rojo', valor:pendientes.length, rotulo:'Pendientes' })}`;

      q('#contadorRes', cont).textContent = `${lista.length} registro${lista.length === 1 ? '' : 's'}`;
      q('#zonaPagos', cont).innerHTML = UI.tabla({
        columnas:[
          { titulo:'Estudiante', valor:p => `<b class="t-s">${esc(p.nombre)}</b>
              <div class="t-xs t-mudo">${esc(p.dni || '')}</div>` },
          { titulo:'Concepto', valor:p => `${esc(p.concepto)}<div class="t-xs t-mudo">${esc(p.mes || '')}</div>` },
          { titulo:'Monto', clase:'num', valor:p => `<b>${U.soles(p.monto)}</b>` },
          { titulo:'Estado', valor:p => UI.etiqueta(p.estado, UI.claseEstado(p.estado)) },
          { titulo:'Fecha de pago', valor:p => p.fecha_pago ? U.fecha(p.fecha_pago) : '—' },
          { titulo:'', clase:'acciones', valor:p => p.estado !== 'Pagado'
              ? `<button class="btn btn-verde btn-s" data-cobrar="${p.id}">Marcar pagado</button>` : '' },
        ],
        filas: lista,
        vacio:'No hay movimientos registrados.',
        iconoVacio:'💰',
      });
    }

    cont.addEventListener('click', async e => {
      const b = e.target.closest('[data-cobrar]');
      if (!b) return;
      await Datos.pagos.actualizar(+b.dataset.cobrar, {
        estado:'Pagado', fecha_pago: U.hoyISO(), registrado_por: sesion.nombres,
      });
      Datos.auditar('Pago registrado', 'Pagos');
      UI.exito('Pago registrado.');
      cargar();
    });

    q('#btnNuevoPago', cont).onclick = () => {
      const campos = [
        { id:'estudiante_id', etiqueta:'Estudiante', tipo:'select', icono:'🎒', requerido:true, ancho:'completo',
          opciones: alumnos.map(a => ({ valor:a.id, texto:`${a.apellidos}, ${a.nombres} — ${a.dni}` })) },
        { id:'concepto', etiqueta:'Concepto', tipo:'select', icono:'🏷️', opciones:CONCEPTOS_PAGO },
        { id:'mes', etiqueta:'Mes', tipo:'select', icono:'📅',
          opciones:['Marzo','Abril','Mayo','Junio','Julio','Agosto','Setiembre','Octubre','Noviembre','Diciembre'] },
        { id:'monto', etiqueta:'Monto (S/)', tipo:'number', icono:'💵', requerido:true, valor:IE.pension_primaria,
          atributos:{ step:'0.5', min:'0' }, valida:v => Number(v) > 0 || 'El monto debe ser mayor que cero.' },
        { id:'estado', etiqueta:'Estado', tipo:'select', icono:'📌', opciones:['Pagado','Pendiente'] },
      ];
      const cuerpo = UI.formulario(campos, { columnas:2 });
      UI.modal({
        titulo:'Registrar pago', cuerpo, ancho:'ancha',
        botones:[
          { texto:'Cancelar', clase:'btn-fantasma', esperando:false, accion: () => {} },
          { texto:'Guardar', clase:'btn-oro', esperandoTexto:'Guardando…',
            accion: async ({ zona }) => {
              const d = UI.leerFormulario(zona, campos);
              if (!UI.validarFormulario(zona, campos, d)) return false;
              const a = alumnos.find(x => x.id === +d.estudiante_id);
              await Datos.pagos.crear({
                ...d, estudiante_id:+d.estudiante_id, dni: a ? a.dni : null,
                monto: Number(d.monto),
                fecha_pago: d.estado === 'Pagado' ? U.hoyISO() : null,
                registrado_por: sesion.nombres,
              });
              Datos.auditar('Pago creado', 'Pagos', { detalle: `${d.concepto} ${d.mes}` });
              UI.exito('Registro guardado.');
              cargar();
            } },
        ],
      });
    };

    q('#btnRecordar', cont).onclick = async () => {
      const pend = todos.filter(p => p.estado !== 'Pagado');
      if (!pend.length){ UI.dato('No hay pagos pendientes.'); return; }
      const ok = await UI.confirmar({
        titulo:'Enviar recordatorio',
        texto:`Se publicará un aviso general sobre ${pend.length} pago(s) pendiente(s).`,
        aceptar:'Sí, avisar',
      });
      if (!ok) return;
      await Datos.notificaciones.enviar('Recordatorio de pagos',
        `Hay ${pend.length} pago(s) pendiente(s). Acércate a administración.`, 'Todos');
      Datos.auditar('Recordatorio de pagos enviado', 'Pagos', { detalle: `${pend.length} pendientes` });
      UI.exito('Recordatorio enviado.');
    };

    q('#btnRepPagos', cont).onclick = () => Reporte.listado({
      titulo:'Estado de pagos y pensiones',
      columnas:[
        { titulo:'Estudiante', campo:'nombre' }, { titulo:'DNI', campo:'dni' },
        { titulo:'Concepto', campo:'concepto' }, { titulo:'Mes', campo:'mes' },
        { titulo:'Monto', valor:p => U.soles(p.monto), num:true },
        { titulo:'Estado', campo:'estado' },
        { titulo:'Fecha de pago', valor:p => p.fecha_pago ? U.fecha(p.fecha_pago) : '—' },
      ],
      filas: filtradas(),
      resumen:[
        { valor: U.soles(filtradas().filter(p => p.estado === 'Pagado').reduce((a, p) => a + Number(p.monto || 0), 0)), rotulo:'Recaudado' },
        { valor: U.soles(filtradas().filter(p => p.estado !== 'Pagado').reduce((a, p) => a + Number(p.monto || 0), 0)), rotulo:'Por cobrar' },
      ],
      obligatorios:['concepto','monto'],
    });

    Panel.conectarHerramientas(cont, pintar);
    await cargar();
  }

  return { vistaMatricula, vistaSolicitudes, vistaDocumentos, vistaConstancias, vistaPagos };
})();
