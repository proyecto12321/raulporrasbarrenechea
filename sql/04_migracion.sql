-- =====================================================================
--  MIGRACIÓN ADITIVA  ·  de la versión 1.0 a la 2.2
--  I.E.P. Raúl Porras Barrenechea
-- ---------------------------------------------------------------------
--  USA ESTE ARCHIVO SI YA TIENES DATOS EN SUPABASE y quieres conservarlos
--  (por ejemplo, los 65 alumnos ya cargados).
--
--  Es seguro ejecutarlo varias veces: todo está escrito con
--  "if not exists" / "on conflict do nothing" / "do $$ ... exception".
--
--  Si en cambio prefieres empezar de cero, ejecuta 01_esquema.sql,
--  02_datos_base.sql y 03_alumnos.sql, y NO uses este archivo.
-- =====================================================================

-- =====================================================================
--  1. COLUMNAS NUEVAS EN TABLAS EXISTENTES
-- =====================================================================

-- ---- usuarios -------------------------------------------------------
alter table usuarios add column if not exists algoritmo           text default 'sha256';
alter table usuarios add column if not exists grados_asignados    text;
alter table usuarios add column if not exists debe_cambiar_clave  int  default 0;
alter table usuarios add column if not exists intentos_fallidos   int  default 0;
alter table usuarios add column if not exists bloqueado_hasta     timestamptz;
alter table usuarios add column if not exists ultimo_acceso       timestamptz;
alter table usuarios add column if not exists creado_por          text;

comment on column usuarios.algoritmo is
  'sha256 = formato antiguo. El sistema lo cambia solo a pbkdf2 la primera vez que el usuario ingresa bien.';

-- ---- estudiantes ----------------------------------------------------
alter table estudiantes add column if not exists seccion          text default 'Única';
alter table estudiantes add column if not exists correo_apoderado text;
alter table estudiantes add column if not exists observaciones    text;
alter table estudiantes add column if not exists actualizado_en   timestamptz default now();

-- Amplía los estados permitidos (agrega 'Egresado').
do $$
begin
  alter table estudiantes drop constraint if exists estudiantes_estado_check;
  alter table estudiantes add constraint estudiantes_estado_check
    check (estado in ('Matriculado','Retirado','Trasladado','Egresado'));
exception when others then null;
end $$;

-- ---- notas ----------------------------------------------------------
alter table notas add column if not exists grado text;

-- Completa el grado de las notas antiguas a partir del padrón.
update notas n
   set grado = e.grado
  from estudiantes e
 where n.estudiante_id = e.id and n.grado is null;

-- Antes de poner la restricción única hay que quitar duplicados:
-- se conserva la nota más reciente de cada estudiante/curso/bimestre.
delete from notas a
 using notas b
 where a.id < b.id
   and a.estudiante_id = b.estudiante_id
   and a.curso = b.curso
   and a.bimestre = b.bimestre;

do $$
begin
  alter table notas add constraint notas_unicas unique (estudiante_id, curso, bimestre);
exception when duplicate_table or duplicate_object then null;
end $$;

-- ---- comunicados ----------------------------------------------------
alter table comunicados add column if not exists visible_portal int default 1;

-- ---- reportes -------------------------------------------------------
alter table reportes add column if not exists version      int default 1;
alter table reportes add column if not exists verificacion text;
alter table reportes add column if not exists parametros   text;

-- ---- documentos -----------------------------------------------------
alter table documentos add column if not exists destino text default 'Personal administrativo';

-- ---- auditoría ------------------------------------------------------
alter table auditoria add column if not exists detalle text;

-- ---- mensajes -------------------------------------------------------
alter table mensajes add column if not exists leido int default 0;

-- =====================================================================
--  2. TABLAS NUEVAS
-- =====================================================================

