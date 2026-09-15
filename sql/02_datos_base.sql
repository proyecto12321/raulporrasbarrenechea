-- =====================================================================
--  DATOS BASE DEL SISTEMA
--  I.E.P. Raúl Porras Barrenechea · año escolar 2026
--  Ejecuta este archivo DESPUÉS de 01_esquema.sql
-- =====================================================================

-- ---------------------------------------------------------------------
--  1. PERSONAL Y CUENTAS
--  ---------------------------------------------------------------------
--  LA CONTRASEÑA DE CADA CUENTA ES SU PROPIO DNI.
--
--  Se guarda derivada con PBKDF2-HMAC-SHA256, 150,000 iteraciones y sal
--  aleatoria de 16 bytes por cuenta, así que no es reversible: aunque
--  alguien lea esta tabla no puede recuperar la contraseña.
--
--  Cada persona puede cambiarla desde su panel cuando quiera.
--  La lista completa de usuarios está en docs/CREDENCIALES.md.
-- ---------------------------------------------------------------------
insert into usuarios
  (nombres, dni, usuario, clave, algoritmo, rol, cargo, celular, grados_asignados, activo, debe_cambiar_clave)
values

  ('Melva Margarita Rojas Peñaloza', '08449165', 'mrojas', 'pbkdf2$150000$2R7qIFB3hvEbfT+Zydl7Fw==$waOfbkKRNCaFr20wrOyneLCupDtXIt42a9WaobWkiIo=', 'pbkdf2', 'docente', 'Docente de 3.er grado', '956070856', '3.er grado', 1, 0),
  ('Daniel Jesús Lévano Rojas', '71573418', 'dlevano', 'pbkdf2$150000$6zjZAkA8r9d+q7OS+okQPg==$2vP0b0pLyE7XrxcyNCl9aGqa/jrOQq0o9NH9AsSvtvM=', 'pbkdf2', 'administrativo', 'Personal administrativo', '956070857', null, 1, 0),
  ('Equipo de Soporte Técnico', '10000000', 'soporte', 'pbkdf2$150000$Z3am+AqeZPm8bDmyTbhY3Q==$YQ4E5u6fmQqKK3xirlVjCNjemqN+e7yZrRe5F5ymhtc=', 'pbkdf2', 'soporte', 'Soporte técnico', '956070858', null, 1, 0),
  ('Ysella Villanueva Antón', '40000001', 'yvillanueva', 'pbkdf2$150000$gDrZCgIcST91sOGoA8hacA==$GEl3sshayon81F4IF3ES2YW8rKKI51IeftkBG94hvNc=', 'pbkdf2', 'docente', 'Docente de Inicial', '956070861', 'Inicial 3 y 4 años,Inicial 5 años', 1, 0),
  ('Sonia Ruiz Ríos', '40000002', 'sruiz', 'pbkdf2$150000$BQABddo5AOjB/OJ/KgphKg==$e0b1/W4el+RhwL+AUgJZsA6iq2woW3R03uxH7DQXDqA=', 'pbkdf2', 'docente', 'Docente de 1.er grado', '956070862', '1.er grado', 1, 0),
  ('Sonia Rojas Ortiz', '40000003', 'srojas', 'pbkdf2$150000$Tyy6rtMJj42/X1eQFuQhGw==$iLm2qgOX/ChSSzNhlfoLul8d/HOj/pZZfB7jo8Hcz5M=', 'pbkdf2', 'docente', 'Docente de 2.do grado', '956070863', '2.do grado', 1, 0),
  ('Elizabeth Almeyda Matías', '41251702', 'directora', 'pbkdf2$150000$2R7qIFB3hvEbfT+Zydl7Fw==$waOfbkKRNCaFr20wrOyneLCupDtXIt42a9WaobWkiIo=', 'pbkdf2', 'director', 'Directora', '956070864', null, 1, 0),
  ('Brunella Patricia Sotelo Salhuana', '40000005', 'bsotelo', 'pbkdf2$150000$C7tEsIEVL+3oyyTc1JIaMA==$uD8WClnCqyGC0zrmGzAyygYGONBZWT+p/OPK3TiEdNA=', 'pbkdf2', 'docente', 'Docente de 4.to grado', '956070865', '4.to grado,5.to grado,6.to grado', 1, 0),
  ('Katherine Guadalupe Loza Torres', '40000006', 'kloza', 'pbkdf2$150000$GJje0N5InvGxrtqMm+1aDw==$hlN2x2Zs5L/EbAtljEWhWyAUg+GBWbM4uLlSeoFaRuA=', 'pbkdf2', 'docente', 'Docente de 5.to grado', '956070866', '4.to grado,5.to grado,6.to grado', 1, 0),
  ('Roxana Magale Almeyda Carpio', '40000007', 'ralmeyda', 'pbkdf2$150000$710gLeXJ4UAEI3YoYJ4Emw==$h4fmAbOzSRHeyXobT49UQH0JpAPywdV4XCERnyOKs1c=', 'pbkdf2', 'docente', 'Docente de 6.to grado', '956070867', '4.to grado,5.to grado,6.to grado', 1, 0),
  ('Angel Levano Rojas', '71573419', 'alevano', 'pbkdf2$150000$hDNuBvofSlzRXPYLnQhINA==$8p//YLCEJ8BtIJudgRF69nGxi+P9xCSUGyR9RSDYNIM=', 'pbkdf2', 'docente', 'Docente de Computación', null, 'Inicial 3 y 4 años,Inicial 5 años,1.er grado,2.do grado,3.er grado,4.to grado,5.to grado,6.to grado', 1, 0)

