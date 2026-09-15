# Sistema de gestión escolar con chatbot

**I.E.P. Raúl Porras Barrenechea** — Sunampe, Chincha, Ica
Versión 3.2 · HTML + CSS + JavaScript + Supabase (PostgreSQL) · listo para GitHub Pages

> **Empieza por aquí:**
> · `docs/CAMBIOS_v3.2.md` — todo lo que cambió en esta versión y cómo probarlo
> · `docs/CREDENCIALES.md` — con qué usuario y contraseña entra cada quien
>   (⚠️ la de la directora es `08449165`, no su DNI)
> · `docs/AUDITORIA_Y_LANZAMIENTO.md` — los pasos para conectar Supabase
> · `docs/SOBRE_PHP_Y_LA_BASE.md` — por qué no hay PHP y qué hace su trabajo

---

## Qué es

Un sistema web completo para la gestión administrativa del colegio: un portal
público de **tres páginas** (Inicio, Comunicados y Matrícula), dos accesos
separados y cinco paneles de trabajo (dirección, docente, administración,
estudiante y soporte técnico).

No necesita XAMPP, PHP ni servidor propio: es HTML y JavaScript puros.

### Funciona apenas lo abres

De fábrica el sistema trae **su propia base de datos dentro**, con el padrón
real de los 65 estudiantes, las 11 cuentas del personal, los 8 grados y los
cursos. Se guarda en el navegador: lo que registres sigue estando cuando
vuelvas. No hay nada que configurar y **no puede fallar por un esquema
desactualizado**.

Cuando quieras pasar a Supabase, cambia una línea en
`assets/js/nucleo/config.js`:

```js
const FUENTE_DATOS = 'supabase';   // estaba en 'local'
```

Y si Supabase no responde o le falta una columna, el sistema **no se rompe**:
sigue con la base local y lo avisa. Eso es posible porque toda la aplicación
habla con la base a través de repositorios: ninguna pantalla sabe con cuál de
las dos está hablando.

**Identidad visual:** amarillo institucional, blanco y negro. Nada más.
Superficies blancas, curvas amplias y movimiento suave, en la línea de iOS.

---

## Puesta en marcha en tres pasos

### 1. ¿Base local o Supabase?

**No hagas nada** si vas a usar la base local (así viene). Sube la carpeta y
listo: el sistema ya tiene los 65 estudiantes y las 10 cuentas.

**Si vas a usar Supabase**, primero pon `FUENTE_DATOS = 'supabase'` en
`assets/js/nucleo/config.js` y luego, en tu proyecto de Supabase →
**SQL Editor** → ejecuta, **en este orden**:

| Archivo | Qué hace |
|---|---|
| `sql/01_esquema.sql` | Crea las 24 tablas, los disparadores y las vistas. **Borra lo anterior.** |
| `sql/02_datos_base.sql` | Carga el personal, los grados, las áreas y los comunicados de apertura. |
| `sql/03_alumnos.sql` | Carga los **65 estudiantes reales** del padrón SIAGIE 2026. |

Y, fuera de ese orden, cuando haga falta:

| Archivo | Qué hace |
|---|---|
| `sql/00_ACTUALIZAR.sql` | **Repara la base sin borrar nada.** Ejecútalo si algo falla (ver abajo). |
| `sql/04_migracion.sql` | Lleva una base de la versión 1.0 a la 2.2 conservando los datos. |
| `sql/05_seguridad_rls.sql` | Activa las políticas de seguridad por fila. |

**¿Ya tienes datos en Supabase y quieres conservarlos?** Entonces no uses los
tres de arriba: ejecuta **solo `sql/04_migracion.sql`**, que añade lo nuevo sin
borrar nada. Es seguro ejecutarlo más de una vez. Después, `sql/03_alumnos.sql`
carga los 65 estudiantes sin tocar los que ya tengas.

### ⚠️ Si el sistema dice «no encuentra la columna … in the schema cache»

Ejecuta **`sql/00_ACTUALIZAR.sql`**. Es el archivo de reparación: agrega las
tablas y columnas que falten —sin borrar ni cambiar un solo dato tuyo— y, sobre
todo, le ordena a Supabase que **vuelva a leer el esquema**.

Ese mensaje aparece por una de dos razones, y este archivo arregla las dos:

- la columna de verdad no existe (la base quedó en la versión 1.0), o
- la columna sí existe pero **Supabase todavía no se enteró**: PostgREST guarda
  la lista de columnas en memoria y no la refresca solo. La última línea del
  archivo, `notify pgrst, 'reload schema';`, es la que se lo dice.

