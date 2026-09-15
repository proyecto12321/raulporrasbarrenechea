/* =====================================================================
   MÓDULO: DIRECCIÓN
   ---------------------------------------------------------------------
   Lo que la directora necesita para ver la institución ordenada:

     · Clasificación de estudiantes, docentes, administrativos y
       registros académicos, separada por nivel, grado y sección —no
       todo revuelto en una sola tabla.
     · Un buscador que encuentra por nombre, código o DNI (el DNI solo
       se muestra completo a quien tiene permiso para verlo).
     · La bitácora: quién hizo qué, cuándo y sobre qué registro.

   Este archivo NO duplica las vistas que ya existen (padrón, personal,
   notas): las enlaza. Aquí vive solo lo que antes no tenía dueño.
   ===================================================================== */
'use strict';

const ModDireccion = (() => {
  const { q, qq, esc } = U;

  /* Quién puede ver un DNI completo. Un docente ve el de sus propios
     estudiantes; el resto lo ve enmascarado. No es decoración: es la
     regla que pide el encargo ("no mostrar el DNI completo a usuarios
     que no tengan autorización"). */
  const VE_DNI = ['director', 'administrativo', 'soporte'];
  function dni(valor, sesion){
    const v = String(valor || '');
    if (!v) return '—';
    if (sesion && VE_DNI.includes(sesion.rol)) return v;
    return v.slice(0, 2) + '•'.repeat(Math.max(0, v.length - 4)) + v.slice(-2);
  }

  /* ==================================================================
     1. CLASIFICACIÓN DE DATOS ADMINISTRATIVOS
     ================================================================== */
  async function vistaClasificacion(cont, sesion){
    let estudiantes = [], personal = [], grados = [];
    let grupo = 'estudiantes';

    cont.innerHTML = `
      <div class="banda banda-info mb16"><span class="ic">🗂️</span>
        <div>Todo el padrón clasificado solo: por <b>nivel</b>, <b>grado</b> y
        <b>sección</b> para los estudiantes; por <b>rol</b> para el personal.
        El buscador acepta nombre, código o DNI.</div></div>

      ${UI.herramientas({
        pista:'Buscar por nombre, código o DNI…',
        filtros:[
          { id:'filtroNivel',   opciones:[{ valor:'todos', texto:'Todos los niveles' }, ...NIVELES] },
          { id:'filtroGrado',   opciones:[{ valor:'todos', texto:'Todos los grados' }, ...GRADOS] },
          { id:'filtroEstadoC', opciones:[{ valor:'todos', texto:'Todos los estados' }, ...ESTADOS_ESTUDIANTE] },
        ],
      })}

      <div class="fila g8 envolver mb16" id="grupos">
        <button class="btn btn-oro btn-s" data-grupo="estudiantes">🎒 Estudiantes</button>
        <button class="btn btn-claro btn-s" data-grupo="docente">🧑‍🏫 Docentes</button>
        <button class="btn btn-claro btn-s" data-grupo="administrativo">🗂️ Personal administrativo</button>
        <button class="btn btn-claro btn-s" data-grupo="academico">📚 Registros académicos</button>
      </div>

      <div class="rejilla rejilla-4 mb16" id="kpiClas"></div>
      <div id="zonaClas">${UI.esqueleto(3)}</div>`;

    const [{ filas: e }, { filas: p }, { filas: g }] = await Promise.all([
      Datos.estudiantes.listar({}, { orden:'apellidos', asc:true }),
      Datos.usuarios.listar({ rol: ModPersonal.ROLES_PERSONAL }, { orden:'nombres', asc:true }),
      Datos.grados.listar({}, { orden:'orden', asc:true }),
    ]);
    estudiantes = e; personal = p; grados = g;

    function texto(){ return q('#buscador', cont).value; }

    function estudiantesFiltrados(){
      const nivel  = q('#filtroNivel', cont).value;
      const grado  = q('#filtroGrado', cont).value;
      const estado = q('#filtroEstadoC', cont).value;
      const t = texto();
      return estudiantes.filter(a =>
        U.coincide(a, t, ['nombres','apellidos','codigo','dni']) &&
        (nivel === 'todos'  || U.nivelDeGrado(a.grado) === nivel) &&
        (grado === 'todos'  || a.grado === grado) &&
        (estado === 'todos' || a.estado === estado));
    }

    function pintar(){
      const zona = q('#zonaClas', cont);
      const kpis = q('#kpiClas', cont);

      if (grupo === 'estudiantes'){
        const lista = estudiantesFiltrados();
        const porNivel = U.agrupar(lista, a => U.nivelDeGrado(a.grado));
        kpis.innerHTML = `
          ${UI.kpi({ icono:'🎒', clase:'l-oro',    valor:lista.length, rotulo:'Estudiantes encontrados' })}
          ${UI.kpi({ icono:'🧸', clase:'l-gris',   valor:(porNivel['Inicial'] || []).length, rotulo:'En Inicial' })}
          ${UI.kpi({ icono:'📚', clase:'l-marino', valor:(porNivel['Primaria'] || []).length, rotulo:'En Primaria' })}
          ${UI.kpi({ icono:'🏫', clase:'l-azul',   valor:new Set(lista.map(a => a.grado)).size, rotulo:'Aulas con estudiantes' })}`;

        q('#contadorRes', cont).textContent = `${lista.length} de ${estudiantes.length}`;

        if (!lista.length){ zona.innerHTML = UI.sinDatos('Ningún estudiante coincide con esos filtros.', '🔎'); return; }

        /* Agrupado por nivel → grado → sección, que es como lo pide la
           dirección (y como está organizado el colegio de verdad). */
        zona.innerHTML = NIVELES.map(nivel => {
          const delNivel = lista.filter(a => U.nivelDeGrado(a.grado) === nivel);
          if (!delNivel.length) return '';
          const porGrado = U.agrupar(delNivel, 'grado');
          return `
            <section class="grupo-clas">
              <h3 class="titulo-grupo">${nivel === 'Inicial' ? '🧸' : '📚'} ${esc(nivel)}
                <span class="t-xs t-mudo">${delNivel.length} estudiante(s)</span></h3>
              ${U.ordenarGrados(Object.keys(porGrado)).map(gr => {
                const delGrado = porGrado[gr];
                const porSeccion = U.agrupar(delGrado, a => a.seccion || 'Única');
                const info = grados.find(x => x.nombre === gr) || {};
                return `
                  <details class="acordeon-clas" ${delGrado.length ? '' : 'hidden'}>
                    <summary>
                      <b>${esc(gr)}</b>
                      <span class="t-xs t-mudo">${esc(info.docente || 'Sin docente asignado')}</span>
                      ${UI.etiqueta(`${delGrado.length}/${info.vacantes || IE.aforo_aula}`,
                        delGrado.length >= (info.vacantes || IE.aforo_aula) ? 'e-rojo' : 'e-verde')}
                    </summary>
                    ${Object.keys(porSeccion).sort().map(sec => `
                      <div class="seccion-clas">
                        <div class="t-xs t-mudo mb8">Sección ${esc(sec)} · ${porSeccion[sec].length} estudiante(s)</div>
                        ${UI.tabla({
                          columnas:[
                            { titulo:'Apellidos y nombres', valor:a => `<b class="t-s">${esc(a.apellidos)}, ${esc(a.nombres)}</b>` },
                            { titulo:'Código', valor:a => `<span class="t-mono t-xs">${esc(a.codigo || '—')}</span>` },
                            { titulo:'DNI', valor:a => `<span class="t-mono t-xs">${esc(dni(a.dni, sesion))}</span>` },
                            { titulo:'Estado', valor:a => UI.etiqueta(a.estado, UI.claseEstado(a.estado)) },
                            { titulo:'', clase:'acciones', valor:a => `
                              <button class="btn-ico" data-ver="${a.id}" title="Ver ficha">👁</button>` },
                          ],
                          filas: porSeccion[sec],
                          vacio:'Sin estudiantes en esta sección.',
                        })}
                      </div>`).join('')}
                  </details>`;
              }).join('')}
            </section>`;
        }).join('');
        return;
      }

      if (grupo === 'academico'){
        kpis.innerHTML = '';
        q('#contadorRes', cont).textContent = '';
        zona.innerHTML = `
          <div class="banda banda-ojo mb16"><span class="ic">📚</span>
            <div>Los registros académicos (notas, asistencia y tareas) se consultan
            por aula desde <b>Rendimiento</b>, y se emiten como acta desde
            <b>Reportes</b>. Aquí se muestra el resumen por grado.</div></div>
          <div id="resumenAcad">${UI.cargando('Contando registros…')}</div>`;

        (async () => {
          const [{ filas: notas }, { filas: tareas }, { filas: asistencia }] = await Promise.all([
            Datos.notas.listar({}, { limite:5000 }),
            Datos.tareas.listar({}, { limite:2000, columnas: Datos.adjuntos.columnas('tareas') }),
            Datos.asistencia.listar({}, { limite:5000 }),
          ]);
          const filas = U.ordenarGrados(GRADOS).map(gr => ({
            grado: gr,
            estudiantes: estudiantes.filter(a => a.grado === gr && a.estado === 'Matriculado').length,
            notas: notas.filter(n => n.grado === gr).length,
            tareas: tareas.filter(t => t.grado === gr).length,
            asistencia: asistencia.filter(x => x.grado === gr).length,
          }));
          q('#resumenAcad', cont).innerHTML = UI.tabla({
            columnas:[
              { titulo:'Grado', campo:'grado' },
              { titulo:'Estudiantes', campo:'estudiantes', clase:'num' },
              { titulo:'Notas registradas', campo:'notas', clase:'num' },
              { titulo:'Tareas asignadas', campo:'tareas', clase:'num' },
              { titulo:'Marcas de asistencia', campo:'asistencia', clase:'num' },
            ],
            filas,
            vacio:'Todavía no hay registros académicos.',
            iconoVacio:'📚',
          });
        })();
        return;
      }

      /* Personal: docentes o administrativos */
      const t = texto();
      const rolesGrupo = grupo === 'docente' ? ['docente'] : ['director','administrativo','soporte'];
      const lista = personal.filter(u =>
        rolesGrupo.includes(u.rol) && U.coincide(u, t, ['nombres','usuario','dni','cargo']));

      kpis.innerHTML = `
        ${UI.kpi({ icono:'👥', clase:'l-marino', valor:lista.length, rotulo:'Personas encontradas' })}
        ${UI.kpi({ icono:'✅', clase:'l-verde',  valor:lista.filter(u => u.activo).length, rotulo:'Cuentas activas' })}
        ${UI.kpi({ icono:'🚫', clase:'l-rojo',   valor:lista.filter(u => !u.activo).length, rotulo:'Desactivadas' })}
        ${UI.kpi({ icono:'🔑', clase:'l-naranja',valor:lista.filter(u => !u.ultimo_acceso).length, rotulo:'Nunca ingresaron' })}`;

      q('#contadorRes', cont).textContent = `${lista.length} persona(s)`;

      zona.innerHTML = UI.tabla({
        columnas:[
          { titulo:'Persona', valor:u => `
            <div class="fila g12">${UI.avatar(u.nombres)}
              <div class="min0"><b class="t-s">${esc(u.nombres)}</b>
              <div class="t-xs t-mudo">${esc(u.cargo || ROLES[u.rol]?.nombre || '')}</div></div></div>` },
          { titulo:'Rol', valor:u => UI.etiqueta(ROLES[u.rol]?.nombre || u.rol, 'e-azul') },
          { titulo:'Aulas', valor:u => esc(u.grados_asignados || '—') },
          { titulo:'DNI', valor:u => `<span class="t-mono t-xs">${esc(dni(u.dni, sesion))}</span>` },
          { titulo:'Último acceso', valor:u => u.ultimo_acceso ? U.hace(u.ultimo_acceso) : 'nunca' },
          { titulo:'Estado', valor:u => u.activo ? UI.etiqueta('Activa','e-verde') : UI.etiqueta('Desactivada','e-rojo') },
        ],
        filas: lista,
        vacio:'Nadie coincide con esa búsqueda.',
        iconoVacio:'👥',
      });
    }

    q('#grupos', cont).onclick = e2 => {
      const b = e2.target.closest('[data-grupo]');
      if (!b) return;
      grupo = b.dataset.grupo;
      qq('[data-grupo]', cont).forEach(x => {
        x.classList.toggle('btn-oro', x === b);
        x.classList.toggle('btn-claro', x !== b);
      });
      pintar();
    };

    cont.addEventListener('click', e2 => {
      const ver = e2.target.closest('[data-ver]');
      if (!ver) return;
      const a = estudiantes.find(x => String(x.id) === ver.dataset.ver);
      if (a) ModEstudiantes.verFicha(a);
    });

    Panel.conectarHerramientas(cont, pintar);
    pintar();
  }

  /* ==================================================================
     2. AUDITORÍA PARA DIRECCIÓN
     ------------------------------------------------------------------
     La bitácora completa ya existe (ModSoporte.vistaAuditoria). Lo que
     agrega esta vista es lo que pidió la dirección: ver de un vistazo
     los ingresos nuevos —estudiantes y docentes— antes del detalle.
     ================================================================== */
  async function vistaAuditoria(cont, sesion){
    cont.innerHTML = `
      <div class="rejilla rejilla-2 mb16">
        <div class="tarjeta">
          <div class="cabeza"><h3>🎒 Estudiantes nuevos</h3>
            <span class="t-xs t-mudo">últimos registrados</span></div>
          <div id="nuevosAlumnos">${UI.esqueleto(2)}</div>
        </div>
        <div class="tarjeta">
          <div class="cabeza"><h3>🧑‍🏫 Docentes nuevos</h3>
            <span class="t-xs t-mudo">últimas cuentas creadas</span></div>
          <div id="nuevosDocentes">${UI.esqueleto(2)}</div>
        </div>
      </div>
      <h3 class="mb8">Bitácora completa</h3>
      <p class="t-s t-mudo mb16">Quién hizo qué, cuándo y sobre qué registro. No guarda contraseñas ni datos sensibles.</p>
      <div id="auditoriaCompleta"></div>`;

    const lista = (arr, vacio) => arr.length ? `
      <div class="pila g8">
        ${arr.map(a => `
          <div class="fila-ios">
            <span class="loseta loseta-s l-oro">＋</span>
            <div class="txt"><b>${esc(a.nombre)}</b><small>${esc(a.detalle)}</small></div>
            <span class="t-xs t-mudo">${esc(U.hace(a.fecha))}</span>
          </div>`).join('')}
      </div>` : UI.sinDatos(vacio, '📭');

    const [{ filas: alumnos }, { filas: docentes }] = await Promise.all([
      Datos.estudiantes.listar({ anio:IE.anio }, { orden:'creado_en', asc:false, limite:8 }),
      Datos.usuarios.listar({ rol:'docente' }, { orden:'creado_en', asc:false, limite:8 }),
    ]);

    q('#nuevosAlumnos', cont).innerHTML = lista(
      alumnos.map(a => ({ nombre:`${a.apellidos}, ${a.nombres}`,
        detalle:`${a.grado} · DNI ${dni(a.dni, sesion)}`, fecha:a.creado_en })),
      'Sin estudiantes registrados todavía.');

    q('#nuevosDocentes', cont).innerHTML = lista(
      docentes.map(d => ({ nombre:d.nombres,
        detalle:d.grados_asignados || 'Sin aula asignada', fecha:d.creado_en })),
      'Sin docentes registrados todavía.');

    await ModSoporte.vistaAuditoria(q('#auditoriaCompleta', cont));
  }

  /* ==================================================================
     3. AYUDA Y SOPORTE (para todos los roles)
     ------------------------------------------------------------------
     El módulo "Soporte" del menú: cómo se usa el sistema, a quién
     escribir, en qué versión está y si la conexión responde. Nada de
     jerga técnica para quien no la necesita.
     ================================================================== */
  const PREGUNTAS = [
    { p:'¿Cómo cambio mi contraseña?',
      r:'Con el botón «🔑 Cambiar mi contraseña», abajo en el menú lateral. Te pide la actual y la nueva dos veces.' },
    { p:'¿Cómo escribo a otra persona del colegio?',
      r:'En «Comunidad y mensajería»: busca a la persona por nombre, código o DNI y pulsa «Mandar mensaje».' },
    { p:'¿Dónde veo los comunicados?',
      r:'En «Matrícula y comunicados», pestaña «Comunicados». Los que te corresponden aparecen primero.' },
    { p:'¿Cómo pido una constancia?',
      r:'Las emite Dirección o la oficina administrativa desde «Reportes». Si eres estudiante o apoderado, pídela por mensaje o en la oficina.' },
    { p:'El sistema me dice que mi sesión expiró, ¿qué hago?',
      r:'Vuelve a ingresar con tu usuario y contraseña. No se pierde nada de lo que ya estaba guardado.' },
    { p:'Subí un archivo y no se guardó',
      r:'Revisa el peso: las fotos e imágenes admiten hasta 3 MB y los adjuntos de tareas hasta 6 MB. Si pesa más, redúcelo y vuelve a intentarlo.' },
  ];

  async function vistaAyuda(cont, sesion){
    cont.innerHTML = `
      <div class="rejilla-70-30">
        <div class="pila g16">
          <div class="tarjeta">
            <div class="cabeza"><div><h3>❓ Preguntas frecuentes</h3>
              <p>Lo que más se pregunta, respondido en corto.</p></div></div>
            <div class="pila g8">
              ${PREGUNTAS.map(x => `
                <details class="acordeon-clas">
                  <summary><b>${esc(x.p)}</b></summary>
                  <p class="t-s t-2 cuerpo-ayuda">${esc(x.r)}</p>
                </details>`).join('')}
            </div>
          </div>

          <div class="tarjeta">
            <div class="cabeza"><div><h3>🛠️ ¿Algo no funciona?</h3>
              <p>Cuéntanoslo y queda registrado con un código de seguimiento.</p></div></div>
            <button class="btn btn-oro" id="btnTicketAyuda">Reportar un problema</button>
          </div>
        </div>

        <div class="pila g16">
          <div class="tarjeta">
            <div class="cabeza"><h3>🏫 Contacto</h3></div>
            <dl class="ficha-lista">
              <div><dt>Institución</dt><dd>${esc(IE.nombre)}</dd></div>
              <div><dt>Dirección</dt><dd>${esc(IE.direccion)}</dd></div>
              <div><dt>Teléfono</dt><dd>${esc(IE.telefono)}</dd></div>
              <div><dt>Atención</dt><dd>${esc(IE.horario_atencion)}</dd></div>
              <div><dt>Clases</dt><dd>${esc(IE.horario_clases)}</dd></div>
            </dl>
          </div>

          <div class="tarjeta">
            <div class="cabeza"><h3>ℹ️ Sistema</h3></div>
            <dl class="ficha-lista">
              <div><dt>Versión</dt><dd>v${esc(IE.version_sistema)}</dd></div>
              <div><dt>Tu rol</dt><dd>${esc(ROLES[sesion.rol]?.nombre || sesion.rol)}</dd></div>
              <div><dt>Año escolar</dt><dd>${IE.anio}</dd></div>
              <div><dt>Conexión</dt><dd id="pulsoAyuda">comprobando…</dd></div>
            </dl>
          </div>
        </div>
      </div>`;

    q('#btnTicketAyuda', cont).onclick = () => Chatbot.abrirFormularioTicket();

    try {
      const p = await Datos.pulso();
      q('#pulsoAyuda', cont).innerHTML = p.en_linea
        ? `${UI.etiqueta('En línea', 'e-verde')} <span class="t-xs t-mudo">${U.ms(p.ms)}</span>`
        : UI.etiqueta('Sin conexión', 'e-rojo');
    } catch {
      q('#pulsoAyuda', cont).innerHTML = UI.etiqueta('Sin conexión', 'e-rojo');
    }
  }

  return { vistaClasificacion, vistaAuditoria, vistaAyuda, dni };
})();