-- Si la cuenta ya existe, se ACTUALIZA. Así, volver a ejecutar este
-- archivo corrige un cargo, un aula asignada o una contraseña que
-- cambió, en vez de no hacer nada y dejar la base desfasada.
on conflict (usuario) do update set
  nombres          = excluded.nombres,
  dni              = excluded.dni,
  clave            = excluded.clave,
  algoritmo        = excluded.algoritmo,
  rol              = excluded.rol,
  cargo            = excluded.cargo,
  celular          = excluded.celular,
  grados_asignados = excluded.grados_asignados,
  activo           = excluded.activo;

-- ---------------------------------------------------------------------
--  2. GRADOS
--  El aforo es 12 por aula: "Aula para 12 alumnos por ambiente"
--  (bloque VACANTES LIMITADAS del tríptico institucional).
-- ---------------------------------------------------------------------
insert into grados (nombre, nivel, aula, docente, vacantes, orden) values
('Inicial 3 y 4 años', 'Inicial', 'Aula Amarilla', 'Ysella Villanueva Antón', 12, 1),
('Inicial 5 años', 'Inicial', 'Aula Verde', 'Ysella Villanueva Antón', 12, 2),
('1.er grado', 'Primaria', 'Aula 101', 'Sonia Ruiz Ríos', 12, 3),
('2.do grado', 'Primaria', 'Aula 102', 'Sonia Rojas Ortiz', 12, 4),
('3.er grado', 'Primaria', 'Aula 103', 'Melva Margarita Rojas Peñaloza', 12, 5),
('4.to grado', 'Primaria', 'Aula 104', 'Brunella Patricia Sotelo Salhuana', 12, 6),
('5.to grado', 'Primaria', 'Aula 105', 'Katherine Guadalupe Loza Torres', 12, 7),
('6.to grado', 'Primaria', 'Aula 106', 'Roxana Magale Almeyda Carpio', 12, 8)
on conflict (nombre) do nothing;

-- Enlaza cada grado con la cuenta del docente que lo dirige.
update grados g
   set docente_id = u.id
  from usuarios u
 where u.nombres = g.docente;

