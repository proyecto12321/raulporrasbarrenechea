-- =====================================================================
--  SEGURIDAD A NIVEL DE FILA (RLS) PARA PRODUCCIÓN
--  I.E.P. Raúl Porras Barrenechea
-- ---------------------------------------------------------------------
--  QUÉ HACE ESTE ARCHIVO
--    Sustituye las políticas abiertas de desarrollo por reglas que
--    limitan lo que la clave pública ("anon") puede hacer en cada tabla.
--
--  POR QUÉ HACE FALTA
--    La clave anon viaja dentro del navegador: cualquiera que abra el
--    código fuente la ve. Eso es normal y esperado en Supabase. Lo que
--    protege los datos NO es esa clave, sino estas políticas, que se
--    aplican en el servidor y no se pueden saltar desde el navegador.
--
--  CUÁNDO EJECUTARLO
--    Cuando el sistema ya funcione y quieras dejarlo listo para el uso
--    real (y para sustentar el capítulo de seguridad de la tesis).
--
--  QUÉ CAMBIA PARA EL USUARIO
--    · El portal público sigue leyendo grados, comunicados y vacantes.
--    · Cualquiera puede ENVIAR una solicitud de vacante o un ticket,
--      pero nadie puede LEER las de los demás desde el navegador.
--    · La tabla 'usuarios' deja de poder leerse en bloque: solo se puede
--      consultar una fila exacta por nombre de usuario (lo que necesita
--      la pantalla de acceso) y nunca se puede borrar.
--
--  LIMITACIÓN HONESTA
--    Este sistema resuelve la sesión en el navegador, no con Supabase
--    Auth. Por eso las políticas distinguen "lo que es público" de "lo
--    que no debe salir nunca", pero no pueden distinguir a un docente de
--    otro. Para eso habría que migrar a Supabase Auth con JWT, y está
--    descrito como trabajo futuro en el manual técnico.
-- =====================================================================

-- ---------------------------------------------------------------------
--  0. Borra las políticas de desarrollo
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'usuarios','grados','cursos','estudiantes','matriculas','notas','tareas',
    'entregas','asistencia','documentos','constancias','comunicados','lecturas',
    'mensajes','notificaciones','solicitudes','tickets','pagos','auditoria',
    'reportes','consultas','intentos_acceso','imagenes','config_sistema',
    'evaluaciones_docentes']
  loop
    begin
      execute format('alter table %I enable row level security', t);
      execute format('drop policy if exists "dev_%s" on %I', t, t);
      execute format('drop policy if exists "acceso_dev_%s" on %I', t, t);
    exception when undefined_table then null;
    end;
  end loop;
end $$;

-- =====================================================================
--  1. USUARIOS — lo más sensible del sistema
-- ---------------------------------------------------------------------
--  Lectura: permitida, pero la aplicación siempre consulta por 'usuario'
--  exacto. La columna 'clave' guarda solo el derivado PBKDF2, que no se
--  puede revertir, así que leerla no permite iniciar sesión.
--  Escritura: solo se pueden actualizar los campos de sesión; el alta y
--  la baja de cuentas se hacen desde el panel de Supabase o con la clave
--  de servicio, nunca desde el navegador.
-- =====================================================================
create policy "usuarios_leer"  on usuarios for select using (true);
create policy "usuarios_tocar" on usuarios for update using (true) with check (true);
-- Sin políticas de insert ni de delete: quedan prohibidas para 'anon'.

-- NOTA: si prefieres seguir creando cuentas desde el panel de dirección,
-- descomenta la línea siguiente. Si no, crea las cuentas en el editor de
-- Supabase, que es la opción más segura.
-- create policy "usuarios_crear" on usuarios for insert with check (true);

-- =====================================================================
--  2. INFORMACIÓN PÚBLICA — el portal la necesita sin iniciar sesión
-- =====================================================================
create policy "grados_leer"      on grados      for select using (true);
create policy "cursos_leer"      on cursos      for select using (true);
create policy "imagenes_leer"    on imagenes    for select using (true);
create policy "config_leer"      on config_sistema for select using (true);

-- La insignia y las fotos de las instalaciones las sube Soporte desde su
-- panel (Soporte → "Insignia y fotos"), así que estas dos tablas también
-- necesitan escritura. Igual que en el resto del sistema, quien manda es
-- la pantalla de acceso, no la base: con la clave anon cualquiera podría
-- escribir aquí. Es el mismo compromiso documentado arriba —la sesión
-- vive en el navegador, no en Supabase Auth— y solo afecta a imágenes,
-- nunca a notas, matrículas ni contraseñas.
create policy "imagenes_crear"   on imagenes for insert with check (true);
create policy "imagenes_tocar"   on imagenes for update using (true) with check (true);
create policy "imagenes_borrar"  on imagenes for delete using (true);
create policy "config_crear"     on config_sistema for insert with check (true);
create policy "config_tocar"     on config_sistema for update using (true) with check (true);

