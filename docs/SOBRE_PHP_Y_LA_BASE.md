# Sobre PHP, XAMPP y dónde viven los datos

Pediste esto, tal cual: *«agrega php también sin tener que abrir XAMPP»*.
Te respondo de frente, porque es una de esas cosas donde decirte «listo,
ya está» sería mentirte y lo descubrirías el día de la sustentación.

---

## La respuesta corta

**No se puede.** No es que no quiera, ni que falte tiempo: es que PHP, por
cómo funciona, necesita un programa corriendo en una computadora que
reciba las peticiones y responda. Ese programa es justamente lo que hace
XAMPP en tu máquina (te levanta Apache + MySQL). Si no hay nada corriendo,
no hay nada que ejecute el `.php`: el navegador se descarga el archivo o
te muestra el código como texto plano.

Y este sistema vive en **GitHub Pages**, que es un servidor de *archivos
estáticos*: entrega HTML, CSS, JS e imágenes, y nada más. Ahí un `.php`
no se ejecuta ni con XAMPP abierto ni sin él, porque el archivo está en
los servidores de GitHub, no en tu computadora.

> Dicho de otro modo: «PHP sin servidor» es como «llamada telefónica sin
> teléfono». No es una limitación del proyecto; es la definición de PHP.

---

## Lo que sí tienes, y que hace exactamente lo que querías de PHP

Cuando alguien pide PHP para un sistema escolar, en el fondo está pidiendo
**tres cosas**. Las tres están resueltas, sin XAMPP y sin abrir nada:

| Lo que PHP + MySQL te daría | Cómo lo hace este sistema hoy |
|---|---|
| Una **base de datos de verdad**, compartida por todos | **PostgreSQL**, el motor que está debajo de Supabase. Es una base más potente que MySQL, y ya está en la nube: la secretaria registra una matrícula y la directora la ve al instante desde su casa. |
| **Lógica del lado del servidor** que nadie pueda saltarse | **Políticas RLS** en `sql/05_seguridad_rls.sql`. Se ejecutan dentro del servidor de base de datos: aunque alguien abra la consola del navegador y cambie el JavaScript, el servidor le niega lo que no le toca. Con PHP esa comprobación también vive en el servidor; aquí vive un paso más adentro. |
| Que **no haya que instalar nada** para trabajar | El sistema se abre con un enlace, en cualquier computadora o celular. Sin XAMPP, sin Apache, sin «inicia el servidor antes de entrar». |

**Importante, y es una ventaja real frente a XAMPP:** un sistema en XAMPP
solo funciona mientras esa computadora está prendida, con el programa
abierto, y solo desde la red del colegio. Este funciona desde cualquier
lugar, todo el día, sin que nadie tenga que acordarse de encender nada.

---

## Y si de todas maneras necesitas PHP (por ejemplo, porque el jurado lo pide)

Entonces el camino honesto es **contratar un hosting con PHP** (los hay
desde unos S/ 8 al mes) y mover ahí el sistema. La buena noticia es que el
proyecto está preparado para eso y no habría que reescribirlo:

- **Toda la comunicación con la base pasa por un solo archivo:**
  `assets/js/nucleo/datos.js`. Los paneles no saben con qué base están
  hablando; le piden las cosas a `Datos.estudiantes.listar(...)` y ya.
- Para pasar a PHP + MySQL habría que escribir los `.php` que respondan a
  esas mismas operaciones y **cambiar un solo archivo** en el sistema:
  ese. Ni el HTML, ni el CSS, ni los módulos de pantalla se tocan.
- El esquema de las tablas ya está escrito en SQL (`sql/01_esquema.sql`).
  Pasarlo de PostgreSQL a MySQL es cuestión de cambiar unos tipos de dato,
  no de rediseñar nada.

Ese es el trabajo que quedaría, dicho sin adornos: **escribir el lado PHP
y reemplazar `datos.js`.** Es un trabajo acotado y con un plan claro, no
una reescritura.

---

## Dónde están tus datos ahora mismo

| Situación | Qué pasa |
|---|---|
| Ejecutaste los archivos de `sql/` en tu proyecto de Supabase | Todo se guarda en la nube y lo ve todo el mundo. Es el modo normal. |
| Todavía no los ejecutaste, o se cayó el internet | El sistema **sigue funcionando** contra el navegador, con el padrón real cargado, y pinta una **franja amarilla abajo** que dice «Trabajando sin conexión con la nube». Esa franja existe justamente para que nadie registre veinte matrículas creyendo que se guardaron para todos. |

Para dejarlo en el modo normal hay que ejecutar, en el editor SQL de
Supabase y en este orden:

1. `sql/00_ACTUALIZAR.sql`
2. `sql/02_datos_base.sql`
3. `sql/03_alumnos.sql`
4. `sql/05_seguridad_rls.sql`

Está explicado paso a paso en `docs/AUDITORIA_Y_LANZAMIENTO.md`.

---

## Una cosa más, y es urgente

En el mensaje donde me pediste PHP también me pegaste la **secret key** de
tu proyecto (`sb_secret_…`). **Esa clave hay que cambiarla.** No está
escrita en ningún archivo del sistema —lo verifiqué— pero ya viajó por un
chat, y con ella cualquiera puede leer y borrar toda la base saltándose el
login, porque es la llave de administrador.

**Cómo cambiarla:** Supabase → *Settings* → *API keys* → en la secret key,
*Revoke* / *Rotate*.

La que sí va en el código es la **publishable key** (`sb_publishable_…`),
y esa está bien donde está: está hecha para viajar dentro del navegador, y
lo que protege los datos no es su secreto, son las políticas RLS.
