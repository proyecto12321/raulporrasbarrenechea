/* =====================================================================
   PANEL DEL DOCENTE
   ---------------------------------------------------------------------
   El docente solo ve las aulas que dirección le asignó. Todo lo demás
   queda fuera de su alcance, tanto en la interfaz como en los datos que
   la capa de acceso le entrega.
   ===================================================================== */
'use strict';

(() => {
  const { q, esc } = U;

  /* El docente no matricula ni gobierna: su módulo propio es el aula.
     El resto son los módulos comunes del sistema. */
  const MENU = [
    { id:'inicio',      texto:'Inicio',                 icono:'🏠', grupo:'Panel' },
    { id:'aula',        texto:'Mi aula',                icono:'🎒', grupo:'Enseñanza' },
    { id:'comunicados', texto:'Comunicados',            icono:'📣', grupo:'Institución' },
    { id:'comunidad',   texto:'Comunidad y mensajería', icono:'💬', grupo:'Institución' },
    { id:'reportes',    texto:'Reportes',               icono:'📄', grupo:'Control' },
    { id:'soporte',     texto:'Soporte',                icono:'🛟', grupo:'Control' },
  ];


  Panel.iniciar({
    roles:['docente'],
    tituloPanel:'Docente',
    menu: MENU,
    inicial:'inicio',
    definirVistas(s){

      /* Aulas asignadas por dirección; si no tiene ninguna, se avisa. */
      const misGrados = String(s.grados || '').split(',').map(x => x.trim()).filter(Boolean);
      const grados = misGrados.length ? misGrados : [];

      function sinAulas(cont){
        cont.innerHTML = `
          <div class="banda banda-ojo"><span class="ic">🏫</span>
            <div><b>Todavía no tienes aulas asignadas.</b><br>
            Dirección debe asignarte al menos un grado desde
            <i>Personal → Editar → Aulas a cargo</i>. Mientras tanto puedes
            revisar comunicados y usar la mensajería.</div></div>`;
      }

      Panel.registrar('inicio', {
        titulo:'Mi resumen',
        descripcion:`${IE.nombre} · Año escolar ${IE.anio}`,
        async cargar(cont){
          cont.innerHTML = Panel.bienvenida(
            grados.length ? `<span class="etiqueta e-oro">🏫 ${grados.length} aula(s) a cargo</span>` : '');

          if (!grados.length){
            const d = U.crear('div');
            sinAulas(d);
            cont.append(d);
            return;
          }

          cont.insertAdjacentHTML('beforeend', `
            <div class="rejilla rejilla-4 mb16" id="kpis">${UI.esqueleto(1)}</div>
            <div class="rejilla-par">
              <div class="tarjeta">
                <div class="cabeza"><h3>🏫 Mis aulas</h3></div>
                <div id="misAulas">${UI.esqueleto(2)}</div>
              </div>
              <div class="tarjeta">
                <div class="cabeza"><h3>📋 Tareas próximas a vencer</h3></div>
                <div id="tareasProx">${UI.esqueleto(2)}</div>
              </div>
            </div>
            <div class="tarjeta mt16">
              <div class="cabeza"><h3>📝 Avance del registro de notas</h3>
                <span class="t-xs t-mudo">Bimestre I al IV</span></div>
              <div id="avanceNotas">${UI.esqueleto(2)}</div>
            </div>`);

          const [{ filas: alumnos }, { filas: tareas }, { filas: notas }] = await Promise.all([
            Datos.estudiantes.listar({ grado: grados, estado:'Matriculado', anio:IE.anio }),
            Datos.tareas.listar({ grado: grados }, { orden:'vence', asc:true, limite:30 }),
            Datos.notas.listar({ grado: grados }, { limite:3000 }),
          ]);

          const proximas = tareas.filter(t => (U.diasHasta(t.vence) ?? -1) >= 0);

          q('#kpis', cont).innerHTML = `
            ${UI.kpi({ icono:'🎒', clase:'l-oro',   valor:alumnos.length, rotulo:'Mis estudiantes' })}
            ${UI.kpi({ icono:'🏫', clase:'l-azul',  valor:grados.length, rotulo:'Aulas a cargo' })}
            ${UI.kpi({ icono:'📝', clase:'l-verde', valor:notas.length, rotulo:'Notas registradas' })}
            ${UI.kpi({ icono:'📋', clase:'l-morado',valor:proximas.length, rotulo:'Tareas vigentes' })}`;

          const porGrado = U.contarPor(alumnos, 'grado');
          q('#misAulas', cont).innerHTML = grados.map(g => `
            <div class="fila-ios">
              <span class="loseta ${U.nivelDeGrado(g) === 'Inicial' ? 'l-morado' : 'l-azul'}">
                ${U.nivelDeGrado(g) === 'Inicial' ? '🧸' : '📚'}</span>
              <div class="txt">
                <b>${esc(g)}</b>
                <small>${porGrado[g] || 0} estudiantes · ${U.cursosDe(g).length} áreas</small>
              </div>
              <span class="flecha">›</span>
            </div>`).join('');

          q('#tareasProx', cont).innerHTML = proximas.length ? proximas.slice(0, 5).map(t => {
            const d = U.diasHasta(t.vence);
            return `
              <div class="fila-ios">
                <span class="loseta loseta-s ${d <= 2 ? 'l-rojo' : 'l-verde'}">📋</span>
                <div class="txt"><b>${esc(t.titulo)}</b>
                  <small>${esc(t.grado)} · ${esc(t.curso)}</small></div>
                ${UI.etiqueta(d === 0 ? 'vence hoy' : `en ${d} día(s)`, d <= 2 ? 'e-rojo' : 'e-verde')}
              </div>`;
          }).join('') : UI.sinDatos('No tienes tareas pendientes de vencer.', '📋');

          /* Avance por bimestre */
          const esperadas = grados.reduce((a, g) =>
            a + (porGrado[g] || 0) * U.cursosDe(g).length, 0);
          q('#avanceNotas', cont).innerHTML = BIMESTRES.map(b => {
            const n = notas.filter(x => x.bimestre === b).length;
            return `
              <div class="mb12">
                <div class="fila entre mb8">
                  <b class="t-s">${b} bimestre</b>
                  <span class="t-xs t-mudo">${n} de ${esperadas} · ${U.pct(n, esperadas || 1)}%</span>
                </div>
                ${UI.barra(n, esperadas || 1, n >= esperadas ? 'verde' : '')}
              </div>`;
          }).join('');
        },
      });

      Panel.registrar('aula', {
        titulo:'Mi aula',
        descripcion:'Tus estudiantes, sus notas, su asistencia y sus tareas',
        cargar:(cont) => {
          if (!grados.length) return sinAulas(cont);
          return Panel.secciones(cont, 'aula', [
            { id:'estudiantes', titulo:'Mis estudiantes', icono:'🎒',
              cargar:(z) => ModEstudiantes.vistaLista(z, {
                soloLectura:true, gradosPermitidos: grados, titulo:'Nómina de mis aulas' }) },
            { id:'notas', titulo:'Cuaderno de notas', icono:'📝',
              cargar:(z) => ModAcademico.vistaNotas(z, { grados, docente: s.nombres }) },
            { id:'asistencia', titulo:'Asistencia', icono:'📅',
              cargar:(z) => ModAcademico.vistaAsistencia(z, { grados, docente: s.nombres }) },
            { id:'tareas', titulo:'Tareas y entregas', icono:'📋',
              cargar:(z) => ModAcademico.vistaTareas(z, { grados, docente: s.nombres }) },
          ]);
        },
      });

      Panel.registrar('comunicados', {
        titulo:'Comunicados',
        descripcion:'Lo publicado por dirección y administración',
        cargar:(cont) => ModComunicacion.vistaLectura(cont, s),
      });

      Panel.registrar('comunidad', {
        titulo:'Comunidad y mensajería',
        descripcion:'Escribe a dirección, a administración o a tus estudiantes',
        cargar:(cont) => Panel.secciones(cont, 'comunidad', [
          { id:'directorio', titulo:'Directorio', icono:'🔎',
            cargar:(z) => ModComunicacion.vistaDirectorio(z, s) },
          { id:'mensajes', titulo:'Mensajes', icono:'💬',
            cargar:(z) => ModComunicacion.vistaMensajes(z, s) },
        ]),
      });

      Panel.registrar('reportes', {
        titulo:'Reportes de aula',
        descripcion:'Nóminas, actas de notas y asistencia de tus aulas',
        cargar:(cont) => ModReportes.vistaReportes(cont, s),
      });

      Panel.registrar('soporte', {
        titulo:'Soporte',
        descripcion:'Ayuda de uso, contacto institucional y estado del sistema',
        cargar:(cont) => ModDireccion.vistaAyuda(cont, s),
      });
    },
  });
})();