-- ---------------------------------------------------------------------
--  3. ÁREAS CURRICULARES POR GRADO
-- ---------------------------------------------------------------------
insert into cursos (nombre, grado, nivel, docente) values

  ('Personal Social', 'Inicial 3 y 4 años', 'Inicial', 'Ysella Villanueva Antón'),
  ('Psicomotricidad', 'Inicial 3 y 4 años', 'Inicial', 'Ysella Villanueva Antón'),
  ('Comunicación', 'Inicial 3 y 4 años', 'Inicial', 'Ysella Villanueva Antón'),
  ('Matemática', 'Inicial 3 y 4 años', 'Inicial', 'Ysella Villanueva Antón'),
  ('Ciencia y Tecnología', 'Inicial 3 y 4 años', 'Inicial', 'Ysella Villanueva Antón'),
  ('Religión', 'Inicial 3 y 4 años', 'Inicial', 'Ysella Villanueva Antón'),
  ('Inglés', 'Inicial 3 y 4 años', 'Inicial', 'Ysella Villanueva Antón'),
  ('Computación', 'Inicial 3 y 4 años', 'Inicial', 'Angel Levano Rojas'),
  ('Personal Social', 'Inicial 5 años', 'Inicial', 'Ysella Villanueva Antón'),
  ('Psicomotricidad', 'Inicial 5 años', 'Inicial', 'Ysella Villanueva Antón'),
  ('Comunicación', 'Inicial 5 años', 'Inicial', 'Ysella Villanueva Antón'),
  ('Matemática', 'Inicial 5 años', 'Inicial', 'Ysella Villanueva Antón'),
  ('Ciencia y Tecnología', 'Inicial 5 años', 'Inicial', 'Ysella Villanueva Antón'),
  ('Religión', 'Inicial 5 años', 'Inicial', 'Ysella Villanueva Antón'),
  ('Inglés', 'Inicial 5 años', 'Inicial', 'Ysella Villanueva Antón'),
  ('Computación', 'Inicial 5 años', 'Inicial', 'Angel Levano Rojas'),
  ('Comunicación', '1.er grado', 'Primaria', 'Sonia Ruiz Ríos'),
  ('Matemática', '1.er grado', 'Primaria', 'Sonia Ruiz Ríos'),
  ('Personal Social', '1.er grado', 'Primaria', 'Sonia Ruiz Ríos'),
  ('Ciencia y Tecnología', '1.er grado', 'Primaria', 'Sonia Ruiz Ríos'),
  ('Arte y Cultura', '1.er grado', 'Primaria', 'Sonia Ruiz Ríos'),
  ('Educación Física', '1.er grado', 'Primaria', 'Sonia Ruiz Ríos'),
  ('Educación Religiosa', '1.er grado', 'Primaria', 'Sonia Ruiz Ríos'),
  ('Inglés', '1.er grado', 'Primaria', 'Sonia Ruiz Ríos'),
  ('Computación', '1.er grado', 'Primaria', 'Angel Levano Rojas'),
  ('Tutoría', '1.er grado', 'Primaria', 'Sonia Ruiz Ríos'),
  ('Comunicación', '2.do grado', 'Primaria', 'Sonia Rojas Ortiz'),
  ('Matemática', '2.do grado', 'Primaria', 'Sonia Rojas Ortiz'),
  ('Personal Social', '2.do grado', 'Primaria', 'Sonia Rojas Ortiz'),
  ('Ciencia y Tecnología', '2.do grado', 'Primaria', 'Sonia Rojas Ortiz'),
  ('Arte y Cultura', '2.do grado', 'Primaria', 'Sonia Rojas Ortiz'),
  ('Educación Física', '2.do grado', 'Primaria', 'Sonia Rojas Ortiz'),
  ('Educación Religiosa', '2.do grado', 'Primaria', 'Sonia Rojas Ortiz'),
  ('Inglés', '2.do grado', 'Primaria', 'Sonia Rojas Ortiz'),
  ('Computación', '2.do grado', 'Primaria', 'Angel Levano Rojas'),
  ('Tutoría', '2.do grado', 'Primaria', 'Sonia Rojas Ortiz'),
  ('Comunicación', '3.er grado', 'Primaria', 'Melva Margarita Rojas Peñaloza'),
  ('Matemática', '3.er grado', 'Primaria', 'Melva Margarita Rojas Peñaloza'),
  ('Personal Social', '3.er grado', 'Primaria', 'Melva Margarita Rojas Peñaloza'),
  ('Ciencia y Tecnología', '3.er grado', 'Primaria', 'Melva Margarita Rojas Peñaloza'),
  ('Arte y Cultura', '3.er grado', 'Primaria', 'Melva Margarita Rojas Peñaloza'),
  ('Educación Física', '3.er grado', 'Primaria', 'Melva Margarita Rojas Peñaloza'),
  ('Educación Religiosa', '3.er grado', 'Primaria', 'Melva Margarita Rojas Peñaloza'),
  ('Inglés', '3.er grado', 'Primaria', 'Melva Margarita Rojas Peñaloza'),
  ('Computación', '3.er grado', 'Primaria', 'Angel Levano Rojas'),
  ('Tutoría', '3.er grado', 'Primaria', 'Melva Margarita Rojas Peñaloza'),
  ('Comunicación', '4.to grado', 'Primaria', 'Roxana Magale Almeyda Carpio'),
  ('Matemática', '4.to grado', 'Primaria', 'Katherine Guadalupe Loza Torres'),
  ('Personal Social', '4.to grado', 'Primaria', 'Brunella Patricia Sotelo Salhuana'),
  ('Ciencia y Tecnología', '4.to grado', 'Primaria', 'Brunella Patricia Sotelo Salhuana'),
  ('Arte y Cultura', '4.to grado', 'Primaria', 'Brunella Patricia Sotelo Salhuana'),
  ('Educación Física', '4.to grado', 'Primaria', 'Brunella Patricia Sotelo Salhuana'),
  ('Educación Religiosa', '4.to grado', 'Primaria', 'Brunella Patricia Sotelo Salhuana'),
  ('Inglés', '4.to grado', 'Primaria', 'Brunella Patricia Sotelo Salhuana'),
  ('Computación', '4.to grado', 'Primaria', 'Angel Levano Rojas'),
  ('Tutoría', '4.to grado', 'Primaria', 'Brunella Patricia Sotelo Salhuana'),
  ('Comunicación', '5.to grado', 'Primaria', 'Roxana Magale Almeyda Carpio'),
  ('Matemática', '5.to grado', 'Primaria', 'Katherine Guadalupe Loza Torres'),
  ('Personal Social', '5.to grado', 'Primaria', 'Brunella Patricia Sotelo Salhuana'),
  ('Ciencia y Tecnología', '5.to grado', 'Primaria', 'Brunella Patricia Sotelo Salhuana'),
  ('Arte y Cultura', '5.to grado', 'Primaria', 'Brunella Patricia Sotelo Salhuana'),
  ('Educación Física', '5.to grado', 'Primaria', 'Brunella Patricia Sotelo Salhuana'),
  ('Educación Religiosa', '5.to grado', 'Primaria', 'Brunella Patricia Sotelo Salhuana'),
  ('Inglés', '5.to grado', 'Primaria', 'Brunella Patricia Sotelo Salhuana'),
  ('Computación', '5.to grado', 'Primaria', 'Angel Levano Rojas'),
  ('Tutoría', '5.to grado', 'Primaria', 'Katherine Guadalupe Loza Torres'),
  ('Comunicación', '6.to grado', 'Primaria', 'Roxana Magale Almeyda Carpio'),
  ('Matemática', '6.to grado', 'Primaria', 'Katherine Guadalupe Loza Torres'),
  ('Personal Social', '6.to grado', 'Primaria', 'Brunella Patricia Sotelo Salhuana'),
  ('Ciencia y Tecnología', '6.to grado', 'Primaria', 'Brunella Patricia Sotelo Salhuana'),
  ('Arte y Cultura', '6.to grado', 'Primaria', 'Brunella Patricia Sotelo Salhuana'),
  ('Educación Física', '6.to grado', 'Primaria', 'Brunella Patricia Sotelo Salhuana'),
  ('Educación Religiosa', '6.to grado', 'Primaria', 'Brunella Patricia Sotelo Salhuana'),
  ('Inglés', '6.to grado', 'Primaria', 'Brunella Patricia Sotelo Salhuana'),
  ('Computación', '6.to grado', 'Primaria', 'Angel Levano Rojas'),
  ('Tutoría', '6.to grado', 'Primaria', 'Roxana Magale Almeyda Carpio')

