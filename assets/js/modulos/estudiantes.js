/* =====================================================================
   MÓDULO: ESTUDIANTES
   ---------------------------------------------------------------------
   Indicador 1 (organización): clasificación por grado/estado, búsqueda
     por DNI o nombre, código correlativo y ficha completa.
   Indicador 2 (rapidez): formulario corto, validación en vivo, alta en
     un clic, importación masiva desde Excel/CSV.
   Indicador 6 (precisión): DNI único verificado antes de guardar,
     campos obligatorios y control de integridad.
   ===================================================================== */
'use strict';

const ModEstudiantes = (() => {
  const { q, qq, esc } = U;

  const POR_PAGINA = 12;

  /* ==================================================================
     DEFINICIÓN DEL FORMULARIO
     ================================================================== */
  function campos(valores = {}){
    return [
      { tipo:'separador', etiqueta:'Datos del estudiante' },
      { id:'nombres', etiqueta:'Nombres', icono:'🧒', requerido:true, limpiar:'nombre', valor:valores.nombres,
        valida:v => U.val.largo(v, 2, 60) || 'Escribe el nombre completo.' },
      { id:'apellidos', etiqueta:'Apellidos', icono:'👪', requerido:true, limpiar:'nombre', valor:valores.apellidos,
        valida:v => U.val.largo(v, 2, 60) || 'Escribe los dos apellidos.' },
      { id:'dni', etiqueta:'DNI', icono:'🪪', requerido:true, limpiar:'dni', valor:valores.dni,
        atributos:{ inputmode:'numeric', maxlength:8 }, pista:'8 dígitos',
        valida:v => U.dniPlausible(v) || 'El DNI debe tener 8 dígitos válidos.' },
      { id:'fecha_nac', etiqueta:'Fecha de nacimiento', tipo:'date', icono:'🎂', valor:valores.fecha_nac,
        valida:v => { const e = U.edad(v); return (e !== null && e >= 2 && e <= 16) || 'La edad debe estar entre 2 y 16 años.'; } },
      { id:'sexo', etiqueta:'Sexo', tipo:'select', icono:'⚧', valor:valores.sexo || 'M',
        opciones:[{ valor:'M', texto:'Masculino' }, { valor:'F', texto:'Femenino' }] },
      { id:'grado', etiqueta:'Grado', tipo:'select', icono:'🏫', requerido:true, valor:valores.grado, opciones:GRADOS },
      { id:'seccion', etiqueta:'Sección', icono:'🔤', valor:valores.seccion || 'Única', pista:'Única, A, B…' },
      { id:'estado', etiqueta:'Estado', tipo:'select', icono:'📌', valor:valores.estado || 'Matriculado',
        opciones:ESTADOS_ESTUDIANTE },

      { tipo:'separador', etiqueta:'Datos del apoderado' },
      { id:'apoderado', etiqueta:'Apoderado', icono:'🧑', limpiar:'nombre', valor:valores.apoderado,
        valida:v => U.val.largo(v, 4, 90) || 'Escribe nombres y apellidos.' },
      { id:'dni_apoderado', etiqueta:'DNI del apoderado', icono:'🪪', limpiar:'dni', valor:valores.dni_apoderado,
        atributos:{ inputmode:'numeric', maxlength:8 },
        valida:v => U.dniPlausible(v) || 'DNI de 8 dígitos.' },
      { id:'celular', etiqueta:'Celular', icono:'📱', limpiar:'num', valor:valores.celular,
        atributos:{ inputmode:'numeric', maxlength:9 },
        valida:v => U.val.celular(v) || 'Debe empezar en 9 y tener 9 dígitos.' },
      { id:'correo_apoderado', etiqueta:'Correo del apoderado', tipo:'email', icono:'✉️', valor:valores.correo_apoderado,
        valida:v => U.val.correo(v) || 'Revisa el correo.' },
      { id:'direccion', etiqueta:'Dirección', icono:'📍', valor:valores.direccion, ancho:'completo' },
      { id:'observaciones', etiqueta:'Observaciones', tipo:'area', filas:2, ancho:'completo', valor:valores.observaciones },
    ];
  }

  /* ==================================================================
     ALTA Y EDICIÓN
     ================================================================== */
  function abrirFormulario({ estudiante = null, alGuardar } = {}){
    const editando = !!estudiante;
    const lista = campos(estudiante || {});
    const cuerpo = U.crear('div');

    if (!editando){
      cuerpo.innerHTML = `<div class="banda banda-info mb16"><span class="ic">⚡</span>
        <div>El código de matrícula se genera solo y el DNI se verifica mientras escribes,
        para que no se dupliquen registros.</div></div>`;
    }
    cuerpo.append(UI.formulario(lista, { columnas:2 }));

    const m = UI.modal({
      titulo: editando ? 'Editar estudiante' : 'Registrar estudiante',
      subtitulo: editando
        ? `${estudiante.codigo || ''} · registrado el ${U.fecha(estudiante.creado_en)}`
        : 'Los campos con * son obligatorios.',
      cuerpo, ancho:'ancha',
      botones:[
        { texto:'Cancelar', clase:'btn-fantasma', esperando:false, accion: () => {} },
        { texto: editando ? 'Guardar cambios' : 'Registrar', clase:'btn-oro', esperandoTexto:'Guardando…',
          accion: async ({ zona }) => {
            const datos = UI.leerFormulario(zona, lista);
            if (!UI.validarFormulario(zona, lista, datos)) return false;

            /* Comprobación final de DNI duplicado (indicador 6). */
            const ocupado = await Datos.estudiantes.dniOcupado(datos.dni, editando ? estudiante.id : null);
            if (ocupado){
              UI.marcarCampo(zona, 'dni', `Ya registrado: ${ocupado.apellidos}, ${ocupado.nombres}.`);
              return false;
            }

            const s = Sesion.actual();
            const t0 = performance.now();

            if (editando){
              await Datos.estudiantes.actualizar(estudiante.id, datos);
              Datos.auditar('Estudiante actualizado', 'Estudiantes',
                { ms: Math.round(performance.now() - t0), detalle: datos.dni });
              UI.exito('Datos actualizados.');
            } else {
              const codigo = await Datos.estudiantes.siguienteCodigo();
              const { fila } = await Datos.estudiantes.crear({
                ...datos, codigo, anio: IE.anio,
                registrado_por: s ? s.nombres : 'Sistema',
                segundos: Math.round((performance.now() - t0) / 1000),
                completo: 1,
              });
              /* Deja además el registro de matrícula del año. */
              await Datos.matriculas.crear({
                estudiante_id: fila.id, dni: fila.dni, anio: IE.anio,
                grado: fila.grado, seccion: fila.seccion || 'Única',
                estado: 'Activa', monto: IE.costo_matricula,
                registrado_por: s ? s.nombres : 'Sistema',
                ms: Math.round(performance.now() - t0),
              });
              Datos.auditar('Estudiante registrado', 'Matrícula',
                { ms: Math.round(performance.now() - t0), detalle: `${codigo} · ${datos.dni}` });
              UI.exito(`${datos.nombres} registrado en ${U.ms(Math.round(performance.now() - t0))} · ${codigo}`);
            }

            if (alGuardar) alGuardar();
          } },
      ],
    });

    /* Validación en vivo del DNI mientras escribe (indicadores 2 y 6). */
    const campoDni = q('#dni', m.zona);
    campoDni.addEventListener('input', () => campoDni.value = U.soloDigitos(campoDni.value, 8));
    campoDni.addEventListener('blur', async () => {
      const v = campoDni.value;
      if (!U.dniPlausible(v)) return;
      const ocupado = await Datos.estudiantes.dniOcupado(v, editando ? estudiante.id : null);
      UI.marcarCampo(m.zona, 'dni',
        ocupado ? `Ya registrado: ${ocupado.apellidos}, ${ocupado.nombres}.` : 'DNI disponible.',
        !ocupado);
    });

    /* El celular y el DNI del apoderado también se limpian solos. */
    ['celular','dni_apoderado'].forEach(id => {
      const el = q('#' + id, m.zona);
      if (el) el.addEventListener('input', () =>
        el.value = U.soloDigitos(el.value, id === 'celular' ? 9 : 8));
    });

    return m;
  }

  /* ==================================================================
     FICHA DEL ESTUDIANTE
     ================================================================== */
  async function verFicha(estudiante, { puedeEditar = false, alGuardar } = {}){
    const cuerpo = U.crear('div');
    cuerpo.innerHTML = UI.cargando('Reuniendo la información…');

    const m = UI.modal({
      titulo: `${estudiante.apellidos}, ${estudiante.nombres}`,
      subtitulo: `${estudiante.codigo || 'Sin código'} · DNI ${estudiante.dni}`,
      cuerpo, ancho:'ancha',
      botones:[
        { texto:'📄 Ficha (PDF)', clase:'btn-claro', esperando:false,
          accion: () => { Reporte.fichaMatricula(estudiante, 'pdf'); return false; } },
        { texto:'📝 Ficha (Word)', clase:'btn-claro', esperando:false,
          accion: () => { Reporte.fichaMatricula(estudiante, 'word'); return false; } },
        { texto:'Constancia', clase:'btn-claro', esperando:false,
          accion: () => { emitirConstancia(estudiante); return false; } },
        ...(puedeEditar ? [{ texto:'Editar', clase:'btn-oro', esperando:false,
          accion: ({ cerrar }) => { cerrar(); abrirFormulario({ estudiante, alGuardar }); } }] : []),
      ],
    });

    try {
      const [notas, entregas, pagos] = await Promise.all([
        Datos.notas.deEstudiante(estudiante.id).then(r => r.filas).catch(() => []),
        Datos.entregas.deEstudiante(estudiante.id).then(r => r.filas).catch(() => []),
        Datos.pagos.listar({ estudiante_id: estudiante.id }).then(r => r.filas).catch(() => []),
      ]);

      const prom = U.promedio(notas.map(n => n.nota));
      const dato = (r, v) => `<div><dt>${esc(r)}</dt><dd>${esc(v ?? '—')}</dd></div>`;

      m.zona.innerHTML = `
        <div class="rejilla rejilla-4 mb16">
          ${UI.kpi({ icono:'📊', clase:'l-oro',   valor: prom ?? '—', rotulo:'Promedio general' })}
          ${UI.kpi({ icono:'📝', clase:'l-azul',  valor: notas.length, rotulo:'Notas registradas' })}
          ${UI.kpi({ icono:'📤', clase:'l-verde', valor: entregas.length, rotulo:'Tareas entregadas' })}
          ${UI.kpi({ icono:'💰', clase:'l-morado',valor: pagos.filter(p => p.estado === 'Pagado').length, rotulo:'Pagos al día' })}
        </div>

        <div class="rejilla rejilla-2">
          <div class="tarjeta tarjeta-solida">
            <div class="cabeza"><h3>🧒 Datos personales</h3></div>
            <dl class="ficha-lista">
              ${dato('Código', estudiante.codigo)}
              ${dato('DNI', estudiante.dni)}
              ${dato('Nacimiento', estudiante.fecha_nac ? U.fechaLarga(estudiante.fecha_nac) : null)}
              ${dato('Edad', U.edad(estudiante.fecha_nac) ? U.edad(estudiante.fecha_nac) + ' años' : null)}
              ${dato('Sexo', estudiante.sexo === 'F' ? 'Femenino' : 'Masculino')}
              ${dato('Grado', estudiante.grado)}
              ${dato('Sección', estudiante.seccion || 'Única')}
              ${dato('Nivel', U.nivelDeGrado(estudiante.grado))}
            </dl>
          </div>

          <div class="tarjeta tarjeta-solida">
            <div class="cabeza"><h3>👪 Apoderado y contacto</h3></div>
            <dl class="ficha-lista">
              ${dato('Apoderado', estudiante.apoderado)}
              ${dato('DNI apoderado', estudiante.dni_apoderado)}
              ${dato('Celular', estudiante.celular)}
              ${dato('Correo', estudiante.correo_apoderado)}
              ${dato('Dirección', estudiante.direccion)}
              ${dato('Estado', estudiante.estado)}
              ${dato('Registrado por', estudiante.registrado_por)}
              ${dato('Fecha de registro', U.fecha(estudiante.creado_en))}
            </dl>
          </div>
        </div>

        ${notas.length ? `
          <div class="tarjeta tarjeta-solida mt16">
            <div class="cabeza"><h3>📚 Rendimiento por área</h3></div>
            ${UI.tabla({
              columnas:[
                { titulo:'Área', campo:'curso' },
                { titulo:'Bim.', campo:'bimestre', clase:'t-c' },
                { titulo:'Nota', clase:'num', valor:f => `<b>${Number(f.nota).toFixed(0)}</b>` },
                { titulo:'Logro', valor:f => UI.etiqueta(U.literal(f.nota),
                    { AD:'e-verde', A:'e-azul', B:'e-naranja', C:'e-rojo' }[U.literal(f.nota)] || 'e-gris') },
                { titulo:'Docente', campo:'docente' },
              ],
              filas: notas,
            })}
          </div>` : ''}

        ${estudiante.observaciones ? `
          <div class="banda banda-ojo mt16"><span class="ic">📝</span>
            <div><b>Observaciones:</b> ${esc(estudiante.observaciones)}</div></div>` : ''}`;

    } catch(e){
      m.zona.innerHTML = `<div class="banda banda-mal"><span class="ic">⛔️</span><div>${esc(e.message)}</div></div>`;
    }
  }

  /* ==================================================================
     CONSTANCIA
     ================================================================== */
  function emitirConstancia(estudiante){
    const campos = [
      { id:'tipo', etiqueta:'Tipo de documento', tipo:'select', icono:'📄', ancho:'completo',
        opciones:['Constancia de matrícula','Constancia de estudios','Constancia de vacante','Constancia de conducta'] },
      { id:'motivo', etiqueta:'Motivo o destino', tipo:'area', filas:3, ancho:'completo',
        pista:'Ej.: trámite de traslado a otra institución educativa.',
        valor:'Trámites que el interesado estime conveniente.' },
    ];
    const cuerpo = U.crear('div');
    cuerpo.innerHTML = `<div class="banda banda-info mb16"><span class="ic">🔎</span>
      <div>Los datos se toman directamente del padrón, sin escribirlos a mano.
      El documento lleva código de verificación y QR.</div></div>`;
    cuerpo.append(UI.formulario(campos, { columnas:1 }));

    UI.modal({
      titulo:'Emitir constancia',
      subtitulo:`${estudiante.apellidos}, ${estudiante.nombres}`,
      cuerpo,
      botones:[
        { texto:'Cancelar', clase:'btn-fantasma', esperando:false, accion: () => {} },
        { texto:'📝 Emitir en Word', clase:'btn-marino', esperandoTexto:'Generando…',
          accion: async ({ zona }) => {
            const d = UI.leerFormulario(zona, campos);
            await Reporte.constancia({ estudiante, tipo:d.tipo, motivo:d.motivo, formato:'word' });
          } },
        { texto:'📄 Emitir en PDF', clase:'btn-oro', esperandoTexto:'Generando…',
          accion: async ({ zona }) => {
            const d = UI.leerFormulario(zona, campos);
            await Reporte.constancia({ estudiante, tipo:d.tipo, motivo:d.motivo, formato:'pdf' });
          } },
      ],
    });
  }

  /* ==================================================================
     DAR DE BAJA O ELIMINAR UN ESTUDIANTE
     ------------------------------------------------------------------
     Solo dirección y la oficina administrativa, siempre a mano y nunca
     de forma automática. Antes de borrar se mira si el estudiante tiene
     historia académica (notas, asistencia, entregas, matrículas): si la
     tiene, borrarlo se llevaría esos registros con él, así que lo que
     se ofrece es el retiro —queda en el padrón con estado «Retirado» y
     su historial intacto—, que es lo que el colegio hace de verdad.
     El borrado definitivo queda para el caso real que lo justifica: la
     ficha se registró por error y no tiene nada colgando.
     ================================================================== */
  async function eliminarEstudiante(estudiante, alTerminar){
    const sesion = Sesion.actual() || {};
    if (!['director','administrativo'].includes(sesion.rol)){
      UI.fallo('Solo la dirección o la oficina administrativa pueden dar de baja a un estudiante.');
      return;
    }

    const quien = `${estudiante.apellidos}, ${estudiante.nombres}`;
    const cuerpo = U.crear('div');
    cuerpo.innerHTML = UI.cargando('Revisando qué registros tiene…');

    const m = UI.modal({
      titulo:'Dar de baja a un estudiante',
      subtitulo: quien,
      cuerpo,
      botones:[{ texto:'Cerrar', clase:'btn-fantasma' }],
    });

    /* Recuento real de lo que hay colgando de esta ficha. */
    const cuenta = async (repo, filtro) => {
      try { const { filas } = await Datos[repo].listar(filtro, { limite:1000 }); return filas.length; }
      catch(e){ return 0; }
    };
    const [notas, asistencia, entregas, matriculas] = await Promise.all([
      cuenta('notas',      { estudiante_id: estudiante.id }),
      cuenta('asistencia', { estudiante_id: estudiante.id }),
      cuenta('entregas',   { estudiante_id: estudiante.id }),
      cuenta('matriculas', { estudiante_id: estudiante.id }),
    ]);
    const historial = notas + asistencia + entregas + matriculas;
    const yaRetirado = estudiante.estado === 'Retirado';

    cuerpo.innerHTML = `
      <div class="banda ${historial ? 'banda-ojo' : 'banda-info'} mb16">
        <span class="ic">${historial ? '⚠️' : 'ℹ️'}</span>
        <div>${historial
          ? `<b>${quien}</b> tiene historial académico en el sistema.
             Eliminarlo borraría también esos registros, y eso no se puede deshacer.`
          : `<b>${quien}</b> no tiene notas, asistencia, entregas ni matrículas registradas.`}</div>
      </div>
      <dl class="ficha-lista mb16">
        <div><dt>Notas registradas</dt><dd>${notas}</dd></div>
        <div><dt>Días de asistencia</dt><dd>${asistencia}</dd></div>
        <div><dt>Tareas entregadas</dt><dd>${entregas}</dd></div>
        <div><dt>Matrículas</dt><dd>${matriculas}</dd></div>
        <div><dt>Estado actual</dt><dd>${esc(estudiante.estado || '—')}</dd></div>
      </dl>
      <div class="pila g8">
        ${yaRetirado ? '' : `<button class="btn btn-oro btn-bloque" id="btnRetirar">
          📕 Registrar retiro (recomendado) — conserva todo su historial</button>`}
        <button class="btn ${historial ? 'btn-fantasma' : 'btn-mal'} btn-bloque" id="btnBorrarDef">
          🗑 Eliminar la ficha definitivamente${historial ? ' (borra también su historial)' : ''}</button>
      </div>
      <p class="t-xs t-mudo mt12">Cualquiera de las dos acciones queda firmada con tu
        nombre en la auditoría del sistema.</p>`;

    const btnRetirar = cuerpo.querySelector('#btnRetirar');
    if (btnRetirar) btnRetirar.onclick = async () => {
      btnRetirar.disabled = true;
      try {
        await Datos.estudiantes.actualizar(estudiante.id, { estado:'Retirado' });
        Datos.auditar('Estudiante retirado', 'Estudiantes',
                      { detalle:`${quien} · DNI ${estudiante.dni}` });
        UI.exito(`${quien} quedó como «Retirado». Su historial se conserva.`);
        m.cerrar();
        if (alTerminar) alTerminar();
      } catch(e){ UI.fallo(e.message); btnRetirar.disabled = false; }
    };

    /* Doble confirmación escribiendo el DNI: un clic distraído no puede
       borrar a un estudiante del padrón. */
    cuerpo.querySelector('#btnBorrarDef').onclick = async () => {
      m.cerrar();
      const campos = [
        { id:'dni', etiqueta:`Escribe el DNI de ${quien} para confirmar`, icono:'🪪',
          ancho:'completo', requerido:true,
          valida:v => v === estudiante.dni || 'El DNI no coincide con el de esa ficha.' },
      ];
      const zonaConf = U.crear('div');
      zonaConf.innerHTML = `<div class="banda banda-mal mb16"><span class="ic">⛔️</span>
        <div>Esto <b>no se puede deshacer</b>. Se eliminará la ficha de <b>${esc(quien)}</b>${
          historial ? ` y sus ${historial} registro(s) asociados` : ''}.</div></div>`;
      zonaConf.append(UI.formulario(campos, { columnas:1 }));

      UI.modal({
        titulo:'Confirmar la eliminación', subtitulo: quien, cuerpo: zonaConf,
        botones:[
          { texto:'Cancelar', clase:'btn-fantasma', esperando:false, accion(){} },
          { texto:'Sí, eliminar', clase:'btn-mal', esperandoTexto:'Eliminando…',
            accion: async ({ zona }) => {
              const d = UI.leerFormulario(zona, campos);
              if (!UI.validarFormulario(zona, campos, d)) return false;
              await Datos.estudiantes.eliminar(estudiante.id);
              Datos.auditar('Estudiante eliminado del padrón', 'Estudiantes',
                            { detalle:`${quien} · DNI ${estudiante.dni} · ${historial} registro(s)` });
              UI.exito(`Se eliminó la ficha de ${quien}.`);
              if (alTerminar) alTerminar();
            } },
        ],
      });
    };
  }

  /* ==================================================================
     IMPORTACIÓN MASIVA (indicador 2)
     ================================================================== */
  function abrirImportador(alTerminar){
    const cuerpo = U.crear('div');
    cuerpo.innerHTML = `
      <div class="banda banda-info mb16"><span class="ic">📥</span>
        <div>Sube un archivo <b>CSV</b> exportado de Excel o del SIAGIE.
        La primera fila debe tener los encabezados.</div></div>

      <div class="soltar" id="zonaSoltar">
        <div class="icono">📄</div>
        <b>Arrastra el archivo aquí</b>
        <div class="t-s mt8">o toca para elegirlo · solo .csv</div>
        <input type="file" id="archivoCSV" accept=".csv,text/csv" hidden>
      </div>

      <details class="mt16">
        <summary class="t-s t-fuerte cursor-mano">Ver columnas aceptadas</summary>
        <div class="t-s t-mudo mt8 t-alto">
          <b>Obligatorias:</b> nombres, apellidos, dni, grado<br>
          <b>Opcionales:</b> fecha_nac, sexo, seccion, apoderado, dni_apoderado, celular, direccion<br>
          Los nombres de columna no distinguen tildes ni mayúsculas.
        </div>
        <button class="btn btn-claro btn-s mt12" id="btnPlantilla">Descargar plantilla de ejemplo</button>
      </details>

      <div id="resultadoImport" class="mt16"></div>`;

    const m = UI.modal({
      titulo:'Importar estudiantes',
      subtitulo:'Carga varios registros de una sola vez.',
      cuerpo, ancho:'ancha',
      botones:[{ texto:'Cerrar', clase:'btn-claro', esperando:false, accion: () => { if (alTerminar) alTerminar(); } }],
    });

    const zona = q('#zonaSoltar', m.zona);
    const input = q('#archivoCSV', m.zona);

    q('#btnPlantilla', m.zona).onclick = () => {
      U.descargar(
        '\uFEFFnombres;apellidos;dni;grado;fecha_nac;sexo;seccion;apoderado;dni_apoderado;celular;direccion\r\n' +
        'MARIA FERNANDA;PEREZ TORRES;91234567;1.er grado;2019-04-12;F;Única;Ana Torres;41234567;987654321;Av. Los Libertadores 100\r\n',
        'plantilla_estudiantes.csv');
    };

    zona.onclick = () => input.click();
    ['dragenter','dragover'].forEach(ev => zona.addEventListener(ev, e => {
      e.preventDefault(); zona.classList.add('encima');
    }));
    ['dragleave','drop'].forEach(ev => zona.addEventListener(ev, e => {
      e.preventDefault(); zona.classList.remove('encima');
    }));
    zona.addEventListener('drop', e => {
      const f = e.dataTransfer.files[0];
      if (f) procesar(f, m.zona, alTerminar);
    });
    input.onchange = () => { if (input.files[0]) procesar(input.files[0], m.zona, alTerminar); };
  }

  async function procesar(archivo, raiz, alTerminar){
    const salida = q('#resultadoImport', raiz);
    salida.innerHTML = UI.cargando('Leyendo el archivo…');

    try {
      const texto = await archivo.text();
      const filas = U.csvAObjetos(texto);
      if (!filas.length) throw new Error('El archivo no tiene filas de datos.');

      /* --- Validación fila por fila antes de tocar la base de datos --- */
      const existentes = new Set(
        (await Datos.estudiantes.listar({}, { columnas:'dni' })).filas.map(e => e.dni));
      const vistos = new Set();
      const buenas = [], malas = [];

      filas.forEach((f, i) => {
        const dni = U.soloDigitos(f.dni, 8);
        const grado = GRADOS.find(g => U.sinTildes(g) === U.sinTildes(f.grado || ''));
        const problemas = [];
        if (!U.val.largo(f.nombres, 2, 60))   problemas.push('nombres');
        if (!U.val.largo(f.apellidos, 2, 60)) problemas.push('apellidos');
        if (!U.dniPlausible(dni))             problemas.push('DNI inválido');
        else if (existentes.has(dni))         problemas.push('DNI ya registrado');
        else if (vistos.has(dni))             problemas.push('DNI repetido en el archivo');
        if (!grado)                           problemas.push('grado no reconocido');

        if (problemas.length){
          malas.push({ fila: i + 2, dni: f.dni || '—', nombre: `${f.apellidos || ''} ${f.nombres || ''}`.trim(), problemas });
        } else {
          vistos.add(dni);
          buenas.push({
            nombres: U.may(U.limpiarNombre(f.nombres)),
            apellidos: U.may(U.limpiarNombre(f.apellidos)),
            dni, grado,
            fecha_nac: U.val.fecha(f.fecha_nac) ? f.fecha_nac : null,
            sexo: /^f/i.test(f.sexo || '') ? 'F' : 'M',
            seccion: U.limpiar(f.seccion, 12) || 'Única',
            apoderado: U.limpiarNombre(f.apoderado) || null,
            dni_apoderado: U.soloDigitos(f.dni_apoderado, 8) || null,
            celular: U.soloDigitos(f.celular, 9) || null,
            direccion: U.limpiar(f.direccion, 160) || null,
            estado: 'Matriculado',
            anio: IE.anio,
          });
        }
      });

      salida.innerHTML = `
        <div class="rejilla rejilla-3 mb16">
          ${UI.kpi({ icono:'📄', clase:'l-azul',  valor:filas.length, rotulo:'Filas leídas' })}
          ${UI.kpi({ icono:'✅', clase:'l-verde', valor:buenas.length, rotulo:'Listas para importar' })}
          ${UI.kpi({ icono:'⚠️', clase:'l-rojo',  valor:malas.length,  rotulo:'Con observaciones' })}
        </div>
        ${malas.length ? `
          <div class="tarjeta tarjeta-solida mb16">
            <div class="cabeza"><h3>Filas que no se importarán</h3></div>
            ${UI.tabla({
              columnas:[
                { titulo:'Fila', campo:'fila', clase:'num' },
                { titulo:'DNI', campo:'dni' },
                { titulo:'Nombre', campo:'nombre' },
                { titulo:'Motivo', valor:f => f.problemas.map(p => UI.etiqueta(p, 'e-rojo')).join(' ') },
              ],
              filas: malas.slice(0, 40),
            })}
          </div>` : ''}
        ${buenas.length ? `<button class="btn btn-oro btn-bloque" id="btnConfirmarImport">
            Importar ${buenas.length} estudiante${buenas.length === 1 ? '' : 's'}</button>` :
          `<div class="banda banda-mal"><span class="ic">⛔️</span><div>No hay filas válidas para importar.</div></div>`}`;

      if (!buenas.length) return;

      q('#btnConfirmarImport', raiz).onclick = async (ev) => {
        const btn = ev.currentTarget;
        btn.disabled = true; btn.textContent = 'Importando…';
        const t0 = performance.now();
        try {
          /* Se numeran los códigos de forma correlativa. */
          const inicial = await Datos.estudiantes.siguienteCodigo();
          let n = parseInt(inicial.split('-')[2], 10);
          const s = Sesion.actual();
          const conCodigo = buenas.map(b => ({
            ...b,
            codigo: U.codigoEstudiante(n++),
            registrado_por: (s ? s.nombres : 'Sistema') + ' (importación)',
          }));

          /* En bloques de 50 para no saturar la conexión. */
          let importados = 0;
          for (let i = 0; i < conCodigo.length; i += 50){
            const bloque = conCodigo.slice(i, i + 50);
            await Datos.estudiantes.crearVarios(bloque);
            importados += bloque.length;
            btn.textContent = `Importando… ${importados}/${conCodigo.length}`;
          }

          const ms = Math.round(performance.now() - t0);
          Datos.auditar('Importación masiva de estudiantes', 'Estudiantes',
            { ms, detalle: `${importados} registros` });
          salida.innerHTML = `<div class="banda banda-ok"><span class="ic">✅</span>
            <div><b>${importados} estudiantes importados</b> en ${U.ms(ms)}
            (${U.redondear(ms / importados, 0)} ms por registro).</div></div>`;
          UI.exito(`${importados} estudiantes importados.`);
          if (alTerminar) alTerminar();
        } catch(e){
          salida.innerHTML = `<div class="banda banda-mal"><span class="ic">⛔️</span><div>${esc(e.message)}</div></div>`;
          btn.disabled = false; btn.textContent = 'Reintentar';
        }
      };

    } catch(e){
      salida.innerHTML = `<div class="banda banda-mal"><span class="ic">⛔️</span><div>${esc(e.message)}</div></div>`;
    }
  }

  /* ==================================================================
     VISTA DE LISTA (se usa en administración, dirección y docente)
     ================================================================== */
  async function vistaLista(cont, opciones = {}){
    const {
      soloLectura = false,
      gradosPermitidos = null,   // para el docente: solo sus aulas
      titulo = 'Padrón de estudiantes',
    } = opciones;

    /* Dar de baja a un estudiante es una decisión de la dirección o de
       la oficina administrativa, y de nadie más. El permiso se comprueba
       contra la sesión de verdad, no contra lo que llegue en opciones:
       así no basta con abrir la consola y cambiar un parámetro. */
    const sesionActual = Sesion.actual() || {};
    const puedeEliminar = ['director','administrativo'].includes(sesionActual.rol);

    let todos = [], pagina = 1;

    const filtrosGrado = gradosPermitidos
      ? gradosPermitidos
      : [{ valor:'todos', texto:'Todos los grados' }, ...GRADOS];

    cont.innerHTML = `
      ${UI.herramientas({
        pista:'Buscar por DNI, nombre, apellido o código…',
        filtros:[
          { id:'filtroGrado',  opciones: filtrosGrado },
          { id:'filtroEstado', opciones:[{ valor:'todos', texto:'Todos los estados' }, ...ESTADOS_ESTUDIANTE] },
        ],
        fechas:true,
        acciones: soloLectura ? `
          <button class="btn btn-claro btn-s" id="btnExportar">⬇️ Exportar</button>
          <button class="btn btn-marino btn-s" id="btnReporte">📄 Reporte</button>` : `
          <button class="btn btn-claro btn-s" id="btnImportar">📥 Importar</button>
          <button class="btn btn-claro btn-s" id="btnExportar">⬇️ Exportar</button>
          <button class="btn btn-marino btn-s" id="btnReporte">📄 Reporte</button>
          <button class="btn btn-oro btn-s" id="btnNuevo">＋ Registrar</button>`,
      })}
      <div id="zonaTabla">${UI.esqueleto(4)}</div>
      <div id="zonaPaginas"></div>`;

    async function traer(){
      const { filas, ms } = await Datos.estudiantes.listar({}, { orden:'apellidos', asc:true });
      todos = gradosPermitidos ? filas.filter(f => gradosPermitidos.includes(f.grado)) : filas;
      q('#contadorRes', cont).textContent = `${todos.length} registros · ${U.ms(ms)}`;
      pintar();
    }

    function filtradas(){
      const texto  = q('#buscador', cont).value;
      const grado  = q('#filtroGrado', cont).value;
      const estado = q('#filtroEstado', cont).value;
      const desde  = q('#fDesde', cont).value;
      const hasta  = q('#fHasta', cont).value;
      /* La fecha se compara en texto ISO (aaaa-mm-dd): ordena igual que
         como número y no depende de la zona horaria del navegador. */
      const dentro = e => {
        if (!desde && !hasta) return true;
        const f = String(e.creado_en || '').slice(0, 10);
        if (!f) return false;
        return (!desde || f >= desde) && (!hasta || f <= hasta);
      };
      return todos.filter(e =>
        U.coincide(e, texto, ['nombres','apellidos','dni','codigo','apoderado']) &&
        (grado === 'todos' || e.grado === grado) &&
        (estado === 'todos' || e.estado === estado) &&
        dentro(e));
    }

    function pintar(){
      const lista = filtradas();
      const desde = (pagina - 1) * POR_PAGINA;
      const pagina_ = lista.slice(desde, desde + POR_PAGINA);

      q('#contadorRes', cont).textContent =
        `${lista.length} de ${todos.length} estudiante${todos.length === 1 ? '' : 's'}`;

      q('#zonaTabla', cont).innerHTML = UI.tabla({
        columnas:[
          { titulo:'Estudiante', valor: e => `
            <div class="fila g12">
              ${UI.avatar(e.apellidos + ' ' + e.nombres)}
              <div class="min0">
                <b class="t-s">${esc(e.apellidos)}, ${esc(e.nombres)}</b>
                <div class="t-xs t-mudo">${esc(e.codigo || '—')}</div>
              </div>
            </div>` },
          { titulo:'DNI', valor: e => `<span class="t-mono">${esc(e.dni)}</span>` },
          { titulo:'Grado', valor: e => `${esc(e.grado || '—')}<div class="t-xs t-mudo">${esc(e.seccion || 'Única')}</div>` },
          { titulo:'Apoderado', valor: e => e.apoderado
              ? `${esc(e.apoderado)}<div class="t-xs t-mudo">${esc(e.celular || 'sin celular')}</div>`
              : '<span class="t-mudo">—</span>' },
          { titulo:'Estado', valor: e => UI.etiqueta(e.estado, UI.claseEstado(e.estado)) },
          { titulo:'', clase:'acciones', valor: e => `
            <div class="acciones">
              <button class="btn-ico" data-ver="${e.id}" title="Ver ficha">👁</button>
              ${soloLectura ? '' : `<button class="btn-ico" data-editar="${e.id}" title="Editar">✏️</button>`}
              <button class="btn-ico" data-constancia="${e.id}" title="Constancia">📄</button>
              ${puedeEliminar ? `<button class="btn-ico btn-ico-mal" data-borrar-est="${e.id}"
                  title="Dar de baja o eliminar">🗑</button>` : ''}
            </div>` },
        ],
        filas: pagina_,
        vacio: todos.length ? 'Ningún estudiante coincide con la búsqueda.' : 'Todavía no hay estudiantes registrados.',
        iconoVacio: todos.length ? '🔍' : '🎒',
      });

      const pag = q('#zonaPaginas', cont);
      pag.innerHTML = '';
      pag.append(UI.paginador(lista.length, pagina, POR_PAGINA, p => { pagina = p; pintar(); }));
    }

    /* --- Acciones --- */
    cont.addEventListener('click', async e => {
      const btn = e.target.closest('[data-ver],[data-editar],[data-constancia],[data-borrar-est]');
      if (!btn) return;
      const id = +(btn.dataset.ver || btn.dataset.editar || btn.dataset.constancia || btn.dataset.borrarEst);
      const est = todos.find(x => x.id === id);
      if (!est) return;
      if (btn.dataset.ver)             verFicha(est, { puedeEditar: !soloLectura, alGuardar: traer });
      else if (btn.dataset.editar)     abrirFormulario({ estudiante: est, alGuardar: traer });
      else if (btn.dataset.borrarEst)  eliminarEstudiante(est, traer);
      else                             emitirConstancia(est);
    });

    Panel.conectarHerramientas(cont, () => { pagina = 1; pintar(); });

    const btnNuevo = q('#btnNuevo', cont);
    if (btnNuevo) btnNuevo.onclick = () => abrirFormulario({ alGuardar: traer });

    const btnImportar = q('#btnImportar', cont);
    if (btnImportar) btnImportar.onclick = () => abrirImportador(traer);

    q('#btnExportar', cont).onclick = () => {
      const lista = filtradas();
      U.descargar(U.aCSV(lista, [
        { titulo:'Código', campo:'codigo' }, { titulo:'Apellidos', campo:'apellidos' },
        { titulo:'Nombres', campo:'nombres' }, { titulo:'DNI', campo:'dni' },
        { titulo:'Grado', campo:'grado' }, { titulo:'Sección', campo:'seccion' },
        { titulo:'Estado', campo:'estado' }, { titulo:'Apoderado', campo:'apoderado' },
        { titulo:'Celular', campo:'celular' },
      ]), `estudiantes_${IE.anio}.csv`);
      Datos.auditar('Exportación de padrón', 'Estudiantes', { detalle: `${lista.length} filas` });
      UI.exito(`${lista.length} registros exportados.`);
    };

    q('#btnReporte', cont).onclick = () => {
      const lista = filtradas();
      Reporte.listado({
        titulo: titulo,
        subtitulo: `Año escolar ${IE.anio}`,
        columnas:[
          { titulo:'N.°', valor:(f, i) => '' },
          { titulo:'Código', campo:'codigo' },
          { titulo:'Apellidos y nombres', valor:f => `${f.apellidos}, ${f.nombres}` },
          { titulo:'DNI', campo:'dni' },
          { titulo:'Grado', campo:'grado' },
          { titulo:'Estado', campo:'estado' },
          { titulo:'Apoderado', campo:'apoderado' },
          { titulo:'Celular', campo:'celular' },
        ],
        filas: lista,
        filtros:{
          Grado: q('#filtroGrado', cont).value,
          Estado: q('#filtroEstado', cont).value,
        },
        resumen:[
          { valor: lista.length, rotulo:'Estudiantes' },
          { valor: lista.filter(e => e.sexo === 'M').length, rotulo:'Varones' },
          { valor: lista.filter(e => e.sexo === 'F').length, rotulo:'Mujeres' },
          { valor: new Set(lista.map(e => e.grado)).size, rotulo:'Grados' },
        ],
        obligatorios:['nombres','apellidos','dni','grado'],
      });
    };

    await traer();
  }

  return { vistaLista, abrirFormulario, verFicha, emitirConstancia, abrirImportador, campos,
           eliminarEstudiante };
})();