Mientras tanto el sistema **no se rompe**: si una columna opcional falta, guarda
el registro sin ella y deja un aviso en la consola con el archivo que hay que
ejecutar. El acceso nunca depende de una columna de estadística.

> **Un error de la versión 1.0, por si te afectó.** En los archivos antiguos,
> `supabase.sql` creaba un estudiante de ejemplo con el código `EST-2026-0001`,
> el mismo de la primera fila de `alumnos.sql`. Al chocar los códigos,
> PostgreSQL cancelaba el `insert` completo y **ninguno de los 65 alumnos se
> cargaba**. Si al abrir el padrón solo veías un estudiante, esa era la razón.
> Los archivos nuevos ya no tienen ese choque.

### 2. Subirlo a GitHub Pages

1. Sube toda la carpeta a un repositorio de GitHub.
2. *Settings → Pages → rama `main`, carpeta `/ (root)`.*
3. Tu sitio queda en `https://tuusuario.github.io/turepositorio/`

### 3. Entrar

- **Estudiantes** → solo su **DNI**. Sin contraseña.
- **Personal** → su usuario y, como contraseña, **su propio DNI**.

La lista completa de usuarios está en `docs/CREDENCIALES.md`.

---

## Los dos accesos están separados

Son **páginas distintas**, no dos pestañas de la misma pantalla:

```
acceso.html              ¿Quién eres? — solo pregunta y deriva
├── acceso-estudiante.html   🎒 un único campo: el DNI
└── acceso-personal.html     🧑‍🏫 usuario y contraseña
```

**🎒 Estudiante.** Escribe su DNI de 8 dígitos y entra. El sistema lo busca en
el padrón: si no está matriculado, no entra. No hay teclado en pantalla ni
contraseñas de alumnos que se puedan filtrar.

**🧑‍🏫 Personal.** Usuario y contraseña. Las cuentas las crea dirección desde su
panel; **no existe registro público**. La contraseña inicial es el DNI de cada
persona y se cambia desde el botón **🔑 Cambiar mi contraseña** del panel.

En las dos puertas: 5 intentos fallidos y el acceso se bloquea 5 minutos, con
cuenta regresiva a la vista. Todo intento queda registrado en la tabla
`intentos_acceso`, que soporte y dirección pueden revisar.

Los **padres y apoderados** no necesitan entrar: consultan comunicados,
requisitos, costos y vacantes en el portal público, y envían su solicitud de
vacante desde ahí.

---

## El portal son tres páginas

| Página | Qué tiene |
|---|---|
| **`index.html`** — Inicio | Portada, contadores, historia con la ficha de la institución, la rueda 3D de instalaciones, las aulas y el tríptico. |
| **`comunicados.html`** | Todos los comunicados con filtro por etiqueta, en vivo, y el calendario académico. |
| **`matricula.html`** | Vacantes por aula del día, el asistente virtual, requisitos y costos, y los dos trámites: solicitud de vacante y **entrevista con la directora**. |

En el orden en que aparece en Inicio:

1. **Portada** con el titular y las tres puertas de acceso.
2. **Contadores animados**: estudiantes matriculados (dato real de la base),
   26 años de servicio, 10 docentes calificados y 12 estudiantes por aula.
3. **Historia del colegio** con la **ficha de la institución** al costado:
   directora, dirección, distrito, teléfono, niveles, estudiantes
   matriculados hoy, número de aulas y años de servicio.
4. **Rueda 3D de los lugares de la I.E.**: las tarjetas se reparten alrededor
   de un cilindro y la rueda gira sobre su eje. Son los siete ambientes
   reales: patio principal, patio de juegos, aula de computación, primer piso,
   segundo piso, escalera grande y escalera pequeña. Se arrastra con el dedo,
   gira sola y se detiene cuando alguien la toca.

   > **Las fotos las pones tú.** Cada lugar muestra el nombre del archivo que
   > espera (`lugar_patio_juegos.jpg`, `lugar_escalera_grande.jpg`…). Copia la
   > foto en `assets/img/` con ese nombre y aparece sola, sin tocar código.
   > Tamaño recomendado: 1200 × 900 px, JPG de menos de 300 KB. El patio y el
   > aula de computación ya traen su foto, recortada del tríptico.
5. **Nuestras aulas**: dónde está cada salón, en una baraja que se desliza en
   3D. Muestra el aula, la docente a cargo y los cupos del día, tomados de la
   base de datos.
