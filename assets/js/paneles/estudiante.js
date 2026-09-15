/* =====================================================================
   PANEL DEL ESTUDIANTE
   ---------------------------------------------------------------------
   Entró con su DNI, así que ve únicamente lo suyo: sus notas, sus tareas,
   los comunicados de su grado y su ficha. No puede editar nada.
   El lenguaje es sencillo a propósito: son niños de Inicial y Primaria.
   ===================================================================== */
'use strict';

(() => {
  const { q, esc } = U;

  /* Para el estudiante el sistema se reduce a lo suyo: su aula, lo que
     el colegio comunica, con quién puede escribirse y dónde pedir ayuda. */
  const MENU = [
    { id:'inicio',      texto:'Mi inicio',    icono:'🏠', grupo:'Mi espacio' },
    { id:'aula',        texto:'Mi aula',      icono:'🎒', grupo:'Mi espacio' },
    { id:'comunicados', texto:'Comunicados',  icono:'📣', grupo:'Mi espacio' },
    { id:'comunidad',   texto:'Mensajes',     icono:'💬', grupo:'Mi espacio' },
    { id:'soporte',     texto:'Ayuda',        icono:'🛟', grupo:'Apoyo' },
  ];


  /* Avisa (como notificación, no solo como texto en la página) cuando
     una tarea vence hoy o mañana y todavía no se entregó. Se revisa una
     vez por día por estudiante (con una marca en su propio navegador,
     rpb_avisos_tarea) para no repetir el aviso cada vez que abre el
     panel. La notificación usa el mismo sistema de campanita que ya
     tienen los comunicados. */
  async function avisarTareasPorVencer(sesion){
    try {
      const hoy = U.hoyISO();
      const clave = `rpb_avisos_tarea_${sesion.estudiante_id}_${hoy}`;
      if (U.guardado.leer(clave)) return;

      const [{ filas: tareas }, { filas: entregas }] = await Promise.all([
        Datos.tareas.listar({ grado: sesion.grado }, { columnas: Datos.adjuntos.columnas('tareas') }),
        Datos.entregas.listar({ estudiante_id: sesion.estudiante_id },
          { columnas: Datos.adjuntos.columnas('entregas') }),
      ]);
      const entregadas = new Set(entregas.map(e => e.tarea_id));
      const porVencer = tareas.filter(t => {
        if (entregadas.has(t.id)) return false;
        const d = U.diasHasta(t.vence);
        return d === 0 || d === 1;
      });

      for (const t of porVencer){
        const d = U.diasHasta(t.vence);
        await Datos.notificaciones.enviar(
          d === 0 ? `Vence hoy: ${t.titulo}` : `Vence mañana: ${t.titulo}`,
          `${t.curso} · ${t.docente || 'tu profesor'}`,
          sesion.nombres);
      }
      U.guardado.escribir(clave, true);
    } catch { /* si falla, no interrumpe el panel */ }
  }

  const sesionActual = Panel.iniciar({
    roles:['estudiante'],
    tituloPanel:'Estudiante',
    menu: MENU,
    inicial:'inicio',
    definirVistas(s){

      /* ============================================================ */
      Panel.registrar('inicio', {
        titulo:'Mi inicio',
        descripcion:`${s.grado || ''} · Año escolar ${IE.anio}`,
        async cargar(cont){
          cont.innerHTML = Panel.bienvenida(
            `<span class="etiqueta e-oro">🏫 ${esc(s.grado || '')}</span>`) +
            `<div class="rejilla rejilla-4 mb16" id="kpis">${UI.esqueleto(1)}</div>
             <div class="rejilla-par">
               <div class="tarjeta">
                 <div class="cabeza"><h3>📋 Mis tareas pendientes</h3></div>
                 <div id="tareasPend">${UI.esqueleto(2)}</div>
               </div>
               <div class="tarjeta">
                 <div class="cabeza"><h3>📣 Últimos comunicados</h3></div>
                 <div id="comuRes">${UI.esqueleto(2)}</div>
               </div>
             </div>`;

          const [{ filas: notas }, { filas: tareas }, { filas: entregas }, comunicados] = await Promise.all([
            Datos.notas.listar({ estudiante_id: s.estudiante_id }),
            Datos.tareas.listar({ grado: s.grado },
              { orden:'vence', asc:true, limite:20, columnas: Datos.adjuntos.columnas('tareas') }),
            Datos.entregas.listar({ estudiante_id: s.estudiante_id },
              { columnas: Datos.adjuntos.columnas('entregas') }),
            Datos.comunicados.para('estudiante', s.grado, 4),
          ]);

          const prom = U.promedio(notas.map(n => n.nota));
          const entregadas = new Set(entregas.map(e => e.tarea_id));
          const pendientes = tareas.filter(t => !entregadas.has(t.id) && (U.diasHasta(t.vence) ?? 0) >= 0);

          q('#kpis', cont).innerHTML = `
            ${UI.kpi({ icono:'📊', clase:'l-oro',   valor: prom ?? '—', rotulo:'Mi promedio' })}
            ${UI.kpi({ icono:'🏅', clase:'l-verde', valor: prom !== null ? U.literal(prom) : '—', rotulo: prom !== null ? U.nombreLogro(prom) : 'Aún sin notas' })}
            ${UI.kpi({ icono:'📋', clase:'l-azul',  valor: pendientes.length, rotulo:'Tareas pendientes' })}
            ${UI.kpi({ icono:'✅', clase:'l-morado',valor: entregas.length, rotulo:'Tareas entregadas' })}`;

          q('#tareasPend', cont).innerHTML = pendientes.length ? pendientes.slice(0, 5).map(t => {
            const d = U.diasHasta(t.vence);
            return `
              <div class="fila-ios">
                <span class="loseta loseta-s ${d <= 1 ? 'l-rojo' : 'l-azul'}">📋</span>
                <div class="txt"><b>${esc(t.titulo)}</b><small>${esc(t.curso)}</small></div>
                ${UI.etiqueta(d === 0 ? '¡Hoy!' : `en ${d} día(s)`, d <= 1 ? 'e-rojo' : 'e-azul')}
              </div>`;
          }).join('') : UI.sinDatos('¡Muy bien! No tienes tareas pendientes. 🎉', '🎈');

          q('#comuRes', cont).innerHTML = comunicados.length ? comunicados.map(c => `
            <div class="fila-ios">
              <span class="loseta loseta-s ${c.urgente ? 'l-rojo' : 'l-oro'}">📣</span>
              <div class="txt"><b>${esc(c.titulo)}</b><small>${esc(U.hace(c.creado_en))}</small></div>
            </div>`).join('') : UI.sinDatos('No hay comunicados nuevos.', '📣');
        },
      });

      /* ============================================================
         Vistas sueltas convertidas en secciones. El código de cada
         una es el mismo de antes; solo dejó de tener su propia
         entrada en el menú.
         ============================================================ */
      async function vista_notas(cont){
          const { filas: notas } = await Datos.notas.listar({ estudiante_id: s.estudiante_id });

          if (!notas.length){
            cont.innerHTML = UI.sinDatos(
              'Todavía no hay notas registradas. Tu profesor las subirá pronto.', '📝');
            return;
          }

          const cursos = [...new Set(notas.map(n => n.curso))].sort((a, b) => a.localeCompare(b, 'es-PE'));
          const prom = U.promedio(notas.map(n => n.nota));

          /* Notas mes a mes: el mes sale de la fecha en que el docente
             las registró, que es el dato real que existe. */
          const porMes = U.agrupar(notas.filter(n => n.creado_en), n => String(n.creado_en).slice(0, 7));
          const mesesNota = Object.keys(porMes).sort().reverse();

          cont.innerHTML = `
            <div class="tarjeta panel-promedio mb16">
              <div class="fila g24 envolver">
                ${UI.anillo(Math.round((prom / 20) * 100))}
                <div>
                  <div class="cifra-promedio">${prom}</div>
                  <div class="t-fuerte t-l">${U.literal(prom)} · ${U.nombreLogro(prom)}</div>
                  <div class="t-s t-mudo">Promedio general de ${notas.length} calificaciones</div>
                </div>
                <span class="crece"></span>
                <div class="pila g8">
                  <button class="btn btn-oro" id="btnLibreta">📄 Mi libreta en PDF</button>
                  <button class="btn btn-claro btn-s" id="btnLibretaWord">📝 Mi libreta en Word</button>
                </div>
              </div>
            </div>

            ${mesesNota.length ? `
              <div class="tarjeta mb16">
                <div class="cabeza"><h3>🗓️ Mis notas mes a mes</h3></div>
                <div class="pila g12">
                  ${mesesNota.map(m => {
                    const delMes = porMes[m];
                    const p = U.promedio(delMes.map(n => n.nota));
                    return `
                      <div class="bloque-mes">
                        <div class="bloque-mes-cabeza">
                          <b>${esc(U.nombreMes(m.slice(5,7)))} ${m.slice(0,4)}</b>
                          <span class="etiqueta e-azul">Promedio ${p} · ${U.literal(p)}</span>
                          <span class="t-xs t-mudo">${delMes.length} nota(s) registrada(s)</span>
                        </div>
                        <div class="fila g8 envolver">
                          ${delMes.map(n => `
                            <span class="pastilla-nota n-${U.claseNota(n.nota)}">
                              <b>${Number(n.nota).toFixed(0)}</b>
                              <small>${esc(n.curso)} · ${esc(n.bimestre)} bim.</small>
                            </span>`).join('')}
                        </div>
                      </div>`;
                  }).join('')}
                </div>
              </div>` : ''}

            <div class="rejilla rejilla-2 mb16">
              ${cursos.map(c => {
                const suyas = notas.filter(n => n.curso === c);
                const p = U.promedio(suyas.map(n => n.nota));
                return `
                  <div class="tarjeta-curso">
                    <div class="nota-grande n-${U.claseNota(p)}">${p ?? '—'}</div>
                    <div class="crece-1">
                      <b class="t-s">${esc(c)}</b>
                      <div class="t-xs t-mudo">${U.nombreLogro(p)}</div>
                      <div class="fila g4 mt8">
                        ${BIMESTRES.map(b => {
                          const n = suyas.find(x => x.bimestre === b);
                          return `<span class="etiqueta ${n ? 'e-azul' : 'e-gris'} t-2xs">
                            ${b}: ${n ? Number(n.nota).toFixed(0) : '—'}</span>`;
                        }).join('')}
                      </div>
                    </div>
                  </div>`;
              }).join('')}
            </div>

            <div class="tarjeta">
              <div class="cabeza"><h3>📈 Cómo vas por bimestre</h3></div>
              ${(() => {
                /* Solo se grafican los bimestres que ya tienen notas: dibujar
                   un cero donde todavía no se evaluó daría una lectura falsa. */
                const puntos = BIMESTRES
                  .map(b => ({ etiqueta: b + ' bim.',
                               valor: U.promedio(notas.filter(n => n.bimestre === b).map(n => n.nota)) }))
                  .filter(p => p.valor !== null);
                return puntos.length > 1
                  ? UI.lineas(puntos, { color:'#FFD60A' })
                  : UI.sinDatos('Cuando tengas notas de más de un bimestre verás aquí tu avance.', '📈');
              })()}
            </div>

            <div class="banda banda-info mt16"><span class="ic">📏</span>
              <div>${ESCALA.map(e => `<b>${e.literal}</b> ${e.nombre} (${e.min}–${e.max})`).join(' · ')}</div></div>`;

          q('#btnLibreta', cont).onclick = async () => {
            const est = await Datos.estudiantes.porId(s.estudiante_id);
            Reporte.libreta({ estudiante: est, notas });
          };
          q('#btnLibretaWord', cont).onclick = async () => {
            const est = await Datos.estudiantes.porId(s.estudiante_id);
            Reporte.libreta({ estudiante: est, notas, formato:'word' });
          };
        }

      async function vista_tareas(cont){
          const [{ filas: tareas }, { filas: entregas }] = await Promise.all([
            Datos.tareas.listar({ grado: s.grado },
              { orden:'vence', asc:true, columnas: Datos.adjuntos.columnas('tareas') }),
            Datos.entregas.listar({ estudiante_id: s.estudiante_id },
              { columnas: Datos.adjuntos.columnas('entregas') }),
          ]);

          if (!tareas.length){
            cont.innerHTML = UI.sinDatos('No tienes tareas asignadas por ahora. 🎈', '📋');
            return;
          }

          const mapa = new Map(entregas.map(e => [e.tarea_id, e]));

          cont.innerHTML = `<div class="pila g12">` + tareas.map(t => {
            const entrega = mapa.get(t.id);
            const d = U.diasHasta(t.vence);
            const vencida = d !== null && d < 0 && !entrega;
            return `
              <div class="tarea-item ${entrega ? 'entregada' : vencida ? 'vencida' : ''}">
                <span class="loseta ${entrega ? 'l-verde' : vencida ? 'l-rojo' : 'l-azul'}">
                  ${entrega ? '✅' : vencida ? '⏰' : '📋'}</span>
                <div class="txt">
                  <b>${esc(t.titulo)}</b>
                  <p>${esc(t.descripcion || 'Sin indicaciones adicionales.')}</p>
                  <div class="meta">
                    ${UI.etiqueta(t.curso, 'e-azul')}
                    <span>👩‍🏫 ${esc(t.docente || '')}</span>
                    <span>📅 entrega: ${t.vence ? U.fecha(t.vence) : 'sin fecha'}</span>
                    ${entrega
                      ? UI.etiqueta('Entregado ' + U.hace(entrega.creado_en), 'e-verde')
                      : vencida ? UI.etiqueta('Fuera de plazo', 'e-rojo')
                      : UI.etiqueta(d === 0 ? '¡Vence hoy!' : `faltan ${d} día(s)`, d <= 1 ? 'e-naranja' : 'e-gris')}
                  </div>
                </div>
                ${entrega ? '' : `<button class="btn btn-oro btn-s" data-entregar="${t.id}">Marcar entregada</button>`}
              </div>`;
          }).join('') + '</div>';

          cont.addEventListener('click', async e => {
            const b = e.target.closest('[data-entregar]');
            if (!b) return;
            const t = tareas.find(x => x.id === +b.dataset.entregar);

            const campos = [
              { id:'comentario', etiqueta:'¿Quieres decirle algo a tu profesor?', tipo:'area', filas:3,
                ancho:'completo', pista:'Ejemplo: lo entregué en el cuaderno.' },
            ];
            const cuerpo = U.crear('div');
            cuerpo.innerHTML = `<div class="banda banda-info mb16"><span class="ic">📤</span>
              <div>Esto avisa a tu profesor que ya hiciste la tarea
              <b>${esc(t.titulo)}</b>.</div></div>`;
            cuerpo.append(UI.formulario(campos, { columnas:1 }));
            const { campo: campoArchivo, leer: leerArchivo } =
              ModAcademico.campoAdjunto('📎 Adjuntar foto, video, audio MP3, PDF o archivo (opcional)');
            cuerpo.append(campoArchivo);

            UI.modal({
              titulo:'Marcar como entregada', subtitulo:t.curso, cuerpo,
              botones:[
                { texto:'Cancelar', clase:'btn-fantasma', esperando:false, accion: () => {} },
                { texto:'Sí, ya la entregué', clase:'btn-oro', esperandoTexto:'Enviando…',
                  accion: async ({ zona }) => {
                    const d = UI.leerFormulario(zona, campos);
                    const adjunto = await leerArchivo();
                    await Datos.entregas.crear({
                      tarea_id: t.id,
                      estudiante_id: s.estudiante_id,
                      estudiante: s.nombres,
                      comentario: d.comentario,
                      estado:'Entregado',
                      ...adjunto,
                    });
                    Datos.auditar('Tarea marcada como entregada', 'Académico', { detalle: t.titulo });
                    UI.exito('¡Listo! Tu profesor ya lo sabe. 🎉');
                    Panel.recargar('tareas');
                  } },
              ],
            });
          });
        }

      /* ============================================================
         MIS ÁREAS, MES POR MES
         ------------------------------------------------------------
         Lo que el estudiante pide ver de verdad: qué áreas lleva, qué
         material subió su profesor en cada mes, qué día lo subió, y
         poder descargarlo; y al lado, las notas que le registraron en
         ese mismo mes. Nada de esto se inventa: el mes sale de la
         fecha real en que el docente guardó la ficha o la nota.
         ============================================================ */
      async function vista_areas(cont){
        cont.innerHTML = UI.cargando();
        const [{ filas: tareas }, { filas: notas }, { filas: entregas }] = await Promise.all([
          Datos.tareas.listar({ grado: s.grado },
            { orden:'creado_en', asc:false, limite:500, columnas: Datos.adjuntos.columnas('tareas') }),
          Datos.notas.listar({ estudiante_id: s.estudiante_id }),
          Datos.entregas.listar({ estudiante_id: s.estudiante_id },
              { columnas: Datos.adjuntos.columnas('entregas') }),
        ]);
        const entregadas = new Set(entregas.map(e => e.tarea_id));

        /* Las áreas que realmente aparecen en su aula, más las que su
           grado tiene asignadas en el plan de estudios. */
        const areas = [...new Set([
          ...U.cursosDe(s.grado),
          ...tareas.map(t => t.curso),
          ...notas.map(n => n.curso),
        ].filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es-PE'));

        /* Meses con movimiento, del más reciente al más antiguo. Si
           todavía no hay nada, se muestra el mes en curso. */
        const meses = [...new Set([
          ...tareas.map(t => String(t.creado_en || '').slice(0, 7)),
          ...notas.map(n => String(n.creado_en || '').slice(0, 7)),
        ].filter(m => /^\d{4}-\d{2}$/.test(m)))].sort().reverse();
        if (!meses.length) meses.push(U.hoyISO().slice(0, 7));

        let mes = meses[0];
        let area = 'todas';

        cont.innerHTML = `
          <div class="herramientas">
            <label class="rotulo-filtro" for="selMes">🗓️ Mes</label>
            <select class="filtro-sel" id="selMes">
              ${meses.map(m => `<option value="${m}">${esc(U.nombreMes(m.slice(5,7)))} ${m.slice(0,4)}</option>`).join('')}
            </select>
            <label class="rotulo-filtro" for="selArea">📚 Área</label>
            <select class="filtro-sel" id="selArea">
              <option value="todas">Todas mis áreas</option>
              ${areas.map(a => `<option value="${esc(a)}">${esc(a)}</option>`).join('')}
            </select>
            <span class="contador-res" id="resumenMes"></span>
          </div>
          <div id="zonaAreas"></div>`;

        function delMes(lista){ return lista.filter(x => String(x.creado_en || '').slice(0, 7) === mes); }

        function pintar(){
          const fichasMes = delMes(tareas).filter(t => area === 'todas' || t.curso === area);
          const notasMes  = delMes(notas).filter(n => area === 'todas' || n.curso === area);
          const conArchivo = fichasMes.filter(t => t.adjunto_datos || t.adjunto_nombre).length;

          q('#resumenMes', cont).textContent =
            `${fichasMes.length} publicaciones · ${conArchivo} descargables · ${notasMes.length} notas`;

          const areasConAlgo = areas.filter(a =>
            (area === 'todas' || a === area) &&
            (fichasMes.some(t => t.curso === a) || notasMes.some(n => n.curso === a)));

          if (!areasConAlgo.length){
            q('#zonaAreas', cont).innerHTML = UI.sinDatos(
              `En ${U.nombreMes(mes.slice(5,7))} todavía no hay material ni notas para mostrar. ` +
              `Prueba con otro mes.`, '📚');
            return;
          }

          q('#zonaAreas', cont).innerHTML = `<div class="pila g16">` + areasConAlgo.map(a => {
            const fichas = fichasMes.filter(t => t.curso === a);
            const susNotas = notasMes.filter(n => n.curso === a);
            const prom = U.promedio(susNotas.map(n => n.nota));
            return `
              <section class="tarjeta tarjeta-area">
                <div class="cabeza">
                  <h3>📚 ${esc(a)}</h3>
                  <span class="etiqueta ${prom !== null ? 'e-azul' : 'e-gris'}">
                    ${prom !== null ? `Promedio del mes: ${prom} · ${U.literal(prom)}` : 'Sin nota este mes'}</span>
                </div>

                <h4 class="rotulo-bloque">🗂️ Material que subió tu profesor</h4>
                ${fichas.length ? `<div class="pila g8">${fichas.map(t => `
                  <div class="ficha-material">
                    <span class="loseta loseta-s ${(t.adjunto_datos || t.adjunto_nombre) ? 'l-verde' : 'l-azul'}">
                      ${(t.adjunto_datos || t.adjunto_nombre) ? '📥' : '📝'}</span>
                    <div class="txt">
                      <b>${esc(t.titulo)}</b>
                      <p>${esc(t.descripcion || 'Sin indicaciones adicionales.')}</p>
                      <div class="meta">
                        <span>🧑‍🏫 ${esc(t.docente || '—')}</span>
                        <span>📤 subido el ${esc(U.fechaLarga(t.creado_en))} a las ${esc(U.hora(t.creado_en))}</span>
                        ${t.vence ? `<span>📅 entrega: ${esc(U.fecha(t.vence))}</span>` : ''}
                        ${entregadas.has(t.id) ? UI.etiqueta('Ya la entregaste', 'e-verde') : ''}
                      </div>
                      ${(t.adjunto_datos || t.adjunto_nombre)
                        ? `<div class="mt8">${ModAcademico.enlaceAdjunto(t, 'tareas')}</div>`
                        : `<p class="t-xs t-mudo mt8">Esta indicación no trae archivo para descargar.</p>`}
                    </div>
                  </div>`).join('')}</div>`
                  : `<p class="t-s t-mudo">Tu profesor no subió material de esta área en ${esc(U.nombreMes(mes.slice(5,7)))}.</p>`}

                <h4 class="rotulo-bloque">📝 Notas registradas en el mes</h4>
                ${susNotas.length ? `<div class="fila g8 envolver">${susNotas.map(n => `
                  <span class="pastilla-nota n-${U.claseNota(n.nota)}">
                    <b>${Number(n.nota).toFixed(0)}</b>
                    <small>${esc(n.bimestre)} bim. · ${esc(U.fecha(n.creado_en))}</small>
                  </span>`).join('')}</div>`
                  : `<p class="t-s t-mudo">Sin notas de esta área en el mes.</p>`}
              </section>`;
          }).join('') + '</div>';
        }

        q('#selMes',  cont).onchange = e => { mes  = e.target.value; pintar(); };
        q('#selArea', cont).onchange = e => { area = e.target.value; pintar(); };
        pintar();
      }

      async function vista_ficha(cont){
          const est = await Datos.estudiantes.porId(s.estudiante_id);
          if (!est){ cont.innerHTML = UI.sinDatos('No encontramos tu ficha.', '🪪'); return; }

          const dato = (r, v) => `<div><dt>${esc(r)}</dt><dd>${esc(v ?? '—')}</dd></div>`;

          cont.innerHTML = `
            <div class="rejilla rejilla-2">
              <div class="tarjeta">
                <div class="fila g16 mb16">
                  ${UI.avatar(est.apellidos + ' ' + est.nombres, true).replace('avatar', 'avatar avatar-g')}
                  <div>
                    <h3>${esc(est.nombres)}</h3>
                    <div class="t-s t-mudo">${esc(est.apellidos)}</div>
                    <div class="fila g8 mt8">
                      ${UI.etiqueta(est.grado, 'e-azul')}
                      ${UI.etiqueta(est.estado, UI.claseEstado(est.estado))}
                    </div>
                  </div>
                </div>
                <dl class="ficha-lista">
                  ${dato('Código de matrícula', est.codigo)}
                  ${dato('DNI', est.dni)}
                  ${dato('Fecha de nacimiento', est.fecha_nac ? U.fechaLarga(est.fecha_nac) : null)}
                  ${dato('Edad', U.edad(est.fecha_nac) ? U.edad(est.fecha_nac) + ' años' : null)}
                  ${dato('Nivel', U.nivelDeGrado(est.grado))}
                  ${dato('Sección', est.seccion || 'Única')}
                </dl>
              </div>

              <div class="pila g16">
                <div class="tarjeta">
                  <div class="cabeza"><h3>👪 Mi apoderado</h3></div>
                  <dl class="ficha-lista">
                    ${dato('Nombre', est.apoderado)}
                    ${dato('Celular', est.celular)}
                    ${dato('Correo', est.correo_apoderado)}
                    ${dato('Dirección', est.direccion)}
                  </dl>
                </div>

                <div class="tarjeta">
                  <div class="cabeza"><h3>📄 Mis documentos</h3></div>
                  <p class="t-s t-mudo mb12">Puedes descargar tu libreta cuando tengas notas.
                  Las constancias las emite la oficina administrativa.</p>
                  <button class="btn btn-claro btn-bloque" id="btnMiLibreta">📄 Descargar mi libreta</button>
                </div>

                <div class="banda banda-ojo"><span class="ic">🔒</span>
                  <div>Si algún dato está mal, avisa en secretaría: tú no puedes
                  cambiarlo desde aquí, así se evitan errores.</div></div>
              </div>
            </div>`;

          q('#btnMiLibreta', cont).onclick = async () => {
            const { filas: notas } = await Datos.notas.listar({ estudiante_id: s.estudiante_id });
            if (!notas.length){ UI.ojo('Todavía no tienes notas registradas.'); return; }
            Reporte.libreta({ estudiante: est, notas });
          };
        }

      /* Los comunicados del estudiante son los que le tocan por rol y por
         grado: ModComunicacion.vistaLectura ya filtra eso. */
      function vista_comunicados(cont){ return ModComunicacion.vistaLectura(cont, s); }

      Panel.registrar('aula', {
        titulo:'Mi aula',
        descripcion:'Tus notas, tus áreas mes a mes, tus tareas y tu ficha',
        cargar:(cont) => Panel.secciones(cont, 'aula', [
          { id:'notas',  titulo:'Mis notas',  icono:'📝', cargar:vista_notas },
          { id:'areas',  titulo:'Mis áreas mes a mes', icono:'📚', cargar:vista_areas },
          { id:'tareas', titulo:'Mis tareas', icono:'📋', cargar:vista_tareas },
          { id:'ficha',  titulo:'Mi ficha',   icono:'🪪', cargar:vista_ficha },
        ]),
      });

      Panel.registrar('comunicados', {
        titulo:'Comunicados',
        descripcion:'Los avisos del colegio que te corresponden',
        cargar:vista_comunicados,
      });

      /* El estudiante tiene las dos maneras de escribir: la conversación
         general (a su grado, a la oficina, a la dirección) y el
         directorio, donde busca a CUALQUIER docente del colegio por su
         nombre y le escribe directo —con foto, video, audio o PDF si
         hace falta—. La profesora de computación o la de comunicación
         atienden todas las aulas, así que un estudiante tiene que poder
         preguntarles aunque no sean su tutora. */
      Panel.registrar('comunidad', {
        titulo:'Mensajes',
        descripcion:'Escríbele a cualquier profesor, a la oficina o a la dirección',
        cargar:(cont) => Panel.secciones(cont, 'comunidad', [
          { id:'mensajes',   titulo:'Conversación', icono:'💬',
            cargar:(z) => ModComunicacion.vistaMensajes(z, s) },
          { id:'directorio', titulo:'Buscar a un profesor', icono:'🔎',
            cargar:(z) => ModComunicacion.vistaDirectorio(z, s) },
        ]),
      });

      Panel.registrar('soporte', {
        titulo:'Ayuda',
        descripcion:'Cómo usar el sistema y a quién avisar si algo falla',
        cargar:(cont) => ModDireccion.vistaAyuda(cont, s),
      });
    },
  });
  if (sesionActual) avisarTareasPorVencer(sesionActual);
})();
