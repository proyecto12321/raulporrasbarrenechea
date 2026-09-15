# Manual técnico

**Sistema de gestión escolar con chatbot — I.E.P. Raúl Porras Barrenechea**
Versión 2.3

---

## 1. Arquitectura

### 1.0 Dos fuentes de datos, un solo esquema

El sistema puede trabajar contra **Supabase** o contra una **base local en el
navegador**, y lo decide una línea (`FUENTE_DATOS` en `config.js`).

```
  paneles / portal
        │      (nunca tocan la base directamente)
        ▼
  Datos  ── repositorios (datos.js)
        ▼
       db  ── cliente
        ├── Supabase (PostgreSQL + Realtime + RLS)
        └── BaseLocal (localStorage + bus de eventos)   ← de fábrica
```

`BaseLocal` (`nucleo/local.js`) **imita la interfaz del cliente de Supabase**:
`from().select().eq().order().maybeSingle()` se escribe igual contra los dos.
Por eso los 40 y pico de puntos donde el sistema consulta la base no cambian
ni una letra al pasar de uno a otro. Los datos de arranque son los mismos del
SQL: `semilla.js` se **genera** desde `02_datos_base.sql` y `03_alumnos.sql`
con `generar_semilla.py`, así que no pueden desincronizarse.

En modo `'supabase'` el cliente va envuelto en `BaseLocal.conRespaldo()`, que
graba cada consulta como una lista de pasos, la reproduce contra Supabase y,
**solo si el fallo es de infraestructura** (esquema, tabla inexistente, red,
clave inválida), la reproduce contra la base local. Un error del negocio —un
DNI duplicado, un permiso denegado— se devuelve tal cual, porque ese sí tiene
que llegarle al usuario.

### 1.1 Modelo general

Cliente enriquecido (*thick client*) contra base de datos gestionada:

```
┌──────────────────────── NAVEGADOR ────────────────────────┐
│                                                           │
│  PRESENTACIÓN     index.html · acceso*.html · app/*.html  │
│                   nucleo.css · portal.css · panel.css     │
│                              ▲                            │
│  APLICACIÓN       paneles/*.js  →  modulos/*.js           │
│                              ▲                            │
│  NÚCLEO           ui · sesion · seguridad · util · pdf    │
│                              ▲                            │
│  ACCESO A DATOS   nucleo/datos.js   (único punto de       │
│                                      contacto con la BD)  │
└──────────────────────────────┼────────────────────────────┘
                               │  HTTPS · REST + WebSocket
┌──────────────────────────────▼────────────────────────────┐
│                    SUPABASE (PostgreSQL)                  │
│   24 tablas · 2 disparadores · 2 vistas · políticas RLS   │
│   Realtime (suscripciones) · Storage (archivos)           │
└───────────────────────────────────────────────────────────┘
```

### 1.2 Por qué esta arquitectura

| Decisión | Razón |
|---|---|
| Sin backend propio | GitHub Pages sirve archivos estáticos gratis; no hay servidor que mantener, actualizar ni pagar. |
| Supabase | PostgreSQL real con API REST automática, tiempo real y RLS del lado del servidor. |
| JavaScript sin framework | Sin compilación ni `node_modules`: se edita un archivo y se sube. Para una tesis, el código es auditable línea por línea. |
| Capa de datos aislada | Cambiar a MySQL + PHP implica reescribir un solo archivo (`datos.js`), no toda la aplicación. |

### 1.3 Correspondencia con MVC

No es MVC clásico —no hay servidor que enrute— pero la separación de
responsabilidades es la misma:

| Capa MVC | En este sistema |
|---|---|
| **Modelo** | `nucleo/datos.js` (repositorios) + esquema SQL con restricciones y disparadores |
| **Vista** | Los `.html`, las hojas de estilo y los componentes de `nucleo/ui.js` |
| **Controlador** | `paneles/*.js` y `modulos/*.js`: reciben el evento, validan, llaman al modelo y repintan la vista |

---

## 2. Estructura del código

### 2.1 Núcleo (`assets/js/nucleo/`)

