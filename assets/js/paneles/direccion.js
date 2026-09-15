/* =====================================================================
   PANEL DE DIRECCIÓN
   ---------------------------------------------------------------------
   Vista de mando: cómo va la institución, quién hace qué y con qué
   evidencia. Dirección no registra el día a día; supervisa, publica,
   aprueba cuentas y emite los reportes oficiales.
   ===================================================================== */
'use strict';

(() => {
  const { q, esc } = U;

  /* Seis módulos, ni uno más. Lo que antes eran once entradas sueltas
     ahora vive en secciones dentro de su módulo: la misma funcionalidad,
     encontrable en un solo golpe de vista. "Indicadores" dejó de ser un
     módulo del menú —es un requisito de la tesis, no una sección del
     colegio— y pasó a ser una pestaña dentro de Reportes. */
  const MENU = [
    { id:'inicio',     texto:'Inicio',                  icono:'🏠', grupo:'Panel' },
    { id:'matricula',  texto:'Matrícula y comunicados', icono:'🎒', grupo:'Institución' },
    { id:'comunidad',  texto:'Comunidad y mensajería',  icono:'💬', grupo:'Institución' },
    { id:'direccion',  texto:'Dirección',               icono:'🏛️', grupo:'Institución' },
    { id:'reportes',   texto:'Reportes',                icono:'📄', grupo:'Control' },
    { id:'soporte',    texto:'Soporte',                 icono:'🛟', grupo:'Control' },
  ];

  const sesion = Panel.iniciar({
    roles:['director'],
    tituloPanel:'Dirección',
    menu: MENU,
    inicial:'inicio',
    definirVistas(s){

      /* ============================================================
         RESUMEN
         ============================================================ */
      Panel.registrar('inicio', {
        titulo:'Resumen institucional',
        descripcion:`${IE.nombre} · Año escolar ${IE.anio}`,
        async cargar(cont){
          cont.innerHTML = Panel.bienvenida(`
            <button class="btn btn-oro" id="btnPublicarRapido">📣 Publicar comunicado</button>`) +
            `<div class="rejilla rejilla-4 mb16" id="kpis">${UI.esqueleto(1)}</div>
             <div class="rejilla-65-35">
               <div class="tarjeta">
                 <div class="cabeza"><h3>🏫 Ocupación por aula</h3>
                   <span class="t-xs t-mudo">Aforo de ${IE.aforo_aula} por grado</span></div>
                 <div id="graficoAulas">${UI.esqueleto(2)}</div>
               </div>
               <div class="pila g16">
                 <div class="tarjeta">
                   <div class="cabeza"><h3>🔔 Pendientes</h3></div>
                   <div id="pendientes">${UI.esqueleto(2)}</div>
                 </div>
                 <div class="tarjeta">
                   <div class="cabeza"><h3>🕒 Últimos movimientos</h3></div>
                   <div id="ultimos">${UI.esqueleto(2)}</div>
                 </div>
               </div>
             </div>`;

          q('#btnPublicarRapido', cont).onclick = () =>
            ModComunicacion.abrirEditor(s, null, () => Panel.recargar('matricula'));

          const [p, { filas: alumnos }, { filas: auditoria }, { filas: pendientesSol }, { filas: ticketsAbiertos },
                 { filas: cuentas }] =
            await Promise.all([
              Datos.panorama(),
              Datos.estudiantes.listar({ estado:'Matriculado', anio:IE.anio }, { columnas:'id,grado,sexo' }),
              Datos.auditoria.listar({}, { limite:8, orden:'creado_en' }),
              Datos.solicitudes.listar({ estado:'Pendiente' }, { limite:20 }),
              Datos.tickets.listar({ estado:'Abierto' }, { limite:20 }),
              Datos.usuarios.listar({ rol: ModPersonal.ROLES_PERSONAL }, { columnas:'id,activo,ultimo_acceso' }),
            ]);

          q('#kpis', cont).innerHTML = `
            ${UI.kpi({ icono:'🎒', clase:'l-oro', valor:p.alumnos, rotulo:'Estudiantes matriculados',
                       delta:`${p.capacidad - p.alumnos} vacantes libres`, deltaTipo:'sube' })}
            ${UI.kpi({ icono:'👥', clase:'l-marino', valor:p.docentes, rotulo:'Docentes activos' })}
            ${UI.kpi({ icono:'📈', clase:'l-verde', valor:p.ocupacion + '%', rotulo:'Ocupación de aulas' })}
            ${UI.kpi({ icono:'📬', clase:'l-rojo', valor:p.solicitudes + p.tickets, rotulo:'Asuntos por atender' })}`;

          const porGrado = U.contarPor(alumnos, 'grado');
          q('#graficoAulas', cont).innerHTML = UI.barras(
            p.grados.map(g => ({
              etiqueta: g.nombre.replace('Inicial ', 'Ini ').replace(' grado', '°'),
              valor: porGrado[g.nombre] || 0,
              color: (porGrado[g.nombre] || 0) >= (g.vacantes || IE.aforo_aula) ? 'verde' : '',
            })), { alto:210 }) + `
            <div class="fila g24 envolver mt16">
              <div class="medidor">
                ${UI.anillo(p.ocupacion)}
                <div class="cifras"><b>${p.alumnos}/${p.capacidad}</b><small>cupos ocupados</small></div>
              </div>
              <div class="medidor">
                ${UI.anillo(U.pct(alumnos.filter(a => a.sexo === 'F').length, alumnos.length || 1), 'var(--tinta-3)')}
                <div class="cifras"><b>${alumnos.filter(a => a.sexo === 'F').length}</b><small>estudiantes mujeres</small></div>
              </div>
            </div>`;

          q('#pendientes', cont).innerHTML = `
            <div class="pila g8">
              ${fila('📬', 'Solicitudes de vacante', pendientesSol.length, 'l-azul', 'Administración las revisa')}
              ${fila('🎫', 'Tickets de soporte abiertos', ticketsAbiertos.length, 'l-rojo', 'Área de soporte técnico')}
              ${fila('🔑', 'Cuentas que nunca ingresaron',
                     cuentas.filter(u => u.activo === 1 && !u.ultimo_acceso).length,
                     'l-naranja', 'Entregar su usuario y su DNI')}
            </div>`;

          q('#ultimos', cont).innerHTML = auditoria.length ? `
            <div class="linea-tiempo">
              ${auditoria.map(a => `
                <div class="hito ${a.modulo === 'Acceso' ? 'azul' : a.modulo === 'Seguridad' ? 'rojo' : 'verde'}">
                  <b>${esc(a.accion)}</b>
                  <small>${esc(a.usuario)} · ${esc(U.hace(a.creado_en))}</small>
                </div>`).join('')}
            </div>` : UI.sinDatos('Sin movimientos recientes.', '📜');
        },
      });

      const fila = (ic, titulo, valor, clase, sub) => `
        <div class="fila-ios">
          <span class="loseta loseta-s ${clase}">${ic}</span>
          <div class="txt"><b>${esc(titulo)}</b><small>${esc(sub)}</small></div>
          <b class="t-xl">${esc(valor)}</b>
        </div>`;

      /* ============================================================
         MÓDULOS CON SECCIONES
         ------------------------------------------------------------
         Cada pestaña monta la MISMA vista que ya existía; lo único que
         cambió es dónde se entra a ella.
         ============================================================ */
      Panel.registrar('matricula', {
        titulo:'Matrícula y comunicados',
        descripcion:'El padrón del colegio y lo que se comunica a la comunidad',
        cargar:(cont) => Panel.secciones(cont, 'matricula', [
          /* La dirección tiene el padrón completo: puede corregir una
             ficha y puede dar de baja a un estudiante, igual que la
             oficina administrativa. */
          { id:'padron', titulo:'Padrón de estudiantes', icono:'🎒',
            cargar:(z) => ModEstudiantes.vistaLista(z, {}) },
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

      Panel.registrar('direccion', {
        titulo:'Dirección',
        descripcion:'La institución ordenada: datos clasificados, personal, rendimiento, formularios y bitácora',
        cargar:(cont) => Panel.secciones(cont, 'direccion', [
          { id:'clasificacion', titulo:'Datos clasificados', icono:'🗂️',
            cargar:(z) => ModDireccion.vistaClasificacion(z, s) },
          { id:'personal', titulo:'Personal y cuentas', icono:'👥',
            cargar:(z) => ModPersonal.vistaPersonal(z, s) },
          { id:'rendimiento', titulo:'Rendimiento', icono:'📚',
            cargar:(z) => ModAcademico.vistaConsolidado(z) },
          { id:'evaluacion', titulo:'Formularios (evaluación docente)', icono:'📝',
            cargar:(z) => ModPersonal.vistaEvaluacionDocente(z, s) },
          { id:'auditoria', titulo:'Auditoría', icono:'📜',
            cargar:(z) => ModDireccion.vistaAuditoria(z, s) },
        ]),
      });

      Panel.registrar('reportes', {
        titulo:'Reportes',
        descripcion:'Constancias, exportaciones y el panel de reportes dinámicos',
        cargar:(cont) => Panel.secciones(cont, 'reportes', [
          { id:'documentos', titulo:'Constancias', icono:'📄',
            cargar:(z) => ModReportes.vistaDocumentos(z, s) },
          { id:'catalogo', titulo:'Panel de reportes', icono:'📊',
            cargar:(z) => ModReportes.vistaReportes(z, s) },
          { id:'medicion', titulo:'Medición de gestión', icono:'📐',
            cargar:(z) => ModReportes.vistaIndicadores(z) },
          { id:'identidad', titulo:'Insignia institucional', icono:'🖼️',
            cargar:(z) => ModSoporte.vistaApariencia(z) },
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
