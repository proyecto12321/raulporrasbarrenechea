-- =====================================================================
--  SISTEMA DE GESTIÓN ESCOLAR CON CHATBOT  ·  ESQUEMA COMPLETO
--  I.E.P. Raúl Porras Barrenechea — Sunampe, Chincha, Ica
--  PostgreSQL / Supabase · versión 2.2
-- ---------------------------------------------------------------------
--  CÓMO USARLO
--    Supabase → SQL Editor → pega este archivo completo → RUN.
--    Después ejecuta 02_datos_base.sql y 03_alumnos.sql en ese orden.
--
--  ATENCIÓN: este script BORRA y vuelve a crear las tablas. Si ya tienes
--  datos que quieres conservar, usa 04_migracion.sql en su lugar.
-- =====================================================================

-- ---------------------------------------------------------------------
--  Limpieza previa (orden inverso a las dependencias)
-- ---------------------------------------------------------------------
drop table if exists
  intentos_acceso, consultas, reportes, auditoria, notificaciones, mensajes,
  lecturas, comunicados, tickets, solicitudes, pagos, constancias, documentos,
  asistencia, entregas, tareas, notas, matriculas, estudiantes,
  cursos, grados, usuarios, imagenes, config_sistema
  cascade;

-- =====================================================================
--  1. USUARIOS  (solo personal: dirección, docentes, administración, soporte)
--  ---------------------------------------------------------------------
--  Los estudiantes NO tienen fila aquí: ingresan con su DNI validado
--  contra la tabla 'estudiantes'. Así no existen contraseñas de alumnos
--  que se puedan filtrar ni cuentas creadas desde fuera.
--
--  La contraseña inicial del personal es su propio DNI, derivada con
--  PBKDF2-HMAC-SHA256 (150 000 iteraciones, sal aleatoria por cuenta).
-- =====================================================================
create table usuarios (
  id                bigint generated always as identity primary key,
  nombres           text not null,
  dni               text unique not null,
  usuario           text unique not null,
  clave             text not null,                -- pbkdf2$iter$sal$derivado
  algoritmo         text default 'pbkdf2',
  rol               text not null check (rol in ('director','docente','administrativo','soporte')),
  cargo             text,
  celular           text,
  correo            text,
  grados_asignados  text,                         -- aulas del docente, separadas por coma
  activo            int  default 1 check (activo in (0,1)),
  debe_cambiar_clave int default 0 check (debe_cambiar_clave in (0,1)),
  intentos_fallidos int  default 0,
  bloqueado_hasta   timestamptz,
  ultimo_acceso     timestamptz,
  creado_por        text,
  creado_en         timestamptz default now()
);
comment on table usuarios is 'Cuentas del personal. Las crea dirección; no hay registro público.';
create index idx_usuarios_rol on usuarios(rol) where activo = 1;

-- =====================================================================
--  2. GRADOS Y CURSOS
-- =====================================================================
create table grados (
  id          bigint generated always as identity primary key,
  nombre      text not null unique,
  nivel       text not null check (nivel in ('Inicial','Primaria')),
  aula        text,
  docente     text,
  docente_id  bigint references usuarios(id) on delete set null,
  vacantes    int  default 12 check (vacantes >= 0),
  descripcion text,
  orden       int  default 0
);
comment on column grados.vacantes is 'Aforo del aula. El tríptico institucional indica 12 por ambiente.';

create table cursos (
  id        bigint generated always as identity primary key,
  nombre    text not null,
  grado     text not null,
  nivel     text,
  docente   text,
  creado_en timestamptz default now(),
  unique (nombre, grado)
);