create table if not exists matriculas (
  id             bigint generated always as identity primary key,
  estudiante_id  bigint not null,
  dni            text,
  anio           int  not null default 2026,
  grado          text not null,
  seccion        text default 'Única',
  estado         text default 'Activa',
  monto          numeric(8,2) default 0,
  observacion    text,
  registrado_por text,
  ms             int default 0,
  creado_en      timestamptz default now()
);
do $$ begin
  alter table matriculas add constraint matriculas_unicas unique (estudiante_id, anio);
exception when duplicate_table or duplicate_object then null; end $$;

create table if not exists asistencia (
  id             bigint generated always as identity primary key,
  estudiante_id  bigint not null,
  dni            text,
  grado          text,
  fecha          date not null default current_date,
  estado         text default 'Presente'
                 check (estado in ('Presente','Tardanza','Falta','Justificado')),
  observacion    text,
  registrado_por text,
  creado_en      timestamptz default now()
);
do $$ begin
  alter table asistencia add constraint asistencia_unica unique (estudiante_id, fecha);
exception when duplicate_table or duplicate_object then null; end $$;

create table if not exists solicitudes (
  id               bigint generated always as identity primary key,
  folio            text unique,
  nombres          text not null,
  apellidos        text not null,
  dni              text not null,
  fecha_nac        date,
  grado_solicitado text,
  apoderado        text,
  dni_apoderado    text,
  celular          text,
  correo           text,
  mensaje          text,
  origen           text default 'Portal público',
  anio             int  default 2026,
  estado           text default 'Pendiente'
                   check (estado in ('Pendiente','En revisión','Aprobada','Rechazada')),
  respuesta        text,
  atendido_por     text,
  atendido_en      timestamptz,
  creado_en        timestamptz default now()
);

create table if not exists tickets (
  id           bigint generated always as identity primary key,
  codigo       text unique,
  asunto       text not null,
  detalle      text,
  categoria    text default 'Otro',
  prioridad    text default 'Media' check (prioridad in ('Alta','Media','Baja')),
  estado       text default 'Abierto' check (estado in ('Abierto','En proceso','Resuelto','Cerrado')),
  solicitante  text,
  contacto     text,
  rol          text,
  respuesta    text,
  atendido_por text,
  cerrado_en   timestamptz,
  creado_en    timestamptz default now()
);

create table if not exists pagos (
  id             bigint generated always as identity primary key,
  estudiante_id  bigint,
  dni            text,
  concepto       text not null,
  mes            text,
  monto          numeric(8,2) not null default 0,
  estado         text default 'Pendiente' check (estado in ('Pagado','Pendiente','Vencido')),
  fecha_pago     date,
  comprobante    text,
  registrado_por text,
  creado_en      timestamptz default now()
);

create table if not exists intentos_acceso (
  id            bigint generated always as identity primary key,
  identificador text,
  tipo          text,
  exito         int default 0,
  motivo        text,
  ip            text,
  agente        text,
  creado_en     timestamptz default now()
);

create table if not exists config_sistema (
  clave       text primary key,
  valor       text,
  descripcion text,
  actualizado timestamptz default now()
);

-- =====================================================================
--  3. AUTOMATISMOS
-- =====================================================================
create or replace function fn_literal_nota() returns trigger as $$
begin
  new.literal := case
    when new.nota >= 18 then 'AD'
    when new.nota >= 14 then 'A'
    when new.nota >= 11 then 'B'
    else 'C' end;
  return new;
end $$ language plpgsql;

drop trigger if exists tg_literal_nota on notas;
create trigger tg_literal_nota
  before insert or update on notas
  for each row execute function fn_literal_nota();

create or replace function fn_toca_estudiante() returns trigger as $$
begin
  new.actualizado_en := now();
  return new;
end $$ language plpgsql;

drop trigger if exists tg_toca_estudiante on estudiantes;
create trigger tg_toca_estudiante
  before update on estudiantes
  for each row execute function fn_toca_estudiante();