| Archivo | Responsabilidad | Depende de |
|---|---|---|
| `config.js` | Credenciales, datos institucionales, catálogos, rutas | — |
| `util.js` | Fechas, números, validación, escape HTML, CSV, tema | — |
| `seguridad.js` | PBKDF2, verificación, control de intentos, sanitización | `util` |
| `datos.js` | Repositorios, traducción de errores, tiempo real | `config`, `seguridad` |
| `sesion.js` | Las dos puertas de acceso, guardia de rol, inactividad | `datos`, `seguridad` |
| `ui.js` | Avisos, modales, formularios, tablas, gráficos, armazón | `util` |
| `pdf.js` | Plantillas de documentos, QR, versiones | `datos`, `ui` |

Fuera del núcleo, el portal y los accesos tienen sus propios guiones:
`portal.js` (contadores, historia, carrusel de lugares, tríptico 3D),
`acceso-comun.js`, `acceso-estudiante.js` y `acceso-personal.js`.

El orden de carga en el HTML respeta esas dependencias.

### 2.2 Módulos (`assets/js/modulos/`)

Cada módulo expone funciones `vistaX(contenedor, sesion, opciones)` que pintan
una sección completa. Son reutilizables: la misma lista de estudiantes la usan
administración (con edición) y dirección o el docente (en solo lectura).

| Módulo | Vistas que ofrece |
|---|---|
| `estudiantes.js` | lista, formulario, ficha, constancia, importador CSV |
| `academico.js` | cuaderno de notas, asistencia, tareas, consolidado |
| `registros.js` | matrícula rápida, solicitudes, documentos, constancias, pagos |
| `comunicacion.js` | comunicados, mensajería, lectura para estudiantes |
| `personal.js` | cuentas del personal, alta, restablecimiento |
| `soporte.js` | tickets, salud, auditoría, intentos, respaldos |
| `reportes.js` | catálogo de reportes, medición de indicadores |
| `chatbot.js` | asistente por reglas, formulario de ticket |

### 2.3 Paneles (`assets/js/paneles/`)

`base.js` hace lo que los cinco paneles comparten: verificar sesión, armar el
armazón, registrar vistas, navegar por `#hash`, refrescar notificaciones y
forzar el cambio de contraseña.

Cada panel se reduce a declarar su menú y qué módulo carga cada vista:

```js
Panel.iniciar({
  roles: ['docente'],
  menu: MENU,
  inicial: 'resumen',
  definirVistas(s){
    Panel.registrar('notas', {
      titulo: 'Cuaderno de notas',
      cargar: cont => ModAcademico.vistaNotas(cont, { grados, docente: s.nombres }),
    });
  },
});
```

Las vistas son **perezosas**: el módulo se ejecuta la primera vez que se abre
la sección, no al cargar la página.

---

## 3. Modelo de datos

### 3.1 Tablas

| Grupo | Tablas |
|---|---|
| Personas | `usuarios`, `estudiantes` |
| Estructura | `grados`, `cursos` |
| Académico | `matriculas`, `notas`, `tareas`, `entregas`, `asistencia` |
| Administrativo | `documentos`, `constancias`, `pagos`, `solicitudes` |
| Comunicación | `comunicados`, `lecturas`, `mensajes`, `notificaciones` |
| Soporte | `tickets`, `consultas` |
| Trazabilidad | `auditoria`, `reportes`, `intentos_acceso` |
| Auxiliares | `imagenes`, `config_sistema` |

### 3.2 Relaciones principales

```
usuarios ─┬─< grados.docente_id
          └── (grados_asignados: lista de aulas del docente)

estudiantes ─┬─< matriculas
             ├─< notas
             ├─< entregas
             ├─< asistencia
             └─< pagos

tareas ─< entregas
```

### 3.3 Restricciones que protegen la integridad

| Restricción | Qué evita |
|---|---|
| `estudiantes.dni unique` + `check (dni ~ '^[0-9]{8}$')` | Dos fichas del mismo estudiante; DNI con letras o de largo incorrecto |
| `notas unique (estudiante_id, curso, bimestre)` | Dos notas del mismo curso y bimestre |
| `asistencia unique (estudiante_id, fecha)` | Doble marca de asistencia el mismo día |
| `entregas unique (tarea_id, estudiante_id)` | Entregas duplicadas |
| `matriculas unique (estudiante_id, anio)` | Matricular dos veces en el mismo año |
| `notas check (nota between 0 and 20)` | Notas fuera de la escala vigesimal |
| `on delete cascade` | Registros huérfanos al eliminar un estudiante |

