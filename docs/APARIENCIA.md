# Diseño blanco y dorado · v2.7

## El cambio de color

El sistema tenía amarillo canario (#FFC800) sobre bloques negros. Ahora es
lo que pediste: **blanco con dorado satinado (#D4AF37)**, y nada más.

- Los grises pasaron a ser **cálidos** (tiran a marrón, no a azul), que es
  lo que hace que acompañen al dorado en vez de pelearse con él.
- Los bloques negros grandes —la tarjeta de "Acceso al sistema", la tira de
  contadores, la cabecera del chat, las pestañas activas, el menú activo—
  ahora son **blancos con filo dorado** o **dorado con letra oscura**.
- El hilo que separa secciones y bordes ya no es gris: es un dorado muy
  tenue (`--linea-fuerte`).
- Solo quedan dos colores fuera de la familia, y a propósito: el verde y el
  rojo de los semáforos (matriculado / pendiente / vencido), ya
  desaturados para que no griten. El morado y los azules desaparecieron
  por completo.

### Tema claro y tema oscuro

Los dos existen y se cambian con el botón 🌙 / ☀️ de la barra (o del panel).

- **Claro**: blanco hueso (#FBFAF6), tarjetas blancas, dorado de acento.
- **Oscuro**: negro cálido (#0E0D0A), no azulado — al lado del dorado se ve
  como terciopelo, no como una pantalla apagada.

La elección se guarda en el navegador de cada persona, así que cada quien
lo deja como le gusta.

## Insignia y fotos: ahora las sube Soporte

Antes, para cambiar el logo o poner las fotos del colegio había que editar
archivos y volver a publicar el sitio. Ahora **no se toca nada de código**:

**Soporte → "Insignia y fotos"**

1. **Insignia del colegio**: subes la imagen y reemplaza el escudo "RPB" en
   la barra de las tres páginas del portal, en las pantallas de acceso, en
   los cinco paneles y en el **membrete de los PDF** (constancias incluidas).
   El botón "Volver a RPB" deshace el cambio.
2. **Fotos de las instalaciones**: las siete que giran en el carrusel 3D de
   la página de inicio — patio principal, patio de juegos, aula de
   computación, primer piso, segundo piso, escalera grande y escalera
   pequeña. Cada tarjeta muestra si está **Cargada** o **Pendiente**.

Formatos: PNG, JPG o WEBP, hasta 3 MB por imagen.

### Por qué así y no con archivos en una carpeta

Las imágenes se guardan **en la base de datos** (tabla `imagenes` para las
fotos, `config_sistema` para la insignia), no en la carpeta `assets/img` ni
en el navegador de una persona. Eso significa que cuando Soporte sube una
foto, la ve **todo el mundo al instante** —en cualquier computadora o
celular— sin volver a publicar el sitio ni pedirle a nadie que copie
archivos. Si algún día prefieren el método clásico, sigue funcionando:
una foto puesta en `assets/img/lugar_patio.jpg` aparece igual, y la que
suba Soporte simplemente manda sobre ella.

Los permisos ya están contemplados en `sql/05_seguridad_rls.sql`: esas dos
tablas admiten escritura, con el mismo compromiso honesto documentado para
el resto del sistema (la sesión vive en el navegador, no en Supabase Auth),
y solo afecta a imágenes — nunca a notas, matrículas ni contraseñas.

## Sobre las cuentas

Las cuentas no se crean ni se borran solas. El padrón y los usuarios
iniciales se cargan **una sola vez**, la primera vez que se abre el sistema
en ese navegador; a partir de ahí manda lo que haya guardado, y una cuenta
creada desde Dirección sigue ahí al volver. Lo único que las borra es
limpiar los datos del navegador, y por eso existe **Soporte → Respaldos**,
que descarga todo en un archivo para poder restaurarlo.
