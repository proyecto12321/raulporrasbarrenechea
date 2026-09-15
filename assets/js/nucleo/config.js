/* =====================================================================
   CONFIGURACIÓN CENTRAL
   I.E.P. Raúl Porras Barrenechea — Sunampe, Chincha, Ica
   ---------------------------------------------------------------------
   Único archivo que hay que tocar al cambiar de proyecto Supabase o al
   actualizar los datos de la institución. Todo lo demás lee de aquí.

   Los textos institucionales (presentación, mensaje al padre de familia,
   frases, requisitos, costos) están transcritos del TRÍPTICO REAL del
   colegio, para que el portal y el tríptico 3D digan exactamente lo
   mismo que el impreso.
   ===================================================================== */
'use strict';

/* ---------------------------------------------------------------------
   1. CONEXIÓN CON SUPABASE
   ---------------------------------------------------------------------
   Aquí va SOLO la clave publicable (sb_publishable_…). Está hecha para
   viajar dentro del navegador: cualquiera puede verla y eso no es un
   problema, porque lo que protege los datos son las políticas RLS del
   servidor (sql/05_seguridad_rls.sql), no el secreto de la clave.

   La "secret key" (sb_secret_…) NO va nunca aquí ni en ningún archivo
   del sitio: esa es la llave de administrador y quien la tenga puede
   leer y borrar toda la base saltándose el login. Se usa solo desde un
   servidor propio, y este sistema no tiene uno.
   --------------------------------------------------------------------- */
const SUPABASE_URL  = 'https://zbldoikstvhozufbepet.supabase.co';
const SUPABASE_ANON = 'sb_publishable_Eh-_3ZwxivVoauU862eLiA_eF8EYKWg';

/* ---------------------------------------------------------------------
   DE DÓNDE SALEN LOS DATOS
   ---------------------------------------------------------------------
   'supabase'  — el sistema trabaja contra la base en la nube, así que
                 lo que registra una persona lo ve el resto, desde
                 cualquier computadora o celular. Antes hay que haber
                 ejecutado los archivos de sql/ en el proyecto.

   'local'     — trabaja contra el navegador, con el padrón cargado de
                 semilla.js. Sirve para presentar sin internet.

   En 'supabase' el sistema NO se cae si la nube falla: BaseLocal.conRespaldo
   reintenta, y si el problema es de infraestructura (sin internet, esquema
   viejo, clave mal puesta) sigue trabajando contra el navegador y lo avisa
   en pantalla. Lo que nunca hace es tragarse un error de negocio —un DNI
   repetido, un permiso denegado— porque eso sí tiene que verse.
   --------------------------------------------------------------------- */
const FUENTE_DATOS = 'supabase';

const clienteRemoto = (window.supabase && window.supabase.createClient)
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
      auth: { persistSession: false, autoRefreshToken: false },
      /* Tiempo real moderado: 2 eventos por segundo alcanzan de sobra
         para un colegio de 65 estudiantes y evitan saturar la conexión
         (y el plan gratuito) si alguien deja el panel abierto todo el
         día. */
      realtime: { params: { eventsPerSecond: 2 } },
      global: { headers: { 'x-sistema': 'RPB' } },
      db: { schema: 'public' },
    })
  : null;

/* Cliente único para toda la aplicación. */
const db = (FUENTE_DATOS === 'supabase' && clienteRemoto)
  ? BaseLocal.conRespaldo(clienteRemoto, () => {
      /* Aviso visible: nadie debe creer que está guardando en la nube
         cuando en realidad está guardando en su navegador. */
      document.documentElement.setAttribute('data-fuente', 'local');
    })
  : BaseLocal.cliente();

/* Marca la procedencia real de los datos desde el primer momento.
   Hay dos maneras de acabar trabajando contra el navegador:
     · el sistema está puesto en 'local' a propósito, o
     · está puesto en 'supabase' pero la librería no llegó a cargar
       (sin internet, o el CDN bloqueado en esa red).
   El segundo caso es el peligroso, porque todo parece funcionar. Por eso
   se marca igual que el primero, y el panel muestra el aviso de que lo
   que se está guardando vive en este navegador y no en la nube. */
if (FUENTE_DATOS !== 'supabase' || !clienteRemoto){
  document.documentElement.setAttribute('data-fuente', 'local');
  if (FUENTE_DATOS === 'supabase' && !clienteRemoto){
    document.documentElement.setAttribute('data-motivo-local', 'sin-libreria');
    console.warn(
      '[Config] No se pudo cargar la librería de Supabase, así que el sistema ' +
      'trabaja contra este navegador. Revisa la conexión a internet o que la red ' +
      'no esté bloqueando cdn.jsdelivr.net.');
  }
}