-- =====================================================================
--  4. VISTAS DE APOYO
-- =====================================================================
create or replace view v_ocupacion_aulas as
select g.nombre as grado, g.nivel, g.aula, g.docente, g.vacantes as capacidad,
       count(e.id) as matriculados,
       greatest(0, g.vacantes - count(e.id)) as libres,
       round(100.0 * count(e.id) / nullif(g.vacantes, 0), 1) as ocupacion_pct
from grados g
left join estudiantes e on e.grado = g.nombre and e.estado = 'Matriculado'
group by g.id, g.nombre, g.nivel, g.aula, g.docente, g.vacantes, g.orden
order by g.orden;

create or replace view v_promedios as
select e.id as estudiante_id, e.codigo, e.apellidos, e.nombres, e.dni, e.grado,
       round(avg(n.nota), 1) as promedio, count(n.id) as calificaciones
from estudiantes e
left join notas n on n.estudiante_id = e.id
where e.estado = 'Matriculado'
group by e.id, e.codigo, e.apellidos, e.nombres, e.dni, e.grado
order by e.apellidos;

-- =====================================================================
--  5. DATOS QUE FALTABAN
-- =====================================================================

-- Matrícula del año para los estudiantes ya cargados.
insert into matriculas (estudiante_id, dni, anio, grado, seccion, estado, monto, registrado_por)
select e.id, e.dni, coalesce(e.anio, 2026), e.grado, coalesce(e.seccion, 'Única'),
       'Activa', 300.00, 'Migración 2.0'
  from estudiantes e
 where e.estado = 'Matriculado'
on conflict (estudiante_id, anio) do nothing;

-- Aulas a cargo de cada docente (se deducen de la tabla 'grados').
update usuarios u
   set grados_asignados = sub.aulas
  from (select docente, string_agg(nombre, ',' order by orden) as aulas
          from grados where docente is not null group by docente) sub
 where u.nombres = sub.docente and u.rol = 'docente';

-- Parámetros del sistema.
insert into config_sistema (clave, valor, descripcion) values
('anio_escolar',    '2026',   'Año escolar activo'),
('aforo_aula',      '14',     'Máximo de estudiantes por aula'),
('costo_matricula', '300.00', 'Costo de matrícula en soles'),
('pension_inicial', '300.00', 'Pensión mensual del nivel Inicial'),
('pension_primaria','330.00', 'Pensión mensual del nivel Primaria'),
('mensualidades',   '10',     'Número de pensiones al año'),
('version_sistema', '2.0',    'Versión del sistema de gestión'),
('intentos_maximos','5',      'Intentos de acceso antes del bloqueo'),
('minutos_bloqueo', '5',      'Duración del bloqueo por intentos fallidos')
on conflict (clave) do update set valor = excluded.valor, actualizado = now();

-- Todos los comunicados antiguos quedan visibles en el portal.
update comunicados set visible_portal = 1 where visible_portal is null;

-- Los reportes antiguos pasan a ser la versión 1.
update reportes set version = 1 where version is null;

-- =====================================================================
--  6. RLS PARA LAS TABLAS NUEVAS  (abierta, igual que las anteriores)
--     Antes de la entrega final ejecuta 05_seguridad_rls.sql.
-- =====================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'matriculas','asistencia','solicitudes','tickets','pagos',
    'intentos_acceso','config_sistema']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "dev_%s" on %I', t, t);
    execute format('create policy "dev_%s" on %I for all using (true) with check (true)', t, t);
  end loop;
end $$;

-- =====================================================================
--  7. AFORO DE LAS AULAS
-- ---------------------------------------------------------------------
--  El tríptico institucional dice "Aula para 12 alumnos por ambiente",
--  así que la versión 2.2 usa 12. Si en tu caso el aforo real es otro,
--  cambia el número aquí y también 'aforo_aula' en config.js.
-- =====================================================================
update grados set vacantes = 12 where vacantes is null or vacantes <> 12;

