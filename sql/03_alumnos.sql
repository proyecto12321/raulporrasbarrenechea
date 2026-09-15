-- =====================================================================
--  PADRÓN REAL DE ESTUDIANTES · AÑO ESCOLAR 2026
--  I.E.P. Raúl Porras Barrenechea — nómina SIAGIE
--  Ejecuta este archivo DESPUÉS de 01_esquema.sql y 02_datos_base.sql
-- ---------------------------------------------------------------------
--  65 estudiantes matriculados:
--    1.er grado       10 estudiantes
--    2.do grado        8 estudiantes
--    3.er grado        4 estudiantes
--    4.to grado       13 estudiantes
--    5.to grado        9 estudiantes
--    6.to grado        5 estudiantes
--    Inicial 3 y 4 años 10 estudiantes
--    Inicial 5 años    6 estudiantes
--
--  IMPORTANTE: los estudiantes NO tienen usuario ni contraseña. Ingresan
--  al sistema escribiendo su DNI, que se valida contra esta tabla. Si el
--  DNI no está aquí o el estado no es 'Matriculado', el acceso se niega.
-- =====================================================================

-- ---------------------------------------------------------------------
--  Se insertan solo los que todavía no están, comparando por código Y por
--  DNI. Esto importa: la base de ejemplo de la versión 1.0 traía un
--  estudiante ficticio con el código EST-2026-0001, y al chocar con la
--  primera fila de esta lista PostgreSQL cancelaba la carga entera y no
--  entraba ni un solo alumno. Con "where not exists" el choque se salta esa
--  fila y las demás sí entran.
-- ---------------------------------------------------------------------
insert into estudiantes
  (codigo, nombres, apellidos, dni, sexo, grado, seccion, estado, anio, registrado_por)