/* ---------------------------------------------------------------------
   2. IDENTIDAD DE LA INSTITUCIÓN
   --------------------------------------------------------------------- */
const IE = {
  nombre:       'I.E.P. Raúl Porras Barrenechea',
  nombre_corto: 'Raúl Porras Barrenechea',
  siglas:       'RPB',
  niveles_texto:'Jardín · Primaria',
  lema:         'Todo por amor, nada por la fuerza',
  promesa:      'Formación con valores, líderes para el futuro',
  ideal:        'Mejorar la vida de los demás a través de la educación',
  hashtag:      '#JuntosCambiaremosLaHistoria',

  distrito:  'Sunampe',
  provincia: 'Chincha',
  region:    'Ica',
  direccion: 'Calle Los Libertadores N.° 378 – Sunampe',
  telefono:  '956070856',
  correo:    'iep.raulporrasbarrenechea@gmail.com',

  /* Dirección de la institución. Los datos salen del membrete y de la
     firma de las constancias reales del colegio. */
  directora:     'Elizabeth Almeyda Matías',
  dni_directora: '41251702',
  cargo_dir:     'Directora de la IEPr. RAÚL PORRAS BARRENECHEA',

  /* Membrete oficial (tal como aparece impreso en los documentos) */
  encabezado_1:  'INSTITUCIÓN EDUCATIVA PRIVADA',
  encabezado_2:  'Raúl Porras Barrenechea',
  resoluciones:  'R.D. 02046  -  R.D. N° 01750',
  niveles_doc:   'INICIAL – PRIMARIA',
  direccion_doc: 'Av. Los Libertadores N° 378 – Sunampe',

  modular_inicial: '1424589',
  modular_primaria:'1425164',
  ugel:      'UGEL Chincha',

  anio: 2026,

  /* --- Cifras del contador de la portada --- */
  anios_servicio: 26,      // años de servicio a la comunidad
  docentes:       10,      // plana docente calificada (cifra institucional)
  aforo_aula:     12,      // "Aula para 12 alumnos por ambiente" (tríptico)

  costo_matricula:  300.00,
  pension_inicial:  300.00,
  pension_primaria: 330.00,
  mensualidades:    10,

  horario_clases:   '8:00 a. m. – 2:00 p. m.',
  horario_atencion: '8:00 a. m. – 1:00 p. m., de lunes a viernes',

  version_sistema: '3.2',
};

/* ---------------------------------------------------------------------
   3. ROLES Y PERMISOS
   --------------------------------------------------------------------- */
const ROLES = {
  director: {
    nombre: 'Dirección', panel: 'direccion.html', color: 'l-marino', icono: '🎓',
    permisos: ['ver_todo','aprobar','publicar','reportar','auditar','personal'],
  },
  administrativo: {
    nombre: 'Personal administrativo', panel: 'administrativo.html', color: 'l-azul', icono: '🗂️',
    permisos: ['matricular','estudiantes','documentos','constancias','publicar','reportar','solicitudes','pagos'],
  },
  docente: {
    nombre: 'Docente', panel: 'docente.html', color: 'l-oro', icono: '📘',
    permisos: ['mi_aula','notas','tareas','asistencia','mensajes','reportar'],
  },
  estudiante: {
    nombre: 'Estudiante', panel: 'estudiante.html', color: 'l-oro', icono: '🎒',
    permisos: ['mis_notas','mis_tareas','mi_ficha','comunicados'],
  },
  soporte: {
    nombre: 'Soporte técnico', panel: 'soporte.html', color: 'l-morado', icono: '🛠️',
    permisos: ['tickets','cuentas','auditar','respaldos','salud'],
  },
};

/* ---------------------------------------------------------------------
   4. CATÁLOGOS DEL SISTEMA
   --------------------------------------------------------------------- */
const NIVELES = ['Inicial', 'Primaria'];

/* Organización real del colegio: 3 y 4 años comparten ambiente, 5 años
   tiene el suyo, y Primaria va un grado por aula. */
const GRADOS = [
  'Inicial 3 y 4 años','Inicial 5 años',
  '1.er grado','2.do grado','3.er grado','4.to grado','5.to grado','6.to grado',
];

/* Los grados agrupados para mostrarlos en el portal. */
const BLOQUES_GRADO = [
  { titulo:'Inicial', detalle:'De 3 a 5 años, en dos ambientes',
    grados:['Inicial 3 y 4 años','Inicial 5 años'] },
  { titulo:'Primaria', detalle:'De 1.° a 6.° grado, un aula por grado',
    grados:['1.er grado','2.do grado','3.er grado','4.to grado','5.to grado','6.to grado'] },
];