### 3.4 Disparadores

- **`tg_literal_nota`** — calcula AD/A/B/C antes de insertar o actualizar una
  nota. El literal nunca se escribe a mano, ni desde la interfaz ni desde SQL.
- **`tg_toca_estudiante`** — actualiza `actualizado_en` en cada modificación.

### 3.5 Vistas

- **`v_ocupacion_aulas`** — capacidad, matriculados, vacantes y porcentaje por
  grado.
- **`v_promedios`** — promedio y número de calificaciones por estudiante.

---

## 4. Seguridad

### 4.1 Contraseñas

Formato guardado en `usuarios.clave`:

```
pbkdf2$150000$<sal en base64>$<derivado en base64>
```

- **Algoritmo:** PBKDF2-HMAC-SHA256 (Web Crypto nativo, sin librerías).
- **Iteraciones:** 150 000.
- **Sal:** 16 bytes aleatorios, distinta por cuenta.
- **Derivado:** 256 bits.
- **Comparación:** en tiempo constante, para no filtrar información por la
  duración de la respuesta.

**Migración transparente:** si la contraseña está en el formato antiguo
(SHA-256 hexadecimal de la versión 1.0), el sistema la valida, la vuelve a
guardar como PBKDF2 y marca `algoritmo = 'pbkdf2'`. El usuario no nota nada y
no hay que migrar la base de datos a mano.

**Contraseña inicial = DNI.** Desde la versión 2.1, la contraseña con la que
nace cada cuenta del personal es su propio DNI. Es una decisión de usabilidad
pedida por la institución, y se sostiene porque:

- el DNI **no se guarda como contraseña**: lo que queda en `usuarios.clave` es
  el derivado PBKDF2, que no se puede revertir;
- el usuario puede cambiarla desde su panel (botón *🔑 Cambiar mi contraseña*),
  con exigencia de 8 caracteres y mezcla de mayúsculas, minúsculas y dígitos;
- el bloqueo por intentos limita la fuerza bruta a 5 pruebas cada 5 minutos;
- dirección puede ver en su panel quién no ha ingresado nunca, para insistir.

El riesgo residual —que el DNI es un dato semipúblico— está asumido y anotado:
para un entorno más exigente, la vía es Supabase Auth con JWT (sección 8).

### 4.2 Las dos puertas de acceso

Cada puerta vive en **su propia página**, no en dos pestañas de la misma
pantalla: `acceso-estudiante.html` y `acceso-personal.html`, con
`acceso.html` como simple selector. El código también está separado
(`acceso-estudiante.js` y `acceso-personal.js`), y solo comparten
`acceso-comun.js` (aviso de contexto y cuenta regresiva del bloqueo).

| | Estudiante | Personal |
|---|---|---|
| Página | `acceso-estudiante.html` | `acceso-personal.html` |
| Credencial | DNI (8 dígitos) | Usuario + contraseña (inicial: su DNI) |
| Se valida contra | `estudiantes` con `estado = 'Matriculado'` | `usuarios` con `activo = 1` |
| Contraseña almacenada | ninguna | PBKDF2 |
| Intentos antes del bloqueo | 5 | 5 |
| Bloqueo | 5 minutos | 5 minutos |
| Registro del intento | `intentos_acceso` | `intentos_acceso` |

**Por qué el estudiante entra solo con DNI.** Es una decisión deliberada, con
su justificación y su límite:

- Son niños de 3 a 12 años; una contraseña más sería una barrera real de uso.
- El DNI no abre nada por sí solo: tiene que estar en el padrón **y** con
  estado *Matriculado*.
- El panel del estudiante es de **solo lectura**: ve sus notas, sus tareas y
  su ficha, y no puede modificar ningún dato.
- Se compensa con bloqueo por intentos y registro de cada acceso.