-- =====================================================================
--  7 bis. INICIAL 3 Y 4 AÑOS COMPARTEN AMBIENTE
-- ---------------------------------------------------------------------
--  Organización real del colegio: 3 y 4 años en una sola aula, 5 años en
--  la suya, y Primaria un grado por aula. Se renombra el aula de 3 años,
--  se mudan los de 4 años y se retira el aula que queda vacía.
--  Es seguro ejecutarlo varias veces.
-- =====================================================================
do $$
begin
  -- El nombre nuevo se pone en todas las tablas que guardan el grado.
  update grados      set nombre = 'Inicial 3 y 4 años', aula = coalesce(aula, 'Aula Amarilla')
   where nombre = 'Inicial 3 años';
  update estudiantes set grado  = 'Inicial 3 y 4 años' where grado in ('Inicial 3 años', 'Inicial 4 años');
  update cursos      set grado  = 'Inicial 3 y 4 años' where grado in ('Inicial 3 años', 'Inicial 4 años');

  -- Estas tablas pueden no existir en una base de la versión 1.0.
  begin update matriculas set grado = 'Inicial 3 y 4 años' where grado in ('Inicial 3 años','Inicial 4 años');
  exception when undefined_table or undefined_column then null; end;
  begin update notas      set grado = 'Inicial 3 y 4 años' where grado in ('Inicial 3 años','Inicial 4 años');
  exception when undefined_table or undefined_column then null; end;
  begin update tareas     set grado = 'Inicial 3 y 4 años' where grado in ('Inicial 3 años','Inicial 4 años');
  exception when undefined_table or undefined_column then null; end;
  begin update asistencia set grado = 'Inicial 3 y 4 años' where grado in ('Inicial 3 años','Inicial 4 años');
  exception when undefined_table or undefined_column then null; end;
  begin update solicitudes set grado_solicitado = 'Inicial 3 y 4 años' where grado_solicitado in ('Inicial 3 años','Inicial 4 años');
  exception when undefined_table or undefined_column then null; end;

  -- Si por lo que sea no existía 'Inicial 3 años', se crea el aula nueva.
  if not exists (select 1 from grados where nombre = 'Inicial 3 y 4 años') then
    insert into grados (nombre, nivel, aula, vacantes, orden)
    values ('Inicial 3 y 4 años', 'Inicial', 'Aula Amarilla', 12, 1);
  end if;

  -- Los cursos duplicados que hayan quedado por la fusión.
  delete from cursos c
   where c.grado = 'Inicial 3 y 4 años'
     and c.id > (select min(c2.id) from cursos c2
                  where c2.grado = c.grado and c2.nombre = c.nombre);

  -- Y el aula de 4 años, ya sin estudiantes.
  delete from grados where nombre = 'Inicial 4 años';

  -- Se renumera el orden de las aulas.
  update grados g set orden = s.n
    from (select id, row_number() over (
            order by case when nivel = 'Inicial' then 0 else 1 end, nombre) as n
            from grados) s
   where g.id = s.id;
end $$;

-- =====================================================================
--  8. PERSONAL: DIRECCIÓN Y CONTRASEÑAS
-- ---------------------------------------------------------------------
--  Tres cambios de la versión 2.2:
--
--   a) La dirección de la institución pasa a Melva Margarita Rojas Peñaloza.
--      Elizabeth Almeyda Matías queda como docente de 3.er grado.
--   b) La contraseña de cada cuenta es ahora SU PROPIO DNI, derivada con
--      PBKDF2-HMAC-SHA256 (150,000 iteraciones, sal aleatoria por cuenta).
--   c) Se asignan las aulas a cargo de cada docente.
--
--  Es seguro ejecutarlo varias veces.
-- =====================================================================

-- --- a) Se libera el usuario 'directora' antes de reasignarlo -------------
--     (en la versión 1.0 pertenecía a Elizabeth Almeyda Matías)
update usuarios
   set usuario = 'ealmeyda', rol = 'docente',
       cargo = 'Docente de 3.er grado', grados_asignados = '3.er grado'
 where usuario = 'directora'
   and dni = '41251702';