const BIMESTRES = ['I', 'II', 'III', 'IV'];

const CURSOS_INICIAL = [
  'Personal Social','Psicomotricidad','Comunicación','Matemática',
  'Ciencia y Tecnología','Religión','Inglés','Computación',
];
const CURSOS_PRIMARIA = [
  'Comunicación','Matemática','Personal Social','Ciencia y Tecnología',
  'Arte y Cultura','Educación Física','Educación Religiosa','Inglés','Computación','Tutoría',
];

/* Escala de calificación del MINEDU */
const ESCALA = [
  { min:18, max:20, literal:'AD', nombre:'Logro destacado',  clase:'ad' },
  { min:14, max:17, literal:'A',  nombre:'Logro esperado',   clase:'a'  },
  { min:11, max:13, literal:'B',  nombre:'En proceso',       clase:'b'  },
  { min:0,  max:10, literal:'C',  nombre:'En inicio',        clase:'c'  },
];

const ESTADOS_ESTUDIANTE = ['Matriculado','Retirado','Trasladado','Egresado'];
const ESTADOS_ASISTENCIA = ['Presente','Tardanza','Falta','Justificado'];
const ESTADOS_SOLICITUD  = ['Pendiente','En revisión','Aprobada','Rechazada'];
const ESTADOS_TICKET     = ['Abierto','En proceso','Resuelto','Cerrado'];
const PRIORIDADES        = ['Alta','Media','Baja'];
const TIPOS_DOCUMENTO    = ['Oficio','Informe','Solicitud','Acta','Memorándum','Constancia','Ficha de matrícula','Otro'];
const CONCEPTOS_PAGO     = ['Matrícula','Pensión','Certificado','Constancia','Otro'];

/* ---------------------------------------------------------------------
   5. REGLAS DE SEGURIDAD DEL ACCESO
   --------------------------------------------------------------------- */
const SEGURIDAD = {
  intentos_maximos: 5,
  minutos_bloqueo: 5,
  ventana_intentos_min: 15,
  minutos_inactividad: 45,
  pbkdf2_iteraciones: 150000,
  largo_minimo_clave: 8,
};

/* ---------------------------------------------------------------------
   6. CONTENIDO INSTITUCIONAL (transcrito del tríptico impreso)
   --------------------------------------------------------------------- */

/* Requisitos de matrícula */
const REQUISITOS_MATRICULA = [
  'Partida de nacimiento original (3 años).',
  'Copia del carné de vacunas.',
  'Tamizaje de hemoglobina (Inicial).',
  'Copia del DNI o C.I.P. del padre o apoderado.',
  'Copia del DNI del niño o niña.',
  'Resolución de traslado de la otra institución.',
  'Ficha única de matrícula (SIAGIE).',
  'Tener la edad cumplida hasta el mes de marzo.',
];

/* Lo que ofrece el colegio (bloque "VACANTES LIMITADAS" del tríptico) */
const VENTAJAS = [
  { icono:'👧', titulo:'Aulas de 12 estudiantes',   detalle:'Un ambiente por aula, con atención personalizada para cada niño.' },
  { icono:'📺', titulo:'Aulas equipadas',            detalle:'Material audiovisual en todas las aulas: TV, DVD y CD.' },
  { icono:'🏛️', titulo:'Infraestructura antisísmica', detalle:'Moderna y cómoda, pensada para la seguridad de los estudiantes.' },
  { icono:'🎓', titulo:'Profesoras tituladas',       detalle:'Plana docente calificada, con experiencia en colegios nacionales y particulares.' },
  { icono:'📅', titulo:'10 mensualidades al año',    detalle:'Sin cobros sorpresa: matrícula y diez pensiones, nada más.' },
  { icono:'💻', titulo:'Talleres de cómputo y danza', detalle:'Formación integral más allá del aula.' },
];