Si en el futuro se quisiera un segundo factor, la vía natural es pedir la
fecha de nacimiento junto al DNI: `Sesion.entrarEstudiante()` es el único
punto que habría que tocar.

### 4.3 Prevención de inyección

- **SQL:** la librería de Supabase construye consultas parametrizadas; no se
  concatena SQL en ningún punto del código. Además, `Seg.filtroSeguro()`
  limpia el texto antes de usarlo en operadores `ilike` y `or`.
- **XSS:** todo dato que se pinta en el HTML pasa por `U.esc()`, que escapa
  `& < > " '`. Antes de guardar, `U.limpiar()` elimina caracteres de control y
  recorta al largo permitido.
- **Tipos:** `U.soloDigitos()` y `U.limpiarNombre()` normalizan DNI, celulares
  y nombres en el cliente, y las restricciones `check` los verifican otra vez
  en el servidor.

### 4.4 Control de acceso por rol

Tres capas, de la más débil a la más fuerte:

1. **Interfaz** — cada panel muestra solo su menú; el docente solo ve sus
   aulas.
2. **Guardia de sesión** — `Sesion.exigir(['docente'])` al inicio de cada
   panel: si el rol no coincide, redirige. Impide entrar escribiendo la URL.
3. **RLS en el servidor** — `sql/05_seguridad_rls.sql`. Es la única capa que
   un usuario no puede saltar desde el navegador.

**Limitación honesta:** la sesión se resuelve en el navegador
(`sessionStorage`), no con Supabase Auth. Por eso las políticas RLS pueden
distinguir *público* de *no público*, pero no *este docente* de *aquel
docente*. Para eso haría falta migrar a Supabase Auth y emitir JWT por
usuario; está descrito en la sección 8.

### 4.5 Sesión

- Se guarda en `sessionStorage` (se borra al cerrar la pestaña).
- Caduca a los **45 minutos sin actividad**; cualquier clic, tecla o scroll la
  renueva.
- Al cerrarse sola muestra un aviso antes de redirigir.

### 4.6 Auditoría

`Datos.auditar(accion, modulo, { ms, detalle })` se llama en cada operación
relevante. Guarda usuario, rol, acción, módulo, detalle y duración.

Las políticas RLS de producción dan a `auditoria` e `intentos_acceso` solo
`insert` y `select`: **no se pueden editar ni borrar** desde el navegador. Una
bitácora modificable no sirve como evidencia.

---

## 5. Emisión de documentos

`nucleo/pdf.js` genera HTML con membrete institucional, lo abre en una ventana
nueva y dispara el diálogo de impresión, donde el usuario elige *Guardar como
PDF*. No se usa ninguna librería de PDF: se aprovecha el motor de impresión
del navegador, que produce un A4 correcto y pesa cero kilobytes.

**Plantillas disponibles**

| Función | Documento |
|---|---|
| `Reporte.listado()` | Cualquier listado tabular con filtros y resumen |
| `Reporte.constancia()` | Constancia de matrícula, estudios, vacante o conducta |
| `Reporte.libreta()` | Informe de progreso por estudiante |
| `Reporte.fichaMatricula()` | Ficha única de matrícula |

**Control de calidad antes de emitir**

1. `Reporte.validar(filas, obligatorios)` revisa fila por fila.
2. Si algo falta, se muestra qué fila y qué campo, y **no se emite**.
3. Si todo está bien, `Datos.reportes.registrar()` calcula la versión
   (consulta la anterior y suma 1) y un código de verificación derivado del
   nombre, el número de filas, la versión y la fecha.
4. El código se imprime en el pie y se convierte en QR con `qrcodejs`, cargado
   desde cdnjs dentro de la ventana de impresión.

---

## 6. Chatbot

Motor por reglas, sin servicios externos ni costo por consulta.

```
texto del usuario
   → normalización (minúsculas, sin tildes)
   → puntuación por coincidencia de palabras clave
      (las claves de varias palabras pesan más)
   → intención ganadora
   → respuesta: texto fijo o consulta real a la base de datos
   → registro en 'consultas' (intención + si se resolvió)
```

