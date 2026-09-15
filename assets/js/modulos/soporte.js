/* =====================================================================
   MÓDULO: SOPORTE TÉCNICO Y AUDITORÍA
   ---------------------------------------------------------------------
   Área de soporte pedida expresamente: bandeja de tickets, estado de la
   plataforma, bitácora de auditoría, intentos de acceso y respaldos.
   ===================================================================== */
'use strict';

const ModSoporte = (() => {
  const { q, qq, esc } = U;

  /* ==================================================================
     1. BANDEJA DE TICKETS
     ================================================================== */
  async function vistaTickets(cont, sesion){
    let todos = [];

    cont.innerHTML = `
      ${UI.herramientas({
        pista:'Buscar por código, asunto o solicitante…',
        filtros:[
          { id:'filtroEstadoT', opciones:[{ valor:'todos', texto:'Todos los estados' }, ...ESTADOS_TICKET] },
          { id:'filtroPrio',    opciones:[{ valor:'todos', texto:'Todas las prioridades' }, ...PRIORIDADES] },
        ],
        acciones:`
          <button class="btn btn-marino btn-s" id="btnRepTickets">📄 Reporte</button>
          <button class="btn btn-oro btn-s" id="btnNuevoTicket">＋ Registrar caso</button>`,
      })}
      <div class="rejilla rejilla-4 mb16" id="kpiTickets"></div>
      <div id="zonaTickets">${UI.esqueleto(3)}</div>`;

    async function cargar(){
      const { filas } = await Datos.tickets.listar({}, { orden:'creado_en' });
      todos = filas;
      pintar();
    }

    function filtradas(){
      const t = q('#buscador', cont).value;
      const e = q('#filtroEstadoT', cont).value;
      const p = q('#filtroPrio', cont).value;
      return todos.filter(x =>
        U.coincide(x, t, ['codigo','asunto','detalle','solicitante','categoria']) &&
        (e === 'todos' || x.estado === e) &&
        (p === 'todos' || x.prioridad === p));
    }

    function pintar(){
      const lista = filtradas();
      const abiertos = todos.filter(t => t.estado === 'Abierto').length;
      UI.contador('tickets', abiertos);

      const cerrados = todos.filter(t => t.cerrado_en);
      const tiempos = cerrados.map(t => (new Date(t.cerrado_en) - new Date(t.creado_en)) / 3600000).filter(h => h >= 0);

      q('#kpiTickets', cont).innerHTML = `
        ${UI.kpi({ icono:'🎫', clase:'l-morado', valor: todos.length, rotulo:'Tickets registrados' })}
        ${UI.kpi({ icono:'🔴', clase:'l-rojo',   valor: abiertos, rotulo:'Abiertos' })}
        ${UI.kpi({ icono:'✅', clase:'l-verde',  valor: todos.filter(t => ['Resuelto','Cerrado'].includes(t.estado)).length, rotulo:'Resueltos' })}
        ${UI.kpi({ icono:'⏱', clase:'l-azul',   valor: tiempos.length ? U.redondear(tiempos.reduce((a,b)=>a+b,0)/tiempos.length, 1) + ' h' : '—', rotulo:'Tiempo medio de atención' })}`;

      q('#contadorRes', cont).textContent = `${lista.length} de ${todos.length}`;

      if (!lista.length){
        q('#zonaTickets', cont).innerHTML = UI.sinDatos('No hay tickets con esos filtros. 🎉', '🎫');
        return;
      }

      q('#zonaTickets', cont).innerHTML = `<div class="pila g12">` + lista.map(t => `
        <div class="ticket p-${String(t.prioridad || 'Media').toLowerCase()}">
          <span class="loseta ${t.estado === 'Abierto' ? 'l-rojo' : t.estado === 'En proceso' ? 'l-naranja' : 'l-verde'}">
            ${t.estado === 'Abierto' ? '🔴' : t.estado === 'En proceso' ? '🛠️' : '✅'}
          </span>
          <div class="txt">
            <b>${esc(t.asunto)}</b>
            <p>${esc(t.detalle || '')}</p>
            ${t.respuesta ? `<div class="banda banda-ok mt8 t-08">
              <span class="ic">💬</span><div><b>Respuesta:</b> ${esc(t.respuesta)}</div></div>` : ''}
            <div class="meta">
              <span class="t-mono t-xs">${esc(t.codigo || '')}</span>
              ${UI.etiqueta(t.estado, UI.claseEstado(t.estado))}
              ${UI.etiqueta(t.prioridad || 'Media', UI.claseEstado(t.prioridad))}
              ${UI.etiqueta(t.categoria || 'Otro', 'e-gris')}
              <span>👤 ${esc(t.solicitante || '—')}</span>
              <span>📞 ${esc(t.contacto || '—')}</span>
              <span>🕒 ${esc(U.hace(t.creado_en))}</span>
            </div>
          </div>
          <div class="pila g8">
            ${t.estado !== 'Cerrado' ? `<button class="btn btn-oro btn-s" data-atender="${t.id}">Atender</button>` : ''}
            ${t.estado === 'Abierto' ? `<button class="btn btn-claro btn-s" data-proceso="${t.id}">En proceso</button>` : ''}
          </div>
        </div>`).join('') + '</div>';
    }

    cont.addEventListener('click', async e => {
      const at = e.target.closest('[data-atender]');
      const pr = e.target.closest('[data-proceso]');
      if (at){
        const t = todos.find(x => x.id === +at.dataset.atender);
        atender(t, sesion, cargar);
      }
      if (pr){
        const t = todos.find(x => x.id === +pr.dataset.proceso);
        await Datos.tickets.actualizar(t.id, { estado:'En proceso', atendido_por: sesion.nombres });
        Datos.auditar('Ticket tomado', 'Soporte', { detalle: t.codigo });
        UI.exito('Ticket marcado en proceso.');
        cargar();
      }
    });

    q('#btnNuevoTicket', cont).onclick = () => Chatbot.abrirFormularioTicket();

    q('#btnRepTickets', cont).onclick = () => Reporte.listado({
      titulo:'Tickets de soporte técnico',
      columnas:[
        { titulo:'Código', campo:'codigo' }, { titulo:'Asunto', campo:'asunto' },
        { titulo:'Categoría', campo:'categoria' }, { titulo:'Prioridad', campo:'prioridad' },
        { titulo:'Solicitante', campo:'solicitante' }, { titulo:'Estado', campo:'estado' },
        { titulo:'Creado', valor:t => U.fechaHora(t.creado_en) },
        { titulo:'Atendido por', campo:'atendido_por' },
      ],
      filas: filtradas(),
      resumen:[
        { valor: filtradas().length, rotulo:'Tickets' },
        { valor: filtradas().filter(t => t.estado === 'Abierto').length, rotulo:'Abiertos' },
        { valor: filtradas().filter(t => ['Resuelto','Cerrado'].includes(t.estado)).length, rotulo:'Resueltos' },
      ],
      obligatorios:['asunto'],
    });

    Panel.conectarHerramientas(cont, pintar);
    if (db) Datos.tickets.escuchar(() => cargar());
    await cargar();
  }

  function atender(ticket, sesion, alTerminar){
    const campos = [
      { id:'respuesta', etiqueta:'Respuesta al solicitante', tipo:'area', filas:4, requerido:true, ancho:'completo',
        valor: ticket.respuesta || '',
        valida:v => U.val.largo(v, 8, 600) || 'Explica qué se hizo o qué debe hacer la persona.' },
      { id:'estado', etiqueta:'Nuevo estado', tipo:'select', icono:'📌', opciones:ESTADOS_TICKET,
        valor:'Resuelto', ancho:'completo' },
    ];
    const cuerpo = U.crear('div');
    cuerpo.innerHTML = `
      <div class="tarjeta tarjeta-solida mb16 fondo-lienzo">
        <b class="t-s">${esc(ticket.asunto)}</b>
        <p class="t-s t-2 mt8">${esc(ticket.detalle || '')}</p>
        <div class="t-xs t-mudo mt8">
          ${esc(ticket.codigo)} · ${esc(ticket.solicitante || '')} · ${esc(ticket.contacto || '')} · ${esc(U.fechaHora(ticket.creado_en))}
        </div>
      </div>`;
    cuerpo.append(UI.formulario(campos, { columnas:1 }));

    UI.modal({
      titulo:'Atender ticket', subtitulo:ticket.codigo, cuerpo, ancho:'ancha',
      botones:[
        { texto:'Cancelar', clase:'btn-fantasma', esperando:false, accion: () => {} },
        { texto:'Guardar respuesta', clase:'btn-oro', esperandoTexto:'Guardando…',
          accion: async ({ zona }) => {
            const d = UI.leerFormulario(zona, campos);
            if (!UI.validarFormulario(zona, campos, d)) return false;
            await Datos.tickets.actualizar(ticket.id, {
              respuesta: d.respuesta, estado: d.estado,
              atendido_por: sesion.nombres,
              cerrado_en: ['Resuelto','Cerrado'].includes(d.estado) ? new Date().toISOString() : null,
            });
            Datos.auditar(`Ticket ${d.estado.toLowerCase()}`, 'Soporte', { detalle: ticket.codigo });
            UI.exito('Respuesta registrada.');
            if (alTerminar) alTerminar();
          } },
      ],
    });
  }

  /* ==================================================================
     2. ESTADO DE LA PLATAFORMA
     ================================================================== */
  async function vistaSalud(cont){
    cont.innerHTML = `<div class="rejilla rejilla-2" id="zonaSalud">${UI.esqueleto(4)}</div>`;

    async function medir(){
      const zona = q('#zonaSalud', cont);
      const p = await Datos.pulso();

      const tablas = ['usuarios','estudiantes','notas','comunicados','tickets','auditoria','solicitudes','pagos'];
      const conteos = await Promise.all(tablas.map(async t => {
        try { return { tabla:t, n: await Datos.repositorio(t).contar() }; }
        catch { return { tabla:t, n:null }; }
      }));

      const navegadorOk = !!(window.crypto && window.crypto.subtle);
      const almacenamientoOk = U.guardado.escribir('rpb_prueba', 1);
      U.guardado.borrar('rpb_prueba');

      zona.innerHTML = `
        <div class="tarjeta">
          <div class="cabeza"><h3>💚 Pulso del sistema</h3>
            <button class="btn btn-claro btn-s" id="btnRemedir">↻ Volver a medir</button></div>
          <div class="pila g8">
            ${pulso('Conexión con la base de datos', p.en_linea ? `Respondió en ${U.ms(p.ms)}` : (p.error || 'Sin respuesta'), p.en_linea)}
            ${pulso('Cifrado del navegador (Web Crypto)', navegadorOk ? 'Disponible: PBKDF2 activo' : 'No disponible en este navegador', navegadorOk)}
            ${pulso('Almacenamiento local', almacenamientoOk ? 'Escritura correcta' : 'Bloqueado (modo privado)', almacenamientoOk)}
            ${pulso('Tiempo real (suscripciones)', db ? 'Canal activo' : 'Sin cliente configurado', !!db)}
          </div>
          <hr class="linea-div">
          <dl class="ficha-lista">
            <div><dt>Versión del sistema</dt><dd>v${IE.version_sistema}</dd></div>
            <div><dt>Año escolar activo</dt><dd>${IE.anio}</dd></div>
            <div><dt>Navegador</dt><dd>${esc(navigator.userAgent.split(') ')[0].split(' (')[0])}</dd></div>
            <div><dt>Conexión</dt><dd>${navigator.onLine ? 'En línea' : 'Sin internet'}</dd></div>
          </dl>
        </div>

        <div class="tarjeta">
          <div class="cabeza"><h3>🗄️ Registros por tabla</h3></div>
          ${UI.tabla({
            columnas:[
              { titulo:'Tabla', campo:'tabla' },
              { titulo:'Registros', clase:'num', valor:c => c.n === null
                  ? UI.etiqueta('sin acceso', 'e-rojo') : `<b>${U.num(c.n)}</b>` },
            ],
            filas: conteos,
          })}
        </div>`;

      q('#btnRemedir', cont).onclick = medir;
    }

    const pulso = (titulo, detalle, ok) => `
      <div class="pulso">
        <span class="punto ${ok ? 'punto-vivo' : ''}" style="background:${ok ? 'var(--verde)' : 'var(--rojo)'}"></span>
        <div class="txt"><b>${esc(titulo)}</b><small>${esc(detalle)}</small></div>
        ${UI.etiqueta(ok ? 'Correcto' : 'Revisar', ok ? 'e-verde' : 'e-rojo')}
      </div>`;

    await medir();
  }

  /* ==================================================================
     3. BITÁCORA DE AUDITORÍA
     ================================================================== */
  async function vistaAuditoria(cont){
    let todos = [];

    cont.innerHTML = `
      ${UI.herramientas({
        pista:'Buscar por usuario, acción o módulo…',
        filtros:[
          { id:'filtroModulo', opciones:[{ valor:'todos', texto:'Todos los módulos' },
              'Acceso','Matrícula','Estudiantes','Académico','Comunicación','Documentos',
              'Constancias','Reportes','Seguridad','Soporte','Admisión','Pagos'] },
          { id:'filtroRolAud', opciones:[{ valor:'todos', texto:'Todos los roles' },
              ...Object.keys(ROLES), 'publico'] },
        ],
        acciones:`
          <button class="btn btn-claro btn-s" id="btnExpAud">⬇️ Exportar</button>
          <button class="btn btn-marino btn-s" id="btnRepAud">📄 Reporte</button>`,
      })}
      <div class="rejilla rejilla-4 mb16" id="kpiAud"></div>
      <div id="zonaAud">${UI.esqueleto(4)}</div>`;

    async function cargar(){
      const { filas } = await Datos.auditoria.listar({}, { limite:600, orden:'creado_en' });
      todos = filas;
      pintar();
    }

    function filtradas(){
      const t = q('#buscador', cont).value;
      const m = q('#filtroModulo', cont).value;
      const r = q('#filtroRolAud', cont).value;
      return todos.filter(a =>
        U.coincide(a, t, ['usuario','accion','modulo','detalle']) &&
        (m === 'todos' || a.modulo === m) &&
        (r === 'todos' || a.rol === r));
    }

    function pintar(){
      const lista = filtradas();
      const hoy = todos.filter(a => U.diasHasta(a.creado_en) === 0);
      const tiempos = todos.map(a => a.ms).filter(x => x > 0);

      q('#kpiAud', cont).innerHTML = `
        ${UI.kpi({ icono:'📜', clase:'l-marino', valor:todos.length, rotulo:'Eventos registrados' })}
        ${UI.kpi({ icono:'📅', clase:'l-azul',   valor:hoy.length, rotulo:'Movimientos de hoy' })}
        ${UI.kpi({ icono:'👥', clase:'l-verde',  valor:new Set(todos.map(a => a.usuario)).size, rotulo:'Usuarios distintos' })}
        ${UI.kpi({ icono:'⚡', clase:'l-oro',    valor:tiempos.length ? U.ms(Math.round(tiempos.reduce((a,b)=>a+b,0)/tiempos.length)) : '—', rotulo:'Tiempo medio por acción' })}`;

      q('#contadorRes', cont).textContent = `${lista.length} de ${todos.length} eventos`;

      q('#zonaAud', cont).innerHTML = UI.tabla({
        columnas:[
          { titulo:'Fecha y hora', valor:a => `<span class="t-xs t-mono">${U.fechaHora(a.creado_en)}</span>` },
          { titulo:'Usuario', valor:a => `<b class="t-s">${esc(a.usuario)}</b>
              <div class="t-xs t-mudo">${esc(ROLES[a.rol]?.nombre || a.rol || '')}</div>` },
          { titulo:'Acción', valor:a => `${esc(a.accion)}${a.detalle ? `<div class="t-xs t-mudo">${esc(a.detalle)}</div>` : ''}` },
          { titulo:'Módulo', valor:a => UI.etiqueta(a.modulo || 'General', 'e-azul') },
          { titulo:'Duración', clase:'num', valor:a => a.ms ? U.ms(a.ms) : '—' },
        ],
        filas: lista.slice(0, 150),
        vacio:'Sin eventos que coincidan.',
        iconoVacio:'📜',
      });
    }

    q('#btnExpAud', cont).onclick = () => {
      U.descargar(U.aCSV(filtradas(), [
        { titulo:'Fecha', valor:a => U.fechaHora(a.creado_en) },
        { titulo:'Usuario', campo:'usuario' }, { titulo:'Rol', campo:'rol' },
        { titulo:'Acción', campo:'accion' }, { titulo:'Módulo', campo:'modulo' },
        { titulo:'Detalle', campo:'detalle' }, { titulo:'ms', campo:'ms' },
      ]), `auditoria_${U.hoyISO()}.csv`);
      UI.exito('Bitácora exportada.');
    };

    q('#btnRepAud', cont).onclick = () => Reporte.listado({
      titulo:'Bitácora de auditoría del sistema',
      columnas:[
        { titulo:'Fecha', valor:a => U.fechaHora(a.creado_en) },
        { titulo:'Usuario', campo:'usuario' }, { titulo:'Rol', campo:'rol' },
        { titulo:'Acción', campo:'accion' }, { titulo:'Módulo', campo:'modulo' },
        { titulo:'ms', campo:'ms', num:true },
      ],
      filas: filtradas().slice(0, 300),
      resumen:[
        { valor: filtradas().length, rotulo:'Eventos' },
        { valor: new Set(filtradas().map(a => a.usuario)).size, rotulo:'Usuarios' },
      ],
      obligatorios:['accion'],
    });

    Panel.conectarHerramientas(cont, pintar);
    await cargar();
  }

  /* ==================================================================
     4. INTENTOS DE ACCESO
     ================================================================== */
  async function vistaAccesos(cont){
    cont.innerHTML = `
      ${UI.herramientas({
        pista:'Buscar por identificador…',
        filtros:[{ id:'filtroExito', opciones:[
          { valor:'todos', texto:'Todos' },
          { valor:'1', texto:'Solo exitosos' },
          { valor:'0', texto:'Solo fallidos' }] }],
        acciones:'',
      })}
      <div class="rejilla rejilla-4 mb16" id="kpiAcc"></div>
      <div id="zonaAcc">${UI.esqueleto(4)}</div>`;

    let todos = [];

    async function cargar(){
      const { filas } = await Datos.intentos.listar({}, { limite:400, orden:'creado_en' });
      todos = filas;
      pintar();
    }

    function filtradas(){
      const t = q('#buscador', cont).value;
      const e = q('#filtroExito', cont).value;
      return todos.filter(a =>
        U.coincide(a, t, ['identificador','motivo','tipo']) &&
        (e === 'todos' || String(a.exito) === e));
    }

    function pintar(){
      const lista = filtradas();
      const fallidos = todos.filter(a => !a.exito);
      const sospechosos = Object.entries(U.contarPor(fallidos, 'identificador'))
        .filter(([, n]) => n >= 3).length;

      q('#kpiAcc', cont).innerHTML = `
        ${UI.kpi({ icono:'🔑', clase:'l-azul',  valor:todos.length, rotulo:'Intentos registrados' })}
        ${UI.kpi({ icono:'✅', clase:'l-verde', valor:todos.filter(a => a.exito).length, rotulo:'Ingresos correctos' })}
        ${UI.kpi({ icono:'⛔️', clase:'l-rojo',  valor:fallidos.length, rotulo:'Intentos fallidos' })}
        ${UI.kpi({ icono:'⚠️', clase:'l-naranja', valor:sospechosos, rotulo:'Identificadores con 3+ fallos' })}`;

      q('#contadorRes', cont).textContent = `${lista.length} registros`;

      q('#zonaAcc', cont).innerHTML = UI.tabla({
        columnas:[
          { titulo:'Fecha y hora', valor:a => `<span class="t-xs t-mono">${U.fechaHora(a.creado_en)}</span>` },
          { titulo:'Identificador', valor:a => `<span class="t-mono t-s">${esc(a.identificador)}</span>` },
          { titulo:'Puerta', valor:a => UI.etiqueta(a.tipo === 'estudiante' ? '🎒 Estudiante' : '🧑‍🏫 Personal',
              a.tipo === 'estudiante' ? 'e-oro' : 'e-azul') },
          { titulo:'Resultado', valor:a => a.exito
              ? UI.etiqueta('Correcto', 'e-verde') : UI.etiqueta('Fallido', 'e-rojo') },
          { titulo:'Motivo', valor:a => esc(a.motivo || '—') },
        ],
        filas: lista.slice(0, 150),
        vacio:'Sin intentos registrados.',
        iconoVacio:'🔑',
      });
    }

    Panel.conectarHerramientas(cont, pintar);
    await cargar();
  }

  /* ==================================================================
     5. RESPALDOS
     ================================================================== */
  async function vistaRespaldos(cont, sesion){
    const TABLAS = [
      { id:'estudiantes', nombre:'Padrón de estudiantes', icono:'🎒', clase:'l-oro' },
      { id:'usuarios',    nombre:'Cuentas del personal',  icono:'👥', clase:'l-marino' },
      { id:'notas',       nombre:'Calificaciones',        icono:'📝', clase:'l-azul' },
      { id:'matriculas',  nombre:'Matrículas',            icono:'📋', clase:'l-verde' },
      { id:'asistencia',  nombre:'Asistencia',            icono:'📅', clase:'l-agua' },
      { id:'comunicados', nombre:'Comunicados',           icono:'📣', clase:'l-rojo' },
      { id:'pagos',       nombre:'Pagos y pensiones',     icono:'💰', clase:'l-morado' },
      { id:'auditoria',   nombre:'Bitácora de auditoría', icono:'📜', clase:'l-gris' },
    ];

    cont.innerHTML = `
      <div class="banda banda-ojo mb16"><span class="ic">💾</span>
        <div>Los respaldos se descargan a tu computadora en formato <b>JSON</b> o
        <b>CSV</b>. Guarda una copia fuera del equipo al menos una vez por mes.
        La contraseña del personal se exporta cifrada, nunca en texto legible.</div></div>

      <div class="rejilla rejilla-3 mb16">
        ${TABLAS.map(t => `
          <div class="tarjeta">
            <div class="fila g12 mb12">
              <span class="loseta ${t.clase}">${t.icono}</span>
              <div class="min0">
                <b class="t-s">${esc(t.nombre)}</b>
                <div class="t-xs t-mudo" id="n_${t.id}">contando…</div>
              </div>
            </div>
            <div class="fila g8">
              <button class="btn btn-claro btn-s crece" data-json="${t.id}">JSON</button>
              <button class="btn btn-claro btn-s crece" data-csv="${t.id}">CSV</button>
            </div>
          </div>`).join('')}
      </div>

      <div class="tarjeta">
        <div class="cabeza">
          <div><h3>📦 Respaldo completo</h3>
            <p>Un solo archivo con todas las tablas del sistema.</p></div>
        </div>
        <button class="btn btn-oro btn-bloque" id="btnTodo">Descargar respaldo completo (JSON)</button>
        <div id="progresoRespaldo" class="mt12"></div>
      </div>`;

    /* Conteos */
    TABLAS.forEach(async t => {
      try {
        const n = await Datos.repositorio(t.id).contar();
        const el = q('#n_' + t.id, cont);
        if (el) el.textContent = `${U.num(n)} registros`;
      } catch {
        const el = q('#n_' + t.id, cont);
        if (el) el.textContent = 'sin acceso';
      }
    });

    async function traerTabla(id){
      const { filas } = await Datos.repositorio(id).listar({}, { limite:5000 });
      return filas.map(f => {
        const copia = { ...f };
        if ('clave' in copia) copia.clave = '(cifrada · no exportada)';
        return copia;
      });
    }

    cont.addEventListener('click', async e => {
      const j = e.target.closest('[data-json]');
      const c = e.target.closest('[data-csv]');
      if (!j && !c) return;
      const id = (j || c).dataset.json || (j || c).dataset.csv;
      const btn = (j || c);
      btn.disabled = true; const txt = btn.textContent; btn.textContent = '…';
      try {
        const filas = await traerTabla(id);
        if (j){
          U.descargar(JSON.stringify({ tabla:id, generado: new Date().toISOString(), filas }, null, 2),
            `respaldo_${id}_${U.hoyISO()}.json`, 'application/json');
        } else {
          const cols = Object.keys(filas[0] || { id:'' }).map(k => ({ titulo:k, campo:k }));
          U.descargar(U.aCSV(filas, cols), `respaldo_${id}_${U.hoyISO()}.csv`);
        }
        Datos.auditar('Respaldo descargado', 'Soporte', { detalle: `${id} (${filas.length} filas)` });
        UI.exito(`${filas.length} registros exportados.`);
      } catch(err){ UI.fallo(err.message); }
      btn.disabled = false; btn.textContent = txt;
    });

    q('#btnTodo', cont).onclick = async (ev) => {
      const btn = ev.currentTarget;
      const prog = q('#progresoRespaldo', cont);
      btn.disabled = true;
      const paquete = { institucion: IE.nombre, version: IE.version_sistema,
                        generado: new Date().toISOString(), generado_por: sesion.nombres, tablas:{} };
      try {
        for (let i = 0; i < TABLAS.length; i++){
          prog.innerHTML = `<div class="barra"><i style="width:${U.pct(i, TABLAS.length)}%"></i></div>
            <div class="t-xs t-mudo mt8">Copiando ${TABLAS[i].nombre}…</div>`;
          paquete.tablas[TABLAS[i].id] = await traerTabla(TABLAS[i].id);
        }
        const total = Object.values(paquete.tablas).reduce((a, f) => a + f.length, 0);
        U.descargar(JSON.stringify(paquete, null, 2),
          `respaldo_completo_RPB_${U.hoyISO()}.json`, 'application/json');
        Datos.auditar('Respaldo completo generado', 'Soporte', { detalle: `${total} registros` });
        prog.innerHTML = `<div class="banda banda-ok"><span class="ic">✅</span>
          <div>Respaldo completo con <b>${U.num(total)}</b> registros descargado.</div></div>`;
      } catch(e){
        prog.innerHTML = `<div class="banda banda-mal"><span class="ic">⛔️</span><div>${esc(e.message)}</div></div>`;
      }
      btn.disabled = false;
    };
  }

  /* ==================================================================
     6. APARIENCIA — la insignia y TODAS las fotos del colegio
     ------------------------------------------------------------------
     Solo Soporte entra aquí. Lo que sube se guarda en la base de datos
     (tablas config_sistema e imagenes), no en la carpeta assets/img ni
     en el navegador de una persona: por eso lo ve todo el mundo al
     instante, sin tener que volver a publicar el sitio ni pedirle a
     nadie que copie archivos.
     ================================================================== */
  const TOPE_IMAGEN_MB = 3;

  function leerArchivoComoDatos(archivo){
    return new Promise((resolve, reject) => {
      const lector = new FileReader();
      lector.onload = () => resolve(lector.result);
      lector.onerror = reject;
      lector.readAsDataURL(archivo);
    });
  }

  /* Convierte un nombre en una clave estable y sin sorpresas:
     "Aula de 5 años" → "aula_de_5_anos". */
  function aClave(texto){
    return U.sinTildes(String(texto || ''))
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40) || 'foto_' + Date.now().toString(36);
  }

  async function vistaApariencia(cont){
    const [logo, firma, fotos, { filas: guardadas }] = await Promise.all([
      Datos.config.obtener('logo_url', ''),
      Datos.config.obtener('firma_url', ''),
      Datos.imagenes.todas(true),
      Datos.imagenes.listar({}, { orden:'clave', asc:true, limite:300 }).catch(() => ({ filas:[] })),
    ]);

    /* Nombre y descripción: mandan los que Soporte haya guardado; si no
       ha tocado nada, los del archivo de configuración. */
    const lugares = LUGARES.map(l => {
      const clave = 'lugar_' + l.archivo.replace(/^lugar_|\.jpg$/g, '');
      const g = guardadas.find(x => x.clave === clave) || {};
      return { clave, icono:l.icono, nombre: g.titulo || l.nombre, detalle: g.descripcion || l.detalle };
    });

    /* Un recuadro por salón real del colegio —inicial y primaria, los
       grados que existen de verdad— para que Soporte suba la foto de
       cada aula. La clave se deriva del nombre del grado, así que no
       hay una segunda lista que mantener. */
    const salones = GRADOS.map(g => {
      const clave = 'salon_' + aClave(g);
      const guardado = guardadas.find(x => x.clave === clave) || {};
      return {
        clave, icono:'🏫', grado:g,
        nombre: guardado.titulo || `Salón de ${g}`,
        detalle: guardado.descripcion || `${U.nivelDeGrado(g)} · ${g}`,
      };
    });

    /* Fotos libres: las que Soporte añade por su cuenta, sin límite de
       cantidad. Se guardan con clave extra_… y salen en el carrusel
       del portal junto con las demás. */
    const extras = guardadas
      .filter(f => String(f.clave || '').startsWith('extra_'))
      .map(f => ({
        clave: f.clave, icono:'📷',
        nombre: f.titulo || f.clave.replace(/^extra_/, '').replace(/_/g, ' '),
        detalle: f.descripcion || '',
      }));

    const tarjetaFoto = (clave, titulo, detalle, icono, borrable) => `
      <div class="tarjeta tarjeta-foto" data-foto="${esc(clave)}">
        <div class="marco-foto">
          ${fotos[clave]
            ? `<img src="${esc(fotos[clave])}" alt="${esc(titulo)}">`
            : `<div class="sin-foto"><span>${icono}</span><small>Sin foto todavía</small></div>`}
        </div>
        <div class="fila g8 mt12 cabeza-foto">
          <b class="crece">${esc(titulo)}</b>
          ${fotos[clave] ? UI.etiqueta('Cargada', 'e-verde') : UI.etiqueta('Pendiente', 'e-gris')}
        </div>
        <p class="t-xs t-mudo mt4 detalle-foto">${esc(detalle)}</p>
        <div class="fila g8 mt12 envolver">
          <button class="btn btn-claro btn-s crece" data-subir="${esc(clave)}">
            ${fotos[clave] ? '🔄 Cambiar foto' : '⬆️ Subir foto'}
          </button>
          <button class="btn btn-fantasma btn-s" data-editar-lugar="${esc(clave)}">✏️ Nombre</button>
          ${fotos[clave] ? `<button class="btn btn-fantasma btn-s" data-quitar="${esc(clave)}">Quitar foto</button>` : ''}
          ${borrable ? `<button class="btn btn-fantasma btn-s" data-borrar-extra="${esc(clave)}">🗑 Eliminar recuadro</button>` : ''}
        </div>
      </div>`;

    cont.innerHTML = `
      <div class="banda banda-info mb16"><span class="ic">🖼️</span>
        <div>Todo lo que subas aquí aparece <b>al instante en el portal</b> y en
        el sistema: la insignia sale en la barra, en el acceso, en los paneles y
        en el membrete de los documentos; la fachada sale en la entrada de la
        página de inicio; y las fotos de los ambientes, de los salones y las que
        añadas tú salen en el carrusel 3D de "Los lugares de la I.E.".
        Formatos: PNG, JPG o WEBP, hasta ${TOPE_IMAGEN_MB} MB.</div></div>

      <div class="tarjeta mb24">
        <div class="cabeza"><div><h3>🏛️ Insignia del colegio</h3>
          <p>Reemplaza el escudo "RPB" en todo el sistema, incluidos los reportes.</p></div></div>
        <div class="fila g16 centrado-v envolver">
          <span class="escudo escudo-g no-crece${logo ? ' con-logo' : ''}" id="previaLogo">
            ${logo ? `<img src="${esc(logo)}" alt="" class="img-contenida">` : '<span>RPB</span>'}
          </span>
          <div class="fila g8 ancho-min-220 envolver">
            <button class="btn btn-oro btn-s" data-subir="__logo">${logo ? '🔄 Cambiar insignia' : '⬆️ Subir insignia'}</button>
            ${logo ? '<button class="btn btn-fantasma btn-s" data-quitar="__logo">Volver a "RPB"</button>' : ''}
          </div>
        </div>
      </div>

      <div class="tarjeta mb24">
        <div class="cabeza"><div><h3>✍️ Sello y firma de la dirección</h3>
          <p>Se estampa en las constancias. Si no hay ninguno, el documento
             deja la línea en blanco para firmar a mano.</p></div></div>
        <div class="fila g16 centrado-v envolver">
          <div class="marco-firma">
            ${firma ? `<img src="${esc(firma)}" alt="Firma de la dirección">`
                    : '<span class="t-xs t-mudo">Sin firma cargada</span>'}
          </div>
          <div class="fila g8 ancho-min-220 envolver">
            <button class="btn btn-oro btn-s" data-subir="__firma">${firma ? '🔄 Cambiar firma' : '⬆️ Subir firma'}</button>
            ${firma ? '<button class="btn btn-fantasma btn-s" data-quitar="__firma">Quitar</button>' : ''}
          </div>
        </div>
      </div>

      <div class="tarjeta mb24">
        <div class="cabeza"><div><h3>🏫 Foto de la fachada del colegio</h3>
          <p>Es la primera cosa que ve quien entra al portal: la foto de afuera,
             con la puerta y el letrero. Mientras no la subas, la entrada muestra
             un recuadro con la dirección del colegio.</p></div></div>
        <div class="marco-foto marco-fachada">
          ${fotos.fachada
            ? `<img src="${esc(fotos.fachada)}" alt="Fachada del colegio">`
            : `<div class="sin-foto"><span>🏫</span><small>Sin foto de la fachada</small></div>`}
        </div>
        <div class="fila g8 mt12 envolver">
          <button class="btn btn-oro btn-s" data-subir="fachada">
            ${fotos.fachada ? '🔄 Cambiar la foto de la entrada' : '⬆️ Subir la foto de la entrada'}</button>
          ${fotos.fachada ? '<button class="btn btn-fantasma btn-s" data-quitar="fachada">Quitar</button>' : ''}
        </div>
        <p class="t-xs t-mudo mt8">Se ve mejor una foto horizontal, tomada de frente
          y de día (unos 1600 × 900 px).</p>
      </div>

      <h3 class="mb8">📷 Fotos de las instalaciones</h3>
      <p class="t-s t-mudo mb16">Los siete ambientes del colegio, los que se ven girando
        en la página de inicio.</p>
      <div class="rejilla rejilla-3 mb24" id="rejillaFotos">
        ${lugares.map(l => tarjetaFoto(l.clave, l.nombre, l.detalle, l.icono)).join('')}
      </div>

      <h3 class="mb8">🏫 Fotos por salón</h3>
      <p class="t-s t-mudo mb16">Un recuadro por cada aula del colegio —Inicial y
        Primaria—, para subir la foto de cada salón. Las que subas se suman al
        carrusel del portal.</p>
      <div class="rejilla rejilla-3 mb24" id="rejillaSalones">
        ${salones.map(l => tarjetaFoto(l.clave, l.nombre, l.detalle, l.icono)).join('')}
      </div>

      <div class="fila entre g12 envolver mb16">
        <div>
          <h3>➕ Otras fotos del colegio</h3>
          <p class="t-s t-mudo">Todas las que quieras: actuaciones, la biblioteca,
            el frontis por dentro, lo que haga falta. No hay número máximo.</p>
        </div>
        <button class="btn btn-oro btn-s" id="btnFotoNueva">＋ Añadir una foto</button>
      </div>
      <div class="rejilla rejilla-3" id="rejillaExtras">
        ${extras.length
          ? extras.map(l => tarjetaFoto(l.clave, l.nombre, l.detalle, l.icono, true)).join('')
          : `<p class="t-s t-mudo">Todavía no has añadido ninguna foto suelta.</p>`}
      </div>

      <input type="file" id="selectorImagen" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden>
      <div id="avisoImagen" class="mt16"></div>`;

    const selector = q('#selectorImagen', cont);
    const aviso = q('#avisoImagen', cont);
    let destino = null;

    cont.addEventListener('click', async e => {
      const subir = e.target.closest('[data-subir]');
      const quitar = e.target.closest('[data-quitar]');

      if (subir){ destino = subir.dataset.subir; selector.value = ''; selector.click(); return; }

      /* Eliminar un recuadro suelto: solo los que Soporte añadió. Los
         siete ambientes y los salones del colegio no se borran, porque
         existen de verdad; de esos se quita la foto y nada más. */
      const borrarExtra = e.target.closest('[data-borrar-extra]');
      if (borrarExtra){
        const clave = borrarExtra.dataset.borrarExtra;
        const ficha = extras.find(x => x.clave === clave);
        const ok = await UI.confirmar({
          titulo:'Eliminar el recuadro', aceptar:'Sí, eliminar', peligro:true,
          texto:`Se quitará «${ficha ? ficha.nombre : clave}» del panel y del carrusel del portal.`,
        });
        if (!ok) return;
        await Datos.imagenes.quitar(clave);
        Datos.auditar('Foto del portal eliminada', 'Configuración', { detalle: clave });
        UI.exito('Recuadro eliminado.');
        Panel.recargar('configuracion');
        return;
      }

      const editar = e.target.closest('[data-editar-lugar]');
      if (editar){
        const lugar = [...lugares, ...salones, ...extras].find(l => l.clave === editar.dataset.editarLugar);
        if (!lugar) return;
        const campos = [
          { id:'nombre', etiqueta:'Nombre del lugar', icono:'🏷️', requerido:true, ancho:'completo',
            valor:lugar.nombre,
            valida:v => U.val.largo(v, 3, 60) || 'Escribe un nombre corto y claro.' },
          { id:'detalle', etiqueta:'Descripción', tipo:'area', filas:3, ancho:'completo',
            valor:lugar.detalle,
            valida:v => U.val.largo(v, 0, 160) || 'Máximo 160 caracteres.' },
        ];
        UI.modal({
          titulo:'Editar lugar', subtitulo:'Así se verá en el carrusel del portal',
          cuerpo: UI.formulario(campos, { columnas:1 }),
          botones:[
            { texto:'Cancelar', clase:'btn-fantasma', esperando:false, accion(){} },
            { texto:'Guardar', clase:'btn-oro', esperandoTexto:'Guardando…',
              accion: async ({ zona }) => {
                const d = UI.leerFormulario(zona, campos);
                if (!UI.validarFormulario(zona, campos, d)) return false;
                await Datos.imagenes.fijar(lugar.clave, d.nombre, undefined, d.detalle);
                Datos.auditar('Nombre de una foto actualizado', 'Configuración',
                              { detalle:`${lugar.clave} → ${d.nombre}` });
                UI.exito('Listo. El portal ya muestra el nombre nuevo.');
                Panel.recargar('configuracion');
              } },
          ],
        });
        return;
      }

      if (quitar){
        const clave = quitar.dataset.quitar;
        const ok = await UI.confirmar({
          titulo: clave === '__logo' ? 'Quitar la insignia'
                : clave === '__firma' ? 'Quitar la firma'
                : clave === 'fachada' ? 'Quitar la foto de la entrada' : 'Quitar la foto',
          texto: clave === '__logo'
            ? 'El sistema volverá a mostrar el escudo "RPB" de siempre.'
            : clave === '__firma'
            ? 'Las constancias saldrán con la línea de firma en blanco.'
            : clave === 'fachada'
            ? 'La entrada del portal volverá a mostrar el recuadro con la dirección del colegio.'
            : 'El lugar volverá a mostrarse como recuadro vacío hasta que subas otra.',
          aceptar:'Sí, quitar', peligro:true,
        });
        if (!ok) return;
        if (clave === '__logo') await Datos.config.fijar('logo_url', '');
        else if (clave === '__firma') await Datos.config.fijar('firma_url', '');
        else await Datos.imagenes.quitar(clave);
        UI.exito('Listo. Vuelve a cargar el portal para verlo.');
        Panel.recargar('apariencia');
      }
    });

    selector.onchange = async () => {
      const archivo = selector.files[0];
      if (!archivo || !destino) return;
      if (archivo.size > TOPE_IMAGEN_MB * 1024 * 1024){
        aviso.innerHTML = `<div class="banda banda-mal"><span class="ic">⛔️</span>
          <div>Esa imagen pesa ${(archivo.size / 1048576).toFixed(1)} MB. El tope es ${TOPE_IMAGEN_MB} MB:
          ábrela en cualquier editor, redúcela y vuelve a intentarlo.</div></div>`;
        return;
      }
      aviso.innerHTML = `<div class="banda banda-info"><span class="ic">⏳</span><div>Guardando la imagen…</div></div>`;
      try {
        const datos = await leerArchivoComoDatos(archivo);
        if (destino === '__logo'){
          await Datos.config.fijar('logo_url', datos, 'Insignia mostrada en todo el sistema');
          U.aplicarLogo(datos);
          if (typeof Reporte !== 'undefined') Reporte.fijarLogo(datos);
        } else if (destino === '__firma'){
          await Datos.config.fijar('firma_url', datos, 'Sello y firma de la dirección para las constancias');
          if (typeof Reporte !== 'undefined') Reporte.fijarFirma(datos);
        } else if (destino === 'fachada'){
          await Datos.imagenes.fijar('fachada', 'Fachada del colegio', datos,
            `${IE.direccion_doc || IE.direccion} — la foto de la entrada, en el portal`);
        } else {
          const lugar = [...lugares, ...salones, ...extras].find(l => l.clave === destino);
          await Datos.imagenes.fijar(destino, lugar ? lugar.nombre : destino, datos,
                                     lugar ? lugar.detalle : undefined);
        }
        Datos.auditar('Imagen del sistema actualizada', 'Configuración', { detalle: destino });
        aviso.innerHTML = '';
        UI.exito('Imagen guardada. Ya se ve en el portal.');
        Panel.recargar('configuracion');
      } catch(err){
        aviso.innerHTML = `<div class="banda banda-mal"><span class="ic">⛔️</span><div>${esc(err.message)}</div></div>`;
      }
    };

    /* --- Añadir una foto nueva, sin tope de cantidad --- */
    q('#btnFotoNueva', cont).onclick = () => {
      const campos = [
        { id:'nombre', etiqueta:'¿Qué se ve en la foto?', icono:'🏷️', requerido:true, ancho:'completo',
          pista:'Ejemplo: Actuación por el aniversario',
          valida:v => U.val.largo(v, 3, 60) || 'Escribe un nombre corto y claro.' },
        { id:'detalle', etiqueta:'Descripción (opcional)', tipo:'area', filas:2, ancho:'completo',
          valida:v => U.val.largo(v, 0, 160) || 'Máximo 160 caracteres.' },
      ];
      const zonaNueva = U.crear('div');
      zonaNueva.innerHTML = `<div class="banda banda-info mb16"><span class="ic">📷</span>
        <div>Primero se crea el recuadro con su nombre; después se le sube la foto
        con el botón «Subir foto». Aparecerá en el carrusel del portal.</div></div>`;
      zonaNueva.append(UI.formulario(campos, { columnas:1 }));

      UI.modal({
        titulo:'Añadir una foto al portal', cuerpo: zonaNueva,
        botones:[
          { texto:'Cancelar', clase:'btn-fantasma', esperando:false, accion(){} },
          { texto:'Crear el recuadro', clase:'btn-oro', esperandoTexto:'Creando…',
            accion: async ({ zona }) => {
              const d = UI.leerFormulario(zona, campos);
              if (!UI.validarFormulario(zona, campos, d)) return false;
              let clave = 'extra_' + aClave(d.nombre);
              /* Si ya existe una con ese nombre, se le añade un sufijo:
                 no se sobreescribe una foto que ya está puesta. */
              if (guardadas.some(g => g.clave === clave))
                clave += '_' + Date.now().toString(36).slice(-4);
              await Datos.imagenes.fijar(clave, d.nombre, undefined, d.detalle || '');
              Datos.auditar('Recuadro de foto creado', 'Configuración', { detalle: clave });
              UI.exito('Recuadro creado. Ahora súbele la foto.');
              Panel.recargar('configuracion');
            } },
        ],
      });
    };
  }

  return { vistaTickets, vistaSalud, vistaAuditoria, vistaAccesos, vistaRespaldos, vistaApariencia };
})();