-- Si ya existía un 'ealmeyda', se conserva y se desactiva el duplicado.
-- (No hace nada en una base limpia; está por si se ejecuta dos veces.)

-- --- b) y c) Datos, rol, aulas y contraseña = DNI ------------------------
with nuevos (usuario, nombres, dni, clave, rol, cargo, celular, grados) as (
  values

  ('directora', 'Melva Margarita Rojas Peñaloza', '08449165', 'pbkdf2$150000$JaWwA090tA/8NU/uX5/XMQ==$NeokCPA8hsKiZ1Aqloi8n/binPwJqtvyTQjeXnJsE7A=', 'director', 'Directora', '956070856', null),
  ('dlevano', 'Daniel Jesús Lévano Rojas', '71573418', 'pbkdf2$150000$hdFsR4u6PRv7lN5pQ/5YfQ==$wtjAVGOjpCy/eODi8ofGWRM2FrAW2DvUNe0tVpWM934=', 'administrativo', 'Personal administrativo', '956070857', null),
  ('soporte', 'Equipo de Soporte Técnico', '10000000', 'pbkdf2$150000$web5Y3EKId+C8z44AXRDEw==$lPzxSDoH5NEqj80hElEjUCf7SYDieWDfubm08ozGKQM=', 'soporte', 'Soporte técnico', '956070858', null),
  ('yvillanueva', 'Ysella Villanueva Antón', '40000001', 'pbkdf2$150000$ub1NR64ee9lGcAedxFYA2w==$0CrT8bA0DbcEBD3cXnuZBJhOyIsFkgsB+4H9TrbcJvE=', 'docente', 'Docente de Inicial', '956070861', 'Inicial 3 y 4 años,Inicial 5 años'),
  ('sruiz', 'Sonia Ruiz Ríos', '40000002', 'pbkdf2$150000$6TmBrGyaluYgkt+zdGyRUQ==$QKcgcCmE5RHYCghNE+e/HzZko3uNAv97O2a+/sWxq+g=', 'docente', 'Docente de 1.er grado', '956070862', '1.er grado'),
  ('srojas', 'Sonia Rojas Ortiz', '40000003', 'pbkdf2$150000$WVj6EOOVuZkMyjufeQhV/A==$E+XMBeeCK8S5XvT21YHp0k/fPeuG1e91M96nyOSGbio=', 'docente', 'Docente de 2.do grado', '956070863', '2.do grado'),
  ('ealmeyda', 'Elizabeth Almeyda Matías', '41251702', 'pbkdf2$150000$waDQ4n9Oi0EKKfx9cQIwyA==$GeDMpeBKiBNE6TE6GYSKH/FDtmUBek1ZfYxDuKFz4OE=', 'docente', 'Docente de 3.er grado', '956070864', '3.er grado'),
  ('bsotelo', 'Brunella Patricia Sotelo Salhuana', '40000005', 'pbkdf2$150000$rkwcg3R5Mw9G6jrRg+YdbQ==$f4BoQT8iXsLI69FlFi9eoK+sulsg6nE6i/EZkS7l9PY=', 'docente', 'Docente de 4.to grado', '956070865', '4.to grado'),
  ('kloza', 'Katherine Guadalupe Loza Torres', '40000006', 'pbkdf2$150000$l5QbwUi0XOdwCMQplFLpfA==$YLwMlvNIxHrL6xmQ4YZ5Gbz1ERJ49nB68z+88EqsLQI=', 'docente', 'Docente de 5.to grado', '956070866', '5.to grado'),
  ('ralmeyda', 'Roxana Magale Almeyda Carpio', '40000007', 'pbkdf2$150000$qCho9VP4fh8EsN40HnH6GA==$MTl3/swTZrGuOsc5IPvlRriY0qmYRrokddJ865SuvsY=', 'docente', 'Docente de 6.to grado', '956070867', '6.to grado')
)
update usuarios u
   set nombres          = n.nombres,
       clave            = n.clave,
       algoritmo        = 'pbkdf2',
       rol              = n.rol,
       cargo            = n.cargo,
       celular          = coalesce(u.celular, n.celular),
       grados_asignados = n.grados,
       debe_cambiar_clave = 0,
       intentos_fallidos  = 0,
       bloqueado_hasta    = null
  from nuevos n
 where u.dni = n.dni;

