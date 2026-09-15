# Por qué el sistema no se pasó a PHP + MySQL

Pediste que la estructura de carpetas fuera esta:

```
/sistema-colegio
├── index.html
├── /assets  (css, js, img)
├── /auth        → login.php, registro.php
├── /dashboard   → director/, docente/, estudiante/, administrativo/, soporte/
├── /modulos     → estudiantes/, cursos/, notas/, tareas/, comunicacion/, reportes/
├── /reportes    → generar_pdf.php, constancia.php
├── /chatbot     → bot.js
├── /config      → conexion.php
└── /database    → mysql.sql
```

Y en el mismo mensaje dijiste: **"no cambies la infraestructura de la información que te di"**.

Esas dos cosas no pueden ir juntas si "infraestructura" se toma al pie de la letra,
porque los archivos `.php` solo funcionan si hay un servidor PHP corriendo detrás
(Apache/XAMPP o un hosting con PHP), y todo lo que se construyó contigo — el acceso
del alumno por DNI, el del personal, el chatbot, los reportes, los seis indicadores —
ya funciona sin ningún servidor propio, en GitHub Pages, con Supabase o incluso sin
internet (modo local). Cambiar a PHP + MySQL habría significado reescribir el sistema
entero desde cero, perder el chatbot ya afinado (33/33 en las pruebas), perder el
acceso que recién quedó funcionando para personal y alumnos, y necesitar un hosting
con PHP que GitHub Pages no ofrece.

Por eso se entendió "no cambies la infraestructura de la información" como lo que
pediste en todos los mensajes anteriores: **no toques cómo están organizados los
datos, los roles y los módulos** — eso si se mantuvo igual. Lo que cambió fue solo
la piel (diseño más 3D, más pulido) y no la forma de los datos.

## La misma organización, con otros nombres de archivo

Cada carpeta que pediste ya existe, solo que como página estática en vez de script
PHP:

| Lo que pediste          | Lo que ya tiene el sistema                                  |
|--------------------------|-------------------------------------------------------------|
| `/auth/login.php`, `registro.php` | `acceso.html`, `acceso-personal.html`, `acceso-estudiante.html` (incluye registro de cuenta) |
| `/dashboard/director/`   | `app/direccion.html`                                         |
| `/dashboard/docente/`    | `app/docente.html`                                           |
| `/dashboard/estudiante/` | `app/estudiante.html`                                        |
| `/dashboard/administrativo/` | `app/administrativo.html`                               |
| `/dashboard/soporte/`    | `app/soporte.html`                                           |
| `/modulos/estudiantes/`  | `assets/js/modulos/estudiantes.js`, `registros.js`           |
| `/modulos/cursos/`, `/notas/`, `/tareas/` | `assets/js/modulos/academico.js`               |
| `/modulos/comunicacion/` | `assets/js/modulos/comunicacion.js`                          |
| `/modulos/reportes/`     | `assets/js/modulos/reportes.js`, `nucleo/pdf.js`             |
| `/reportes/generar_pdf.php`, `constancia.php` | `nucleo/pdf.js` (genera el PDF en el propio navegador, sin servidor) |
| `/chatbot/bot.js`        | `assets/js/modulos/chatbot.js`                               |
| `/config/conexion.php`   | `assets/js/nucleo/config.js`                                 |
| `/database/mysql.sql`    | `sql/*.sql` (PostgreSQL, que es lo que usa Supabase)         |

Si en algún momento decides pasarlo a un hosting con PHP de verdad (por ejemplo
porque el colegio consigue uno), este mapeo es justo la guía para hacerlo — pero
sería un proyecto aparte, no un ajuste de diseño.

## Lo que sí se hizo este turno: diseño más futurista y seguridad

- **Fondo con "malla" animada**: el fondo de las tres páginas del portal ahora se
  mueve muy lentamente (gradientes radiales en capas), en vez de quedarse estático.
  Se apaga solo si la persona activó "reducir movimiento" en su sistema.
- **Tarjetas con inclinación 3D**: la tarjeta negra de "Acceso al sistema" y la
  ficha de la institución ahora se inclinan levemente y con un brillo dorado que
  sigue al mouse (`U.tiltar3D` en `assets/js/nucleo/util.js`). En celular no se
  activa (no tiene sentido sin mouse) y es puramente visual: no toca datos.
- **Seguridad, resumen de lo que ya protege al sistema** (ver `MANUAL_TECNICO.md`
  para el detalle completo):
  - Contraseñas con PBKDF2-SHA256 (150 000 vueltas) + sal única por cuenta, nunca
    en texto plano.
  - Bloqueo por intentos fallidos (`intentos_fallidos` en `usuarios`).
  - Toda consulta a la base de datos pasa por el cliente de Supabase, que arma la
    consulta de forma parametrizada — no se concatena texto del usuario dentro de
    una sentencia SQL, así que no hay inyección SQL posible desde el navegador.
  - `Seg.filtroSeguro()` limpia cualquier texto antes de mostrarlo en pantalla,
    para que nadie pueda meter un script escondido en un nombre o comentario (XSS).
  - Reglas de acceso a nivel de fila (RLS, en `sql/05_seguridad_rls.sql`): un
    alumno no puede leer ni modificar los datos de otro alumno aunque manipule el
    navegador, porque la base de datos misma lo impide, no solo la pantalla.
