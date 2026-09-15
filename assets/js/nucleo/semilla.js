/* =====================================================================
   SEMILLA DE DATOS INSTITUCIONALES
   ---------------------------------------------------------------------
   Los mismos datos que cargan sql/02_datos_base.sql y sql/03_alumnos.sql,
   pero dentro del propio sistema. Sirven para dos cosas:

     1. Que el sistema funcione y se pueda demostrar sin depender de que
        la base remota esté al día (ver FUENTE_DATOS en config.js).
     2. Que el modo local arranque con el padrón real, no con inventos.

   ARCHIVO GENERADO — no se edita a mano.
   Se regenera con  python3 generar_semilla.py  después de cambiar el SQL.

   Las contraseñas son las mismas derivaciones PBKDF2 del DNI que guarda
   la base: aquí tampoco hay una sola contraseña en texto legible.
   ===================================================================== */
'use strict';

const SEMILLA = {
  usuarios: [
  {
    "nombres": "Melva Margarita Rojas Peñaloza",
    "dni": "08449165",
    "usuario": "mrojas",
    "clave": "pbkdf2$150000$2R7qIFB3hvEbfT+Zydl7Fw==$waOfbkKRNCaFr20wrOyneLCupDtXIt42a9WaobWkiIo=",
    "algoritmo": "pbkdf2",
    "rol": "docente",
    "cargo": "Docente de 3.er grado",
    "celular": "956070856",
    "grados_asignados": "3.er grado",
    "activo": 1,
    "debe_cambiar_clave": 0,
    "id": 1,
    "correo": null,
    "intentos_fallidos": 0,
    "bloqueado_hasta": null,
    "ultimo_acceso": null,
    "creado_por": "Carga inicial"
  },
  {
    "nombres": "Daniel Jesús Lévano Rojas",
    "dni": "71573418",
    "usuario": "dlevano",
    "clave": "pbkdf2$150000$6zjZAkA8r9d+q7OS+okQPg==$2vP0b0pLyE7XrxcyNCl9aGqa/jrOQq0o9NH9AsSvtvM=",
    "algoritmo": "pbkdf2",
    "rol": "administrativo",
    "cargo": "Personal administrativo",
    "celular": "956070857",
    "grados_asignados": null,
    "activo": 1,
    "debe_cambiar_clave": 0,
    "id": 2,
    "correo": null,
    "intentos_fallidos": 0,
    "bloqueado_hasta": null,
    "ultimo_acceso": null,
    "creado_por": "Carga inicial"
  },
  {
    "nombres": "Equipo de Soporte Técnico",
    "dni": "10000000",
    "usuario": "soporte",
    "clave": "pbkdf2$150000$Z3am+AqeZPm8bDmyTbhY3Q==$YQ4E5u6fmQqKK3xirlVjCNjemqN+e7yZrRe5F5ymhtc=",
    "algoritmo": "pbkdf2",
    "rol": "soporte",
    "cargo": "Soporte técnico",
    "celular": "956070858",
    "grados_asignados": null,
    "activo": 1,
    "debe_cambiar_clave": 0,
    "id": 3,
    "correo": null,
    "intentos_fallidos": 0,
    "bloqueado_hasta": null,
    "ultimo_acceso": null,
    "creado_por": "Carga inicial"
  },
  {
    "nombres": "Ysella Villanueva Antón",
    "dni": "40000001",
    "usuario": "yvillanueva",
    "clave": "pbkdf2$150000$gDrZCgIcST91sOGoA8hacA==$GEl3sshayon81F4IF3ES2YW8rKKI51IeftkBG94hvNc=",
    "algoritmo": "pbkdf2",
    "rol": "docente",
    "cargo": "Docente de Inicial",
    "celular": "956070861",
    "grados_asignados": "Inicial 3 y 4 años,Inicial 5 años",
    "activo": 1,
    "debe_cambiar_clave": 0,
    "id": 4,
    "correo": null,
    "intentos_fallidos": 0,
    "bloqueado_hasta": null,
    "ultimo_acceso": null,
    "creado_por": "Carga inicial"
  },
  {
    "nombres": "Sonia Ruiz Ríos",
    "dni": "40000002",
    "usuario": "sruiz",
    "clave": "pbkdf2$150000$BQABddo5AOjB/OJ/KgphKg==$e0b1/W4el+RhwL+AUgJZsA6iq2woW3R03uxH7DQXDqA=",
    "algoritmo": "pbkdf2",
    "rol": "docente",
    "cargo": "Docente de 1.er grado",
    "celular": "956070862",
    "grados_asignados": "1.er grado",
    "activo": 1,
    "debe_cambiar_clave": 0,
    "id": 5,
    "correo": null,
    "intentos_fallidos": 0,
    "bloqueado_hasta": null,
    "ultimo_acceso": null,
    "creado_por": "Carga inicial"
  },
  {
    "nombres": "Sonia Rojas Ortiz",
    "dni": "40000003",
    "usuario": "srojas",
    "clave": "pbkdf2$150000$Tyy6rtMJj42/X1eQFuQhGw==$iLm2qgOX/ChSSzNhlfoLul8d/HOj/pZZfB7jo8Hcz5M=",
    "algoritmo": "pbkdf2",
    "rol": "docente",
    "cargo": "Docente de 2.do grado",
    "celular": "956070863",
    "grados_asignados": "2.do grado",
    "activo": 1,
    "debe_cambiar_clave": 0,
    "id": 6,
    "correo": null,
    "intentos_fallidos": 0,
    "bloqueado_hasta": null,
    "ultimo_acceso": null,
    "creado_por": "Carga inicial"
  },
  {
    "nombres": "Elizabeth Almeyda Matías",
    "dni": "41251702",
    "usuario": "directora",
    "clave": "pbkdf2$150000$2R7qIFB3hvEbfT+Zydl7Fw==$waOfbkKRNCaFr20wrOyneLCupDtXIt42a9WaobWkiIo=",
    "algoritmo": "pbkdf2",
    "rol": "director",
    "cargo": "Directora",
    "celular": "956070864",
    "grados_asignados": null,
    "activo": 1,
    "debe_cambiar_clave": 0,
    "id": 7,
    "correo": null,
    "intentos_fallidos": 0,
    "bloqueado_hasta": null,
    "ultimo_acceso": null,
    "creado_por": "Carga inicial"
  },
  {
    "nombres": "Brunella Patricia Sotelo Salhuana",
    "dni": "40000005",
    "usuario": "bsotelo",
    "clave": "pbkdf2$150000$C7tEsIEVL+3oyyTc1JIaMA==$uD8WClnCqyGC0zrmGzAyygYGONBZWT+p/OPK3TiEdNA=",
    "algoritmo": "pbkdf2",
    "rol": "docente",
    "cargo": "Docente de 4.to grado",
    "celular": "956070865",
    "grados_asignados": "4.to grado,5.to grado,6.to grado",
    "activo": 1,
    "debe_cambiar_clave": 0,
    "id": 8,
    "correo": null,
    "intentos_fallidos": 0,
    "bloqueado_hasta": null,
    "ultimo_acceso": null,
    "creado_por": "Carga inicial"
  },
  {
    "nombres": "Katherine Guadalupe Loza Torres",
    "dni": "40000006",
    "usuario": "kloza",
    "clave": "pbkdf2$150000$GJje0N5InvGxrtqMm+1aDw==$hlN2x2Zs5L/EbAtljEWhWyAUg+GBWbM4uLlSeoFaRuA=",
    "algoritmo": "pbkdf2",
    "rol": "docente",
    "cargo": "Docente de 5.to grado",
    "celular": "956070866",
    "grados_asignados": "4.to grado,5.to grado,6.to grado",
    "activo": 1,
    "debe_cambiar_clave": 0,
    "id": 9,
    "correo": null,
    "intentos_fallidos": 0,
    "bloqueado_hasta": null,
    "ultimo_acceso": null,
    "creado_por": "Carga inicial"
  },
  {
    "nombres": "Roxana Magale Almeyda Carpio",
    "dni": "40000007",
    "usuario": "ralmeyda",
    "clave": "pbkdf2$150000$710gLeXJ4UAEI3YoYJ4Emw==$h4fmAbOzSRHeyXobT49UQH0JpAPywdV4XCERnyOKs1c=",
    "algoritmo": "pbkdf2",
    "rol": "docente",
    "cargo": "Docente de 6.to grado",
    "celular": "956070867",
    "grados_asignados": "4.to grado,5.to grado,6.to grado",
    "activo": 1,
    "debe_cambiar_clave": 0,
    "id": 10,
    "correo": null,
    "intentos_fallidos": 0,
    "bloqueado_hasta": null,
    "ultimo_acceso": null,
    "creado_por": "Carga inicial"
  },
  {
    "nombres": "Angel Levano Rojas",
    "dni": "71573419",
    "usuario": "alevano",
    "clave": "pbkdf2$150000$hDNuBvofSlzRXPYLnQhINA==$8p//YLCEJ8BtIJudgRF69nGxi+P9xCSUGyR9RSDYNIM=",
    "algoritmo": "pbkdf2",
    "rol": "docente",
    "cargo": "Docente de Computación",
    "celular": null,
    "grados_asignados": "Inicial 3 y 4 años,Inicial 5 años,1.er grado,2.do grado,3.er grado,4.to grado,5.to grado,6.to grado",
    "activo": 1,
    "debe_cambiar_clave": 0,
    "id": 11,
    "correo": null,
    "intentos_fallidos": 0,
    "bloqueado_hasta": null,
    "ultimo_acceso": null,
    "creado_por": "Carga inicial"
  }
],

  grados: [
  {
    "nombre": "Inicial 3 y 4 años",
    "nivel": "Inicial",
    "aula": "Aula Amarilla",
    "docente": "Ysella Villanueva Antón",
    "vacantes": 12,
    "orden": 1,
    "id": 1
  },
  {
    "nombre": "Inicial 5 años",
    "nivel": "Inicial",
    "aula": "Aula Verde",
    "docente": "Ysella Villanueva Antón",
    "vacantes": 12,
    "orden": 2,
    "id": 2
  },
  {
    "nombre": "1.er grado",
    "nivel": "Primaria",
    "aula": "Aula 101",
    "docente": "Sonia Ruiz Ríos",
    "vacantes": 12,
    "orden": 3,
    "id": 3
  },
  {
    "nombre": "2.do grado",
    "nivel": "Primaria",
    "aula": "Aula 102",
    "docente": "Sonia Rojas Ortiz",
    "vacantes": 12,
    "orden": 4,
    "id": 4
  },
  {
    "nombre": "3.er grado",
    "nivel": "Primaria",
    "aula": "Aula 103",
    "docente": "Melva Margarita Rojas Peñaloza",
    "vacantes": 12,
    "orden": 5,
    "id": 5
  },
  {
    "nombre": "4.to grado",
    "nivel": "Primaria",
    "aula": "Aula 104",
    "docente": "Brunella Patricia Sotelo Salhuana",
    "vacantes": 12,
    "orden": 6,
    "id": 6
  },
  {
    "nombre": "5.to grado",
    "nivel": "Primaria",
    "aula": "Aula 105",
    "docente": "Katherine Guadalupe Loza Torres",
    "vacantes": 12,
    "orden": 7,
    "id": 7
  },
  {
    "nombre": "6.to grado",
    "nivel": "Primaria",
    "aula": "Aula 106",
    "docente": "Roxana Magale Almeyda Carpio",
    "vacantes": 12,
    "orden": 8,
    "id": 8
  }
],

  cursos: [
  {
    "nombre": "Personal Social",
    "grado": "Inicial 3 y 4 años",
    "nivel": "Inicial",
    "docente": "Ysella Villanueva Antón",
    "id": 1
  },
  {
    "nombre": "Psicomotricidad",
    "grado": "Inicial 3 y 4 años",
    "nivel": "Inicial",
    "docente": "Ysella Villanueva Antón",
    "id": 2
  },
  {
    "nombre": "Comunicación",
    "grado": "Inicial 3 y 4 años",
    "nivel": "Inicial",
    "docente": "Ysella Villanueva Antón",
    "id": 3
  },
  {
    "nombre": "Matemática",
    "grado": "Inicial 3 y 4 años",
    "nivel": "Inicial",
    "docente": "Ysella Villanueva Antón",
    "id": 4
  },
  {
    "nombre": "Ciencia y Tecnología",
    "grado": "Inicial 3 y 4 años",
    "nivel": "Inicial",
    "docente": "Ysella Villanueva Antón",
    "id": 5
  },
  {
    "nombre": "Religión",
    "grado": "Inicial 3 y 4 años",
    "nivel": "Inicial",
    "docente": "Ysella Villanueva Antón",
    "id": 6
  },
  {
    "nombre": "Inglés",
    "grado": "Inicial 3 y 4 años",
    "nivel": "Inicial",
    "docente": "Ysella Villanueva Antón",
    "id": 7
  },
  {
    "nombre": "Computación",
    "grado": "Inicial 3 y 4 años",
    "nivel": "Inicial",
    "docente": "Angel Levano Rojas",
    "id": 8
  },
  {
    "nombre": "Personal Social",
    "grado": "Inicial 5 años",
    "nivel": "Inicial",
    "docente": "Ysella Villanueva Antón",
    "id": 9
  },
  {
    "nombre": "Psicomotricidad",
    "grado": "Inicial 5 años",
    "nivel": "Inicial",
    "docente": "Ysella Villanueva Antón",
    "id": 10
  },
  {
    "nombre": "Comunicación",
    "grado": "Inicial 5 años",
    "nivel": "Inicial",
    "docente": "Ysella Villanueva Antón",
    "id": 11
  },
  {
    "nombre": "Matemática",
    "grado": "Inicial 5 años",
    "nivel": "Inicial",
    "docente": "Ysella Villanueva Antón",
    "id": 12
  },
  {
    "nombre": "Ciencia y Tecnología",
    "grado": "Inicial 5 años",
    "nivel": "Inicial",
    "docente": "Ysella Villanueva Antón",
    "id": 13
  },
  {
    "nombre": "Religión",
    "grado": "Inicial 5 años",
    "nivel": "Inicial",
    "docente": "Ysella Villanueva Antón",
    "id": 14
  },
  {
    "nombre": "Inglés",
    "grado": "Inicial 5 años",
    "nivel": "Inicial",
    "docente": "Ysella Villanueva Antón",
    "id": 15
  },
  {
    "nombre": "Computación",
    "grado": "Inicial 5 años",
    "nivel": "Inicial",
    "docente": "Angel Levano Rojas",
    "id": 16
  },
  {
    "nombre": "Comunicación",
    "grado": "1.er grado",
    "nivel": "Primaria",
    "docente": "Sonia Ruiz Ríos",
    "id": 17
  },
  {
    "nombre": "Matemática",
    "grado": "1.er grado",
    "nivel": "Primaria",
    "docente": "Sonia Ruiz Ríos",
    "id": 18
  },
  {
    "nombre": "Personal Social",
    "grado": "1.er grado",
    "nivel": "Primaria",
    "docente": "Sonia Ruiz Ríos",
    "id": 19
  },
  {
    "nombre": "Ciencia y Tecnología",
    "grado": "1.er grado",
    "nivel": "Primaria",
    "docente": "Sonia Ruiz Ríos",
    "id": 20
  },
  {
    "nombre": "Arte y Cultura",
    "grado": "1.er grado",
    "nivel": "Primaria",
    "docente": "Sonia Ruiz Ríos",
    "id": 21
  },
  {
    "nombre": "Educación Física",
    "grado": "1.er grado",
    "nivel": "Primaria",
    "docente": "Sonia Ruiz Ríos",
    "id": 22
  },
  {
    "nombre": "Educación Religiosa",
    "grado": "1.er grado",
    "nivel": "Primaria",
    "docente": "Sonia Ruiz Ríos",
    "id": 23
  },
  {
    "nombre": "Inglés",
    "grado": "1.er grado",
    "nivel": "Primaria",
    "docente": "Sonia Ruiz Ríos",
    "id": 24
  },
  {
    "nombre": "Computación",
    "grado": "1.er grado",
    "nivel": "Primaria",
    "docente": "Angel Levano Rojas",
    "id": 25
  },
  {
    "nombre": "Tutoría",
    "grado": "1.er grado",
    "nivel": "Primaria",
    "docente": "Sonia Ruiz Ríos",
    "id": 26
  },
  {
    "nombre": "Comunicación",
    "grado": "2.do grado",
    "nivel": "Primaria",
    "docente": "Sonia Rojas Ortiz",
    "id": 27
  },
  {
    "nombre": "Matemática",
    "grado": "2.do grado",
    "nivel": "Primaria",
    "docente": "Sonia Rojas Ortiz",
    "id": 28
  },
  {
    "nombre": "Personal Social",
    "grado": "2.do grado",
    "nivel": "Primaria",
    "docente": "Sonia Rojas Ortiz",
    "id": 29
  },
  {
    "nombre": "Ciencia y Tecnología",
    "grado": "2.do grado",
    "nivel": "Primaria",
    "docente": "Sonia Rojas Ortiz",
    "id": 30
  },
  {
    "nombre": "Arte y Cultura",
    "grado": "2.do grado",
    "nivel": "Primaria",
    "docente": "Sonia Rojas Ortiz",
    "id": 31
  },
  {
    "nombre": "Educación Física",
    "grado": "2.do grado",
    "nivel": "Primaria",
    "docente": "Sonia Rojas Ortiz",
    "id": 32
  },
  {
    "nombre": "Educación Religiosa",
    "grado": "2.do grado",
    "nivel": "Primaria",
    "docente": "Sonia Rojas Ortiz",
    "id": 33
  },
  {
    "nombre": "Inglés",
    "grado": "2.do grado",
    "nivel": "Primaria",
    "docente": "Sonia Rojas Ortiz",
    "id": 34
  },
  {
    "nombre": "Computación",
    "grado": "2.do grado",
    "nivel": "Primaria",
    "docente": "Angel Levano Rojas",
    "id": 35
  },
  {
    "nombre": "Tutoría",
    "grado": "2.do grado",
    "nivel": "Primaria",
    "docente": "Sonia Rojas Ortiz",
    "id": 36
  },
  {
    "nombre": "Comunicación",
    "grado": "3.er grado",
    "nivel": "Primaria",
    "docente": "Melva Margarita Rojas Peñaloza",
    "id": 37
  },
  {
    "nombre": "Matemática",
    "grado": "3.er grado",
    "nivel": "Primaria",
    "docente": "Melva Margarita Rojas Peñaloza",
    "id": 38
  },
  {
    "nombre": "Personal Social",
    "grado": "3.er grado",
    "nivel": "Primaria",
    "docente": "Melva Margarita Rojas Peñaloza",
    "id": 39
  },
  {
    "nombre": "Ciencia y Tecnología",
    "grado": "3.er grado",
    "nivel": "Primaria",
    "docente": "Melva Margarita Rojas Peñaloza",
    "id": 40
  },
  {
    "nombre": "Arte y Cultura",
    "grado": "3.er grado",
    "nivel": "Primaria",
    "docente": "Melva Margarita Rojas Peñaloza",
    "id": 41
  },
  {
    "nombre": "Educación Física",
    "grado": "3.er grado",
    "nivel": "Primaria",
    "docente": "Melva Margarita Rojas Peñaloza",
    "id": 42
  },
  {
    "nombre": "Educación Religiosa",
    "grado": "3.er grado",
    "nivel": "Primaria",
    "docente": "Melva Margarita Rojas Peñaloza",
    "id": 43
  },
  {
    "nombre": "Inglés",
    "grado": "3.er grado",
    "nivel": "Primaria",
    "docente": "Melva Margarita Rojas Peñaloza",
    "id": 44
  },
  {
    "nombre": "Computación",
    "grado": "3.er grado",
    "nivel": "Primaria",
    "docente": "Angel Levano Rojas",
    "id": 45
  },
  {
    "nombre": "Tutoría",
    "grado": "3.er grado",
    "nivel": "Primaria",
    "docente": "Melva Margarita Rojas Peñaloza",
    "id": 46
  },
  {
    "nombre": "Comunicación",
    "grado": "4.to grado",
    "nivel": "Primaria",
    "docente": "Roxana Magale Almeyda Carpio",
    "id": 47
  },
  {
    "nombre": "Matemática",
    "grado": "4.to grado",
    "nivel": "Primaria",
    "docente": "Katherine Guadalupe Loza Torres",
    "id": 48
  },
  {
    "nombre": "Personal Social",
    "grado": "4.to grado",
    "nivel": "Primaria",
    "docente": "Brunella Patricia Sotelo Salhuana",
    "id": 49
  },
  {
    "nombre": "Ciencia y Tecnología",
    "grado": "4.to grado",
    "nivel": "Primaria",
    "docente": "Brunella Patricia Sotelo Salhuana",
    "id": 50
  },
  {
    "nombre": "Arte y Cultura",
    "grado": "4.to grado",
    "nivel": "Primaria",
    "docente": "Brunella Patricia Sotelo Salhuana",
    "id": 51
  },
  {
    "nombre": "Educación Física",
    "grado": "4.to grado",
    "nivel": "Primaria",
    "docente": "Brunella Patricia Sotelo Salhuana",
    "id": 52
  },
  {
    "nombre": "Educación Religiosa",
    "grado": "4.to grado",
    "nivel": "Primaria",
    "docente": "Brunella Patricia Sotelo Salhuana",
    "id": 53
  },
  {
    "nombre": "Inglés",
    "grado": "4.to grado",
    "nivel": "Primaria",
    "docente": "Brunella Patricia Sotelo Salhuana",
    "id": 54
  },
  {
    "nombre": "Computación",
    "grado": "4.to grado",
    "nivel": "Primaria",
    "docente": "Angel Levano Rojas",
    "id": 55
  },
  {
    "nombre": "Tutoría",
    "grado": "4.to grado",
    "nivel": "Primaria",
    "docente": "Brunella Patricia Sotelo Salhuana",
    "id": 56
  },
  {
    "nombre": "Comunicación",
    "grado": "5.to grado",
    "nivel": "Primaria",
    "docente": "Roxana Magale Almeyda Carpio",
    "id": 57
  },
  {
    "nombre": "Matemática",
    "grado": "5.to grado",
    "nivel": "Primaria",
    "docente": "Katherine Guadalupe Loza Torres",
    "id": 58
  },
  {
    "nombre": "Personal Social",
    "grado": "5.to grado",
    "nivel": "Primaria",
    "docente": "Brunella Patricia Sotelo Salhuana",
    "id": 59
  },
  {
    "nombre": "Ciencia y Tecnología",
    "grado": "5.to grado",
    "nivel": "Primaria",
    "docente": "Brunella Patricia Sotelo Salhuana",
    "id": 60
  },
  {
    "nombre": "Arte y Cultura",
    "grado": "5.to grado",
    "nivel": "Primaria",
    "docente": "Brunella Patricia Sotelo Salhuana",
    "id": 61
  },
  {
    "nombre": "Educación Física",
    "grado": "5.to grado",
    "nivel": "Primaria",
    "docente": "Brunella Patricia Sotelo Salhuana",
    "id": 62
  },
  {
    "nombre": "Educación Religiosa",
    "grado": "5.to grado",
    "nivel": "Primaria",
    "docente": "Brunella Patricia Sotelo Salhuana",
    "id": 63
  },
  {
    "nombre": "Inglés",
    "grado": "5.to grado",
    "nivel": "Primaria",
    "docente": "Brunella Patricia Sotelo Salhuana",
    "id": 64
  },
  {
    "nombre": "Computación",
    "grado": "5.to grado",
    "nivel": "Primaria",
    "docente": "Angel Levano Rojas",
    "id": 65
  },
  {
    "nombre": "Tutoría",
    "grado": "5.to grado",
    "nivel": "Primaria",
    "docente": "Katherine Guadalupe Loza Torres",
    "id": 66
  },
  {
    "nombre": "Comunicación",
    "grado": "6.to grado",
    "nivel": "Primaria",
    "docente": "Roxana Magale Almeyda Carpio",
    "id": 67
  },
  {
    "nombre": "Matemática",
    "grado": "6.to grado",
    "nivel": "Primaria",
    "docente": "Katherine Guadalupe Loza Torres",
    "id": 68
  },
  {
    "nombre": "Personal Social",
    "grado": "6.to grado",
    "nivel": "Primaria",
    "docente": "Brunella Patricia Sotelo Salhuana",
    "id": 69
  },
  {
    "nombre": "Ciencia y Tecnología",
    "grado": "6.to grado",
    "nivel": "Primaria",
    "docente": "Brunella Patricia Sotelo Salhuana",
    "id": 70
  },
  {
    "nombre": "Arte y Cultura",
    "grado": "6.to grado",
    "nivel": "Primaria",
    "docente": "Brunella Patricia Sotelo Salhuana",
    "id": 71
  },
  {
    "nombre": "Educación Física",
    "grado": "6.to grado",
    "nivel": "Primaria",
    "docente": "Brunella Patricia Sotelo Salhuana",
    "id": 72
  },
  {
    "nombre": "Educación Religiosa",
    "grado": "6.to grado",
    "nivel": "Primaria",
    "docente": "Brunella Patricia Sotelo Salhuana",
    "id": 73
  },
  {
    "nombre": "Inglés",
    "grado": "6.to grado",
    "nivel": "Primaria",
    "docente": "Brunella Patricia Sotelo Salhuana",
    "id": 74
  },
  {
    "nombre": "Computación",
    "grado": "6.to grado",
    "nivel": "Primaria",
    "docente": "Angel Levano Rojas",
    "id": 75
  },
  {
    "nombre": "Tutoría",
    "grado": "6.to grado",
    "nivel": "Primaria",
    "docente": "Roxana Magale Almeyda Carpio",
    "id": 76
  }
],

  comunicados: [
  {
    "titulo": "Matrícula 2026 abierta",
    "cuerpo": "Ya está abierta la matrícula para el año escolar 2026. Las vacantes son limitadas: cada aula recibe como máximo 12 estudiantes. Acércate a secretaría con los requisitos o envía tu solicitud desde el portal.",
    "etiqueta": "Matrícula",
    "urgente": 0,
    "visible_portal": 1,
    "dirigido_a": "Todos",
    "publicado_por": "Daniel Jesús Lévano Rojas",
    "id": 1
  },
  {
    "titulo": "Bienvenida al año escolar 2026",
    "cuerpo": "Damos la bienvenida a todas las familias al año lectivo 2026. Las clases se desarrollan de 8:00 a. m. a 2:00 p. m. Contamos con su apoyo para acompañar a nuestros estudiantes.",
    "etiqueta": "General",
    "urgente": 0,
    "visible_portal": 1,
    "dirigido_a": "Todos",
    "publicado_por": "Melva Margarita Rojas Peñaloza",
    "id": 2
  }
],

  config_sistema: [
  {
    "clave": "anio_escolar",
    "valor": "2026",
    "descripcion": "Año escolar activo",
    "id": 1
  },
  {
    "clave": "aforo_aula",
    "valor": "12",
    "descripcion": "Máximo de estudiantes por aula (tríptico institucional)",
    "id": 2
  },
  {
    "clave": "anios_servicio",
    "valor": "26",
    "descripcion": "Años de servicio a la comunidad",
    "id": 3
  },
  {
    "clave": "docentes",
    "valor": "10",
    "descripcion": "Plana docente calificada (cifra institucional del portal)",
    "id": 4
  },
  {
    "clave": "directora",
    "valor": "Melva Margarita Rojas Peñaloza",
    "descripcion": "Dirección de la institución",
    "id": 5
  },
  {
    "clave": "costo_matricula",
    "valor": "300.00",
    "descripcion": "Costo de matrícula en soles",
    "id": 6
  },
  {
    "clave": "pension_inicial",
    "valor": "300.00",
    "descripcion": "Pensión mensual del nivel Inicial",
    "id": 7
  },
  {
    "clave": "pension_primaria",
    "valor": "330.00",
    "descripcion": "Pensión mensual del nivel Primaria",
    "id": 8
  },
  {
    "clave": "mensualidades",
    "valor": "10",
    "descripcion": "Número de pensiones al año",
    "id": 9
  },
  {
    "clave": "version_sistema",
    "valor": "2.2",
    "descripcion": "Versión del sistema de gestión",
    "id": 10
  },
  {
    "clave": "intentos_maximos",
    "valor": "5",
    "descripcion": "Intentos de acceso antes del bloqueo",
    "id": 11
  },
  {
    "clave": "minutos_bloqueo",
    "valor": "5",
    "descripcion": "Duración del bloqueo por intentos fallidos",
    "id": 12
  }
],

  estudiantes: [
  {
    "codigo": "EST-2026-0001",
    "nombres": "ACASSIA GUADALUPE",
    "apellidos": "ANTON ALMEYDA",
    "dni": "93069085",
    "sexo": "F",
    "grado": "Inicial 3 y 4 años",
    "seccion": "Única",
    "estado": "Matriculado",
    "anio": 2026,
    "registrado_por": "Nómina SIAGIE 2026",
    "id": 1,
    "completo": 1,
    "segundos": 0
  },
  {
    "codigo": "EST-2026-0002",
    "nombres": "EMMA VICTORIA",
    "apellidos": "CRUZ VILCA",
    "dni": "93278887",
    "sexo": "F",
    "grado": "Inicial 3 y 4 años",
    "seccion": "Única",
    "estado": "Matriculado",
    "anio": 2026,
    "registrado_por": "Nómina SIAGIE 2026",
    "id": 2,
    "completo": 1,
    "segundos": 0
  },
  {
    "codigo": "EST-2026-0003",
    "nombres": "KENZIE YAEL",
    "apellidos": "HUASASQUICHE MENDOZA",
    "dni": "93237884",
    "sexo": "M",
    "grado": "Inicial 3 y 4 años",
    "seccion": "Única",
    "estado": "Matriculado",
    "anio": 2026,
    "registrado_por": "Nómina SIAGIE 2026",
    "id": 3,
    "completo": 1,
    "segundos": 0
  },
  {
    "codigo": "EST-2026-0004",
    "nombres": "ALESSIO EMILIANO",
    "apellidos": "MESIAS ALMEYDA",
    "dni": "93024454",
    "sexo": "M",
    "grado": "Inicial 3 y 4 años",
    "seccion": "Única",
    "estado": "Matriculado",
    "anio": 2026,
    "registrado_por": "Nómina SIAGIE 2026",
    "id": 4,
    "completo": 1,
    "segundos": 0
  },
  {
    "codigo": "EST-2026-0005",
    "nombres": "IAM GAEL",
    "apellidos": "PEREZ JUNCHAYA",
    "dni": "93158147",
    "sexo": "M",
    "grado": "Inicial 3 y 4 años",
    "seccion": "Única",
    "estado": "Matriculado",
    "anio": 2026,
    "registrado_por": "Nómina SIAGIE 2026",
    "id": 5,
    "completo": 1,
    "segundos": 0
  },
  {
    "codigo": "EST-2026-0006",
    "nombres": "HANNA VALENTINA",
    "apellidos": "PEREZ PACHAS",
    "dni": "93251107",
    "sexo": "F",
    "grado": "Inicial 3 y 4 años",
    "seccion": "Única",
    "estado": "Matriculado",
    "anio": 2026,
    "registrado_por": "Nómina SIAGIE 2026",
    "id": 6,
    "completo": 1,
    "segundos": 0
  },
  {
    "codigo": "EST-2026-0007",
    "nombres": "EITHAN SEBASTIAN",
    "apellidos": "YATACO JUNCHAYA",
    "dni": "93229895",
    "sexo": "M",
    "grado": "Inicial 3 y 4 años",
    "seccion": "Única",
    "estado": "Matriculado",
    "anio": 2026,
    "registrado_por": "Nómina SIAGIE 2026",
    "id": 7,
    "completo": 1,
    "segundos": 0
  },
  {
    "codigo": "EST-2026-0008",
    "nombres": "RONALD MATEO",
    "apellidos": "BARRIOS TIRADO",
    "dni": "92486850",
    "sexo": "M",
    "grado": "Inicial 3 y 4 años",
    "seccion": "Única",
    "estado": "Matriculado",
    "anio": 2026,
    "registrado_por": "Nómina SIAGIE 2026",
    "id": 8,
    "completo": 1,
    "segundos": 0
  },
  {
    "codigo": "EST-2026-0009",
    "nombres": "CATALEYA FRANCESCA",
    "apellidos": "CONDE PALOMINO",
    "dni": "92358410",
    "sexo": "F",
    "grado": "Inicial 3 y 4 años",
    "seccion": "Única",
    "estado": "Matriculado",
    "anio": 2026,
    "registrado_por": "Nómina SIAGIE 2026",
    "id": 9,
    "completo": 1,
    "segundos": 0
  },
  {
    "codigo": "EST-2026-0010",
    "nombres": "JIMENA TATIANA",
    "apellidos": "GUERRA SARAVIA",
    "dni": "92611101",
    "sexo": "F",
    "grado": "Inicial 3 y 4 años",
    "seccion": "Única",
    "estado": "Matriculado",
    "anio": 2026,
    "registrado_por": "Nómina SIAGIE 2026",
    "id": 10,
    "completo": 1,
    "segundos": 0
  },
  {
    "codigo": "EST-2026-0011",
    "nombres": "RAFAELLA KAMIL",
    "apellidos": "ABURTO CAMBAR",
    "dni": "92199698",
    "sexo": "F",
    "grado": "Inicial 5 años",
    "seccion": "Única",
    "estado": "Matriculado",
    "anio": 2026,
    "registrado_por": "Nómina SIAGIE 2026",
    "id": 11,
    "completo": 1,
    "segundos": 0
  },
  {
    "codigo": "EST-2026-0012",
    "nombres": "ADRIANA LUNA",
    "apellidos": "ALMEYDA TASAYCO",
    "dni": "91909812",
    "sexo": "F",
    "grado": "Inicial 5 años",
    "seccion": "Única",
    "estado": "Matriculado",
    "anio": 2026,
    "registrado_por": "Nómina SIAGIE 2026",
    "id": 12,
    "completo": 1,
    "segundos": 0
  },
  {
    "codigo": "EST-2026-0013",
    "nombres": "FABRIZIO",
    "apellidos": "PARIONA BRIGADA",
    "dni": "91902351",
    "sexo": "M",
    "grado": "Inicial 5 años",
    "seccion": "Única",
    "estado": "Matriculado",
    "anio": 2026,
    "registrado_por": "Nómina SIAGIE 2026",
    "id": 13,
    "completo": 1,
    "segundos": 0
  },
  {
    "codigo": "EST-2026-0014",
    "nombres": "BIANCA CAMILA",
    "apellidos": "PEREZ PACHAS",
    "dni": "92237493",
    "sexo": "F",
    "grado": "Inicial 5 años",
    "seccion": "Única",
    "estado": "Matriculado",
    "anio": 2026,
    "registrado_por": "Nómina SIAGIE 2026",
    "id": 14,
    "completo": 1,
    "segundos": 0
  },
  {
    "codigo": "EST-2026-0015",
    "nombres": "JULIA DAYANA",
    "apellidos": "SOTO MEJIA",
    "dni": "92108739",
    "sexo": "F",
    "grado": "Inicial 5 años",
    "seccion": "Única",
    "estado": "Matriculado",
    "anio": 2026,
    "registrado_por": "Nómina SIAGIE 2026",
    "id": 15,
    "completo": 1,
    "segundos": 0
  },
  {
    "codigo": "EST-2026-0016",
    "nombres": "JAIME GAEL",
    "apellidos": "TORRES TASAYCO",
    "dni": "92141768",
    "sexo": "M",
    "grado": "Inicial 5 años",
    "seccion": "Única",
    "estado": "Matriculado",
    "anio": 2026,
    "registrado_por": "Nómina SIAGIE 2026",
    "id": 16,
    "completo": 1,
    "segundos": 0
  },
  {
    "codigo": "EST-2026-0017",
    "nombres": "DAVID ENRIQUE",
    "apellidos": "ALMEYDA ROJAS",
    "dni": "91615141",
    "sexo": "M",
    "grado": "1.er grado",
    "seccion": "Única",
    "estado": "Matriculado",
    "anio": 2026,
    "registrado_por": "Nómina SIAGIE 2026",
    "id": 17,
    "completo": 1,
    "segundos": 0
  },
  {
    "codigo": "EST-2026-0018",
    "nombres": "JESUS ESTEFANO",
    "apellidos": "CAMPUSMANA ATUNCAR",
    "dni": "91366252",
    "sexo": "M",
    "grado": "1.er grado",
    "seccion": "Única",
    "estado": "Matriculado",
    "anio": 2026,
    "registrado_por": "Nómina SIAGIE 2026",
    "id": 18,
    "completo": 1,
    "segundos": 0
  },
  {
    "codigo": "EST-2026-0019",
    "nombres": "EMMA VALENTINA",
    "apellidos": "MAGALLANES TASAYCO",
    "dni": "91686864",
    "sexo": "F",
    "grado": "1.er grado",
    "seccion": "Única",
    "estado": "Matriculado",
    "anio": 2026,
    "registrado_por": "Nómina SIAGIE 2026",
    "id": 19,
    "completo": 1,
    "segundos": 0
  },
  {
    "codigo": "EST-2026-0020",
    "nombres": "EMILIA ALEJANDRA",
    "apellidos": "ORTIZ MARTINEZ",
    "dni": "91577588",
    "sexo": "F",
    "grado": "1.er grado",
    "seccion": "Única",
    "estado": "Matriculado",
    "anio": 2026,
    "registrado_por": "Nómina SIAGIE 2026",
    "id": 20,
    "completo": 1,
    "segundos": 0
  },
  {
    "codigo": "EST-2026-0021",
    "nombres": "AYLEN VALENTINA",
    "apellidos": "PACHAS JUNCHAYA",
    "dni": "91380693",
    "sexo": "F",
    "grado": "1.er grado",
    "seccion": "Única",
    "estado": "Matriculado",
    "anio": 2026,
    "registrado_por": "Nómina SIAGIE 2026",
    "id": 21,
    "completo": 1,
    "segundos": 0
  },
  {
    "codigo": "EST-2026-0022",
    "nombres": "JESUS FERNANDO",
    "apellidos": "QUISPE AYBAR",
    "dni": "91619764",
    "sexo": "M",
    "grado": "1.er grado",
    "seccion": "Única",
    "estado": "Matriculado",
    "anio": 2026,
    "registrado_por": "Nómina SIAGIE 2026",
    "id": 22,
    "completo": 1,
    "segundos": 0
  },
  {
    "codigo": "EST-2026-0023",
    "nombres": "LUCIANO ADRIANO",
    "apellidos": "QUISPE CACHIQUE",
    "dni": "81860454",
    "sexo": "M",
    "grado": "1.er grado",
    "seccion": "Única",
    "estado": "Matriculado",
    "anio": 2026,
    "registrado_por": "Nómina SIAGIE 2026",
    "id": 23,
    "completo": 1,
    "segundos": 0
  },
  {
    "codigo": "EST-2026-0024",
    "nombres": "FRANCO JAZIEL",
    "apellidos": "TASAYCO BARRIOS",
    "dni": "91511034",
    "sexo": "M",
    "grado": "1.er grado",
    "seccion": "Única",
    "estado": "Matriculado",
    "anio": 2026,
    "registrado_por": "Nómina SIAGIE 2026",
    "id": 24,
    "completo": 1,
    "segundos": 0
  },
  {
    "codigo": "EST-2026-0025",
    "nombres": "EMILIA CATALINA",
    "apellidos": "TASAYCO ESPINOZA",
    "dni": "91735816",
    "sexo": "F",
    "grado": "1.er grado",
    "seccion": "Única",
    "estado": "Matriculado",
    "anio": 2026,
    "registrado_por": "Nómina SIAGIE 2026",
    "id": 25,
    "completo": 1,
    "segundos": 0
  },
  {
    "codigo": "EST-2026-0026",
    "nombres": "LILIAN SOPHIA",
    "apellidos": "TORRES HURTADO",
    "dni": "91496684",
    "sexo": "F",
    "grado": "1.er grado",
    "seccion": "Única",
    "estado": "Matriculado",
    "anio": 2026,
    "registrado_por": "Nómina SIAGIE 2026",
    "id": 26,
    "completo": 1,
    "segundos": 0
  },
  {
    "codigo": "EST-2026-0027",
    "nombres": "LUCAS CALEB",
    "apellidos": "AGUILAR ORTIZ",
    "dni": "91293137",
    "sexo": "M",
    "grado": "2.do grado",
    "seccion": "Única",
    "estado": "Matriculado",
    "anio": 2026,
    "registrado_por": "Nómina SIAGIE 2026",
    "id": 27,
    "completo": 1,
    "segundos": 0
  },
  {
    "codigo": "EST-2026-0028",
    "nombres": "EZIO LEONEL",
    "apellidos": "GUERRA FLORES",
    "dni": "90459739",
    "sexo": "M",
    "grado": "2.do grado",
    "seccion": "Única",
    "estado": "Matriculado",
    "anio": 2026,
    "registrado_por": "Nómina SIAGIE 2026",
    "id": 28,
    "completo": 1,
    "segundos": 0
  },
  {
    "codigo": "EST-2026-0029",
    "nombres": "WILLIAM MANUEL",
    "apellidos": "LEVANO GUERRA",
    "dni": "90585038",
    "sexo": "M",
    "grado": "2.do grado",
    "seccion": "Única",
    "estado": "Matriculado",
    "anio": 2026,
    "registrado_por": "Nómina SIAGIE 2026",
    "id": 29,
    "completo": 1,
    "segundos": 0
  },
  {
    "codigo": "EST-2026-0030",
    "nombres": "PEDRO FERNANDO",
    "apellidos": "LEVANO PACHAS",
    "dni": "90736452",
    "sexo": "M",
    "grado": "2.do grado",
    "seccion": "Única",
    "estado": "Matriculado",
    "anio": 2026,
    "registrado_por": "Nómina SIAGIE 2026",
    "id": 30,
    "completo": 1,
    "segundos": 0
  },
  {
    "codigo": "EST-2026-0031",
    "nombres": "HANS EMIR",
    "apellidos": "MENDOZA MUNAYCO",
    "dni": "91244803",
    "sexo": "M",
    "grado": "2.do grado",
    "seccion": "Única",
    "estado": "Matriculado",
    "anio": 2026,
    "registrado_por": "Nómina SIAGIE 2026",
    "id": 31,
    "completo": 1,
    "segundos": 0
  },
  {
    "codigo": "EST-2026-0032",
    "nombres": "MIA CELESTE",
    "apellidos": "MENESES PACHAS",
    "dni": "90743896",
    "sexo": "F",
    "grado": "2.do grado",
    "seccion": "Única",
    "estado": "Matriculado",
    "anio": 2026,
    "registrado_por": "Nómina SIAGIE 2026",
    "id": 32,
    "completo": 1,
    "segundos": 0
  },
  {
    "codigo": "EST-2026-0033",
    "nombres": "SEBASTIAN ALONSO",
    "apellidos": "PANIAGUA CARTYL",
    "dni": "91162138",
    "sexo": "M",
    "grado": "2.do grado",
    "seccion": "Única",
    "estado": "Matriculado",
    "anio": 2026,
    "registrado_por": "Nómina SIAGIE 2026",
    "id": 33,
    "completo": 1,
    "segundos": 0
  },
  {
    "codigo": "EST-2026-0034",
    "nombres": "JULIAN ALFONSO",
    "apellidos": "RAMOS ALMEYDA",
    "dni": "91109754",
    "sexo": "M",
    "grado": "2.do grado",
    "seccion": "Única",
    "estado": "Matriculado",
    "anio": 2026,
    "registrado_por": "Nómina SIAGIE 2026",
    "id": 34,
    "completo": 1,
    "segundos": 0
  },
  {
    "codigo": "EST-2026-0035",
    "nombres": "EMILIANO JOAQUIN",
    "apellidos": "ABURTO CAMBAR",
    "dni": "90370542",
    "sexo": "M",
    "grado": "3.er grado",
    "seccion": "Única",
    "estado": "Matriculado",
    "anio": 2026,
    "registrado_por": "Nómina SIAGIE 2026",
    "id": 35,
    "completo": 1,
    "segundos": 0
  },
  {
    "codigo": "EST-2026-0036",
    "nombres": "DULCE VALENTINA",
    "apellidos": "FLORES AYALA",
    "dni": "90676655",
    "sexo": "F",
    "grado": "3.er grado",
    "seccion": "Única",
    "estado": "Matriculado",
    "anio": 2026,
    "registrado_por": "Nómina SIAGIE 2026",
    "id": 36,
    "completo": 1,
    "segundos": 0
  },
  {
    "codigo": "EST-2026-0037",
    "nombres": "IVANNA ISABELLA",
    "apellidos": "FUENTES MATIAS",
    "dni": "90423168",
    "sexo": "F",
    "grado": "3.er grado",
    "seccion": "Única",
    "estado": "Matriculado",
    "anio": 2026,
    "registrado_por": "Nómina SIAGIE 2026",
    "id": 37,
    "completo": 1,
    "segundos": 0
  },
  {
    "codigo": "EST-2026-0038",
    "nombres": "DEREK ALDAIR",
    "apellidos": "TARAZONA MENDOZA",
    "dni": "90527656",
    "sexo": "M",
    "grado": "3.er grado",
    "seccion": "Única",
    "estado": "Matriculado",
    "anio": 2026,
    "registrado_por": "Nómina SIAGIE 2026",
    "id": 38,
    "completo": 1,
    "segundos": 0
  },
  {
    "codigo": "EST-2026-0039",
    "nombres": "LEANDRA ANGELICA",
    "apellidos": "AGUILAR ORTIZ",
    "dni": "79984317",
    "sexo": "F",
    "grado": "4.to grado",
    "seccion": "Única",
    "estado": "Matriculado",
    "anio": 2026,
    "registrado_por": "Nómina SIAGIE 2026",
    "id": 39,
    "completo": 1,
    "segundos": 0
  },
  {
    "codigo": "EST-2026-0040",
    "nombres": "MIHAL KAORI",
    "apellidos": "ATUNCAR RUIZ",
    "dni": "79790537",
    "sexo": "F",
    "grado": "4.to grado",
    "seccion": "Única",
    "estado": "Matriculado",
    "anio": 2026,
    "registrado_por": "Nómina SIAGIE 2026",
    "id": 40,
    "completo": 1,
    "segundos": 0
  },
  {
    "codigo": "EST-2026-0041",
    "nombres": "VICTOR ADRIANO RAUL",
    "apellidos": "CAHUA ORELLANA",
    "dni": "79979608",
    "sexo": "M",
    "grado": "4.to grado",
    "seccion": "Única",
    "estado": "Matriculado",
    "anio": 2026,
    "registrado_por": "Nómina SIAGIE 2026",
    "id": 41,
    "completo": 1,
    "segundos": 0
  },
  {
    "codigo": "EST-2026-0042",
    "nombres": "LIVANNA TATIANA",
    "apellidos": "CAMAC CHAVEZ",
    "dni": "90102514",
    "sexo": "F",
    "grado": "4.to grado",
    "seccion": "Única",
    "estado": "Matriculado",
    "anio": 2026,
    "registrado_por": "Nómina SIAGIE 2026",
    "id": 42,
    "completo": 1,
    "segundos": 0
  },
  {
    "codigo": "EST-2026-0043",
    "nombres": "VALERIA FERNANDA",
    "apellidos": "GENTILLE PASTOR",
    "dni": "90118381",
    "sexo": "F",
    "grado": "4.to grado",
    "seccion": "Única",
    "estado": "Matriculado",
    "anio": 2026,
    "registrado_por": "Nómina SIAGIE 2026",
    "id": 43,
    "completo": 1,
    "segundos": 0
  },
  {
    "codigo": "EST-2026-0044",
    "nombres": "CARLOS AARON",
    "apellidos": "LEVANO MORENO",
    "dni": "79990495",
    "sexo": "M",
    "grado": "4.to grado",
    "seccion": "Única",
    "estado": "Matriculado",
    "anio": 2026,
    "registrado_por": "Nómina SIAGIE 2026",
    "id": 44,
    "completo": 1,
    "segundos": 0
  },
  {
    "codigo": "EST-2026-0045",
    "nombres": "JHERICO ALEXANDER",
    "apellidos": "MAGALLANES DE LA CRUZ",
    "dni": "79930225",
    "sexo": "M",
    "grado": "4.to grado",
    "seccion": "Única",
    "estado": "Matriculado",
    "anio": 2026,
    "registrado_por": "Nómina SIAGIE 2026",
    "id": 45,
    "completo": 1,
    "segundos": 0
  },
  {
    "codigo": "EST-2026-0046",
    "nombres": "SANTIAGO ALDEMIR",
    "apellidos": "MAGALLANES TASAYCO",
    "dni": "79614366",
    "sexo": "M",
    "grado": "4.to grado",
    "seccion": "Única",
    "estado": "Matriculado",
    "anio": 2026,
    "registrado_por": "Nómina SIAGIE 2026",
    "id": 46,
    "completo": 1,
    "segundos": 0
  },
  {
    "codigo": "EST-2026-0047",
    "nombres": "ADRIANO GAEL",
    "apellidos": "QUISPE MAGALLANES",
    "dni": "79708505",
    "sexo": "M",
    "grado": "4.to grado",
    "seccion": "Única",
    "estado": "Matriculado",
    "anio": 2026,
    "registrado_por": "Nómina SIAGIE 2026",
    "id": 47,
    "completo": 1,
    "segundos": 0
  },
  {
    "codigo": "EST-2026-0048",
    "nombres": "BELEN GUADALUPE",
    "apellidos": "RAMOS ALMEYDA",
    "dni": "90011725",
    "sexo": "F",
    "grado": "4.to grado",
    "seccion": "Única",
    "estado": "Matriculado",
    "anio": 2026,
    "registrado_por": "Nómina SIAGIE 2026",
    "id": 48,
    "completo": 1,
    "segundos": 0
  },
  {
    "codigo": "EST-2026-0049",
    "nombres": "SOFIA CATALINA",
    "apellidos": "RAMOS ALMEYDA",
    "dni": "90011704",
    "sexo": "F",
    "grado": "4.to grado",
    "seccion": "Única",
    "estado": "Matriculado",
    "anio": 2026,
    "registrado_por": "Nómina SIAGIE 2026",
    "id": 49,
    "completo": 1,
    "segundos": 0
  },
  {
    "codigo": "EST-2026-0050",
    "nombres": "ALONDRA VANESA",
    "apellidos": "ROJAS CARBAJAL",
    "dni": "90027909",
    "sexo": "F",
    "grado": "4.to grado",
    "seccion": "Única",
    "estado": "Matriculado",
    "anio": 2026,
    "registrado_por": "Nómina SIAGIE 2026",
    "id": 50,
    "completo": 1,
    "segundos": 0
  },
  {
    "codigo": "EST-2026-0051",
    "nombres": "MIGUEL TADEO",
    "apellidos": "TASAYCO ESPINOZA",
    "dni": "79879146",
    "sexo": "M",
    "grado": "4.to grado",
    "seccion": "Única",
    "estado": "Matriculado",
    "anio": 2026,
    "registrado_por": "Nómina SIAGIE 2026",
    "id": 51,
    "completo": 1,
    "segundos": 0
  },
  {
    "codigo": "EST-2026-0052",
    "nombres": "HERMES SANTIAGO",
    "apellidos": "ANTON ALMEYDA",
    "dni": "79592170",
    "sexo": "M",
    "grado": "5.to grado",
    "seccion": "Única",
    "estado": "Matriculado",
    "anio": 2026,
    "registrado_por": "Nómina SIAGIE 2026",
    "id": 52,
    "completo": 1,
    "segundos": 0
  },
  {
    "codigo": "EST-2026-0053",
    "nombres": "WILLIAMS ALEXANDER",
    "apellidos": "ASTORAYME SARAVIA",
    "dni": "79410027",
    "sexo": "M",
    "grado": "5.to grado",
    "seccion": "Única",
    "estado": "Matriculado",
    "anio": 2026,
    "registrado_por": "Nómina SIAGIE 2026",
    "id": 53,
    "completo": 1,
    "segundos": 0
  },
  {
    "codigo": "EST-2026-0054",
    "nombres": "GABRIEL ISAIAS",
    "apellidos": "ATUNCAR HUAROTO",
    "dni": "79364072",
    "sexo": "M",
    "grado": "5.to grado",
    "seccion": "Única",
    "estado": "Matriculado",
    "anio": 2026,
    "registrado_por": "Nómina SIAGIE 2026",
    "id": 54,
    "completo": 1,
    "segundos": 0
  },
  {
    "codigo": "EST-2026-0055",
    "nombres": "MAX EMIR",
    "apellidos": "CARRERA ROJAS",
    "dni": "79581346",
    "sexo": "M",
    "grado": "5.to grado",
    "seccion": "Única",
    "estado": "Matriculado",
    "anio": 2026,
    "registrado_por": "Nómina SIAGIE 2026",
    "id": 55,
    "completo": 1,
    "segundos": 0
  },
  {
    "codigo": "EST-2026-0056",
    "nombres": "NAYLETH EMILIA",
    "apellidos": "FAJARDO CAYO",
    "dni": "79428691",
    "sexo": "F",
    "grado": "5.to grado",
    "seccion": "Única",
    "estado": "Matriculado",
    "anio": 2026,
    "registrado_por": "Nómina SIAGIE 2026",
    "id": 56,
    "completo": 1,
    "segundos": 0
  },
  {
    "codigo": "EST-2026-0057",
    "nombres": "VICTOR MANUEL",
    "apellidos": "GONZALES PEÑALOZA",
    "dni": "79570616",
    "sexo": "M",
    "grado": "5.to grado",
    "seccion": "Única",
    "estado": "Matriculado",
    "anio": 2026,
    "registrado_por": "Nómina SIAGIE 2026",
    "id": 57,
    "completo": 1,
    "segundos": 0
  },
  {
    "codigo": "EST-2026-0058",
    "nombres": "TATIANA JAZMIN",
    "apellidos": "HUALLANCA DE LA CRUZ",
    "dni": "79257088",
    "sexo": "F",
    "grado": "5.to grado",
    "seccion": "Única",
    "estado": "Matriculado",
    "anio": 2026,
    "registrado_por": "Nómina SIAGIE 2026",
    "id": 58,
    "completo": 1,
    "segundos": 0
  },
  {
    "codigo": "EST-2026-0059",
    "nombres": "MILAGROS THAIS",
    "apellidos": "MENESES PACHAS",
    "dni": "79248585",
    "sexo": "F",
    "grado": "5.to grado",
    "seccion": "Única",
    "estado": "Matriculado",
    "anio": 2026,
    "registrado_por": "Nómina SIAGIE 2026",
    "id": 59,
    "completo": 1,
    "segundos": 0
  },
  {
    "codigo": "EST-2026-0060",
    "nombres": "DIEGO JOAQUIN",
    "apellidos": "TIPICIANO MONTES",
    "dni": "79372542",
    "sexo": "M",
    "grado": "5.to grado",
    "seccion": "Única",
    "estado": "Matriculado",
    "anio": 2026,
    "registrado_por": "Nómina SIAGIE 2026",
    "id": 60,
    "completo": 1,
    "segundos": 0
  },
  {
    "codigo": "EST-2026-0061",
    "nombres": "CARLITA VALENTINA",
    "apellidos": "ABREGU MENESES",
    "dni": "81443069",
    "sexo": "F",
    "grado": "6.to grado",
    "seccion": "Única",
    "estado": "Matriculado",
    "anio": 2026,
    "registrado_por": "Nómina SIAGIE 2026",
    "id": 61,
    "completo": 1,
    "segundos": 0
  },
  {
    "codigo": "EST-2026-0062",
    "nombres": "JOSE ANTONIO",
    "apellidos": "CHACALTANA CASTILLA",
    "dni": "78991503",
    "sexo": "M",
    "grado": "6.to grado",
    "seccion": "Única",
    "estado": "Matriculado",
    "anio": 2026,
    "registrado_por": "Nómina SIAGIE 2026",
    "id": 62,
    "completo": 1,
    "segundos": 0
  },
  {
    "codigo": "EST-2026-0063",
    "nombres": "BRUNO FRANCESCO",
    "apellidos": "FLORES RACUA",
    "dni": "81443073",
    "sexo": "M",
    "grado": "6.to grado",
    "seccion": "Única",
    "estado": "Matriculado",
    "anio": 2026,
    "registrado_por": "Nómina SIAGIE 2026",
    "id": 63,
    "completo": 1,
    "segundos": 0
  },
  {
    "codigo": "EST-2026-0064",
    "nombres": "MARCO FABRICIO",
    "apellidos": "HUASASQUICHE ALMEYDA",
    "dni": "78620457",
    "sexo": "M",
    "grado": "6.to grado",
    "seccion": "Única",
    "estado": "Matriculado",
    "anio": 2026,
    "registrado_por": "Nómina SIAGIE 2026",
    "id": 64,
    "completo": 1,
    "segundos": 0
  },
  {
    "codigo": "EST-2026-0065",
    "nombres": "KARLA CAROLINA",
    "apellidos": "PEREZ PACHAS",
    "dni": "78712327",
    "sexo": "F",
    "grado": "6.to grado",
    "seccion": "Única",
    "estado": "Matriculado",
    "anio": 2026,
    "registrado_por": "Nómina SIAGIE 2026",
    "id": 65,
    "completo": 1,
    "segundos": 0
  }
],
};