6. **El tríptico**, de dos maneras:
   - **Hojear** (lo que se ve al entrar): una cara grande a la vez, con el
     texto en tamaño cómodo y vuelta de hoja de verdad. Se pasa con las
     flechas, con el teclado, tocando la mitad derecha o deslizando el dedo.
   - **Ver desplegado**: el folleto entero plegado en 3D, que se abre, se
     cierra, se voltea al interior y se gira arrastrando.

   Las seis caras son HTML, no imágenes: el texto se puede seleccionar, buscar
   con Ctrl+F y ampliar sin que se pixele. El alto de la cara lo calcula el
   sistema a partir de la más larga, así que no se corta en ninguna pantalla.
   También hay un enlace al tríptico escaneado.
Y en las otras dos páginas:

- **Comunicados**: la lista completa con filtro por etiqueta, marca de "en
  vivo" y el calendario académico del año.
- **Matrícula**: las vacantes por aula del día, el **asistente virtual** en un
  marco de teléfono, los requisitos y costos, y los dos trámites —solicitud de
  vacante y **entrevista con la directora**— en pestañas.

El asistente flotante (la burbuja 💬) está en las tres páginas.

### Cómo están organizados los grados

| Aula | Nivel |
|---|---|
| Inicial 3 y 4 años | Inicial — **los dos grupos comparten ambiente** |
| Inicial 5 años | Inicial — ambiente propio |
| 1.er a 6.to grado | Primaria — un aula por grado |

Son 8 ambientes, 12 estudiantes por aula.

---

## Qué hace cada panel

| Panel | Para qué sirve |
|---|---|
| **Dirección** | Resumen institucional, indicadores medidos, rendimiento por grado, padrón, altas de cuentas del personal, comunicados, reportes oficiales y auditoría. |
| **Administración** | Matrícula rápida cronometrada, solicitudes de vacante, padrón completo (alta, edición, importación CSV), documentos, constancias, pagos y reportes. |
| **Docente** | Solo sus aulas: nómina, cuaderno de notas tipo hoja de cálculo, asistencia diaria, tareas y entregas, mensajería. |
| **Estudiante** | Sus notas con promedio y libreta en PDF, sus tareas, los comunicados de su grado y su ficha. Solo lectura. |
| **Soporte técnico** | Bandeja de tickets, cuentas y restablecimiento de contraseñas, intentos de acceso, auditoría, pulso del sistema y respaldos descargables. |

---

## El asistente, mejorado

Sigue funcionando con reglas (sin costo por consulta, sin servicios externos),
pero entiende bastante más:

- **19 intenciones** cubiertas: vacantes, requisitos, costos, horarios,
  ubicación, niveles, talleres, instalaciones, uniforme, tríptico, historia,
  quién es la directora, notas, tareas, comunicados, acceso, contraseñas,
  tickets y despedidas.
- **Normaliza el texto** (minúsculas, sin tildes, sin signos), descarta las
  palabras vacías y puntúa por palabras clave, sinónimos y frases completas.
- **Entiende el grado**: «¿hay vacantes para 1er grado?» responde solo por ese
  grado, no por los nueve.
- **Preguntas de seguimiento**: después de preguntar por costos, un «¿y de
  primaria?» se contesta bien, porque recuerda la última intención.
- **Consulta la base de datos** en vacantes, comunicados y notas: responde con
  las cifras del día, no con texto enlatado.
- **Si no entiende, no inventa**: ofrece los temas que sí conoce y abre un
  ticket de soporte con su código.
- Vive en **dos superficies** (la sección del portal y la burbuja flotante) que
  comparten la misma conversación.

Cada consulta queda en la tabla `consultas` con su intención y si se resolvió:
es el insumo del indicador 3 de la tesis.

---

## Estructura de archivos