-- El usuario también se normaliza (por ejemplo, 'mrojas' → 'directora').
with nuevos (usuario, dni) as (
  values

  ('directora', '08449165'),
  ('dlevano', '71573418'),
  ('soporte', '10000000'),
  ('yvillanueva', '40000001'),
  ('sruiz', '40000002'),
  ('srojas', '40000003'),
  ('ealmeyda', '41251702'),
  ('bsotelo', '40000005'),
  ('kloza', '40000006'),
  ('ralmeyda', '40000007')
)
update usuarios u
   set usuario = n.usuario
  from nuevos n
 where u.dni = n.dni
   and u.usuario <> n.usuario
   and not exists (select 1 from usuarios x where x.usuario = n.usuario and x.dni <> n.dni);

-- Las cuentas del personal que falten se crean.
insert into usuarios
  (nombres, dni, usuario, clave, algoritmo, rol, cargo, celular, grados_asignados, activo, debe_cambiar_clave)
select n.nombres, n.dni, n.usuario, n.clave, 'pbkdf2', n.rol, n.cargo, n.celular, n.grados, 1, 0
  from (values

  ('directora', 'Melva Margarita Rojas Peñaloza', '08449165', 'pbkdf2$150000$JaWwA090tA/8NU/uX5/XMQ==$NeokCPA8hsKiZ1Aqloi8n/binPwJqtvyTQjeXnJsE7A=', 'director', 'Directora', '956070856', null),
  ('dlevano', 'Daniel Jesús Lévano Rojas', '71573418', 'pbkdf2$150000$hdFsR4u6PRv7lN5pQ/5YfQ==$wtjAVGOjpCy/eODi8ofGWRM2FrAW2DvUNe0tVpWM934=', 'administrativo', 'Personal administrativo', '956070857', null),
  ('soporte', 'Equipo de Soporte Técnico', '10000000', 'pbkdf2$150000$web5Y3EKId+C8z44AXRDEw==$lPzxSDoH5NEqj80hElEjUCf7SYDieWDfubm08ozGKQM=', 'soporte', 'Soporte técnico', '956070858', null),
  ('yvillanueva', 'Ysella Villanueva Antón', '40000001', 'pbkdf2$150000$ub1NR64ee9lGcAedxFYA2w==$0CrT8bA0DbcEBD3cXnuZBJhOyIsFkgsB+4H9TrbcJvE=', 'docente', 'Docente de Inicial', '956070861', 'Inicial 3 y 4 años,Inicial 5 años'),
  ('sruiz', 'Sonia Ruiz Ríos', '40000002', 'pbkdf2$150000$6TmBrGyaluYgkt+zdGyRUQ==$QKcgcCmE5RHYCghNE+e/HzZko3uNAv97O2a+/sWxq+g=', 'docente', 'Docente de 1.er grado', '956070862', '1.er grado'),
  ('srojas', 'Sonia Rojas Ortiz', '40000003', 'pbkdf2$150000$WVj6EOOVuZkMyjufeQhV/A==$E+XMBeeCK8S5XvT21YHp0k/fPeuG1e91M96nyOSGbio=', 'docente', 'Docente de 2.do grado', '956070863', '2.do grado'),
  ('ealmeyda', 'Elizabeth Almeyda Matías', '41251702', 'pbkdf2$150000$waDQ4n9Oi0EKKfx9cQIwyA==$GeDMpeBKiBNE6TE6GYSKH/FDtmUBek1ZfYxDuKFz4OE=', 'docente', 'Docente de 3.er grado', '956070864', '3.er grado'),
  ('bsotelo', 'Brunella Patricia Sotelo Salhuana', '40000005', 'pbkdf2$150000$rkwcg3R5Mw9G6jrRg+YdbQ==$f4BoQT8iXsLI69FlFi9eoK+sulsg6nE6i/EZkS7l9PY=', 'docente', 'Docente de 4.to grado', '956070865', '4.to grado'),
  ('kloza', 'Katherine Guadalupe Loza Torres', '40000006', 'pbkdf2$150000$l5QbwUi0XOdwCMQplFLpfA==$YLwMlvNIxHrL6xmQ4YZ5Gbz1ERJ49nB68z+88EqsLQI=', 'docente', 'Docente de 5.to grado', '956070866', '5.to grado'),
  ('ralmeyda', 'Roxana Magale Almeyda Carpio', '40000007', 'pbkdf2$150000$qCho9VP4fh8EsN40HnH6GA==$MTl3/swTZrGuOsc5IPvlRriY0qmYRrokddJ865SuvsY=', 'docente', 'Docente de 6.to grado', '956070867', '6.to grado')
       ) as n (usuario, nombres, dni, clave, rol, cargo, celular, grados)
 where not exists (select 1 from usuarios u where u.dni = n.dni)
   and not exists (select 1 from usuarios u where u.usuario = n.usuario);