-- =====================================================================
--  3. ESTUDIANTES  (el padrón: DNI único, sin duplicados)
-- =====================================================================
create table estudiantes (
  id               bigint generated always as identity primary key,
  codigo           text unique,
  nombres          text not null,
  apellidos        text not null,
  dni              text unique not null check (dni ~ '^[0-9]{8}$'),
  fecha_nac        date,
  sexo             text default 'M' check (sexo in ('M','F')),
  grado            text,
  seccion          text default 'Única',
  apoderado        text,
  dni_apoderado    text,
  celular          text,
  correo_apoderado text,
  direccion        text,
  observaciones    text,
  estado           text default 'Matriculado'
                   check (estado in ('Matriculado','Retirado','Trasladado','Egresado')),
  anio             int  default 2026,
  registrado_por   text,
  segundos         int  default 0,   -- cuánto tardó el registro (indicador 2)
  completo         int  default 1,
  creado_en        timestamptz default now(),
  actualizado_en   timestamptz default now()
);
comment on column estudiantes.dni is 'Llave de acceso del estudiante al sistema. Único y de 8 dígitos.';
create index idx_est_grado  on estudiantes(grado, estado);
create index idx_est_estado on estudiantes(estado, anio);

-- =====================================================================
--  4. MATRÍCULAS  (histórico por año)
-- =====================================================================
create table matriculas (
  id             bigint generated always as identity primary key,
  estudiante_id  bigint not null references estudiantes(id) on delete cascade,
  dni            text,
  anio           int  not null default 2026,
  grado          text not null,
  seccion        text default 'Única',
  estado         text default 'Activa' check (estado in ('Activa','Anulada','Trasladada')),
  monto          numeric(8,2) default 0,
  observacion    text,
  registrado_por text,
  ms             int default 0,
  creado_en      timestamptz default now(),
  unique (estudiante_id, anio)
);

-- =====================================================================
--  5. NOTAS  (una por estudiante, curso y bimestre)
-- =====================================================================
create table notas (
  id             bigint generated always as identity primary key,
  estudiante_id  bigint not null references estudiantes(id) on delete cascade,
  dni_estudiante text,
  grado          text,
  curso          text not null,
  bimestre       text default 'I' check (bimestre in ('I','II','III','IV')),
  nota           numeric(4,1) not null check (nota >= 0 and nota <= 20),
  literal        text check (literal in ('AD','A','B','C')),
  docente        text,
  creado_en      timestamptz default now(),
  unique (estudiante_id, curso, bimestre)
);
comment on table notas is 'La restricción única evita notas duplicadas del mismo curso y bimestre.';
create index idx_notas_grado on notas(grado, bimestre);

-- =====================================================================
--  6. TAREAS Y ENTREGAS
-- =====================================================================
create table tareas (
  id          bigint generated always as identity primary key,
  titulo      text not null,
  descripcion text,
  curso       text not null,
  grado       text not null,
  docente     text,
  vence       date,
  creado_en   timestamptz default now()
);

create table entregas (
  id            bigint generated always as identity primary key,
  tarea_id      bigint not null references tareas(id) on delete cascade,
  estudiante_id bigint not null references estudiantes(id) on delete cascade,
  estudiante    text,
  archivo       text,
  comentario    text,
  nota          numeric(4,1) check (nota is null or (nota >= 0 and nota <= 20)),
  estado        text default 'Entregado' check (estado in ('Entregado','Revisado')),
  creado_en     timestamptz default now(),
  unique (tarea_id, estudiante_id)
);

-- =====================================================================
--  7. ASISTENCIA
-- =====================================================================
create table asistencia (
  id             bigint generated always as identity primary key,
  estudiante_id  bigint not null references estudiantes(id) on delete cascade,
  dni            text,
  grado          text,
  fecha          date not null default current_date,
  estado         text default 'Presente'
                 check (estado in ('Presente','Tardanza','Falta','Justificado')),
  observacion    text,
  registrado_por text,
  creado_en      timestamptz default now(),
  unique (estudiante_id, fecha)
);
create index idx_asis_fecha on asistencia(grado, fecha);

