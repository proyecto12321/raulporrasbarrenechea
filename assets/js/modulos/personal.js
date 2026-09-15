/* =====================================================================
   MÓDULO: PERSONAL Y CUENTAS
   ---------------------------------------------------------------------
   Aquí nacen TODAS las cuentas del sistema. No hay registro público:
   dirección crea la cuenta (y soporte puede restablecerla) y la
   contraseña inicial es el DNI de la persona, fácil de recordar y de
   dictar por teléfono. Se guarda derivada con PBKDF2, nunca en claro, y
   cada quien puede cambiarla desde su panel.

   Los estudiantes no tienen cuenta con contraseña: entran con su DNI
   validado contra el padrón, así que no aparecen en esta lista.
   ===================================================================== */
'use strict';

const ModPersonal = (() => {
  const { q, qq, esc } = U;

  const ROLES_PERSONAL = ['director','docente','administrativo','soporte'];

  /* ==================================================================
     LISTA DE CUENTAS
     ================================================================== */
  async function vistaPersonal(cont, sesion, { modoSoporte = false } = {}){
    let todos = [], grados = [];

    cont.innerHTML = `
      <div class="banda banda-ojo mb16"><span class="ic">🔐</span>
        <div>Las cuentas se crean solo desde aquí, para personal que ya
        trabaja en la institución. La <b>contraseña inicial es el DNI</b> de
        cada persona; cada quien puede cambiarla desde su propio panel.</div></div>

      ${UI.herramientas({
        pista:'Buscar por nombre, usuario o DNI…',
        filtros:[
          { id:'filtroRol', opciones:[{ valor:'todos', texto:'Todos los roles' },
              ...ROLES_PERSONAL.map(r => ({ valor:r, texto:ROLES[r].nombre }))] },
          { id:'filtroActivo', opciones:[
              { valor:'todos', texto:'Activos e inactivos' },
              { valor:'1', texto:'Solo activos' },
              { valor:'0', texto:'Solo desactivados' }] },
        ],
        acciones:`
          <button class="btn btn-marino btn-s" id="btnRepPersonal">📄 Reporte</button>
          <button class="btn btn-oro btn-s" id="btnNuevaCuenta">＋ Nueva cuenta</button>`,
      })}
      <div class="rejilla rejilla-4 mb16" id="kpiPersonal"></div>
      <div id="zonaPersonal">${UI.esqueleto(4)}</div>`;

    async function cargar(){
      const [u, g] = await Promise.all([
        Datos.usuarios.listar({ rol: ROLES_PERSONAL }, { orden:'nombres', asc:true }),
        Datos.grados.listar({}, { orden:'orden', asc:true }),
      ]);
      todos = u.filas; grados = g.filas;
      pintar();
    }

    function filtradas(){
      const t = q('#buscador', cont).value;
      const r = q('#filtroRol', cont).value;
      const a = q('#filtroActivo', cont).value;
      return todos.filter(u =>
        U.coincide(u, t, ['nombres','usuario','dni','correo','cargo']) &&
        (r === 'todos' || u.rol === r) &&
        (a === 'todos' || String(u.activo ?? 1) === a));
    }

    function pintar(){
      const lista = filtradas();

      q('#kpiPersonal', cont).innerHTML = `
        ${UI.kpi({ icono:'👥', clase:'l-marino', valor: todos.length, rotulo:'Cuentas del personal' })}
        ${UI.kpi({ icono:'📘', clase:'l-verde',  valor: todos.filter(u => u.rol === 'docente').length, rotulo:'Docentes' })}
        ${UI.kpi({ icono:'✅', clase:'l-azul',   valor: todos.filter(u => u.activo).length, rotulo:'Cuentas activas' })}
        ${UI.kpi({ icono:'🔑', clase:'l-naranja',valor: todos.filter(u => !u.ultimo_acceso).length, rotulo:'Nunca ingresaron' })}`;

      q('#contadorRes', cont).textContent = `${lista.length} de ${todos.length} cuentas`;

      q('#zonaPersonal', cont).innerHTML = UI.tabla({
        columnas:[
          { titulo:'Persona', valor:u => `
            <div class="fila g12">
              ${UI.avatar(u.nombres)}
              <div class="min0">
                <b class="t-s">${esc(u.nombres)}</b>
                <div class="t-xs t-mudo">${esc(u.cargo || ROLES[u.rol]?.nombre || '')}</div>
              </div>
            </div>` },
          { titulo:'Usuario', valor:u => `<span class="t-mono t-s">${esc(u.usuario)}</span>` },
          { titulo:'Rol', valor:u => UI.etiqueta(ROLES[u.rol]?.nombre || u.rol,
              { director:'e-morado', docente:'e-verde', administrativo:'e-azul', soporte:'e-naranja' }[u.rol] || 'e-gris') },
          { titulo:'Aulas', valor:u => u.grados_asignados
              ? `<span class="t-xs">${esc(String(u.grados_asignados).split(',').length)} aula(s)</span>`
              : '<span class="t-mudo t-xs">—</span>' },
          { titulo:'Último acceso', valor:u => u.ultimo_acceso
              ? `<span class="t-xs">${esc(U.hace(u.ultimo_acceso))}</span>`
              : '<span class="t-mudo t-xs">nunca</span>' },
          { titulo:'Estado', valor:u => u.activo
              ? UI.etiqueta('Activa', 'e-verde')
              : UI.etiqueta('Desactivada', 'e-rojo') },
          { titulo:'', clase:'acciones', valor:u => `
            <div class="acciones">
              <button class="btn-ico" data-editar-u="${u.id}" title="Editar">✏️</button>
              <button class="btn-ico" data-clave-u="${u.id}" title="Restablecer contraseña">🔑</button>
              <button class="btn-ico" data-activo-u="${u.id}" title="${u.activo ? 'Desactivar' : 'Activar'}">${u.activo ? '🚫' : '✅'}</button>
              <button class="btn-ico" data-borrar-u="${u.id}" title="Eliminar cuenta">🗑</button>
            </div>` },
        ],
        filas: lista,
        vacio:'No hay cuentas con esos filtros.',
        iconoVacio:'👥',
      });
    }

    cont.addEventListener('click', async e => {
      const ed = e.target.closest('[data-editar-u]');
      const cl = e.target.closest('[data-clave-u]');
      const ac = e.target.closest('[data-activo-u]');
      const bo = e.target.closest('[data-borrar-u]');
      const src = ed || cl || ac || bo;
      const id = +(src?.dataset.editarU || src?.dataset.claveU || src?.dataset.activoU || src?.dataset.borrarU);
      const u = todos.find(x => x.id === id);
      if (!u) return;

      if (ed) abrirFormulario({ usuario:u, grados, sesion, alGuardar: cargar });

      if (cl) await restablecerClave(u, sesion, cargar);

      /* Eliminar una cuenta de verdad, pero con integridad: si esa
         persona ya dejó rastro académico (notas, tareas, asistencia) no
         se borra —se desactiva—, porque borrarla dejaría registros
         huérfanos y perdería historial del colegio. */
      if (bo){
        if (u.id === sesion.id || u.nombres === sesion.nombres){
          UI.fallo('No puedes eliminar tu propia cuenta.');
          return;
        }
        const [{ filas: notas }, { filas: tareas }, { filas: asistencia }] = await Promise.all([
          Datos.notas.listar({ docente: u.nombres }, { limite:1 }).catch(() => ({ filas:[] })),
          Datos.tareas.listar({ docente: u.nombres }, { limite:1 }).catch(() => ({ filas:[] })),
          Datos.asistencia.listar({ registrado_por: u.nombres }, { limite:1 }).catch(() => ({ filas:[] })),
        ]);
        const conHistorial = notas.length || tareas.length || asistencia.length;

        if (conHistorial){
          const ok = await UI.confirmar({
            titulo:'Esta cuenta tiene historial académico',
            aceptar:'Desactivarla',
            texto:`${u.nombres} ya registró notas, tareas o asistencia. Si se borrara, esos registros quedarían sin dueño. ` +
                  'Lo correcto es desactivar la cuenta: la persona deja de ingresar y el historial se conserva.',
          });
          if (!ok) return;
          await Datos.usuarios.actualizar(u.id, { activo:0 });
          Datos.auditar('Cuenta desactivada (tenía historial)', 'Seguridad', { detalle: u.usuario });
          UI.exito('Cuenta desactivada. El historial se conserva.');
          cargar();
          return;
        }

        const ok = await UI.confirmar({
          titulo:'Eliminar cuenta definitivamente', peligro:true, aceptar:'Sí, eliminar',
          texto:`Se eliminará la cuenta de ${u.nombres} (${u.usuario}). No tiene notas, tareas ni asistencia registradas, ` +
                'así que no se pierde historial. Esta acción no se puede deshacer.',
        });
        if (!ok) return;
        try {
          await Datos.usuarios.eliminar(u.id);
          Datos.auditar('Cuenta eliminada', 'Seguridad', { detalle: `${u.nombres} (${u.usuario})` });
          UI.exito('Cuenta eliminada.');
        } catch(err){
          UI.fallo('No se pudo eliminar: ' + err.message);
        }
        cargar();
      }

      if (ac){
        const ok = await UI.confirmar({
          titulo: u.activo ? 'Desactivar cuenta' : 'Activar cuenta',
          peligro: !!u.activo,
          aceptar: u.activo ? 'Sí, desactivar' : 'Sí, activar',
          texto: u.activo
            ? `${u.nombres} no podrá ingresar al sistema hasta que la reactives. Sus datos se conservan.`
            : `${u.nombres} volverá a poder ingresar con su usuario.`,
        });
        if (!ok) return;
        await Datos.usuarios.actualizar(u.id, { activo: u.activo ? 0 : 1 });
        Datos.auditar(u.activo ? 'Cuenta desactivada' : 'Cuenta activada', 'Seguridad', { detalle: u.usuario });
        UI.exito('Cuenta actualizada.');
        cargar();
      }
    });

    q('#btnNuevaCuenta', cont).onclick = () =>
      abrirFormulario({ grados, sesion, alGuardar: cargar });

    q('#btnRepPersonal', cont).onclick = () => Reporte.listado({
      titulo:'Personal y cuentas del sistema',
      columnas:[
        { titulo:'Nombres', campo:'nombres' }, { titulo:'DNI', campo:'dni' },
        { titulo:'Usuario', campo:'usuario' },
        { titulo:'Rol', valor:u => ROLES[u.rol]?.nombre || u.rol },
        { titulo:'Cargo', campo:'cargo' }, { titulo:'Celular', campo:'celular' },
        { titulo:'Estado', valor:u => u.activo ? 'Activa' : 'Desactivada' },
        { titulo:'Último acceso', valor:u => u.ultimo_acceso ? U.fechaHora(u.ultimo_acceso) : 'Nunca' },
      ],
      filas: filtradas(),
      resumen:[
        { valor: filtradas().length, rotulo:'Cuentas' },
        { valor: filtradas().filter(u => u.activo).length, rotulo:'Activas' },
        { valor: filtradas().filter(u => u.rol === 'docente').length, rotulo:'Docentes' },
      ],
      obligatorios:['nombres','usuario','rol'],
    });

    Panel.conectarHerramientas(cont, pintar);
    await cargar();
  }

  /* ==================================================================
     ALTA Y EDICIÓN DE CUENTAS
     ================================================================== */
  function abrirFormulario({ usuario = null, grados = [], sesion, alGuardar }){
    const editando = !!usuario;
    const listaGrados = grados.length ? grados.map(g => g.nombre) : GRADOS;

    const campos = [
      { tipo:'separador', etiqueta:'Datos de la persona' },
      { id:'nombres', etiqueta:'Nombres y apellidos', icono:'🧑', requerido:true, limpiar:'nombre',
        ancho:'completo', valor: usuario?.nombres,
        valida:v => U.val.largo(v, 5, 90) || 'Escribe el nombre completo.' },
      { id:'dni', etiqueta:'DNI', icono:'🪪', requerido:true, limpiar:'dni', valor: usuario?.dni,
        atributos:{ inputmode:'numeric', maxlength:8 },
        valida:v => U.dniPlausible(v) || 'DNI de 8 dígitos.' },
      { id:'celular', etiqueta:'Celular', icono:'📱', limpiar:'num', valor: usuario?.celular,
        atributos:{ inputmode:'numeric', maxlength:9 },
        valida:v => U.val.celular(v) || 'Celular de 9 dígitos.' },
      { id:'correo', etiqueta:'Correo institucional', tipo:'email', icono:'✉️', valor: usuario?.correo,
        ancho:'completo', valida:v => U.val.correo(v) || 'Revisa el correo.' },

      { tipo:'separador', etiqueta:'Acceso al sistema' },
      { id:'rol', etiqueta:'Rol', tipo:'select', icono:'🎭', requerido:true, valor: usuario?.rol,
        opciones: ROLES_PERSONAL.map(r => ({ valor:r, texto:ROLES[r].nombre })) },
      { id:'usuario', etiqueta:'Nombre de usuario', icono:'👤', requerido:true, valor: usuario?.usuario,
        soloLectura: editando, ayuda: editando ? 'El usuario no se puede cambiar.' : 'Se propone solo; puedes ajustarlo.',
        valida:v => U.val.usuario(v) || 'De 4 a 24 letras, números, punto, guion o guion bajo.' },
      { id:'cargo', etiqueta:'Cargo', icono:'💼', valor: usuario?.cargo, ancho:'completo' },
    ];

    const cuerpo = U.crear('div');
    cuerpo.append(UI.formulario(campos, { columnas:2 }));

    /* Selección de aulas para docentes. */
    const asignadas = String(usuario?.grados_asignados || '').split(',').filter(Boolean);
    cuerpo.insertAdjacentHTML('beforeend', `
      <div id="zonaAulas" class="${usuario && usuario.rol !== 'docente' ? 'oculto' : ''}">
        <div class="t-xs t-fuerte t-mudo mt16 rotulo-seccion">Aulas a cargo</div>
        <hr class="linea-div linea-ajustada">
        <div class="fila g8 envolver">
          ${listaGrados.map(g => `
            <label class="etiqueta ${asignadas.includes(g) ? 'e-oro' : 'e-gris'} cursor-mano">
              <input type="checkbox" value="${esc(g)}" class="aula-chk"
                ${asignadas.includes(g) ? 'checked' : ''} class="chk-oro">
              ${esc(g)}
            </label>`).join('')}
        </div>
        <div class="t-xs t-mudo mt8">Solo verá y calificará a los estudiantes de estas aulas.</div>
      </div>`);

    const m = UI.modal({
      titulo: editando ? 'Editar cuenta' : 'Nueva cuenta del personal',
      subtitulo: editando ? `Usuario: ${usuario.usuario}` : 'La persona debe formar parte de la institución.',
      cuerpo, ancho:'ancha',
      botones:[
        { texto:'Cancelar', clase:'btn-fantasma', esperando:false, accion: () => {} },
        { texto: editando ? 'Guardar cambios' : 'Crear cuenta', clase:'btn-oro', esperandoTexto:'Guardando…',
          accion: async ({ zona }) => {
            const d = UI.leerFormulario(zona, campos);
            if (!UI.validarFormulario(zona, campos, d)) return false;

            const aulas = qq('.aula-chk:checked', zona).map(c => c.value).join(',');
            const registro = {
              nombres: d.nombres, dni: d.dni, celular: d.celular, correo: d.correo,
              rol: d.rol, cargo: d.cargo || ROLES[d.rol].nombre,
              grados_asignados: d.rol === 'docente' ? (aulas || null) : null,
            };

            if (editando){
              await Datos.usuarios.actualizar(usuario.id, registro);
              Datos.auditar('Cuenta del personal actualizada', 'Seguridad', { detalle: usuario.usuario });
              UI.exito('Cuenta actualizada.');
              if (alGuardar) alGuardar();
              return;
            }

            /* --- Alta: comprobar duplicados --- */
            const porUsuario = await Datos.usuarios.buscarUno({ usuario: d.usuario.toLowerCase() });
            if (porUsuario){ UI.marcarCampo(zona, 'usuario', 'Ese usuario ya existe.'); return false; }
            const porDni = await Datos.usuarios.buscarUno({ dni: d.dni });
            if (porDni){ UI.marcarCampo(zona, 'dni', `Ese DNI ya tiene cuenta (${porDni.usuario}).`); return false; }

            /* La contraseña inicial es el DNI: fácil de recordar y de
               dictar por teléfono. Se guarda derivada con PBKDF2, así que
               en la base de datos no queda el DNI en claro como clave. */
            const cifrada = await Seg.cifrar(d.dni);

            await Datos.usuarios.crear({
              ...registro,
              usuario: d.usuario.toLowerCase(),
              clave: cifrada,
              algoritmo: 'pbkdf2',
              activo: 1,
              debe_cambiar_clave: 0,
              creado_por: sesion.nombres,
            });

            Datos.auditar('Cuenta del personal creada', 'Seguridad', { detalle: `${d.usuario} (${d.rol})` });
            mostrarCredencial(d.nombres, d.usuario.toLowerCase(), d.dni);
            if (alGuardar) alGuardar();
          } },
      ],
    });

    /* Propone el usuario a partir del nombre: primera letra + apellido. */
    if (!editando){
      const campoNombre = q('#nombres', m.zona);
      const campoUsuario = q('#usuario', m.zona);
      campoNombre.addEventListener('blur', () => {
        if (campoUsuario.value) return;
        const partes = U.sinTildes(campoNombre.value).split(/\s+/).filter(Boolean);
        if (partes.length >= 2)
          campoUsuario.value = (partes[0][0] + partes[partes.length - 2]).replace(/[^a-z0-9]/g, '').slice(0, 20);
      });
    }

    /* Muestra u oculta las aulas según el rol. */
    q('#rol', m.zona).addEventListener('change', e => {
      q('#zonaAulas', m.zona).classList.toggle('oculto', e.target.value !== 'docente');
    });
    qq('.aula-chk', m.zona).forEach(c => c.addEventListener('change', () => {
      c.closest('label').className = 'etiqueta ' + (c.checked ? 'e-oro' : 'e-gris');
    }));

    ['dni','celular'].forEach(id => {
      const el = q('#' + id, m.zona);
      if (el) el.addEventListener('input', () =>
        el.value = U.soloDigitos(el.value, id === 'celular' ? 9 : 8));
    });
  }

  /* ==================================================================
     CONTRASEÑA TEMPORAL — se muestra una sola vez
     ================================================================== */
  function mostrarCredencial(nombre, usuario, clave){
    UI.modal({
      titulo:'Cuenta lista',
      subtitulo:'Entrega estos datos a la persona, en privado.',
      cuerpo:`
        <div class="tarjeta tarjeta-solida t-c fondo-lienzo">
          <div class="t-s t-mudo">Persona</div>
          <div class="t-l t-fuerte mb12">${esc(nombre)}</div>
          <div class="t-s t-mudo">Usuario</div>
          <div class="t-mono titulo-modal">${esc(usuario)}</div>
          <div class="t-s t-mudo">Contraseña (su DNI)</div>
          <div class="t-mono clave-generada">${esc(clave)}</div>
        </div>

        <div class="banda banda-ojo mt16"><span class="ic">🔐</span>
          <div>La contraseña <b>es su propio DNI</b>. En la base de datos queda
          derivada con PBKDF2, no en texto legible, así que aunque alguien lea
          la tabla no puede iniciar sesión con lo que ve.
          Recomiéndale cambiarla desde su panel.</div></div>`,
      botones:[
        { texto:'Copiar credenciales', clase:'btn-claro', esperando:false,
          accion: async () => {
            await U.copiar(`Usuario: ${usuario}\nContraseña: ${clave} (su DNI)\nPuedes cambiarla desde tu panel.`);
            UI.exito('Copiado al portapapeles.');
            return false;
          } },
        { texto:'Listo', clase:'btn-oro', esperando:false },
      ],
    });
  }

  async function restablecerClave(usuario, sesion, alTerminar){
    const ok = await UI.confirmar({
      titulo:'Restablecer contraseña',
      aceptar:'Sí, volver al DNI',
      texto:`La contraseña de ${usuario.nombres} volverá a ser su DNI (${usuario.dni}). ` +
            `La actual dejará de funcionar de inmediato y también se levanta cualquier bloqueo.`,
    });
    if (!ok) return;

    const cifrada = await Seg.cifrar(usuario.dni);
    await Datos.usuarios.actualizar(usuario.id, {
      clave: cifrada, algoritmo:'pbkdf2', debe_cambiar_clave:0,
      intentos_fallidos:0, bloqueado_hasta:null,
    });
    Datos.auditar('Contraseña restablecida al DNI', 'Seguridad', { detalle: usuario.usuario });
    mostrarCredencial(usuario.nombres, usuario.usuario, usuario.dni);
    if (alTerminar) alTerminar();
  }

  /* ==================================================================
     EVALUACIÓN DOCENTE (Likert) — solo Dirección o Administrativo
     ------------------------------------------------------------------
     Preguntas predeterminadas (editables desde aquí mismo) sobre una
     escala de 1 a 5 ("Muy mal" … "Muy bien"). Cada evaluación queda
     guardada con quién la hizo y cuándo, y se ve el promedio histórico
     de cada docente.
     ================================================================== */
  async function vistaEvaluacionDocente(cont, sesion){
    const [{ filas: docentes }, preguntas] = await Promise.all([
      Datos.usuarios.listar({ rol:'docente' }, { orden:'nombres', asc:true }),
      Datos.evaluaciones.preguntas(),
    ]);

    cont.innerHTML = `
      ${UI.herramientas({
        pista:'Buscar docente por nombre o DNI…',
        acciones:`<button class="btn btn-claro btn-s" id="btnPreguntas">✏️ Editar preguntas</button>`,
      })}
      <div class="rejilla rejilla-3" id="listaDocentesEval">${UI.esqueleto(3)}</div>`;

    function pintar(){
      const t = U.sinTildes((q('#buscador', cont) || {}).value || '');
      const filtrados = docentes.filter(d =>
        !t || U.sinTildes(d.nombres).includes(t) || (d.dni || '').includes(t));
      q('#listaDocentesEval', cont).innerHTML = filtrados.length ? filtrados.map(d => `
        <div class="tarjeta">
          <div class="fila g12 centrado-v">
            <span class="loseta l-marino">🧑‍🏫</span>
            <div class="crece">
              <b>${esc(d.nombres)}</b>
              <small class="t-mudo">DNI ${esc(d.dni || '—')} · ${esc(d.grados_asignados || 'Sin aula asignada')}</small>
            </div>
          </div>
          <div class="fila g8 mt12 entre centrado-v">
            <span class="t-xs t-mudo" id="prom_${d.id}">Cargando promedio…</span>
            <button class="btn btn-oro btn-s" data-evaluar="${d.id}">Evaluar</button>
          </div>
        </div>`).join('') : `<p class="t-mudo">No hay docentes con ese nombre o DNI.</p>`;

      filtrados.forEach(async d => {
        const historial = await Datos.evaluaciones.deDocente(d.nombres);
        const el = q(`#prom_${d.id}`, cont);
        if (!el) return;
        el.textContent = historial.length
          ? `⭐ ${historial[0].promedio}/5 · ${historial.length} evaluación(es)`
          : 'Sin evaluaciones todavía';
      });
    }
    pintar();
    q('#buscador', cont).oninput = pintar;

    cont.onclick = e => {
      const btn = e.target.closest('[data-evaluar]');
      if (btn) abrirEvaluacion(docentes.find(d => String(d.id) === btn.dataset.evaluar));
    };

    function abrirEvaluacion(docente){
      const campos = preguntas.map((p, i) => ({
        id:`p${i}`, etiqueta:p, tipo:'select', ancho:'completo', requerido:true,
        opciones: Datos.ESCALA_EVALUACION,
      }));
      campos.push({ id:'comentario', etiqueta:'Comentario (opcional)', tipo:'area', filas:3, ancho:'completo' });

      UI.modal({
        titulo:`Evaluar a ${docente.nombres}`,
        subtitulo:'Escala de 1 (muy mal) a 5 (muy bien). La respuesta queda guardada con tu nombre.',
        cuerpo: UI.formulario(campos, { columnas:1 }),
        ancho:'ancha',
        botones:[
          { texto:'Cancelar', clase:'btn-fantasma', esperando:false, accion(){} },
          { texto:'Guardar evaluación', clase:'btn-oro', esperandoTexto:'Guardando…',
            accion: async ({ zona }) => {
              const datos = UI.leerFormulario(zona, campos);
              if (!UI.validarFormulario(zona, campos, datos)) return false;
              const respuestas = preguntas.map((p, i) => ({
                pregunta:p, puntaje: Datos.ESCALA_EVALUACION.indexOf(datos[`p${i}`]) + 1,
              }));
              await Datos.evaluaciones.registrar({
                docente: docente.nombres, respuestas,
                comentario: datos.comentario, evaluador: sesion,
              });
              UI.exito(`Evaluación de ${docente.nombres} guardada.`);
              Panel.recargar('evaluacion');
            } },
        ],
      });
    }

    q('#btnPreguntas', cont).onclick = () => {
      const campos = [
        { id:'lista', etiqueta:'Una pregunta por línea', tipo:'area', filas:8, ancho:'completo',
          valor: preguntas.join('\n'), requerido:true },
      ];
      UI.modal({
        titulo:'Preguntas del formulario de evaluación',
        subtitulo:'Estas son las que verá quien evalúe. Se puede volver a los valores de siempre borrando todo.',
        cuerpo: UI.formulario(campos, { columnas:1 }),
        botones:[
          { texto:'Cancelar', clase:'btn-fantasma', esperando:false, accion(){} },
          { texto:'Guardar preguntas', clase:'btn-oro', esperandoTexto:'Guardando…',
            accion: async ({ zona }) => {
              const lista = q('textarea, input', zona).value.split('\n').map(s => s.trim()).filter(Boolean);
              await Datos.evaluaciones.guardarPreguntas(lista.length ? lista : []);
              UI.exito('Preguntas actualizadas.');
              Panel.recargar('evaluacion');
            } },
        ],
      });
    };
  }

  return { vistaPersonal, abrirFormulario, restablecerClave, mostrarCredencial, ROLES_PERSONAL, vistaEvaluacionDocente };
})();