**Diecinueve intenciones** cubiertas: saludo, vacantes, requisitos, costos,
horarios, ubicación, niveles, talleres, instalaciones, uniforme, tríptico,
historia (incluida «quién es la directora»), notas, tareas, comunicados,
acceso, contraseñas, tickets, agradecimiento y despedida.

Mejoras del motor respecto a la versión 2.0:

- **Normalización**: minúsculas, sin tildes y sin signos de puntuación.
- **Palabras vacías**: se descartan artículos, preposiciones y muletillas
  («por favor», «quiero saber») antes de puntuar.
- **Coincidencia por raíz**: «vacantes», «vacante» y «vacanted» puntúan igual.
- **Frases completas**: una clave de tres palabras pesa más que tres sueltas.
- **Peso por intención**: las muy específicas (ticket, clave) dominan a las
  genéricas cuando ambas coinciden.
- **Umbral de confianza**: si el mejor puntaje no llega a 0,8 el asistente dice
  que no entendió, en vez de responder cualquier cosa.
- **Detección de grado**: «1er grado», «primero», «3 años» se mapean al grado
  real, y la respuesta de vacantes se limita a ese grado.
- **Memoria de una intención**: un mensaje corto que no se entiende reutiliza
  la intención anterior, así funcionan los seguimientos («¿y de primaria?»).

Tres intenciones —vacantes, comunicados y notas— **consultan la base de datos**,
así que el asistente responde con cifras del día, no con texto enlatado.

El chat vive en **dos superficies** que comparten el mismo array
`conversacion`: la sección del portal (empotrada en un marco de teléfono) y la
burbuja flotante. Se dibujan las dos a la vez, así que el visitante no pierde
el hilo al pasar de una a otra.

Cuando no hay coincidencia, ofrece abrir un ticket de soporte, que se crea con
su código y llega al panel de soporte técnico.

La tabla `consultas` permite medir después qué preguntan más las familias: es
el insumo del indicador 3.

---

## 6 bis. El tríptico: dos lectores, un solo contenido

No es una imagen del folleto: son **seis caras de HTML** dibujadas con CSS a
partir de la constante `TRIPTICO` de `config.js`, cuyo texto está transcrito
del impreso. Así el folleto se lee nítido en cualquier pantalla, se puede
copiar, lo indexan los buscadores y es accesible para un lector de pantalla.

Las mismas seis caras se pintan con **una sola función**, `caraHTML(cara)`, y se
montan de dos maneras (`portal.js` → `montarLector`, `montarDesplegado`). Todo
el estilo del contenido está en `em`, así que el mismo marcado se ve diminuto
dentro del folleto desplegado y cómodo de leer en el lector, sin duplicar ni
una regla.

### 6 bis.1 Modo hojear (`.lector`)

Una cara grande a la vez, con vuelta de hoja:

```
.lector-escena           perspective: 2100px
  .hoja                  transform-origin: left center  (gira sobre el lomo)
    .hoja-cara.frente    el contenido impreso
    .hoja-cara.dorso     el reverso del papel
```

- De las seis hojas solo se muestran tres: la que se está leyendo, la que
  acaba de pasarse (mientras gira) y la siguiente, ligeramente desplazada para
  que se vea el canto de la pila. Si estuvieran las seis, sus seis sombras se
  sumarían en un halo gris alrededor del folleto.
- La hoja que se pasa gira a `rotateY(-172deg)` y se desvanece cuando ya está
  de canto. Se probó dejarla caída a la izquierda mostrando su dorso, pero el
  navegador la compone como una lámina en blanco que estorba a la que se está
  leyendo; el gesto se ve igual y la pantalla queda limpia.
- **El alto lo calcula el sistema**, no el CSS. `ajustarAlto()` mide el
  `scrollHeight` de cada cara —que informa el alto real del contenido aunque
  esté recortado—, toma el mayor y se lo da al escenario. Sin eso, en algún
  ancho de pantalla la cara más cargada se cortaba a media línea. Se recalcula
  al cambiar el tamaño de la ventana y cuando terminan de cargar las
  tipografías.
- Se pasa con las flechas, con el teclado (solo cuando la sección está a la
  vista y el foco no está en un campo), tocando la mitad derecha o izquierda de
  la hoja, o deslizando el dedo.

