/* =====================================================================
   COMPONENTES DE INTERFAZ
   ---------------------------------------------------------------------
   Piezas reutilizables: avisos, modales, confirmaciones, formularios,
   tablas con paginación, gráficos sencillos y el armazón de los paneles.
   Todo escapa el texto antes de pintarlo (ver U.esc).
   ===================================================================== */
'use strict';

const UI = (() => {

  const { q, qq, crear, esc } = U;

  /* ==================================================================
     1. AVISOS FLOTANTES
     ================================================================== */
  function contenedorAvisos(){
    let c = q('#avisos');
    if (!c){ c = crear('div', { id:'avisos' }); document.body.append(c); }
    return c;
  }

  const ICONOS = { ok:'✅', error:'⛔️', info:'ℹ️', alerta:'⚠️' };

  function aviso(mensaje, tipo = 'ok', segundos = 4){
    const el = crear('div', { clase:`aviso ${tipo}` },
      crear('span', { clase:'ic', texto: ICONOS[tipo] || 'ℹ️' }),
      crear('span', { texto: String(mensaje) })
    );
    contenedorAvisos().append(el);
    const irse = () => { el.classList.add('sale'); setTimeout(() => el.remove(), 320); };
    const t = setTimeout(irse, segundos * 1000);
    el.addEventListener('click', () => { clearTimeout(t); irse(); });
    return el;
  }

  const exito  = m => aviso(m, 'ok');
  const fallo  = m => aviso(m, 'error', 6);
  const dato   = m => aviso(m, 'info');
  const ojo    = m => aviso(m, 'alerta', 5);

  /* ==================================================================
     2. MODALES
     ================================================================== */
  function modal({ titulo, subtitulo, cuerpo, botones = [], ancho, alCerrar }){
    const hoja = crear('div', { clase:'hoja' + (ancho === 'ancha' ? ' hoja-ancha' : '') });

    const cabecera = crear('header', {},
      crear('div', {},
        crear('h3', { texto: titulo || '' }),
        subtitulo ? crear('p', { texto: subtitulo }) : null
      ),
      crear('button', { clase:'btn-ico', 'aria-label':'Cerrar', texto:'✕', onclick: () => cerrar() })
    );

    const zona = crear('div', { clase:'cuerpo' });
    if (typeof cuerpo === 'string') zona.innerHTML = cuerpo;
    else if (cuerpo) zona.append(cuerpo);

    hoja.append(cabecera, zona);

    if (botones.length){
      const pie = crear('footer');
      botones.forEach(b => {
        const btn = crear('button', {
          clase: 'btn ' + (b.clase || 'btn-claro'),
          texto: b.texto,
          onclick: async (ev) => {
            if (!b.accion) return cerrar();
            btn.disabled = true;
            const original = btn.textContent;
            if (b.esperando !== false) btn.textContent = b.esperandoTexto || 'Guardando…';
            try {
              const r = await b.accion({ cerrar, zona, boton:btn });
              if (r !== false) cerrar();
            } catch(e){
              fallo(e.message || 'No se pudo completar la acción.');
            } finally {
              btn.disabled = false; btn.textContent = original;
            }
          },
        });
        pie.append(btn);
      });
      hoja.append(pie);
    }

    const telon = crear('div', { clase:'telon' }, hoja);
    telon.addEventListener('mousedown', e => { if (e.target === telon) cerrar(); });

    function cerrar(){
      telon.style.opacity = '0';
      setTimeout(() => telon.remove(), 220);
      document.removeEventListener('keydown', porEscape);
      if (alCerrar) alCerrar();
    }
    function porEscape(e){ if (e.key === 'Escape') cerrar(); }
    document.addEventListener('keydown', porEscape);

    document.body.append(telon);
    setTimeout(() => { const f = zona.querySelector('input,select,textarea'); if (f) f.focus(); }, 120);
    return { cerrar, zona, hoja };
  }

  /* Confirmación con promesa: const ok = await UI.confirmar({...}) */
  function confirmar({ titulo = '¿Confirmas?', texto = '', aceptar = 'Sí, continuar', cancelar = 'Cancelar', peligro = false }){
    return new Promise(resolver => {
      let respondido = false;
      const m = modal({
        titulo,
        cuerpo: `<p class="t-2 t-alto">${esc(texto)}</p>`,
        alCerrar: () => { if (!respondido) resolver(false); },
        botones: [
          { texto: cancelar, clase:'btn-fantasma', accion: () => { respondido = true; resolver(false); } },
          { texto: aceptar, clase: peligro ? 'btn-rojo' : 'btn-marino', esperando:false,
            accion: () => { respondido = true; resolver(true); } },
        ],
      });
    });
  }

  /* ==================================================================
     3. FORMULARIOS
     ------------------------------------------------------------------
     campos = [{ id, etiqueta, tipo, valor, requerido, ayuda, opciones,
                 icono, ancho:'medio', atributos:{} }]
     ================================================================== */
  function formulario(campos, { columnas = 2 } = {}){
    const cont = crear('div', {
      style: `display:grid;grid-template-columns:repeat(${columnas},minmax(0,1fr));gap:0 .9rem`,
    });

    campos.forEach(c => {
      if (c.tipo === 'separador'){
        cont.append(crear('div', {
          style:'grid-column:1/-1;margin:.4rem 0 .9rem',
          html:`<div class="t-xs t-fuerte t-mudo rotulo-seccion">${esc(c.etiqueta)}</div><hr class="linea-div mt-xs">`,
        }));
        return;
      }

      const campo = crear('div', {
        clase:'campo',
        style: c.ancho === 'completo' || columnas === 1 ? 'grid-column:1/-1' : '',
      });

      campo.append(crear('label', { for:c.id, html:
        `${esc(c.etiqueta)}${c.requerido ? ' <span class="obligatorio">*</span>' : ''}` }));

      const caja = crear('div', { clase:'caja' + (c.tipo === 'area' ? ' caja-alta' : ''), id:`caja_${c.id}` });
      if (c.icono) caja.append(crear('span', { clase:'ic', texto:c.icono }));

      let control;
      if (c.tipo === 'select'){
        control = crear('select', { id:c.id, name:c.id });
        (c.opciones || []).forEach(o => {
          const v = typeof o === 'object' ? o.valor : o;
          const t = typeof o === 'object' ? o.texto : o;
          control.append(crear('option', { value:v, texto:t, ...(String(c.valor) === String(v) ? { selected:'selected' } : {}) }));
        });
      } else if (c.tipo === 'area'){
        control = crear('textarea', { id:c.id, name:c.id, rows:c.filas || 4, placeholder:c.pista || '' });
        control.value = c.valor ?? '';
      } else {
        control = crear('input', {
          id:c.id, name:c.id, type:c.tipo || 'text',
          placeholder:c.pista || '', value:c.valor ?? '',
          ...(c.atributos || {}),
        });
      }
      if (c.requerido) control.setAttribute('required', 'required');
      if (c.soloLectura) control.setAttribute('readonly', 'readonly');
      caja.append(control);
      campo.append(caja);

      if (c.ayuda) campo.append(crear('span', { clase:'ayuda', texto:c.ayuda }));
      campo.append(crear('span', { clase:'pista', id:`pista_${c.id}` }));

      cont.append(campo);
    });

    return cont;
  }

  /* Lee un formulario construido con la función anterior. */
  function leerFormulario(raiz, campos){
    const datos = {};
    campos.filter(c => c.tipo !== 'separador').forEach(c => {
      const el = raiz.querySelector('#' + c.id);
      if (!el) return;
      let v = el.value;
      if (c.limpiar === 'dni')      v = U.soloDigitos(v, 8);
      else if (c.limpiar === 'num') v = U.soloDigitos(v, 15);
      else if (c.limpiar === 'nombre') v = U.limpiarNombre(v);
      else if (typeof v === 'string') v = U.limpiar(v, c.largo || 500);
      datos[c.id] = v === '' ? null : v;
    });
    return datos;
  }

  /* Valida y marca en rojo los campos con problema. */
  function validarFormulario(raiz, campos, datos){
    let primerError = null;
    campos.filter(c => c.tipo !== 'separador').forEach(c => {
      const caja  = raiz.querySelector('#caja_' + c.id);
      const pista = raiz.querySelector('#pista_' + c.id);
      if (!caja) return;
      caja.classList.remove('mal', 'ok');
      if (pista){ pista.classList.remove('ver', 'mala', 'buena'); pista.textContent = ''; }

      const v = datos[c.id];
      let error = null;

      if (c.requerido && (v === null || String(v).trim() === '')) error = 'Este dato es obligatorio.';
      else if (v && c.valida){
        const r = c.valida(v, datos);
        if (r !== true) error = typeof r === 'string' ? r : 'El dato no tiene el formato correcto.';
      }

      if (error){
        caja.classList.add('mal');
        if (pista){ pista.textContent = '✕ ' + error; pista.classList.add('ver', 'mala'); }
        if (!primerError) primerError = { id:c.id, error };
      } else if (v){
        caja.classList.add('ok');
      }
    });
    if (primerError){
      const el = raiz.querySelector('#' + primerError.id);
      if (el){ el.focus(); el.scrollIntoView({ block:'center', behavior:'smooth' }); }
    }
    return !primerError;
  }

  /* Marca un campo concreto (por ejemplo, DNI ya registrado). */
  function marcarCampo(raiz, id, mensaje, bueno = false){
    const caja = raiz.querySelector('#caja_' + id);
    const pista = raiz.querySelector('#pista_' + id);
    if (!caja || !pista) return;
    caja.classList.remove('mal', 'ok');
    caja.classList.add(bueno ? 'ok' : 'mal');
    pista.textContent = (bueno ? '✓ ' : '✕ ') + mensaje;
    pista.className = 'pista ver ' + (bueno ? 'buena' : 'mala');
  }

  /* ==================================================================
     4. TABLAS
     ------------------------------------------------------------------
     columnas = [{ titulo, campo, valor(fila), clase, ancho }]
     ================================================================== */
  function tabla({ columnas, filas, vacio = 'No hay registros todavía.', iconoVacio = '📭', claseFila }){
    if (!filas || !filas.length){
      return `<div class="tabla-marco"><div class="tabla-vacia">
        <div class="icono">${iconoVacio}</div>
        <div class="t-m t-2">${esc(vacio)}</div></div></div>`;
    }
    const cab = columnas.map(c =>
      `<th${c.ancho ? ` style="width:${c.ancho}"` : ''}${c.clase ? ` class="${c.clase}"` : ''}>${esc(c.titulo)}</th>`).join('');
    const cuerpo = filas.map((f, i) => {
      const celdas = columnas.map(c => {
        const v = typeof c.valor === 'function' ? c.valor(f, i) : esc(f[c.campo]);
        return `<td${c.clase ? ` class="${c.clase}"` : ''}>${v ?? ''}</td>`;
      }).join('');
      return `<tr${claseFila ? ` class="${claseFila(f)}"` : ''} data-id="${esc(f.id)}">${celdas}</tr>`;
    }).join('');
    return `<div class="tabla-marco"><div class="tabla-scroll">
      <table class="tabla"><thead><tr>${cab}</tr></thead><tbody>${cuerpo}</tbody></table>
    </div></div>`;
  }

  /* Paginación sencilla en memoria. */
  function paginador(total, pagina, porPagina, alCambiar){
    const paginas = Math.max(1, Math.ceil(total / porPagina));
    if (paginas <= 1) return crear('div');
    const cont = crear('div', { clase:'paginas' });

    const boton = (txt, destino, activa, apagada) => crear('button', {
      texto: txt,
      clase: activa ? 'activa' : '',
      ...(apagada ? { disabled:'disabled' } : {}),
      onclick: () => alCambiar(destino),
    });

    cont.append(boton('‹', pagina - 1, false, pagina <= 1));
    const desde = Math.max(1, pagina - 2), hasta = Math.min(paginas, desde + 4);
    if (desde > 1){ cont.append(boton('1', 1, pagina === 1)); if (desde > 2) cont.append(crear('span', { clase:'t-mudo', texto:'…' })); }
    for (let p = desde; p <= hasta; p++) cont.append(boton(String(p), p, p === pagina));
    if (hasta < paginas){ if (hasta < paginas - 1) cont.append(crear('span', { clase:'t-mudo', texto:'…' })); cont.append(boton(String(paginas), paginas, pagina === paginas)); }
    cont.append(boton('›', pagina + 1, false, pagina >= paginas));
    return cont;
  }

  /* ==================================================================
     5. ESTADOS DE CARGA
     ================================================================== */
  const esqueleto = (n = 5) =>
    Array.from({ length:n }, () => '<div class="hueso hueso-bloque"></div>').join('');

  const cargando = (texto = 'Cargando…') =>
    `<div class="cargando-centro"><div class="rueda"></div><span>${esc(texto)}</span></div>`;

  const sinDatos = (texto = 'Aún no hay información.', icono = '📭', accion = '') =>
    `<div class="tabla-vacia"><div class="icono">${icono}</div>
     <div class="t-m t-2">${esc(texto)}</div>${accion ? `<div class="mt16">${accion}</div>` : ''}</div>`;

  /* ==================================================================
     6. PIEZAS PEQUEÑAS
     ================================================================== */
  const kpi = ({ icono, clase = 'l-oro', valor, rotulo, delta, deltaTipo }) => `
    <div class="kpi">
      <div class="fila-top">
        <div>
          <div class="valor">${esc(valor)}</div>
          <div class="rotulo">${esc(rotulo)}</div>
        </div>
        <div class="loseta ${clase}">${icono}</div>
      </div>
      ${delta ? `<div class="delta ${deltaTipo || 'sube'}">${esc(delta)}</div>` : ''}
    </div>`;

  const etiqueta = (texto, clase = 'e-gris') => `<span class="etiqueta ${clase}">${esc(texto)}</span>`;

  const avatar = (nombre, dorado) =>
    `<div class="avatar${dorado ? ' avatar-oro' : ''}">${esc(U.iniciales(nombre))}</div>`;

  const barra = (valor, total, clase = '') =>
    `<div class="barra ${clase}"><i style="width:${U.pct(valor, total)}%"></i></div>`;

  /* Colores de estado usados en todo el sistema. */
  function claseEstado(estado){
    const m = {
      'Matriculado':'e-verde', 'Retirado':'e-rojo', 'Trasladado':'e-naranja', 'Egresado':'e-azul',
      'Pendiente':'e-naranja', 'En revisión':'e-azul', 'Aprobada':'e-verde', 'Rechazada':'e-rojo',
      'Abierto':'e-rojo', 'En proceso':'e-naranja', 'Resuelto':'e-verde', 'Cerrado':'e-gris',
      'Recibido':'e-azul', 'Archivado':'e-gris', 'Observado':'e-rojo',
      'Entregado':'e-azul', 'Revisado':'e-verde',
      'Presente':'e-verde', 'Tardanza':'e-naranja', 'Falta':'e-rojo', 'Justificado':'e-azul',
      'Pagado':'e-verde', 'Vencido':'e-rojo',
      'Alta':'e-rojo', 'Media':'e-naranja', 'Baja':'e-verde',
    };
    return m[estado] || 'e-gris';
  }

  /* ==================================================================
     7. GRÁFICOS SIN LIBRERÍAS
     ================================================================== */
  function barras(datos, { color = '', alto = 190 } = {}){
    const max = Math.max(1, ...datos.map(d => d.valor));
    return `<div class="grafico-barras" style="height:${alto}px">` +
      datos.map(d => `
        <div class="col">
          <div class="tallo ${d.color || color}" style="height:${Math.max(4, (d.valor / max) * (alto - 42))}px">
            <b>${U.num(d.valor)}</b>
          </div>
          <div class="pie-col">${esc(d.etiqueta)}</div>
        </div>`).join('') + '</div>';
  }

  /* Línea suave en SVG (tendencias). */
  function lineas(datos, { color = 'var(--oro-hondo)', alto = 180 } = {}){
    if (!datos.length) return sinDatos('Sin datos para graficar.', '📈');
    const ancho = 600, pad = 26;
    const max = Math.max(1, ...datos.map(d => d.valor));
    const paso = (ancho - pad * 2) / Math.max(1, datos.length - 1);
    const puntos = datos.map((d, i) => [
      pad + i * paso,
      alto - pad - (d.valor / max) * (alto - pad * 2),
    ]);
    const linea = puntos.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    const area = `${linea} L${puntos[puntos.length-1][0].toFixed(1)} ${alto-pad} L${pad} ${alto-pad} Z`;
    return `
      <svg class="grafico-lineas" viewBox="0 0 ${ancho} ${alto}" preserveAspectRatio="none" role="img">
        <defs><linearGradient id="degLinea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${color}" stop-opacity=".28"/>
          <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
        </linearGradient></defs>
        <path d="${area}" fill="url(#degLinea)"/>
        <path d="${linea}" fill="none" stroke="${color}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
        ${puntos.map((p, i) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3.4" fill="${color}"><title>${esc(datos[i].etiqueta)}: ${datos[i].valor}</title></circle>`).join('')}
      </svg>
      <div class="leyenda">${datos.map(d => `<span>${esc(d.etiqueta)}</span>`).join('')}</div>`;
  }

  /* Anillo de progreso (ocupación de aulas, avance de notas). */
  function anillo(porcentaje, color = '#FFD60A'){
    const p = Math.max(0, Math.min(100, porcentaje));
    return `<div class="anillo" style="background:conic-gradient(${color} ${p * 3.6}deg, var(--linea) 0)">
      <b>${p}%</b></div>`;
  }

  /* ==================================================================
     8. ARMAZÓN DE LOS PANELES
     ------------------------------------------------------------------
     menu = [{ id, texto, icono, grupo }]
     ================================================================== */
  function armarPanel({ sesion, menu, tituloPanel }){
    document.body.classList.add('panel');
    const rol = ROLES[sesion.rol] || { nombre:sesion.rol, icono:'👤', color:'l-gris' };

    /* --- Lateral --- */
    const grupos = {};
    menu.forEach(m => (grupos[m.grupo || 'General'] = grupos[m.grupo || 'General'] || []).push(m));

    const htmlMenu = Object.entries(grupos).map(([grupo, items]) => `
      <div class="rotulo-menu">${esc(grupo)}</div>
      <nav>${items.map(m => `
        <a href="#${m.id}" data-vista="${m.id}">
          <span class="ic">${m.icono}</span>
          <span class="crece">${esc(m.texto)}</span>
          <span class="cuenta oculto" id="cuenta_${m.id}"></span>
        </a>`).join('')}
      </nav>`).join('');

    const lateral = crear('aside', { clase:'lateral', id:'lateral' });
    lateral.innerHTML = `
      <a class="marca-panel" href="${RUTA.portal()}" title="Ir al portal público">
        <span class="escudo"><span>RPB</span></span>
        <span class="txt"><b>${esc(IE.siglas)}</b><small>${esc(tituloPanel || rol.nombre)}</small></span>
      </a>
      <div class="tarjeta-yo">
        ${avatar(sesion.nombres, sesion.rol === 'estudiante')}
        <span class="txt">
          <b>${esc(sesion.nombres)}</b>
          <small>${esc(sesion.cargo || rol.nombre)}</small>
        </span>
      </div>
      ${htmlMenu}
      <div class="fondo-lateral">
        ${sesion.tipo === 'personal'
          ? `<button class="btn btn-fantasma btn-bloque" id="btnMiClave">🔑 Cambiar mi contraseña</button>`
          : ''}
        <button class="btn btn-fantasma btn-bloque" data-boton-tema onclick="U.alternarTema()">🌙</button>
        <button class="btn btn-claro btn-bloque" id="btnSalir">Cerrar sesión</button>
      </div>`;

    /* --- Barra superior --- */
    const barra = crear('header', { clase:'barra-panel' });
    barra.innerHTML = `
      <button class="btn-cajon" id="btnCajon" aria-label="Menú">☰</button>
      <div class="titulo-vista">
        <b id="tituloVista">${esc(IE.nombre_corto)}</b>
        <small id="subtituloVista">${esc(tituloPanel || rol.nombre)} · Año escolar ${IE.anio}</small>
      </div>
      <span class="reloj-panel" id="reloj"></span>
      <div class="campana">
        <button class="btn-ico" id="btnCampana" aria-label="Notificaciones">🔔
          <span class="globo oculto" id="globoNotif">0</span>
        </button>
        <div class="bandeja" id="bandeja"></div>
      </div>`;

    const lienzo = crear('main', { clase:'lienzo-panel', id:'lienzo' });
    const capa   = crear('div', { clase:'capa-lateral', id:'capaLateral' });

    document.body.innerHTML = '';
    const armazon = crear('div', { clase:'armazon' }, lateral,
      crear('div', { style:'min-width:0;display:flex;flex-direction:column' }, barra, lienzo));
    document.body.append(armazon, capa);

    /* --- Comportamiento --- */
    q('#btnSalir').onclick = async () => {
      if (await confirmar({ titulo:'Cerrar sesión', texto:'¿Seguro que quieres salir del sistema?', aceptar:'Sí, salir' }))
        Sesion.cerrar();
    };
    const btnClave = q('#btnMiClave');
    if (btnClave) btnClave.onclick = () => Panel.cambiarMiClave();

    q('#btnCajon').onclick = () => { lateral.classList.add('abierto'); capa.classList.add('ver'); };
    capa.onclick = () => { lateral.classList.remove('abierto'); capa.classList.remove('ver'); };

    /* Reloj */
    const pintarReloj = () => {
      q('#reloj').textContent = new Date().toLocaleString('es-PE',
        { weekday:'long', day:'numeric', month:'long', hour:'2-digit', minute:'2-digit' });
    };
    pintarReloj(); setInterval(pintarReloj, 30000);

    /* Campana */
    const bandeja = q('#bandeja');
    q('#btnCampana').onclick = (e) => { e.stopPropagation(); bandeja.classList.toggle('abierta'); };
    document.addEventListener('click', () => bandeja.classList.remove('abierta'));
    bandeja.addEventListener('click', e => e.stopPropagation());

    U.aplicarTema(document.documentElement.dataset.tema || 'claro');
    return { lateral, barra, lienzo, bandeja, capa };
  }

  /* Cambia de vista y actualiza el menú y el título. */
  function irAVista(id, { titulo, subtitulo } = {}){
    qq('.vista').forEach(v => v.classList.toggle('activa', v.id === 'vista_' + id));
    qq('.lateral nav a').forEach(a => a.classList.toggle('activo', a.dataset.vista === id));
    /* La barra superior mantiene la identidad del colegio; el título de la
       sección vive en el encabezado de la vista, para no repetirlo dos veces.
       Lo que sí cambia es el título de la pestaña del navegador. */
    if (titulo) document.title = `${titulo} · ${IE.siglas}`;
    if (subtitulo) q('#subtituloVista').textContent = subtitulo;
    q('#lateral').classList.remove('abierto');
    q('#capaLateral').classList.remove('ver');
    const l = q('#lienzo'); if (l) l.scrollTo({ top:0, behavior:'smooth' });
    if (location.hash !== '#' + id) history.replaceState(null, '', '#' + id);
  }

  /* Crea el contenedor de una vista dentro del lienzo. */
  function crearVista(id, { titulo, descripcion, acciones = '' } = {}){
    const v = crear('section', { clase:'vista', id:'vista_' + id });
    v.innerHTML = `
      <div class="encabezado-vista">
        <div>
          <h2>${esc(titulo || '')}</h2>
          ${descripcion ? `<p>${esc(descripcion)}</p>` : ''}
        </div>
        <div class="acciones">${acciones}</div>
      </div>
      <div id="cuerpo_${id}"></div>`;
    q('#lienzo').append(v);
    return q('#cuerpo_' + id);
  }

  /* Pinta el contador rojo de un ítem del menú. */
  function contador(idVista, n){
    const el = q('#cuenta_' + idVista);
    if (!el) return;
    el.textContent = n > 99 ? '99+' : n;
    el.classList.toggle('oculto', !n);
  }

  /* Campana de notificaciones. */
  function pintarNotificaciones(lista){
    const bandeja = q('#bandeja'), globo = q('#globoNotif');
    if (!bandeja) return;
    if (!lista.length){
      bandeja.innerHTML = `<div class="t-c t-mudo t-s pad-lg">Sin novedades por ahora.</div>`;
    } else {
      bandeja.innerHTML = lista.map(n => `
        <div class="nota-item">
          <div class="loseta loseta-s l-oro">🔔</div>
          <div class="txt crece">
            <b>${esc(n.titulo)}</b>
            <small>${esc(n.cuerpo || '')}</small>
            <span class="cuando">${esc(U.hace(n.creado_en))}</span>
          </div>
        </div>`).join('');
    }
    if (globo){
      globo.textContent = lista.length > 9 ? '9+' : lista.length;
      globo.classList.toggle('oculto', !lista.length);
    }
  }

  /* ==================================================================
     9. BARRA DE HERRAMIENTAS (buscador + filtros)
     ================================================================== */
  function herramientas({ pista = 'Buscar…', filtros = [], fechas = false, acciones = '' }){
    return `
      <div class="herramientas">
        <label class="buscador">
          <span>🔍</span>
          <input type="search" id="buscador" placeholder="${esc(pista)}" autocomplete="off">
          <button class="limpiar" id="limpiarBusq" aria-label="Limpiar">✕</button>
        </label>
        ${filtros.map(f => `
          <select class="filtro-sel" id="${f.id}">
            ${f.opciones.map(o => {
              const v = typeof o === 'object' ? o.valor : o;
              const t = typeof o === 'object' ? o.texto : o;
              return `<option value="${esc(v)}">${esc(t)}</option>`;
            }).join('')}
          </select>`).join('')}
        ${fechas ? `
          <label class="rango-fechas" title="Filtrar por fecha de registro">
            <span>📅</span>
            <input type="date" id="fDesde" aria-label="Desde">
            <span class="guion">–</span>
            <input type="date" id="fHasta" aria-label="Hasta">
            <button class="limpiar" id="limpiarFechas" aria-label="Quitar el filtro de fechas">✕</button>
          </label>` : ''}
        <span class="contador-res" id="contadorRes"></span>
        <span class="crece"></span>
        ${acciones}
      </div>`;
  }

  return {
    aviso, exito, fallo, dato, ojo,
    modal, confirmar,
    formulario, leerFormulario, validarFormulario, marcarCampo,
    tabla, paginador, esqueleto, cargando, sinDatos,
    kpi, etiqueta, avatar, barra, claseEstado,
    barras, lineas, anillo,
    armarPanel, irAVista, crearVista, contador, pintarNotificaciones, herramientas,
  };
})();