-- El curso ya existe: lo que puede haber cambiado es quién lo
-- enseña, así que eso sí se actualiza.
on conflict (nombre, grado) do update set docente = excluded.docente;

-- ---------------------------------------------------------------------
--  4. COMUNICADOS DE APERTURA
-- ---------------------------------------------------------------------
insert into comunicados (titulo, cuerpo, etiqueta, urgente, visible_portal, dirigido_a, publicado_por) values
('Matrícula 2026 abierta',
 'Ya está abierta la matrícula para el año escolar 2026. Las vacantes son limitadas: cada aula recibe como máximo 12 estudiantes. Acércate a secretaría con los requisitos o envía tu solicitud desde el portal.',
 'Matrícula', 0, 1, 'Todos', 'Daniel Jesús Lévano Rojas'),

('Bienvenida al año escolar 2026',
 'Damos la bienvenida a todas las familias al año lectivo 2026. Las clases se desarrollan de 8:00 a. m. a 2:00 p. m. Contamos con su apoyo para acompañar a nuestros estudiantes.',
 'General', 0, 1, 'Todos', 'Elizabeth Almeyda Matías'),

('Nuevo sistema de gestión en línea',
 'Desde este año, estudiantes y personal ingresan al sistema desde el portal. Los estudiantes entran únicamente con su DNI; el personal, con su usuario y su DNI como contraseña inicial, que puede cambiar desde su panel.',
 'General', 0, 1, 'Todos', 'Equipo de Soporte Técnico'),