```
index.html                  Portal público
acceso.html                 ¿Quién eres? (deriva a una de las dos puertas)
acceso-estudiante.html      Puerta del estudiante: solo DNI
acceso-personal.html        Puerta del personal: usuario y contraseña
app/
  direccion.html            Un archivo por rol; solo cargan los scripts
  administrativo.html
  docente.html
  estudiante.html
  soporte.html
assets/
  css/
    nucleo.css              Sistema de diseño: amarillo, blanco y negro
    portal.css              Portal, tríptico 3D y pantallas de acceso
    panel.css               Armazón de los paneles
  img/
    lugar_*.jpg             Fotos reales del colegio (recortes del tríptico)
    triptico_*.jpg          Las seis páginas escaneadas del folleto
  js/
    nucleo/                 La base que todo lo demás usa
      config.js             Credenciales, datos del colegio, historia y tríptico
      util.js               Fechas, validación, texto seguro, CSV
      seguridad.js          PBKDF2, bloqueo por intentos, sanitización
      datos.js              Capa de acceso a datos (repositorios)
      sesion.js             Las dos puertas de acceso y la guardia de rol
      ui.js                 Avisos, modales, formularios, tablas, gráficos
      pdf.js                Motor de reportes con QR y control de versiones
    modulos/                Lógica de negocio, reutilizable entre paneles
      estudiantes.js  academico.js   registros.js
      comunicacion.js personal.js    soporte.js
      reportes.js     chatbot.js
    paneles/                Cada panel compone los módulos que necesita
      base.js  direccion.js  administrativo.js
      docente.js  estudiante.js  soporte.js
    portal.js               Portal: contadores, historia, carrusel, tríptico 3D
    acceso-comun.js         Lo que comparten las dos puertas
    acceso-estudiante.js    Formulario del estudiante
    acceso-personal.js      Formulario del personal
sql/
  01_esquema.sql  02_datos_base.sql  03_alumnos.sql
  04_migracion.sql  05_seguridad_rls.sql
docs/
  CREDENCIALES.md  MANUAL_USUARIO.md
  MANUAL_TECNICO.md  MATRIZ_INDICADORES.md
```

La idea de la arquitectura es simple: **ningún panel habla con la base de datos
directamente**. Todos pasan por `datos.js`. Si mañana cambias Supabase por
MySQL con PHP, reescribes ese archivo y nada más.

---

## Datos institucionales

Todos están en un solo sitio: `assets/js/nucleo/config.js`.

| Dato | Valor | De dónde sale |
|---|---|---|
| Directora | Melva Margarita Rojas Peñaloza | — |
| Años de servicio | 26 | cifra que usa el contador |
| Docentes calificados | 10 | cifra institucional del portal |
| Estudiantes por aula | **12** | «Aula para 12 alumnos por ambiente» (tríptico) |
| Matrícula | S/ 300.00 | tríptico |
| Pensión Inicial | S/ 300.00 | tríptico |
| Pensión Primaria | S/ 330.00 | tríptico |
| Mensualidades | 10 al año | tríptico |
| Dirección | Calle Los Libertadores N.° 378 – Sunampe | tríptico |
| Teléfono | 956070856 | tríptico |

**Dos cosas que conviene que revises:**

1. **El aforo es 12, no 14.** Lo dice el tríptico impreso, así que puse 12 en
   el sistema y en el SQL. Con eso, **4.to grado aparece lleno** (tiene 13
   estudiantes matriculados). Si el aforo real es otro, cámbialo en
   `config.js` (`aforo_aula`) y en `grados.vacantes`.
2. **El contador dice 10 docentes, pero hay 8 cuentas creadas** (la directora
   ya no cuenta como docente). La cifra 10 es la institucional, la del
   tríptico; las cuentas reales las añade dirección desde su panel. Si
   prefieres que coincidan, cambia `IE.docentes` en `config.js`.

---

## Antes de entregar la tesis

Tres cosas, y las tres importan:

1. **Regenera la clave de Supabase.** *Settings → API → Reset anon key*, y pega
   la nueva en `assets/js/nucleo/config.js`. La actual circuló durante el
   desarrollo.
2. **Cierra las reglas RLS.** Ejecuta `sql/05_seguridad_rls.sql`. Ahora están
   abiertas para que todo funcione en pruebas; ese archivo las cierra tabla por
   tabla y explica qué protege cada una.
3. **Pide al personal que cambie su contraseña**, ya que la inicial es su DNI.

Y si algo no entra o no guarda, el primer paso es siempre **ejecutar
`sql/00_ACTUALIZAR.sql`**: casi todos los fallos de «no encuentra la columna»
son el caché de esquema de Supabase, y esa es la cura.

---

## Para el documento de tesis

`docs/MATRIZ_INDICADORES.md` tiene la matriz de variables lista (tipo, escala,
dimensiones, indicadores e ítems) y explica, indicador por indicador, cuáles
son las **cinco funcionalidades** que lo cumplen, **en qué archivo y en qué
función** está cada una, y **cómo se mide con datos reales**. El panel de dirección
incluye una vista *Indicadores* que calcula esos valores sola, y un reporte en
PDF con los resultados.

---

*«Todo por amor, nada por la fuerza.»*
