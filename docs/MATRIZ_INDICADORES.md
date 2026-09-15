# Matriz de variables e indicadores

**Tesis:** Sistema web con chatbot para mejorar la gestión administrativa
de la I.E.P. Raúl Porras Barrenechea — Sunampe, Chincha, Ica.

---

## 1. Matriz de operacionalización

### Variable independiente — Sistema web con chatbot

| Aspecto | Definición |
|---|---|
| **Tipo** | Cualitativa |
| **Escala** | Nominal (dicotómica: sin sistema / con sistema) |
| **Definición conceptual** | Aplicación web de arquitectura cliente–servidor que centraliza la información académica y administrativa de la institución e incorpora un asistente conversacional para atender consultas. |
| **Definición operacional** | Se manipula en dos estados: *antes* (procesos manuales en papel y hojas sueltas) y *después* (procesos realizados en el sistema). Se describe por sus dimensiones de funcionalidad, usabilidad y seguridad. |

**Dimensiones e indicadores de la variable independiente**

| Dimensión | Indicador | Evidencia en el sistema |
|---|---|---|
| Funcionalidad | Módulos operativos implementados | 5 paneles por rol, 8 módulos funcionales |
| Funcionalidad | Cobertura del CRUD | Alta, consulta, edición y baja lógica en cada entidad |
| Usabilidad | Facilidad de acceso percibida | Dos puertas de ingreso; el estudiante entra con un solo dato |
| Usabilidad | Tiempo de aprendizaje | Interfaz por roles: cada usuario ve solo lo suyo |
| Seguridad | Control de acceso por rol | Guardia de rol en cada panel + políticas RLS |
| Seguridad | Protección de credenciales | PBKDF2-HMAC-SHA256, 150 000 iteraciones, sal por cuenta |
| Chatbot | Consultas resueltas sin intervención humana | Tabla `consultas`, campo `resuelta` |

### Variable dependiente — Gestión administrativa

| Aspecto | Definición |
|---|---|
| **Tipo** | Cuantitativa |
| **Escala** | Ordinal — Likert de 5 puntos (1 = muy deficiente … 5 = muy eficiente), complementada con mediciones de razón obtenidas del propio sistema |
| **Definición conceptual** | Conjunto de procesos de organización, registro, comunicación, difusión y emisión de información que sostiene el funcionamiento de la institución educativa. |
| **Definición operacional** | Se mide con un cuestionario tipo Likert aplicado al personal (6 dimensiones, 24 ítems) y se contrasta con los registros automáticos que el sistema guarda de cada operación. |

---

## 2. Los seis indicadores

Para cada indicador: qué mide, cómo lo cumple el sistema (cinco
funcionalidades reales, no promesas) y de dónde sale el dato objetivo.

---

### 🟡 Indicador 1 — Organización de los datos administrativos

**Qué mide:** si la información está centralizada, clasificada y localizable.

**Cómo lo cumple el sistema**

| # | Funcionalidad | Dónde está en el código |
|---|---|---|
| 1 | **Base de datos centralizada** en Supabase (PostgreSQL): 24 tablas relacionadas, con llaves foráneas que impiden datos huérfanos | `sql/01_esquema.sql` |
| 2 | **Clasificación automática** por grado, sección, nivel, estado y año; el orden de los grados es el oficial | `assets/js/nucleo/config.js` → `GRADOS`; `sql/01_esquema.sql` → `v_ocupacion_aulas` |
| 3 | **Filtros combinados**: DNI o nombre (búsqueda que ignora tildes y mayúsculas), grado, estado y **rango de fechas de registro** | `modulos/estudiantes.js` → `filtradas()`; `nucleo/ui.js` → `herramientas({fechas:true})` |
| 4 | **Historial de matrícula y de documentos**: cada año deja su fila en `matriculas`, y la mesa de partes numera cada documento | `sql/01_esquema.sql` → `matriculas`, `documentos`; `modulos/registros.js` |
| 5 | **Validación automática que evita duplicados**: DNI único con formato `^[0-9]{8}$`, código correlativo sin saltos y aviso en pantalla antes de guardar | `sql/01_esquema.sql`; `nucleo/datos.js` → `estudiantes.dniOcupado`, `siguienteCodigo` |

Además, **bitácora de auditoría** de quién hizo qué, cuándo, en qué módulo y
cuánto demoró (`nucleo/datos.js` → `auditar`, tabla `auditoria`).

