/* =====================================================================
   MOTOR DE REPORTES  (indicadores 5 y 6: rapidez y precisión)
   ---------------------------------------------------------------------
   · Plantillas estandarizadas con membrete institucional.
   · Los datos salen siempre de la base de datos, nunca se escriben a mano.
   · Validación previa: si faltan datos, el reporte no se emite.
   · Cada documento lleva número de versión y código de verificación
     (texto + QR) que queda guardado en la tabla 'reportes'.
   · La salida se abre en una ventana lista para "Guardar como PDF".
   ===================================================================== */
'use strict';

const Reporte = (() => {

  /* ------------------------------------------------------------------
     Hoja de estilo compartida por todos los documentos impresos
     ------------------------------------------------------------------ */
  const ESTILO = `
    @page { size:A4; margin:16mm 14mm; }
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:"Segoe UI",-apple-system,Arial,sans-serif;color:#14181F;font-size:11.5px;line-height:1.55;background:#fff}
    .membrete{display:flex;align-items:center;gap:14px;border-bottom:2.5px solid #1A1814;padding-bottom:10px;margin-bottom:16px}
    .membrete .sello{width:54px;height:54px;border-radius:14px;background:linear-gradient(160deg,#1A1A1C,#000);
      border:2px solid #D4AF37;display:flex;align-items:center;justify-content:center;color:#D4AF37;font-weight:800;font-size:14px;flex:0 0 54px}
    .membrete .txt{flex:1}
    .membrete h1{font-size:14.5px;color:#1A1814;letter-spacing:-.2px}
    .membrete p{font-size:9.5px;color:#4A5568;line-height:1.5}
    .titulo-doc{text-align:center;margin:14px 0 4px;font-size:14px;font-weight:700;color:#1A1814;text-transform:uppercase;letter-spacing:.6px}
    .sub-doc{text-align:center;font-size:10px;color:#5A6478;margin-bottom:14px}
    .franja{background:#FFF8DF;border:1px solid #F0DFA0;border-radius:8px;padding:9px 12px;margin-bottom:14px;
      display:flex;flex-wrap:wrap;gap:6px 22px;font-size:10px;color:#42506B}
    .franja b{color:#14181F}
    table{width:100%;border-collapse:collapse;font-size:10px;margin-bottom:12px}
    th{background:#1A1814;color:#D4AF37;text-align:left;padding:6px 7px;font-weight:600;font-size:9.5px;text-transform:uppercase;letter-spacing:.3px}
    td{border-bottom:1px solid #E2E7EF;padding:5.5px 7px}
    tbody tr:nth-child(even){background:#F8FAFC}
    .num{text-align:right;font-variant-numeric:tabular-nums}
    .centro{text-align:center}
    .cuerpo-texto{text-align:justify;line-height:2;font-size:12px;margin:16px 0}
    .cuerpo-texto b{font-weight:700}
    .resumen{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:14px}
    .resumen .caja{flex:1;min-width:110px;border:1px solid #DDE3EC;border-radius:8px;padding:8px 10px;background:#F8FAFC}
    .resumen .caja b{display:block;font-size:17px;color:#1A1814;line-height:1.2}
    .resumen .caja span{font-size:9px;color:#5A6478;text-transform:uppercase;letter-spacing:.4px}
    .firmas{display:flex;justify-content:space-around;gap:30px;margin-top:46px;text-align:center}
    .firmas div{flex:1;max-width:220px}
    .firmas .raya{border-top:1px solid #14181F;margin-bottom:5px}
    .firmas b{font-size:10.5px;display:block}
    .firmas span{font-size:9px;color:#5A6478}
    .pie-doc{position:fixed;bottom:0;left:0;right:0;display:flex;align-items:flex-end;justify-content:space-between;gap:14px;
      border-top:1px solid #DDE3EC;padding-top:7px;font-size:8.5px;color:#6B7891}
    .pie-doc .verif{text-align:right}
    .pie-doc .verif b{font-family:"Consolas",monospace;font-size:10px;color:#1A1814;letter-spacing:.5px}
    .qr{width:64px;height:64px;flex:0 0 64px}
    .qr img,.qr canvas{width:64px !important;height:64px !important}
    .sin-imprimir{position:fixed;top:0;left:0;right:0;background:#1A1814;color:#D4AF37;padding:9px 14px;font-size:12px;
      display:flex;align-items:center;justify-content:space-between;gap:12px;z-index:99}
    .sin-imprimir button{background:#D4AF37;color:#2A2103;border:none;border-radius:980px;padding:6px 16px;font-weight:700;cursor:pointer;font-size:12px}
    .lienzo-preview{padding:12px 0 30px;background:#EDEAE3}
    @media print{ .sin-imprimir{display:none} .pie-doc{position:fixed} .lienzo-preview{padding:0;background:#fff} }

    /* ---------------------------------------------------------------
       DOCUMENTO OFICIAL (constancias)
       Calca el papel membretado real del colegio. La hoja es una A4 de
       verdad —210 × 297 mm con sus márgenes—, así que lo que se ve en
       pantalla es exactamente lo que sale impreso: nada se corta por los
       costados ni se desplaza al imprimir.
       --------------------------------------------------------------- */
    .hoja-oficial{
      position:relative;
      width:210mm;min-height:297mm;
      margin:0 auto;
      padding:14mm 20mm 26mm;
      background:#fff;
      box-shadow:0 2px 18px rgba(0,0,0,.14);
      overflow:hidden;
    }
    /* Cenefa lateral del papel impreso: va DENTRO de la hoja, no pegada
       a la ventana, para que no invada el texto. */
    .hoja-oficial > .cenefa{position:absolute;top:0;bottom:0;width:7mm;
      background:linear-gradient(180deg,#F6E7D8,#FBF3EA 45%,#F3DFCC)}
    .hoja-oficial > .cenefa.izq{left:0}
    .hoja-oficial > .cenefa.der{right:0}

    .membrete-of{display:flex;align-items:center;gap:10px;position:relative;z-index:1}
    .membrete-of .escudo-of{
      width:62px;height:70px;flex:0 0 62px;border:2px solid #C0392B;border-radius:3px;
      display:flex;align-items:center;justify-content:center;overflow:hidden;background:#fff;
    }
    .membrete-of .escudo-of img{width:100%;height:100%;object-fit:contain}
    .membrete-of .escudo-of .siglas{
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      font-weight:800;color:#C0392B;line-height:1.05;
    }
    .membrete-of .escudo-of .siglas i{font-style:normal;font-size:10px;letter-spacing:1px}
    .membrete-of .escudo-of .siglas b{font-size:15px;letter-spacing:2px}
    .membrete-of .centro-of{flex:1;text-align:center}
    .membrete-of .linea1{font-size:12px;font-weight:700;letter-spacing:.4px;color:#1A1814}
    .membrete-of .linea2{font-size:18px;font-weight:700;color:#C0392B;font-family:Georgia,"Times New Roman",serif;line-height:1.2}
    .membrete-of .linea3{font-size:10px;font-weight:700;color:#1A1814;margin-top:1px}
    .membrete-of .linea4{
      display:inline-block;margin-top:3px;padding:0 8px;
      background:#FFE34D;font-size:10px;font-weight:700;color:#1A1814;letter-spacing:.5px;
    }
    .raya-doble{border-top:2.4px solid #1A1814;border-bottom:1px solid #1A1814;height:3.5px;margin:7px 0 2px;position:relative;z-index:1}

    .titulo-of{
      text-align:center;font-family:Georgia,"Times New Roman",serif;
      font-size:19px;font-weight:700;letter-spacing:1.5px;margin:15px 0 12px;color:#1A1814;
      position:relative;z-index:1;
    }
    .modular-of{display:inline-block;background:#FFE34D;padding:0 6px;font-size:11px;font-weight:700;
      margin-bottom:9px;position:relative;z-index:1}
    .cuerpo-of{text-align:justify;line-height:1.9;font-size:11.5px;margin-bottom:8px;color:#14181F;position:relative;z-index:1}
    .cuerpo-of b{font-weight:700}
    .subraya{text-decoration:underline}
    .requisitos-of{margin:2px 0 9px 24px;font-size:11px;line-height:1.8;position:relative;z-index:1}
    .fecha-of{text-align:right;font-size:11.5px;margin:14px 0 4px;position:relative;z-index:1}
    .atentamente-of{text-align:center;font-size:11.5px;margin-top:12px;position:relative;z-index:1}

    .firma-of{margin-top:4px;text-align:center;position:relative;z-index:1}
    .firma-of .sello-firma{max-height:80px;margin:0 auto 2px;display:block}
    .firma-of .raya-firma{width:210px;border-top:1px solid #1A1814;margin:0 auto 3px}
    .firma-of b{display:block;font-size:10px}
    .firma-of span{display:block;font-size:9px;color:#3C4351}

    /* Marca de agua: dentro de la hoja y centrada, detrás del texto. */
    .agua-of{
      position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
      font-family:Georgia,"Times New Roman",serif;font-weight:800;
      font-size:150px;letter-spacing:12px;color:rgba(192,57,43,.06);
      z-index:0;pointer-events:none;white-space:nowrap;
    }

    .pie-of{
      position:absolute;left:7mm;right:7mm;bottom:8mm;text-align:center;z-index:1;
      border-top:1px solid #C9C2B4;padding-top:5px;background:#fff;
    }
    .pie-of .lema{font-family:Georgia,"Times New Roman",serif;font-style:italic;font-size:11px;color:#1A1814}
    .pie-of .direccion{background:#EDE9E1;font-size:10px;color:#1A1814;padding:2px 0;margin-top:3px}
    .pie-of .verificacion{font-size:7px;color:#7A7365;margin-top:2px;font-family:Consolas,monospace}

    /* Al imprimir: la hoja ocupa la página, sin sombra ni fondo gris. */
    @media print{
      body{background:#fff}
      .hoja-oficial{width:auto;min-height:auto;margin:0;padding:0 6mm 20mm;box-shadow:none}
      .hoja-oficial > .cenefa{display:none}
      .pie-of{position:fixed;left:0;right:0;bottom:6mm}
    }
  `;

  const escapar = t => U.esc(t);

  /* Logotipo configurable por Soporte (ver Datos.config / vistaApariencia).
     Mientras nadie suba uno, el membrete usa el sello "RPB" de siempre. */
  let logoActual = null;
  function fijarLogo(urlLogo){ logoActual = urlLogo || null; }

  /* Sello y firma de la dirección: lo sube Soporte o Dirección desde su
     panel. Si no hay ninguno, el documento deja la línea de firma en
     blanco para firmar a mano —nunca se inventa una firma. */
  let firmaActual = null;
  function fijarFirma(urlFirma){ firmaActual = urlFirma || null; }

  /* ------------------------------------------------------------------
     Membrete oficial: el del papel membretado del colegio
     ------------------------------------------------------------------ */
  function membreteOficial(){
    return `
      <div class="membrete-of">
        <div class="escudo-of">${logoActual
          ? `<img src="${escapar(logoActual)}" alt="">`
          : `<span class="siglas"><i>I.E.P.</i><b>RPB</b></span>`}</div>
        <div class="centro-of">
          <div class="linea1">${escapar(IE.encabezado_1)}</div>
          <div class="linea2">“${escapar(IE.encabezado_2)}”</div>
          <div class="linea3">${escapar(IE.resoluciones)}</div>
          <div class="linea4">${escapar(IE.niveles_doc)}</div>
        </div>
        <div style="width:66px;flex:0 0 66px"></div>
      </div>
      <div class="raya-doble"></div>`;
  }

  function pieOficial(verificacion){
    return `
      <div class="pie-of">
        <div class="lema">“${escapar(IE.lema)}”</div>
        <div class="direccion">${escapar(IE.direccion_doc)}</div>
        <div class="verificacion">Verificación: ${escapar(verificacion)} · ${escapar(IE.siglas)} v${IE.version_sistema}</div>
      </div>`;
  }

  /* ------------------------------------------------------------------
     Membrete y pie (para listados y actas)
     ------------------------------------------------------------------ */
  function membrete(){
    return `
      <div class="membrete">
        <div class="sello">${logoActual
          ? `<img src="${escapar(logoActual)}" alt="" style="width:100%;height:100%;object-fit:contain;border-radius:inherit">`
          : 'RPB'}</div>
        <div class="txt">
          <h1>${escapar(IE.nombre)}</h1>
          <p>${escapar(IE.direccion)} · ${escapar(IE.distrito)}, ${escapar(IE.provincia)} – ${escapar(IE.region)}<br>
             Cód. modular Inicial ${escapar(IE.modular_inicial)} · Primaria ${escapar(IE.modular_primaria)} · ${escapar(IE.ugel)}<br>
             Teléfono ${escapar(IE.telefono)} · Año escolar ${IE.anio}</p>
        </div>
      </div>`;
  }

  function pie({ verificacion, version, emisor }){
    return `
      <div class="pie-doc">
        <div>
          <div>Documento generado por el sistema de gestión ${escapar(IE.siglas)} v${IE.version_sistema}.</div>
          <div>Emitido por ${escapar(emisor || 'Sistema')} el ${U.fechaHora(new Date())}.</div>
          <div>"${escapar(IE.lema)}"</div>
        </div>
        <div class="qr" id="zonaQR"></div>
        <div class="verif">
          <div>Código de verificación · versión ${version || 1}</div>
          <b>${escapar(verificacion)}</b>
        </div>
      </div>`;
  }

  /* ------------------------------------------------------------------
     Abre la ventana de impresión con el documento ya armado
     ------------------------------------------------------------------ */
  function abrir(htmlInterno, { titulo, verificacion }){
    const win = window.open('', '_blank', 'width=900,height=1000');
    if (!win){
      UI.fallo('El navegador bloqueó la ventana del reporte. Permite las ventanas emergentes para este sitio.');
      return null;
    }
    win.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
      <title>${escapar(titulo)}</title><style>${ESTILO}</style></head>
      <body>
        <div class="sin-imprimir">
          <span>Vista previa · usa "Guardar como PDF" en el cuadro de impresión.</span>
          <button onclick="window.print()">Imprimir o guardar en PDF</button>
        </div>
        <div style="height:46px"></div>
        <div class="lienzo-preview">${htmlInterno}</div>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script>
        <script>
          (function(){
            var z = document.getElementById('zonaQR');
            if (z && window.QRCode){
              try { new QRCode(z, { text:${JSON.stringify(String(verificacion || ''))}, width:64, height:64,
                colorDark:'#1A1814', colorLight:'#ffffff' }); } catch(e){}
            }
            setTimeout(function(){ try{ window.print(); }catch(e){} }, 850);
          })();
        <\/script>
      </body></html>`);
    win.document.close();
    return win;
  }

  /* ------------------------------------------------------------------
     EL MISMO DOCUMENTO, EN WORD
     ------------------------------------------------------------------
     La dirección pidió poder generar cada reporte "igualito" en PDF o
     en Word. No se arma un documento distinto: se toma el MISMO HTML
     que se imprime y se envuelve con la cabecera que Word entiende, de
     modo que el .doc se abre con el mismo membrete, la misma tabla y
     las mismas firmas, y encima se puede editar si hace falta añadir
     una observación a mano.

     Se usa .doc (HTML de Word) y no .docx a propósito: .docx es un ZIP
     con XML que no se puede armar de forma fiable en el navegador sin
     una librería pesada, y Word, WPS y LibreOffice abren este formato
     sin quejarse. Es un archivo de Word de verdad, no un PDF renombrado.
     ------------------------------------------------------------------ */
  function aWord(htmlInterno, { titulo, verificacion }){
    /* El QR lo dibuja un script en la ventana de impresión; en Word no
       corre JavaScript, así que en su lugar va el código legible. */
    const cuerpo = String(htmlInterno)
      .replace(/<div[^>]*id=["']zonaQR["'][^>]*>\s*<\/div>/gi,
        `<div style="font-family:Consolas,monospace;font-size:9px">${escapar(verificacion || '')}</div>`)
      .replace(/<div class="lienzo-preview">|<\/div>\s*$/g, m => m);

    return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40" lang="es">
<head>
  <meta charset="utf-8">
  <meta name="ProgId" content="Word.Document">
  <title>${escapar(titulo)}</title>
  <!--[if gte mso 9]><xml>
    <w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument>
  </xml><![endif]-->
  <style>
    @page { size:21cm 29.7cm; margin:1.6cm 1.4cm; mso-page-orientation:portrait; }
    div.WordSection1 { page:WordSection1; }
    ${ESTILO}
    /* Word no maneja bien flex ni position:fixed: en el .doc esas
       piezas se acomodan como bloques y tablas normales. */
    .membrete{display:block;overflow:hidden}
    .membrete .sello{float:left;margin-right:10px}
    .pie-doc{position:static;display:block;margin-top:18px}
    .hoja-oficial{width:auto;min-height:0;box-shadow:none;padding:0;overflow:visible}
    .hoja-oficial > .cenefa{display:none}
    .lienzo-preview{background:#fff;padding:0}
    .firmas{display:block;overflow:hidden}
    .firmas div{float:left;width:32%;margin-right:1%}
    .resumen{display:block;overflow:hidden}
    .resumen .caja{float:left;width:23%;margin:0 1% 8px 0}
    .franja{display:block}
    .franja span{margin-right:18px}
  </style>
</head>
<body><div class="WordSection1">${cuerpo}</div></body>
</html>`;
  }

  function descargarWord(htmlInterno, { titulo, verificacion }){
    const doc = aWord(htmlInterno, { titulo, verificacion });
    U.descargar(doc, `${U.limpiarNombre(titulo)}_${U.hoyISO()}.doc`,
                'application/msword;charset=utf-8');
    return { word:true };
  }

  /* Un solo punto de salida: el documento sale en PDF (ventana de
     impresión) o en Word (descarga), con el mismo contenido. */
  function entregar(htmlInterno, { titulo, verificacion, formato }){
    if (String(formato || '').toLowerCase() === 'word'){
      descargarWord(htmlInterno, { titulo, verificacion });
      UI.exito(`${titulo} descargado en Word (.doc).`);
      return { formato:'Word' };
    }
    abrir(htmlInterno, { titulo, verificacion });
    return { formato:'PDF' };
  }

  /* ------------------------------------------------------------------
     Validación previa: sin datos completos no se emite (indicador 6)
     ------------------------------------------------------------------ */
  function validar(filas, obligatorios = []){
    const problemas = [];
    if (!filas || !filas.length){
      problemas.push('No hay registros que cumplan los filtros seleccionados.');
      return problemas;
    }
    filas.forEach((f, i) => {
      obligatorios.forEach(campo => {
        if (f[campo] === null || f[campo] === undefined || String(f[campo]).trim() === '')
          problemas.push(`Fila ${i + 1}: falta el dato "${campo}".`);
      });
    });

    /* Indicador 6 ("eliminación de inconsistencias o duplicados"): si el
       reporte trae un DNI por fila, dos filas con el mismo DNI son un
       error de datos —no algo que el PDF deba mostrar como si nada—, así
       que se avisa aquí en vez de emitir un documento con gente
       duplicada. */
    if (obligatorios.includes('dni')){
      const vistos = new Map();
      filas.forEach((f, i) => {
        if (!f.dni) return;
        if (vistos.has(f.dni)) problemas.push(`Fila ${i + 1}: el DNI ${f.dni} está repetido (también en la fila ${vistos.get(f.dni) + 1}).`);
        else vistos.set(f.dni, i);
      });
    }
    return problemas.slice(0, 12);
  }

  /* ==================================================================
     PLANTILLA 1 — Listado tabular genérico
     ================================================================== */
  async function listado({ titulo, subtitulo, columnas, filas, filtros = {}, resumen = [], obligatorios = [], formato }){
    const t0 = performance.now();
    /* El catálogo de reportes pasa el formato dentro de los filtros. */
    formato = formato || (filtros && filtros._formato) || 'pdf';

    const problemas = validar(filas, obligatorios);
    if (problemas.length){
      UI.modal({
        titulo: 'No se puede emitir el reporte',
        subtitulo: 'Corrige estos puntos y vuelve a intentarlo.',
        cuerpo: `<div class="banda banda-mal"><span class="ic">⛔️</span><div>
          ${problemas.map(p => `<div>• ${U.esc(p)}</div>`).join('')}
        </div></div>`,
        botones: [{ texto:'Entendido', clase:'btn-claro' }],
      });
      return null;
    }

    /* "Exportar a Excel con un clic" (indicador 5): en vez de duplicar la
       lógica de cada reporte del catálogo, se reutiliza exactamente la
       misma columnas/filas que arma cada uno para su PDF —ya validada
       arriba—, y aquí se convierte a CSV (que Excel abre igual de bien)
       en vez de imprimir. El catálogo llama a esto pasando filtros._csv. */
    if (filtros && filtros._csv){
      U.descargar(U.aCSV(filas, columnas), `${U.limpiarNombre(titulo)}_${U.hoyISO()}.csv`);
      Datos.auditar(`Reporte exportado a Excel: ${titulo}`, 'Reportes', { detalle:`${filas.length} filas` });
      UI.exito(`${titulo}: ${filas.length} filas exportadas.`);
      return { exportado:true };
    }

    const s = Sesion.actual() || {};
    const esWord = String(formato).toLowerCase() === 'word';
    const { version, verificacion } = await Datos.reportes.registrar({
      nombre: titulo,
      filas: filas.length,
      ms: Math.round(performance.now() - t0),
      formato: esWord ? 'Word' : 'PDF',
      parametros: filtros,
    });

    /* Las claves que empiezan con "_" son órdenes internas
       (_csv, _formato, _estudiante_id): no son filtros del usuario y no
       tienen por qué aparecer impresas en el documento. */
    const filtrosTexto = Object.entries(filtros)
      .filter(([k, v]) => !k.startsWith('_') && v && v !== 'todos')
      .map(([k, v]) => `<span><b>${escapar(k)}:</b> ${escapar(v)}</span>`).join('');

    const html = `
      <div class="hoja-oficial">
      <div class="cenefa izq"></div><div class="cenefa der"></div>
      ${membreteOficial()}
      <div class="titulo-doc">${escapar(titulo)}</div>
      ${subtitulo ? `<div class="sub-doc">${escapar(subtitulo)}</div>` : ''}
      <div class="franja">
        <span><b>Registros:</b> ${filas.length}</span>
        <span><b>Emitido:</b> ${U.fechaHora(new Date())}</span>
        <span><b>Responsable:</b> ${escapar(s.nombres || 'Sistema')}</span>
        ${filtrosTexto}
      </div>
      ${resumen.length ? `<div class="resumen">${resumen.map(r =>
        `<div class="caja"><b>${escapar(r.valor)}</b><span>${escapar(r.rotulo)}</span></div>`).join('')}</div>` : ''}
      <table>
        <thead><tr>${columnas.map(c => `<th${c.num ? ' class="num"' : ''}>${escapar(c.titulo)}</th>`).join('')}</tr></thead>
        <tbody>${filas.map(f => `<tr>${columnas.map(c => {
          const v = typeof c.valor === 'function' ? c.valor(f) : f[c.campo];
          return `<td${c.num ? ' class="num"' : ''}>${escapar(v ?? '—')}</td>`;
        }).join('')}</tr>`).join('')}</tbody>
      </table>
      ${pie({ verificacion, version, emisor: s.nombres })}
      </div>`;

    const ms = Math.round(performance.now() - t0);
    Datos.auditar(`Reporte emitido (${esWord ? 'Word' : 'PDF'}): ${titulo}`, 'Reportes',
                  { ms, detalle:`${filas.length} filas · v${version}` });
    entregar(html, { titulo, verificacion, formato });
    if (!esWord) UI.exito(`Reporte listo en ${U.ms(ms)} · versión ${version}`);
    return { version, verificacion, ms, formato: esWord ? 'Word' : 'PDF' };
  }

  /* ==================================================================
     PLANTILLA 2 — Constancia de matrícula / estudios
     ================================================================== */
  /* El texto de estas dos constancias calca, palabra por palabra, las
     plantillas Word que ya usa la dirección (las mismas que se llenaban
     a mano). Solo cambia lo que tiene que cambiar: el nombre, el DNI, el
     aula y la fecha —así lo que imprime el sistema es el mismo papel de
     siempre, no uno inventado, y quien lo reciba no nota diferencia. */
  async function constancia({ estudiante, tipo = 'Constancia de matrícula', motivo, gradoVacante, formato = 'pdf' }){
    const t0 = performance.now();
    const faltan = ['nombres','apellidos','dni','grado'].filter(c => !estudiante[c]);
    if (faltan.length){
      UI.fallo(`No se puede emitir: al estudiante le faltan los datos ${faltan.join(', ')}.`);
      return null;
    }
    const esVacante = tipo === 'Constancia de vacante';

    const s = Sesion.actual() || {};
    const numero = U.folio('CONST');
    const verificacion = U.selloVerificacion(`${numero}|${estudiante.dni}|${tipo}`);
    const grado = gradoVacante || estudiante.grado;
    const nivel = U.nivelDeGrado(grado);
    const modular = nivel === 'Inicial' ? IE.modular_inicial : IE.modular_primaria;
    const nombreCompleto = `${estudiante.apellidos.toUpperCase()}, ${estudiante.nombres.toUpperCase()}`;
    /* Formato exacto del documento impreso: "Sunampe,06 de agosto del 2026" */
    const hoy = new Date();
    const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio',
                   'agosto','setiembre','octubre','noviembre','diciembre'];
    const fecha = `${IE.distrito},${String(hoy.getDate()).padStart(2,'0')} de ${MESES[hoy.getMonth()]} del ${hoy.getFullYear()}`;

    await Datos.constancias.crear({
      numero, tipo,
      nombre: `${estudiante.apellidos}, ${estudiante.nombres}`,
      dni: estudiante.dni,
      aula: grado,
      sexo: estudiante.sexo || 'M',
      motivo: motivo || 'Trámites que el interesado estime conveniente.',
      verificacion,
      ms: Math.round(performance.now() - t0),
      emitido_por: s.nombres || 'Sistema',
      en_padron: esVacante ? 0 : 1,
    });

    /* Aula "descriptiva" tal como sale en el papel de siempre: "4 años -
       Nivel Inicial" en vez de "Inicial 3 y 4 años". */
    const aulaDescriptiva = nivel === 'Inicial'
      ? `${grado.replace(/^Inicial\s*/i, '').replace(/\s*años?$/i, '')} años`
      : grado.replace('1.er', 'Primer').replace('2.do', 'Segundo').replace('3.er', 'Tercer')
             .replace('4.to', 'Cuarto').replace('5.to', 'Quinto').replace('6.to', 'Sexto')
             .replace(' grado', ' Grado');

    /* Los tres cuerpos posibles. El texto es el de las constancias
       impresas del colegio, palabra por palabra; lo único que cambia es
       el nombre, el DNI, el aula y la fecha. */
    const cuerpos = {
      'Constancia de vacante': `
        <p class="cuerpo-of">
          Que, existe vacante en nuestra Institución Educativa en el aula de
          <b>${escapar(aulaDescriptiva)} - Nivel ${escapar(nivel)}</b>, para el estudiante
          <b>${escapar(nombreCompleto)}</b> con D.N.I <b>${escapar(estudiante.dni)}</b>
          para el año escolar <b>${IE.anio}</b>.
        </p>
        <p class="cuerpo-of">
          Debiendo adjuntar de manera obligatoria y bajo su responsabilidad los siguientes documentos.
        </p>
        <p class="cuerpo-of" style="margin-bottom:2px"><b>REQUISITOS:</b></p>
        <ul class="requisitos-of">
          <li>Ficha de matrícula (SIAGIE).</li>
          <li>Resolución Directoral de traslado.</li>
          <li>Informe de Progreso del Aprendizaje del Estudiante (SIAGIE).</li>
          <li>Certificado de Estudios</li>
          <li>Constancia de no adeudo.</li>
        </ul>`,

      'Constancia de matrícula': `
        <p class="cuerpo-of">
          Que, ${estudiante.sexo === 'F' ? 'la estudiante' : 'el estudiante'}
          <b>${escapar(nombreCompleto)}</b> con DNI <b>${escapar(estudiante.dni)}</b>
          se encuentra matriculad${estudiante.sexo === 'F' ? 'a' : 'o'} en nuestra Institución Educativa
          en el aula de <b>${escapar(aulaDescriptiva)} - Nivel ${escapar(nivel)}</b>,
          para el año escolar <b>${IE.anio}</b>.
        </p>`,

      'Constancia de estudios': `
        <p class="cuerpo-of">
          Que, ${estudiante.sexo === 'F' ? 'la estudiante' : 'el estudiante'}
          <b>${escapar(nombreCompleto)}</b> con DNI <b>${escapar(estudiante.dni)}</b>
          cursa estudios en nuestra Institución Educativa en el aula de
          <b>${escapar(aulaDescriptiva)} - Nivel ${escapar(nivel)}</b>,
          durante el año escolar <b>${IE.anio}</b>, con la condición de
          <b>${escapar(String(estudiante.estado || 'Matriculado').toUpperCase())}</b>.
        </p>`,
    };

    const titulo = esVacante ? 'CONSTANCIA'
                  : tipo === 'Constancia de estudios' ? 'CONSTANCIA DE ESTUDIOS'
                  : 'CONSTANCIA DE MATRÍCULA';

    const html = `
      <div class="hoja-oficial">
        <div class="cenefa izq"></div><div class="cenefa der"></div>
        <div class="agua-of">RPB</div>
        ${membreteOficial()}

        <div class="titulo-of">${escapar(titulo)}</div>

        <div class="modular-of">Código Modular ${escapar(modular)}</div>

        <p class="cuerpo-of">
          La <span class="subraya">Directora</span> de la I.E.Pr. “${escapar(IE.encabezado_2.toUpperCase())}”; la que suscribe:
        </p>
        <p class="cuerpo-of"><b>Hace Constar:</b></p>

        ${cuerpos[tipo] || cuerpos['Constancia de matrícula']}

        <p class="cuerpo-of">
          Se expide esta constancia a solicitud del interesado (a) para los fines que crea conveniente.
        </p>

        <p class="fecha-of">${escapar(fecha)}</p>
        ${esVacante ? '<p class="atentamente-of">Atentamente,</p>' : ''}

        <div class="firma-of">
          ${firmaActual ? `<img class="sello-firma" src="${escapar(firmaActual)}" alt="">` : '<div style="height:56px"></div>'}
          <div class="raya-firma"></div>
          <b>${escapar(IE.directora)}</b>
          <span>${escapar(IE.cargo_dir)}</span>
          <span>DNI ${escapar(IE.dni_directora)}</span>
        </div>

        ${pieOficial(verificacion)}
      </div>`;

    const ms = Math.round(performance.now() - t0);
    Datos.auditar(`Constancia emitida: ${numero}`, 'Constancias', { ms, detalle: estudiante.dni });
    entregar(html, { titulo:`${tipo} – ${estudiante.apellidos}`, verificacion, formato });
    UI.exito(`Constancia ${numero} emitida en ${U.ms(ms)}`);
    return { numero, verificacion, ms };
  }

  /* ==================================================================
     PLANTILLA 3 — Libreta de notas del estudiante
     ================================================================== */
  async function libreta({ estudiante, notas, formato = 'pdf' }){
    const t0 = performance.now();
    if (!notas || !notas.length){
      UI.fallo('Ese estudiante todavía no tiene notas registradas.');
      return null;
    }

    const s = Sesion.actual() || {};
    const cursos = [...new Set(notas.map(n => n.curso))].sort((a, b) => a.localeCompare(b, 'es-PE'));
    const verificacion = U.selloVerificacion(`LIB|${estudiante.dni}|${IE.anio}|${notas.length}`);

    const cuerpoFilas = cursos.map(curso => {
      const porBim = BIMESTRES.map(b => {
        const n = notas.find(x => x.curso === curso && x.bimestre === b);
        return n ? Number(n.nota) : null;
      });
      const prom = U.promedio(porBim.filter(x => x !== null));
      return `<tr>
        <td><b>${escapar(curso)}</b></td>
        ${porBim.map(n => `<td class="centro">${n === null ? '—' : n.toFixed(0)}</td>`).join('')}
        <td class="centro"><b>${prom === null ? '—' : prom}</b></td>
        <td class="centro"><b>${prom === null ? '—' : U.literal(prom)}</b></td>
      </tr>`;
    }).join('');

    const promGeneral = U.promedio(notas.map(n => n.nota));

    const html = `
      <div class="hoja-oficial">
      <div class="cenefa izq"></div><div class="cenefa der"></div>
      ${membreteOficial()}
      <div class="titulo-doc">Informe de progreso del estudiante</div>
      <div class="sub-doc">Año escolar ${IE.anio}</div>
      <div class="franja">
        <span><b>Estudiante:</b> ${escapar(estudiante.apellidos + ', ' + estudiante.nombres)}</span>
        <span><b>DNI:</b> ${escapar(estudiante.dni)}</span>
        <span><b>Grado:</b> ${escapar(estudiante.grado)}</span>
        <span><b>Código:</b> ${escapar(estudiante.codigo || '—')}</span>
      </div>
      <div class="resumen">
        <div class="caja"><b>${promGeneral ?? '—'}</b><span>Promedio general</span></div>
        <div class="caja"><b>${U.literal(promGeneral)}</b><span>Nivel de logro</span></div>
        <div class="caja"><b>${cursos.length}</b><span>Áreas evaluadas</span></div>
        <div class="caja"><b>${notas.length}</b><span>Calificaciones</span></div>
      </div>
      <table>
        <thead><tr>
          <th>Área curricular</th>
          ${BIMESTRES.map(b => `<th class="centro">${b} bim.</th>`).join('')}
          <th class="centro">Prom.</th><th class="centro">Logro</th>
        </tr></thead>
        <tbody>${cuerpoFilas}</tbody>
      </table>
      <div class="franja" style="font-size:9px">
        ${ESCALA.map(e => `<span><b>${e.literal}</b> ${e.nombre} (${e.min}–${e.max})</span>`).join('')}
      </div>
      <div class="firmas">
        <div><div class="raya"></div><b>Docente de aula</b><span>Firma</span></div>
        <div><div class="raya"></div><b>${escapar(IE.directora)}</b><span>${escapar(IE.cargo_dir)}</span></div>
      </div>
      ${pie({ verificacion, version:1, emisor: s.nombres })}
      </div>`;

    const ms = Math.round(performance.now() - t0);
    await Datos.reportes.registrar({ nombre:`Libreta ${estudiante.dni}`, filas:notas.length, ms, formato:'PDF' });
    Datos.auditar('Libreta emitida', 'Reportes', { ms, detalle: estudiante.dni });
    entregar(html, { titulo:`Libreta – ${estudiante.apellidos}`, verificacion, formato });
    return { verificacion, ms };
  }

  /* ==================================================================
     PLANTILLA 4 — Ficha de matrícula del estudiante
     ================================================================== */
  async function fichaMatricula(estudiante, formato = 'pdf'){
    const t0 = performance.now();
    const s = Sesion.actual() || {};
    const verificacion = U.selloVerificacion(`FICHA|${estudiante.dni}|${IE.anio}`);

    const dato = (r, v) => `<tr><td style="width:34%;background:#F2F5FA"><b>${escapar(r)}</b></td><td>${escapar(v ?? '—')}</td></tr>`;

    const html = `
      <div class="hoja-oficial">
      <div class="cenefa izq"></div><div class="cenefa der"></div>
      ${membreteOficial()}
      <div class="titulo-doc">Ficha única de matrícula</div>
      <div class="sub-doc">Año escolar ${IE.anio} · ${escapar(estudiante.codigo || '')}</div>

      <table style="margin-top:8px">
        <thead><tr><th colspan="2">Datos del estudiante</th></tr></thead>
        <tbody>
          ${dato('Apellidos y nombres', `${estudiante.apellidos}, ${estudiante.nombres}`)}
          ${dato('DNI', estudiante.dni)}
          ${dato('Fecha de nacimiento', estudiante.fecha_nac ? U.fechaLarga(estudiante.fecha_nac) : '—')}
          ${dato('Edad', U.edad(estudiante.fecha_nac) ? U.edad(estudiante.fecha_nac) + ' años' : '—')}
          ${dato('Sexo', estudiante.sexo === 'F' ? 'Femenino' : 'Masculino')}
          ${dato('Grado y nivel', `${estudiante.grado} · ${U.nivelDeGrado(estudiante.grado)}`)}
          ${dato('Sección', estudiante.seccion || 'Única')}
          ${dato('Estado', estudiante.estado)}
        </tbody>
      </table>

      <table>
        <thead><tr><th colspan="2">Datos del apoderado</th></tr></thead>
        <tbody>
          ${dato('Apoderado', estudiante.apoderado)}
          ${dato('DNI del apoderado', estudiante.dni_apoderado)}
          ${dato('Celular', estudiante.celular)}
          ${dato('Correo', estudiante.correo_apoderado)}
          ${dato('Dirección', estudiante.direccion)}
        </tbody>
      </table>

      <table>
        <thead><tr><th colspan="2">Datos económicos referenciales</th></tr></thead>
        <tbody>
          ${dato('Matrícula', U.soles(IE.costo_matricula))}
          ${dato('Pensión mensual', U.soles(U.nivelDeGrado(estudiante.grado) === 'Inicial' ? IE.pension_inicial : IE.pension_primaria))}
          ${dato('N.º de mensualidades', IE.mensualidades)}
        </tbody>
      </table>

      <div class="firmas">
        <div><div class="raya"></div><b>Firma del apoderado</b><span>${escapar(estudiante.apoderado || '')}</span></div>
        <div><div class="raya"></div><b>${escapar(IE.directora)}</b><span>${escapar(IE.cargo_dir)}</span></div>
      </div>
      ${pie({ verificacion, version:1, emisor: s.nombres })}
      </div>`;

    const ms = Math.round(performance.now() - t0);
    Datos.auditar('Ficha de matrícula emitida', 'Matrícula', { ms, detalle: estudiante.dni });
    entregar(html, { titulo:`Ficha – ${estudiante.apellidos}`, verificacion, formato });
    return { verificacion, ms };
  }

  return { listado, constancia, libreta, fichaMatricula, abrir, membrete, pie, validar,
           fijarLogo, fijarFirma, membreteOficial, pieOficial,
           entregar, aWord, descargarWord };
})();