-- =====================================================================
--  8. DOCUMENTOS  (mesa de partes interna)
-- =====================================================================
create table documentos (
  id        bigint generated always as identity primary key,
  codigo    text unique,
  tipo      text not null,
  asunto    text not null,
  detalle   text,
  grado     text,
  remitente text,
  destino   text default 'Personal administrativo',
  archivo   text,
  estado    text default 'Recibido'
            check (estado in ('Recibido','En revisión','Archivado','Observado')),
  segundos  int default 0,
  completo  int default 1,
  creado_en timestamptz default now()
);

-- =====================================================================
--  9. CONSTANCIAS EMITIDAS
-- =====================================================================
create table constancias (
  id           bigint generated always as identity primary key,
  numero       text unique not null,
  tipo         text,
  nombre       text not null,
  dni          text,
  aula         text,
  sexo         text default 'M',
  motivo       text,
  verificacion text,                -- código que va en el QR
  ms           int default 0,
  emitido_por  text,
  en_padron    int default 1,
  creado_en    timestamptz default now()
);

-- =====================================================================
-- 10. COMUNICADOS Y LECTURAS  (difusión)
-- =====================================================================
create table comunicados (
  id             bigint generated always as identity primary key,
  titulo         text not null,
  cuerpo         text not null,
  etiqueta       text default 'General',
  urgente        int  default 0 check (urgente in (0,1)),
  visible_portal int  default 1 check (visible_portal in (0,1)),
  dirigido_a     text default 'Todos',
  publicado_por  text,
  creado_en      timestamptz default now()
);
create index idx_com_destino on comunicados(dirigido_a, creado_en desc);

create table lecturas (
  id          bigint generated always as identity primary key,
  comunicado  text,
  visitante   text,
  usuario     text,
  dispositivo text,
  creado_en   timestamptz default now()
);

-- =====================================================================
-- 11. MENSAJERÍA Y NOTIFICACIONES
-- =====================================================================
create table mensajes (
  id        bigint generated always as identity primary key,
  autor     text not null,
  rol       text,
  para      text default 'Todo el personal',
  texto     text not null,
  leido     int  default 0,
  creado_en timestamptz default now()
);

create table notificaciones (
  id         bigint generated always as identity primary key,
  titulo     text not null,
  cuerpo     text,
  enlace     text,
  dirigido_a text default 'Todos',
  leida      int default 0,
  creado_en  timestamptz default now()
);