> **Sobre la centralización, con precisión.** El sistema tiene **dos fuentes
> de datos con el mismo esquema**: la base en la nube (Supabase/PostgreSQL,
> `sql/01_esquema.sql`) y una copia local dentro del navegador
> (`nucleo/local.js`), que se usa de fábrica para que el sistema funcione y se
> pueda demostrar sin depender de la red. Las dos se usan **a través de los
> mismos repositorios**, así que ninguna pantalla sabe con cuál habla y se
> cambia de una a otra con una línea (`FUENTE_DATOS` en `config.js`).
>
> Para la tesis esto no debilita el argumento: lo refuerza. Demuestra que la
> capa de datos está **desacoplada** (indicador de estandarización: patrón
> repositorio, MVC) y que la centralización es una propiedad del **esquema**,
> no de un proveedor concreto.

**Medición objetiva**

```sql
-- Porcentaje de fichas completas
select round(100.0 * count(*) filter (
         where nombres is not null and apellidos is not null
           and dni is not null and grado is not null) / count(*), 1) as pct_completas
  from estudiantes;
```

También en: panel de Dirección → **Indicadores** → indicador 1.

---

### 🟡 Indicador 2 — Rapidez en el registro de información

**Qué mide:** cuánto tiempo toma incorporar un dato nuevo al sistema.

**Cómo lo cumple el sistema**

| # | Funcionalidad | Dónde está en el código |
|---|---|---|
| 1 | **Formulario digital sin papel**: la matrícula rápida pide seis campos; desde el portal, la familia manda su solicitud o pide entrevista sin venir | `modulos/registros.js` → `vistaMatricula`; `portal.js` → `montarSolicitud`, `montarEntrevista` |
| 2 | **Autocompletado**: al escribir un DNI que ya está en el padrón se traen todos sus datos; y al escribir los apellidos se rellenan apoderado y celular tomándolos del hermano ya matriculado | `modulos/registros.js` → oyentes `blur` de `#dni` y `#apellidos`; `nucleo/datos.js` → `estudiantes.porDni`, `familiaPorApellidos` |
| 3 | **Registro en tiempo real, sin recargar**: la lista y los contadores se actualizan solos | `nucleo/datos.js` → `escuchar()` (canales Realtime de Supabase) |
| 4 | **Importación masiva** desde CSV o Excel: valida fila por fila, dice qué filas fallan y por qué, y carga el resto en bloques de 50 | `modulos/estudiantes.js` → `abrirImportador` |
| 5 | **Confirmación instantánea** con el tiempo exacto que tomó el registro y el código asignado | `modulos/registros.js` → cronómetro `#cronometro` + `estudiantes.segundos` |

**Medición objetiva**

El sistema **cronometra cada alta** y la guarda en `estudiantes.segundos`.

```sql
-- Tiempo promedio de registro, en segundos
select round(avg(segundos)::numeric, 1) as segundos_promedio
  from estudiantes where segundos > 0;
```

El cronómetro también se muestra en pantalla mientras se llena el formulario,
para que pueda observarse durante la demostración de la tesis.

---

### 🟡 Indicador 3 — Fluidez de la comunicación institucional

**Qué mide:** con qué facilidad la información llega de una persona a otra.

**Cómo lo cumple el sistema**

| # | Funcionalidad | Dónde está en el código |
|---|---|---|
| 1 | **Chat interno docente ↔ administrativo ↔ dirección ↔ soporte**, con destinatario por rol y llegada en tiempo real | `modulos/comunicacion.js` → `vistaMensajes`; tabla `mensajes` |
| 2 | **Chatbot para padres**: 20 intenciones; puntúa por palabra, por raíz y **tolerando erratas** (distancia de edición), desempata por sentido y responde con datos reales de la base (vacantes del día por grado, costos, requisitos, horarios) | `modulos/chatbot.js` → `puntuar`, `distancia`, `decidir`, `pensar` |
| 3 | **Notificaciones en tiempo real**: la campana del panel se actualiza sola y salta un aviso flotante | `paneles/base.js` → `escucharNotificaciones` |
| 4 | **Bandeja segmentada por rol**: cada quien ve lo dirigido a él, a su rol o a todo el personal | `nucleo/datos.js` → `notificaciones.mias(rol)` |
| 5 | **Alertas automáticas**: tarea asignada, faltas del día, pagos pendientes, nueva solicitud de vacante, **pedido de entrevista con la dirección** y nuevo ticket | `modulos/academico.js`, `modulos/registros.js`, `portal.js` → `montarEntrevista`, `modulos/soporte.js` |

**Medición objetiva**

```sql
-- Porcentaje de consultas que el chatbot resolvió sin intervención humana
select round(100.0 * count(*) filter (where resuelta = 1) / count(*), 1) as pct_resueltas,
       intencion, count(*) as veces
  from consultas group by intencion order by veces desc;
```

