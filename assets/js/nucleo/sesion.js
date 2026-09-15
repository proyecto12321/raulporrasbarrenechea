/* =====================================================================
   SESIÓN Y CONTROL DE ACCESO
   ---------------------------------------------------------------------
   Dos puertas de entrada, a propósito distintas:

     · ESTUDIANTE  → solo su DNI. Se comprueba contra la tabla
       'estudiantes': si el DNI no está matriculado en la institución,
       no entra. No hay registro público ni creación de cuentas.

     · PERSONAL    → usuario y contraseña (PBKDF2). Las cuentas las crea
       dirección o administración desde el panel; nadie se registra solo.

   Además: bloqueo por intentos, cierre por inactividad y guardia de rol
   en cada panel.
   ===================================================================== */
'use strict';

const Sesion = (() => {

  const LLAVE = 'rpb_sesion';
  let temporizadorInactividad = null;

  /* ------------------------------------------------------------------
     Lectura y escritura de la sesión
     ------------------------------------------------------------------ */
  function actual(){
    try {
      const s = JSON.parse(sessionStorage.getItem(LLAVE) || 'null');
      if (!s) return null;
      if (s.expira && Date.now() > s.expira){ cerrar(true); return null; }
      return s;
    } catch { return null; }
  }

  function guardar(s){
    s.expira = Date.now() + SEGURIDAD.minutos_inactividad * 60000;
    try { sessionStorage.setItem(LLAVE, JSON.stringify(s)); } catch {}
    return s;
  }

  function renovar(){
    const s = actual();
    if (s) guardar(s);
  }

  /* ------------------------------------------------------------------
     PUERTA 1 — Estudiante (solo DNI)
     ------------------------------------------------------------------ */
  async function entrarEstudiante(dniCrudo){
    const dni = U.soloDigitos(dniCrudo, 8);

    if (!U.dniPlausible(dni))
      return { ok:false, mensaje:'El DNI debe tener 8 dígitos. Revísalo e inténtalo otra vez.' };

    const bloqueo = Seg.segundosDeBloqueo('est:' + dni);
    if (bloqueo > 0)
      return { ok:false, bloqueado:bloqueo, mensaje:`Demasiados intentos. Vuelve a probar en ${Math.ceil(bloqueo/60)} min.` };

    let est;
    try {
      est = await Datos.estudiantes.porDNI(dni);
    } catch(e){
      return { ok:false, mensaje: e.message };
    }

    if (!est){
      Seg.anotarFallo('est:' + dni);
      Seg.anotarEnBitacora({ identificador:dni, tipo:'estudiante', exito:false, motivo:'DNI no registrado' });
      const quedan = Seg.intentosRestantes('est:' + dni);
      return {
        ok:false,
        mensaje: quedan > 0
          ? `Ese DNI no figura en el padrón de la institución. Te quedan ${quedan} intento${quedan === 1 ? '' : 's'}.`
          : 'Ese DNI no figura en el padrón. Acércate a secretaría o escribe a soporte.',
      };
    }

    if (est.estado !== 'Matriculado'){
      Seg.anotarEnBitacora({ identificador:dni, tipo:'estudiante', exito:false, motivo:'Estado ' + est.estado });
      return { ok:false, mensaje:`Tu matrícula figura como "${est.estado}". Acércate a secretaría para regularizarla.` };
    }

    Seg.limpiarIntentos('est:' + dni);
    Seg.anotarEnBitacora({ identificador:dni, tipo:'estudiante', exito:true });

    const s = guardar({
      tipo: 'estudiante',
      rol: 'estudiante',
      id: est.id,
      estudiante_id: est.id,
      nombres: `${est.nombres} ${est.apellidos}`.trim(),
      dni: est.dni,
      codigo: est.codigo,
      grado: est.grado,
      seccion: est.seccion || null,
      cargo: 'Estudiante',
      desde: Date.now(),
    });

    Datos.auditar('Inicio de sesión (estudiante)', 'Acceso');
    return { ok:true, sesion:s };
  }

  /* ------------------------------------------------------------------
     PUERTA 2 — Personal (usuario y contraseña)
     ------------------------------------------------------------------ */
  async function entrarPersonal(usuarioCrudo, clave){
    const usuario = U.limpiar(usuarioCrudo, 40).toLowerCase();

    if (!usuario || !clave)
      return { ok:false, mensaje:'Escribe tu usuario y tu contraseña.' };

    const bloqueo = Seg.segundosDeBloqueo('per:' + usuario);
    if (bloqueo > 0)
      return { ok:false, bloqueado:bloqueo, mensaje:`Cuenta bloqueada por seguridad. Vuelve a probar en ${Math.ceil(bloqueo/60)} min.` };

    let u;
    try {
      u = await Datos.usuarios.buscarUno({ usuario });
    } catch(e){
      return { ok:false, mensaje: e.message };
    }

    /* Mensaje idéntico para usuario inexistente y clave errada: así no se
       puede averiguar qué usuarios existen probando nombres. */
    const generico = 'Usuario o contraseña incorrectos.';

    if (!u || u.rol === 'estudiante'){
      Seg.anotarFallo('per:' + usuario);
      Seg.anotarEnBitacora({ identificador:usuario, tipo:'personal', exito:false, motivo:'Usuario inexistente' });
      return { ok:false, mensaje: generico + intentosTexto(usuario) };
    }

    if (!u.activo){
      Seg.anotarEnBitacora({ identificador:usuario, tipo:'personal', exito:false, motivo:'Cuenta desactivada' });
      return { ok:false, mensaje:'Tu cuenta está desactivada. Comunícate con soporte técnico.' };
    }

    if (u.bloqueado_hasta && new Date(u.bloqueado_hasta) > new Date()){
      return { ok:false, mensaje:'La cuenta está bloqueada por el administrador. Escribe a soporte técnico.' };
    }

    let comprobacion;
    try {
      comprobacion = await Seg.verificar(clave, u.clave);
    } catch(e){
      return { ok:false, mensaje:'Este navegador no permite verificar la contraseña de forma segura.' };
    }

    if (!comprobacion.ok){
      Seg.anotarFallo('per:' + usuario);
      Seg.anotarEnBitacora({ identificador:usuario, tipo:'personal', exito:false, motivo:'Clave incorrecta' });
      Datos.usuarios.actualizar(u.id, { intentos_fallidos: (u.intentos_fallidos || 0) + 1 }).catch(() => {});
      return { ok:false, mensaje: generico + intentosTexto(usuario) };
    }

    /* Entrada correcta ------------------------------------------------ */
    Seg.limpiarIntentos('per:' + usuario);
    Seg.anotarEnBitacora({ identificador:usuario, tipo:'personal', exito:true });

    /* Si la clave estaba guardada con el método antiguo (SHA-256 simple),
       se vuelve a guardar con PBKDF2 sin que el usuario note nada. */
    if (comprobacion.formato === 'sha256'){
      try {
        const nueva = await Seg.cifrar(clave);
        await Datos.usuarios.actualizar(u.id, { clave: nueva, algoritmo:'pbkdf2' });
      } catch(e){ console.warn('No se pudo migrar la clave:', e); }
    }

    Datos.usuarios.actualizar(u.id, {
      ultimo_acceso: new Date().toISOString(),
      intentos_fallidos: 0,
    }).catch(() => {});

    const s = guardar({
      tipo: 'personal',
      rol: u.rol,
      id: u.id,
      nombres: u.nombres,
      usuario: u.usuario,
      dni: u.dni,
      cargo: u.cargo || (ROLES[u.rol] ? ROLES[u.rol].nombre : ''),
      correo: u.correo || null,
      grados: u.grados_asignados || null,
      debe_cambiar_clave: u.debe_cambiar_clave === 1,
      desde: Date.now(),
    });

    Datos.auditar('Inicio de sesión', 'Acceso');
    return { ok:true, sesion:s, cambiarClave: s.debe_cambiar_clave };
  }

  function intentosTexto(id){
    const quedan = Seg.intentosRestantes('per:' + id);
    if (quedan >= SEGURIDAD.intentos_maximos) return '';
    if (quedan <= 0) return ' La cuenta quedará bloqueada temporalmente.';
    return ` Te queda${quedan === 1 ? '' : 'n'} ${quedan} intento${quedan === 1 ? '' : 's'}.`;
  }

  /* ------------------------------------------------------------------
     Cambio de contraseña (obligatorio en el primer ingreso)
     ------------------------------------------------------------------ */
  async function cambiarClave(claveActual, claveNueva){
    const s = actual();
    if (!s || s.tipo !== 'personal') return { ok:false, mensaje:'No hay una sesión de personal abierta.' };
    if (String(claveNueva).length < SEGURIDAD.largo_minimo_clave)
      return { ok:false, mensaje:`La nueva contraseña debe tener al menos ${SEGURIDAD.largo_minimo_clave} caracteres.` };
    if (U.fuerzaClave(claveNueva) < 2)
      return { ok:false, mensaje:'Combina mayúsculas, minúsculas y números para que sea más segura.' };

    const u = await Datos.usuarios.porId(s.id);
    const ok = await Seg.verificar(claveActual, u.clave);
    if (!ok.ok) return { ok:false, mensaje:'La contraseña actual no es correcta.' };

    const nueva = await Seg.cifrar(claveNueva);
    await Datos.usuarios.actualizar(s.id, { clave: nueva, algoritmo:'pbkdf2', debe_cambiar_clave: 0 });
    s.debe_cambiar_clave = false; guardar(s);
    Datos.auditar('Cambio de contraseña', 'Seguridad');
    return { ok:true, mensaje:'Contraseña actualizada.' };
  }

  /* ------------------------------------------------------------------
     Cierre de sesión
     ------------------------------------------------------------------ */
  function cerrar(silencioso){
    const s = actual();
    if (s && !silencioso) Datos.auditar('Cierre de sesión', 'Acceso');
    try { sessionStorage.removeItem(LLAVE); } catch {}
    clearTimeout(temporizadorInactividad);
    if (!silencioso) location.href = RUTA.acceso();
  }

  /* ------------------------------------------------------------------
     Guardia: se llama al inicio de cada panel
     ------------------------------------------------------------------ */
  function exigir(rolesPermitidos){
    const s = actual();
    if (!s){
      location.replace(RUTA.acceso() + '?motivo=sesion');
      return null;
    }
    const permitidos = Array.isArray(rolesPermitidos) ? rolesPermitidos : [rolesPermitidos];
    if (!permitidos.includes(s.rol)){
      location.replace(RUTA.panel(s.rol));
      return null;
    }
    vigilarInactividad();
    return s;
  }

  function puede(permiso){
    const s = actual();
    if (!s) return false;
    const r = ROLES[s.rol];
    return !!(r && r.permisos.includes(permiso));
  }

  /* ------------------------------------------------------------------
     Cierre automático por inactividad
     ------------------------------------------------------------------ */
  function vigilarInactividad(){
    const reiniciar = () => {
      clearTimeout(temporizadorInactividad);
      renovar();
      temporizadorInactividad = setTimeout(() => {
        if (typeof UI !== 'undefined') UI.aviso('Cerramos tu sesión por inactividad.', 'alerta');
        setTimeout(() => cerrar(), 1400);
      }, SEGURIDAD.minutos_inactividad * 60000);
    };
    ['click','keydown','scroll','touchstart'].forEach(ev =>
      document.addEventListener(ev, U.retardar(reiniciar, 1500), { passive:true }));
    reiniciar();
  }

  /* Si ya hay sesión abierta y se abre la pantalla de acceso, se salta
     directo al panel que corresponde. */
  function redirigirSiYaEntro(){
    const s = actual();
    if (s && s.rol){ location.replace(RUTA.panel(s.rol)); return true; }
    return false;
  }

  return {
    actual, guardar, renovar,
    entrarEstudiante, entrarPersonal, cambiarClave,
    cerrar, exigir, puede, redirigirSiYaEntro,
  };
})();