-- =====================================================================
-- 12. SOLICITUDES DE VACANTE  (llegan del portal público)
-- =====================================================================
create table solicitudes (
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
create index idx_sol_estado on solicitudes(estado, creado_en desc);

-- =====================================================================
-- 13. TICKETS DE SOPORTE
-- =====================================================================
create table tickets (
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
create index idx_tickets_estado on tickets(estado, prioridad);

-- =====================================================================
-- 14. PAGOS Y PENSIONES
-- =====================================================================
create table pagos (
  id             bigint generated always as identity primary key,
  estudiante_id  bigint references estudiantes(id) on delete cascade,
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

-- =====================================================================
-- 15. AUDITORÍA, REPORTES, CONSULTAS E INTENTOS DE ACCESO
-- =====================================================================
create table auditoria (
  id        bigint generated always as identity primary key,
  usuario   text,
  rol       text,
  accion    text not null,
  modulo    text default 'General',
  detalle   text,
  ms        int default 0,
  ip        text,
  creado_en timestamptz default now()
);
create index idx_aud_fecha on auditoria(creado_en desc);

create table reportes (
  id           bigint generated always as identity primary key,
  nombre       text not null,
  filas        int  default 0,
  ms           int  default 0,
  formato      text default 'PDF',
  version      int  default 1,
  verificacion text,
  parametros   text,
  generado_por text,
  creado_en    timestamptz default now()
);
comment on table reportes is 'Control de versiones y verificación de los documentos emitidos.';

create table consultas (
  id        bigint generated always as identity primary key,
  pregunta  text,
  intencion text,
  resuelta  int default 1,
  ambito    text default 'publico',
  creado_en timestamptz default now()
);
comment on table consultas is 'Preguntas hechas al chatbot; permiten medir la fluidez de la comunicación.';

create table intentos_acceso (
  id            bigint generated always as identity primary key,
  identificador text,
  tipo          text check (tipo in ('estudiante','personal')),
  exito         int default 0 check (exito in (0,1)),
  motivo        text,
  ip            text,
  agente        text,
  creado_en     timestamptz default now()
);
create index idx_intentos_fecha on intentos_acceso(creado_en desc);

-- =====================================================================
-- 16. AUXILIARES
-- =====================================================================
create table imagenes (
  clave       text primary key,
  titulo      text,
  archivo     text,
  actualizado timestamptz default now()
);

create table config_sistema (
  clave       text primary key,
  valor       text,
  descripcion text,
  actualizado timestamptz default now()
);

-- =====================================================================
-- 17. AUTOMATISMOS
-- =====================================================================

-- El literal de la nota se calcula en el servidor: nadie lo escribe a mano.
create or replace function fn_literal_nota() returns trigger as $$
begin
  new.literal := case
    when new.nota >= 18 then 'AD'
    when new.nota >= 14 then 'A'
    when new.nota >= 11 then 'B'
    else 'C' end;
  return new;
end $$ language plpgsql;

create trigger tg_literal_nota
  before insert or update on notas
  for each row execute function fn_literal_nota();

-- Marca de tiempo de la última modificación del estudiante.
create or replace function fn_toca_estudiante() returns trigger as $$
begin
  new.actualizado_en := now();
  return new;
end $$ language plpgsql;

create trigger tg_toca_estudiante
  before update on estudiantes
  for each row execute function fn_toca_estudiante();

-- =====================================================================
-- 18. VISTAS DE APOYO (para reportes rápidos)
-- =====================================================================
create or replace view v_ocupacion_aulas as
select g.nombre as grado, g.nivel, g.aula, g.docente, g.vacantes as capacidad,
       count(e.id) as matriculados,
       greatest(0, g.vacantes - count(e.id)) as libres,
       round(100.0 * count(e.id) / nullif(g.vacantes, 0), 1) as ocupacion_pct
from grados g
left join estudiantes e
  on e.grado = g.nombre and e.estado = 'Matriculado'
group by g.id, g.nombre, g.nivel, g.aula, g.docente, g.vacantes, g.orden
order by g.orden;

create or replace view v_promedios as
select e.id as estudiante_id, e.codigo, e.apellidos, e.nombres, e.dni, e.grado,
       round(avg(n.nota), 1) as promedio,
       count(n.id) as calificaciones
from estudiantes e
left join notas n on n.estudiante_id = e.id
where e.estado = 'Matriculado'
group by e.id, e.codigo, e.apellidos, e.nombres, e.dni, e.grado
order by e.apellidos;

-- =====================================================================
-- 19. SEGURIDAD A NIVEL DE FILA (RLS)
--     Aquí queda ABIERTA para que el sistema funcione durante las
--     pruebas de la tesis. Antes de la entrega final ejecuta
--     05_seguridad_rls.sql, que cierra cada tabla por operación.
-- =====================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'usuarios','grados','cursos','estudiantes','matriculas','notas','tareas',
    'entregas','asistencia','documentos','constancias','comunicados','lecturas',
    'mensajes','notificaciones','solicitudes','tickets','pagos','auditoria',
    'reportes','consultas','intentos_acceso','imagenes','config_sistema']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "dev_%s" on %I', t, t);
    execute format('create policy "dev_%s" on %I for all using (true) with check (true)', t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
--  Supabase guarda el esquema en memoria: este aviso lo obliga a releerlo.
--  Sin esto, las columnas nuevas pueden tardar en aparecer y la aplicación
--  responde "... in the schema cache".
-- ---------------------------------------------------------------------
notify pgrst, 'reload schema';

-- =====================================================================
--  LISTO. Ahora ejecuta 02_datos_base.sql y luego 03_alumnos.sql.
-- =====================================================================