Esa última columna además dice **qué preguntan más las familias**, que es
material útil para el análisis cualitativo de la tesis.

---

### 🟡 Indicador 4 — Difusión eficiente de la información

**Qué mide:** si lo que se publica efectivamente llega a su destinatario.

**Cómo lo cumple el sistema**

| # | Funcionalidad | Dónde está en el código |
|---|---|---|
| 1 | **Módulo de comunicados** con etiqueta, destinatario y marca de urgencia | `modulos/comunicacion.js` → `vistaComunicados`, `abrirEditor` |
| 2 | **Publicación simultánea** en el portal público y en los paneles: se escribe una vez y aparece en los dos sitios al instante | `portal.js` → `escucharComunicados`; campo `visible_portal` |
| 3 | **Envío por correo, WhatsApp y aviso del navegador** desde el botón **📤 Difundir** de cada comunicado | `modulos/comunicacion.js` → `abrirDifusion`, `avisarEnNavegador` |
| 4 | **Calendario académico** visible para cualquiera, sin iniciar sesión | `index.html` → `#calendario`; `portal.js` → `pintarCalendario` |
| 5 | **Anuncios por grado**: el destinatario puede ser todos, un rol o un grado concreto, y el estudiante solo ve los suyos | `modulos/comunicacion.js` → `DESTINOS()`; `paneles/estudiante.js` |

Además, **registro de lecturas** con el tipo de dispositivo, que es lo que
permite medir el alcance (`portal.js`, tabla `lecturas`).

> **Nota honesta para la tesis.** El sistema se publica en GitHub Pages, sin
> servidor propio, así que **no envía correos por su cuenta ni mantiene
> suscripciones push con clave VAPID**. Lo que hace es preparar el envío y
> entregárselo al canal que la familia sí usa: abre el cliente de correo con
> los apoderados del grado en copia oculta y el texto ya escrito, arma el
> mensaje de WhatsApp listo para compartir, y muestra un aviso del navegador
> a quien tenga el sistema abierto. Si más adelante se contrata un servidor
> (o una función de Supabase), el envío automático se añade sin tocar el
> resto: solo cambia `abrirDifusion`.

**Medición objetiva**

```sql
-- Lecturas registradas por comunicado publicado
select (select count(*) from lecturas)::numeric
     / nullif((select count(*) from comunicados), 0) as lecturas_por_comunicado;

-- Reparto por dispositivo (muestra el alcance móvil)
select dispositivo, count(*) from lecturas group by dispositivo;
```

---

### 🟡 Indicador 5 — Rapidez en la generación de reportes

**Qué mide:** cuánto se tarda desde que alguien pide un documento hasta que lo
tiene en la mano.

**Cómo lo cumple el sistema**

| # | Funcionalidad | Dónde está en el código |
|---|---|---|
| 1 | **PDF en un clic** desde el catálogo: siete reportes listos | `modulos/reportes.js` → `CATALOGO`, `ejecutar` |
| 2 | **Constancia de matrícula automática**, con el texto oficial redactado a partir del padrón | `modulos/estudiantes.js` → `emitirConstancia`; `nucleo/pdf.js` → `Reporte.constancia` |
| 3 | **Libreta de notas por estudiante**, con promedios y escala de logro calculados por el sistema | `paneles/estudiante.js` → «Descargar mi libreta»; `nucleo/pdf.js` → `Reporte.libreta` |
| 4 | **Reportes por fecha o por grado**: además del grado y el estado, el padrón y el estado de cuenta admiten un rango de fechas | `modulos/reportes.js` → `enRango`, `pedirFiltros` con `fechas:true` |
| 5 | **Descarga inmediata sin procesos manuales**: PDF listo para imprimir y exportación a CSV de cualquier lista filtrada | `nucleo/pdf.js`; `nucleo/util.js` → `aCSV` |

**Medición objetiva**

Cada emisión guarda su duración en `reportes.ms`.

```sql
-- Tiempo promedio de emisión de reportes, en milisegundos
select nombre, count(*) as veces, round(avg(ms)) as ms_promedio
  from reportes group by nombre order by veces desc;
```

Comparación para la tesis: el mismo listado elaborado a mano en el
procedimiento anterior tomaba minutos; aquí se mide en milisegundos, y el
número no lo pone el tesista, lo registra el sistema.

---

### 🟡 Indicador 6 — Precisión de los reportes

**Qué mide:** si la información emitida es correcta, sin duplicados ni
errores de transcripción.

**Cómo lo cumple el sistema**

