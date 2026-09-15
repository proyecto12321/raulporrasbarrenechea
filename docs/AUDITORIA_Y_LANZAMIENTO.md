# Auditoría, reorganización y estado de lanzamiento · v3.0

Este documento responde, punto por punto, al pedido de revisión final.
Está escrito para leerse antes de entregar: dice qué se encontró, qué se
cambió, qué quedó verificado y —sin adornos— qué no se pudo terminar y
por qué.

---

## Fase 1 · Qué se encontró

El sistema ya existía y funcionaba; el problema no era de funciones, era
de **orden**. La auditoría encontró:

1. **Once entradas de menú en Dirección**, muchas de ellas hermanas
   (Comunicados / Mensajería / Directorio por separado; Estudiantes y
   Personal sueltos; Auditoría aparte). Daba la sensación de módulos
   repetidos aunque cada uno hiciera algo distinto.
2. **Un módulo llamado "Indicadores"** en el menú. Los indicadores son
   un requisito de la tesis, no una sección del colegio.
3. **Matrícula y Comunicados separados**, igual que Directorio y
   Mensajería, cuando pertenecen juntos.
4. **Reportes mezclado** con la comunicación en el panel administrativo.
5. **Un botón "🗑 Eliminar" en comunicados**: borrado real, irreversible.
6. **Mensajería sin reglas**: cualquiera podía elegir cualquier
   destinatario del desplegable.
7. **Carrusel sin avance automático** (se le había quitado) y con las
   tarjetas laterales giradas ~51°, que es lo que se veía deformado.
8. **Constancias sin flujo propio**: se emitían desde la ficha del
   estudiante, sin buscador con sugerencias ni vista previa.
9. **Dos scripts faltantes** en dos paneles (`ModPersonal` en
   Administración, `ModAcademico` en Estudiante), que rompían dos
   pantallas nuevas.

---

## Fase 2 · La navegación quedó así

| Rol | Módulos |
|---|---|
| **Dirección** | Inicio · Matrícula y comunicados · Comunidad y mensajería · Dirección · Reportes · Soporte |
| **Administración** | Inicio · Matrícula y comunicados · Comunidad y mensajería · Reportes · Soporte |
| **Docente** | Inicio · Mi aula · Comunicados · Comunidad y mensajería · Reportes · Soporte |
| **Estudiante** | Mi inicio · Mi aula · Comunicados · Mensajes · Ayuda |
| **Soporte** | Inicio · Atención · Seguridad · Configuración · Ayuda |

Dentro de cada módulo hay **pestañas**, no un cajón revuelto. Por
ejemplo, "Matrícula y comunicados" de Administración tiene: Matrícula
rápida · Solicitudes · Estudiantes · Documentos · Pagos · Comunicados.

**Ninguna función se duplicó ni se reescribió**: cada pestaña monta la
misma vista que ya existía. Lo único nuevo es `Panel.secciones()`, en
`assets/js/paneles/base.js`, que arma las pestañas, carga cada sección
solo cuando se abre y recuerda cuál estaba abierta en la dirección
(`#modulo:seccion`).

