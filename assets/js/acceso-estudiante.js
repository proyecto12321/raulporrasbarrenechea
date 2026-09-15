/* =====================================================================
   PUERTA DEL ESTUDIANTE
   ---------------------------------------------------------------------
   Un solo campo: el DNI. Nada de teclado en pantalla, nada de
   contraseñas. El DNI se valida contra el padrón: si no está
   matriculado, no entra.
   ===================================================================== */
'use strict';

(() => {
  const { q } = U;

  /* Si ya hay sesión abierta, al panel directamente. */
  if (Sesion.redirigirSiYaEntro()) return;

  const campo = q('#dniAlumno');
  const btn   = q('#btnEstudiante');
  const form  = q('#formEstudiante');

  Acceso.revisarBloqueoPrevio('est:', [btn]);

  /* ------------------------------------------------------------------
     Solo dígitos, y pista mientras escribe
     ------------------------------------------------------------------ */
  campo.addEventListener('input', () => {
    campo.value = U.soloDigitos(campo.value, 8);
    pintarPista();
  });

  function pintarPista(){
    const v = campo.value;
    Acceso.limpiar(['dniAlumno']);
    const pista = q('#pista_dniAlumno');

    if (!v) return;
    if (v.length < 8){
      pista.textContent = `Faltan ${8 - v.length} dígito${8 - v.length === 1 ? '' : 's'}`;
      pista.className = 'pista ver';
      return;
    }
    if (U.dniPlausible(v)) Acceso.marcar('dniAlumno', 'DNI completo', true);
    else                   Acceso.marcar('dniAlumno', 'Ese número no parece un DNI válido');
  }

  /* ------------------------------------------------------------------
     Envío
     ------------------------------------------------------------------ */
  form.onsubmit = async (ev) => {
    ev.preventDefault();
    const restaurar = Acceso.esperar(btn);

    const r = await Sesion.entrarEstudiante(campo.value);

    if (r.ok){
      btn.innerHTML = '¡Bienvenido! →';
      UI.exito(`Hola, ${String(r.sesion.nombres).split(' ')[0]} 👋`);
      setTimeout(() => location.href = RUTA.panel('estudiante'), 480);
      return;
    }

    restaurar();
    Acceso.marcar('dniAlumno', r.mensaje);
    campo.focus();
    campo.select();

    const clave = 'est:' + U.soloDigitos(campo.value, 8);
    const bloqueo = r.bloqueado || Seg.segundosDeBloqueo(clave);
    if (bloqueo > 0) Acceso.mostrarBloqueo(bloqueo, [btn]);
  };

  /* ------------------------------------------------------------------
     Ayuda
     ------------------------------------------------------------------ */
  q('#ayudaEstudiante').onclick = e => {
    e.preventDefault();
    Chatbot.abrir('No puedo ingresar con mi DNI');
  };
})();
