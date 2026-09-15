/* =====================================================================
   PANEL DE SOPORTE TÉCNICO
   ---------------------------------------------------------------------
   El área de soporte que pediste: atiende los casos, restablece
   contraseñas, vigila la salud de la plataforma, revisa quién entró y
   descarga los respaldos. No toca notas ni matrículas.
   ===================================================================== */
'use strict';

(() => {
  const { q, esc } = U;

  /* Soporte es el área técnica: su menú se agrupa igual que el resto
     —inicio, atención, seguridad y configuración institucional— sin
     entradas sueltas repetidas. */
  const MENU = [
    { id:'inicio',       texto:'Inicio',         icono:'🏠', grupo:'Panel' },
    { id:'atencion',     texto:'Atención',       icono:'🎫', grupo:'Soporte' },
    { id:'seguridad',    texto:'Seguridad',      icono:'🔐', grupo:'Soporte' },
    { id:'configuracion',texto:'Configuración',  icono:'🖼️', grupo:'Institución' },
    { id:'soporte',      texto:'Ayuda',          icono:'🛟', grupo:'Institución' },
  ];


  Panel.iniciar({
    roles:['soporte'],
    tituloPanel:'Soporte técnico',
    menu: MENU,
    inicial:'inicio',
    definirVistas(s){

      Panel.registrar('inicio', {
        titulo:'Estado general del sistema',
        descripcion:`Sistema de gestión ${IE.siglas} v${IE.version_sistema}`,
        async cargar(cont){
          cont.innerHTML = Panel.bienvenida(`
            <button class="btn btn-claro" id="btnMedir">↻ Medir ahora</button>`) +
            `<div class="rejilla rejilla-4 mb16" id="kpis">${UI.esqueleto(1)}</div>
             <div id="zonaSaludResumen">${UI.esqueleto(3)}</div>`;

          q('#btnMedir', cont).onclick = () => Panel.recargar('inicio');

          const [{ filas: tickets }, { filas: intentos }, { filas: usuarios }, { filas: auditoria }] =
            await Promise.all([
              Datos.tickets.listar({}, { limite:200 }),
              Datos.intentos.listar({}, { limite:200 }),
              Datos.usuarios.listar({ rol: ModPersonal.ROLES_PERSONAL }),
              Datos.auditoria.listar({}, { limite:60 }),
            ]);

          const abiertos = tickets.filter(t => t.estado === 'Abierto').length;
          const fallidos = intentos.filter(i => !i.exito).length;
          UI.contador('tickets', abiertos);

          q('#kpis', cont).innerHTML = `
            ${UI.kpi({ icono:'🎫', clase:'l-morado', valor:abiertos, rotulo:'Tickets abiertos' })}
            ${UI.kpi({ icono:'👥', clase:'l-marino', valor:usuarios.filter(u => u.activo).length, rotulo:'Cuentas activas' })}
            ${UI.kpi({ icono:'⛔️', clase:'l-rojo',   valor:fallidos, rotulo:'Intentos fallidos' })}
            ${UI.kpi({ icono:'📜', clase:'l-azul',   valor:auditoria.length, rotulo:'Eventos recientes' })}`;

          await ModSoporte.vistaSalud(q('#zonaSaludResumen', cont));
        },
      });

      Panel.registrar('atencion', {
        titulo:'Atención',
        descripcion:'Casos reportados y creación de cuentas del personal',
        cargar:(cont) => Panel.secciones(cont, 'atencion', [
          { id:'tickets', titulo:'Tickets', icono:'🎫',
            cargar:(z) => ModSoporte.vistaTickets(z, s) },
          /* Soporte crea las cuentas del personal: es el área que da de
             alta a una profesora nueva o a la persona de secretaría, y
             la que restablece una contraseña olvidada. */
          { id:'cuentas', titulo:'Crear y administrar cuentas', icono:'👥',
            cargar:(z) => ModPersonal.vistaPersonal(z, s, { modoSoporte:true }) },
        ]),
      });

      Panel.registrar('seguridad', {
        titulo:'Seguridad',
        descripcion:'Quién entró, qué se hizo y copias de respaldo',
        cargar:(cont) => Panel.secciones(cont, 'seguridad', [
          { id:'accesos', titulo:'Intentos de acceso', icono:'🔑',
            cargar:(z) => ModSoporte.vistaAccesos(z) },
          { id:'auditoria', titulo:'Auditoría', icono:'📜',
            cargar:(z) => ModSoporte.vistaAuditoria(z) },
          { id:'respaldos', titulo:'Respaldos', icono:'💾',
            cargar:(z) => ModSoporte.vistaRespaldos(z, s) },
        ]),
      });

      Panel.registrar('configuracion', {
        titulo:'Configuración institucional',
        descripcion:'La insignia, la firma, la fachada, los salones y todas las fotos del colegio',
        cargar:(cont) => ModSoporte.vistaApariencia(cont),
      });

      Panel.registrar('soporte', {
        titulo:'Ayuda',
        descripcion:'Guía de uso, contacto institucional y estado del sistema',
        cargar:(cont) => ModDireccion.vistaAyuda(cont, s),
      });
    },
  });
})();
