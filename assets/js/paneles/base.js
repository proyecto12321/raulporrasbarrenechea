/* =====================================================================
   BASE DE LOS PANELES
   ---------------------------------------------------------------------
   Todo lo que los cinco paneles hacen igual: comprobar la sesión, armar
   el armazón, registrar las vistas, navegar por el menú, refrescar las
   notificaciones y obligar al cambio de contraseña en el primer ingreso.
   ===================================================================== */
'use strict';

const Panel = (() => {
  const { q } = U;

  let sesion = null;
  const vistas = new Map();      // id → { cargar(cont), titulo, descripcion }
  let vistaActiva = null;

  /* ------------------------------------------------------------------
     Arranque
     ------------------------------------------------------------------ */
  function iniciar({ roles, menu, tituloPanel, definirVistas, inicial }){
    sesion = Sesion.exigir(roles);
    if (!sesion) return null;

    UI.armarPanel({ sesion, menu, tituloPanel });
    Datos.config.obtener('logo_url').then(url => {
      U.aplicarLogo(url);
      if (typeof Reporte !== 'undefined') Reporte.fijarLogo(url);
    }).catch(() => {});
    Datos.config.obtener('firma_url').then(url => {
      if (typeof Reporte !== 'undefined') Reporte.fijarFirma(url);
    }).catch(() => {});

    definirVistas(sesion);

    /* Enlaza el menú lateral. */
    U.qq('.lateral nav a').forEach(a => {
      a.onclick = e => { e.preventDefault(); ir(a.dataset.vista); };
    });

    /* Navegación por # en la barra de direcciones. La dirección tiene la
       forma #modulo:seccion, así que se separa el módulo (lo que el menú
       conoce) de la sección (que resuelve el propio módulo). */
    const moduloDe = h => h.replace('#', '').split(':')[0];
    addEventListener('hashchange', () => {
      const id = moduloDe(location.hash);
      if (id && vistas.has(id) && id !== vistaActiva) ir(id);
    });

    const primera = moduloDe(location.hash);
    ir(vistas.has(primera) ? primera : inicial);

    refrescarNotificaciones();
    setInterval(refrescarNotificaciones, 60000);
    escucharNotificaciones();

    if (sessionStorage.getItem('rpb_pedir_cambio') === '1'){
      sessionStorage.removeItem('rpb_pedir_cambio');
      setTimeout(pedirCambioDeClave, 900);
    }

    return sesion;
  }

  /* ------------------------------------------------------------------
     Registro y cambio de vistas
     ------------------------------------------------------------------ */
  function registrar(id, { titulo, descripcion, acciones, cargar }){
    const cont = UI.crearVista(id, { titulo, descripcion, acciones });
    vistas.set(id, { cargar, titulo, descripcion, cont, cargada:false });
    return cont;
  }

  async function ir(id){
    if (!vistas.has(id)) id = vistas.keys().next().value;
    const v = vistas.get(id);
    vistaActiva = id;
    UI.irAVista(id, { titulo: v.titulo, subtitulo: v.descripcion });

    if (!v.cargada){
      v.cont.innerHTML = UI.cargando();
      try {
        await v.cargar(v.cont, sesion);
        v.cargada = true;
      } catch(e){
        console.error(e);
        v.cont.innerHTML = `<div class="banda banda-mal"><span class="ic">⛔️</span>
          <div><b>No se pudo cargar esta sección.</b><br>${U.esc(e.message)}</div></div>`;
      }
    }
  }

  /* Vuelve a ejecutar el cargador de una vista (tras guardar algo).

     Ojo: desde que los módulos tienen secciones, muchas pantallas piden
     recargarse por el nombre que tenían cuando eran vistas sueltas
     ("evaluacion", "apariencia", "tareas"…). Si ese nombre ya no es una
     vista del menú, se recarga la sección que está abierta, que es lo
     que la pantalla realmente quería. */
  async function recargar(id){
    const v = vistas.get(id || vistaActiva);
    if (!v){ if (recargarSeccionActiva) await recargarSeccionActiva(); return; }
    v.cargada = false;
    if ((id || vistaActiva) === vistaActiva) await ir(id || vistaActiva);
  }

  /* ------------------------------------------------------------------
     Módulos con secciones internas (pestañas)
     ------------------------------------------------------------------
     El menú lateral quedó en seis módulos. Para que "Matrícula y
     comunicados" o "Comunidad y mensajería" no sean un cajón revuelto,
     cada módulo se arma con pestañas y cada pestaña monta la MISMA
     función de vista que ya existía antes. No se duplica ni una línea
     de lógica: solo cambia dónde vive.

     Cada sección se carga la primera vez que se abre (no todas de
     golpe), recuerda cuál estaba abierta en la dirección (#modulo:seccion)
     y se puede recargar sola sin tocar las demás.
     ------------------------------------------------------------------ */
  let recargarSeccionActiva = null;

  function secciones(cont, modulo, lista){
    const utiles = lista.filter(Boolean);
    if (!utiles.length){ cont.innerHTML = UI.sinDatos('No tienes secciones disponibles aquí.', '🔒'); return; }

    cont.innerHTML = `
      <div class="pestanas-modulo" role="tablist">
        ${utiles.map((s, i) => `
          <button class="pestana ${i === 0 ? 'activa' : ''}" role="tab" data-seccion="${U.esc(s.id)}"
                  aria-selected="${i === 0}">
            <span class="ic">${s.icono || ''}</span>${U.esc(s.titulo)}
          </button>`).join('')}
      </div>
      <div class="cuerpo-modulo">
        ${utiles.map((s, i) => `<div class="seccion-modulo ${i === 0 ? '' : 'oculto'}" data-panel="${U.esc(s.id)}"></div>`).join('')}
      </div>`;

    const montadas = new Set();

    async function abrir(id, forzar){
      const s = utiles.find(x => x.id === id) || utiles[0];
      U.qq('[data-seccion]', cont).forEach(b => {
        const on = b.dataset.seccion === s.id;
        b.classList.toggle('activa', on);
        b.setAttribute('aria-selected', on);
      });
      U.qq('[data-panel]', cont).forEach(p => p.classList.toggle('oculto', p.dataset.panel !== s.id));

      const zona = U.q(`[data-panel="${s.id}"]`, cont);
      recargarSeccionActiva = () => abrir(s.id, true);
      if (montadas.has(s.id) && !forzar) return;
      montadas.add(s.id);
      zona.innerHTML = UI.cargando();
      try { await s.cargar(zona, sesion); }
      catch(e){
        console.error(e);
        zona.innerHTML = `<div class="banda banda-mal"><span class="ic">⛔️</span>
          <div><b>No se pudo cargar esta sección.</b><br>${U.esc(e.message)}</div></div>`;
      }
      /* La sección abierta queda en la dirección para poder volver a
         ella (y para que "Accesos rápidos" pueda apuntar aquí). */
      if (location.hash !== `#${modulo}:${s.id}`) history.replaceState(null, '', `#${modulo}:${s.id}`);
    }

    U.q('.pestanas-modulo', cont).onclick = e => {
      const b = e.target.closest('[data-seccion]');
      if (b) abrir(b.dataset.seccion);
    };

    /* Permite que otra pantalla mande abrir una sección concreta. */
    cont.abrirSeccion = abrir;
    const pedida = (location.hash.split(':')[1] || '').trim();
    abrir(utiles.some(s => s.id === pedida) ? pedida : utiles[0].id);
  }

  /* Atajo para los accesos rápidos del inicio: lleva al módulo y a la
     sección exacta (por ejemplo, Reportes → Constancias). */
  async function irASeccion(modulo, seccion){
    await ir(modulo);
    const v = vistas.get(modulo);
    if (v && v.cont && typeof v.cont.abrirSeccion === 'function') v.cont.abrirSeccion(seccion);
  }

  /* ------------------------------------------------------------------
     Notificaciones
     ------------------------------------------------------------------ */
  async function refrescarNotificaciones(){
    try {
      const rol = ROLES[sesion.rol] ? ROLES[sesion.rol].nombre : sesion.rol;
      const lista = await Datos.notificaciones.mias(rol, 12, sesion.nombres);
      UI.pintarNotificaciones(lista);
    } catch {}
  }

  function escucharNotificaciones(){
    if (!db) return;
    Datos.notificaciones.escuchar(carga => {
      refrescarNotificaciones();
      if (carga.eventType === 'INSERT' && carga.new){
        const rol = ROLES[sesion.rol] ? ROLES[sesion.rol].nombre : sesion.rol;
        if (['Todos', rol, sesion.nombres].includes(carga.new.dirigido_a))
          UI.aviso(carga.new.titulo, 'info', 6);
      }
    });

    /* Difusión (indicador 4): si el usuario ya autorizó los avisos del
       navegador, un comunicado nuevo se los muestra aunque tenga el
       sistema en otra pestaña. Si nunca lo autorizó, no se le pregunta
       aquí: el permiso se pide desde "Difundir", con contexto. */
    Datos.comunicados.escuchar(carga => {
      if (carga.eventType !== 'INSERT' || !carga.new) return;
      const c = carga.new;
      const rol = ROLES[sesion.rol] ? ROLES[sesion.rol].nombre : sesion.rol;
      if (!['Todos', rol, sesion.grado].includes(c.dirigido_a)) return;
      UI.aviso(`📣 ${c.titulo}`, c.urgente ? 'alerta' : 'info', 7);
      if (typeof ModComunicacion !== 'undefined' && document.hidden) ModComunicacion.avisarEnNavegador(c);
    });
  }

  /* ------------------------------------------------------------------
     Cambio de contraseña obligatorio (primer ingreso)
     ------------------------------------------------------------------ */
  function pedirCambioDeClave(){
    const campos = [
      { id:'actual', etiqueta:'Contraseña actual', tipo:'password', icono:'🔒', requerido:true, ancho:'completo' },
      { id:'nueva',  etiqueta:'Nueva contraseña', tipo:'password', icono:'🔑', requerido:true, ancho:'completo',
        ayuda:`Mínimo ${SEGURIDAD.largo_minimo_clave} caracteres, con mayúsculas, minúsculas y números.`,
        valida:v => v.length >= SEGURIDAD.largo_minimo_clave || `Debe tener al menos ${SEGURIDAD.largo_minimo_clave} caracteres.` },
      { id:'repite', etiqueta:'Repite la nueva contraseña', tipo:'password', icono:'🔑', requerido:true, ancho:'completo' },
    ];
    const cuerpo = U.crear('div');
    cuerpo.innerHTML = `<div class="banda banda-ojo mb16"><span class="ic">🔐</span>
      <div>Por seguridad, cambia la contraseña que te entregó la institución
      antes de seguir usando el sistema.</div></div>`;
    cuerpo.append(UI.formulario(campos, { columnas:1 }));

    UI.modal({
      titulo:'Cambia tu contraseña',
      subtitulo:'Solo tú debes conocerla.',
      cuerpo,
      botones:[
        { texto:'Ahora no', clase:'btn-fantasma', esperando:false, accion: () => {} },
        { texto:'Guardar', clase:'btn-marino', esperandoTexto:'Guardando…',
          accion: async ({ zona }) => {
            const d = UI.leerFormulario(zona, campos);
            if (!UI.validarFormulario(zona, campos, d)) return false;
            if (d.nueva !== d.repite){
              UI.marcarCampo(zona, 'repite', 'Las contraseñas no coinciden.');
              return false;
            }
            const r = await Sesion.cambiarClave(d.actual, d.nueva);
            if (!r.ok){ UI.marcarCampo(zona, 'actual', r.mensaje); return false; }
            UI.exito('Contraseña actualizada.');
          } },
      ],
    });
  }

  /* Disponible desde cualquier panel (botón "Mi cuenta"). */
  function cambiarMiClave(){ pedirCambioDeClave(); }

  /* ------------------------------------------------------------------
     Ayudantes comunes a varios paneles
     ------------------------------------------------------------------ */

  /* Cabecera de bienvenida con el saludo según la hora. */
  function bienvenida(extra = ''){
    const h = new Date().getHours();
    const saludo = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
    const nombre = String(sesion.nombres).split(' ')[0];
    return `
      <div class="tarjeta mb16 panel-saludo">
        <div class="fila g16 envolver entre">
          <div class="fila g16">
            ${UI.avatar(sesion.nombres, sesion.rol === 'estudiante')}
            <div>
              <h3 class="t-xl">${saludo}, ${U.esc(nombre)}</h3>
              <p class="t-s t-mudo">${U.esc(sesion.cargo || '')} · ${U.esc(IE.nombre)} · Año ${IE.anio}</p>
            </div>
          </div>
          <div>${extra}</div>
        </div>
      </div>`;
  }

  /* Buscador + filtros conectados a una función que repinta la lista. */
  function conectarHerramientas(cont, alBuscar){
    const buscador = q('#buscador', cont);
    const limpiar  = q('#limpiarBusq', cont);
    if (buscador){
      const lanzar = U.retardar(() => {
        limpiar.classList.toggle('ver', !!buscador.value);
        alBuscar();
      }, 240);
      buscador.addEventListener('input', lanzar);
      limpiar.onclick = () => { buscador.value = ''; limpiar.classList.remove('ver'); alBuscar(); };
    }
    U.qq('.filtro-sel', cont).forEach(f => f.addEventListener('change', alBuscar));

    /* Rango de fechas, cuando la vista lo pide (UI.herramientas + fechas). */
    const desde = q('#fDesde', cont), hasta = q('#fHasta', cont);
    const quitar = q('#limpiarFechas', cont);
    if (desde && hasta){
      const marcar = () => {
        const hay = !!(desde.value || hasta.value);
        if (quitar) quitar.classList.toggle('ver', hay);
        /* Un rango al revés no devuelve nada: se corrige solo. */
        if (desde.value && hasta.value && desde.value > hasta.value){
          const t = desde.value; desde.value = hasta.value; hasta.value = t;
        }
        alBuscar();
      };
      desde.addEventListener('change', marcar);
      hasta.addEventListener('change', marcar);
      if (quitar) quitar.onclick = () => { desde.value = ''; hasta.value = ''; marcar(); };
    }
  }

  return { iniciar, registrar, ir, recargar, secciones, irASeccion,
           bienvenida, conectarHerramientas,
           cambiarMiClave, refrescarNotificaciones,
           get sesion(){ return sesion; } };
})();
