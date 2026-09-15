/* =====================================================================
   PUERTA DEL PERSONAL
   ---------------------------------------------------------------------
   Usuario y contraseña. Las cuentas las crea la institución; no hay
   registro público. La contraseña inicial es el DNI de cada persona y
   puede cambiarse desde el panel.
   ===================================================================== */
'use strict';

(() => {
  const { q } = U;

  if (Sesion.redirigirSiYaEntro()) return;

  const campoUsuario = q('#usuario');
  const campoClave   = q('#clave');
  const btn          = q('#btnPersonal');
  const form         = q('#formPersonal');

  Acceso.revisarBloqueoPrevio('per:', [btn]);

  /* El usuario siempre en minúsculas, sin espacios. */
  campoUsuario.addEventListener('input', () => {
    campoUsuario.value = campoUsuario.value.toLowerCase().replace(/\s/g, '');
  });

  /* Mostrar u ocultar la contraseña. */
  q('#verClave').onclick = () => {
    const oculta = campoClave.type === 'password';
    campoClave.type = oculta ? 'text' : 'password';
    q('#verClave').textContent = oculta ? '🙈' : '👁';
    campoClave.focus();
  };

  /* ------------------------------------------------------------------
     Envío
     ------------------------------------------------------------------ */
  form.onsubmit = async (ev) => {
    ev.preventDefault();
    Acceso.limpiar(['usuario', 'clave']);

    const usuario = campoUsuario.value.trim();

    if (!usuario){
      Acceso.marcar('usuario', 'Escribe tu usuario.');
      campoUsuario.focus();
      return;
    }
    if (!campoClave.value){
      Acceso.marcar('clave', 'Escribe tu contraseña.');
      campoClave.focus();
      return;
    }

    const restaurar = Acceso.esperar(btn);
    const r = await Sesion.entrarPersonal(usuario, campoClave.value);

    if (r.ok){
      btn.innerHTML = '¡Bienvenido! →';
      UI.exito(`Hola, ${String(r.sesion.nombres).split(' ')[0]} 👋`);
      setTimeout(() => location.href = RUTA.panel(r.sesion.rol), 480);
      return;
    }

    restaurar();
    Acceso.marcar('clave', r.mensaje);
    campoClave.value = '';
    campoClave.focus();

    const bloqueo = r.bloqueado || Seg.segundosDeBloqueo('per:' + usuario.toLowerCase());
    if (bloqueo > 0) Acceso.mostrarBloqueo(bloqueo, [btn]);
  };

  /* ------------------------------------------------------------------
     Ayuda
     ------------------------------------------------------------------ */
  q('#ayudaPersonal').onclick = e => {
    e.preventDefault();
    Chatbot.abrir('Olvidé mi contraseña');
  };
})();