('Reunión de coordinación docente',
 'Se convoca a todo el personal docente a la reunión de coordinación pedagógica. Traer el avance del registro de notas del primer bimestre.',
 'Reunión', 0, 0, 'Docente', 'Elizabeth Almeyda Matías')
on conflict do nothing;

-- ---------------------------------------------------------------------
--  5. PARÁMETROS DEL SISTEMA
-- ---------------------------------------------------------------------
insert into config_sistema (clave, valor, descripcion) values
('anio_escolar',     '2026',   'Año escolar activo'),
('aforo_aula',       '12',     'Máximo de estudiantes por aula (tríptico institucional)'),
('anios_servicio',   '26',     'Años de servicio a la comunidad'),
('docentes',         '10',     'Plana docente calificada (cifra institucional del portal)'),
('directora',        'Elizabeth Almeyda Matías', 'Dirección de la institución'),
('costo_matricula',  '300.00', 'Costo de matrícula en soles'),
('pension_inicial',  '300.00', 'Pensión mensual del nivel Inicial'),
('pension_primaria', '330.00', 'Pensión mensual del nivel Primaria'),
('mensualidades',    '10',     'Número de pensiones al año'),
('version_sistema',  '2.2',    'Versión del sistema de gestión'),
('intentos_maximos', '5',      'Intentos de acceso antes del bloqueo'),
('minutos_bloqueo',  '5',      'Duración del bloqueo por intentos fallidos')
on conflict (clave) do update set valor = excluded.valor, actualizado = now();

-- ---------------------------------------------------------------------
--  6. IMÁGENES DEL PORTAL
-- ---------------------------------------------------------------------
insert into imagenes (clave, titulo, archivo) values
('escudo',          'Escudo institucional',  ''),
('firma_directora', 'Firma de la directora', ''),
('fachada',         'Fachada del colegio',   'triptico_exterior_2.jpg'),
('patio',           'Patio de formación',    'triptico_portada.jpg')
on conflict (clave) do nothing;

notify pgrst, 'reload schema';

-- =====================================================================
--  LISTO. Ahora ejecuta 03_alumnos.sql para cargar el padrón real.
-- =====================================================================