-- Los grados apuntan al docente correcto.
update grados set docente = 'Ysella Villanueva Antón'           where nombre like 'Inicial%';
update grados set docente = 'Sonia Ruiz Ríos'                   where nombre = '1.er grado';
update grados set docente = 'Sonia Rojas Ortiz'                 where nombre = '2.do grado';
update grados set docente = 'Elizabeth Almeyda Matías'          where nombre = '3.er grado';
update grados set docente = 'Brunella Patricia Sotelo Salhuana' where nombre = '4.to grado';
update grados set docente = 'Katherine Guadalupe Loza Torres'   where nombre = '5.to grado';
update grados set docente = 'Roxana Magale Almeyda Carpio'      where nombre = '6.to grado';

update grados g set docente_id = u.id from usuarios u where u.nombres = g.docente;

-- Parámetros nuevos del portal.
insert into config_sistema (clave, valor, descripcion) values
('anios_servicio', '26', 'Años de servicio a la comunidad'),
('docentes',       '10', 'Plana docente calificada (cifra institucional del portal)'),
('directora',      'Melva Margarita Rojas Peñaloza', 'Dirección de la institución'),
('version_sistema','2.1','Versión del sistema de gestión')
on conflict (clave) do update set valor = excluded.valor, actualizado = now();

-- =====================================================================
--  9. LIMPIEZA OPCIONAL — LEE ESTO ANTES DE EJECUTARLO
-- ---------------------------------------------------------------------
--  En la versión 1.0 cada estudiante tenía una fila en 'usuarios' con su
--  DNI como contraseña. La versión 2.2 ya no las usa: el estudiante entra
--  con su DNI validado contra 'estudiantes'.
--
--  Esas filas sobrantes no estorban, pero conviene borrarlas.
--  Descomenta la línea siguiente cuando hayas comprobado que el ingreso
--  de estudiantes funciona bien con el sistema nuevo:
-- ---------------------------------------------------------------------

-- delete from usuarios where rol = 'estudiante';

-- =====================================================================
--  COMPROBACIÓN
--    select count(*) from estudiantes;            -- tu padrón, intacto
--    select usuario, dni, rol, cargo, grados_asignados from usuarios
--      where rol <> 'estudiante' order by rol, usuario;
--    select * from v_ocupacion_aulas;
--
--  Después de esto, cada persona entra con su usuario y su DNI.
-- =====================================================================


-- ---------------------------------------------------------------------
--  Supabase guarda el esquema en memoria: este aviso lo obliga a
--  releerlo. Sin esto, las columnas nuevas pueden tardar en aparecer y
--  la aplicación responde "... in the schema cache".
-- ---------------------------------------------------------------------
notify pgrst, 'reload schema';