select n.codigo, n.nombres, n.apellidos, n.dni, n.sexo, n.grado, n.seccion,
       n.estado, n.anio, n.registrado_por
  from (values

  ('EST-2026-0001', 'ACASSIA GUADALUPE', 'ANTON ALMEYDA', '93069085', 'F', 'Inicial 3 y 4 años', 'Única', 'Matriculado', 2026, 'Nómina SIAGIE 2026'),
  ('EST-2026-0002', 'EMMA VICTORIA', 'CRUZ VILCA', '93278887', 'F', 'Inicial 3 y 4 años', 'Única', 'Matriculado', 2026, 'Nómina SIAGIE 2026'),
  ('EST-2026-0003', 'KENZIE YAEL', 'HUASASQUICHE MENDOZA', '93237884', 'M', 'Inicial 3 y 4 años', 'Única', 'Matriculado', 2026, 'Nómina SIAGIE 2026'),
  ('EST-2026-0004', 'ALESSIO EMILIANO', 'MESIAS ALMEYDA', '93024454', 'M', 'Inicial 3 y 4 años', 'Única', 'Matriculado', 2026, 'Nómina SIAGIE 2026'),
  ('EST-2026-0005', 'IAM GAEL', 'PEREZ JUNCHAYA', '93158147', 'M', 'Inicial 3 y 4 años', 'Única', 'Matriculado', 2026, 'Nómina SIAGIE 2026'),
  ('EST-2026-0006', 'HANNA VALENTINA', 'PEREZ PACHAS', '93251107', 'F', 'Inicial 3 y 4 años', 'Única', 'Matriculado', 2026, 'Nómina SIAGIE 2026'),
  ('EST-2026-0007', 'EITHAN SEBASTIAN', 'YATACO JUNCHAYA', '93229895', 'M', 'Inicial 3 y 4 años', 'Única', 'Matriculado', 2026, 'Nómina SIAGIE 2026'),
  ('EST-2026-0008', 'RONALD MATEO', 'BARRIOS TIRADO', '92486850', 'M', 'Inicial 3 y 4 años', 'Única', 'Matriculado', 2026, 'Nómina SIAGIE 2026'),
  ('EST-2026-0009', 'CATALEYA FRANCESCA', 'CONDE PALOMINO', '92358410', 'F', 'Inicial 3 y 4 años', 'Única', 'Matriculado', 2026, 'Nómina SIAGIE 2026'),
  ('EST-2026-0010', 'JIMENA TATIANA', 'GUERRA SARAVIA', '92611101', 'F', 'Inicial 3 y 4 años', 'Única', 'Matriculado', 2026, 'Nómina SIAGIE 2026'),
  ('EST-2026-0011', 'RAFAELLA KAMIL', 'ABURTO CAMBAR', '92199698', 'F', 'Inicial 5 años', 'Única', 'Matriculado', 2026, 'Nómina SIAGIE 2026'),
  ('EST-2026-0012', 'ADRIANA LUNA', 'ALMEYDA TASAYCO', '91909812', 'F', 'Inicial 5 años', 'Única', 'Matriculado', 2026, 'Nómina SIAGIE 2026'),
  ('EST-2026-0013', 'FABRIZIO', 'PARIONA BRIGADA', '91902351', 'M', 'Inicial 5 años', 'Única', 'Matriculado', 2026, 'Nómina SIAGIE 2026'),
  ('EST-2026-0014', 'BIANCA CAMILA', 'PEREZ PACHAS', '92237493', 'F', 'Inicial 5 años', 'Única', 'Matriculado', 2026, 'Nómina SIAGIE 2026'),
  ('EST-2026-0015', 'JULIA DAYANA', 'SOTO MEJIA', '92108739', 'F', 'Inicial 5 años', 'Única', 'Matriculado', 2026, 'Nómina SIAGIE 2026'),
  ('EST-2026-0016', 'JAIME GAEL', 'TORRES TASAYCO', '92141768', 'M', 'Inicial 5 años', 'Única', 'Matriculado', 2026, 'Nómina SIAGIE 2026'),
  ('EST-2026-0017', 'DAVID ENRIQUE', 'ALMEYDA ROJAS', '91615141', 'M', '1.er grado', 'Única', 'Matriculado', 2026, 'Nómina SIAGIE 2026'),
  ('EST-2026-0018', 'JESUS ESTEFANO', 'CAMPUSMANA ATUNCAR', '91366252', 'M', '1.er grado', 'Única', 'Matriculado', 2026, 'Nómina SIAGIE 2026'),
  ('EST-2026-0019', 'EMMA VALENTINA', 'MAGALLANES TASAYCO', '91686864', 'F', '1.er grado', 'Única', 'Matriculado', 2026, 'Nómina SIAGIE 2026'),
  ('EST-2026-0020', 'EMILIA ALEJANDRA', 'ORTIZ MARTINEZ', '91577588', 'F', '1.er grado', 'Única', 'Matriculado', 2026, 'Nómina SIAGIE 2026'),
  ('EST-2026-0021', 'AYLEN VALENTINA', 'PACHAS JUNCHAYA', '91380693', 'F', '1.er grado', 'Única', 'Matriculado', 2026, 'Nómina SIAGIE 2026'),
  ('EST-2026-0022', 'JESUS FERNANDO', 'QUISPE AYBAR', '91619764', 'M', '1.er grado', 'Única', 'Matriculado', 2026, 'Nómina SIAGIE 2026'),
  ('EST-2026-0023', 'LUCIANO ADRIANO', 'QUISPE CACHIQUE', '81860454', 'M', '1.er grado', 'Única', 'Matriculado', 2026, 'Nómina SIAGIE 2026'),
  ('EST-2026-0024', 'FRANCO JAZIEL', 'TASAYCO BARRIOS', '91511034', 'M', '1.er grado', 'Única', 'Matriculado', 2026, 'Nómina SIAGIE 2026'),
  ('EST-2026-0025', 'EMILIA CATALINA', 'TASAYCO ESPINOZA', '91735816', 'F', '1.er grado', 'Única', 'Matriculado', 2026, 'Nómina SIAGIE 2026'),
  ('EST-2026-0026', 'LILIAN SOPHIA', 'TORRES HURTADO', '91496684', 'F', '1.er grado', 'Única', 'Matriculado', 2026, 'Nómina SIAGIE 2026'),
  ('EST-2026-0027', 'LUCAS CALEB', 'AGUILAR ORTIZ', '91293137', 'M', '2.do grado', 'Única', 'Matriculado', 2026, 'Nómina SIAGIE 2026'),
  ('EST-2026-0028', 'EZIO LEONEL', 'GUERRA FLORES', '90459739', 'M', '2.do grado', 'Única', 'Matriculado', 2026, 'Nómina SIAGIE 2026'),
  ('EST-2026-0029', 'WILLIAM MANUEL', 'LEVANO GUERRA', '90585038', 'M', '2.do grado', 'Única', 'Matriculado', 2026, 'Nómina SIAGIE 2026'),
  ('EST-2026-0030', 'PEDRO FERNANDO', 'LEVANO PACHAS', '90736452', 'M', '2.do grado', 'Única', 'Matriculado', 2026, 'Nómina SIAGIE 2026'),
  ('EST-2026-0031', 'HANS EMIR', 'MENDOZA MUNAYCO', '91244803', 'M', '2.do grado', 'Única', 'Matriculado', 2026, 'Nómina SIAGIE 2026'),
  ('EST-2026-0032', 'MIA CELESTE', 'MENESES PACHAS', '90743896', 'F', '2.do grado', 'Única', 'Matriculado', 2026, 'Nómina SIAGIE 2026'),
  ('EST-2026-0033', 'SEBASTIAN ALONSO', 'PANIAGUA CARTYL', '91162138', 'M', '2.do grado', 'Única', 'Matriculado', 2026, 'Nómina SIAGIE 2026'),
  ('EST-2026-0034', 'JULIAN ALFONSO', 'RAMOS ALMEYDA', '91109754', 'M', '2.do grado', 'Única', 'Matriculado', 2026, 'Nómina SIAGIE 2026'),
  ('EST-2026-0035', 'EMILIANO JOAQUIN', 'ABURTO CAMBAR', '90370542', 'M', '3.er grado', 'Única', 'Matriculado', 2026, 'Nómina SIAGIE 2026'),
  ('EST-2026-0036', 'DULCE VALENTINA', 'FLORES AYALA', '90676655', 'F', '3.er grado', 'Única', 'Matriculado', 2026, 'Nómina SIAGIE 2026'),
  ('EST-2026-0037', 'IVANNA ISABELLA', 'FUENTES MATIAS', '90423168', 'F', '3.er grado', 'Única', 'Matriculado', 2026, 'Nómina SIAGIE 2026'),
  ('EST-2026-0038', 'DEREK ALDAIR', 'TARAZONA MENDOZA', '90527656', 'M', '3.er grado', 'Única', 'Matriculado', 2026, 'Nómina SIAGIE 2026'),
  ('EST-2026-0039', 'LEANDRA ANGELICA', 'AGUILAR ORTIZ', '79984317', 'F', '4.to grado', 'Única', 'Matriculado', 2026, 'Nómina SIAGIE 2026'),
  ('EST-2026-0040', 'MIHAL KAORI', 'ATUNCAR RUIZ', '79790537', 'F', '4.to grado', 'Única', 'Matriculado', 2026, 'Nómina SIAGIE 2026'),
  ('EST-2026-0041', 'VICTOR ADRIANO RAUL', 'CAHUA ORELLANA', '79979608', 'M', '4.to grado', 'Única', 'Matriculado', 2026, 'Nómina SIAGIE 2026'),
  ('EST-2026-0042', 'LIVANNA TATIANA', 'CAMAC CHAVEZ', '90102514', 'F', '4.to grado', 'Única', 'Matriculado', 2026, 'Nómina SIAGIE 2026'),
  ('EST-2026-0043', 'VALERIA FERNANDA', 'GENTILLE PASTOR', '90118381', 'F', '4.to grado', 'Única', 'Matriculado', 2026, 'Nómina SIAGIE 2026'),
  ('EST-2026-0044', 'CARLOS AARON', 'LEVANO MORENO', '79990495', 'M', '4.to grado', 'Única', 'Matriculado', 2026, 'Nómina SIAGIE 2026'),
  ('EST-2026-0045', 'JHERICO ALEXANDER', 'MAGALLANES DE LA CRUZ', '79930225', 'M', '4.to grado', 'Única', 'Matriculado', 2026, 'Nómina SIAGIE 2026'),
  ('EST-2026-0046', 'SANTIAGO ALDEMIR', 'MAGALLANES TASAYCO', '79614366', 'M', '4.to grado', 'Única', 'Matriculado', 2026, 'Nómina SIAGIE 2026'),
  ('EST-2026-0047', 'ADRIANO GAEL', 'QUISPE MAGALLANES', '79708505', 'M', '4.to grado', 'Única', 'Matriculado', 2026, 'Nómina SIAGIE 2026'),
  ('EST-2026-0048', 'BELEN GUADALUPE', 'RAMOS ALMEYDA', '90011725', 'F', '4.to grado', 'Única', 'Matriculado', 2026, 'Nómina SIAGIE 2026'),
  ('EST-2026-0049', 'SOFIA CATALINA', 'RAMOS ALMEYDA', '90011704', 'F', '4.to grado', 'Única', 'Matriculado', 2026, 'Nómina SIAGIE 2026'),
  ('EST-2026-0050', 'ALONDRA VANESA', 'ROJAS CARBAJAL', '90027909', 'F', '4.to grado', 'Única', 'Matriculado', 2026, 'Nómina SIAGIE 2026'),
  ('EST-2026-0051', 'MIGUEL TADEO', 'TASAYCO ESPINOZA', '79879146', 'M', '4.to grado', 'Única', 'Matriculado', 2026, 'Nómina SIAGIE 2026'),
  ('EST-2026-0052', 'HERMES SANTIAGO', 'ANTON ALMEYDA', '79592170', 'M', '5.to grado', 'Única', 'Matriculado', 2026, 'Nómina SIAGIE 2026'),
  ('EST-2026-0053', 'WILLIAMS ALEXANDER', 'ASTORAYME SARAVIA', '79410027', 'M', '5.to grado', 'Única', 'Matriculado', 2026, 'Nómina SIAGIE 2026'),
  ('EST-2026-0054', 'GABRIEL ISAIAS', 'ATUNCAR HUAROTO', '79364072', 'M', '5.to grado', 'Única', 'Matriculado', 2026, 'Nómina SIAGIE 2026'),
  ('EST-2026-0055', 'MAX EMIR', 'CARRERA ROJAS', '79581346', 'M', '5.to grado', 'Única', 'Matriculado', 2026, 'Nómina SIAGIE 2026'),
  ('EST-2026-0056', 'NAYLETH EMILIA', 'FAJARDO CAYO', '79428691', 'F', '5.to grado', 'Única', 'Matriculado', 2026, 'Nómina SIAGIE 2026'),
  ('EST-2026-0057', 'VICTOR MANUEL', 'GONZALES PEÑALOZA', '79570616', 'M', '5.to grado', 'Única', 'Matriculado', 2026, 'Nómina SIAGIE 2026'),
  ('EST-2026-0058', 'TATIANA JAZMIN', 'HUALLANCA DE LA CRUZ', '79257088', 'F', '5.to grado', 'Única', 'Matriculado', 2026, 'Nómina SIAGIE 2026'),
  ('EST-2026-0059', 'MILAGROS THAIS', 'MENESES PACHAS', '79248585', 'F', '5.to grado', 'Única', 'Matriculado', 2026, 'Nómina SIAGIE 2026'),
  ('EST-2026-0060', 'DIEGO JOAQUIN', 'TIPICIANO MONTES', '79372542', 'M', '5.to grado', 'Única', 'Matriculado', 2026, 'Nómina SIAGIE 2026'),
  ('EST-2026-0061', 'CARLITA VALENTINA', 'ABREGU MENESES', '81443069', 'F', '6.to grado', 'Única', 'Matriculado', 2026, 'Nómina SIAGIE 2026'),
  ('EST-2026-0062', 'JOSE ANTONIO', 'CHACALTANA CASTILLA', '78991503', 'M', '6.to grado', 'Única', 'Matriculado', 2026, 'Nómina SIAGIE 2026'),
  ('EST-2026-0063', 'BRUNO FRANCESCO', 'FLORES RACUA', '81443073', 'M', '6.to grado', 'Única', 'Matriculado', 2026, 'Nómina SIAGIE 2026'),
  ('EST-2026-0064', 'MARCO FABRICIO', 'HUASASQUICHE ALMEYDA', '78620457', 'M', '6.to grado', 'Única', 'Matriculado', 2026, 'Nómina SIAGIE 2026'),
  ('EST-2026-0065', 'KARLA CAROLINA', 'PEREZ PACHAS', '78712327', 'F', '6.to grado', 'Única', 'Matriculado', 2026, 'Nómina SIAGIE 2026')
  ) as n (codigo, nombres, apellidos, dni, sexo, grado, seccion, estado, anio, registrado_por)
 where not exists (
   select 1 from estudiantes e where e.codigo = n.codigo or e.dni = n.dni
 );

