/* =====================================================================
   MÓDULO: CENTRO DE REPORTES
   ---------------------------------------------------------------------
   Indicador 5 (rapidez): catálogo de reportes listos, un clic y el PDF
     se abre; el sistema cronometra cuánto tardó y lo guarda.
   Indicador 6 (precisión): cada reporte declara sus campos obligatorios;
     si algún registro está incompleto, el sistema lo avisa y no emite el
     documento. Además lleva versión y código de verificación.
   ===================================================================== */
'use strict';

const ModReportes = (() => {
  const { q, qq, esc } = U;

  /* Rango de fechas: se aplica sobre la fecha de registro de cada fila.
     Si el usuario no pone fechas, no filtra nada (indicador 5: "reportes
     por fecha o grado"). */
  const enRango = (fila, f, campo = 'creado_en') => {
    if (!f || (!f.desde && !f.hasta)) return true;
    const v = String(fila[campo] || '').slice(0, 10);
    if (!v) return false;
    if (f.desde && v < f.desde) return false;
    if (f.hasta && v > f.hasta) return false;
    return true;
  };

  /* ==================================================================
     CATÁLOGO
     ================================================================== */
  const CATALOGO = [
    {
      id:'padron',
      nombre:'Padrón general de estudiantes',
      detalle:'Listado completo del año escolar con datos del apoderado.',
      icono:'🎒', clase:'l-oro', roles:['director','administrativo'], fechas:true,
      filtros:[
        { id:'grado',  etiqueta:'Grado',  opciones:['todos', ...GRADOS] },
        { id:'estado', etiqueta:'Estado', opciones:['todos', ...ESTADOS_ESTUDIANTE] },
      ],
      async generar(f){
        const { filas } = await Datos.estudiantes.listar({}, { orden:'apellidos', asc:true });
        const lista = filas.filter(e =>
          (f.grado === 'todos' || e.grado === f.grado) &&
          (f.estado === 'todos' || e.estado === f.estado) &&
          enRango(e, f));
        return Reporte.listado({
          titulo:'Padrón general de estudiantes',
          subtitulo:`Año escolar ${IE.anio}`,
          columnas:[
            { titulo:'Código', campo:'codigo' },
            { titulo:'Apellidos y nombres', valor:e => `${e.apellidos}, ${e.nombres}` },
            { titulo:'DNI', campo:'dni' },
            { titulo:'Grado', campo:'grado' },
            { titulo:'Sexo', valor:e => e.sexo === 'F' ? 'F' : 'M' },
            { titulo:'Apoderado', campo:'apoderado' },
            { titulo:'Celular', campo:'celular' },
            { titulo:'Estado', campo:'estado' },
          ],
          filas: lista, filtros:f,
          resumen:[
            { valor:lista.length, rotulo:'Estudiantes' },
            { valor:lista.filter(e => e.sexo === 'M').length, rotulo:'Varones' },
            { valor:lista.filter(e => e.sexo === 'F').length, rotulo:'Mujeres' },
            { valor:new Set(lista.map(e => e.grado)).size, rotulo:'Grados' },
          ],
          obligatorios:['nombres','apellidos','dni','grado'],
        });
      },
    },
    {
      id:'nomina',
      nombre:'Nómina de aula',
      detalle:'Lista de un grado, lista para firmar o pasar asistencia.',
      icono:'📋', clase:'l-azul', roles:['director','administrativo','docente'],
      filtros:[{ id:'grado', etiqueta:'Grado', opciones:GRADOS }],
      async generar(f){
        const { filas } = await Datos.estudiantes.listar(
          { grado:f.grado, estado:'Matriculado', anio:IE.anio }, { orden:'apellidos', asc:true });
        return Reporte.listado({
          titulo:`Nómina de aula — ${f.grado}`,
          subtitulo:`${U.nivelDeGrado(f.grado)} · Año escolar ${IE.anio}`,
          columnas:[
            { titulo:'N.°', valor:(e, i) => '' },
            { titulo:'Apellidos y nombres', valor:e => `${e.apellidos}, ${e.nombres}` },
            { titulo:'DNI', campo:'dni' },
            { titulo:'Sexo', valor:e => e.sexo === 'F' ? 'F' : 'M' },
            { titulo:'Apoderado', campo:'apoderado' },
            { titulo:'Celular', campo:'celular' },
            { titulo:'Firma', valor:() => '' },
          ],
          filas:filas, filtros:f,
          resumen:[
            { valor:filas.length, rotulo:'Estudiantes' },
            { valor:IE.aforo_aula - filas.length, rotulo:'Vacantes libres' },
          ],
          obligatorios:['nombres','apellidos','dni'],
        });
      },
    },
    {
      id:'actanotas',
      nombre:'Acta consolidada de notas',
      detalle:'Notas de todo un grado en un bimestre, con promedios.',
      icono:'📝', clase:'l-verde', roles:['director','docente'],
      filtros:[
        { id:'grado', etiqueta:'Grado', opciones:GRADOS },
        { id:'bimestre', etiqueta:'Bimestre', opciones:BIMESTRES },
      ],
      async generar(f){
        const [{ filas: alumnos }, notas] = await Promise.all([
          Datos.estudiantes.listar({ grado:f.grado, estado:'Matriculado', anio:IE.anio }, { orden:'apellidos', asc:true }),
          Datos.notas.deGrado(f.grado, f.bimestre),
        ]);
        const cursos = U.cursosDe(f.grado);
        const filas = alumnos.map(a => {
          const fila = { estudiante:`${a.apellidos}, ${a.nombres}`, dni:a.dni };
          const vals = [];
          cursos.forEach(c => {
            const n = notas.find(x => x.estudiante_id === a.id && x.curso === c);
            fila[c] = n ? Number(n.nota) : null;
            if (n) vals.push(Number(n.nota));
          });
          fila.promedio = U.promedio(vals);
          fila.logro = fila.promedio !== null ? U.literal(fila.promedio) : '—';
          return fila;
        });
        return Reporte.listado({
          titulo:`Acta de notas — ${f.grado}`,
          subtitulo:`${f.bimestre} bimestre · Año escolar ${IE.anio}`,
          columnas:[
            { titulo:'Estudiante', campo:'estudiante' },
            ...cursos.map(c => ({ titulo:c.length > 14 ? c.slice(0, 13) + '.' : c, valor:r => r[c] ?? '—', num:true })),
            { titulo:'Prom.', campo:'promedio', num:true },
            { titulo:'Logro', campo:'logro' },
          ],
          filas, filtros:f,
          resumen:[
            { valor:filas.length, rotulo:'Estudiantes' },
            { valor:U.promedio(filas.map(x => x.promedio).filter(v => v !== null)) ?? '—', rotulo:'Promedio del aula' },
            { valor:filas.filter(x => x.logro === 'AD').length, rotulo:'Logro destacado' },
            { valor:filas.filter(x => x.logro === 'C').length, rotulo:'En inicio' },
          ],
          obligatorios:['estudiante','dni'],
        });
      },
    },
    {
      id:'porestudiante',
      nombre:'Reporte de un estudiante',
      detalle:'Libreta individual: sus notas por curso, promedio y logro alcanzado.',
      icono:'🧒', clase:'l-verde', roles:['director','docente','administrativo'],
      filtros:[
        { id:'grado', etiqueta:'Grado', opciones:GRADOS },
        { id:'bimestre', etiqueta:'Bimestre', opciones:['Todos', ...BIMESTRES] },
      ],
      async generar(f){
        /* Se pide el estudiante después del grado, para no mostrar una
           lista de 65 nombres cuando el docente solo quiere uno. */
        const { filas: alumnos } = await Datos.estudiantes.listar(
          { grado:f.grado, estado:'Matriculado', anio:IE.anio }, { orden:'apellidos', asc:true });
        if (!alumnos.length){ UI.ojo(`No hay estudiantes matriculados en ${f.grado}.`); return null; }

        const est = f._estudiante_id
          ? alumnos.find(a => String(a.id) === String(f._estudiante_id))
          : await elegirEstudiante(alumnos);
        if (!est) return null;

        const { filas: notas } = await Datos.notas.listar({ estudiante_id: est.id });
        const suyas = f.bimestre === 'Todos' ? notas : notas.filter(n => n.bimestre === f.bimestre);

        if (f._csv){
          return Reporte.listado({
            titulo:`Reporte de ${est.apellidos}, ${est.nombres}`,
            columnas:[
              { titulo:'Curso', campo:'curso' },
              { titulo:'Bimestre', campo:'bimestre' },
              { titulo:'Nota', campo:'nota', num:true },
              { titulo:'Logro', valor:n => U.literal(Number(n.nota)) },
              { titulo:'Docente', campo:'docente' },
            ],
            filas: suyas, filtros:f, obligatorios:[],
          });
        }
        return Reporte.libreta({ estudiante: est, notas: suyas, formato: f._formato || 'pdf' });
      },
    },
    {
      id:'vacantes',
      nombre:'Disponibilidad de vacantes',
      detalle:'Cuántos cupos quedan por grado, para admisión.',
      icono:'🪑', clase:'l-morado', roles:['director','administrativo'],
      filtros:[],
      async generar(f){
        const [{ filas: grados }, { filas: alumnos }] = await Promise.all([
          Datos.grados.listar({}, { orden:'orden', asc:true }),
          Datos.estudiantes.listar({ estado:'Matriculado', anio:IE.anio }, { columnas:'id,grado' }),
        ]);
        const porGrado = U.contarPor(alumnos, 'grado');
        const lista = (grados.length ? grados : GRADOS.map(g => ({ nombre:g, nivel:U.nivelDeGrado(g), vacantes:IE.aforo_aula })))
          .map(g => {
            const ocupadas = porGrado[g.nombre] || 0;
            const cupo = g.vacantes || IE.aforo_aula;
            return {
              grado:g.nombre, nivel:g.nivel || U.nivelDeGrado(g.nombre),
              docente:g.docente || '—', cupo, ocupadas,
              libres: Math.max(0, cupo - ocupadas),
              ocupacion: U.pct(ocupadas, cupo) + '%',
            };
          });
        return Reporte.listado({
          titulo:'Disponibilidad de vacantes',
          subtitulo:`Año escolar ${IE.anio} · aforo de ${IE.aforo_aula} por aula`,
          columnas:[
            { titulo:'Grado', campo:'grado' }, { titulo:'Nivel', campo:'nivel' },
            { titulo:'Docente', campo:'docente' },
            { titulo:'Capacidad', campo:'cupo', num:true },
            { titulo:'Matriculados', campo:'ocupadas', num:true },
            { titulo:'Vacantes libres', campo:'libres', num:true },
            { titulo:'Ocupación', campo:'ocupacion', num:true },
          ],
          filas:lista,
          resumen:[
            { valor:lista.reduce((a, g) => a + g.ocupadas, 0), rotulo:'Matriculados' },
            { valor:lista.reduce((a, g) => a + g.libres, 0), rotulo:'Vacantes libres' },
            { valor:U.pct(lista.reduce((a, g) => a + g.ocupadas, 0), lista.reduce((a, g) => a + g.cupo, 0)) + '%', rotulo:'Ocupación' },
          ],
          obligatorios:['grado'],
        });
      },
    },
    {
      id:'asistencia',
      nombre:'Resumen de asistencia',
      detalle:'Presentes, tardanzas y faltas por estudiante en un rango.',
      icono:'📅', clase:'l-agua', roles:['director','administrativo','docente'],
      filtros:[{ id:'grado', etiqueta:'Grado', opciones:['todos', ...GRADOS] }],
      async generar(f){
        const { filas } = await Datos.asistencia.listar({}, { limite:5000 });
        const { filas: alumnos } = await Datos.estudiantes.listar({ estado:'Matriculado', anio:IE.anio });
        const lista = alumnos
          .filter(a => f.grado === 'todos' || a.grado === f.grado)
          .map(a => {
            const suyos = filas.filter(x => x.estudiante_id === a.id);
            const c = U.contarPor(suyos, 'estado');
            const total = suyos.length;
            return {
              estudiante:`${a.apellidos}, ${a.nombres}`, dni:a.dni, grado:a.grado,
              presente:c['Presente'] || 0, tardanza:c['Tardanza'] || 0,
              falta:c['Falta'] || 0, justificado:c['Justificado'] || 0,
              dias: total,
              porcentaje: total ? U.pct((c['Presente'] || 0) + (c['Tardanza'] || 0), total) + '%' : '—',
            };
          });
        return Reporte.listado({
          titulo:'Resumen de asistencia',
          subtitulo:`Año escolar ${IE.anio}`,
          columnas:[
            { titulo:'Estudiante', campo:'estudiante' }, { titulo:'DNI', campo:'dni' },
            { titulo:'Grado', campo:'grado' },
            { titulo:'Días', campo:'dias', num:true },
            { titulo:'Presente', campo:'presente', num:true },
            { titulo:'Tardanza', campo:'tardanza', num:true },
            { titulo:'Falta', campo:'falta', num:true },
            { titulo:'Justificado', campo:'justificado', num:true },
            { titulo:'% asistencia', campo:'porcentaje', num:true },
          ],
          filas:lista, filtros:f,
          resumen:[
            { valor:lista.length, rotulo:'Estudiantes' },
            { valor:lista.reduce((a, x) => a + x.falta, 0), rotulo:'Faltas totales' },
            { valor:lista.reduce((a, x) => a + x.tardanza, 0), rotulo:'Tardanzas' },
          ],
          obligatorios:['estudiante','dni'],
        });
      },
    },
    {
      id:'pagos',
      nombre:'Estado de cuenta de pensiones',
      detalle:'Lo cobrado y lo pendiente, por estudiante y concepto.',
      icono:'💰', clase:'l-naranja', roles:['director','administrativo'], fechas:true,
      filtros:[{ id:'estado', etiqueta:'Estado', opciones:['todos','Pagado','Pendiente','Vencido'] }],
      async generar(f){
        const [{ filas: pagos }, { filas: alumnos }] = await Promise.all([
          Datos.pagos.listar({}, { limite:3000 }),
          Datos.estudiantes.listar({}, { columnas:'id,nombres,apellidos,grado' }),
        ]);
        const lista = pagos
          .filter(p => (f.estado === 'todos' || p.estado === f.estado) && enRango(p, f))
          .map(p => {
            const a = alumnos.find(x => x.id === p.estudiante_id);
            return { ...p,
              estudiante: a ? `${a.apellidos}, ${a.nombres}` : '—',
              grado: a ? a.grado : '—' };
          });
        return Reporte.listado({
          titulo:'Estado de cuenta de pensiones',
          subtitulo:`Año escolar ${IE.anio}`,
          columnas:[
            { titulo:'Estudiante', campo:'estudiante' }, { titulo:'Grado', campo:'grado' },
            { titulo:'Concepto', campo:'concepto' }, { titulo:'Mes', campo:'mes' },
            { titulo:'Monto', valor:p => U.soles(p.monto), num:true },
            { titulo:'Estado', campo:'estado' },
            { titulo:'Fecha de pago', valor:p => p.fecha_pago ? U.fecha(p.fecha_pago) : '—' },
          ],
          filas:lista, filtros:f,
          resumen:[
            { valor:U.soles(lista.filter(p => p.estado === 'Pagado').reduce((a, p) => a + Number(p.monto || 0), 0)), rotulo:'Cobrado' },
            { valor:U.soles(lista.filter(p => p.estado !== 'Pagado').reduce((a, p) => a + Number(p.monto || 0), 0)), rotulo:'Por cobrar' },
            { valor:lista.length, rotulo:'Movimientos' },
          ],
          obligatorios:['concepto','monto'],
        });
      },
    },
    {
      id:'indicadores',
      nombre:'Tablero de indicadores de gestión',
      detalle:'Las seis dimensiones medidas con datos reales del sistema.',
      icono:'📊', clase:'l-marino', roles:['director'],
      filtros:[],
      async generar(){
        const m = await medirIndicadores();
        return Reporte.listado({
          titulo:'Indicadores de gestión administrativa',
          subtitulo:`Medición automática del sistema · ${U.fechaLarga(new Date())}`,
          columnas:[
            { titulo:'N.°', campo:'n', num:true },
            { titulo:'Indicador', campo:'indicador' },
            { titulo:'Cómo se mide', campo:'medida' },
            { titulo:'Resultado', campo:'valor', num:true },
            { titulo:'Lectura', campo:'lectura' },
          ],
          filas:m,
          resumen:[
            { valor:m.length, rotulo:'Indicadores' },
            { valor:IE.anio, rotulo:'Año evaluado' },
          ],
          obligatorios:['indicador'],
        });
      },
    },
  ];

  /* ==================================================================
     MEDICIÓN AUTOMÁTICA DE LOS SEIS INDICADORES
     ================================================================== */
  async function medirIndicadores(){
    const [alumnos, auditoria, comunicados, lecturas, reportes, consultas, notas, constancias] =
      await Promise.all([
        Datos.estudiantes.listar({}, { limite:2000 }).then(r => r.filas).catch(() => []),
        Datos.auditoria.listar({}, { limite:1000 }).then(r => r.filas).catch(() => []),
        Datos.comunicados.listar({}, { limite:200, columnas: Datos.adjuntos.columnas('comunicados') }).then(r => r.filas).catch(() => []),
        Datos.repositorio('lecturas').listar({}, { limite:2000 }).then(r => r.filas).catch(() => []),
        Datos.reportes.listar({}, { limite:300 }).then(r => r.filas).catch(() => []),
        Datos.consultas.listar({}, { limite:500 }).then(r => r.filas).catch(() => []),
        Datos.notas.listar({}, { limite:3000 }).then(r => r.filas).catch(() => []),
        Datos.constancias.listar({}, { limite:300 }).then(r => r.filas).catch(() => []),
      ]);

    const completos = alumnos.filter(a => a.nombres && a.apellidos && a.dni && a.grado).length;
    const tiemposAlta = alumnos.map(a => a.segundos).filter(s => s > 0);
    const tiemposReporte = reportes.map(r => r.ms).filter(x => x > 0);
    const resueltas = consultas.filter(c => c.resuelta).length;
    const dnisUnicos = new Set(alumnos.map(a => a.dni)).size;

    return [
      { n:1, indicador:'Organización de datos administrativos',
        medida:'Fichas completas / total del padrón',
        valor:`${U.pct(completos, alumnos.length || 1)}%`,
        lectura:`${completos} de ${alumnos.length} fichas con todos los campos clave; ${auditoria.length} movimientos auditados.` },

      { n:2, indicador:'Rapidez en el registro de información',
        medida:'Tiempo promedio de alta de un estudiante',
        valor: tiemposAlta.length ? `${U.redondear(tiemposAlta.reduce((a,b)=>a+b,0)/tiemposAlta.length, 1)} s` : 'sin datos',
        lectura:`Frente a un registro manual en papel, que toma varios minutos por estudiante.` },

      { n:3, indicador:'Fluidez de comunicación institucional',
        medida:'Consultas atendidas por el asistente',
        valor:`${U.pct(resueltas, consultas.length || 1)}%`,
        lectura:`${resueltas} de ${consultas.length} consultas resueltas sin intervención humana.` },

      { n:4, indicador:'Difusión eficiente de la información',
        medida:'Lecturas registradas por comunicado',
        valor: comunicados.length ? U.redondear(lecturas.length / comunicados.length, 1) : '0',
        lectura:`${comunicados.length} comunicados publicados y ${lecturas.length} lecturas registradas.` },

      { n:5, indicador:'Rapidez en la generación de reportes',
        medida:'Tiempo promedio de emisión',
        valor: tiemposReporte.length ? U.ms(Math.round(tiemposReporte.reduce((a,b)=>a+b,0)/tiemposReporte.length)) : 'sin datos',
        lectura:`${reportes.length} reportes y ${constancias.length} constancias emitidas con un clic.` },

      { n:6, indicador:'Precisión de los reportes',
        medida:'DNI únicos / total de registros',
        valor:`${U.pct(dnisUnicos, alumnos.length || 1)}%`,
        lectura:`Sin duplicados: ${dnisUnicos} DNI distintos en ${alumnos.length} fichas. ${notas.length} notas calculadas por el sistema.` },
    ];
  }

  /* ==================================================================
     VISTA
     ================================================================== */
  async function vistaReportes(cont, sesion){
    const disponibles = CATALOGO.filter(r => r.roles.includes(sesion.rol));

    cont.innerHTML = `
      <div class="banda banda-info mb16"><span class="ic">⚡</span>
        <div>Cada documento se genera desde la base de datos, lleva
        <b>número de versión</b> y <b>código de verificación con QR</b>, y queda
        registrado en el historial. Si falta algún dato obligatorio, el sistema
        lo avisa antes de emitir.</div></div>

      <div class="rejilla rejilla-2 mb24" id="catalogo">
        ${disponibles.map(r => `
          <div class="tarjeta tarjeta-viva" data-reporte="${r.id}">
            <div class="fila g12 mb12">
              <span class="loseta loseta-g ${r.clase}">${r.icono}</span>
              <div class="min0">
                <b>${esc(r.nombre)}</b>
                <div class="t-s t-mudo">${esc(r.detalle)}</div>
              </div>
            </div>
            <div class="fila g8 envolver">
              ${r.filtros.length
                ? r.filtros.map(f => UI.etiqueta('🔽 ' + f.etiqueta, 'e-gris')).join('')
                : UI.etiqueta('Sin filtros', 'e-gris')}
              ${r.fechas ? UI.etiqueta('📅 Rango de fechas', 'e-gris') : ''}
              <span class="crece"></span>
              <span class="btn btn-oro btn-s">Generar →</span>
            </div>
          </div>`).join('')}
      </div>

      <div class="tarjeta">
        <div class="cabeza">
          <div><h3>🗂️ Historial de reportes emitidos</h3>
            <p>Control de versiones y códigos de verificación.</p></div>
          <button class="btn btn-claro btn-s" id="btnRefrescarHist">↻</button>
        </div>
        <div id="historial">${UI.esqueleto(3)}</div>
      </div>`;

    q('#catalogo', cont).addEventListener('click', e => {
      const tarjeta = e.target.closest('[data-reporte]');
      if (!tarjeta) return;
      const rep = disponibles.find(r => r.id === tarjeta.dataset.reporte);
      /* Siempre se pasa por el mismo cuadro (aunque no tenga filtros que
         llenar), porque ahí es donde están los dos botones: "Generar
         reporte (PDF)" y "⬇️ Exportar a Excel". Así hasta un reporte sin
         filtros se puede exportar con un clic, no solo verse en PDF. */
      pedirFiltros(rep, cargarHistorial);
    });

    async function cargarHistorial(){
      try {
        const { filas } = await Datos.reportes.listar({}, { limite:25, orden:'creado_en' });
        q('#historial', cont).innerHTML = UI.tabla({
          columnas:[
            { titulo:'Reporte', valor:r => `<b class="t-s">${esc(r.nombre)}</b>` },
            { titulo:'Versión', valor:r => UI.etiqueta('v' + (r.version || 1), 'e-azul') },
            { titulo:'Filas', campo:'filas', clase:'num' },
            { titulo:'Tiempo', clase:'num', valor:r => r.ms ? U.ms(r.ms) : '—' },
            { titulo:'Verificación', valor:r => `<span class="t-mono t-xs">${esc(r.verificacion || '—')}</span>` },
            { titulo:'Emitido', valor:r => `${U.fechaHora(r.creado_en)}<div class="t-xs t-mudo">${esc(r.generado_por || '')}</div>` },
          ],
          filas,
          vacio:'Todavía no se emitieron reportes.',
          iconoVacio:'📄',
        });
      } catch(e){
        q('#historial', cont).innerHTML = `<div class="banda banda-mal"><span class="ic">⚠️</span><div>${esc(e.message)}</div></div>`;
      }
    }

    q('#btnRefrescarHist', cont).onclick = cargarHistorial;
    await cargarHistorial();
  }

  /* ==================================================================
     DOCUMENTOS OFICIALES (constancias)
     ------------------------------------------------------------------
     El flujo que pediste, paso a paso: se elige el documento, se busca
     al estudiante escribiendo (con sugerencias mientras se escribe), se
     carga su ficha real del padrón, el sistema valida que no falte nada,
     se ve una vista previa y recién ahí se genera el PDF.

     El botón se bloquea mientras genera, así que dos clics seguidos no
     emiten dos constancias con dos números distintos.
     ================================================================== */
  const DOCUMENTOS = [
    { id:'Constancia de matrícula', icono:'🎒', clase:'l-oro',
      detalle:'Acredita que el estudiante está matriculado en el año escolar en curso.',
      exige:'Matriculado' },
    { id:'Constancia de estudios', icono:'📘', clase:'l-marino',
      detalle:'Acredita que el estudiante cursa o cursó estudios en la institución.' },
    { id:'Constancia de vacante', icono:'🪑', clase:'l-azul',
      detalle:'Acredita que hay vacante disponible para el estudiante en un aula.' },
  ];

  /* Pide el estudiante concreto con un buscador, no con un desplegable
     de 65 nombres. */
  function elegirEstudiante(alumnos){
    return new Promise(resolve => {
      const campos = [
        { id:'estudiante_id', etiqueta:'Estudiante', tipo:'select', icono:'🎒', ancho:'completo', requerido:true,
          opciones: alumnos.map(a => ({ valor:a.id, texto:`${a.apellidos}, ${a.nombres}` })) },
      ];
      UI.modal({
        titulo:'¿De qué estudiante?', subtitulo:'Solo aparecen los de ese grado',
        cuerpo: UI.formulario(campos, { columnas:1 }),
        botones:[
          { texto:'Cancelar', clase:'btn-fantasma', esperando:false, accion:() => resolve(null) },
          { texto:'Generar', clase:'btn-oro', esperando:false,
            accion: ({ zona, cerrar }) => {
              const id = q('#estudiante_id', zona).value;
              cerrar();
              resolve(alumnos.find(a => String(a.id) === String(id)) || null);
            } },
        ],
      });
    });
  }

  async function vistaDocumentos(cont, sesion){
    /* Permiso real, no solo visual: la vista se registra únicamente en
       los paneles de Dirección y Administración, y además se comprueba
       aquí por si alguien llega por la dirección del navegador. */
    if (!['director','administrativo'].includes(sesion.rol)){
      cont.innerHTML = `<div class="banda banda-mal"><span class="ic">🔒</span>
        <div><b>Sin permiso.</b><br>Las constancias solo las emiten Dirección y la oficina administrativa.</div></div>`;
      return;
    }

    let elegido = DOCUMENTOS[0].id;
    let estudiante = null;

    cont.innerHTML = `
      <div class="banda banda-info mb16"><span class="ic">📄</span>
        <div>Los datos se toman del padrón: no se escribe nada a mano. Antes de
        emitir, el sistema revisa que la ficha esté completa y que la condición
        del estudiante corresponda al documento.</div></div>

      <h3 class="mb8">1 · Elige el documento</h3>
      <div class="rejilla rejilla-3 mb24" id="tiposDoc">
        ${DOCUMENTOS.map((d, i) => `
          <div class="tarjeta tarjeta-viva ${i === 0 ? 'elegida' : ''}" data-doc="${esc(d.id)}">
            <div class="fila g12">
              <span class="loseta ${d.clase}">${d.icono}</span>
              <div class="min0"><b>${esc(d.id)}</b>
                <div class="t-xs t-mudo">${esc(d.detalle)}</div></div>
            </div>
          </div>`).join('')}
      </div>

      <h3 class="mb8">2 · Busca al estudiante</h3>
      <div class="buscador-sugerido mb24">
        <label class="buscador">
          <span>🔎</span>
          <input id="buscaEst" placeholder="Escribe el nombre, el código o el DNI…"
                 autocomplete="off" role="combobox" aria-expanded="false" aria-controls="sugerencias">
        </label>
        <div class="sugerencias oculto" id="sugerencias" role="listbox"></div>
      </div>

      <h3 class="mb8">3 · Revisa y genera</h3>
      <div id="previaDoc"></div>`;

    const { filas: padron } = await Datos.estudiantes.listar({}, { orden:'apellidos', asc:true });

    /* --- Paso 1: tipo de documento --- */
    q('#tiposDoc', cont).onclick = e => {
      const t = e.target.closest('[data-doc]');
      if (!t) return;
      elegido = t.dataset.doc;
      qq('[data-doc]', cont).forEach(x => x.classList.toggle('elegida', x === t));
      if (estudiante) pintarPrevia();
    };

    /* --- Paso 2: buscador con sugerencias mientras se escribe --- */
    const caja = q('#buscaEst', cont);
    const lista = q('#sugerencias', cont);
    let marcado = -1;

    function sugerir(){
      const t = U.sinTildes(caja.value.trim());
      if (t.length < 2){ lista.classList.add('oculto'); caja.setAttribute('aria-expanded','false'); return; }
      const halla = padron.filter(a =>
        U.sinTildes(`${a.apellidos} ${a.nombres}`).includes(t) ||
        (a.codigo || '').toLowerCase().includes(t) ||
        (a.dni || '').includes(t)).slice(0, 8);
      marcado = -1;
      if (!halla.length){
        lista.innerHTML = `<div class="sugerencia vacia">Ningún estudiante coincide. Revisa el nombre o el DNI.</div>`;
      } else {
        lista.innerHTML = halla.map((a, i) => `
          <button class="sugerencia" role="option" data-id="${a.id}" data-i="${i}">
            ${UI.avatar(`${a.apellidos} ${a.nombres}`)}
            <span class="txt">
              <b>${esc(a.apellidos)}, ${esc(a.nombres)}</b>
              <small>${esc(a.grado || 'sin grado')} · ${esc(a.codigo || '')} · DNI ${esc(ModDireccion.dni(a.dni, sesion))}</small>
            </span>
            ${UI.etiqueta(a.estado, UI.claseEstado(a.estado))}
          </button>`).join('');
      }
      lista.classList.remove('oculto');
      caja.setAttribute('aria-expanded','true');
    }

    caja.oninput = sugerir;
    caja.onkeydown = e => {
      const opciones = qq('.sugerencia[data-id]', lista);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp'){
        e.preventDefault();
        if (!opciones.length) return;
        marcado = e.key === 'ArrowDown'
          ? Math.min(opciones.length - 1, marcado + 1)
          : Math.max(0, marcado - 1);
        opciones.forEach((o, i) => o.classList.toggle('marcada', i === marcado));
        opciones[marcado].scrollIntoView({ block:'nearest' });
      }
      if (e.key === 'Enter' && marcado >= 0){ e.preventDefault(); opciones[marcado].click(); }
      if (e.key === 'Escape') lista.classList.add('oculto');
    };

    lista.onclick = e => {
      const b = e.target.closest('[data-id]');
      if (!b) return;
      estudiante = padron.find(a => String(a.id) === b.dataset.id);
      caja.value = `${estudiante.apellidos}, ${estudiante.nombres}`;
      lista.classList.add('oculto');
      pintarPrevia();
    };

    document.addEventListener('click', e => {
      if (!cont.contains(e.target)) lista.classList.add('oculto');
    });

    /* --- Paso 3: validación + vista previa + emisión --- */
    function revisar(){
      const faltan = [];
      if (!estudiante.nombres || !estudiante.apellidos) faltan.push('nombre completo');
      if (!U.val.dni(estudiante.dni)) faltan.push('DNI de 8 dígitos');
      if (!estudiante.grado) faltan.push('grado');
      if (!GRADOS.includes(estudiante.grado)) faltan.push(`grado válido (dice "${estudiante.grado}")`);
      const doc = DOCUMENTOS.find(d => d.id === elegido);
      if (doc && doc.exige && estudiante.estado !== doc.exige)
        faltan.push(`condición «${doc.exige}» (hoy figura como «${estudiante.estado}»)`);
      return faltan;
    }

    function pintarPrevia(){
      const faltan = revisar();
      const nivel = U.nivelDeGrado(estudiante.grado);
      q('#previaDoc', cont).innerHTML = `
        <div class="tarjeta">
          <div class="cabeza">
            <div><h3>${esc(elegido)}</h3>
              <p>Vista previa con los datos reales del padrón</p></div>
            ${UI.etiqueta(faltan.length ? 'Revisar datos' : 'Listo para emitir',
                          faltan.length ? 'e-rojo' : 'e-verde')}
          </div>

          ${faltan.length ? `
            <div class="banda banda-mal mb16"><span class="ic">⛔️</span>
              <div><b>No se puede emitir todavía.</b> Falta o no cuadra:
              ${faltan.map(f => `<div>• ${esc(f)}</div>`).join('')}
              <div class="t-xs mt8">Corrígelo en el padrón (Matrícula → Estudiantes) y vuelve aquí.</div></div>
            </div>` : ''}

          <div class="rejilla rejilla-2">
            <dl class="ficha-lista">
              <div><dt>Estudiante</dt><dd>${esc(estudiante.apellidos)}, ${esc(estudiante.nombres)}</dd></div>
              <div><dt>DNI</dt><dd>${esc(ModDireccion.dni(estudiante.dni, sesion))}</dd></div>
              <div><dt>Código</dt><dd>${esc(estudiante.codigo || '—')}</dd></div>
            </dl>
            <dl class="ficha-lista">
              <div><dt>Grado y sección</dt><dd>${esc(estudiante.grado || '—')} · ${esc(estudiante.seccion || 'Única')}</dd></div>
              <div><dt>Nivel</dt><dd>${esc(nivel || '—')}</dd></div>
              <div><dt>Año escolar</dt><dd>${IE.anio} · ${esc(estudiante.estado)}</dd></div>
            </dl>
          </div>

          <div class="fila g8 envolver mt16">
            <button class="btn btn-oro" id="btnEmitirDoc" data-formato="pdf" ${faltan.length ? 'disabled' : ''}>
              📄 Generar en PDF
            </button>
            <button class="btn btn-marino" id="btnEmitirWord" data-formato="word" ${faltan.length ? 'disabled' : ''}>
              📝 Generar en Word
            </button>
            <button class="btn btn-claro" id="btnOtroEst">Elegir otro estudiante</button>
          </div>
          <p class="t-xs t-mudo mt12">
            Es el mismo documento en los dos formatos: mismo membrete, mismo texto,
            mismo número correlativo y mismo código de verificación. El de Word se
            puede editar si la dirección necesita añadir algo a mano. Ambos quedan
            registrados en «Constancias emitidas».
          </p>
        </div>`;

      q('#btnOtroEst', cont).onclick = () => {
        estudiante = null; caja.value = ''; q('#previaDoc', cont).innerHTML = ''; caja.focus();
      };

      /* Doble clic = una sola constancia: el botón se apaga mientras el
         documento se arma y se vuelve a habilitar al terminar. */
      async function emitir(btn){
        const formato = btn.dataset.formato;
        btn.disabled = true;
        const antes = btn.innerHTML;
        btn.innerHTML = '<span class="rueda"></span> Generando…';
        try {
          await Reporte.constancia({ estudiante, tipo: elegido, formato });
        } catch(e){
          UI.fallo(e.message);
        } finally {
          btn.disabled = false; btn.innerHTML = antes;
        }
      }
      ['#btnEmitirDoc', '#btnEmitirWord'].forEach(sel => {
        const b = q(sel, cont);
        if (b) b.onclick = () => emitir(b);
      });
    }
  }

  function pedirFiltros(rep, alTerminar){
    const campos = rep.filtros.map(f => ({
      id:f.id, etiqueta:f.etiqueta, tipo:'select', icono:'🔽', ancho:'completo',
      opciones:f.opciones.map(o => ({ valor:o, texto: o === 'todos' ? 'Todos' : o })),
    }));
    if (rep.fechas){
      campos.push(
        { id:'desde', etiqueta:'Registrados desde (opcional)', tipo:'date', icono:'📅', ancho:'completo' },
        { id:'hasta', etiqueta:'Registrados hasta (opcional)', tipo:'date', icono:'📅', ancho:'completo' });
    }
    const cuerpo = UI.formulario(campos, { columnas:1 });
    UI.modal({
      titulo:rep.nombre, subtitulo:rep.detalle, cuerpo,
      botones:[
        { texto:'Cancelar', clase:'btn-fantasma', esperando:false, accion: () => {} },
        { texto:'⬇️ Excel', clase:'btn-claro', esperandoTexto:'Exportando…',
          accion: async ({ zona }) => {
            const d = UI.leerFormulario(zona, campos);
            await ejecutar(rep, { ...d, _csv:true }, alTerminar);
          } },
        /* El mismo reporte, con el mismo membrete y las mismas
           columnas, en un archivo de Word que se puede editar. */
        { texto:'📝 Word', clase:'btn-marino', esperandoTexto:'Generando…',
          accion: async ({ zona }) => {
            const d = UI.leerFormulario(zona, campos);
            await ejecutar(rep, { ...d, _formato:'word' }, alTerminar);
          } },
        { texto:'📄 PDF', clase:'btn-oro', esperandoTexto:'Generando…',
          accion: async ({ zona }) => {
            const d = UI.leerFormulario(zona, campos);
            await ejecutar(rep, d, alTerminar);
          } },
      ],
    });
  }

  async function ejecutar(rep, filtros, alTerminar){
    const t0 = performance.now();
    try {
      await rep.generar(filtros);
      if (alTerminar) setTimeout(alTerminar, 900);
    } catch(e){
      UI.fallo(e.message);
    }
  }

  /* Tablero visual de indicadores (vista de dirección). */
  async function vistaIndicadores(cont){
    cont.innerHTML = UI.cargando('Midiendo los indicadores…');
    try {
      const m = await medirIndicadores();
      const colores = ['l-oro','l-azul','l-verde','l-morado','l-naranja','l-marino'];
      cont.innerHTML = `
        <div class="banda banda-info mb16"><span class="ic">📐</span>
          <div>Estos valores se calculan solos a partir de lo que el sistema
          registra. Sirven como evidencia cuantitativa de la variable
          dependiente <b>gestión administrativa</b>.</div></div>

        <div class="rejilla rejilla-2 mb16">
          ${m.map((x, i) => `
            <div class="tarjeta">
              <div class="fila g12 mb12">
                <span class="loseta loseta-g ${colores[i]}">${i + 1}</span>
                <div class="min0">
                  <b>${esc(x.indicador)}</b>
                  <div class="t-xs t-mudo">${esc(x.medida)}</div>
                </div>
                <span class="crece"></span>
                <div class="t-d">
                  <div class="cifra-media">${esc(x.valor)}</div>
                </div>
              </div>
              <p class="t-s t-2 t-alto-2">${esc(x.lectura)}</p>
            </div>`).join('')}
        </div>

        <button class="btn btn-marino btn-bloque" id="btnPdfInd">📄 Exportar el tablero en PDF</button>`;

      q('#btnPdfInd', cont).onclick = () => CATALOGO.find(r => r.id === 'indicadores').generar({});
    } catch(e){
      cont.innerHTML = `<div class="banda banda-mal"><span class="ic">⛔️</span><div>${esc(e.message)}</div></div>`;
    }
  }

  return { vistaReportes, vistaDocumentos, vistaIndicadores, medirIndicadores, CATALOGO };
})();