### 6 bis.2 Modo desplegado (`.triptico`)

Cómo está armado:

```
.triptico-escena         perspective: 1800px
  .triptico              transform-style: preserve-3d  (gira y se voltea)
    .lado.ext            las tres caras exteriores, en fila
    .lado.int            las tres interiores, rotateY(180deg) y en orden inverso
      .triptico-cara     cada panel
```

- Los pliegues son reales: el primer panel tiene `transform-origin: right
  center` y el último `left center`, así que al cerrarse giran sobre su lomo
  (`rotateY(±87deg)`), no se desplazan.
- **La cara interior va en espejo** (`flex-direction: row-reverse`), de modo
  que su primer y su último panel ocupan las posiciones contrarias. Sin
  invertirles también el `transform-origin`, cada ala se doblaba por su borde
  libre y asomaba como una astilla al costado del folleto.
- Con el folleto cerrado, las alas de una cara quedan pegadas a las de la otra
  y se pelean por el mismo pixel. El papel es opaco: se oculta el lado que no
  mira al lector (`.triptico.cerrado .lado.int{opacity:0}`).
- Abierto, las alas conservan `rotateY(±7deg)`: el papel nunca queda
  perfectamente plano, y ese detalle es lo que hace que parezca papel.
- El volteo al interior es un `rotateY(180deg)` del contenedor; las caras
  llevan `backface-visibility: hidden` para que no se transparente el reverso.
- El arrastre suma su propio ángulo (`rotateY`), limitado a ±70° para que no se
  pierda de vista, y se combina con un `rotateX(4deg)` fijo que da profundidad.
- En pantallas estrechas el ancho del panel baja por variable CSS
  (`--panel`), así que el folleto entero se reescala sin tocar el JavaScript.

El enlace *«el tríptico escaneado»* abre un modal con las seis páginas
originales, para quien quiera ver el impreso tal cual.

---

## 7. Despliegue y mantenimiento

### 7.1 Puesta en marcha

1. Crear proyecto en Supabase.
2. SQL Editor: `01_esquema.sql` → `02_datos_base.sql` → `03_alumnos.sql`.
   (O bien solo `04_migracion.sql` si ya hay datos que conservar.)
3. Copiar URL y clave anon a `assets/js/nucleo/config.js`.
4. Subir la carpeta a GitHub y activar Pages sobre `main` / `root`.

### 7.2 Lista de verificación antes de entregar

- [ ] Regenerar la clave anon en Supabase y actualizarla en `config.js`.
- [ ] Ejecutar `sql/05_seguridad_rls.sql`.
- [ ] Comprobar que el portal y los cinco paneles siguen funcionando.
- [ ] Pedir al personal que cambie su contraseña (la inicial es su DNI).
- [ ] Reemplazar los DNI de relleno (`40000001`–`40000007`) por los reales.
- [ ] Descargar un respaldo completo desde el panel de soporte.

### 7.3 Mantenimiento periódico

| Tarea | Frecuencia | Dónde |
|---|---|---|
| Respaldo completo | Mensual | Soporte → Respaldos |
| Revisión de intentos fallidos | Semanal | Soporte → Intentos de acceso |
| Revisión de tickets abiertos | Diaria | Soporte → Tickets |
| Depurar auditoría antigua | Anual | SQL: `delete from auditoria where creado_en < now() - interval '2 years'` |
| Cierre de año escolar | Anual | Cambiar `anio_escolar` en `config_sistema` y `IE.anio` en `config.js` |

### 7.3 bis. Tolerancia al esquema

La capa de datos no da por hecho que la base esté al día. Toda escritura pasa
por `escribir()` (`nucleo/datos.js`), que:

1. envía el registro;
2. si Supabase responde **PGRST204**, saca del error el nombre de la columna
   que falta, la apunta en un conjunto y **reintenta sin ella**;
3. deja un aviso en la consola —una sola vez por columna— diciendo qué archivo
   SQL hay que ejecutar.

Eso evita el fallo que más molesta: que un campo de estadística (por ejemplo
`intentos_fallidos`) impida **iniciar sesión** en una base que todavía no se
migró. Los datos esenciales se guardan; lo opcional espera a que se corra
`00_ACTUALIZAR.sql`.

