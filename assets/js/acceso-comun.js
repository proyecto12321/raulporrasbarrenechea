/* =====================================================================
   ACCESO — lo que comparten las dos puertas
   ---------------------------------------------------------------------
   Los formularios viven en archivos distintos a propósito (el del
   estudiante y el del personal no se mezclan). Aquí está solo lo común:
   el aviso de contexto y la cuenta regresiva del bloqueo por intentos.
   ===================================================================== */
'use strict';

const Acceso = (() => {
  const { q } = U;

  /* ------------------------------------------------------------------
     Aviso de contexto (sesión vencida, rol equivocado, inactividad)
     ------------------------------------------------------------------ */
  const MOTIVOS = {
    sesion:   'Tu sesión se cerró. Vuelve a ingresar para continuar.',
    permiso:  'Ese panel no corresponde a tu rol.',
    inactivo: 'Cerramos tu sesión por inactividad.',
  };

  function mostrarMotivo(){
    const motivo = new URLSearchParams(location.search).get('motivo');
    if (!motivo || !MOTIVOS[motivo]) return;
    const caja = q('#avisoMotivo'), texto = q('#textoMotivo');
    if (!caja || !texto) return;
    texto.textContent = MOTIVOS[motivo];
    caja.classList.remove('oculto');
  }

  /* ------------------------------------------------------------------
     Bloqueo por intentos, con cuenta regresiva a la vista
     ------------------------------------------------------------------ */
  let reloj = null;

  function mostrarBloqueo(segundos, botones){
    const caja = q('#avisoBloqueo'), texto = q('#textoBloqueo');
    if (!caja || !texto) return;
    clearInterval(reloj);

    const habilitar = si => botones.forEach(b => { if (b) b.disabled = !si; });

    const pintar = () => {
      if (segundos <= 0){
        caja.classList.remove('ver');
        clearInterval(reloj);
        habilitar(true);
        return;
      }
      const m = Math.floor(segundos / 60), s = segundos % 60;
      texto.textContent =
        `Acceso bloqueado por seguridad. Podrás intentarlo de nuevo en ${m}:${String(s).padStart(2, '0')}.`;
      segundos--;
    };

    caja.classList.add('ver');
    habilitar(false);
    pintar();
    reloj = setInterval(pintar, 1000);
  }

  /* Al abrir la página, comprueba si quedó un bloqueo activo de este tipo. */
  function revisarBloqueoPrevio(prefijo, botones){
    const guardados = U.guardado.leer('rpb_intentos', {});
    let mayor = 0;
    Object.keys(guardados).forEach(k => {
      if (!k.startsWith(prefijo)) return;
      const s = Seg.segundosDeBloqueo(k);
      if (s > mayor) mayor = s;
    });
    if (mayor > 0) mostrarBloqueo(mayor, botones);
  }

  /* ------------------------------------------------------------------
     Marcar un campo con su mensaje
     ------------------------------------------------------------------ */
  function marcar(id, mensaje, bueno = false){
    const caja  = q('#caja_' + id);
    const pista = q('#pista_' + id);
    if (caja){ caja.classList.remove('mal', 'ok'); caja.classList.add(bueno ? 'ok' : 'mal'); }
    if (pista){
      pista.textContent = (bueno ? '✓ ' : '✕ ') + mensaje;
      pista.className = 'pista ver ' + (bueno ? 'buena' : 'mala');
    }
  }

  function limpiar(ids){
    ids.forEach(id => {
      const caja = q('#caja_' + id), pista = q('#pista_' + id);
      if (caja)  caja.classList.remove('mal', 'ok');
      if (pista){ pista.className = 'pista'; pista.textContent = ''; }
    });
  }

  /* ------------------------------------------------------------------
     Botón "esperando"
     ------------------------------------------------------------------ */
  function esperar(btn, texto = 'Verificando…'){
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="rueda"></span> ${texto}`;
    return () => { btn.disabled = false; btn.innerHTML = original; };
  }

  function iniciar(){
    mostrarMotivo();
    if (typeof Datos !== 'undefined' && Datos.config) Datos.config.obtener('logo_url').then(U.aplicarLogo).catch(() => {});
  }

  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', iniciar);
  else iniciar();

  return { mostrarBloqueo, revisarBloqueoPrevio, marcar, limpiar, esperar, MOTIVOS };
})();