**"Indicadores" ya no es un módulo.** La medición vive dentro de
Reportes, como una pestaña más (Dirección → Reportes → "Medición de
gestión").

Dos decisiones que conviene que sepas, porque se apartan de la lista
literal que diste:

- **Docente y Estudiante tienen un módulo "Mi aula"** (notas, tareas,
  asistencia, ficha). No cabía meter las notas dentro de "Matrícula y
  comunicados" sin desordenar justo lo que veníamos a ordenar.
- **Administración no tiene módulo "Dirección"**, porque no gobierna la
  institución. El formulario de evaluación docente, que sí puede
  administrar, está en su módulo Reportes → "Formularios".

---

## Fase 3 · Lo funcional que se corrigió o se completó

### Reportes: constancias con flujo real
Dirección y Administración → **Reportes → Constancias**. El flujo es el
que pediste: se elige el documento (matrícula, estudios o vacante), se
escribe el nombre/código/DNI y **aparecen sugerencias mientras se
escribe** (con teclado: ↑ ↓ Enter), se elige al estudiante, el sistema
carga su ficha real, **valida** (DNI de 8 dígitos, grado válido,
condición coherente con el documento) y muestra una **vista previa**
antes de generar. El botón se bloquea mientras genera: dos clics no
emiten dos constancias.

Si falta un dato, no se emite: se dice exactamente qué falta y dónde
corregirlo.

### Mensajería con permisos de verdad
Las reglas están en un solo lugar (`CONTACTOS` en
`assets/js/modulos/comunicacion.js`) y las usan tanto el directorio
(para decidir a quién listar) como el envío (para comprobar antes de
guardar):

- Dirección y Administración hablan con todos.
- Docentes: con dirección, administración, soporte y **los estudiantes
  de sus propias aulas**.
- Estudiantes: con dirección, administración y **las docentes de su
  propio grado**. No con otros estudiantes.

Comprobado: el desplegable de un estudiante ofrece tres destinos; el de
Administración, cinco. Además hay **bandejas** (Todos / Recibidos /
Enviados / Sin leer, con contador) y se pueden **adjuntar archivos**.

### Comunicados: nada se borra
El botón "Eliminar" se cambió por **Archivar** (y "Restaurar"). Se
agregaron **borradores**: un comunicado guardado como borrador no se ve
en el portal ni en los paneles hasta que alguien lo publica. Probado de
punta a punta: borrador → invisible en el portal → publicar → visible →
archivar → desaparece → restaurar → vuelve.

También se agregó adjunto (imagen o PDF) y un filtro por estado.

### DNI protegido
`ModDireccion.dni()` enmascara el documento (`81••••69`) para quien no
tiene permiso de verlo completo. Lo ven entero Dirección,
Administración y Soporte; docentes y estudiantes, enmascarado.

### Dirección: datos clasificados
Nueva sección **Dirección → Datos clasificados**: estudiantes agrupados
por **nivel → grado → sección** (acordeones, con el cupo de cada aula),
y además docentes, personal administrativo y un resumen de registros
académicos. Buscador por nombre, código o DNI, con filtros de nivel,
grado y estado.

### Carrusel y instalaciones
Dejó de ser una rueda completa: ahora hay **tres láminas en escena**
—la del frente y sus dos vecinas, giradas apenas 18°—, así que la foto
conserva su proporción y el 3D se nota como profundidad, no como
deformación. **Avanza solo cada 7 segundos**, el reloj se reinicia al
tocar cualquier control, se detiene con el mouse encima, fuera de
pantalla o en segundo plano, y respeta "reducir movimiento".

Soporte puede subir la **foto**, y ahora también editar el **nombre** y
la **descripción** de cada lugar (Soporte → Configuración).

### Bugs encontrados al probar (y corregidos)
- `ModPersonal is not defined` al abrir Evaluación docente en
  Administración: faltaba el script en `app/administrativo.html`.
- `ModAcademico` faltaba en `app/estudiante.html`: el adjunto de tareas
  habría fallado.
- Notificaciones dirigidas a una persona no llegaban a su campana
  (`notificaciones.mias` solo miraba el rol).
- `Datos.config.fijar()` actualizaba por `id`, pero esa tabla usa
  `clave`: contra Supabase real habría fallado.
- Envío de mensajes: ahora no se pierde el texto si falla el guardado y
  el botón se bloquea para impedir el doble envío.

---

## Fase 4 · Diseño

Blanco y **dorado satinado** (#D4AF37), grises cálidos, sin azules ni
morados. Tema claro y tema oscuro (negro cálido, no absoluto), el cambio
se guarda por persona. Sidebar con módulos agrupados, pestañas internas
con el activo en dorado, tarjetas de bordes suaves y sombras tenues.
Detalle en `docs/APARIENCIA.md`.

---

## Fase 5 · Seguridad

- Contraseñas con **PBKDF2-SHA256** (150 000 vueltas) y sal por cuenta;
  nunca en texto plano, nunca visibles en el frontend.
- **Bloqueo por intentos fallidos** e historial de accesos.
- Consultas **parametrizadas** por el cliente de Supabase: no se
  concatena texto del usuario dentro de SQL.
- **XSS**: todo dato que llega a pantalla pasa por `U.esc()`.
- **RLS** (`sql/05_seguridad_rls.sql`): reglas de fila en la base, no
  solo botones ocultos. Usuarios no admite insert ni delete desde el
  navegador; los registros escolares no admiten borrado.
- **Archivado en vez de borrado** en comunicados; los registros
  escolares se anulan cambiando su estado.
- Adjuntos: tipo y tamaño validados (3 MB imágenes, 6 MB tareas), y se
  rechaza lo que no sea imagen, PDF, RAR o MP4.

### Lo que hay que saber, dicho sin maquillaje
La sesión se resuelve **en el navegador**, no con Supabase Auth. Eso
significa que las políticas RLS distinguen *qué tabla* se puede tocar,
pero **no pueden distinguir a un docente de otro**. Para permisos por
persona verificados en el servidor haría falta migrar a Supabase Auth
con JWT: está descrito como trabajo futuro en `MANUAL_TECNICO.md` y no
es algo que se pueda simular sin mentir. Mientras tanto, los permisos
por rol se aplican en la interfaz **y** se vuelven a comprobar antes de
cada escritura (por ejemplo, en el envío de mensajes y en la emisión de
constancias).

---

## Fase 6 · Qué se probó (Playwright, sesión real de cada rol)

- Los cinco paneles, módulo por módulo y pestaña por pestaña:
  **0 errores de JavaScript**.
- Constancia: sugerencias → selección → validación → vista previa →
  PDF generado con el texto de tus plantillas Word.
- Mensajería: destinos correctos por rol (estudiante 3, administración 5).
- Comunicados: borrador invisible en el portal → publicado → archivado →
  restaurado.
- Carrusel: avanza solo a los 7 s, responde a la flecha, sin barra
  horizontal.
- Portal en tema claro y oscuro, y Soporte subiendo insignia y foto.

---

## Lo que NO está terminado (y por qué)

Con todas las letras, para que no haya sorpresas:

1. **Programar comunicados para una fecha futura.** La columna y el
   estado existen (`estado`, `archivado_en`), pero publicar solo a una
   hora determinada necesita algo que corra en el servidor cuando nadie
   tiene la página abierta. En GitHub Pages no hay dónde ejecutarlo.
   Queda preparado: con un *cron job* de Supabase (pg_cron) sería un
   `update comunicados set estado='Publicado' where publicar_en <= now()`.
2. **Validación de pertenencia institucional contra una fuente externa**
   (RENIEC/SIAGIE). El sistema valida formato y dígito del DNI y que la
   persona exista en el padrón, pero **no hay conexión con RENIEC**, y
   no la voy a simular. El punto de enganche está aislado en
   `U.dniPlausible()`.
3. **Vista previa de PDF/Office dentro del sistema.** Los adjuntos se
   descargan; para previsualizar un PDF embebido hace falta un visor y
   almacenamiento aparte.
4. **Permisos por persona verificados en el servidor**: ver el apartado
   de seguridad, arriba.
5. **Centro de notificaciones con "marcar como leídas" y filtros.** Hoy
   existe la campana con la lista y el contador de mensajes sin leer;
   el centro completo con filtros por tipo queda pendiente.