---

### 7.4 Errores frecuentes

| Síntoma | Causa probable | Solución |
|---|---|---|
| "Las credenciales del sistema no son válidas" | Clave anon caducada o mal pegada | Copiar de nuevo desde Settings → API |
| "Tu rol no tiene permiso para esta operación" | RLS cerrada sin la política necesaria | Revisar `05_seguridad_rls.sql` para esa tabla |
| Los reportes no se abren | Ventanas emergentes bloqueadas | Permitirlas para el dominio |
| "Este navegador no soporta Web Crypto" | Sitio servido por HTTP | Web Crypto exige HTTPS (GitHub Pages ya lo da) |
| El docente no ve aulas | `grados_asignados` vacío | Dirección → Personal → Editar → Aulas a cargo |
| Un grado aparece siempre lleno | Tiene más alumnos que el aforo de 12 | Ajusta `grados.vacantes` o `IE.aforo_aula` |
| Duplicados al migrar notas | Datos antiguos repetidos | `04_migracion.sql` los depura antes de crear la restricción |
| **"Could not find the 'X' column of 'Y' in the schema cache"** | La columna no existe **o** PostgREST tiene el esquema viejo en memoria | Ejecutar `sql/00_ACTUALIZAR.sql`: agrega lo que falte y termina con `notify pgrst, 'reload schema';` |
| El padrón muestra un solo estudiante | El alumno de ejemplo de la v1.0 ocupaba el código `EST-2026-0001` y cancelaba el `insert` entero | `03_alumnos.sql` ahora inserta con `where not exists` comparando código **y** DNI: se salta el que choca y carga los demás |

---

## 8. Trabajo futuro

Ordenado por impacto:

1. **Supabase Auth con JWT.** Permitiría políticas RLS por usuario: que un
   docente solo pueda leer y escribir notas de sus propias aulas, verificado
   en el servidor. Es la mejora más importante pendiente.
2. **Subida real de archivos** en las entregas de tareas, usando el bucket
   `tareas` que ya queda creado.
3. **Notificaciones push y correo** para comunicados urgentes.
4. **Aplicación instalable (PWA)** con service worker y consulta sin conexión.
5. **Chatbot con modelo de lenguaje** para las preguntas fuera del guion,
   manteniendo las reglas actuales para lo frecuente (más rápido y sin costo).
6. **Integración con SIAGIE** para sincronizar el padrón sin exportar a CSV.

---

## 9. Detalles de implementación

### 9.1 Tiempo real

```js
Datos.comunicados.escuchar(carga => {
  if (carga.eventType === 'INSERT') UI.aviso('Nuevo comunicado');
  recargarLista();
});
```

Se usa en comunicados (portal y paneles), mensajería, notificaciones y
tickets. El canal se cierra con `.cerrar()`.

### 9.2 Medición de tiempos

Todas las operaciones relevantes se cronometran con `performance.now()` y el
resultado se guarda: `estudiantes.segundos`, `reportes.ms`, `auditoria.ms`,
`matriculas.ms`. De ahí salen los indicadores 2 y 5, sin que nadie tenga que
anotar nada a mano.

### 9.3 Rendimiento

- Las vistas se cargan solo al abrirlas.
- Las listas se paginan en memoria (12 filas por página).
- El buscador usa retardo de 240 ms para no consultar en cada tecla.
- Las importaciones se hacen en bloques de 50 registros.
- Los gráficos son HTML y SVG generados a mano: cero librerías.

### 9.4 Accesibilidad y compatibilidad

- Contraste suficiente en ambos temas; foco visible en todos los controles.
- `prefers-reduced-motion` desactiva las animaciones.
- Etiquetas `aria-label` en los botones de solo icono.
- El cuaderno de notas se recorre con el teclado como una hoja de cálculo.
- Diseño adaptable desde 360 px.
- Requiere un navegador con Web Crypto y `backdrop-filter`: Chrome 76+,
  Firefox 103+, Safari 15.4+, Edge 79+.

---

*Documento técnico del sistema · versión 2.0*
