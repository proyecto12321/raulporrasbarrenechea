# Usuarios del sistema

**I.E.P. Raúl Porras Barrenechea · Sistema de gestión v3.2**

---

## Cómo entra cada quien

El acceso está **separado en dos páginas distintas**, a propósito:

| Quién | Página | Qué escribe |
|---|---|---|
| 🎒 **Estudiantes** | `acceso-estudiante.html` | Solo su **DNI**. Sin usuario ni contraseña. |
| 🧑‍🏫 **Docentes y personal** | `acceso-personal.html` | Su **usuario** y su **contraseña** (por defecto, su propio DNI). |

`acceso.html` es solo la pantalla que pregunta cuál de las dos puertas usar.
Los **padres y apoderados** no necesitan cuenta: usan el portal público.

---

## Cuentas del personal
> **Tres cosas cambiaron en septiembre de 2026. Léelas antes de probar.**
>
> 1. **La contraseña de la directora es `08449165`**, no su DNI. Se puso así a
>    pedido de la institución. Su DNI sigue siendo `41251702` y es el que sale
>    en las constancias; para *entrar* al sistema, la contraseña es `08449165`.
> 2. Según la constancia oficial del colegio, quien firma como Directora es
>    **Elizabeth Almeyda Matías** (DNI 41251702), y **Melva Margarita Rojas
>    Peñaloza** es la **docente de 3.er grado**. El sistema ya refleja eso:
>    `directora` es la cuenta de Elizabeth, y Melva entra con `mrojas`.
> 3. Se dio de alta al **profesor Angel Levano Rojas** (DNI 71573419), docente
>    de **Computación** de Inicial a 6.° de Primaria. Entra con `alevano`.


La contraseña de cada cuenta es **su propio DNI**. Se puede cambiar desde el
panel, con el botón **🔑 Cambiar mi contraseña** del menú lateral.

| Persona | Usuario | Contraseña | Cargo |
|---|---|---|---|
| Elizabeth Almeyda Matías | `directora` | **`08449165`** ⚠️ no es su DNI | Directora |
| Daniel Jesús Lévano Rojas | `dlevano` | `71573418` | Personal administrativo |
| Equipo de Soporte Técnico | `soporte` | `10000000` | Soporte técnico |
| Brunella Patricia Sotelo Salhuana | `bsotelo` | `40000005` | Docente de 4.to grado |
| Katherine Guadalupe Loza Torres | `kloza` | `40000006` | Docente de 5.to grado |
| Melva Margarita Rojas Peñaloza | `mrojas` | `08449165` | Docente de 3.er grado |
| Roxana Magale Almeyda Carpio | `ralmeyda` | `40000007` | Docente de 6.to grado |
| Sonia Rojas Ortiz | `srojas` | `40000003` | Docente de 2.do grado |
| Sonia Ruiz Ríos | `sruiz` | `40000002` | Docente de 1.er grado |
| Ysella Villanueva Antón | `yvillanueva` | `40000001` | Docente de Inicial |
| **Angel Levano Rojas** | `alevano` | `71573419` | Docente de Computación (Inicial a 6.°) |

---

## Estudiantes

Cualquiera de los **65 DNI del padrón** sirve para entrar. Uno por grado, para probar:

| Estudiante | DNI | Grado |
|---|---|---|
| ANTON ALMEYDA, Acassia Guadalupe | `93069085` | Inicial 3 años |
| BARRIOS TIRADO, Ronald Mateo | `92486850` | Inicial 4 años |
| ABURTO CAMBAR, Rafaella Kamil | `92199698` | Inicial 5 años |
| ALMEYDA ROJAS, David Enrique | `91615141` | 1.er grado |
| AGUILAR ORTIZ, Lucas Caleb | `91293137` | 2.do grado |
| ABURTO CAMBAR, Emiliano Joaquín | `90370542` | 3.er grado |
| AGUILAR ORTIZ, Leandra Angélica | `79984317` | 4.to grado |
| ANTON ALMEYDA, Hermes Santiago | `79592170` | 5.to grado |
| ABREGU MENESES, Carlita Valentina | `81443069` | 6.to grado |

La lista completa está en `sql/03_alumnos.sql`.

---

## Quién enseña qué

La carga la define el propio colegio y el sistema la refleja tal cual; no se
reparte sola ni se inventa nada:

| Docente | Qué enseña |
|---|---|
| Katherine Guadalupe Loza Torres (*miss Guadalupe*) | **Matemática** de 4.°, 5.° y 6.°, más su **tutoría de 5.°** |
| Roxana Magale Almeyda Carpio (*miss Magale*) | **Comunicación** de 4.°, 5.° y 6.°, más su **tutoría de 6.°** |
| Brunella Patricia Sotelo Salhuana (*miss Patty*) | El **resto de las áreas** de 4.°, 5.° y 6.°, más su **tutoría de 4.°** |
| Angel Levano Rojas | **Computación**, de Inicial a 6.° de Primaria |
| Ysella Villanueva Antón | Tutoría y áreas de **Inicial** |
| Sonia Ruiz Ríos · Sonia Rojas Ortiz · Melva Rojas Peñaloza | Tutoría y áreas de **1.°, 2.° y 3.°** respectivamente |

El colegio tiene **solo dos niveles: Inicial y Primaria.** No hay secundaria.

---

## Por qué la contraseña es el DNI

Es una decisión de usabilidad, tomada a pedido de la institución, y tiene su
contrapartida técnica para que siga siendo defendible:

- **En la base de datos NO queda el DNI como contraseña.** Se guarda derivado
  con **PBKDF2-HMAC-SHA256, 150 000 iteraciones y sal aleatoria por cuenta**.
  Quien lea la tabla `usuarios` ve algo como
  `pbkdf2$150000$8i09XGMy…$Qm5kZXJ2…` y con eso no puede iniciar sesión.
- **Se puede cambiar en cualquier momento** desde el panel; el sistema exige
  al menos 8 caracteres con mayúsculas, minúsculas y números.
- **Hay freno a la fuerza bruta**: 5 intentos y la cuenta se bloquea 5 minutos,
  con cuenta regresiva a la vista, y cada intento queda en `intentos_acceso`.
- **Los estudiantes no tienen contraseña en absoluto**, así que no hay 65
  contraseñas débiles circulando: su DNI se valida contra el padrón y, si no
  está matriculado, no entra.

### Recomendación para la entrega final

Si vas a dejar el sistema funcionando de verdad, pide al personal que cambie
su contraseña en el primer ingreso. Dirección puede ver quién no ha entrado
nunca en *Personal → «Nunca ingresaron»*.

---

## Un detalle que conviene revisar

Siete docentes tienen **DNI de relleno** heredados de la carga anterior
(`40000001` a `40000007`). Como el DNI es ahora la contraseña, conviene
reemplazarlos por los reales:

1. Dirección → **Personal** → ✏️ en la persona → corrige el DNI → guardar.
2. Después, 🔑 **Restablecer contraseña**: la nueva será el DNI corregido.

Los DNI reales que ya están en el sistema son el de la directora
(`08449165`), el del personal administrativo (`71573418`) y el de la docente
de 3.er grado (`41251702`).

---

## Cómo se crean más cuentas

Nunca desde el portal: **no existe registro público**, a propósito.

- **Dirección** → panel → *Personal* → **＋ Nueva cuenta**
- **Soporte técnico** → panel → *Cuentas* → **🔑** para restablecer

En los dos casos la contraseña inicial es el DNI de la persona y el sistema
la muestra en una tarjeta que se puede copiar de un clic.