/* Historia del colegio */
const HISTORIA = {
  entrada:
    'La I.E.P. Raúl Porras Barrenechea se caracteriza por brindar un mejor ' +
    'servicio educativo a la comunidad de Sunampe durante 26 años consecutivos, ' +
    'donde la base del éxito es el amor como la primera y la última palabra en ' +
    'el método educativo. Para nuestra institución, esto es la educación de corazón.',
  meta:
    'Nuestra meta con los niños y jóvenes es inculcarles el trabajo, el ' +
    'cumplimiento del deber, la honradez, la responsabilidad y la competencia ' +
    'en el propio oficio. El ideal del educador es ser luz y guía de los niños ' +
    'y de los jóvenes, esperanza de Dios y de la Patria.',
  hitos: [
    { anio:'2000', titulo:'Abren las puertas',        detalle:'Nace la institución en Sunampe con el nivel Inicial y un puñado de familias que confían en el proyecto.' },
    { anio:'2005', titulo:'Llega la Primaria',        detalle:'Se amplía el servicio de 1.er a 6.to grado para acompañar a los estudiantes durante toda la etapa escolar.' },
    { anio:'2012', titulo:'Aulas equipadas',          detalle:'Se implementa material audiovisual en cada ambiente y se abre el taller de cómputo.' },
    { anio:'2018', titulo:'Infraestructura antisísmica', detalle:'Se renueva el local con una construcción moderna, cómoda y segura.' },
    { anio:'2023', titulo:'Aulas de 12 estudiantes',  detalle:'Se limita el aforo por ambiente para garantizar la enseñanza personalizada que distingue al colegio.' },
    { anio:'2026', titulo:'Gestión en línea',         detalle:'Entra en servicio este sistema: matrícula, notas, comunicados y reportes en una sola plataforma.' },
  ],
};

/* Mensaje al padre de familia (texto del tríptico) */
const MENSAJE_PADRES =
  'Sr. Padre de Familia: permítame distraer unos minutos de su valioso tiempo ' +
  'para hacerle recordar que la mejor herencia de los padres es la educación. ' +
  'Pensando en ellos ponemos 26 años a su servicio la Institución Educativa ' +
  '"Raúl Porras Barrenechea", donde sus hijos podrán estudiar desde la ' +
  'Educación Inicial y Primaria, que sienta las bases sólidas para sus ' +
  'posteriores estudios.';

/* Cómo puede reforzar la familia en casa (texto del tríptico) */
const REFUERZO_CASA = [
  'Leer anuncios en periódicos y revistas.',
  'Aprender las señales de tráfico y respetarlas como es debido.',
  'Elegir buenos programas de televisión y hacer un plan semanal.',
  'Influenciarle valores para la vida y para un desarrollo íntegro, con mucho respeto y amor hacia sus semejantes.',
  'Preparar a sus niños para el futuro.',
  'Recordar que la educación es la mejor herencia.',
];

/* Frases del tríptico, para el carrusel de citas */
const FRASES = [
  'Mejorar la vida de los demás a través de la educación.',
  'Mientras más difícil se haga el camino, Dios multiplicará mis fuerzas; y mientras más fuertes se hagan mis pruebas, más grande será mi victoria.',
  'La enseñanza que deja huella no es la que se hace de cabeza a cabeza, sino de corazón a corazón.',
  'Todo por amor, nada por la fuerza.',
];

/* ---------------------------------------------------------------------
   7. LUGARES DE LA INSTITUCIÓN (carrusel del portal)
   ---------------------------------------------------------------------
   'archivo' apunta a assets/img/. Si dejas el archivo vacío o el nombre
   no existe, el carrusel dibuja una portada tipográfica en su lugar, así
   que puedes ir reemplazando las fotos poco a poco sin romper nada.
   --------------------------------------------------------------------- */
/* ---------------------------------------------------------------------
   LOS LUGARES DE LA INSTITUCIÓN
   ---------------------------------------------------------------------
   Los siete ambientes reales del colegio. Cada uno espera su foto en
   assets/img/ con el nombre que dice 'archivo': en cuanto el archivo
   exista, aparece sola, sin tocar una línea de código. Mientras no esté,
   se ve el recuadro con el nombre del lugar y el del archivo que falta.

   Tamaño recomendado: 1200 × 900 px (4:3), JPG de menos de 300 KB.
   --------------------------------------------------------------------- */
const LUGARES = [
  { nombre:'Patio principal',      detalle:'Donde se forma cada mañana y se hacen las actuaciones.',
    icono:'🚩', archivo:'lugar_patio.jpg' },
  { nombre:'Patio de juegos',      detalle:'El recreo de los más pequeños, con juegos y sombra.',
    icono:'🛝', archivo:'lugar_patio_juegos.jpg' },
  { nombre:'Aula de computación',  detalle:'El taller de cómputo, con una computadora por grupo.',
    icono:'💻', archivo:'lugar_computo.jpg' },
  { nombre:'Primer piso',          detalle:'Dirección, secretaría y las aulas del nivel Inicial.',
    icono:'1️⃣', archivo:'lugar_primer_piso.jpg' },
  { nombre:'Segundo piso',         detalle:'Las aulas de Primaria, de 1.° a 6.° grado.',
    icono:'2️⃣', archivo:'lugar_segundo_piso.jpg' },
  { nombre:'Escalera grande',      detalle:'La escalera principal, la que conecta los dos pisos.',
    icono:'🪜', archivo:'lugar_escalera_grande.jpg' },
  { nombre:'Escalera pequeña',     detalle:'La escalera de servicio, hacia el patio de atrás.',
    icono:'🪜', archivo:'lugar_escalera_pequena.jpg' },
];


