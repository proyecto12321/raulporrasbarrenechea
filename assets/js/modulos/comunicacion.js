/* =====================================================================
   MÓDULO: COMUNICACIÓN
   ---------------------------------------------------------------------
   Indicador 3 (fluidez): mensajería interna por rol y notificaciones.
   Indicador 4 (difusión): comunicados segmentados que salen al portal
     público al instante y avisan a quien corresponde.
   ===================================================================== */
'use strict';

const ModComunicacion = (() => {
  const { q, qq, esc } = U;

  const DESTINOS = () => ([
    'Todos',
    ROLES.docente.nombre,
    ROLES.administrativo.nombre,
    ROLES.estudiante.nombre,
    ROLES.soporte.nombre,
    ...GRADOS,
  ]);

  const ETIQUETAS = ['General','Matrícula','Académico','Reunión','Actividad','Pagos','Urgente','Salud'];

  /* ==================================================================
     1. COMUNICADOS
     ================================================================== */
  async function vistaComunicados(cont, sesion){
    let todos = [], lecturas = [];

    cont.innerHTML = `
      ${UI.herramientas({
        pista:'Buscar en los comunicados…',
        filtros:[
          { id:'filtroEtiq', opciones:[{ valor:'todos', texto:'Todas las etiquetas' }, ...ETIQUETAS] },
          { id:'filtroDest', opciones:[{ valor:'todos', texto:'Todos los destinatarios' }, ...DESTINOS()] },
          { id:'filtroAutorCom', opciones:[{ valor:'todos', texto:'Publicado por cualquiera' },
              ROLES.director.nombre, ROLES.administrativo.nombre] },
          { id:'filtroEstadoCom', opciones:[
              { valor:'activos',   texto:'Publicados y borradores' },
              { valor:'Publicado', texto:'Solo publicados' },
              { valor:'Borrador',  texto:'Solo borradores' },
              { valor:'Archivado', texto:'Archivados' },
              { valor:'todos',     texto:'Todos' }] },
        ],
        acciones:`
          <button class="btn btn-marino btn-s" id="btnRepCom">📄 Reporte</button>
          <button class="btn btn-oro btn-s" id="btnNuevoCom">＋ Publicar</button>`,
      })}
      <div class="rejilla rejilla-4 mb16" id="kpiCom"></div>
      <div id="zonaCom">${UI.esqueleto(3)}</div>`;

    async function cargar(){
      const [c, l] = await Promise.all([
        Datos.comunicados.listar({}, { orden:'creado_en', columnas: Datos.adjuntos.columnas('comunicados') }),
        Datos.comunicados.listar ? Datos.repositorio('lecturas').listar({}, { limite:1000 }).catch(() => ({ filas:[] })) : { filas:[] },
      ]);
      todos = c.filas;
      lecturas = l.filas || [];
      pintar();
    }

    function filtradas(){
      const t = q('#buscador', cont).value;
      const e = q('#filtroEtiq', cont).value;
      const d = q('#filtroDest', cont).value;
      const a = q('#filtroAutorCom', cont) ? q('#filtroAutorCom', cont).value : 'todos';
      return todos.filter(c =>
        U.coincide(c, t, ['titulo','cuerpo','publicado_por']) &&
        (e === 'todos' || c.etiqueta === e) &&
        (d === 'todos' || c.dirigido_a === d) &&
        (a === 'todos' || (c.publicado_por || '').includes(`(${a})`)) &&
        (() => {
          const est = c.estado || 'Publicado';
          const f = q('#filtroEstadoCom', cont) ? q('#filtroEstadoCom', cont).value : 'activos';
          if (f === 'todos')   return true;
          if (f === 'activos') return est !== 'Archivado';
          return est === f;
        })());
    }

    function pintar(){
      const lista = filtradas();
      const urgentes = todos.filter(c => c.urgente).length;
      const publicos = todos.filter(c => c.visible_portal !== 0).length;

      q('#kpiCom', cont).innerHTML = `
        ${UI.kpi({ icono:'📣', clase:'l-oro',   valor: todos.length, rotulo:'Comunicados publicados' })}
        ${UI.kpi({ icono:'🌐', clase:'l-azul',  valor: publicos, rotulo:'Visibles en el portal' })}
        ${UI.kpi({ icono:'🔴', clase:'l-rojo',  valor: urgentes, rotulo:'Marcados urgentes' })}
        ${UI.kpi({ icono:'👁', clase:'l-verde', valor: lecturas.length, rotulo:'Lecturas registradas' })}`;

      q('#contadorRes', cont).textContent = `${lista.length} de ${todos.length}`;

      if (!lista.length){
        q('#zonaCom', cont).innerHTML = UI.sinDatos('No hay comunicados con esos filtros.', '📣');
        return;
      }

      q('#zonaCom', cont).innerHTML = `<div class="pila g12">` + lista.map(c => `
        <div class="tarjeta tarjeta-solida ${c.urgente ? 'borde-rojo' : 'borde-oro'}">
          <div class="fila entre g12 envolver">
            <div class="crece-1">
              <h3 class="titulo-tarjeta">${c.urgente ? '🔴 ' : ''}${esc(c.titulo)}</h3>
              <p class="t-s t-2 mt8 t-alto-2">${esc(c.cuerpo)}</p>
              <div class="fila g8 envolver mt12">
                ${UI.etiqueta(c.etiqueta || 'General', c.urgente ? 'e-rojo' : 'e-oro')}
                ${UI.etiqueta('🎯 ' + (c.dirigido_a || 'Todos'), 'e-azul')}
                ${(c.estado || 'Publicado') === 'Borrador'  ? UI.etiqueta('📝 Borrador', 'e-naranja') : ''}
                ${(c.estado || 'Publicado') === 'Archivado' ? UI.etiqueta('🗄️ Archivado', 'e-gris') : ''}
                ${c.visible_portal !== 0 ? UI.etiqueta('🌐 En el portal', 'e-verde') : UI.etiqueta('🔒 Solo interno', 'e-gris')}
                ${c.adjunto_datos ? UI.etiqueta('📎 Con archivo', 'e-azul') : ''}
                <span class="t-xs t-mudo">👤 ${esc(c.publicado_por || '—')} · ${esc(U.hace(c.creado_en))}</span>
              </div>
            </div>
            <div class="pila g8">
              ${(c.estado || 'Publicado') === 'Borrador'
                ? `<button class="btn btn-oro btn-s" data-publicar-com="${c.id}">🚀 Publicar</button>`
                : `<button class="btn btn-oro btn-s" data-difundir="${c.id}">📤 Difundir</button>`}
              <button class="btn btn-claro btn-s" data-editar-com="${c.id}">✏️ Editar</button>
              ${(c.estado || 'Publicado') === 'Archivado'
                ? `<button class="btn btn-fantasma btn-s" data-restaurar-com="${c.id}">↩️ Restaurar</button>`
                : `<button class="btn btn-fantasma btn-s" data-archivar-com="${c.id}">🗄️ Archivar</button>`}
            </div>
          </div>
        </div>`).join('') + '</div>';
    }

    cont.addEventListener('click', async e => {
      const ed = e.target.closest('[data-editar-com]');
      const ar = e.target.closest('[data-archivar-com]');
      const re = e.target.closest('[data-restaurar-com]');
      const pu = e.target.closest('[data-publicar-com]');
      const di = e.target.closest('[data-difundir]');
      if (di){
        const c = todos.find(x => x.id === +di.dataset.difundir);
        abrirDifusion(c);
      }
      if (ed){
        const c = todos.find(x => x.id === +ed.dataset.editarCom);
        abrirEditor(sesion, c, cargar);
      }
      /* Nada se borra: se archiva. Un comunicado archivado desaparece del
         portal y de los paneles, pero queda guardado y se puede restaurar.
         Así no se pierde el historial institucional por un clic. */
      if (ar){
        const c = todos.find(x => x.id === +ar.dataset.archivarCom);
        const ok = await UI.confirmar({
          titulo:'Archivar comunicado', aceptar:'Sí, archivar',
          texto:`"${c.titulo}" dejará de verse en el portal y en los paneles, pero no se borra: podrás restaurarlo cuando quieras.`,
        });
        if (!ok) return;
        await Datos.comunicados.actualizar(c.id, { estado:'Archivado', archivado_en:new Date().toISOString() });
        Datos.auditar('Comunicado archivado', 'Comunicación', { detalle: c.titulo });
        UI.exito('Comunicado archivado.');
        cargar();
      }
      if (re){
        const c = todos.find(x => x.id === +re.dataset.restaurarCom);
        await Datos.comunicados.actualizar(c.id, { estado:'Publicado', archivado_en:null });
        Datos.auditar('Comunicado restaurado', 'Comunicación', { detalle: c.titulo });
        UI.exito('Comunicado restaurado.');
        cargar();
      }
      if (pu){
        const c = todos.find(x => x.id === +pu.dataset.publicarCom);
        await Datos.comunicados.actualizar(c.id, { estado:'Publicado' });
        Datos.auditar('Comunicado publicado', 'Comunicación', { detalle: c.titulo });
        Datos.notificaciones.enviar('Nuevo comunicado', c.titulo, c.dirigido_a || 'Todos');
        UI.exito('Comunicado publicado.');
        cargar();
      }
    });

    q('#btnNuevoCom', cont).onclick = () => abrirEditor(sesion, null, cargar);

    q('#btnRepCom', cont).onclick = () => Reporte.listado({
      titulo:'Comunicados institucionales',
      columnas:[
        { titulo:'Fecha', valor:c => U.fechaHora(c.creado_en) },
        { titulo:'Título', campo:'titulo' },
        { titulo:'Etiqueta', campo:'etiqueta' },
        { titulo:'Dirigido a', campo:'dirigido_a' },
        { titulo:'Urgente', valor:c => c.urgente ? 'Sí' : 'No' },
        { titulo:'Publicado por', campo:'publicado_por' },
      ],
      filas: filtradas(),
      resumen:[
        { valor: filtradas().length, rotulo:'Comunicados' },
        { valor: filtradas().filter(c => c.urgente).length, rotulo:'Urgentes' },
      ],
      obligatorios:['titulo','cuerpo'],
    });

    Panel.conectarHerramientas(cont, pintar);
    await cargar();
  }

  /* ------------------------------------------------------------------
     Editor de comunicados
     ------------------------------------------------------------------ */
  function abrirEditor(sesion, comunicado, alGuardar){
    const editando = !!comunicado;
    const campos = [
      { id:'titulo', etiqueta:'Título', icono:'📌', requerido:true, ancho:'completo',
        valor: comunicado?.titulo,
        valida:v => U.val.largo(v, 5, 120) || 'Un título claro, entre 5 y 120 caracteres.' },
      { id:'cuerpo', etiqueta:'Mensaje', tipo:'area', filas:5, requerido:true, ancho:'completo',
        valor: comunicado?.cuerpo,
        valida:v => U.val.largo(v, 10, 1200) || 'Escribe el contenido del comunicado.' },
      { id:'etiqueta', etiqueta:'Etiqueta', tipo:'select', icono:'🏷️', opciones:ETIQUETAS, valor: comunicado?.etiqueta },
      { id:'dirigido_a', etiqueta:'Dirigido a', tipo:'select', icono:'🎯', opciones:DESTINOS(), valor: comunicado?.dirigido_a },
    ];

    const cuerpo = U.crear('div');
    cuerpo.append(UI.formulario(campos, { columnas:2 }));
    cuerpo.insertAdjacentHTML('beforeend', `
      <div class="tarjeta tarjeta-solida mt8">
        <div class="fila entre g12 pad-v-xs">
          <div><b class="t-s">Mostrar en el portal público</b>
            <div class="t-xs t-mudo">Lo verán los padres sin ingresar al sistema.</div></div>
          <label class="palanca"><input type="checkbox" id="vis_portal"
            ${comunicado?.visible_portal !== 0 ? 'checked' : ''}><i></i></label>
        </div>
        <hr class="linea-div">
        <div class="fila entre g12 pad-v-xs">
          <div><b class="t-s">Marcar como urgente</b>
            <div class="t-xs t-mudo">Aparece destacado en rojo y con notificación.</div></div>
          <label class="palanca"><input type="checkbox" id="es_urgente"
            ${comunicado?.urgente ? 'checked' : ''}><i></i></label>
        </div>
      </div>`);

    /* Adjunto del comunicado (imagen, PDF o documento). */
    const adjCom = (typeof ModAcademico !== 'undefined' && ModAcademico.campoAdjunto)
      ? ModAcademico.campoAdjunto('Adjuntar imagen o PDF (opcional)') : null;
    if (adjCom) cuerpo.append(adjCom.campo);

    /* Guardar sin publicar: el borrador no se ve en el portal ni en los
       paneles hasta que alguien pulse "Publicar". */
    async function guardar(zona, estado){
      const d = UI.leerFormulario(zona, campos);
      if (!UI.validarFormulario(zona, campos, d)) return false;
      const adjunto = adjCom ? await adjCom.leer() : {};
      const registro = {
        ...d, ...adjunto, estado,
        urgente: q('#es_urgente', zona).checked ? 1 : 0,
        visible_portal: q('#vis_portal', zona).checked ? 1 : 0,
        publicado_por: `${sesion.nombres} (${ROLES[sesion.rol] ? ROLES[sesion.rol].nombre : sesion.rol})`,
      };
      const t0 = performance.now();
      if (editando) await Datos.comunicados.actualizar(comunicado.id, registro);
      else          await Datos.comunicados.crear(registro);
      const ms = Math.round(performance.now() - t0);
      Datos.auditar(estado === 'Borrador' ? 'Borrador de comunicado guardado'
                    : editando ? 'Comunicado actualizado' : 'Comunicado publicado',
                    'Comunicación', { ms, detalle: d.titulo });
      if (estado === 'Publicado'){
        await Datos.notificaciones.enviar(
          (registro.urgente ? '🔴 ' : '📣 ') + d.titulo,
          String(d.cuerpo).slice(0, 140), d.dirigido_a);
      }
      UI.exito(estado === 'Borrador' ? 'Borrador guardado. No se ve hasta que lo publiques.'
               : editando ? 'Comunicado actualizado.' : `Comunicado publicado en ${U.ms(ms)}.`);
      if (alGuardar) alGuardar();
    }

    UI.modal({
      titulo: editando ? 'Editar comunicado' : 'Nuevo comunicado',
      subtitulo: editando
        ? `${comunicado.estado || 'Publicado'} · ${U.hace(comunicado.creado_en)}`
        : 'Puedes guardarlo como borrador y publicarlo después.',
      cuerpo, ancho:'ancha',
      botones:[
        { texto:'Cancelar', clase:'btn-fantasma', esperando:false, accion: () => {} },
        { texto:'💾 Guardar borrador', clase:'btn-claro', esperandoTexto:'Guardando…',
          accion: ({ zona }) => guardar(zona, 'Borrador') },
        { texto: editando ? 'Guardar y publicar' : 'Publicar ahora', clase:'btn-oro', esperandoTexto:'Publicando…',
          accion: ({ zona }) => guardar(zona, 'Publicado') },
      ],
    });
  }

  /* ==================================================================
     2. MENSAJERÍA INTERNA
     ================================================================== */
  /* A quién puede dirigir un mensaje de grupo cada rol. Un estudiante no
     puede escribirle a "todo el personal"; la dirección sí. */
  function destinosPermitidos(sesion, aulas){
    const lista = [];
    const puede = CONTACTOS[sesion.rol] || [];
    if (['director','administrativo','soporte'].includes(sesion.rol))
      lista.push({ valor:'Todo el personal', texto:'todo el personal' });
    if (puede.includes('director'))       lista.push({ valor:ROLES.director.nombre,       texto:'dirección' });
    if (puede.includes('administrativo')) lista.push({ valor:ROLES.administrativo.nombre, texto:'administración' });
    if (puede.includes('docente'))        lista.push({ valor:ROLES.docente.nombre,        texto:'docentes' });
    if (puede.includes('soporte'))        lista.push({ valor:ROLES.soporte.nombre,        texto:'soporte' });

    /* Envío a una sección entera. El docente escribe una vez y le llega
       a todos los estudiantes de esa aula; dirección y administración
       pueden hacerlo con cualquiera. Las secciones no están escritas a
       mano en ninguna parte: salen del padrón real de estudiantes. */
    if (puede.includes('estudiante') && Array.isArray(aulas)){
      aulas.forEach(a => lista.push({
        valor: etiquetaAula(a.grado, a.seccion),
        texto: `sección ${a.grado} «${a.seccion}»`,
        grupo: 'Secciones',
      }));
    }
    return lista;
  }

  /* Nombre único de una sección, tal como viaja en el campo "para" de
     un mensaje. Debe ser idéntico al que el estudiante usa al leer su
     bandeja (gruposDe), o el mensaje no le llegaría. */
  function etiquetaAula(grado, seccion){
    return `${grado} «${seccion || 'Única'}»`;
  }

  /* Los grupos por los que una persona recibe mensajes, además de su
     rol y su nombre. */
  function gruposDe(sesion){
    if (sesion.rol !== 'estudiante' || !sesion.grado) return [];
    return [sesion.grado, etiquetaAula(sesion.grado, sesion.seccion)];
  }

  /* Aulas a las que este usuario puede escribirle en bloque: las suyas
     si es docente, todas si es dirección o administración. */
  async function aulasAlcanzables(sesion){
    if (!(CONTACTOS[sesion.rol] || []).includes('estudiante')) return [];
    try {
      const { filas } = await Datos.estudiantes.listar(
        { estado:'Matriculado', anio:IE.anio }, { orden:'apellidos', asc:true, limite:1000 });
      const mias = String(sesion.grados || '').split(',').map(x => x.trim()).filter(Boolean);
      const vistas = new Map();
      filas.forEach(e => {
        if (sesion.rol === 'docente' && mias.length && !mias.includes(e.grado)) return;
        const clave = etiquetaAula(e.grado, e.seccion);
        if (!vistas.has(clave)) vistas.set(clave, { grado:e.grado, seccion:e.seccion || 'Única', cuantos:0 });
        vistas.get(clave).cuantos++;
      });
      return U.ordenarGrados([...vistas.values()], 'grado');
    } catch(e){ return []; }
  }

  async function vistaMensajes(cont, sesion){
    const rolNombre = ROLES[sesion.rol] ? ROLES[sesion.rol].nombre : sesion.rol;
    let mensajes = [];
    let bandeja = 'todos';
    let dia = 'todos';                       /* "chat de tal día" */
    const aulas = await aulasAlcanzables(sesion);

    /* "Sin leer" se resuelve con una marca por persona en su propio
       navegador (la fecha del último mensaje que ya vio). No hace falta
       una columna nueva ni escribir en la base cada vez que alguien
       abre la pantalla. */
    const llaveVisto = `rpb_msj_visto_${sesion.nombres}`;
    const vistoHasta = () => U.guardado.leer(llaveVisto, '');
    const esNuevo = m => m.autor !== sesion.nombres && String(m.creado_en || '') > String(vistoHasta() || '');

    cont.innerHTML = `
      <div class="rejilla-chat">
        <div class="tarjeta">
          <div class="cabeza">
            <h3>💬 Conversación del personal</h3>
            <span class="etiqueta e-verde"><span class="punto punto-vivo"></span> En vivo</span>
          </div>
          <div class="fila g8 envolver mb12" id="bandejas">
            <button class="btn btn-s btn-oro"   data-bandeja="todos">Todos</button>
            <button class="btn btn-s btn-claro" data-bandeja="recibidos">Recibidos</button>
            <button class="btn btn-s btn-claro" data-bandeja="enviados">Enviados</button>
            <button class="btn btn-s btn-claro" data-bandeja="nuevos">Sin leer <span class="globo-msj oculto" id="globoNuevos">0</span></button>
          </div>
          <div class="fila g8 envolver mb12 barra-dias">
            <label class="rotulo-filtro" for="selDia">🗓️ Chat del día</label>
            <select class="filtro-sel crece" id="selDia">
              <option value="todos">Todos los días</option>
            </select>
          </div>
          <div id="hilo" class="hilo-chat">${UI.esqueleto(3)}</div>
          <hr class="linea-div">
          <form id="formMsg" class="redactor">
            <div class="fila g8 envolver">
              <select class="filtro-sel" id="paraMsg">
                ${opcionesDestino(destinosPermitidos(sesion, aulas))}
              </select>
              <label class="buscador crece">
                <span>✍️</span>
                <input id="textoMsg" placeholder="Escribe tu mensaje…" maxlength="400" autocomplete="off">
              </label>
              <button class="btn btn-oro" type="submit">Enviar</button>
            </div>
            <div id="adjuntoMsg" class="mt8"></div>
          </form>
        </div>

        <div class="pila g16">
          <div class="tarjeta">
            <div class="cabeza"><h3>🔔 Avisar rápido</h3></div>
            <p class="t-s t-mudo mb12">Envía una notificación breve sin publicar un comunicado.</p>
            <div class="campo">
              <label for="notifTitulo">Título</label>
              <div class="caja"><span class="ic">📌</span><input id="notifTitulo" maxlength="90" placeholder="Reunión de docentes"></div>
            </div>
            <div class="campo">
              <label for="notifCuerpo">Detalle</label>
              <div class="caja caja-alta"><textarea id="notifCuerpo" rows="3" maxlength="240" placeholder="Hoy a las 3:00 p. m. en dirección."></textarea></div>
            </div>
            <div class="campo">
              <label for="notifPara">Dirigido a</label>
              <div class="caja"><span class="ic">🎯</span>
                <select id="notifPara">${DESTINOS().map(d => `<option>${esc(d)}</option>`).join('')}</select>
              </div>
            </div>
            <button class="btn btn-marino btn-bloque" id="btnNotif">Enviar notificación</button>
          </div>

          <div class="tarjeta">
            <div class="cabeza"><h3>📊 Actividad</h3></div>
            <div id="statsMsg"></div>
          </div>
        </div>
      </div>`;

    /* Una burbuja del chat. Los estilos viven en panel.css
       (.burbuja / .burbuja-mia / .burbuja-nueva); aquí solo van las
       clases, para no llenar el HTML de estilos en línea. */
    function burbuja(m){
      const mio = m.autor === sesion.nombres;
      const clases = ['linea-chat', mio ? 'linea-mia' : '', esNuevo(m) ? 'linea-nueva' : ''].filter(Boolean).join(' ');
      return `
        <div class="${clases}">
          ${UI.avatar(m.autor)}
          <div class="burbuja">
            <div class="burbuja-cabeza">
              <b>${esc(m.autor)}</b> · ${esc(m.rol || '')} → ${esc(m.para)} · ${esc(U.hora(m.creado_en))}
              ${esNuevo(m) ? UI.etiqueta('nuevo', 'e-oro') : ''}
            </div>
            <div class="burbuja-texto">${esc(m.texto)}</div>
            ${(m.adjunto_datos || m.adjunto_nombre) ? `<div class="mt8">${
              (typeof ModAcademico !== 'undefined' && ModAcademico.enlaceAdjunto) ? ModAcademico.enlaceAdjunto(m, 'mensajes') : ''
            }</div>` : ''}
          </div>
        </div>`;
    }

    function deLaBandeja(){
      let lista = mensajes;
      if (bandeja === 'recibidos') lista = lista.filter(m => m.autor !== sesion.nombres);
      if (bandeja === 'enviados')  lista = lista.filter(m => m.autor === sesion.nombres);
      if (bandeja === 'nuevos')    lista = lista.filter(esNuevo);
      if (dia !== 'todos')         lista = lista.filter(m => String(m.creado_en || '').slice(0,10) === dia);
      return lista;
    }

    async function cargar(){
      mensajes = await Datos.mensajes.bandeja(sesion.nombres, rolNombre, 200, gruposDe(sesion));
      /* El selector de días se rearma en cada carga: si acaba de llegar
         un mensaje de hoy, hoy tiene que aparecer en la lista. */
      pintarSelectorDias();
      pintar();
    }

    function pintarSelectorDias(){
      const sel = q('#selDia', cont);
      if (!sel) return;
      const dias = Datos.mensajes.porDia(mensajes);
      const antes = dia;
      sel.innerHTML = `<option value="todos">Todos los días (${mensajes.length} mensajes)</option>` +
        dias.map(d => `<option value="${d.fecha}">${esc(d.titulo)} · ${d.mensajes.length}</option>`).join('');
      sel.value = dias.some(d => d.fecha === antes) ? antes : 'todos';
      dia = sel.value;
    }

    function pintar(){
      const hilo = q('#hilo', cont);
      const lista = deLaBandeja();
      const nuevos = mensajes.filter(esNuevo).length;

      const globo = q('#globoNuevos', cont);
      globo.textContent = nuevos;
      globo.classList.toggle('oculto', !nuevos);

      if (!lista.length){
        hilo.innerHTML = UI.sinDatos(
          dia !== 'todos' ? 'Ese día no hubo mensajes en esta bandeja.'
          : bandeja === 'nuevos' ? 'No tienes mensajes sin leer. 🎉'
          : bandeja === 'enviados' ? 'Todavía no has enviado ningún mensaje.'
          : 'Todavía no hay mensajes. ¡Escribe el primero!', '💬');
      } else {
        /* El historial se lee por días, como en cualquier chat: cada
           jornada con su separador, de la más antigua a la de hoy. */
        hilo.innerHTML = Datos.mensajes.porDia(lista).reverse().map(d => `
          <div class="separador-dia"><span>${esc(d.titulo)}</span></div>
          ${d.mensajes.map(m => burbuja(m)).join('')}`).join('');
        hilo.scrollTop = hilo.scrollHeight;
      }

      const mios = mensajes.filter(m => m.autor === sesion.nombres).length;
      q('#statsMsg', cont).innerHTML = `
        <dl class="ficha-lista">
          <div><dt>Mensajes en la bandeja</dt><dd>${mensajes.length}</dd></div>
          <div><dt>Sin leer</dt><dd>${nuevos}</dd></div>
          <div><dt>Enviados por ti</dt><dd>${mios}</dd></div>
          <div><dt>Último movimiento</dt><dd>${mensajes[0] ? U.hace(mensajes[0].creado_en) : '—'}</dd></div>
        </dl>`;

      /* Al mirar la bandeja quedan por leídos: se guarda la fecha del
         mensaje más reciente que la persona ya tiene delante. */
      if (mensajes[0]) U.guardado.escribir(llaveVisto, mensajes[0].creado_en);
    }

    /* Adjuntos del chat rápido: foto, video, audio mp3, PDF o archivo. */
    const adjRapido = (typeof ModAcademico !== 'undefined' && ModAcademico.campoAdjunto)
      ? ModAcademico.campoAdjunto('📎 Foto, video, audio, PDF o archivo (opcional)') : null;
    if (adjRapido) q('#adjuntoMsg', cont).append(adjRapido.campo);

    q('#selDia', cont).onchange = e => { dia = e.target.value; pintar(); };

    q('#bandejas', cont).onclick = e => {
      const b = e.target.closest('[data-bandeja]');
      if (!b) return;
      bandeja = b.dataset.bandeja;
      qq('[data-bandeja]', cont).forEach(x => {
        x.classList.toggle('btn-oro', x === b);
        x.classList.toggle('btn-claro', x !== b);
      });
      pintar();
    };

    q('#formMsg', cont).onsubmit = async (ev) => {
      ev.preventDefault();
      const boton = ev.currentTarget.querySelector('button[type=submit]');
      if (boton && boton.disabled) return;          /* evita el doble envío */
      const texto = U.limpiar(q('#textoMsg', cont).value, 400);
      const adjunto = adjRapido ? await adjRapido.leer() : {};
      if (!texto && !adjunto.adjunto_datos) return;
      const destino = q('#paraMsg', cont).value;
      if (!destinosPermitidos(sesion, aulas).some(d => d.valor === destino)){
        UI.fallo('Tu rol no puede escribir a ese destinatario.');
        return;
      }
      if (boton) boton.disabled = true;
      try {
        await Datos.mensajes.crear({
          autor: sesion.nombres, rol: rolNombre,
          para: destino, texto: texto || `📎 ${adjunto.adjunto_nombre || 'archivo'}`,
          ...adjunto,
        });
        q('#textoMsg', cont).value = '';
        if (adjRapido) adjRapido.limpiar();
        Datos.auditar('Mensaje interno enviado', 'Comunicación', { detalle:`Para ${destino}` });
        await cargar();
      } catch(e){
        /* El texto NO se borra si falla: se puede reintentar sin
           volver a escribirlo. */
        UI.fallo(e.message);
      } finally {
        if (boton) boton.disabled = false;
      }
    };

    q('#btnNotif', cont).onclick = async (ev) => {
      const titulo = U.limpiar(q('#notifTitulo', cont).value, 90);
      const cuerpoTxt = U.limpiar(q('#notifCuerpo', cont).value, 240);
      if (!titulo){ UI.ojo('Escribe al menos un título.'); return; }
      ev.currentTarget.disabled = true;
      await Datos.notificaciones.enviar(titulo, cuerpoTxt, q('#notifPara', cont).value);
      Datos.auditar('Notificación enviada', 'Comunicación', { detalle: titulo });
      q('#notifTitulo', cont).value = ''; q('#notifCuerpo', cont).value = '';
      UI.exito('Notificación enviada.');
      ev.currentTarget.disabled = false;
      Panel.refrescarNotificaciones();
    };

    /* Tiempo real: los mensajes nuevos aparecen solos. */
    if (db) Datos.mensajes.escuchar(() => cargar());

    await cargar();
  }

  /* <optgroup> cuando algún destino trae "grupo" (las secciones). */
  function opcionesDestino(destinos){
    const sueltos = destinos.filter(d => !d.grupo);
    const grupos  = U.agrupar(destinos.filter(d => d.grupo), d => d.grupo);
    const opcion = d => `<option value="${esc(d.valor)}">Para: ${esc(d.texto)}</option>`;
    return sueltos.map(opcion).join('') +
      Object.entries(grupos).map(([nombre, lista]) =>
        `<optgroup label="${esc(nombre)}">${lista.map(opcion).join('')}</optgroup>`).join('');
  }

  /* ==================================================================
     REGLAS DE CONTACTO
     ------------------------------------------------------------------
     "No permitir que cualquier usuario contacte indiscriminadamente a
     cualquier persona si no corresponde". Esta es esa regla, en un solo
     lugar, y la usan tanto el directorio (para decidir a quién listar)
     como el envío (para comprobar antes de guardar).

     Dirección habla con todos. La oficina administrativa, con todos.
     Los docentes, con dirección, administración, soporte y los
     estudiantes de sus aulas. Los estudiantes, con dirección,
     administración y cualquier docente del colegio —pero no con otros
     estudiantes, que es justo lo que no debe pasar.
     ================================================================== */
  const CONTACTOS = {
    director:       ['director','administrativo','docente','soporte','estudiante'],
    administrativo: ['director','administrativo','docente','soporte','estudiante'],
    docente:        ['director','administrativo','soporte','estudiante'],
    soporte:        ['director','administrativo','docente','soporte'],
    estudiante:     ['director','administrativo','docente'],
  };

  function puedeEscribirA(sesion, destino){
    const permitidos = CONTACTOS[sesion.rol] || [];
    if (!permitidos.includes(destino.rol)) return false;
    /* Docente ↔ estudiante: solo dentro de sus propias aulas. */
    if (sesion.rol === 'docente' && destino.rol === 'estudiante'){
      const mias = String(sesion.grados || '').split(',').map(x => x.trim()).filter(Boolean);
      return !mias.length || mias.includes(destino.grado);
    }
    /* Estudiante → docente: puede escribirle a cualquier docente del
       colegio, no solo a las de su grado. En un colegio de dos niveles
       la profesora de computación o la de comunicación atiende a todas
       las aulas, y un estudiante tiene que poder preguntarle. */
    return true;
  }

  /* ==================================================================
     2 bis. DIRECTORIO — buscar y escribirle a una persona en concreto
     ------------------------------------------------------------------
     Indicador 1 ("acceso rápido por nombre, DNI o código") aplicado a
     la mensajería: en vez de solo mandar a un rol entero (como hace
     vistaMensajes), aquí se busca a una persona exacta —de personal,
     de docencia o del alumnado— y se le escribe directo. El mensaje
     llega a su bandeja porque Datos.mensajes.bandeja ya hace coincidir
     "para" con el nombre exacto del destinatario, aparte de con su rol.
     ================================================================== */
  async function vistaDirectorio(cont, sesion){
    /* Solo se ofrecen las pestañas que ese rol puede usar de verdad. Un
       estudiante no ve "Estudiantes" —no puede escribirles— en vez de
       ver una pestaña que se abre vacía. */
    const puede = CONTACTOS[sesion.rol] || [];
    const categorias = [
      { id:'personal',   icono:'👔',  texto:'Personal',
        visible: puede.some(r => ['director','administrativo','soporte'].includes(r)) },
      { id:'docente',    icono:'🧑‍🏫', texto:'Docentes',    visible: puede.includes('docente') },
      { id:'estudiante', icono:'🎒',  texto:'Estudiantes', visible: puede.includes('estudiante') },
    ].filter(c => c.visible);

    if (!categorias.length){
      cont.innerHTML = UI.sinDatos('Tu rol no tiene a quién escribirle desde el directorio.', '🔒');
      return;
    }

    let categoria = categorias[0].id;

    cont.innerHTML = `
      ${UI.herramientas({ pista:'Buscar por nombre, DNI o código…' })}
      <div class="fila g8 mb16 envolver" id="pestanasDir">
        ${categorias.map((c, i) => `<button class="btn btn-s ${i === 0 ? 'btn-oro' : 'btn-claro'}"
            data-cat="${c.id}">${c.icono} ${esc(c.texto)}</button>`).join('')}
      </div>
      <div class="fila g8 mb16 envolver oculto" id="zonaSecciones">
        <label class="rotulo-filtro" for="filtroSeccion">🏫 Sección</label>
        <select class="filtro-sel" id="filtroSeccion"><option value="todas">Todas las secciones</option></select>
        <button class="btn btn-marino btn-s" id="btnSeccionEntera">📣 Escribir a toda la sección</button>
      </div>
      <div id="listaDirectorio">${UI.esqueleto(4)}</div>`;

    async function traer(){
      if (categoria === 'estudiante'){
        const { filas } = await Datos.estudiantes.listar({ estado:'Matriculado', anio:IE.anio }, { orden:'apellidos', asc:true });
        return filas
          .map(e => ({
            id:`est_${e.id}`, nombre:`${e.nombres} ${e.apellidos}`, dni:e.dni, codigo:e.codigo,
            rol:'estudiante', grado:e.grado, seccion:e.seccion || 'Única',
            detalle:`${e.grado} «${e.seccion || 'Única'}»`, icono:'🎒',
          }))
          .filter(p => puedeEscribirA(sesion, p));
      }
      const filtroRol = categoria === 'docente' ? 'docente'
        : ['director','administrativo','soporte'];
      const { filas } = await Datos.usuarios.listar({ rol: filtroRol }, { orden:'nombres', asc:true });
      return filas
        .map(u => ({
          id:`per_${u.id}`, nombre:u.nombres, dni:u.dni, codigo:u.usuario,
          rol:u.rol, grados_asignados:u.grados_asignados,
          detalle: ROLES[u.rol] ? ROLES[u.rol].nombre : u.rol, icono: u.rol === 'docente' ? '🧑‍🏫' : '👔',
        }))
        .filter(p => p.nombre !== sesion.nombres && puedeEscribirA(sesion, p));
    }

    let personas = await traer();
    const aulas = await aulasAlcanzables(sesion);

    /* Filtro por sección: el docente que quiere hablarle a un aula
       entera no tiene que ir estudiante por estudiante. */
    function pintarSecciones(){
      const zona = q('#zonaSecciones', cont);
      const hay = categoria === 'estudiante' && aulas.length > 0;
      zona.classList.toggle('oculto', !hay);
      if (!hay) return;
      const sel = q('#filtroSeccion', cont);
      const antes = sel.value;
      sel.innerHTML = `<option value="todas">Todas las secciones</option>` +
        aulas.map(a => `<option value="${esc(ModComunicacion.etiquetaAula(a.grado, a.seccion))}"
            data-grado="${esc(a.grado)}" data-seccion="${esc(a.seccion)}"
          >${esc(a.grado)} «${esc(a.seccion)}» · ${a.cuantos} estudiantes</option>`).join('');
      if ([...sel.options].some(o => o.value === antes)) sel.value = antes;
      sel.onchange = pintar;
    }

    function pintar(){
      const t = U.sinTildes((q('#buscador', cont) || {}).value || '');
      const sel = q('#filtroSeccion', cont);
      const seccionElegida = (categoria === 'estudiante' && sel && !q('#zonaSecciones', cont).classList.contains('oculto'))
        ? sel.value : 'todas';
      const filtradas = personas
        .filter(p => seccionElegida === 'todas' || etiquetaAula(p.grado, p.seccion) === seccionElegida)
        .filter(p =>
          !t || U.sinTildes(p.nombre).includes(t) || (p.dni || '').includes(t) || (p.codigo || '').toLowerCase().includes(t));
      q('#listaDirectorio', cont).innerHTML = filtradas.length ? `
        <div class="rejilla rejilla-3">
          ${filtradas.map(p => `
            <div class="tarjeta">
              <div class="fila g12 centrado-v">
                <span class="loseta l-marino">${p.icono}</span>
                <div class="crece">
                  <b>${esc(p.nombre)}</b>
                  <small class="t-mudo">${esc(p.detalle)} ${p.dni ? '· DNI ' + esc(ModDireccion.dni(p.dni, sesion)) : ''}</small>
                </div>
              </div>
              <button class="btn btn-claro btn-s btn-bloque mt12" data-msj="${esc(p.nombre)}">✉️ Mandar mensaje</button>
            </div>`).join('')}
        </div>` : `<p class="t-mudo">Nadie coincide con esa búsqueda.</p>`;
    }
    pintar();
    pintarSecciones();
    q('#buscador', cont).oninput = pintar;

    q('#pestanasDir', cont).onclick = async e => {
      const btn = e.target.closest('[data-cat]');
      if (!btn) return;
      categoria = btn.dataset.cat;
      qq('[data-cat]', cont).forEach(b => b.classList.toggle('btn-oro', b === btn) || b.classList.toggle('btn-claro', b !== btn));
      q('#listaDirectorio', cont).innerHTML = UI.esqueleto(4);
      personas = await traer();
      pintarSecciones();
      pintar();
    };

    /* Un solo mensaje para toda una sección. Lo reciben todos los
       estudiantes de esa aula porque su bandeja también escucha por el
       nombre de su sección (gruposDe). */
    q('#btnSeccionEntera', cont).onclick = () => {
      const sel = q('#filtroSeccion', cont);
      if (!sel || sel.value === 'todas'){
        UI.ojo('Primero elige la sección a la que quieres escribirle.');
        return;
      }
      const cuantos = personas.filter(p => etiquetaAula(p.grado, p.seccion) === sel.value).length;
      abrirRedaccion(sesion, sel.value, {
        titulo:`Escribir a ${sel.value}`,
        subtitulo:`El mensaje les llegará a los ${cuantos} estudiantes de esa sección.`,
      });
    };

    cont.addEventListener('click', e => {
      const btn = e.target.closest('[data-msj]');
      if (!btn) return;
      const destino = btn.dataset.msj;
      const ficha = personas.find(p => p.nombre === destino);
      if (ficha && !puedeEscribirA(sesion, ficha)){
        UI.fallo('Tu rol no puede escribirle a esa persona.');
        return;
      }
      abrirRedaccion(sesion, destino);
    });
  }

  /* ------------------------------------------------------------------
     Redactar un mensaje a una persona o a una sección entera.
     ------------------------------------------------------------------ */
  function abrirRedaccion(sesion, destino, opciones = {}){
    const campos = [
      { id:'texto', etiqueta:`Mensaje para ${destino}`, tipo:'area', filas:4, ancho:'completo', requerido:true,
        valida:v => U.val.largo(v, 2, 400) || 'Escribe el mensaje (hasta 400 caracteres).' },
    ];
    const cuerpoMsj = U.crear('div');
    cuerpoMsj.append(UI.formulario(campos, { columnas:1 }));
    const adj = (typeof ModAcademico !== 'undefined' && ModAcademico.campoAdjunto)
      ? ModAcademico.campoAdjunto('📎 Foto, video, audio MP3, PDF o archivo (opcional)') : null;
    if (adj) cuerpoMsj.append(adj.campo);

    UI.modal({
      titulo: opciones.titulo || `Escribir a ${destino}`,
      subtitulo: opciones.subtitulo,
      cuerpo: cuerpoMsj,
      botones:[
        { texto:'Cancelar', clase:'btn-fantasma', esperando:false, accion(){} },
        { texto:'Enviar', clase:'btn-oro', esperandoTexto:'Enviando…',
          accion: async ({ zona }) => {
            const datos = UI.leerFormulario(zona, campos);
            if (!UI.validarFormulario(zona, campos, datos)) return false;
            const adjunto = adj ? await adj.leer() : {};
            await Datos.mensajes.crear({
              autor: sesion.nombres, rol: ROLES[sesion.rol] ? ROLES[sesion.rol].nombre : sesion.rol,
              para: destino, texto: datos.texto, ...adjunto,
            });
            Datos.notificaciones.enviar(`Mensaje de ${sesion.nombres}`, datos.texto.slice(0, 80), destino);
            Datos.auditar(`Mensaje directo a ${destino}`, 'Comunicación');
            UI.exito(`Mensaje enviado a ${destino}.`);
          } },
      ],
    });
  }

  /* ==================================================================
     3. COMUNICADOS EN MODO LECTURA (estudiante)
     ================================================================== */
  async function vistaLectura(cont, sesion){
    cont.innerHTML = UI.cargando();
    try {
      const lista = await Datos.comunicados.para(sesion.rol, sesion.grado, 30);
      if (!lista.length){
        cont.innerHTML = UI.sinDatos('No hay comunicados para ti por ahora.', '📣');
        return;
      }
      cont.innerHTML = `<div class="pila g12">` + lista.map(c => `
        <div class="tarjeta tarjeta-solida ${c.urgente ? 'borde-rojo' : 'borde-oro'}">
          <h3 class="titulo-tarjeta">${c.urgente ? '🔴 ' : ''}${esc(c.titulo)}</h3>
          <p class="t-s t-2 mt8 t-alto-3">${esc(c.cuerpo)}</p>
          <div class="fila g8 envolver mt12">
            ${UI.etiqueta(c.etiqueta || 'General', c.urgente ? 'e-rojo' : 'e-oro')}
            <span class="t-xs t-mudo">${esc(c.publicado_por || 'Dirección')} · ${esc(U.hace(c.creado_en))}</span>
          </div>
        </div>`).join('') + '</div>';

      /* Registra la lectura (indicador 4: medición de la difusión). */
      if (db) db.from('lecturas').insert({
        comunicado: lista[0].titulo,
        usuario: sesion.nombres,
        visitante: ROLES[sesion.rol] ? ROLES[sesion.rol].nombre : sesion.rol,
        dispositivo: /Mobi|Android/i.test(navigator.userAgent) ? 'Móvil' : 'Escritorio',
      }).then(() => {}, () => {});

    } catch(e){
      cont.innerHTML = `<div class="banda banda-mal"><span class="ic">⛔️</span><div>${esc(e.message)}</div></div>`;
    }
  }

  /* ------------------------------------------------------------------
     Difusión de un comunicado  (indicador 4)
     ------------------------------------------------------------------
     El sistema vive en GitHub Pages, sin servidor propio, así que no
     puede enviar correos por su cuenta ni registrar suscripciones push
     con clave VAPID. Lo que sí puede —y es lo que las familias usan de
     verdad en Sunampe— es preparar el envío y entregárselo al cliente de
     correo o a WhatsApp ya escrito, y avisar en el navegador a quien
     tenga el sistema abierto.
     ------------------------------------------------------------------ */
  function textoPlano(c){
    return `${c.urgente ? '🔴 URGENTE — ' : ''}${c.titulo}\n\n${c.cuerpo}\n\n` +
           `${IE.nombre}\n${IE.direccion} · ${IE.telefono}`;
  }

  async function correosDestino(c){
    /* Se toman los correos de los apoderados del público al que va
       dirigido: un grado concreto o todo el padrón. */
    const esGrado = GRADOS.includes(c.dirigido_a);
    const { filas } = await Datos.estudiantes.listar(
      { estado:'Matriculado', ...(esGrado ? { grado:c.dirigido_a } : {}) },
      { columnas:'correo_apoderado,grado,estado' });
    return [...new Set(filas.map(e => (e.correo_apoderado || '').trim()).filter(x => x.includes('@')))];
  }

  function abrirDifusion(c){
    const cuerpo = document.createElement('div');
    cuerpo.className = 'pila g12';
    cuerpo.innerHTML = `
      <div class="aviso-caja">
        <b>${esc(c.titulo)}</b>
        <p class="t-s t-2 mt8 t-alto-2">${esc(c.cuerpo)}</p>
        <p class="t-xs t-mudo mt8">Dirigido a: ${esc(c.dirigido_a || 'Todos')}</p>
      </div>
      <div class="pila g8">
        <button class="btn btn-oro btn-bloque" id="difWhats">💬 Compartir por WhatsApp</button>
        <button class="btn btn-claro btn-bloque" id="difCorreo">✉️ Enviar por correo a los apoderados</button>
        <button class="btn btn-claro btn-bloque" id="difAviso">🔔 Avisar en este navegador</button>
        <button class="btn btn-fantasma btn-bloque" id="difCopiar">📋 Copiar el texto</button>
      </div>
      <p class="t-xs t-mudo t-c" id="difPista">
        El correo se abre en tu aplicación de correo con los destinatarios en copia oculta.
      </p>`;

    const m = UI.modal({
      titulo:'Difundir el comunicado',
      subtitulo:'Elige por dónde quieres hacerlo llegar',
      cuerpo,
      botones:[{ texto:'Cerrar', clase:'btn-fantasma', esperando:false, accion: () => {} }],
    });

    const pista = m.zona.querySelector('#difPista');
    const texto = textoPlano(c);

    m.zona.querySelector('#difWhats').onclick = () => {
      open('https://wa.me/?text=' + encodeURIComponent(texto), '_blank', 'noopener');
      Datos.auditar('Comunicado difundido por WhatsApp', 'Comunicación', { detalle:c.titulo });
    };

    m.zona.querySelector('#difCorreo').onclick = async (ev) => {
      const b = ev.currentTarget;
      b.disabled = true; b.textContent = 'Buscando correos…';
      try {
        const correos = await correosDestino(c);
        if (!correos.length){
          pista.textContent = 'Ningún apoderado de ese grupo tiene correo registrado. ' +
                              'Se puede agregar en la ficha de cada estudiante.';
          return;
        }
        const url = `mailto:${encodeURIComponent(IE.correo)}` +
          `?bcc=${encodeURIComponent(correos.join(','))}` +
          `&subject=${encodeURIComponent((c.urgente ? '[URGENTE] ' : '') + c.titulo)}` +
          `&body=${encodeURIComponent(texto)}`;
        location.href = url;
        pista.textContent = `Se abrió tu aplicación de correo con ${correos.length} destinatario(s) en copia oculta.`;
        Datos.auditar('Comunicado enviado por correo', 'Comunicación',
          { detalle:`${c.titulo} · ${correos.length} destinatarios` });
      } finally {
        b.disabled = false; b.textContent = '✉️ Enviar por correo a los apoderados';
      }
    };

    m.zona.querySelector('#difAviso').onclick = async () => {
      if (!('Notification' in window)){
        pista.textContent = 'Este navegador no admite avisos del sistema.';
        return;
      }
      const permiso = Notification.permission === 'granted'
        ? 'granted'
        : await Notification.requestPermission();
      if (permiso !== 'granted'){
        pista.textContent = 'El navegador no dio permiso para mostrar avisos.';
        return;
      }
      new Notification(`${c.urgente ? '🔴 ' : '📣 '}${IE.nombre_corto}`, {
        body: `${c.titulo}\n${c.cuerpo.slice(0, 120)}`,
        tag: 'rpb-com-' + c.id,
      });
      pista.textContent = 'Aviso mostrado. Quien tenga el sistema abierto verá los nuevos comunicados así.';
    };

    m.zona.querySelector('#difCopiar').onclick = async () => {
      try {
        await navigator.clipboard.writeText(texto);
        pista.textContent = 'Texto copiado: ya puedes pegarlo donde quieras.';
      } catch(e){
        pista.textContent = 'El navegador no permitió copiar. Selecciona el texto de arriba a mano.';
      }
    };
  }

  /* Aviso del navegador cuando entra un comunicado urgente y el usuario
     tiene el sistema abierto. Se pide el permiso una sola vez, y solo
     después de que alguien lo haya usado desde "Difundir". */
  function avisarEnNavegador(c){
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    new Notification(`${c.urgente ? '🔴 ' : '📣 '}${IE.nombre_corto}`, {
      body: `${c.titulo}\n${String(c.cuerpo || '').slice(0, 120)}`,
      tag: 'rpb-com-' + c.id,
    });
  }

  return { vistaComunicados, vistaMensajes, vistaDirectorio, vistaLectura, abrirEditor,
           abrirDifusion, avisarEnNavegador, puedeEscribirA, CONTACTOS,
           etiquetaAula, gruposDe, aulasAlcanzables, destinosPermitidos, abrirRedaccion };
})();
