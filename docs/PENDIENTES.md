# Los 18 pedidos: qué se hizo y cómo probarlo

> **Actualizado a la v3.2.** Lo pedido después de estos 18 puntos está en
> un documento aparte: **`docs/CAMBIOS_v3.2.md`** (contraseña de la
> directora, el profesor Angel, reportes en Word, chatbot como guía y por
> grado, tríptico 3D táctil, Soporte con todas las fotos, baja de
> estudiantes, mensajes por sección, áreas mes a mes, adjuntos de audio y
> video, historial del chat por días, y el rediseño con el amarillo nuevo
> y el modo oscuro legible).
>
> Y una cosa que **no se puede hacer** —PHP sin servidor— está explicada
> de frente en **`docs/SOBRE_PHP_Y_LA_BASE.md`**, junto con qué tienes hoy
> que cumple la misma función.

Este documento reemplaza la versión anterior (donde 8 puntos quedaban
pendientes). Ahora los 18 están implementados y probados con Playwright
—login real de cada rol, cero errores de JavaScript en las vistas nuevas—.
Aquí está cada uno, con dónde encontrarlo y qué esperar.

## 1. Organización de datos administrativos

- **Directorio** (Dirección → "Directorio"): busca por nombre, DNI o
  código entre Personal, Docentes y Estudiantes, en pestañas separadas.
  Cada resultado tiene un botón "Mandar mensaje" que escribe directo a esa
  persona (no a todo un rol).
- **Auditoría de Dirección** ahora abre mostrando primero "Alumnos nuevos"
  y "Docentes nuevos" (los últimos 8 de cada uno), y debajo la bitácora
  completa de siempre.

## 2. Rapidez en el registro

- El alta de estudiante/personal ya validaba DNI único antes; ahora los
  reportes en PDF también rechazan un lote con DNI repetido antes de
  emitir (ver punto 18).
- El "Emitir constancia" sigue tomando los datos del padrón (nombre → se
  autocompletan DNI y grado), como ya funcionaba.

## 3. Fluidez de comunicación institucional

- **Mensajería directa** vía el Directorio (punto 1): un mensaje a una
  persona exacta le llega a su campana de notificaciones — antes esto
  tenía un error de fondo (`notificaciones.mias` solo miraba el rol, no
  el nombre de la persona); ya está corregido.
- **Evaluación docente (Likert)**: en Dirección y en Personal
  administrativo, apartado "Evaluación docente". Preguntas por defecto
  editables (botón "✏️ Editar preguntas"), escala Muy mal…Muy bien,
  promedio calculado solo y guardado con quién evaluó y cuándo.

## 4. Difusión eficiente de información + notificaciones

- **Tareas por vencer**: el estudiante ahora recibe una notificación de
  verdad (no solo el texto en pantalla) cuando una tarea vence hoy o
  mañana y no la entregó, una vez al día.
- **Adjuntos en tareas y entregas**: el docente puede adjuntar material a
  una tarea (foto, PDF, RAR o video MP4, hasta 6 MB) y el estudiante puede
  adjuntar su trabajo al entregar. El docente ve el archivo del alumno
  desde "Ver entregas".
- **Comunicados separados por quién publica**: nuevo filtro "Publicado
  por" (Dirección / Personal administrativo) en la lista de comunicados,
  y cada uno queda firmado con su área, no solo con el nombre.

## 5. Rapidez en la generación de reportes

- **Constancia de matrícula y de vacante calcadas de tus plantillas
  Word**: el sistema genera exactamente ese texto (código modular,
  "Hace Constar", los mismos requisitos en la de vacante), solo
  cambiando nombre/DNI/grado/fecha. Se probó contra tus dos archivos
  línea por línea.
- **Exportar a Excel con un clic**: todo el catálogo de reportes de
  "Centro de reportes" ahora tiene un botón "⬇️ Exportar a Excel" además
  de "Generar reporte (PDF)". El cuaderno de notas del docente tiene su
  propio botón "⬇️ Excel" para exportar las notas del aula que tiene
  abierta — pensado justo para mandárselo a Dirección.

## 6. Precisión de los reportes

- La validación de "faltan datos" ya existía; se le agregó detección de
  **DNI duplicado dentro del mismo reporte**, y se aplica también a la
  exportación a Excel (antes solo corría en el PDF).
- La integridad referencial de fondo (llaves foráneas, RLS) sigue en
  `sql/05_seguridad_rls.sql`, ahora con la tabla nueva de evaluaciones
  incluida.

## Diseño (del mensaje anterior, ya entregado)

Carrusel sin auto-giro, colores blanco/dorado suave, chat de Matrícula
con alto fijo, menú a la derecha, logotipo configurable por Soporte.

## Bugs de fondo que aparecieron al construir esto y ya están corregidos

- `Datos.config.fijar()` (el logotipo) usaba `id` para actualizar, pero
  la tabla real usa `clave` como llave — contra Supabase real hubiera
  fallado. Ahora hace un upsert correcto por `clave`.
- El panel de **Personal administrativo** no cargaba el módulo de
  Personal ni el Académico: al abrir "Evaluación docente" tiraba
  `ModPersonal is not defined`. Ya se agregaron esos dos scripts a
  `app/administrativo.html`.
- El panel de **Estudiante** no cargaba el módulo Académico, así que el
  adjunto de tareas (`ModAcademico.campoAdjunto`) habría fallado. Ya se
  agregó `academico.js` a `app/estudiante.html`.
- Las notificaciones dirigidas a una persona (no a un rol) nunca
  aparecían en su campana — `notificaciones.mias` solo miraba
  "Todos"/rol. Corregido para que también mire el nombre exacto.

## Cómo se probó

Playwright con login real: directora (usuario `directora`, clave
`08449165`), personal administrativo (`dlevano` / `71573418`) y un
estudiante por DNI. Se recorrieron todas las vistas de los tres paneles
más el portal público — cero errores de JavaScript en la última pasada.
La constancia de vacante y de matrícula se generaron de verdad y se
comparó el texto contra tus dos plantillas.
