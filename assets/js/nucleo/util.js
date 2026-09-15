/* =====================================================================
   UTILIDADES GENERALES
   Formato, fechas, validación, texto seguro, CSV y pequeños ayudantes.
   No depende de Supabase: es JavaScript puro y se puede probar aislado.
   ===================================================================== */
'use strict';

const U = (() => {

  /* ------------------------------------------------------------------
     Selección de elementos (atajos cortos)
     ------------------------------------------------------------------ */
  const q  = (sel, raiz = document) => raiz.querySelector(sel);
  const qq = (sel, raiz = document) => Array.from(raiz.querySelectorAll(sel));

  /* Crea un elemento con clases, atributos e hijos en una sola línea. */
  function crear(etiqueta, props = {}, ...hijos){
    const el = document.createElement(etiqueta);
    for (const [k, v] of Object.entries(props)){
      if (k === 'clase')      el.className = v;
      else if (k === 'html')  el.innerHTML = v;
      else if (k === 'texto') el.textContent = v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (v !== null && v !== undefined && v !== false) el.setAttribute(k, v);
    }
    hijos.flat().forEach(h => h != null && el.append(h));
    return el;
  }

  /* ------------------------------------------------------------------
     Texto seguro — antepuesto a CUALQUIER dato que llegue de la base
     de datos o del usuario antes de insertarlo en el HTML (anti-XSS).
     ------------------------------------------------------------------ */
  const MAPA_ESCAPE = { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' };
  function esc(t){
    if (t === null || t === undefined) return '';
    return String(t).replace(/[&<>"']/g, c => MAPA_ESCAPE[c]);
  }

  /* Limpia un texto libre: recorta, colapsa espacios y quita caracteres
     de control. Se usa antes de guardar en la base de datos. */
  function limpiar(t, largo = 500){
    if (t === null || t === undefined) return '';
    return String(t)
      .replace(/[\u0000-\u001F\u007F]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, largo);
  }

  /* Solo dígitos (DNI, celular, códigos). */
  const soloDigitos = (t, largo = 15) => String(t || '').replace(/\D/g, '').slice(0, largo);

  /* Nombre propio: quita símbolos raros, deja letras, tildes y espacios. */
  function limpiarNombre(t, largo = 120){
    return String(t || '')
      .replace(/[^\p{L}\p{M}\s'.\-]/gu, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, largo);
  }

  const may = t => String(t || '').toLocaleUpperCase('es-PE');
  function capitalizar(t){
    return String(t || '').toLocaleLowerCase('es-PE')
      .replace(/(^|\s|-)([\p{L}])/gu, (_, a, b) => a + b.toLocaleUpperCase('es-PE'));
  }

  /* Quita tildes: sirve para buscar "Perez" y encontrar "Pérez". */
  const sinTildes = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  /* Iniciales para el avatar. */
  function iniciales(nombre){
    const partes = String(nombre || '?').trim().split(/\s+/).filter(Boolean);
    if (!partes.length) return '?';
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  }

  /* ------------------------------------------------------------------
     Validaciones
     ------------------------------------------------------------------ */
  const val = {
    dni:      v => /^\d{8}$/.test(String(v || '').trim()),
    celular:  v => /^9\d{8}$/.test(String(v || '').trim()),
    correo:   v => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(String(v || '').trim()),
    usuario:  v => /^[a-z0-9._-]{4,24}$/i.test(String(v || '').trim()),
    nota:     v => { const n = parseFloat(v); return !isNaN(n) && n >= 0 && n <= 20; },
    fecha:    v => !isNaN(new Date(v).getTime()),
    noVacio:  v => String(v || '').trim().length > 0,
    largo:    (v, min, max) => { const l = String(v || '').trim().length; return l >= min && l <= max; },
  };

  /* Dígito verificador del DNI peruano (validación adicional de forma).
     No sustituye a RENIEC, pero descarta muchos números mal tecleados. */
  function dniPlausible(dni){
    if (!val.dni(dni)) return false;
    if (/^(\d)\1{7}$/.test(dni)) return false;   // 00000000, 11111111...
    return true;
  }

  /* Fuerza de una contraseña: 0 a 4. */
  function fuerzaClave(clave){
    const c = String(clave || '');
    let p = 0;
    if (c.length >= 8) p++;
    if (c.length >= 12) p++;
    if (/[a-z]/.test(c) && /[A-Z]/.test(c)) p++;
    if (/\d/.test(c)) p++;
    if (/[^A-Za-z0-9]/.test(c)) p++;
    return Math.min(4, p);
  }

  /* ------------------------------------------------------------------
     Fechas y horas (siempre en español del Perú)
     ------------------------------------------------------------------ */
  const TZ = 'America/Lima';

  function fecha(f, opciones){
    if (!f) return '—';
    const d = new Date(f);
    if (isNaN(d)) return '—';
    return d.toLocaleDateString('es-PE', opciones || { day:'2-digit', month:'2-digit', year:'numeric' });
  }
  function fechaLarga(f){
    if (!f) return '—';
    const d = new Date(f);
    if (isNaN(d)) return '—';
    return d.toLocaleDateString('es-PE', { day:'numeric', month:'long', year:'numeric' });
  }
  function fechaHora(f){
    if (!f) return '—';
    const d = new Date(f);
    if (isNaN(d)) return '—';
    return d.toLocaleString('es-PE', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
  }
  function hora(f){
    if (!f) return '—';
    const d = new Date(f);
    return isNaN(d) ? '—' : d.toLocaleTimeString('es-PE', { hour:'2-digit', minute:'2-digit' });
  }

  /* "hace 5 minutos", "ayer", "hace 3 días" */
  function hace(f){
    if (!f) return '—';
    const d = new Date(f);
    if (isNaN(d)) return '—';
    const seg = Math.floor((Date.now() - d.getTime()) / 1000);
    if (seg < 60)    return 'hace un momento';
    if (seg < 3600)  return `hace ${Math.floor(seg/60)} min`;
    if (seg < 86400) return `hace ${Math.floor(seg/3600)} h`;
    if (seg < 172800) return 'ayer';
    if (seg < 2592000) return `hace ${Math.floor(seg/86400)} días`;
    return fecha(f);
  }

  /* Días que faltan (positivo) o que pasaron (negativo). */
  function diasHasta(f){
    if (!f) return null;
    const d = new Date(f); if (isNaN(d)) return null;
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    d.setHours(0,0,0,0);
    return Math.round((d - hoy) / 86400000);
  }

  function edad(fechaNac){
    if (!fechaNac) return null;
    const n = new Date(fechaNac); if (isNaN(n)) return null;
    const h = new Date();
    let a = h.getFullYear() - n.getFullYear();
    const m = h.getMonth() - n.getMonth();
    if (m < 0 || (m === 0 && h.getDate() < n.getDate())) a--;
    return a;
  }

  /* Fecha de hoy en formato aaaa-mm-dd (para <input type="date">). */
  function hoyISO(){
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  /* Nombres de los meses, en el orden del año escolar peruano.
     Las clases van de marzo a diciembre, así que los tableros por mes
     empiezan en marzo y no en enero. */
  const MESES = ['enero','febrero','marzo','abril','mayo','junio',
                 'julio','agosto','setiembre','octubre','noviembre','diciembre'];
  const MESES_ESCOLARES = [3,4,5,6,7,8,9,10,11,12];

  /* '2026-09-15' → 'martes 15 de setiembre del 2026'.
     Se usa para separar el historial del chat día por día. */
  function diaLargo(iso){
    if (!iso) return '—';
    const [a, m, d] = String(iso).slice(0, 10).split('-').map(Number);
    if (!a || !m || !d) return String(iso);
    const fech = new Date(a, m - 1, d);
    if (isNaN(fech)) return String(iso);
    const dias = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
    const hoy = hoyISO();
    const ayer = (() => { const x = new Date(); x.setDate(x.getDate() - 1);
      return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`; })();
    const base = `${dias[fech.getDay()]} ${d} de ${MESES[m-1]}`;
    if (String(iso).slice(0,10) === hoy)  return `hoy · ${base}`;
    if (String(iso).slice(0,10) === ayer) return `ayer · ${base}`;
    return `${base} del ${a}`;
  }

  /* Número de mes de una fecha cualquiera (1–12), o null. */
  function mesDe(f){
    if (!f) return null;
    const iso = String(f).slice(0, 10);
    const m = Number(iso.split('-')[1]);
    return m >= 1 && m <= 12 ? m : null;
  }

  /* 9 → 'Setiembre' */
  function nombreMes(n){
    const m = MESES[Number(n) - 1];
    return m ? m.charAt(0).toUpperCase() + m.slice(1) : '—';
  }

  /* ------------------------------------------------------------------
     Números y moneda
     ------------------------------------------------------------------ */
  const num = n => Number(n || 0).toLocaleString('es-PE');
  const soles = n => 'S/ ' + Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits:2, maximumFractionDigits:2 });
  const pct = (parte, total) => total > 0 ? Math.round((parte / total) * 100) : 0;
  const redondear = (n, d = 1) => Math.round(Number(n || 0) * 10**d) / 10**d;

  /* Milisegundos legibles: "0,42 s" o "1,8 s" */
  function ms(v){
    const n = Number(v || 0);
    return n < 1000 ? `${n} ms` : `${(n/1000).toFixed(2).replace('.', ',')} s`;
  }

  /* ------------------------------------------------------------------
     Escala de calificación
     ------------------------------------------------------------------ */
  function literal(nota){
    const n = parseFloat(nota);
    if (isNaN(n)) return '—';
    const e = ESCALA.find(x => n >= x.min);
    return e ? e.literal : '—';
  }
  function claseNota(nota){
    const n = parseFloat(nota);
    if (isNaN(n)) return 'sin';
    const e = ESCALA.find(x => n >= x.min);
    return e ? e.clase : 'sin';
  }
  function nombreLogro(nota){
    const n = parseFloat(nota);
    if (isNaN(n)) return 'Sin registrar';
    const e = ESCALA.find(x => n >= x.min);
    return e ? e.nombre : 'Sin registrar';
  }
  function nivelDeGrado(grado){
    return String(grado || '').startsWith('Inicial') ? 'Inicial' : 'Primaria';
  }
  function cursosDe(grado){
    return nivelDeGrado(grado) === 'Inicial' ? CURSOS_INICIAL : CURSOS_PRIMARIA;
  }

  /* ------------------------------------------------------------------
     Códigos y folios
     ------------------------------------------------------------------ */
  function codigoEstudiante(n){ return `EST-${IE.anio}-${String(n).padStart(4, '0')}`; }
  function folio(prefijo){
    const d = new Date();
    const sello = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
    const azar = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `${prefijo}-${sello}-${azar}`;
  }

  /* Cadena de verificación corta y estable (para el QR de los reportes). */
  function selloVerificacion(texto){
    let h1 = 0x811c9dc5, h2 = 0x01000193;
    for (let i = 0; i < texto.length; i++){
      h1 = ((h1 ^ texto.charCodeAt(i)) * 16777619) >>> 0;
      h2 = ((h2 + texto.charCodeAt(i) * (i + 7)) * 2654435761) >>> 0;
    }
    return (h1.toString(36) + h2.toString(36)).toUpperCase().slice(0, 12);
  }

  /* ------------------------------------------------------------------
     Búsqueda, orden y agrupación
     ------------------------------------------------------------------ */
  /* Busca 'texto' dentro de los campos indicados, ignorando tildes. */
  function coincide(fila, texto, campos){
    const t = sinTildes(texto).trim();
    if (!t) return true;
    const trozos = t.split(/\s+/);
    const heno = sinTildes(campos.map(c => fila[c] ?? '').join(' '));
    return trozos.every(x => heno.includes(x));
  }

  function ordenarPor(lista, campo, desc = false){
    return [...lista].sort((a, b) => {
      const x = a[campo], y = b[campo];
      if (x == null) return 1;
      if (y == null) return -1;
      const r = typeof x === 'number' && typeof y === 'number'
        ? x - y
        : String(x).localeCompare(String(y), 'es-PE', { numeric:true, sensitivity:'base' });
      return desc ? -r : r;
    });
  }

  /* Agrupa por un campo ("grado") o por una función (a => a.seccion),
     que es lo que hace falta cuando la clave se calcula. */
  function agrupar(lista, campo){
    const clave = typeof campo === 'function' ? campo : it => it[campo];
    return lista.reduce((acc, it) => {
      const k = clave(it) ?? 'Sin dato';
      (acc[k] = acc[k] || []).push(it);
      return acc;
    }, {});
  }

  function contarPor(lista, campo){
    const r = {};
    lista.forEach(it => { const k = it[campo] ?? 'Sin dato'; r[k] = (r[k] || 0) + 1; });
    return r;
  }

  const promedio = ns => {
    const v = ns.map(Number).filter(n => !isNaN(n));
    return v.length ? redondear(v.reduce((a, b) => a + b, 0) / v.length, 1) : null;
  };

  /* Orden oficial de los grados (Inicial 3 → 6.to). */
  function ordenarGrados(lista, campo = 'grado'){
    /* Acepta tanto objetos ({grado:'1.er grado'}) como una lista de
       nombres de grado sueltos. */
    const nombre = x => (x && typeof x === 'object') ? x[campo] : x;
    return [...lista].sort((a, b) => GRADOS.indexOf(nombre(a)) - GRADOS.indexOf(nombre(b)));
  }

  /* ------------------------------------------------------------------
     CSV — importación y exportación
     ------------------------------------------------------------------ */
  /* Lee un CSV respetando comillas y saltos de línea dentro de celdas. */
  function leerCSV(texto){
    const t = String(texto).replace(/^\uFEFF/, '');   // quita BOM de Excel
    const filas = [];
    let fila = [], celda = '', entreComillas = false;
    for (let i = 0; i < t.length; i++){
      const c = t[i], sig = t[i+1];
      if (entreComillas){
        if (c === '"' && sig === '"'){ celda += '"'; i++; }
        else if (c === '"') entreComillas = false;
        else celda += c;
      } else {
        if (c === '"') entreComillas = true;
        else if (c === ',' || c === ';'){ fila.push(celda); celda = ''; }
        else if (c === '\n'){ fila.push(celda); filas.push(fila); fila = []; celda = ''; }
        else if (c !== '\r') celda += c;
      }
    }
    if (celda || fila.length){ fila.push(celda); filas.push(fila); }
    return filas.filter(f => f.some(x => String(x).trim() !== ''));
  }

  /* Convierte el CSV en objetos usando la primera fila como encabezado. */
  function csvAObjetos(texto){
    const filas = leerCSV(texto);
    if (filas.length < 2) return [];
    const cab = filas[0].map(h => sinTildes(h).replace(/\s+/g, '_'));
    return filas.slice(1).map(f => {
      const o = {};
      cab.forEach((h, i) => o[h] = String(f[i] ?? '').trim());
      return o;
    });
  }

  function aCSV(filas, columnas){
    const cab = columnas.map(c => c.titulo);
    const cuerpo = filas.map(f => columnas.map(c => {
      const v = typeof c.valor === 'function' ? c.valor(f) : f[c.campo];
      const s = v === null || v === undefined ? '' : String(v);
      return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }));
    return '\uFEFF' + [cab, ...cuerpo].map(f => f.join(';')).join('\r\n');
  }

  function descargar(contenido, nombre, tipo = 'text/csv;charset=utf-8'){
    const blob = contenido instanceof Blob ? contenido : new Blob([contenido], { type: tipo });
    const url = URL.createObjectURL(blob);
    const a = crear('a', { href: url, download: nombre });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  /* ------------------------------------------------------------------
     Ayudantes varios
     ------------------------------------------------------------------ */
  function esperar(ms){ return new Promise(r => setTimeout(r, ms)); }

  /* Retrasa la ejecución: ideal para buscadores que escriben rápido. */
  function retardar(fn, ms = 260){
    let t;
    return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  }

  /* Mide cuánto tarda una operación (para el indicador de rapidez). */
  async function cronometrar(fn){
    const t0 = performance.now();
    const resultado = await fn();
    return { resultado, ms: Math.round(performance.now() - t0) };
  }

  /* Copia un texto al portapapeles con respaldo para navegadores viejos. */
  async function copiar(texto){
    try { await navigator.clipboard.writeText(texto); return true; }
    catch {
      const ta = crear('textarea', { value: texto, style:'position:fixed;opacity:0' });
      document.body.append(ta); ta.select();
      const ok = document.execCommand('copy'); ta.remove(); return ok;
    }
  }

  /* Almacenamiento local tolerante a fallos (modo privado, cuota llena). */
  const guardado = {
    leer(clave, porDefecto = null){
      try { const v = localStorage.getItem(clave); return v === null ? porDefecto : JSON.parse(v); }
      catch { return porDefecto; }
    },
    escribir(clave, valor){
      try { localStorage.setItem(clave, JSON.stringify(valor)); return true; } catch { return false; }
    },
    borrar(clave){ try { localStorage.removeItem(clave); } catch {} },
  };

  /* Tema claro / oscuro. */
  function aplicarTema(t){
    document.documentElement.dataset.tema = t;
    guardado.escribir('rpb_tema', t);
    qq('[data-boton-tema]').forEach(b => b.textContent = t === 'oscuro' ? '☀️' : '🌙');
  }
  function alternarTema(){
    aplicarTema(document.documentElement.dataset.tema === 'oscuro' ? 'claro' : 'oscuro');
  }
  function iniciarTema(){
    const t = guardado.leer('rpb_tema') ||
      (matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro');
    aplicarTema(t);
  }

  /* Logo del sistema, configurable por Soporte (ver Datos.config y el
     panel de soporte). Mientras nadie suba uno, se queda la insignia
     "RPB" de siempre; en cuanto Soporte guarda una imagen, esta función
     la pone en la barra, en la portada, en las pantallas de acceso y
     hasta en el membrete de los reportes en PDF —donde se le llame. */
  function aplicarLogo(urlLogo){
    if (!urlLogo) return;
    qq('.escudo').forEach(el => {
      if (el.dataset.logoPuesto === urlLogo) return;
      el.dataset.logoPuesto = urlLogo;
      el.innerHTML = '';
      /* La clase apaga el marco y las letritas "I.E.P." del escudo
         dibujado con CSS: cuando hay logo de verdad, se ve el logo y
         nada más. */
      el.classList.add('con-logo');
      const img = crear('img', { src: urlLogo, alt:'Logotipo del colegio',
        style:'width:100%;height:100%;object-fit:contain;border-radius:inherit' });
      el.append(img);
    });
  }

  /* Inclinación 3D al paso del mouse (efecto "widget futurista"). Se
     desactiva sola con el mouse fuera, con dedo (touch) y si la persona
     pidió menos movimiento en su sistema. Nada de esto exige red ni
     cambia datos: es puramente decorativo. */
  function tiltar3D(selector, intensidad = 8){
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (matchMedia('(hover: none)').matches) return; // pantallas táctiles
    qq(selector).forEach(el => {
      if (el.dataset.tiltListo) return;
      el.dataset.tiltListo = '1';
      el.style.transformStyle = 'preserve-3d';
      let cuadro = 0;
      const mover = e => {
        if (cuadro) return;
        cuadro = requestAnimationFrame(() => {
          cuadro = 0;
          const r = el.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width - .5;
          const py = (e.clientY - r.top) / r.height - .5;
          el.style.transform = `perspective(900px) rotateY(${(px * intensidad).toFixed(2)}deg) rotateX(${(py * -intensidad).toFixed(2)}deg) translateZ(0)`;
          el.style.setProperty('--brillo-x', `${(px + .5) * 100}%`);
          el.style.setProperty('--brillo-y', `${(py + .5) * 100}%`);
        });
      };
      const salir = () => {
        el.style.transition = 'transform .5s cubic-bezier(.32,.72,0,1)';
        el.style.transform = 'perspective(900px) rotateY(0) rotateX(0) translateZ(0)';
        setTimeout(() => { el.style.transition = ''; }, 500);
      };
      el.addEventListener('mousemove', mover);
      el.addEventListener('mouseleave', salir);
    });
  }

  return {
    q, qq, crear, esc, limpiar, soloDigitos, limpiarNombre, may, capitalizar, sinTildes, iniciales,
    val, dniPlausible, fuerzaClave,
    fecha, fechaLarga, fechaHora, hora, hace, diasHasta, edad, hoyISO, TZ,
    diaLargo, mesDe, nombreMes, MESES, MESES_ESCOLARES,
    num, soles, pct, redondear, ms,
    literal, claseNota, nombreLogro, nivelDeGrado, cursosDe,
    codigoEstudiante, folio, selloVerificacion,
    coincide, ordenarPor, agrupar, contarPor, promedio, ordenarGrados,
    leerCSV, csvAObjetos, aCSV, descargar,
    esperar, retardar, cronometrar, copiar, guardado,
    aplicarTema, alternarTema, iniciarTema, tiltar3D, aplicarLogo,
  };
})();

/* El tema se aplica de inmediato para evitar el parpadeo blanco. */
U.iniciarTema();
