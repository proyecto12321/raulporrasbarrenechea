-- =====================================================================
--  PONER LA BASE AL DÍA  ·  ejecútalo cuando algo falle
--  I.E.P. Raúl Porras Barrenechea · sistema v3.0
-- ---------------------------------------------------------------------
--  QUÉ HACE
--    1. Crea las tablas que falten (las que ya están, no se tocan).
--    2. Agrega las columnas que falten a las tablas que ya existen.
--    3. Crea los índices, disparadores y vistas.
--    4. Le dice a Supabase que vuelva a leer el esquema.
--
--  QUÉ NO HACE
--    No borra ni cambia un solo dato tuyo. Es seguro ejecutarlo las
--    veces que quieras, en una base nueva o en una que ya tiene datos.
--
--  CUÁNDO USARLO
--    Cuando el sistema diga algo parecido a:
--      "Could not find the 'intentos_fallidos' column of 'usuarios'
--       in the schema cache"
--    Ese mensaje significa una de dos cosas, y este archivo arregla las
--    dos: o la columna no existe, o existe pero Supabase todavía no se
--    enteró (su caché de esquema quedó viejo).
--
--  CÓMO
--    Supabase → SQL Editor → New query → pega TODO el archivo → RUN.
--    Los avisos "already exists, skipping" son normales y esperados.
-- =====================================================================