-- ---------------------------------------------------------------------
--  Registro de matrícula del año para cada estudiante cargado
-- ---------------------------------------------------------------------
insert into matriculas (estudiante_id, dni, anio, grado, seccion, estado, monto, registrado_por)
select e.id, e.dni, e.anio, e.grado, e.seccion, 'Activa', 300.00, 'Carga inicial SIAGIE'
  from estudiantes e
 where e.anio = 2026
on conflict (estudiante_id, anio) do nothing;

-- ---------------------------------------------------------------------
--  Matrícula ya pagada (para el módulo de pagos)
-- ---------------------------------------------------------------------
insert into pagos (estudiante_id, dni, concepto, mes, monto, estado, registrado_por)
select e.id, e.dni, 'Matrícula', 'Marzo', 300.00, 'Pagado', 'Carga inicial SIAGIE'
  from estudiantes e
 where e.anio = 2026
   and not exists (
     select 1 from pagos p
      where p.estudiante_id = e.id and p.concepto = 'Matrícula' and p.mes = 'Marzo'
   );

-- ---------------------------------------------------------------------
--  Almacenamiento para archivos de tareas (opcional)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('tareas','tareas', true)
on conflict (id) do nothing;

do $$
begin
  begin create policy "tareas_subir"      on storage.objects for insert to anon with check (bucket_id = 'tareas');
  exception when duplicate_object then null; end;
  begin create policy "tareas_leer"       on storage.objects for select to anon using (bucket_id = 'tareas');
  exception when duplicate_object then null; end;
  begin create policy "tareas_actualizar" on storage.objects for update to anon using (bucket_id = 'tareas');
  exception when duplicate_object then null; end;
end $$;

-- =====================================================================
--  COMPROBACIÓN RÁPIDA
--    select count(*) from estudiantes;          -- debe dar 65
--    select * from v_ocupacion_aulas;           -- cupos por aula
--    select usuario, rol, cargo from usuarios;  -- 10 cuentas del personal
-- =====================================================================