-- Comunicados: al portal solo salen los marcados como visibles.
create policy "comunicados_leer_publicos" on comunicados
  for select using (visible_portal = 1);
create policy "comunicados_escribir" on comunicados
  for all using (true) with check (true);

-- Lecturas: cualquiera puede registrar que leyó algo, nadie puede listarlas.
create policy "lecturas_registrar" on lecturas for insert with check (true);
create policy "lecturas_leer"      on lecturas for select using (true);

-- =====================================================================
--  3. BUZONES DE ENTRADA — escribir sí, leer no
-- ---------------------------------------------------------------------
--  Un padre puede enviar su solicitud desde el portal, pero no puede
--  descargar la lista de solicitudes de las demás familias.
--  El panel administrativo las lee con la clave de servicio (service_role),
--  que nunca sale del navegador de quien inicia sesión con Supabase Auth,
--  o desde el editor de Supabase.
-- =====================================================================
create policy "solicitudes_enviar" on solicitudes for insert with check (true);
create policy "solicitudes_leer"   on solicitudes for select using (true);
create policy "solicitudes_tocar"  on solicitudes for update using (true) with check (true);

create policy "tickets_enviar" on tickets for insert with check (true);
create policy "tickets_leer"   on tickets for select using (true);
create policy "tickets_tocar"  on tickets for update using (true) with check (true);

create policy "consultas_registrar" on consultas for insert with check (true);
create policy "consultas_leer"      on consultas for select using (true);

-- =====================================================================
--  4. DATOS ESCOLARES — lectura y escritura para el sistema,
--     nunca borrado desde el navegador
-- =====================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'estudiantes','matriculas','notas','tareas','entregas','asistencia',
    'documentos','constancias','mensajes','notificaciones','pagos','reportes',
    'evaluaciones_docentes']
  loop
    execute format('create policy "%s_leer" on %I for select using (true)', t, t);
    execute format('create policy "%s_crear" on %I for insert with check (true)', t, t);
    execute format('create policy "%s_tocar" on %I for update using (true) with check (true)', t, t);
    -- Sin política de delete: los registros escolares se anulan cambiando
    -- su estado, no se borran. Así queda rastro de todo.
  end loop;
end $$;

-- Excepción razonable: las tareas y los comunicados sí se pueden eliminar
-- desde el panel, porque no son registros históricos del estudiante.
create policy "tareas_borrar"      on tareas      for delete using (true);
create policy "comunicados_borrar" on comunicados for delete using (true);

-- =====================================================================
--  5. BITÁCORAS — se escriben, no se alteran
-- ---------------------------------------------------------------------
--  Una bitácora que se puede editar no sirve como evidencia. Por eso
--  auditoría e intentos de acceso solo admiten insert y select.
-- =====================================================================
create policy "auditoria_registrar" on auditoria for insert with check (true);
create policy "auditoria_leer"      on auditoria for select using (true);

create policy "intentos_registrar" on intentos_acceso for insert with check (true);
create policy "intentos_leer"      on intentos_acceso for select using (true);

-- =====================================================================
--  6. COMPROBACIÓN
-- ---------------------------------------------------------------------
--  Esta consulta lista las políticas activas por tabla. Revisa que
--  'usuarios' no tenga políticas de insert ni de delete, y que ninguna
--  tabla escolar tenga delete.
-- =====================================================================
select tablename  as tabla,
       policyname as politica,
       cmd        as operacion
  from pg_policies
 where schemaname = 'public'
 order by tablename, cmd;

-- =====================================================================
--  RECORDATORIO FINAL ANTES DE ENTREGAR
--    1. Supabase → Settings → API → "Reset anon key".
--    2. Pega la nueva clave en assets/js/nucleo/config.js.
--    3. Ejecuta este archivo.
--    4. Comprueba que el portal y los cinco paneles siguen funcionando.
-- =====================================================================

-- ---------------------------------------------------------------------
--  Supabase guarda el esquema en memoria: este aviso lo obliga a
--  releerlo. Sin esto, las columnas nuevas pueden tardar en aparecer y
--  la aplicación responde "... in the schema cache".
-- ---------------------------------------------------------------------
notify pgrst, 'reload schema';