-- =====================================================================
--  1. TABLAS QUE FALTEN
--  ---------------------------------------------------------------------
--  "create table if not exists" deja intacta cualquier tabla que ya esté,
--  con todos sus datos. Solo crea las que aún no existen.
-- =====================================================================
create table if not exists usuarios (
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

create table if not exists grados (
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

create table if not exists cursos (
  id        bigint generated always as identity primary key,
  nombre    text not null,
  grado     text not null,
  nivel     text,
  docente   text,
  creado_en timestamptz default now(),
  unique (nombre, grado)
);

create table if not exists estudiantes (
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

create table if not exists matriculas (
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

create table if not exists notas (
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

create table if not exists tareas (
  id          bigint generated always as identity primary key,
  titulo      text not null,
  descripcion text,
  curso       text not null,
  grado       text not null,
  docente     text,
  vence       date,
  creado_en   timestamptz default now()
);

create table if not exists entregas (
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

create table if not exists asistencia (
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

create table if not exists documentos (
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

create table if not exists constancias (
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

create table if not exists comunicados (
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

create table if not exists lecturas (
  id          bigint generated always as identity primary key,
  comunicado  text,
  visitante   text,
  usuario     text,
  dispositivo text,
  creado_en   timestamptz default now()
);

create table if not exists mensajes (
  id        bigint generated always as identity primary key,
  autor     text not null,
  rol       text,
  para      text default 'Todo el personal',
  texto     text not null,
  leido     int  default 0,
  creado_en timestamptz default now()
);

create table if not exists notificaciones (
  id         bigint generated always as identity primary key,
  titulo     text not null,
  cuerpo     text,
  enlace     text,
  dirigido_a text default 'Todos',
  leida      int default 0,
  creado_en  timestamptz default now()
);

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

create table if not exists auditoria (
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

create table if not exists reportes (
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

create table if not exists consultas (
  id        bigint generated always as identity primary key,
  pregunta  text,
  intencion text,
  resuelta  int default 1,
  ambito    text default 'publico',
  creado_en timestamptz default now()
);

create table if not exists intentos_acceso (
  id            bigint generated always as identity primary key,
  identificador text,
  tipo          text check (tipo in ('estudiante','personal')),
  exito         int default 0 check (exito in (0,1)),
  motivo        text,
  ip            text,
  agente        text,
  creado_en     timestamptz default now()
);

create table if not exists imagenes (
  clave       text primary key,
  titulo      text,
  archivo     text,
  actualizado timestamptz default now()
);

alter table comunicados add column if not exists estado         text default 'Publicado';
alter table comunicados add column if not exists archivado_en   timestamptz;
alter table comunicados add column if not exists adjunto_nombre text;
alter table comunicados add column if not exists adjunto_tipo   text;
alter table comunicados add column if not exists adjunto_datos  text;

alter table mensajes add column if not exists adjunto_nombre text;
alter table mensajes add column if not exists adjunto_tipo   text;
alter table mensajes add column if not exists adjunto_datos  text;

alter table imagenes add column if not exists titulo      text;
alter table imagenes add column if not exists descripcion text;

create table if not exists config_sistema (
  clave       text primary key,
  valor       text,
  descripcion text,
  actualizado timestamptz default now()
);

-- Evaluación del docente (indicador 3, "formularios digitales con
-- autocompletado"): solo la crea Dirección o Administrativo; las
-- preguntas mostradas se guardan en config_sistema (clave
-- 'preguntas_evaluacion_docente') para que se puedan editar sin tocar
-- código, con una lista por defecto si nadie las cambió nunca.
create table if not exists evaluaciones_docentes (
  id            bigint generated by default as identity primary key,
  docente       text not null,
  periodo       text,
  respuestas    text,   -- JSON: [{pregunta, puntaje(1-5)}]
  promedio      numeric,
  comentario    text,
  evaluado_por  text,
  rol_evaluador text,
  creado_en     timestamptz default now()
);

-- =====================================================================
--  2. COLUMNAS QUE FALTEN EN LAS TABLAS QUE YA EXISTÍAN
--  ---------------------------------------------------------------------
--  Va antes de los índices a propósito: un índice sobre una columna que
--  todavía no existe falla, y el archivo entero se detendría ahí.
-- =====================================================================
-- usuarios
alter table usuarios add column if not exists nombres             text;
alter table usuarios add column if not exists dni                 text;
alter table usuarios add column if not exists usuario             text;
alter table usuarios add column if not exists clave               text;
alter table usuarios add column if not exists algoritmo           text default 'pbkdf2';
alter table usuarios add column if not exists rol                 text;
alter table usuarios add column if not exists cargo               text;
alter table usuarios add column if not exists celular             text;
alter table usuarios add column if not exists correo              text;
alter table usuarios add column if not exists grados_asignados    text;
alter table usuarios add column if not exists activo              int default 1;
alter table usuarios add column if not exists debe_cambiar_clave  int default 0;
alter table usuarios add column if not exists intentos_fallidos   int default 0;
alter table usuarios add column if not exists bloqueado_hasta     timestamptz;
alter table usuarios add column if not exists ultimo_acceso       timestamptz;
alter table usuarios add column if not exists creado_por          text;
alter table usuarios add column if not exists creado_en           timestamptz default now();

-- grados
alter table grados add column if not exists nombre              text;
alter table grados add column if not exists nivel               text;
alter table grados add column if not exists aula                text;
alter table grados add column if not exists docente             text;
alter table grados add column if not exists docente_id          bigint null;
alter table grados add column if not exists vacantes            int default 12;
alter table grados add column if not exists descripcion         text;
alter table grados add column if not exists orden               int default 0;

-- cursos
alter table cursos add column if not exists nombre              text;
alter table cursos add column if not exists grado               text;
alter table cursos add column if not exists nivel               text;
alter table cursos add column if not exists docente             text;
alter table cursos add column if not exists creado_en           timestamptz default now();

-- estudiantes
alter table estudiantes add column if not exists codigo              text;
alter table estudiantes add column if not exists nombres             text;
alter table estudiantes add column if not exists apellidos           text;
alter table estudiantes add column if not exists dni                 text;
alter table estudiantes add column if not exists fecha_nac           date;
alter table estudiantes add column if not exists sexo                text default 'M';
alter table estudiantes add column if not exists grado               text;
alter table estudiantes add column if not exists seccion             text default 'Única';
alter table estudiantes add column if not exists apoderado           text;
alter table estudiantes add column if not exists dni_apoderado       text;
alter table estudiantes add column if not exists celular             text;
alter table estudiantes add column if not exists correo_apoderado    text;
alter table estudiantes add column if not exists direccion           text;
alter table estudiantes add column if not exists observaciones       text;
alter table estudiantes add column if not exists estado              text default 'Matriculado';
alter table estudiantes add column if not exists anio                int default 2026;
alter table estudiantes add column if not exists registrado_por      text;
alter table estudiantes add column if not exists segundos            int default 0;
alter table estudiantes add column if not exists completo            int default 1;
alter table estudiantes add column if not exists creado_en           timestamptz default now();
alter table estudiantes add column if not exists actualizado_en      timestamptz default now();

-- matriculas
alter table matriculas add column if not exists estudiante_id       bigint;
alter table matriculas add column if not exists dni                 text;
alter table matriculas add column if not exists anio                int default 2026;
alter table matriculas add column if not exists grado               text;
alter table matriculas add column if not exists seccion             text default 'Única';
alter table matriculas add column if not exists estado              text default 'Activa';
alter table matriculas add column if not exists monto               numeric(8,2) default 0;
alter table matriculas add column if not exists observacion         text;
alter table matriculas add column if not exists registrado_por      text;
alter table matriculas add column if not exists ms                  int default 0;
alter table matriculas add column if not exists creado_en           timestamptz default now();

-- notas
alter table notas add column if not exists estudiante_id       bigint;
alter table notas add column if not exists dni_estudiante      text;
alter table notas add column if not exists grado               text;
alter table notas add column if not exists curso               text;
alter table notas add column if not exists bimestre            text default 'I';
alter table notas add column if not exists nota                numeric(4,1);
alter table notas add column if not exists literal             text;
alter table notas add column if not exists docente             text;
alter table notas add column if not exists creado_en           timestamptz default now();

-- tareas
alter table tareas add column if not exists titulo              text;
alter table tareas add column if not exists descripcion         text;
alter table tareas add column if not exists curso               text;
alter table tareas add column if not exists grado               text;
alter table tareas add column if not exists docente             text;
alter table tareas add column if not exists vence               date;
alter table tareas add column if not exists creado_en           timestamptz default now();
alter table tareas add column if not exists adjunto_nombre      text;
alter table tareas add column if not exists adjunto_tipo        text;
alter table tareas add column if not exists adjunto_datos       text;

-- entregas
alter table entregas add column if not exists tarea_id            bigint;
alter table entregas add column if not exists estudiante_id       bigint;
alter table entregas add column if not exists estudiante          text;
alter table entregas add column if not exists archivo             text;
alter table entregas add column if not exists comentario          text;
alter table entregas add column if not exists nota                numeric(4,1);
alter table entregas add column if not exists estado              text default 'Entregado';
alter table entregas add column if not exists creado_en           timestamptz default now();
alter table entregas add column if not exists adjunto_nombre      text;
alter table entregas add column if not exists adjunto_tipo        text;
alter table entregas add column if not exists adjunto_datos       text;

-- asistencia
alter table asistencia add column if not exists estudiante_id       bigint;
alter table asistencia add column if not exists dni                 text;
alter table asistencia add column if not exists grado               text;
alter table asistencia add column if not exists fecha               date default current_date;
alter table asistencia add column if not exists estado              text default 'Presente';
alter table asistencia add column if not exists observacion         text;
alter table asistencia add column if not exists registrado_por      text;
alter table asistencia add column if not exists creado_en           timestamptz default now();

-- documentos
alter table documentos add column if not exists codigo              text;
alter table documentos add column if not exists tipo                text;
alter table documentos add column if not exists asunto              text;
alter table documentos add column if not exists detalle             text;
alter table documentos add column if not exists grado               text;
alter table documentos add column if not exists remitente           text;
alter table documentos add column if not exists destino             text default 'Personal administrativo';
alter table documentos add column if not exists archivo             text;
alter table documentos add column if not exists estado              text default 'Recibido';
alter table documentos add column if not exists segundos            int default 0;
alter table documentos add column if not exists completo            int default 1;
alter table documentos add column if not exists creado_en           timestamptz default now();

-- constancias
alter table constancias add column if not exists numero              text;
alter table constancias add column if not exists tipo                text;
alter table constancias add column if not exists nombre              text;
alter table constancias add column if not exists dni                 text;
alter table constancias add column if not exists aula                text;
alter table constancias add column if not exists sexo                text default 'M';
alter table constancias add column if not exists motivo              text;
alter table constancias add column if not exists verificacion        text;
alter table constancias add column if not exists ms                  int default 0;
alter table constancias add column if not exists emitido_por         text;
alter table constancias add column if not exists en_padron           int default 1;
alter table constancias add column if not exists creado_en           timestamptz default now();

-- comunicados
alter table comunicados add column if not exists titulo              text;
alter table comunicados add column if not exists cuerpo              text;
alter table comunicados add column if not exists etiqueta            text default 'General';
alter table comunicados add column if not exists urgente             int default 0;
alter table comunicados add column if not exists visible_portal      int default 1;
alter table comunicados add column if not exists dirigido_a          text default 'Todos';
alter table comunicados add column if not exists publicado_por       text;
alter table comunicados add column if not exists creado_en           timestamptz default now();

-- lecturas
alter table lecturas add column if not exists comunicado          text;
alter table lecturas add column if not exists visitante           text;
alter table lecturas add column if not exists usuario             text;
alter table lecturas add column if not exists dispositivo         text;
alter table lecturas add column if not exists creado_en           timestamptz default now();

-- mensajes
alter table mensajes add column if not exists autor               text;
alter table mensajes add column if not exists rol                 text;
alter table mensajes add column if not exists para                text default 'Todo el personal';
alter table mensajes add column if not exists texto               text;
alter table mensajes add column if not exists leido               int default 0;
alter table mensajes add column if not exists creado_en           timestamptz default now();

-- notificaciones
alter table notificaciones add column if not exists titulo              text;
alter table notificaciones add column if not exists cuerpo              text;
alter table notificaciones add column if not exists enlace              text;
alter table notificaciones add column if not exists dirigido_a          text default 'Todos';
alter table notificaciones add column if not exists leida               int default 0;
alter table notificaciones add column if not exists creado_en           timestamptz default now();

-- solicitudes
alter table solicitudes add column if not exists folio               text;
alter table solicitudes add column if not exists nombres             text;
alter table solicitudes add column if not exists apellidos           text;
alter table solicitudes add column if not exists dni                 text;
alter table solicitudes add column if not exists fecha_nac           date;
alter table solicitudes add column if not exists grado_solicitado    text;
alter table solicitudes add column if not exists apoderado           text;
alter table solicitudes add column if not exists dni_apoderado       text;
alter table solicitudes add column if not exists celular             text;
alter table solicitudes add column if not exists correo              text;
alter table solicitudes add column if not exists mensaje             text;
alter table solicitudes add column if not exists origen              text default 'Portal público';
alter table solicitudes add column if not exists anio                int default 2026;
alter table solicitudes add column if not exists estado              text default 'Pendiente';
alter table solicitudes add column if not exists respuesta           text;
alter table solicitudes add column if not exists atendido_por        text;
alter table solicitudes add column if not exists atendido_en         timestamptz;
alter table solicitudes add column if not exists creado_en           timestamptz default now();

-- tickets
alter table tickets add column if not exists codigo              text;
alter table tickets add column if not exists asunto              text;
alter table tickets add column if not exists detalle             text;
alter table tickets add column if not exists categoria           text default 'Otro';
alter table tickets add column if not exists prioridad           text default 'Media';
alter table tickets add column if not exists estado              text default 'Abierto';
alter table tickets add column if not exists solicitante         text;
alter table tickets add column if not exists contacto            text;
alter table tickets add column if not exists rol                 text;
alter table tickets add column if not exists respuesta           text;
alter table tickets add column if not exists atendido_por        text;
alter table tickets add column if not exists cerrado_en          timestamptz;
alter table tickets add column if not exists creado_en           timestamptz default now();

-- pagos
alter table pagos add column if not exists estudiante_id       bigint;
alter table pagos add column if not exists dni                 text;
alter table pagos add column if not exists concepto            text;
alter table pagos add column if not exists mes                 text;
alter table pagos add column if not exists monto               numeric(8,2) default 0;
alter table pagos add column if not exists estado              text default 'Pendiente';
alter table pagos add column if not exists fecha_pago          date;
alter table pagos add column if not exists comprobante         text;
alter table pagos add column if not exists registrado_por      text;
alter table pagos add column if not exists creado_en           timestamptz default now();

-- auditoria
alter table auditoria add column if not exists usuario             text;
alter table auditoria add column if not exists rol                 text;
alter table auditoria add column if not exists accion              text;
alter table auditoria add column if not exists modulo              text default 'General';
alter table auditoria add column if not exists detalle             text;
alter table auditoria add column if not exists ms                  int default 0;
alter table auditoria add column if not exists ip                  text;
alter table auditoria add column if not exists creado_en           timestamptz default now();

-- reportes
alter table reportes add column if not exists nombre              text;
alter table reportes add column if not exists filas               int default 0;
alter table reportes add column if not exists ms                  int default 0;
alter table reportes add column if not exists formato             text default 'PDF';
alter table reportes add column if not exists version             int default 1;
alter table reportes add column if not exists verificacion        text;
alter table reportes add column if not exists parametros          text;
alter table reportes add column if not exists generado_por        text;
alter table reportes add column if not exists creado_en           timestamptz default now();

-- consultas
alter table consultas add column if not exists pregunta            text;
alter table consultas add column if not exists intencion           text;
alter table consultas add column if not exists resuelta            int default 1;
alter table consultas add column if not exists ambito              text default 'publico';
alter table consultas add column if not exists creado_en           timestamptz default now();

-- intentos_acceso
alter table intentos_acceso add column if not exists identificador       text;
alter table intentos_acceso add column if not exists tipo                text;
alter table intentos_acceso add column if not exists exito               int default 0;
alter table intentos_acceso add column if not exists motivo              text;
alter table intentos_acceso add column if not exists ip                  text;
alter table intentos_acceso add column if not exists agente              text;
alter table intentos_acceso add column if not exists creado_en           timestamptz default now();

-- imagenes
alter table imagenes add column if not exists clave               text;
alter table imagenes add column if not exists titulo              text;
alter table imagenes add column if not exists archivo             text;
alter table imagenes add column if not exists actualizado         timestamptz default now();

-- config_sistema
alter table config_sistema add column if not exists clave               text;
alter table config_sistema add column if not exists valor               text;
alter table config_sistema add column if not exists descripcion         text;
alter table config_sistema add column if not exists actualizado         timestamptz default now();

-- =====================================================================
--  3. ÍNDICES, DISPARADORES Y VISTAS
-- =====================================================================
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


comment on table usuarios is 'Cuentas del personal. Las crea dirección; no hay registro público.';
create index if not exists idx_usuarios_rol on usuarios(rol) where activo = 1;

-- =====================================================================
--  2. GRADOS Y CURSOS
-- =====================================================================


comment on column grados.vacantes is 'Aforo del aula. El tríptico institucional indica 12 por ambiente.';




-- =====================================================================
--  3. ESTUDIANTES  (el padrón: DNI único, sin duplicados)
-- =====================================================================


comment on column estudiantes.dni is 'Llave de acceso del estudiante al sistema. Único y de 8 dígitos.';
create index if not exists idx_est_grado  on estudiantes(grado, estado);
create index if not exists idx_est_estado on estudiantes(estado, anio);

-- =====================================================================
--  4. MATRÍCULAS  (histórico por año)
-- =====================================================================



-- =====================================================================
--  5. NOTAS  (una por estudiante, curso y bimestre)
-- =====================================================================


comment on table notas is 'La restricción única evita notas duplicadas del mismo curso y bimestre.';
create index if not exists idx_notas_grado on notas(grado, bimestre);

-- =====================================================================
--  6. TAREAS Y ENTREGAS
-- =====================================================================






-- =====================================================================
--  7. ASISTENCIA
-- =====================================================================


create index if not exists idx_asis_fecha on asistencia(grado, fecha);

-- =====================================================================
--  8. DOCUMENTOS  (mesa de partes interna)
-- =====================================================================



-- =====================================================================
--  9. CONSTANCIAS EMITIDAS
-- =====================================================================



-- =====================================================================
-- 10. COMUNICADOS Y LECTURAS  (difusión)
-- =====================================================================


create index if not exists idx_com_destino on comunicados(dirigido_a, creado_en desc);




-- =====================================================================
-- 11. MENSAJERÍA Y NOTIFICACIONES
-- =====================================================================






-- =====================================================================
-- 12. SOLICITUDES DE VACANTE  (llegan del portal público)
-- =====================================================================


create index if not exists idx_sol_estado on solicitudes(estado, creado_en desc);

-- =====================================================================
-- 13. TICKETS DE SOPORTE
-- =====================================================================


create index if not exists idx_tickets_estado on tickets(estado, prioridad);

-- =====================================================================
-- 14. PAGOS Y PENSIONES
-- =====================================================================



-- =====================================================================
-- 15. AUDITORÍA, REPORTES, CONSULTAS E INTENTOS DE ACCESO
-- =====================================================================


create index if not exists idx_aud_fecha on auditoria(creado_en desc);



comment on table reportes is 'Control de versiones y verificación de los documentos emitidos.';



comment on table consultas is 'Preguntas hechas al chatbot; permiten medir la fluidez de la comunicación.';



create index if not exists idx_intentos_fecha on intentos_acceso(creado_en desc);

-- =====================================================================
-- 16. AUXILIARES
-- =====================================================================






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

drop trigger if exists tg_literal_nota on notas;
create trigger tg_literal_nota
  before insert or update on notas
  for each row execute function fn_literal_nota();

-- Marca de tiempo de la última modificación del estudiante.
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

-- =====================================================================
--  LISTO. Ahora ejecuta 02_datos_base.sql y luego 03_alumnos.sql.
-- =====================================================================

-- =====================================================================
--  4. RECARGAR EL CACHÉ DE ESQUEMA DE SUPABASE
--  ---------------------------------------------------------------------
--  Supabase (PostgREST) guarda en memoria la lista de tablas y columnas.
--  Si agregas una columna y no le avisas, sigue respondiendo
--  "Could not find the '...' column ... in the schema cache" aunque la
--  columna ya exista. Esta línea es el aviso.
-- =====================================================================
notify pgrst, 'reload schema';

-- =====================================================================
--  COMPROBACIÓN
--    select column_name from information_schema.columns
--      where table_name = 'usuarios' order by ordinal_position;
--
--  Deben aparecer: algoritmo, grados_asignados, debe_cambiar_clave,
--  intentos_fallidos, bloqueado_hasta y ultimo_acceso.
--
--  Si el personal todavía no entra con su DNI, ejecuta después
--  sql/04_migracion.sql: ese además pone las contraseñas al día.
-- =====================================================================
