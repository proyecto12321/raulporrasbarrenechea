/* =====================================================================
   SEGURIDAD
   ---------------------------------------------------------------------
   · Derivado de contraseñas con PBKDF2-HMAC-SHA256 (Web Crypto nativo).
   · Comparación en tiempo constante.
   · Control de intentos fallidos y bloqueo temporal.
   · Compatibilidad con el esquema anterior (SHA-256 simple) y migración
     automática a PBKDF2 la primera vez que el usuario entra bien.

   Formato guardado en la columna 'clave':
       pbkdf2$<iteraciones>$<sal en base64>$<derivado en base64>
   Formato antiguo aceptado (y migrado): 64 caracteres hexadecimales.
   ===================================================================== */
'use strict';

const Seg = (() => {

  const cripto = window.crypto && window.crypto.subtle ? window.crypto.subtle : null;

  /* ------------------------------------------------------------------
     Conversiones
     ------------------------------------------------------------------ */
  const aBytes = t => new TextEncoder().encode(t);
  const aB64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
  const deB64 = b64 => Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const aHex = buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');

  /* ------------------------------------------------------------------
     SHA-256 (compatibilidad con el esquema anterior)
     ------------------------------------------------------------------ */
  async function sha256(texto){
    if (!cripto) throw new Error('Este navegador no soporta Web Crypto.');
    return aHex(await cripto.digest('SHA-256', aBytes(texto)));
  }

  /* ------------------------------------------------------------------
     PBKDF2 — derivado lento, con sal aleatoria por usuario
     ------------------------------------------------------------------ */
  async function derivar(clave, sal, iteraciones){
    const base = await cripto.importKey('raw', aBytes(clave), 'PBKDF2', false, ['deriveBits']);
    return cripto.deriveBits(
      { name:'PBKDF2', salt:sal, iterations:iteraciones, hash:'SHA-256' },
      base, 256
    );
  }

  /* Genera el texto que se guarda en la base de datos. */
  async function cifrar(clave, iteraciones = SEGURIDAD.pbkdf2_iteraciones){
    if (!cripto) throw new Error('Este navegador no soporta Web Crypto.');
    const sal = crypto.getRandomValues(new Uint8Array(16));
    const bits = await derivar(clave, sal, iteraciones);
    return `pbkdf2$${iteraciones}$${aB64(sal)}$${aB64(bits)}`;
  }

  /* Compara sin filtrar información por el tiempo de respuesta. */
  function igualesEnTiempoConstante(a, b){
    if (a.length !== b.length) return false;
    let dif = 0;
    for (let i = 0; i < a.length; i++) dif |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return dif === 0;
  }

  /* Verifica una clave contra lo guardado. Devuelve:
       { ok: boolean, formato: 'pbkdf2' | 'sha256' | 'desconocido' }    */
  async function verificar(clave, guardado){
    if (!guardado) return { ok:false, formato:'desconocido' };

    /* Formato nuevo */
    if (String(guardado).startsWith('pbkdf2$')){
      const [, iter, salB64, hashB64] = String(guardado).split('$');
      try {
        const bits = await derivar(clave, deB64(salB64), parseInt(iter, 10));
        return { ok: igualesEnTiempoConstante(aB64(bits), hashB64), formato:'pbkdf2' };
      } catch { return { ok:false, formato:'pbkdf2' }; }
    }

    /* Formato antiguo: SHA-256 en hexadecimal */
    if (/^[a-f0-9]{64}$/i.test(String(guardado))){
      const h = await sha256(clave);
      return { ok: igualesEnTiempoConstante(h, String(guardado).toLowerCase()), formato:'sha256' };
    }

    return { ok:false, formato:'desconocido' };
  }

  /* ------------------------------------------------------------------
     Contraseñas temporales legibles (para altas de cuenta)
     ------------------------------------------------------------------ */
  /* Sílabas sin 'ñ' ni tildes: la contraseña temporal se dicta por teléfono
     y se escribe en cualquier teclado sin sorpresas. */
  const SILABAS = ['ba','ce','di','fo','gu','le','mi','no','pa','re','si','tu','va','ze','cha','llu','tri','pla'];
  function claveTemporal(){
    const al = n => crypto.getRandomValues(new Uint32Array(1))[0] % n;
    const s = () => SILABAS[al(SILABAS.length)];
    const t = (s() + s() + s());
    return t.charAt(0).toUpperCase() + t.slice(1) + String(al(90) + 10) + '*';
  }

  /* ------------------------------------------------------------------
     Control de intentos de acceso
     ---------------------------------------------------------------
     Se guarda en el navegador para frenar de inmediato y, además, se
     registra en la tabla 'intentos_acceso' para que soporte y dirección
     puedan auditar quién intentó entrar y cuándo.
     ------------------------------------------------------------------ */
  const LLAVE = 'rpb_intentos';

  function registroIntentos(){
    return U.guardado.leer(LLAVE, {});
  }

  /* ¿Está bloqueado? Devuelve los segundos que faltan (0 = libre). */
  function segundosDeBloqueo(identificador){
    const r = registroIntentos()[identificador];
    if (!r || !r.bloqueadoHasta) return 0;
    const faltan = Math.ceil((r.bloqueadoHasta - Date.now()) / 1000);
    return faltan > 0 ? faltan : 0;
  }

  function intentosRestantes(identificador){
    const r = registroIntentos()[identificador];
    if (!r) return SEGURIDAD.intentos_maximos;
    const caduco = Date.now() - (r.ultimo || 0) > SEGURIDAD.ventana_intentos_min * 60000;
    if (caduco) return SEGURIDAD.intentos_maximos;
    return Math.max(0, SEGURIDAD.intentos_maximos - (r.fallos || 0));
  }

  function anotarFallo(identificador){
    const todos = registroIntentos();
    const r = todos[identificador] || { fallos:0, ultimo:0 };
    const caduco = Date.now() - r.ultimo > SEGURIDAD.ventana_intentos_min * 60000;
    r.fallos = (caduco ? 0 : r.fallos) + 1;
    r.ultimo = Date.now();
    if (r.fallos >= SEGURIDAD.intentos_maximos){
      r.bloqueadoHasta = Date.now() + SEGURIDAD.minutos_bloqueo * 60000;
      r.fallos = 0;
    }
    todos[identificador] = r;
    U.guardado.escribir(LLAVE, todos);
    return r;
  }

  function limpiarIntentos(identificador){
    const todos = registroIntentos();
    delete todos[identificador];
    U.guardado.escribir(LLAVE, todos);
  }

  /* Deja constancia del intento en la base de datos (nunca bloquea la
     interfaz: si falla la red, el acceso continúa igual). */
  function anotarEnBitacora({ identificador, tipo, exito, motivo }){
    if (!db) return;
    db.from('intentos_acceso').insert({
      identificador: String(identificador || '').slice(0, 40),
      tipo, exito: exito ? 1 : 0,
      motivo: motivo || null,
      agente: navigator.userAgent.slice(0, 180),
    }).then(() => {}, () => {});
  }

  /* ------------------------------------------------------------------
     Anti-inyección: la librería de Supabase ya usa consultas
     parametrizadas, pero estos filtros evitan que un texto raro llegue
     a un operador de búsqueda (ilike, or, etc.).
     ------------------------------------------------------------------ */
  function filtroSeguro(texto){
    return String(texto || '')
      .replace(/[%_,()'"\\]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 60);
  }

  return {
    sha256, cifrar, verificar, claveTemporal,
    segundosDeBloqueo, intentosRestantes, anotarFallo, limpiarIntentos, anotarEnBitacora,
    filtroSeguro,
  };
})();