/* ---------------------------------------------------------------------
   8. TRÍPTICO — contenido de los seis paneles
   ---------------------------------------------------------------------
   Se dibuja en 3D con CSS (no es una imagen). Cada cara corresponde a un
   panel del folleto impreso.
   --------------------------------------------------------------------- */
const TRIPTICO = {
  exterior: [
    {
      clase:'cara-portada',
      titulo:'Matrícula abierta',
      destacado:'2026',
      lista:[
        'Aula para 12 alumnos por ambiente.',
        'Todas las aulas equipadas con material audiovisual: TV, DVD y CD.',
        'Moderna y cómoda infraestructura antisísmica.',
        'Profesoras tituladas, enseñanza personalizada.',
        '10 mensualidades al año.',
      ],
      rotulo:'Vacantes limitadas',
    },
    {
      clase:'cara-niveles',
      titulo:'Niveles y talleres',
      bloques:[
        { rotulo:'Nivel Inicial',  texto:'3, 4 y 5 años' },
        { rotulo:'Nivel Primaria', texto:'1.° a 6.° grado' },
        { rotulo:'Talleres',       texto:'Cómputo y danza' },
      ],
      cita:'La enseñanza que deja huella no es la que se hace de cabeza a cabeza, sino de corazón a corazón.',
    },
    {
      clase:'cara-contacto',
      titulo:'Requisitos y contacto',
      lista:[
        'Partida de nacimiento original (3 años).',
        'Copia del carné de vacunas.',
        'Tamizaje de hemoglobina (Inicial).',
        'Copia del DNI del apoderado y del niño.',
        'Resolución de traslado, si viene de otra institución.',
        'Ficha única de matrícula (SIAGIE).',
        'Edad cumplida hasta el mes de marzo.',
      ],
      contacto:true,
    },
  ],
  interior: [
    {
      clase:'cara-presentacion',
      titulo:'Presentación',
      parrafos:[
        'Se caracteriza por brindar un mejor servicio educativo a la comunidad durante 26 años consecutivos.',
        'La base del éxito es el amor como la primera y la última palabra en el método educativo: para nuestra institución, es la educación de corazón.',
        'Contamos con una plana docente altamente calificada y con experiencia en colegios nacionales y particulares.',
      ],
      precios:true,
      cita:'Mejorar la vida de los demás a través de la educación.',
    },
    {
      clase:'cara-padres',
      titulo:'Sr. Padre de Familia',
      parrafos:[
        'Permítame distraer unos minutos de su valioso tiempo para recordarle que la mejor herencia de los padres es la educación.',
        'Pensando en ellos ponemos 26 años a su servicio la Institución Educativa "Raúl Porras Barrenechea", donde sus hijos podrán estudiar desde Inicial y Primaria.',
      ],
      cita:'Mientras más difícil se haga el camino, Dios multiplicará mis fuerzas; y mientras más fuertes se hagan mis pruebas, más grande será mi victoria.',
    },
    {
      clase:'cara-refuerzo',
      titulo:'Refuerce en casa',
      intro:'Ustedes, mamás y papás, pueden reforzar lo que su niño ya sabe ayudándole a:',
      lista:REFUERZO_CASA,
      cita:'Todo por amor, nada por la fuerza.',
    },
  ],
};

/* ---------------------------------------------------------------------
   9. RUTAS
   --------------------------------------------------------------------- */
const RUTA = {
  base(){ return location.pathname.includes('/app/') ? '../' : ''; },
  img(archivo){ return RUTA.base() + 'assets/img/' + archivo; },
  panel(rol){
    const p = (ROLES[rol] && ROLES[rol].panel) || 'estudiante.html';
    return location.pathname.includes('/app/') ? p : 'app/' + p;
  },
  /* Los dos accesos están en páginas separadas a propósito. */
  acceso(){ return RUTA.base() + 'acceso.html'; },
  accesoEstudiante(){ return RUTA.base() + 'acceso-estudiante.html'; },
  accesoPersonal(){ return RUTA.base() + 'acceso-personal.html'; },
  portal(){ return RUTA.base() + 'index.html'; },
};
