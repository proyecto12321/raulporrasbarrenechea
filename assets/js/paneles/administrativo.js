/* =====================================================================
   PANEL DEL PERSONAL ADMINISTRATIVO
   ---------------------------------------------------------------------
   Es el panel operativo: aquí se matricula, se atienden las solicitudes
   de vacante, se llevan documentos, constancias y pagos.
   ===================================================================== */
'use strict';

(() => {
  const { q, esc } = U;

  /* Cinco módulos. La oficina administrativa no gobierna la
     institución, así que no tiene el módulo "Dirección"; sus formularios
     y exportaciones viven dentro de Reportes. */
  const MENU = [
    { id:'inicio',    texto:'Inicio',                  icono:'🏠', grupo:'Panel' },
    { id:'matricula', texto:'Matrícula y comunicados', icono:'🎒', grupo:'Institución' },
    { id:'comunidad', texto:'Comunidad y mensajería',  icono:'💬', grupo:'Institución' },
    { id:'reportes',  texto:'Reportes',                icono:'📄', grupo:'Control' },
    { id:'soporte',   texto:'Soporte',                 icono:'🛟', grupo:'Control' },
  ];


  Panel.iniciar({
    roles:['administrativo'],
    tituloPanel:'Administración',
    menu: MENU,
    inicial:'inicio',
    definirVistas(s){

      Panel.registrar('inicio', {
        titulo:'Resumen de la oficina',
        descripcion:`Movimiento del día · ${IE.nombre}`,
        async cargar(cont){
          cont.innerHTML = Panel.bienvenida(`
            <div class="fila g8">
              <button class="btn btn-claro" id="atajoSol">📬 Solicitudes</button>
              <button class="btn btn-oro" id="atajoMat">⚡ Matricular</button>
            </div>`) +
            `<div class="rejilla rejilla-4 mb16" id="kpis">${UI.esqueleto(1)}</div>
             <div class="rejilla-par">
               <div class="tarjeta">
                 <div class="cabeza"><h3>📬 Solicitudes por atender</h3></div>
                 <div id="solPend">${UI.esqueleto(2)}</div>
               </div>
               <div class="tarjeta">
                 <div class="cabeza"><h3>💰 Pagos pendientes</h3></div>
                 <div id="pagosPend">${UI.esqueleto(2)}</div>
               </div>
             </div>
             <div class="tarjeta mt16">
               <div class="cabeza"><h3>🎒 Últimos estudiantes registrados</h3></div>
               <div id="ultimosEst">${UI.esqueleto(2)}</div>
             </div>`;

          q('#atajoMat', cont).onclick = () => Panel.irASeccion('matricula', 'registro');
          q('#atajoSol', cont).onclick = () => Panel.irASeccion('matricula', 'solicitudes');

          const [{ filas: alumnos }, { filas: sol }, { filas: pagos }, { filas: ultimos }, { filas: docs }] =
            await Promise.all([
              Datos.estudiantes.listar({ estado:'Matriculado', anio:IE.anio }, { columnas:'id,grado,creado_en' }),
              Datos.solicitudes.listar({ estado:'Pendiente' }, { limite:20 }),
              Datos.pagos.listar({ estado:'Pendiente' }, { limite:50 }),
              Datos.estudiantes.listar({}, { limite:6, orden:'creado_en' }),
              Datos.documentos.listar({ estado:'Recibido' }, { limite:30 }),
            ]);

          const hoy = alumnos.filter(a => U.diasHasta(a.creado_en) === 0).length;

          q('#kpis', cont).innerHTML = `
            ${UI.kpi({ icono:'🎒', clase:'l-oro',    valor:alumnos.length, rotulo:'Matriculados ' + IE.anio,
                       delta:`${hoy} hoy`, deltaTipo:'sube' })}
            ${UI.kpi({ icono:'📬', clase:'l-azul',   valor:sol.length, rotulo:'Solicitudes pendientes' })}
            ${UI.kpi({ icono:'💰', clase:'l-naranja',valor:U.soles(pagos.reduce((a, p) => a + Number(p.monto || 0), 0)), rotulo:'Por cobrar' })}
            ${UI.kpi({ icono:'🗂️', clase:'l-morado', valor:docs.length, rotulo:'Documentos sin revisar' })}`;

          q('#solPend', cont).innerHTML = sol.length ? sol.slice(0, 5).map(x => `
            <div class="fila-ios">
              <span class="loseta loseta-s l-azul">📬</span>
              <div class="txt">
                <b>${esc(x.apellidos)}, ${esc(x.nombres)}</b>
                <small>${esc(x.grado_solicitado)} · ${esc(U.hace(x.creado_en))}</small>
              </div>
              <button class="btn btn-oro btn-s" data-ir-sol>Atender</button>
            </div>`).join('') : UI.sinDatos('Sin solicitudes pendientes. 🎉', '📬');

          cont.querySelectorAll('[data-ir-sol]').forEach(b => b.onclick = () => Panel.irASeccion('matricula', 'solicitudes'));

          q('#pagosPend', cont).innerHTML = pagos.length ? `
            <div class="pila g8">
              ${pagos.slice(0, 5).map(p => `
                <div class="fila-ios">
                  <span class="loseta loseta-s l-naranja">💰</span>
                  <div class="txt"><b>${esc(p.concepto)} · ${esc(p.mes || '')}</b>
                    <small>DNI ${esc(p.dni || '—')}</small></div>
                  <b>${U.soles(p.monto)}</b>
                </div>`).join('')}
            </div>
            <button class="btn btn-claro btn-bloque mt12" id="verPagos">Ver todos los pagos</button>`
            : UI.sinDatos('No hay pagos pendientes.', '💰');

          const vp = q('#verPagos', cont); if (vp) vp.onclick = () => Panel.irASeccion('matricula', 'pagos');

          q('#ultimosEst', cont).innerHTML = UI.tabla({
            columnas:[
              { titulo:'Estudiante', valor:e => `<div class="fila g12">${UI.avatar(e.apellidos + ' ' + e.nombres)}
                  <div><b class="t-s">${esc(e.apellidos)}, ${esc(e.nombres)}</b>
                  <div class="t-xs t-mudo">${esc(e.codigo || '')}</div></div></div>` },
              { titulo:'DNI', valor:e => `<span class="t-mono t-s">${esc(e.dni)}</span>` },
              { titulo:'Grado', campo:'grado' },
              { titulo:'Registrado', valor:e => U.hace(e.creado_en) },
              { titulo:'Estado', valor:e => UI.etiqueta(e.estado, UI.claseEstado(e.estado)) },
            ],
            filas: ultimos,
            vacio:'Aún no hay estudiantes.',
            iconoVacio:'🎒',
          });
        },
      });

      Panel.registrar('matricula', {
        titulo:'Matrícula y comunicados',
        descripcion:'Admisión, padrón, trámites y lo que se comunica a las familias',
        cargar:(cont) => Panel.secciones(cont, 'matricula', [
          { id:'registro', titulo:'Matrícula rápida', icono:'⚡',
            cargar:(z) => ModRegistros.vistaMatricula(z, s) },
          { id:'solicitudes', titulo:'Solicitudes', icono:'📬',
            cargar:(z) => ModRegistros.vistaSolicitudes(z, s) },
          { id:'estudiantes', titulo:'Estudiantes', icono:'🎒',
            cargar:(z) => ModEstudiantes.vistaLista(z, {}) },
          { id:'documentos', titulo:'Documentos', icono:'🗂️',
            cargar:(z) => ModRegistros.vistaDocumentos(z, s) },
          { id:'pagos', titulo:'Pagos', icono:'💰',
            cargar:(z) => ModRegistros.vistaPagos(z, s) },
          { id:'comunicados', titulo:'Comunicados', icono:'📣',
            cargar:(z) => ModComunicacion.vistaComunicados(z, s) },
        ]),
      });

      Panel.registrar('comunidad', {
        titulo:'Comunidad y mensajería',
        descripcion:'Encuentra a cualquier persona del colegio y escríbele',
        cargar:(cont) => Panel.secciones(cont, 'comunidad', [
          { id:'directorio', titulo:'Directorio', icono:'🔎',
            cargar:(z) => ModComunicacion.vistaDirectorio(z, s) },
          { id:'mensajes', titulo:'Mensajes', icono:'💬',
            cargar:(z) => ModComunicacion.vistaMensajes(z, s) },
        ]),
      });

      Panel.registrar('reportes', {
        titulo:'Reportes',
        descripcion:'Constancias, exportaciones y formularios institucionales',
        cargar:(cont) => Panel.secciones(cont, 'reportes', [
          { id:'documentos', titulo:'Constancias', icono:'📄',
            cargar:(z) => ModReportes.vistaDocumentos(z, s) },
          { id:'emitidas', titulo:'Constancias emitidas', icono:'🗃️',
            cargar:(z) => ModRegistros.vistaConstancias(z, s) },
          { id:'catalogo', titulo:'Panel de reportes', icono:'📊',
            cargar:(z) => ModReportes.vistaReportes(z, s) },
          { id:'formularios', titulo:'Formularios (evaluación docente)', icono:'📝',
            cargar:(z) => ModPersonal.vistaEvaluacionDocente(z, s) },
        ]),
      });

      Panel.registrar('soporte', {
        titulo:'Soporte',
        descripcion:'Ayuda de uso, contacto institucional y estado del sistema',
        cargar:(cont) => ModDireccion.vistaAyuda(cont, s),
      });
    },
  });
})();