| # | Funcionalidad | Dónde está en el código |
|---|---|---|
| 1 | **Datos tomados directamente de la base**: ningún reporte se escribe a mano, así que no hay error de transcripción | `nucleo/pdf.js` → `Reporte.listado` recibe filas del repositorio |
| 2 | **Validación previa a la emisión**: cada reporte declara sus campos obligatorios; si un registro está incompleto, dice qué fila falla y **no emite el documento** | `nucleo/pdf.js` → `obligatorios` |
| 3 | **Plantillas estandarizadas** con membrete, códigos modulares, firma de dirección y estructura idéntica | `nucleo/pdf.js` → `membrete`, `pie` |
| 4 | **Control de versiones**: cada emisión incrementa su número de versión y queda registrada | `nucleo/datos.js` → `reportes.registrar` |
| 5 | **Código de verificación con QR** en el pie de cada documento | `nucleo/pdf.js` → `qrcodejs` + campo `verificacion` |

Además, a nivel de base de datos:

- `estudiantes.dni` es **único** y tiene una restricción de formato
  (`^[0-9]{8}$`): no hay forma de crear dos fichas con el mismo DNI.
- `notas` tiene una restricción **única** por (estudiante, curso, bimestre):
  no puede haber dos notas del mismo curso para el mismo alumno.
- El **literal** (AD, A, B, C) lo calcula un disparador en el servidor, no la
  persona que registra la nota.

**Medición objetiva**

```sql
-- DNI únicos sobre el total: mide la ausencia de duplicados
select count(distinct dni) as unicos, count(*) as total,
       round(100.0 * count(distinct dni) / count(*), 2) as pct_precision
  from estudiantes;

-- Documentos emitidos con código de verificación
select count(*) filter (where verificacion is not null) as verificables,
       count(*) as total from reportes;
```

---

## 3. Resumen para la tabla de la tesis

| N.º | Indicador | Unidad de medida | Instrumento | Fuente del dato |
|---|---|---|---|---|
| 1 | Organización de datos | % de fichas completas | Ficha de observación + consulta SQL | `estudiantes`, `auditoria` |
| 2 | Rapidez en el registro | Segundos por registro | Cronómetro del sistema | `estudiantes.segundos` |
| 3 | Fluidez de comunicación | % de consultas resueltas | Registro del chatbot | `consultas` |
| 4 | Difusión de información | Lecturas por comunicado | Registro de lecturas | `lecturas`, `comunicados` |
| 5 | Rapidez de reportes | Milisegundos por reporte | Cronómetro del sistema | `reportes.ms` |
| 6 | Precisión de reportes | % de registros sin duplicado | Restricciones + consulta SQL | `estudiantes`, `notas` |

Los seis se calculan solos en **Dirección → Indicadores**, y se exportan en un
PDF con membrete institucional desde **Reportes → Tablero de indicadores de
gestión**.

---

## 4. Sugerencia de ítems para el cuestionario Likert

Cuatro ítems por dimensión, 24 en total. Escala: 1 = muy en desacuerdo,
5 = muy de acuerdo.

**Dimensión 1 · Organización de datos**
1. La información de los estudiantes está ordenada y es fácil de ubicar.
2. Encuentro rápidamente el expediente de un estudiante cuando lo necesito.
3. Los datos que consulto están actualizados.
4. Sé quién registró o modificó cada dato.

**Dimensión 2 · Rapidez en el registro**
5. Registrar a un estudiante nuevo toma poco tiempo.
6. El proceso de matrícula no me obliga a repetir datos.
7. Puedo atender a un apoderado sin hacerlo esperar.
8. Cargar varios registros a la vez es sencillo.

**Dimensión 3 · Fluidez de comunicación**
9. Me entero a tiempo de lo que ocurre en la institución.
10. Puedo comunicarme con otras áreas sin trámites intermedios.
11. Las consultas de los padres se atienden con rapidez.
12. Recibo aviso cuando algo requiere mi atención.

**Dimensión 4 · Difusión de la información**
13. Los comunicados llegan a quienes deben llegar.
14. Los padres de familia acceden fácilmente a la información institucional.
15. Publicar un comunicado es rápido y simple.
16. La información del portal está siempre al día.

**Dimensión 5 · Rapidez en reportes**
17. Obtengo un reporte cuando lo necesito, sin esperar.
18. Emitir una constancia toma poco tiempo.
19. No dependo de otra persona para generar un documento.
20. Puedo exportar la información para trabajarla aparte.

**Dimensión 6 · Precisión de reportes**
21. Los reportes que emito no contienen errores.
22. No encuentro registros duplicados.
23. Los documentos emitidos tienen un formato uniforme.
24. Puedo verificar que un documento emitido es auténtico.

---

*Este documento acompaña al sistema; las consultas SQL están listas para
pegarse en el editor de Supabase y capturar los resultados como anexo.*
