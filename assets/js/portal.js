/* =====================================================================
   PORTAL PÚBLICO
   ---------------------------------------------------------------------
   Cubre los indicadores 3 y 4 (fluidez y difusión de la información).
   Secciones, en el orden en que aparecen:
     1. Portada con las dos puertas de acceso
     2. Contadores animados (estudiantes, años, docentes, aforo)
     3. Historia del colegio y línea de tiempo
     4. Carrusel de los lugares de la institución
     5. Tríptico en 3D, dibujado con CSS a partir del texto real
     6. Asistente virtual, empotrado en su propia sección
     7. Grados y vacantes en vivo
     8. Calendario académico
     9. Comunicados en tiempo real
    10. Matrícula y solicitud de vacante
   ===================================================================== */
'use strict';

(() => {
  const { q, qq, esc } = U;

  /* ==================================================================
     1. DATOS FIJOS DE LA INSTITUCIÓN
     ================================================================== */
  /* Escribe en el hueco 'sel' sin quejarse si esa página no lo tiene:
     las tres comparten este archivo y cada una trae solo sus piezas. */
  function poner(sel, html, comoTexto){
    const el = q(sel);
    if (!el) return;
    if (comoTexto) el.textContent = html; else el.innerHTML = html;
  }

  function pintarDatosFijos(){
    qq('[data-anio]').forEach(el => el.textContent = IE.anio);

    poner('#insigniaTexto', `${IE.anios_servicio} años educando en ${IE.distrito}`, true);

    /* --- Historia --- */
    poner('#historiaEntrada', HISTORIA.entrada, true);
    poner('#historiaMeta', HISTORIA.meta, true);

    poner('#citaIdeal',
      `“${esc(IE.ideal)}”<cite>Ideal institucional · tríptico de la I.E.P. Raúl Porras Barrenechea</cite>`);

    /* --- Ventajas (bloque "vacantes limitadas" del tríptico) --- */
    poner('#listaVentajas', VENTAJAS.map(v => `
      <div class="ventaja">
        <span class="em">${v.icono}</span>
        <div><b>${esc(v.titulo)}</b><small>${esc(v.detalle)}</small></div>
      </div>`).join(''));

    /* --- Matrícula --- */
    poner('#mensajePadres', MENSAJE_PADRES, true);

    poner('#listaRequisitos', REQUISITOS_MATRICULA
      .map(r => `<div class="requisito"><span class="tic">✓</span><span>${esc(r)}</span></div>`).join(''));

    poner('#listaPrecios', `
      <div class="destacada"><span>Matrícula (única vez)</span><b>${U.soles(IE.costo_matricula)}</b></div>
      <div><span>Pensión mensual · Inicial</span><b>${U.soles(IE.pension_inicial)}</b></div>
      <div><span>Pensión mensual · Primaria</span><b>${U.soles(IE.pension_primaria)}</b></div>
      <div><span>Mensualidades al año</span><b>${IE.mensualidades}</b></div>`);

    /* --- Pie --- */
    poner('#piePromesa',
      `${IE.promesa}. ${IE.anios_servicio} años formando a los niños y niñas de ${IE.distrito}, ` +
      `con aulas de ${IE.aforo_aula} estudiantes y profesoras tituladas.`, true);

    poner('#pieContacto', `
      <li>📍 ${esc(IE.direccion)}</li>
      <li>📞 <a href="tel:+51${esc(IE.telefono)}">${esc(IE.telefono)}</a></li>
      <li>✉️ <a href="mailto:${esc(IE.correo)}">${esc(IE.correo)}</a></li>
      <li>🕗 ${esc(IE.horario_atencion)}</li>
      <li>🎓 Directora: ${esc(IE.directora)}</li>`);

    poner('#pieAbajo',
      `© ${IE.anio} ${esc(IE.nombre)} · ${esc(IE.ugel)} · Sistema de gestión v${IE.version_sistema}`);
  }

  /* ==================================================================
     2. BARRA: menú móvil y resaltado por sección
     ================================================================== */
  function prepararBarra(){
    const menu = q('#menuPrincipal');
    if (!menu) return;
    const btn = q('#btnMenuMovil');
    if (btn) btn.onclick = e => { e.stopPropagation(); menu.classList.toggle('abierto'); };
    document.addEventListener('click', () => menu.classList.remove('abierto'));
    menu.addEventListener('click', e => { if (e.target.closest('a')) menu.classList.remove('abierto'); });

    const barra = q('#barraFlota');
    if (barra) addEventListener('scroll', () => {
      barra.classList.toggle('encogida', scrollY > 30);
    }, { passive:true });

    /* Resaltado del enlace de ancla según la sección visible (solo en las
       páginas que tienen anclas dentro del menú). */
    const anclados = qq('#menuPrincipal a[href^="#"]');
    if (!anclados.length) return;
    const porId = new Map(anclados.map(a => [a.getAttribute('href').slice(1), a]));
    const observador = new IntersectionObserver(entradas => {
      entradas.forEach(en => {
        if (!en.isIntersecting) return;
        anclados.forEach(a => a.classList.remove('activo'));
        const a = porId.get(en.target.id);
        if (a) a.classList.add('activo');
      });
    }, { rootMargin:'-42% 0px -52% 0px' });
    porId.forEach((_, id) => { const s = document.getElementById(id); if (s) observador.observe(s); });
  }

  /* ==================================================================
     3. CONTADORES ANIMADOS
     ------------------------------------------------------------------
     Cuentan desde cero cuando la tira entra en pantalla. El número de
     estudiantes se trae de la base de datos; los demás salen de config.
     ================================================================== */
  function animarContador(el, destino, ms = 1300){
    const inicio = performance.now();
    const paso = ahora => {
      const t = Math.min(1, (ahora - inicio) / ms);
      /* Desaceleración suave, para que el número "aterrice". */
      const suave = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(destino * suave).toLocaleString('es-PE');
      if (t < 1) requestAnimationFrame(paso);
      else el.textContent = destino.toLocaleString('es-PE');
    };
    requestAnimationFrame(paso);
  }

  async function prepararContadores(){
    const tira = q('#contadores');

    /* Las cifras institucionales vienen de config.js. */
    tira.querySelectorAll('.cifra')[1].dataset.contar = IE.anios_servicio;
    tira.querySelectorAll('.cifra')[2].dataset.contar = IE.docentes;
    tira.querySelectorAll('.cifra')[3].dataset.contar = IE.aforo_aula;

    /* El número de estudiantes es real. */
    try {
      const n = await Datos.estudiantes.contar({ estado:'Matriculado', anio: IE.anio });
      q('#cifraEstudiantes').dataset.contar = n;
      q('#detalleEstudiantes').textContent = `año escolar ${IE.anio}`;
    } catch {
      q('#cifraEstudiantes').dataset.contar = 0;
      q('#detalleEstudiantes').textContent = 'sin conexión con la base de datos';
    }

    let yaCorrio = false;
    const obs = new IntersectionObserver(ent => {
      ent.forEach(e => {
        if (!e.isIntersecting || yaCorrio) return;
        yaCorrio = true;
        tira.classList.add('visible');
        qq('.cifra', tira).forEach((el, i) =>
          setTimeout(() => animarContador(el, +el.dataset.contar || 0), i * 110));
      });
    }, { threshold:.4 });
    obs.observe(tira);
  }

  /* ==================================================================
     4. LOS LUGARES Y LAS AULAS
     ================================================================== */
  /* ------------------------------------------------------------------
     Carrusel giratorio: las tarjetas se reparten alrededor de un cilindro
     y la rueda entera gira sobre su eje. Cada una queda a 360/n grados de
     la siguiente, y el radio se calcula con trigonometría para que se
     toquen justo sin encimarse:

         radio = (ancho / 2) / tan(π / n)

     Esa fórmula es lo que hace que funcione igual con 4 fotos que con 20,
     y que al cambiar el tamaño de la pantalla se rearme solo.
     ------------------------------------------------------------------ */
  /* La clave con la que Soporte guarda la foto de cada lugar: se deriva
     del nombre del archivo, para que el panel y el portal siempre estén
     hablando del mismo lugar sin una segunda lista que mantener. */
  const claveLugar = l => 'lugar_' + l.archivo.replace(/^lugar_|\.jpg$/g, '');

  /* ------------------------------------------------------------------
     Las instalaciones, en un carrusel con profundidad
     ------------------------------------------------------------------
     Antes era una rueda completa: las tarjetas de los costados giraban
     medio centenar de grados y la foto salía estirada. Ahora solo hay
     tres en escena —la del frente y sus dos vecinas, apenas giradas—,
     así que la foto se ve con su proporción real y el 3D se nota como
     profundidad, no como deformación.

     Avanza solo cada 7 segundos y el reloj se reinicia en cuanto
     alguien toca algo; se detiene si la sección no está a la vista, si
     la pestaña está en segundo plano o si el sistema pide menos
     movimiento.
     ------------------------------------------------------------------ */
  function montarLugares(){
    const escena = q('#escenaLugares');
    const pista  = q('#ruedaLugares');
    const puntos = q('#puntosLugares');
    if (!escena || !pista) return;

    /* Los nombres y las descripciones pueden venir editados desde el
       panel de Soporte; si no hay nada guardado, mandan los del
       archivo de configuración. Y además de los siete ambientes fijos,
       el carrusel muestra TODAS las fotos que Soporte haya añadido:
       las de cada salón (clave salon_…) y las libres (clave extra_…).
       No hay número máximo de fotos. */
    let lugares = LUGARES.map(l => ({ ...l, clave: claveLugar(l) }));
    let n = lugares.length;
    let actual = 0;
    const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;

    function pintar(){
      pista.innerHTML = lugares.map((l, i) => `
        <figure class="lamina" data-i="${i}">
          <div class="hueco-foto">
            <span class="ic">${l.icono}</span>
            <b>${esc(l.nombre)}</b>
            <small>La foto la sube el área de soporte desde su panel.</small>
          </div>
          <img alt="${esc(l.nombre)}" data-lugar="${esc(l.clave)}"
               src="${esc(RUTA.img(l.archivo))}"
               loading="${i < 3 ? 'eager' : 'lazy'}" draggable="false"
               onerror="this.classList.add('oculto')">
          <figcaption>
            <b>${esc(l.nombre)}</b>
            <small>${esc(l.detalle)}</small>
          </figcaption>
        </figure>`).join('');

      puntos.innerHTML = lugares.map((l, i) =>
        `<i data-i="${i}" role="button" tabindex="0" aria-label="${esc(l.nombre)}"></i>`).join('');
      colocar();
    }

    /* Coloca cada lámina según su distancia a la del frente. */
    function colocar(){
      qq('.lamina', pista).forEach((el, i) => {
        let d = i - actual;
        if (d >  n / 2) d -= n;          // el camino más corto
        if (d < -n / 2) d += n;
        /* Solo la del frente y sus dos vecinas: tres tarjetas en escena,
           que es lo que cabe sin amontonar ni salirse por los costados. */
        const lejos = Math.abs(d) > 1;
        el.classList.toggle('oculta', lejos);
        el.classList.toggle('foco', d === 0);
        el.setAttribute('aria-hidden', d !== 0);
        el.style.transform =
          `translateX(${d * 40}%) rotateY(${d * -18}deg) translateZ(${-Math.abs(d) * 110}px) scale(${1 - Math.abs(d) * 0.1})`;
        el.style.zIndex = String(10 - Math.abs(d));
        el.style.opacity = lejos ? '0' : (d === 0 ? '1' : '.62');
      });
      qq('i', puntos).forEach((b, i) => b.classList.toggle('on', i === actual));
    }

    function ir(i, porGesto){
      actual = ((i % n) + n) % n;
      colocar();
      if (porGesto) reiniciarReloj();
    }
    const avanzar = (d, porGesto) => ir(actual + d, porGesto);

    /* --- Mandos --- */
    q('#lugarAdelante').onclick = () => avanzar(1, true);
    q('#lugarAtras').onclick    = () => avanzar(-1, true);
    puntos.onclick = e => { const i = e.target.dataset.i; if (i !== undefined) ir(+i, true); };
    puntos.onkeydown = e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const i = e.target.dataset.i;
      if (i !== undefined){ e.preventDefault(); ir(+i, true); }
    };
    pista.onclick = e => {
      const c = e.target.closest('.lamina');
      if (c && !c.classList.contains('foco')) ir(+c.dataset.i, true);
    };

    escena.tabIndex = 0;
    escena.setAttribute('role', 'group');
    escena.setAttribute('aria-label', 'Instalaciones de la institución');
    escena.onkeydown = e => {
      if (e.key === 'ArrowRight'){ e.preventDefault(); avanzar(1, true); }
      if (e.key === 'ArrowLeft'){  e.preventDefault(); avanzar(-1, true); }
    };

    /* --- Arrastrar con el dedo o el mouse --- */
    let x0 = null;
    const empezar = x => { x0 = x; escena.classList.add('arrastrando'); reiniciarReloj(); };
    const soltar = x => {
      if (x0 === null) return;
      const dx = x - x0;
      x0 = null;
      escena.classList.remove('arrastrando');
      if (Math.abs(dx) > 40) avanzar(dx < 0 ? 1 : -1, true);
    };
    escena.addEventListener('mousedown', e => { e.preventDefault(); empezar(e.clientX); });
    addEventListener('mouseup', e => soltar(e.clientX));
    escena.addEventListener('touchstart', e => empezar(e.touches[0].clientX), { passive:true });
    escena.addEventListener('touchend', e => soltar((e.changedTouches[0] || {}).clientX || 0), { passive:true });

    /* --- Avance automático, sin atropellar a nadie --- */
    let reloj = null, dormidoHasta = 0;
    const reiniciarReloj = () => { dormidoHasta = Date.now() + 12000; };
    if (!quieto){
      reloj = setInterval(() => {
        if (document.hidden || Date.now() < dormidoHasta || x0 !== null) return;
        if (escena.matches(':hover')) return;
        const r = escena.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) return;   // fuera de pantalla
        avanzar(1);
      }, 7000);
      addEventListener('pagehide', () => clearInterval(reloj));
      escena.addEventListener('mouseenter', reiniciarReloj);
      escena.addEventListener('focusin', reiniciarReloj);
    }

    pintar();

    /* Pega en su sitio las fotos que ya están guardadas en la base. */
    function colocarFotos(){
      return Datos.imagenes.todas().then(fotos => {
        qq('img[data-lugar]', pista).forEach(img => {
          const guardada = fotos[img.dataset.lugar];
          if (guardada){ img.src = guardada; img.classList.remove('oculto'); }
        });
      }).catch(() => {});
    }
    colocarFotos();

    /* Nombres, descripciones y fotos añadidas por Soporte. */
    Datos.imagenes.listar({}, { orden:'clave', asc:true, limite:300 }).then(({ filas }) => {
      let cambio = false;

      /* a) Renombrar los siete ambientes fijos. */
      filas.forEach(f => {
        const l = lugares.find(x => x.clave === f.clave);
        if (!l) return;
        if (f.titulo && f.titulo !== l.nombre){ l.nombre = f.titulo; cambio = true; }
        if (f.descripcion && f.descripcion !== l.detalle){ l.detalle = f.descripcion; cambio = true; }
      });

      /* b) Sumar las fotos nuevas: salones primero, luego las libres.
         Solo entran las que de verdad traen imagen: un recuadro vacío
         en el carrusel público no le sirve a nadie. */
      const nuevas = filas
        .filter(f => /^(salon|extra)_/.test(f.clave || '') && f.archivo)
        .sort((a, b) => String(a.clave).localeCompare(String(b.clave)))
        .map(f => ({
          clave: f.clave,
          nombre: f.titulo || f.clave.replace(/^(salon|extra)_/, '').replace(/_/g, ' '),
          detalle: f.descripcion || (f.clave.startsWith('salon_') ? 'Uno de nuestros salones.' : ''),
          icono: f.clave.startsWith('salon_') ? '🏫' : '📷',
          archivo: '',
        }));

      nuevas.forEach(nv => {
        if (lugares.some(l => l.clave === nv.clave)) return;
        lugares.push(nv);
        cambio = true;
      });

      if (cambio){
        n = lugares.length;
        if (actual >= n) actual = 0;
        pintar();
        colocarFotos();
      }
    }).catch(() => {});
  }

  /* ------------------------------------------------------------------
     LA FOTO DE LA ENTRADA
     ------------------------------------------------------------------
     "En la entrada quiero poner la foto de afuera del colegio." La sube
     Soporte con la clave 'fachada' y aparece aquí, detrás del saludo de
     la portada. Mientras no exista, la portada se queda con su fondo de
     siempre: no se pone una foto de archivo haciéndola pasar por la del
     colegio.
     ------------------------------------------------------------------ */
  function montarFachada(){
    const marco = q('#fachadaColegio');
    if (!marco) return;
    Datos.imagenes.todas().then(fotos => {
      const foto = fotos.fachada;
      if (!foto) return;
      const img = marco.querySelector('img');
      if (img){ img.src = foto; img.classList.remove('oculto'); }
      marco.classList.remove('sin-fachada');
      marco.classList.add('con-fachada');
      document.body.classList.add('tiene-fachada');
    }).catch(() => {});
  }

  /* ------------------------------------------------------------------
     Las aulas: dónde está cada salón, en una baraja que se desliza en 3D.
     Los cupos salen de la base de datos, así que lo que se ve es lo que
     hay hoy, no un número escrito a mano.
     ------------------------------------------------------------------ */
  async function montarAulas(){
    const escena = q('#escenaAulas');
    const pila   = q('#pilaAulas');
    if (!escena || !pila) return;

    let aulas = [];
    try {
      const [{ filas: grados }, { filas: alumnos }] = await Promise.all([
        Datos.grados.listar({}, { orden:'orden', asc:true }),
        Datos.estudiantes.listar({ estado:'Matriculado', anio:IE.anio }, { columnas:'grado' }),
      ]);
      const porGrado = U.contarPor(alumnos, 'grado');
      aulas = grados.map(g => ({
        ...g,
        ocupados: porGrado[g.nombre] || 0,
        cupo: g.vacantes || IE.aforo_aula,
      }));
    } catch(e){
      /* Sin datos no se inventa nada: se muestran los grados del sistema. */
      aulas = GRADOS.map((nombre, i) => ({
        nombre, nivel: nombre.startsWith('Inicial') ? 'Inicial' : 'Primaria',
        aula: '—', docente: null, ocupados: null, cupo: IE.aforo_aula, orden: i + 1,
      }));
    }
    if (!aulas.length) return;

    pila.innerHTML = aulas.map((a, i) => {
      const libres = a.ocupados == null ? null : Math.max(0, a.cupo - a.ocupados);
      const lleno = libres === 0;
      return `
      <article class="aula-ficha" data-i="${i}">
        <span class="nivel">${esc(a.nivel)}</span>
        <h3>${esc(a.nombre)}</h3>
        <div class="donde">📍 <span>Salón: <b>${esc(a.aula || 'por asignar')}</b></span></div>
        <div class="maestra">👩‍🏫 ${a.docente ? `A cargo de <b>${esc(a.docente)}</b>` : 'Docente por asignar'}</div>
        <div class="cupos">
          <div class="fila-cupo">
            <span class="cifra ${lleno ? 'lleno' : ''}">${libres == null ? '—' : libres}</span>
            <small>${libres == null ? 'cupos' : lleno ? 'sin vacantes' : libres === 1 ? 'vacante libre' : 'vacantes libres'}</small>
          </div>
          <div class="barra"><i style="width:${a.ocupados == null ? 0 : Math.min(100, U.pct(a.ocupados, a.cupo))}%"></i></div>
          <small>${a.ocupados == null ? '' : `${a.ocupados} de ${a.cupo} estudiantes`}</small>
        </div>
      </article>`;
    }).join('');

    const fichas = qq('.aula-ficha', pila);
    const rotulo = q('#rotuloAula');
    const total = fichas.length;
    let actual = 0;

    function colocar(){
      fichas.forEach((f, i) => {
        const d = i - actual;
        const ad = Math.abs(d);
        /* Las de atrás asoman por el costado: así se ve que hay una pila
           y no una sola tarjeta suelta. */
        const x = d * 34;
        const z = -ad * 72;
        const y = ad * 7;
        f.style.transform =
          `translate(-50%,-50%) translate3d(${x}px, ${y}px, ${z}px) ` +
          `rotateY(${d === 0 ? 0 : (d > 0 ? -14 : 14)}deg) scale(${1 - ad * 0.04})`;
        f.style.opacity = ad > 3 ? '0' : String(Math.max(0, 1 - ad * 0.16));
        f.style.zIndex = String(100 - ad);
        f.style.pointerEvents = ad > 3 ? 'none' : 'auto';
        f.classList.toggle('foco', d === 0);
      });
      if (rotulo) rotulo.textContent = `${actual + 1} de ${total} · ${aulas[actual].nombre}`;
    }
    const ir = n => { actual = Math.max(0, Math.min(total - 1, n)); colocar(); };

    const sig = q('#aulaAdelante'), ant = q('#aulaAtras');
    if (sig) sig.onclick = () => ir(actual + 1);
    if (ant) ant.onclick = () => ir(actual - 1);
    pila.onclick = e => { const f = e.target.closest('.aula-ficha'); if (f) ir(+f.dataset.i); };

    let x0 = null;
    escena.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive:true });
    escena.addEventListener('touchend', e => {
      if (x0 === null) return;
      const dx = (e.changedTouches[0] || {}).clientX - x0;
      x0 = null;
      if (Math.abs(dx) > 40) ir(actual + (dx < 0 ? 1 : -1));
    }, { passive:true });
    escena.addEventListener('mousedown', e => { x0 = e.clientX; escena.classList.add('arrastrando'); });
    addEventListener('mouseup', e => {
      if (x0 === null) return;
      const dx = e.clientX - x0;
      x0 = null; escena.classList.remove('arrastrando');
      if (Math.abs(dx) > 50) ir(actual + (dx < 0 ? 1 : -1));
    });

    escena.tabIndex = 0;
    escena.onkeydown = e => {
      if (e.key === 'ArrowRight'){ e.preventDefault(); ir(actual + 1); }
      if (e.key === 'ArrowLeft'){  e.preventDefault(); ir(actual - 1); }
    };

    colocar();
  }

  /* ==================================================================
     5. EL TRÍPTICO
     ------------------------------------------------------------------
     Una sola fuente de contenido (TRIPTICO, en config.js) y dos maneras
     de leerla:

       · Hojear     — una cara grande a la vez, con vuelta de hoja real.
       · Desplegado — el folleto entero plegado en 3D.

     No hay ni una imagen: son seis caras de HTML. El texto se puede
     seleccionar, buscar con Ctrl+F y ampliar sin que se pixele.
     ================================================================== */

  /* Orden de lectura del impreso: portada, las tres del interior y las
     dos del reverso. Es el recorrido que hace la mano con el papel. */
  const CARAS = [
    { ...TRIPTICO.exterior[0], rotulo_cara:'Portada' },
    { ...TRIPTICO.interior[0], rotulo_cara:'Interior' },
    { ...TRIPTICO.interior[1], rotulo_cara:'Interior' },
    { ...TRIPTICO.interior[2], rotulo_cara:'Interior' },
    { ...TRIPTICO.exterior[1], rotulo_cara:'Reverso' },
    { ...TRIPTICO.exterior[2], rotulo_cara:'Contraportada' },
  ];

  function caraHTML(c){
    const partes = [];

    if (c.clase === 'cara-portada'){
      partes.push(`
        <div class="sello-t"><i>I.E.P.</i>RPB</div>
        <div class="nombre-t">${esc(IE.nombre_corto)}</div>
        <div class="nivel-t">${esc(IE.niveles_texto)}</div>
        <div class="franja-t">${esc(c.titulo)}</div>
        <div class="anio-t">${esc(c.destacado)}</div>
        <div class="bloque-amarillo">
          <span class="rot">${esc(c.rotulo)}:</span>
          <ul>${c.lista.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
        </div>`);
      return partes.join('');
    }

    partes.push(`<h4>${esc(c.titulo)}</h4>`);

    if (c.intro)    partes.push(`<div class="intro-t">${esc(c.intro)}</div>`);
    if (c.parrafos) partes.push(c.parrafos.map(p => `<p>${esc(p)}</p>`).join(''));

    if (c.bloques){
      partes.push(`<div class="bloques-t">${c.bloques.map(b =>
        `<div><span class="rot">${esc(b.rotulo)}</span><b>${esc(b.texto)}</b></div>`).join('')}</div>`);
    }

    if (c.precios){
      partes.push(`
        <div class="precios-t">
          <div class="precio-t"><span>Matrícula</span><b>${U.soles(IE.costo_matricula)}</b></div>
          <div class="precio-t"><span>Mensualidad Inicial</span><b>${U.soles(IE.pension_inicial)}</b></div>
          <div class="precio-t"><span>Mensualidad Primaria</span><b>${U.soles(IE.pension_primaria)}</b></div>
          <div class="precio-t"><span>Mensualidades al año</span><b>${IE.mensualidades}</b></div>
        </div>`);
    }

    if (c.lista){
      partes.push(`<ul>${c.lista.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`);
    }

    if (c.contacto){
      partes.push(`
        <div class="contacto-t">
          <div class="lema-t">“${esc(IE.lema)}”</div>
          <div><b>Dirección:</b> ${esc(IE.direccion)}</div>
          <div><b>Teléfono:</b> ${esc(IE.telefono)}</div>
          <div><b>Distrito:</b> ${esc(IE.distrito)} – ${esc(IE.provincia)}</div>
          <div><b>Directora:</b> ${esc(IE.directora)}</div>
        </div>`);
    }

    if (c.cita) partes.push(`<div class="cita-t">“${esc(c.cita)}”</div>`);

    return partes.join('');
  }

  /* ------------------------------------------------------------------
     5.a  Lector: se hojea cara por cara.

     Cada hoja tiene dos lados de verdad (frente impreso y dorso en
     blanco) con backface-visibility, así que al girar sobre su lomo se ve
     el reverso del papel, no el frente al revés.
     ------------------------------------------------------------------ */
  function montarLector(){
    const escena = q('#lectorEscena');
    if (!escena) return null;

    escena.innerHTML = CARAS.map((c, i) => `
      <div class="hoja" data-i="${i}">
        <div class="hoja-cara frente ${c.clase}">${caraHTML(c)}</div>
        <div class="hoja-cara dorso">
          <div class="marca-agua">RPB<small>Raúl Porras Barrenechea</small></div>
        </div>
      </div>`).join('');

    const hojas  = qq('.hoja', escena);
    const puntos = q('#puntosHojas');
    const numero = q('#numHoja');
    const atras  = q('#hojaAtras');
    const adelante = q('#hojaAdelante');
    const total  = CARAS.length;
    let h = 0;

    puntos.innerHTML = CARAS.map((c, i) =>
      `<i data-i="${i}" role="button" tabindex="0" aria-label="${esc(c.rotulo_cara)}: ${esc(c.titulo)}"></i>`).join('');

    function pintar(){
      hojas.forEach((hoja, i) => {
        hoja.classList.toggle('pasada', i < h);
        hoja.classList.toggle('activa', i === h);
        hoja.classList.toggle('detras', i === h + 1);
        /* Fuera de esas tres, la hoja se oculta: así ni su dorso tapa a la
           que se está leyendo ni su sombra se suma a las demás. */
        hoja.classList.toggle('oculta', i < h - 1 || i > h + 1);
        hoja.style.zIndex = String(i < h ? i : total - i);
      });
      qq('i', puntos).forEach((p, i) => p.classList.toggle('on', i === h));
      numero.textContent = `${CARAS[h].rotulo_cara} · ${h + 1} de ${total}`;
      atras.disabled = h === 0;
      adelante.disabled = h === total - 1;
    }

    function ir(n){
      h = Math.max(0, Math.min(total - 1, n));
      pintar();
    }

    atras.onclick    = () => ir(h - 1);
    adelante.onclick = () => ir(h + 1);
    puntos.onclick   = e => { const i = e.target.dataset.i; if (i !== undefined) ir(+i); };
    puntos.onkeydown = e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const i = e.target.dataset.i;
      if (i !== undefined){ e.preventDefault(); ir(+i); }
    };
    /* Un clic en la mitad derecha de la hoja pasa; en la izquierda, vuelve. */
    escena.onclick = e => {
      const r = escena.getBoundingClientRect();
      ir(e.clientX - r.left > r.width / 2 ? h + 1 : h - 1);
    };

    /* Deslizar con el dedo */
    let x0 = null;
    escena.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive:true });
    escena.addEventListener('touchend', e => {
      if (x0 === null) return;
      const dx = (e.changedTouches[0] || {}).clientX - x0;
      x0 = null;
      if (Math.abs(dx) > 40) ir(h + (dx < 0 ? 1 : -1));
    }, { passive:true });

    /* La cara más larga manda el alto.
       Las seis caras se apilan una sobre otra, así que todas miden lo
       mismo; si ese alto se fija en el CSS, en algún ancho de pantalla el
       texto de la cara más cargada se corta. Aquí se mide el contenido
       real de cada una —scrollHeight lo informa aunque esté recortado— y
       se le da al escenario el alto de la mayor. */
    function ajustarAlto(){
      requestAnimationFrame(() => {
        let alto = 0;
        qq('.hoja .frente', escena).forEach(c => { alto = Math.max(alto, c.scrollHeight); });
        /* +8 px de holgura: el borde y el redondeo de la hoja se comen
           un par de píxeles del alto útil. */
        if (alto > 0) escena.style.height = (Math.ceil(alto) + 8) + 'px';
      });
    }

    addEventListener('resize', U.retardar(ajustarAlto, 180));
    /* Las tipografías del sistema pueden cargar después del primer pintado. */
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(ajustarAlto);
    setTimeout(ajustarAlto, 400);

    pintar();
    ajustarAlto();
    return { ir, siguiente: () => ir(h + 1), anterior: () => ir(h - 1) };
  }

  /* ------------------------------------------------------------------
     5.b  Desplegado: el folleto entero, en 3D.
     ------------------------------------------------------------------ */
  function montarDesplegado(){
    const tri = q('#folletoTri');
    if (!tri) return null;

    tri.innerHTML = `
      <div class="lado ext">
        ${TRIPTICO.exterior.map(c => `<div class="triptico-cara ${c.clase}">${caraHTML(c)}</div>`).join('')}
      </div>
      <div class="lado int">
        ${TRIPTICO.interior.map(c => `<div class="triptico-cara ${c.clase}">${caraHTML(c)}</div>`).join('')}
      </div>`;

    /* Arranca ligeramente girado: así se ve que es un objeto 3D antes de
       que el visitante toque nada. `giro` es el eje vertical (izquierda
       y derecha) e `inclinacion` el horizontal (arriba y abajo): con los
       dos, el folleto se mueve en el aire igual que si lo tuvieras en la
       mano. */
    let abierto = false, interior = false, giro = -15, inclinacion = 4;

    function matriz(){
      return `rotateX(${inclinacion}deg) rotateY(${giro + (interior ? 180 : 0)}deg)`;
    }

    function aplicar(){
      tri.classList.toggle('cerrado', !abierto);
      tri.classList.toggle('mostrando-interior', interior);
      tri.style.transform = matriz();
    }

    q('#btnAbrir').onclick = e => {
      abierto = !abierto;
      e.currentTarget.textContent = abierto ? 'Cerrar el tríptico' : 'Abrir el tríptico';
      aplicar();
    };
    q('#btnVoltear').onclick = e => {
      interior = !interior;
      e.currentTarget.textContent = interior ? 'Ver el exterior' : 'Ver el interior';
      if (interior && !abierto){
        abierto = true;
        q('#btnAbrir').textContent = 'Cerrar el tríptico';
      }
      aplicar();
    };
    q('#btnCentrar').onclick = () => { giro = -15; inclinacion = 4; aplicar(); };

    /* ----------------------------------------------------------------
       MOVERLO CON EL DEDO
       ----------------------------------------------------------------
       En el celular el problema no era el 3D: era que al arrastrar, la
       página se iba con el dedo y el folleto casi no giraba. Aquí el
       gesto se decide en los primeros píxeles —si el dedo va de lado,
       el folleto gira y la página se queda quieta; si va hacia arriba o
       abajo con claridad, se deja pasar el desplazamiento de la página—
       y además se puede inclinar el folleto, no solo girarlo.
       ---------------------------------------------------------------- */
    const escena = q('#escenaTriptico');
    let arrastrando = false, decidido = null;
    let x0 = 0, y0 = 0, giro0 = 0, inc0 = 0;

    function empezar(x, y){
      arrastrando = true; decidido = null;
      x0 = x; y0 = y; giro0 = giro; inc0 = inclinacion;
      escena.classList.add('arrastrando');
      tri.style.transition = 'none';
    }

    /* Devuelve true si el gesto se quedó con el folleto (y por tanto la
       página no debe desplazarse). */
    function mover(x, y){
      if (!arrastrando) return false;
      const dx = x - x0, dy = y - y0;

      if (decidido === null){
        /* Zona muerta de 8 px: hasta ahí no se decide nada, para no
           robarle el scroll a un toque que apenas se movió. */
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return false;
        decidido = Math.abs(dx) >= Math.abs(dy) ? 'girar' : 'pagina';
      }
      if (decidido === 'pagina') return false;

      giro = Math.max(-75, Math.min(75, giro0 + dx * 0.45));
      inclinacion = Math.max(-22, Math.min(28, inc0 - dy * 0.22));
      tri.style.transform = matriz();
      return true;
    }

    function terminar(){
      if (!arrastrando) return;
      arrastrando = false; decidido = null;
      escena.classList.remove('arrastrando');
      tri.style.transition = '';
    }

    /* Punteros unificados (dedo, ratón y lápiz) cuando el navegador los
       tiene; si no, ratón y tacto por separado. */
    if (window.PointerEvent){
      escena.addEventListener('pointerdown', e => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        empezar(e.clientX, e.clientY);
        if (e.pointerType === 'mouse') e.preventDefault();
      });
      escena.addEventListener('pointermove', e => {
        if (mover(e.clientX, e.clientY) && e.cancelable) e.preventDefault();
      }, { passive:false });
      ['pointerup','pointercancel','pointerleave'].forEach(ev =>
        escena.addEventListener(ev, terminar));
      addEventListener('pointerup', terminar);
    } else {
      escena.addEventListener('mousedown', e => { e.preventDefault(); empezar(e.clientX, e.clientY); });
      addEventListener('mousemove', e => mover(e.clientX, e.clientY));
      addEventListener('mouseup', terminar);
      escena.addEventListener('touchstart', e => {
        const t = e.touches[0]; empezar(t.clientX, t.clientY);
      }, { passive:true });
      escena.addEventListener('touchmove', e => {
        const t = e.touches[0];
        if (mover(t.clientX, t.clientY) && e.cancelable) e.preventDefault();
      }, { passive:false });
      escena.addEventListener('touchend', terminar, { passive:true });
      escena.addEventListener('touchcancel', terminar, { passive:true });
    }

    /* Doble toque: lo abre y lo cierra, sin ir a buscar el botón. */
    escena.addEventListener('dblclick', () => { q('#btnAbrir').click(); });

    /* Teclado, para quien no usa el ratón. */
    escena.tabIndex = 0;
    escena.setAttribute('role', 'group');
    escena.setAttribute('aria-label', 'Tríptico institucional en tres dimensiones');
    escena.addEventListener('keydown', e => {
      const paso = e.shiftKey ? 15 : 6;
      if (e.key === 'ArrowLeft'){  giro = Math.max(-75, giro - paso); }
      else if (e.key === 'ArrowRight'){ giro = Math.min(75, giro + paso); }
      else if (e.key === 'ArrowUp'){ inclinacion = Math.min(28, inclinacion + paso); }
      else if (e.key === 'ArrowDown'){ inclinacion = Math.max(-22, inclinacion - paso); }
      else if (e.key === 'Enter' || e.key === ' '){ q('#btnAbrir').click(); }
      else return;
      e.preventDefault();
      aplicar();
    });

    aplicar();
    return {
      abrir(){
        if (abierto) return;
        abierto = true;
        q('#btnAbrir').textContent = 'Cerrar el tríptico';
        aplicar();
      },
    };
  }

  /* ------------------------------------------------------------------
     5.c  Ensamblado: los dos modos y el cambio entre ellos.
     ------------------------------------------------------------------ */
  function montarTriptico(){
    const lector = montarLector();
    const desplegado = montarDesplegado();
    if (!lector || !desplegado) return;

    const paneles = { hojear: q('#modoHojear'), desplegar: q('#modoDesplegar') };
    let modo = 'hojear';

    qq('.folleto-modos .modo').forEach(b => {
      b.onclick = () => {
        modo = b.dataset.modo;
        qq('.folleto-modos .modo').forEach(o => {
          const activo = o === b;
          o.classList.toggle('activo', activo);
          o.setAttribute('aria-selected', String(activo));
        });
        paneles.hojear.hidden    = modo !== 'hojear';
        paneles.desplegar.hidden = modo !== 'desplegar';
        const pista = q('#pistaRaton');
        if (pista) pista.textContent = modo === 'hojear'
          ? 'Usa las flechas del teclado para pasar las caras · '
          : 'Arrástralo con el dedo o el ratón para girarlo e inclinarlo · doble toque para abrirlo · ';
        /* Al entrar al modo desplegado se abre solo: cerrado no se ve nada. */
        if (modo === 'desplegar') setTimeout(desplegado.abrir, 260);
      };
    });

    /* Flechas del teclado, solo cuando el tríptico está a la vista. */
    addEventListener('keydown', e => {
      if (modo !== 'hojear') return;
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const cab = q('#triptico').getBoundingClientRect();
      if (cab.bottom < 120 || cab.top > innerHeight - 120) return;
      const dentroDeCampo = /INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '');
      if (dentroDeCampo) return;
      e.preventDefault();
      e.key === 'ArrowRight' ? lector.siguiente() : lector.anterior();
    });

    /* Enlace al tríptico escaneado (las imágenes originales). */
    q('#verEscaneado').onclick = e => {
      e.preventDefault();
      abrirVisorEscaneado();
    };
  }

  /* Visor con las páginas escaneadas del tríptico impreso. */
  function abrirVisorEscaneado(){
    const paginas = [
      { archivo:'triptico_portada.jpg',    titulo:'Portada · Matrícula abierta 2026' },
      { archivo:'triptico_interior_1.jpg', titulo:'Presentación y costos' },
      { archivo:'triptico_interior_2.jpg', titulo:'Mensaje al padre de familia' },
      { archivo:'triptico_interior_3.jpg', titulo:'Cómo reforzar en casa' },
      { archivo:'triptico_exterior_1.jpg', titulo:'Niveles y talleres' },
      { archivo:'triptico_exterior_2.jpg', titulo:'Requisitos y contacto' },
    ];

    UI.modal({
      titulo:'Tríptico escaneado',
      subtitulo:'El folleto impreso, tal como se entrega en secretaría. Toca una página para verla en grande.',
      ancho:'ancha',
      cuerpo:`<div class="rejilla-auto-150">
        ${paginas.map(p => `
          <figure data-ver="${esc(RUTA.img(p.archivo))}" style="cursor:zoom-in;border-radius:var(--r-md);
                  overflow:hidden;border:1px solid var(--linea);box-shadow:var(--sombra-1)">
            <img src="${esc(RUTA.img(p.archivo))}" alt="${esc(p.titulo)}" loading="lazy">
            <figcaption class="t-xs t-mudo pad-sm">${esc(p.titulo)}</figcaption>
          </figure>`).join('')}
      </div>`,
      botones:[{ texto:'Cerrar', clase:'btn-claro', esperando:false }],
    });
  }

  function montarVisor(){
    const visor = q('#visor'), img = q('#visorImg');
    document.addEventListener('click', e => {
      const fig = e.target.closest('[data-ver]');
      if (fig){ img.src = fig.dataset.ver; visor.classList.add('abierto'); }
    });
    const cerrar = () => visor.classList.remove('abierto');
    q('#cerrarVisor').onclick = cerrar;
    visor.onclick = e => { if (e.target === visor) cerrar(); };
    addEventListener('keydown', e => { if (e.key === 'Escape') cerrar(); });
  }

  /* ==================================================================
     6. FICHA DE LA INSTITUCIÓN  (junto a la historia)
     ================================================================== */
  async function montarFichaInstitucion(){
    const caja = q('#fichaInstitucion');
    if (!caja) return;

    let matriculados = null, aulas = null;
    try {
      const [alumnos, grados] = await Promise.all([
        Datos.estudiantes.contar({ estado:'Matriculado', anio: IE.anio }),
        Datos.grados.contar(),
      ]);
      matriculados = alumnos;
      aulas = grados;
    } catch(e){ /* sin datos se muestran solo las cifras institucionales */ }

    const dato = (icono, rotulo, valor) => `
      <div class="dato-ie">
        <span class="ic">${icono}</span>
        <div><small>${esc(rotulo)}</small><b>${esc(valor)}</b></div>
      </div>`;

    caja.innerHTML = `
      <div class="ficha-ie-cabeza">
        <span class="escudo escudo-g"><span>RPB</span></span>
        <div>
          <h3>La institución</h3>
          <p>Datos de la ficha oficial</p>
        </div>
      </div>
      <div class="datos-ie">
        ${dato('👩‍💼', 'Directora', IE.directora)}
        ${dato('📍', 'Dirección', IE.direccion)}
        ${dato('🗺️', 'Distrito', `${IE.distrito} — ${IE.provincia}, ${IE.region}`)}
        ${dato('📞', 'Teléfono', IE.telefono)}
        ${dato('🏫', 'Niveles', IE.niveles_texto)}
        ${dato('🎒', 'Estudiantes', matriculados == null ? `Año ${IE.anio}` : `${matriculados} matriculados en ${IE.anio}`)}
        ${dato('🚪', 'Aulas', aulas == null ? `${IE.aforo_aula} por ambiente` : `${aulas} ambientes · ${IE.aforo_aula} por aula`)}
        ${dato('⭐', 'Trayectoria', `${IE.anios_servicio} años de servicio continuo`)}
      </div>
      <p class="lema-ie">«${esc(IE.lema)}»</p>`;
  }

  /* ==================================================================
     7. VACANTES POR AULA  (página de matrícula)
     ================================================================== */
  async function cargarVacantes(){
    const cont = q('#listaVacantes');
    if (!cont) return;
    try {
      const [{ filas: grados }, { filas: alumnos }] = await Promise.all([
        Datos.grados.listar({}, { orden:'orden', asc:true }),
        Datos.estudiantes.listar({ estado:'Matriculado', anio: IE.anio }, { columnas:'id,grado' }),
      ]);

      const porGrado = U.contarPor(alumnos, 'grado');
      const lista = grados.length ? grados : GRADOS.map((g, i) => ({
        nombre:g, nivel:U.nivelDeGrado(g), vacantes:IE.aforo_aula, orden:i,
      }));

      cont.innerHTML = lista.map(g => {
        const ocupadas = porGrado[g.nombre] || 0;
        const cupo = g.vacantes || IE.aforo_aula;
        const libres = Math.max(0, cupo - ocupadas);
        const clase = libres === 0 ? 'e-rojo' : libres <= 3 ? 'e-naranja' : 'e-verde';
        return `
          <article class="grado">
            <div class="top">
              <span class="loseta ${g.nivel === 'Inicial' ? 'l-oro' : 'l-marino'}">
                ${g.nivel === 'Inicial' ? '🧸' : '📚'}</span>
              <div>
                <b>${esc(g.nombre)}</b>
                <small>${esc(g.nivel)}${g.aula ? ' · ' + esc(g.aula) : ''}</small>
              </div>
            </div>
            <div class="barra ${libres === 0 ? 'roja' : ''}"><i style="width:${Math.min(100, U.pct(ocupadas, cupo))}%"></i></div>
            <div class="pie">
              <small class="t-mudo">${ocupadas} de ${cupo} estudiantes</small>
              <span class="etiqueta ${clase}">${libres === 0 ? 'Sin vacantes' : libres + ' vacante' + (libres === 1 ? '' : 's')}</span>
            </div>
          </article>`;
      }).join('');

    } catch(e){
      cont.innerHTML = `<div class="banda banda-mal col-entera">
        <span class="ic">⚠️</span><div>No pudimos cargar las vacantes: ${esc(e.message)}</div></div>`;
    }
  }

  /* ==================================================================
     8. CALENDARIO
     ================================================================== */
  const CALENDARIO = [
    { mes:'Marzo',     titulo:'Inicio del año escolar',   detalle:'Bienvenida y semana de adaptación.',            icono:'🎒', color:'l-oro' },
    { mes:'Mayo',      titulo:'Cierre del I bimestre',    detalle:'Entrega de informes de progreso.',              icono:'📋', color:'l-marino' },
    { mes:'Julio',     titulo:'Fiestas patrias',          detalle:'Desfile institucional y actividades cívicas.',  icono:'🇵🇪', color:'l-rojo' },
    { mes:'Agosto',    titulo:'Cierre del II bimestre',   detalle:'Reunión con padres de familia.',                icono:'👨‍👩‍👧', color:'l-oro' },
    { mes:'Setiembre', titulo:'Semana de la juventud',    detalle:'Talleres de cómputo, danza y deporte.',         icono:'🎨', color:'l-azul' },
    { mes:'Octubre',   titulo:'Cierre del III bimestre',  detalle:'Evaluación de avances y refuerzo.',             icono:'📚', color:'l-morado' },
    { mes:'Noviembre', titulo:'Matrícula anticipada',     detalle:'Reserva de vacantes para el próximo año.',      icono:'📝', color:'l-naranja' },
    { mes:'Diciembre', titulo:'Clausura del año escolar', detalle:'Entrega de libretas y ceremonia final.',        icono:'🎓', color:'l-marino' },
  ];

  function pintarCalendario(){
    const cont = q('#listaCalendario');
    if (!cont) return;
    cont.innerHTML = CALENDARIO.map(c => `
      <div class="atajo cursor-normal">
        <span class="loseta ${c.color}">${c.icono}</span>
        <b>${esc(c.mes)}</b>
        <small><b class="t-tinta">${esc(c.titulo)}</b><br>${esc(c.detalle)}</small>
      </div>`).join('');
  }

  /* ==================================================================
     9. COMUNICADOS EN TIEMPO REAL
     ================================================================== */
  let comunicadosTodos = [], filtroCom = 'todos';

  function pintarComunicados(){
    const cont = q('#listaComunicados');
    if (!cont) return;

    const lista = filtroCom === 'todos'
      ? comunicadosTodos
      : comunicadosTodos.filter(c => (c.etiqueta || 'General') === filtroCom);

    const contador = q('#contadorComunicados');
    if (contador) contador.textContent = comunicadosTodos.length
      ? `${lista.length} de ${comunicadosTodos.length} publicados`
      : 'Sin comunicados';

    if (!lista.length){
      cont.innerHTML = `<div class="tarjeta t-c t-mudo">
        ${comunicadosTodos.length ? 'No hay comunicados con esa etiqueta.' : 'Todavía no hay comunicados publicados.'}
      </div>`;
      return;
    }

    cont.innerHTML = lista.map(c => `
      <article class="comunicado${c.urgente ? ' urgente' : ''}">
        <h4>${c.urgente ? '🔴 ' : ''}${esc(c.titulo)}</h4>
        <p>${esc(c.cuerpo)}</p>
        <div class="meta">
          <span class="etiqueta ${c.urgente ? 'e-rojo' : 'e-oro'}">${esc(c.etiqueta || 'General')}</span>
          <span>👤 ${esc(c.publicado_por || 'Dirección')}</span>
          <span>🕒 ${esc(U.hace(c.creado_en))}</span>
          ${c.dirigido_a && c.dirigido_a !== 'Todos' ? `<span>🎯 ${esc(c.dirigido_a)}</span>` : ''}
        </div>
      </article>`).join('');
  }

  function pintarFiltrosComunicados(){
    const caja = q('#filtrosComunicados');
    if (!caja) return;
    const etiquetas = [...new Set(comunicadosTodos.map(c => c.etiqueta || 'General'))].sort();
    caja.innerHTML = ['todos', ...etiquetas].map(e =>
      `<button class="chip-com${e === filtroCom ? ' on' : ''}" data-etiq="${esc(e)}">
         ${e === 'todos' ? 'Todos' : esc(e)}
       </button>`).join('');
    caja.onclick = ev => {
      const b = ev.target.closest('[data-etiq]');
      if (!b) return;
      filtroCom = b.dataset.etiq;
      pintarFiltrosComunicados();
      pintarComunicados();
    };
  }

  async function cargarComunicados(){
    const cont = q('#listaComunicados');
    if (!cont) return;
    try {
      const { filas } = await Datos.comunicados.listar({},
        { limite: 60, columnas: Datos.adjuntos.columnas('comunicados') });
      comunicadosTodos = filas.filter(c =>
        c.visible_portal !== 0 && (c.estado || 'Publicado') === 'Publicado');
      pintarFiltrosComunicados();
      pintarComunicados();
    } catch(e){
      cont.innerHTML = `<div class="banda banda-mal"><span class="ic">⚠️</span>
        <div>No pudimos cargar los comunicados: ${esc(e.message)}</div></div>`;
    }
  }

  function escucharComunicados(){
    if (!db || !q('#listaComunicados')) return;
    Datos.comunicados.escuchar(carga => {
      cargarComunicados();
      if (carga.eventType === 'INSERT' && carga.new && carga.new.visible_portal !== 0
          && (carga.new.estado || 'Publicado') === 'Publicado'){
        UI.aviso(`📣 ${carga.new.titulo}`, carga.new.urgente ? 'alerta' : 'info', 7);
      }
    });
  }

  /* ==================================================================
     10. SOLICITUDES: VACANTE Y ENTREVISTA
     ================================================================== */
  function limpiarFormulario(form){
    form.reset();
    qq('.caja', form).forEach(c => c.classList.remove('ok', 'mal'));
    qq('.pista', form).forEach(p => p.classList.remove('ver'));
  }

  /* Los campos de la solicitud de vacante: lo que pide la ficha única de
     matrícula, con su propia validación cada uno. */
  const CAMPOS_SOLICITUD = [
    { id:'nombres',   etiqueta:'Nombres del niño o niña', icono:'🧒', requerido:true, limpiar:'nombre',
      valida:v => U.val.largo(v, 2, 60) || 'Escribe el nombre completo.' },
    { id:'apellidos', etiqueta:'Apellidos', icono:'👪', requerido:true, limpiar:'nombre',
      valida:v => U.val.largo(v, 2, 60) || 'Escribe los apellidos completos.' },
    { id:'dni',       etiqueta:'DNI del niño o niña', icono:'🪪', requerido:true, limpiar:'dni',
      pista:'8 dígitos', atributos:{ inputmode:'numeric', maxlength:8 },
      valida:v => U.dniPlausible(v) || 'El DNI debe tener 8 dígitos válidos.' },
    { id:'fecha_nac', etiqueta:'Fecha de nacimiento', tipo:'date', icono:'🎂', requerido:true,
      valida:v => { const e = U.edad(v); return (e !== null && e >= 2 && e <= 14) || 'La edad debe estar entre 2 y 14 años.'; } },
    { id:'grado_solicitado', etiqueta:'Grado al que postula', tipo:'select', icono:'🏫', requerido:true,
      opciones:GRADOS },
    { id:'apoderado', etiqueta:'Nombre del apoderado', icono:'🧑', requerido:true, limpiar:'nombre',
      valida:v => U.val.largo(v, 5, 90) || 'Escribe nombres y apellidos del apoderado.' },
    { id:'dni_apoderado', etiqueta:'DNI del apoderado', icono:'🪪', requerido:true, limpiar:'dni',
      atributos:{ inputmode:'numeric', maxlength:8 },
      valida:v => U.dniPlausible(v) || 'El DNI del apoderado debe tener 8 dígitos.' },
    { id:'celular',   etiqueta:'Celular de contacto', icono:'📱', requerido:true, limpiar:'num',
      pista:'9XXXXXXXX', atributos:{ inputmode:'numeric', maxlength:9 },
      valida:v => U.val.celular(v) || 'El celular debe empezar en 9 y tener 9 dígitos.' },
    { id:'correo',    etiqueta:'Correo electrónico', tipo:'email', icono:'✉️',
      valida:v => U.val.correo(v) || 'Revisa el correo: falta el @ o el dominio.' },
    { id:'mensaje',   etiqueta:'Mensaje o consulta', tipo:'area', filas:3, ancho:'completo',
      pista:'Cuéntanos brevemente lo que necesitas (opcional).' },
  ];

  function montarSolicitud(){
    const caja = q('#camposSolicitud');
    if (!caja) return;
    caja.append(UI.formulario(CAMPOS_SOLICITUD, { columnas:2 }));

    const form  = q('#formSolicitud');
    const error = q('#errorSolicitud');
    const btn   = q('#btnSolicitud');

    CAMPOS_SOLICITUD.forEach(c => {
      const el = q('#' + c.id);
      if (!el || !c.valida) return;
      el.addEventListener('blur', () => {
        if (!el.value.trim()) return;
        const datos = UI.leerFormulario(form, CAMPOS_SOLICITUD);
        const r = c.valida(datos[c.id], datos);
        UI.marcarCampo(form, c.id, r === true ? 'Correcto' : r, r === true);
      });
    });

    ['dni','dni_apoderado'].forEach(id => {
      const el = q('#' + id);
      if (el) el.addEventListener('input', () => el.value = U.soloDigitos(el.value, 8));
    });
    const cel = q('#celular');
    if (cel) cel.addEventListener('input', e => e.target.value = U.soloDigitos(e.target.value, 9));

    const campoDni = q('#dni');
    if (campoDni) campoDni.addEventListener('blur', async (e) => {
      const dni = U.soloDigitos(e.target.value, 8);
      if (!U.dniPlausible(dni)) return;
      try {
        const ya = await Datos.estudiantes.dniOcupado(dni);
        if (ya) UI.marcarCampo(form, 'dni', 'Ese DNI ya figura matriculado. Ingresa al sistema con ese DNI.', false);
      } catch {}
    });

    form.onsubmit = async (ev) => {
      ev.preventDefault();
      error.classList.add('oculto');

      const datos = UI.leerFormulario(form, CAMPOS_SOLICITUD);
      if (!UI.validarFormulario(form, CAMPOS_SOLICITUD, datos)){
        error.innerHTML = '<span class="ic">⚠️</span><div>Revisa los campos marcados en rojo.</div>';
        error.classList.remove('oculto');
        return;
      }

      btn.disabled = true; btn.textContent = 'Enviando…';
      const t0 = performance.now();

      try {
        const yaMatriculado = await Datos.estudiantes.dniOcupado(datos.dni);
        if (yaMatriculado)
          throw new Error('Ese DNI ya está matriculado en la institución. Ingresa al sistema con ese DNI.');

        const repetida = await Datos.solicitudes.buscarUno({ dni: datos.dni, estado:'Pendiente' });
        if (repetida)
          throw new Error('Ya tenemos una solicitud pendiente con ese DNI. Administración te contactará pronto.');

        const folio = U.folio('SOL');
        await Datos.solicitudes.crear({
          ...datos, folio, anio: IE.anio, estado:'Pendiente', origen:'Portal público',
          tipo:'Vacante',
        });

        Datos.notificaciones.enviar(
          'Nueva solicitud de vacante',
          `${datos.apellidos}, ${datos.nombres} — ${datos.grado_solicitado}`,
          ROLES.administrativo.nombre);
        Datos.auditar('Solicitud de vacante recibida', 'Admisión',
          { ms: Math.round(performance.now() - t0), detalle: folio });

        limpiarFormulario(form);

        UI.modal({
          titulo:'¡Solicitud enviada!',
          subtitulo:`Folio ${folio}`,
          cuerpo:`
            <div class="banda banda-ok mb16"><span class="ic">✅</span>
              <div>Recibimos tu solicitud en <b>${U.ms(Math.round(performance.now() - t0))}</b>.</div></div>
            <p class="t-2 t-alto">Guarda el folio <b class="t-mono">${esc(folio)}</b>.
            La oficina administrativa la revisará y te llamará al
            <b>${esc(datos.celular)}</b> para completar la matrícula.</p>
            <p class="t-2 t-alto mt12">Horario de atención: ${esc(IE.horario_atencion)}.</p>`,
          botones:[{ texto:'Entendido', clase:'btn-oro', esperando:false }],
        });

      } catch(e){
        error.innerHTML = `<span class="ic">⛔️</span><div>${esc(e.message)}</div>`;
        error.classList.remove('oculto');
      } finally {
        btn.disabled = false; btn.textContent = 'Enviar solicitud';
      }
    };
  }

  /* ---- Entrevista con la directora --------------------------------- */
  const CAMPOS_ENTREVISTA = [
    { id:'apoderado', etiqueta:'Tu nombre completo', icono:'🧑', requerido:true, limpiar:'nombre',
      ancho:'completo',
      valida:v => U.val.largo(v, 5, 90) || 'Escribe tu nombre y apellidos.' },
    { id:'celular', etiqueta:'Celular', icono:'📱', requerido:true, limpiar:'num',
      atributos:{ inputmode:'numeric', maxlength:9 },
      valida:v => U.val.celular(v) || 'Celular de 9 dígitos que empiece en 9.' },
    { id:'correo', etiqueta:'Correo (opcional)', tipo:'email', icono:'✉️',
      valida:v => !v || U.val.correo(v) || 'Revisa el correo.' },
    { id:'motivo', etiqueta:'¿De qué quieres conversar?', tipo:'select', icono:'💬', requerido:true,
      opciones:['Matrícula de mi hijo o hija', 'Conocer la institución', 'Traslado desde otro colegio',
                'Situación académica', 'Situación de convivencia', 'Otro asunto'] },
    { id:'preferencia', etiqueta:'¿Cuándo te queda mejor?', tipo:'select', icono:'🕒', requerido:true,
      opciones:['Cualquier día por la mañana', 'Cualquier día por la tarde',
                'Lunes o martes', 'Miércoles o jueves', 'Viernes'] },
    { id:'mensaje', etiqueta:'Cuéntanos en dos líneas', tipo:'area', icono:'📝', ancho:'completo', filas:3,
      pista:'Así la directora llega a la reunión sabiendo de qué se trata.',
      valida:v => !v || U.val.largo(v, 0, 400) || 'Máximo 400 caracteres.' },
  ];

  function montarEntrevista(){
    const caja = q('#camposEntrevista');
    if (!caja) return;
    caja.append(UI.formulario(CAMPOS_ENTREVISTA, { columnas:2 }));

    const nombre = q('#nombreDirectora');
    if (nombre) nombre.textContent = IE.directora;

    const form  = q('#formEntrevista');
    const error = q('#errorEntrevista');
    const btn   = q('#btnEntrevista');

    const cel = q('#celular', form);
    if (cel) cel.addEventListener('input', e => e.target.value = U.soloDigitos(e.target.value, 9));

    form.onsubmit = async (ev) => {
      ev.preventDefault();
      error.classList.add('oculto');

      const datos = UI.leerFormulario(form, CAMPOS_ENTREVISTA);
      if (!UI.validarFormulario(form, CAMPOS_ENTREVISTA, datos)){
        error.innerHTML = '<span class="ic">⚠️</span><div>Revisa los campos marcados en rojo.</div>';
        error.classList.remove('oculto');
        return;
      }

      btn.disabled = true; btn.textContent = 'Enviando…';
      const t0 = performance.now();

      try {
        const folio = U.folio('ENT');
        /* La cita viaja por la mesa de partes: así queda numerada, con
           estado y con un responsable, igual que cualquier otro trámite. */
        await Datos.documentos.crear({
          codigo: folio,
          tipo: 'Solicitud',
          asunto: `Entrevista con la dirección — ${datos.motivo}`,
          remitente: datos.apoderado,
          destinatario: ROLES.director.nombre,
          detalle: [
            `Motivo: ${datos.motivo}`,
            `Disponibilidad: ${datos.preferencia}`,
            `Celular: ${datos.celular}`,
            datos.correo ? `Correo: ${datos.correo}` : null,
            datos.mensaje ? `Mensaje: ${datos.mensaje}` : null,
          ].filter(Boolean).join(' · '),
          estado: 'Recibido',
          registrado_por: 'Portal público',
        });

        Datos.notificaciones.enviar(
          'Pedido de entrevista con la dirección',
          `${datos.apoderado} — ${datos.motivo} · ${datos.preferencia}`,
          ROLES.director.nombre);
        Datos.auditar('Entrevista solicitada', 'Dirección',
          { ms: Math.round(performance.now() - t0), detalle: folio });

        limpiarFormulario(form);

        UI.modal({
          titulo:'Pedido registrado',
          subtitulo:`Folio ${folio}`,
          cuerpo:`
            <div class="banda banda-ok mb16"><span class="ic">✅</span>
              <div>Tu pedido llegó a la dirección en <b>${U.ms(Math.round(performance.now() - t0))}</b>.</div></div>
            <p class="t-2 t-alto">Desde secretaría te llamarán al <b>${esc(datos.celular)}</b>
            para confirmar el día y la hora con <b>${esc(IE.directora)}</b>.</p>
            <p class="t-2 t-alto mt12">Horario de atención: ${esc(IE.horario_atencion)}.
            Guarda el folio <b class="t-mono">${esc(folio)}</b>.</p>`,
          botones:[{ texto:'Entendido', clase:'btn-marino', esperando:false }],
        });

      } catch(e){
        error.innerHTML = `<span class="ic">⛔️</span><div>${esc(e.message)}</div>`;
        error.classList.remove('oculto');
      } finally {
        btn.disabled = false; btn.textContent = 'Pedir la entrevista';
      }
    };
  }

  /* Las dos solicitudes comparten sección y se alternan con pestañas. */
  function montarPestanasTramite(){
    const botones = qq('.pestanas-tramite .tramite');
    if (!botones.length) return;
    const paneles = { vacante: q('#panelVacante'), entrevista: q('#panelEntrevista') };

    const mostrar = cual => {
      botones.forEach(b => {
        const activo = b.dataset.tramite === cual;
        b.classList.toggle('activo', activo);
        b.setAttribute('aria-selected', String(activo));
      });
      Object.entries(paneles).forEach(([k, el]) => el && el.classList.toggle('oculto', k !== cual));
    };

    botones.forEach(b => { b.onclick = () => mostrar(b.dataset.tramite); });
    if (location.hash === '#entrevista') mostrar('entrevista');
    addEventListener('hashchange', () => {
      if (location.hash === '#entrevista') mostrar('entrevista');
      if (location.hash === '#solicitud') mostrar('vacante');
    });
  }

  /* ==================================================================
     11. APARICIÓN AL DESPLAZAR
     ================================================================== */
  function prepararApariciones(){
    const obs = new IntersectionObserver(ent => {
      ent.forEach(e => { if (e.isIntersecting){ e.target.classList.add('visible'); obs.unobserve(e.target); } });
    }, { threshold:.12 });
    qq('.aparece').forEach(el => obs.observe(el));
  }

  /* ==================================================================
     12. ARRANQUE
     ------------------------------------------------------------------
     Las tres páginas comparten este archivo. Cada una dice quién es en
     <body data-pagina="…"> y aquí se monta solo lo suyo; el resto de las
     funciones ni se llaman. Así no hay tres archivos que mantener en
     paralelo ni una página carga el código de otra.
     ================================================================== */
  function iniciar(){
    const pagina = document.body.dataset.pagina || 'inicio';

    /* Común a las tres */
    pintarDatosFijos();
    prepararBarra();
    prepararApariciones();
    /* Si Soporte ya subió un logotipo, reemplaza la insignia "RPB" en toda
       la página (barra, portada, pie). Si no hay ninguno, no cambia nada. */
    Datos.config.obtener('logo_url').then(U.aplicarLogo).catch(() => {});
    /* En Matrícula el chat ya vive empotrado en su propia sección: montar
       además la burbuja flotante daba dos chats en la misma pantalla y el
       empotrado, sin alto fijo, empujaba toda la página hacia abajo cada
       vez que llegaba una respuesta larga. Aquí va solo uno. */
    if (pagina !== 'matricula') Chatbot.montarFlotante();
    U.tiltar3D('.tarjeta-3d', 7);

    const soporte = q('#enlaceSoporte');
    if (soporte) soporte.onclick = e => {
      e.preventDefault();
      Chatbot.abrir('Necesito ayuda con el acceso al sistema');
    };

    if (pagina === 'inicio'){
      prepararContadores();
      montarFachada();
      montarFichaInstitucion();
      montarLugares();
      montarAulas();
      montarTriptico();
      montarVisor();
    }

    if (pagina === 'comunicados'){
      cargarComunicados();
      escucharComunicados();
      pintarCalendario();
    }

    if (pagina === 'matricula'){
      cargarVacantes();
      montarSolicitud();
      montarEntrevista();
      montarPestanasTramite();
      Chatbot.montarEmpotrado();

      const abrir = q('#btnAbrirChat');
      if (abrir) abrir.onclick = () => { const t = q('#chatTexto'); if (t) t.focus(); };
      const llamar = q('#btnLlamar');
      if (llamar) llamar.href = 'tel:' + String(IE.telefono).replace(/\s/g, '');
      const ventajas = q('#ventajasChat');
      if (ventajas) ventajas.innerHTML = [
        ['Vacantes reales.', 'Te dice cuántos cupos quedan por aula, ahora mismo.'],
        ['Requisitos y costos.', 'Los mismos del tríptico, sin que tengas que buscarlos.'],
        ['Te lleva al formulario.', 'Si quieres postular o conversar con la directora, te abre el que toca.'],
        ['Si no sabe, lo deriva.', 'Abre un ticket para el área de soporte y te da un código.'],
      ].map(([b, t]) => `<li><span class="ic">✓</span><span><b>${b}</b> ${t}</span></li>`).join('');
    }

    /* Registro de lectura: alimenta el indicador de difusión. */
    if (db){
      db.from('lecturas').insert({
        comunicado: 'Portal · ' + pagina,
        visitante: 'Anónimo',
        dispositivo: /Mobi|Android/i.test(navigator.userAgent) ? 'Móvil' : 'Escritorio',
      }).then(() => {}, () => {});
    }
  }

  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
