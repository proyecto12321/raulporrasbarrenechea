/* =====================================================================
   ASISTENTE VIRTUAL  (indicador 3 — fluidez de la comunicación)
   ---------------------------------------------------------------------
   Motor por reglas, sin servicios externos ni costo por consulta.

   Cómo entiende:
     1. Normaliza el texto (minúsculas, sin tildes, sin signos).
     2. Lo parte en palabras y descarta las vacías ("el", "de", "que"…).
     3. Puntúa cada intención por palabras clave, sinónimos y frases
        completas (una frase de tres palabras pesa más que una suelta).
     4. Si el puntaje más alto no despega, pide precisión en vez de
        inventar una respuesta.
     5. Recuerda la última intención, así funcionan las preguntas de
        seguimiento: "¿y de primaria?" después de preguntar por costos.

   Dónde vive:
     · Empotrado en su propia sección del portal (marco de teléfono).
     · En la burbuja flotante de todas las páginas.
     Las dos superficies comparten la misma conversación.
   ===================================================================== */
'use strict';

const Chatbot = (() => {
  const { q, esc } = U;

  /* La conversación es única; las superficies solo la dibujan. */
  const conversacion = [];
  let ultimaIntencion = null;
  let montado = { empotrado:false, flotante:false };

  /* ==================================================================
     PALABRAS QUE NO APORTAN
     ================================================================== */
  const VACIAS = new Set([
    'el','la','los','las','un','una','unos','unas','de','del','al','a','ante','con','contra',
    'en','entre','hacia','hasta','para','por','segun','sin','sobre','tras','y','o','u','que',
    'cual','cuales','como','donde','cuando','cuanto','cuanta','cuantos','cuantas','es','son',
    'esta','estan','hay','tiene','tienen','me','mi','mis','te','tu','tus','su','sus','se',
    'le','lo','yo','usted','ustedes','por favor','porfa','favor','quiero','quisiera','necesito',
    'saber','decir','dime','dices','puedo','puede','pueden','hacer','ser','estar','muy','mas',
    'ya','si','no','pero','tambien','algo','alguna','alguno','buenas','buenos','dia','dias',
  ]);

  const normalizar = t => U.sinTildes(String(t || ''))
    .replace(/[¿?¡!.,;:()"'«»]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const palabras = t => normalizar(t).split(' ').filter(p => p.length > 2 && !VACIAS.has(p));

  /* ==================================================================
     BASE DE CONOCIMIENTO
     ------------------------------------------------------------------
     claves  → palabras o frases que disparan la intención
     peso    → multiplicador (las intenciones muy específicas pesan más)
     ================================================================== */
  const INTENCIONES = [
    {
      id:'saludo', peso:1,
      claves:['hola','holaa','buenas','buen dia','buenas tardes','buenas noches','que tal',
              'saludos','hey','alo','como estas','buenos dias'],
      responder: () => ({
        texto:`¡Hola! 👋 Soy el asistente de la **${IE.nombre_corto}**.\n` +
              `Te puedo ayudar con vacantes, requisitos, costos, horarios, niveles, ` +
              `comunicados y el acceso al sistema. ¿Qué necesitas?`,
        fichas:['Vacantes','Requisitos','Costos','Horarios'],
      }),
    },

    {
      id:'vacantes', peso:1.9,
      claves:['vacante','vacantes','cupo','cupos','hay lugar','hay espacio','queda sitio',
              'disponibilidad','disponible','hay sitio','quedan lugares','matricular a mi hijo',
              'matricular a mi hija','aun hay','todavia hay'],
      responder: async (ctx) => {
        try {
          const [{ filas:grados }, { filas:alumnos }] = await Promise.all([
            Datos.grados.listar({}, { orden:'orden', asc:true }),
            Datos.estudiantes.listar({ estado:'Matriculado', anio:IE.anio }, { columnas:'id,grado' }),
          ]);
          const porGrado = U.contarPor(alumnos, 'grado');
          const lista = (grados.length ? grados : GRADOS.map(g => ({ nombre:g, vacantes:IE.aforo_aula })))
            .map(g => ({
              nombre:g.nombre,
              libres:Math.max(0, (g.vacantes || IE.aforo_aula) - (porGrado[g.nombre] || 0)),
            }));

          /* Si preguntó por un grado concreto, se responde solo por ese. */
          const pedido = detectarGrado(ctx.texto);
          if (pedido){
            const g = lista.find(x => x.nombre === pedido);
            const ocupados = porGrado[pedido] || 0;
            const cupo = (grados.find(x => x.nombre === pedido) || {}).vacantes || IE.aforo_aula;
            return {
              texto: g && g.libres
                ? `En **${pedido}** quedan **${g.libres} vacante${g.libres === 1 ? '' : 's'}** ` +
                  `de ${cupo} para ${IE.anio}. Hoy hay ${ocupados} estudiante${ocupados === 1 ? '' : 's'} matriculado${ocupados === 1 ? '' : 's'}.`
                : `En **${pedido}** ya no quedan vacantes: el aula está con sus ${cupo} estudiantes. ` +
                  `Deja tu solicitud igual, porque si se libera un cupo administración te llama.`,
              acciones:[{ texto:'Enviar mi solicitud', enlace:'matricula.html#solicitud' },
                        { texto:'Hablar con la directora', enlace:'matricula.html#entrevista' }],
              fichas:['Requisitos','Costos'],
            };
          }

          const total = lista.reduce((a, g) => a + g.libres, 0);
          if (!total) return { texto:
            'Por el momento no quedan vacantes libres en ningún grado. 😔\n' +
            'Te sugiero dejar tu solicitud en el portal: si se libera un cupo, administración te contacta.' };

          return {
            texto:`Tenemos **${total} vacantes libres** para ${IE.anio} (aulas de ${IE.aforo_aula} estudiantes):`,
            lista: lista.filter(g => g.libres > 0).map(g => `${g.nombre}: ${g.libres}`),
            cola:'Envía tu solicitud desde la sección "Matrícula" del portal y te llamamos.',
            fichas:['Requisitos','Costos'],
          };
        } catch {
          return { texto:`Trabajamos con aulas de máximo ${IE.aforo_aula} estudiantes. ` +
                         `Para confirmar vacantes llama al ${IE.telefono}.` };
        }
      },
    },

    {
      id:'requisitos', peso:1.5,
      claves:['requisito','requisitos','documento','documentos','papeles','que necesito',
              'que piden','partida','vacuna','vacunas','tamizaje','hemoglobina','inscribir',
              'que llevar','que debo traer','traer'],
      /* Si la persona nombra un grado —"requisitos para 2 grado"— la
         respuesta es solo de ese grado, no del colegio entero. */
      responder: async (ctx) => {
        const grado = detectarGrado(ctx.texto);
        if (grado) return await fichaDeGrado(grado, 'requisitos');
        return {
          texto:'Para matricular necesitas presentar en secretaría:',
          lista: REQUISITOS_MATRICULA,
          cola:`Atención de ${IE.horario_atencion}. Si me dices el grado ` +
               `(por ejemplo «requisitos para 2.do grado») te respondo solo de ese aula.`,
          fichas:['Costos','Vacantes'],
        };
      },
    },

    /* ----------------------------------------------------------------
       TODO SOBRE UN GRADO EN CONCRETO
       ----------------------------------------------------------------
       "para 3 grado", "quiero información de inicial de 5 años". El
       colegio tiene solo Inicial y Primaria, así que la ficha se arma
       con lo que existe de verdad de ese aula: su nivel, su edad, sus
       cupos de hoy, su pensión y sus cursos.
       ---------------------------------------------------------------- */
    {
      id:'info_grado', peso:1.35,
      claves:['para 1 grado','para 2 grado','para 3 grado','para 4 grado','para 5 grado','para 6 grado',
              'para primer grado','para segundo grado','para tercer grado','para cuarto grado',
              'para quinto grado','para sexto grado','informacion de','info de','quiero saber de',
              'me interesa','sobre el grado','de ese grado','en ese grado','1er grado','2do grado',
              '3er grado','4to grado','5to grado','6to grado','para inicial','de inicial'],
      responder: async (ctx) => {
        const grado = detectarGrado(ctx.texto);
        if (!grado) return {
          texto:'Dime de qué aula quieres saber y te respondo solo de esa. ' +
                'El colegio tiene **Inicial** (3, 4 y 5 años) y **Primaria** (1.° a 6.° grado).',
          fichas:['Inicial 5 años','1.er grado','3.er grado','6.to grado'],
        };
        return await fichaDeGrado(grado, 'todo');
      },
    },

    {
      id:'costos', peso:1.5,
      claves:['costo','costos','precio','precios','cuanto cuesta','cuanto es','cuanto sale',
              'pension','pensiones','mensualidad','mensualidades','pago','pagos','cuota',
              'cuotas','matricula cuesta','vale','tarifa'],
      responder: async (ctx) => {
        const t = normalizar(ctx.texto);
        /* Un grado concreto manda sobre todo lo demás. */
        const grado = detectarGrado(ctx.texto);
        if (grado) return await fichaDeGrado(grado, 'costos');

        const soloInicial  = /inicial|jardin|3 anos|4 anos|5 anos/.test(t);
        const soloPrimaria = /primaria|grado/.test(t);

        if (soloInicial && !soloPrimaria)
          return { texto:`En el nivel **Inicial** la pensión es de **${U.soles(IE.pension_inicial)}** mensuales, ` +
                         `con ${IE.mensualidades} mensualidades al año. La matrícula es de ${U.soles(IE.costo_matricula)}.` };
        if (soloPrimaria && !soloInicial)
          return { texto:`En el nivel **Primaria** la pensión es de **${U.soles(IE.pension_primaria)}** mensuales, ` +
                         `con ${IE.mensualidades} mensualidades al año. La matrícula es de ${U.soles(IE.costo_matricula)}.` };

        return {
          texto:`Costos del año escolar ${IE.anio}:`,
          lista:[
            `Matrícula (única vez): ${U.soles(IE.costo_matricula)}`,
            `Pensión Inicial: ${U.soles(IE.pension_inicial)} mensuales`,
            `Pensión Primaria: ${U.soles(IE.pension_primaria)} mensuales`,
            `${IE.mensualidades} mensualidades al año`,
          ],
          cola:`Cualquier detalle adicional lo confirma administración al ${IE.telefono}.`,
          fichas:['Requisitos','Vacantes'],
        };
      },
    },

    {
      id:'horario', peso:1.4,
      claves:['horario','horarios','hora','a que hora','que hora','entrada','salida',
              'atencion','atienden','abren','cierran','turno'],
      responder: () => ({
        texto:'Nuestros horarios:',
        lista:[
          `Clases: ${IE.horario_clases}`,
          `Atención en secretaría: ${IE.horario_atencion}`,
        ],
      }),
    },

    {
      id:'ubicacion', peso:1.4,
      claves:['donde','direccion','ubicacion','como llego','queda','local','mapa',
              'referencia','calle','avenida'],
      responder: () => ({
        texto:`Estamos en **${IE.direccion}**, ${IE.distrito} – ${IE.provincia}, ${IE.region}.`,
        lista:[`Teléfono: ${IE.telefono}`, `Atención: ${IE.horario_atencion}`],
      }),
    },

    {
      id:'niveles', peso:1.2,
      /* "grado" a secas no entra: aparece en casi cualquier pregunta
         ("¿hay vacantes en 2.do grado?") y se llevaba respuestas que eran
         de otra intención. Las frases sí, porque ahí sí se está preguntando
         por los niveles. */
      claves:['nivel','niveles','inicial','primaria','jardin',
              'que grados tienen','que grados hay','desde que edad','hasta que grado',
              'que niveles','seccion','secciones','edad','edades','cuantos alumnos por aula',
              'inicial de 3','inicial de 4','inicial de 5','3 anos','4 anos','5 anos'],
      responder: () => ({
        texto:'Atendemos dos niveles:',
        lista:[
          'Inicial: 3, 4 y 5 años',
          'Primaria: de 1.er a 6.to grado',
          `Máximo ${IE.aforo_aula} estudiantes por aula`,
          'Talleres de cómputo y danza',
        ],
        cola:'Todas las aulas están equipadas con material audiovisual (TV, DVD y CD).',
        fichas:['Vacantes','Costos'],
      }),
    },

    {
      id:'acceso', peso:1.5,
      claves:['ingresar','entrar','login','acceso','como entro','no puedo entrar',
              'iniciar sesion','usuario','plataforma','sistema'],
      responder: () => ({
        texto:'El ingreso tiene **dos puertas separadas**:',
        lista:[
          '🎒 Estudiantes: solo con su DNI (8 dígitos). No necesitan contraseña.',
          '🧑‍🏫 Docentes y personal: usuario y contraseña. La contraseña inicial es su propio DNI.',
        ],
        cola:'Si no te deja entrar, escribe "quiero abrir un ticket" y lo derivo a soporte técnico.',
        fichas:['Olvidé mi contraseña','Abrir un ticket'],
      }),
    },

    {
      id:'clave', peso:1.7,
      claves:['contraseña','contrasena','clave','password','olvide mi clave','olvide mi contrasena',
              'recuperar clave','restablecer','cambiar clave','no recuerdo mi clave'],
      responder: () => ({
        texto:'Sobre las contraseñas:',
        lista:[
          'Los **estudiantes no tienen contraseña**: entran solo con su DNI.',
          'Los **docentes y el personal** usan su **DNI como contraseña inicial** y pueden cambiarla desde su panel.',
          'Si la cambiaste y la olvidaste, soporte técnico o dirección la restablecen.',
        ],
        cola:'Puedo abrir un ticket por ti: escribe "quiero abrir un ticket".',
        fichas:['Abrir un ticket'],
      }),
    },

    {
      id:'notas', peso:1.4,
      claves:['nota','notas','calificacion','calificaciones','libreta','promedio','boleta',
              'rendimiento','como va mi hijo','como va mi hija','bimestre'],
      responder: () => {
        const s = Sesion.actual();
        if (s && s.rol === 'estudiante')
          return { texto:'Tus notas están en tu panel, sección **Mis notas**. Ahí también puedes ' +
                         'descargar tu libreta en PDF con el promedio de cada área.' };
        return { texto:'Las notas se consultan dentro del sistema: el estudiante ingresa con su DNI ' +
                       'y las ve en **Mis notas**, con el promedio por área y la libreta descargable en PDF.\n' +
                       'Los docentes las registran desde su cuaderno de notas.' };
      },
    },

    {
      id:'tareas', peso:1.3,
      claves:['tarea','tareas','deber','deberes','trabajo','entrega','entregar'],
      responder: () => ({
        texto:'Las tareas se publican en el sistema: el docente las asigna y el estudiante las ve ' +
              'en **Mis tareas** con su fecha de entrega, y puede marcarlas como entregadas.',
      }),
    },

    {
      id:'comunicados', peso:1.3,
      claves:['comunicado','comunicados','aviso','avisos','noticia','noticias','novedad',
              'novedades','anuncio','anuncios','informacion','reunion'],
      responder: async () => {
        try {
          const { filas } = await Datos.comunicados.listar({},
            { limite:3, columnas: Datos.adjuntos.columnas('comunicados') });
          const publicos = filas.filter(c => c.visible_portal !== 0);
          if (!publicos.length)
            return { texto:'Todavía no hay comunicados publicados. Aparecerán en el portal apenas dirección los publique.' };
          return {
            texto:'Últimos comunicados:',
            lista: publicos.map(c => `${c.titulo} (${U.hace(c.creado_en)})`),
            cola:'Puedes leerlos completos en la sección "Comunicados" del portal.',
          };
        } catch { return { texto:'Los comunicados están en la sección "Comunicados" del portal.' }; }
      },
    },

    {
      id:'historia', peso:1.4,
      /* "años" a secas tampoco: "inicial de 3 años" no pregunta por la
         historia del colegio. Las frases dejan clara la intención. */
      claves:['historia','aniversario','fundacion','desde cuando','antiguedad',
              'trayectoria','quien dirige','directora','director','quien es la directora',
              'cuantos anos','anos de servicio','anos tiene el colegio','desde que ano'],
      responder: (ctx) => {
        const t = normalizar(ctx.texto);
        if (/director/.test(t))
          return { texto:`La directora de la institución es **${IE.directora}**.\n` +
                         `Puedes coordinar una cita en secretaría, ${IE.horario_atencion}.` };
        return {
          texto:`Llevamos **${IE.anios_servicio} años** brindando servicio educativo a la comunidad de ${IE.distrito}.`,
          lista:[
            'La base del método es el amor: educación de corazón.',
            'Plana docente calificada, con experiencia en colegios nacionales y particulares.',
            `Directora: ${IE.directora}`,
          ],
          cola:'En la sección "Historia" del portal está la trayectoria completa, año por año.',
        };
      },
    },

    {
      id:'talleres', peso:1.4,
      claves:['taller','talleres','computo','computacion','danza','baile','deporte',
              'actividad','actividades','extracurricular'],
      responder: () => ({
        texto:'Contamos con **taller de cómputo** y **taller de danza**, además de las actividades ' +
              'cívicas y culturales del año escolar (desfiles, fiestas patrias, semana de la juventud).',
        cola:'Puedes verlos en la sección "Instalaciones" del portal.',
      }),
    },

    {
      id:'entrevista', peso:1.9,
      /* Las frases largas pesan por su número de palabras, así que
         "conversar con la directora" gana sin discusión a la intención
         "historia", que también menciona a la directora. */
      claves:['entrevista','cita','agendar',
              'entrevista con la directora','reunion con la directora','cita con la directora',
              'conversar con la directora','hablar con la directora','ver a la directora',
              'reunirme con la directora','atiende la directora','atiende la direccion',
              'hablar con direccion','quiero conversar','puedo conversar','quiero hablar',
              'necesito hablar','me pueden atender','quiero una reunion','puedo ir a conversar'],
      responder: () => ({
        texto:`Claro. **${IE.directora}** atiende con cita previa, en horario de oficina ` +
              `(${IE.horario_atencion}).`,
        cola:'Deja tus datos y el motivo, y desde secretaría te confirman día y hora por teléfono. ' +
             'Tu pedido entra a la mesa de partes con un folio, así no se pierde.',
        acciones:[{ texto:'Pedir la entrevista', enlace:'matricula.html#entrevista' }],
        fichas:['Vacantes','Requisitos','Horarios'],
      }),
    },
    {
      id:'instalaciones', peso:1.3,
      claves:['instalacion','instalaciones','infraestructura','local','patio','biblioteca',
              'fotos','imagenes','como es el colegio','antisismica','piso','pisos','escalera',
              'escaleras','juegos','patio de juegos','computacion','computo','salon','salones',
              'aula','aulas','donde queda el aula','donde estan los salones'],
      responder: () => ({
        texto:'Nuestra infraestructura es moderna, cómoda y **antisísmica**. Estos son los ambientes:',
        lista: LUGARES.map(l => `${l.nombre} — ${l.detalle}`),
        cola:'En **Inicio → Instalaciones** puedes girar la rueda de fotos y ver cada lugar.',
        acciones:[{ texto:'Ver las instalaciones', enlace:'index.html#lugares' },
                  { texto:'¿Dónde está mi salón?', enlace:'index.html#aulas' }],
      }),
    },

    {
      id:'uniforme', peso:1.5,
      claves:['uniforme','uniformes','buzo','polo','falda','pantalon','zapatos','como visten'],
      responder: () => ({
        texto:'El uniforme institucional es **amarillo y negro**, los colores del colegio. ' +
              'Los detalles exactos (modelo, buzo de educación física y proveedor) los entrega ' +
              'secretaría al matricular.',
        cola:`Consulta al ${IE.telefono}.`,
      }),
    },

    {
      id:'triptico', peso:1.4,
      claves:['triptico','folleto','brochure','volante','informacion impresa','pdf del colegio'],
      responder: () => ({
        texto:'El tríptico completo está en el portal, en la sección **Tríptico**: puedes abrirlo, ' +
              'girarlo en 3D y leer las seis caras, o ver el folleto escaneado tal como se entrega ' +
              'en secretaría.',
      }),
    },

    {
      id:'ticket', peso:1.8,
      claves:['ticket','soporte','reportar','no funciona','error','falla','problema',
              'ayuda tecnica','reclamo','queja','bug','se cayo','no carga'],
      responder: () => {
        setTimeout(abrirFormularioTicket, 420);
        return { texto:'Claro, abro el formulario de soporte para registrar tu caso…' };
      },
    },

    {
      id:'agradecer', peso:1.2,
      claves:['gracias','muchas gracias','ok gracias','perfecto','listo','excelente','genial'],
      responder: () => ({
        texto:`¡Con gusto! 😊 Si necesitas algo más, aquí estoy.\nRecuerda nuestro lema: «${IE.lema}».`,
      }),
    },

    /* ================================================================
       GUÍA DEL SISTEMA PARA EL PERSONAL
       ----------------------------------------------------------------
       El asistente no es solo para las familias. Cuando quien pregunta
       tiene sesión abierta —una profesora, la dirección, secretaría—,
       lo que necesita es que alguien le diga dónde se hace cada cosa.
       Estas intenciones son ese manual, contestado paso a paso y
       adaptado al rol de quien pregunta.
       ================================================================ */
    {
      id:'guia_general', peso:1.45,
      claves:['como uso el sistema','como funciona el sistema','guia','manual','tutorial',
              'ayudame con el sistema','no se usar','como se usa','donde esta','no encuentro',
              'como hago','ensename','explicame el sistema','para que sirve cada'],
      responder: () => guiaIndice(),
    },

    {
      id:'guia_notas', peso:1.8,
      claves:['subir notas','poner notas','registrar notas','como califico','calificar',
              'cuaderno de notas','ingresar notas','notas por curso','promedio del aula',
              'cambiar una nota','corregir una nota','guardar notas','notas de mis alumnos'],
      responder: () => guiaPaso('notas'),
    },

    {
      id:'guia_asistencia', peso:1.7,
      claves:['tomar asistencia','registrar asistencia','marcar asistencia','poner falta',
              'poner tardanza','justificar','asistencia del dia','lista de asistencia'],
      responder: () => guiaPaso('asistencia'),
    },

    {
      id:'guia_tareas', peso:1.75,
      claves:['subir ficha','subir fichas','subir material','asignar tarea','poner tarea',
              'dejar tarea','subir un pdf','compartir material','subir archivo a mis alumnos',
              'entregas de mis alumnos','revisar entregas','material de clase'],
      responder: () => guiaPaso('tareas'),
    },

    {
      id:'guia_mensajes', peso:1.6,
      claves:['mandar mensaje','enviar mensaje a mis alumnos','escribir a una seccion',
              'mensaje a toda la seccion','avisar a mi aula','mensaje a los padres',
              'mandar audio','mandar foto','mandar video','adjuntar archivo en el chat',
              'historial del chat','chat de un dia'],
      responder: () => guiaPaso('mensajes'),
    },

    {
      id:'guia_reportes', peso:1.6,
      claves:['generar reporte','sacar reporte','reporte en word','reporte en pdf',
              'exportar a excel','libreta de notas','reporte por estudiante','imprimir',
              'documento en word','descargar reporte','constancia'],
      responder: () => guiaPaso('reportes'),
    },

    {
      id:'guia_cuenta', peso:1.55,
      claves:['cambiar mi contrasena','cambiar mi clave','mi perfil','mis datos',
              'crear una cuenta','crear usuario','nueva cuenta','dar de baja a un alumno',
              'eliminar un alumno','retirar un alumno','desactivar una cuenta'],
      responder: () => guiaPaso('cuenta'),
    },

    {
      id:'despedida', peso:1.2,
      claves:['adios','chau','hasta luego','nos vemos','bye','me voy','hasta pronto'],
      responder: () => ({ texto:'¡Hasta pronto! Que tengas un buen día. 👋' }),
    },
  ];

  /* ==================================================================
     EL MANUAL, EN PASOS
     ------------------------------------------------------------------
     Cada entrada es "dónde se entra" y "qué se hace", con la ruta real
     del panel. Si quien pregunta no tiene sesión abierta, el asistente
     lo dice y le indica por dónde entrar en vez de explicarle una
     pantalla que no puede abrir.
     ================================================================== */
  const GUIA = {
    notas: {
      titulo:'Subir las notas de tu aula',
      roles:['docente','director'],
      donde:'Mi aula → Cuaderno de notas',
      pasos:[
        'Entra a «Mi aula» en el menú de la izquierda y abre la pestaña «Cuaderno de notas».',
        'Arriba eliges el aula, el **curso** y el bimestre: las notas se registran curso por curso.',
        'Escribe la nota de cada estudiante (0 a 20). El literal AD, A, B o C lo calcula el sistema solo.',
        'Pulsa «💾 Guardar cambios». Si te falta alguno, «Marcar faltantes con 0» los completa.',
        'Con «⬇️ Excel» te bajas el cuaderno tal como está.',
      ],
      cola:'Una nota guardada se puede corregir: vuelves a escribirla y guardas otra vez.',
      fichas:['Generar un reporte','Tomar asistencia'],
    },
    asistencia: {
      titulo:'Tomar la asistencia del día',
      roles:['docente','director','administrativo'],
      donde:'Mi aula → Asistencia',
      pasos:[
        'Entra a «Mi aula» y abre la pestaña «Asistencia».',
        'Elige el aula y la fecha (por defecto es hoy).',
        'Marca Presente, Tardanza, Falta o Justificado para cada estudiante.',
        'Guarda. Si vuelves a la misma fecha, el sistema te muestra lo que ya habías marcado.',
      ],
      fichas:['Subir las notas','Asignar una tarea'],
    },
    tareas: {
      titulo:'Asignar una tarea o subir una ficha',
      roles:['docente','director'],
      donde:'Mi aula → Tareas',
      pasos:[
        'Entra a «Mi aula» → pestaña «Tareas» y pulsa «＋ Nueva tarea».',
        'Pon el título, el curso, el aula y la fecha de entrega.',
        'En «Material adjunto» puedes subir la ficha: foto, video, audio MP3, PDF o archivo.',
        'Al asignarla, el aula recibe el aviso al instante y la ve en su panel.',
        'Tus estudiantes la encuentran en «Mis áreas mes a mes», con la fecha en que la subiste, y la descargan desde ahí.',
      ],
      cola:'En la misma pestaña ves quién ya entregó y qué adjuntó cada uno.',
      fichas:['Mandar un mensaje','Subir las notas'],
    },
    mensajes: {
      titulo:'Escribirle a un estudiante o a una sección entera',
      roles:['docente','director','administrativo','soporte','estudiante'],
      donde:'Mensajes (o Comunidad → Directorio)',
      pasos:[
        'En «Mensajes» tienes el chat: arriba eliges el destinatario en «Para:».',
        'Ahí aparecen los roles y, más abajo, **cada sección**: eliges una y el mensaje les llega a todos los de esa aula.',
        'Puedes adjuntar foto, video, audio MP3, PDF o archivo con el botón de adjunto.',
        'Para escribirle a una sola persona, ve a «Comunidad → Directorio», búscala por nombre o DNI y pulsa «Mandar mensaje».',
        'El historial se guarda por días: el selector «🗓️ Chat del día» te lleva a la conversación de la fecha que elijas.',
      ],
      fichas:['Asignar una tarea','Generar un reporte'],
    },
    reportes: {
      titulo:'Generar un reporte en PDF o en Word',
      roles:['docente','director','administrativo'],
      donde:'Reportes',
      pasos:[
        'Entra a «Reportes» y elige la tarjeta del reporte que necesitas.',
        'Completa los filtros (aula, bimestre, fechas) y elige el formato: **📄 PDF**, **📝 Word** o **⬇️ Excel**.',
        'El PDF se abre en una ventana lista para imprimir o guardar; el Word se descarga como archivo editable.',
        'El reporte «Por estudiante» te pide elegir al estudiante y saca su libreta.',
        'Las constancias se emiten en Dirección o Administración → «Documentos», también en PDF o en Word.',
      ],
      cola:'Cada documento sale con su número de versión y su código de verificación, y queda registrado.',
      fichas:['Subir las notas','Cambiar mi contraseña'],
    },
    cuenta: {
      titulo:'Cuentas, contraseñas y bajas',
      roles:['docente','director','administrativo','soporte'],
      donde:'Tu nombre (arriba a la derecha) · Personal · Padrón',
      pasos:[
        'Para cambiar tu contraseña: pulsa tu nombre arriba a la derecha → «Cambiar contraseña».',
        'Crear una cuenta nueva del personal: Dirección → «Personal», o Soporte → «Crear y administrar cuentas» → «＋ Nueva cuenta». La contraseña inicial es el DNI de la persona.',
        'Dar de baja a un estudiante: Dirección o Administración → «Padrón de estudiantes» → el botón 🗑 de su fila.',
        'Ahí el sistema te ofrece **registrar el retiro** (conserva su historial, es lo recomendado) o eliminar la ficha, escribiendo su DNI para confirmar.',
        'Nada se borra solo, y toda baja queda firmada con tu nombre en la auditoría.',
      ],
      fichas:['Generar un reporte','Mandar un mensaje'],
    },
  };

  function guiaIndice(){
    const s = Sesion.actual();
    if (!s) return {
      texto:'Puedo guiarte por el sistema paso a paso. Primero entra con tu cuenta:',
      lista:[
        '🎒 Estudiantes: solo con su DNI, en «Soy estudiante».',
        '🧑‍🏫 Docentes y personal: usuario y contraseña, en «Soy docente o personal».',
      ],
      acciones:[{ texto:'Ingreso del personal', enlace:'acceso-personal.html' },
                { texto:'Ingreso de estudiantes', enlace:'acceso-estudiante.html' }],
      cola:'Si ya entraste y no encuentras algo, dime qué quieres hacer: «subir notas», ' +
           '«tomar asistencia», «subir una ficha», «mandar un mensaje», «generar un reporte».',
      fichas:['Subir las notas','Tomar asistencia','Generar un reporte'],
    };

    const suyas = Object.entries(GUIA).filter(([, g]) => g.roles.includes(s.rol));
    return {
      texto:`Con tu cuenta (**${ROLES[s.rol] ? ROLES[s.rol].nombre : s.rol}**) puedes hacer esto. ` +
            `Dime cuál y te doy los pasos:`,
      lista: suyas.map(([, g]) => `${g.titulo} — ${g.donde}`),
      cola:'También puedes preguntarme por vacantes, requisitos o costos de cualquier aula.',
      fichas: suyas.slice(0, 4).map(([, g]) => g.titulo),
    };
  }

  function guiaPaso(clave){
    const g = GUIA[clave];
    if (!g) return guiaIndice();
    const s = Sesion.actual();
    if (s && !g.roles.includes(s.rol)) return {
      texto:`«${g.titulo}» no corresponde a tu rol (${ROLES[s.rol] ? ROLES[s.rol].nombre : s.rol}), ` +
            `así que no verás esa pantalla en tu panel.`,
      cola:'Escribe «guía» y te digo qué sí puedes hacer con tu cuenta.',
      fichas:['Guía del sistema'],
    };
    return {
      texto:`**${g.titulo}**\n📍 ${g.donde}`,
      lista: g.pasos,
      cola: g.cola || (s ? '' : 'Para hacerlo necesitas entrar con tu cuenta del personal.'),
      acciones: s ? undefined : [{ texto:'Ingreso del personal', enlace:'acceso-personal.html' }],
      fichas: g.fichas,
    };
  }

  /* ==================================================================
     FICHA DE UN GRADO
     ------------------------------------------------------------------
     Responde de UN solo aula. Los cupos y los estudiantes salen de la
     base de datos, así que es el dato de hoy; la pensión y los cursos,
     del nivel al que pertenece ese grado. Nada está escrito a mano.
     ================================================================== */
  const EDAD_DE = {
    'Inicial 3 y 4 años':'niños y niñas de 3 y 4 años',
    'Inicial 5 años':'niños y niñas de 5 años',
  };

  async function fichaDeGrado(grado, foco = 'todo'){
    const nivel = U.nivelDeGrado(grado);
    const pension = nivel === 'Inicial' ? IE.pension_inicial : IE.pension_primaria;
    const cursos = U.cursosDe(grado) || [];

    /* Cupos reales de ESE aula. */
    let libres = null, ocupados = null, cupo = IE.aforo_aula;
    try {
      const [{ filas: grados }, { filas: alumnos }] = await Promise.all([
        Datos.grados.listar({ nombre: grado }),
        Datos.estudiantes.listar({ grado, estado:'Matriculado', anio:IE.anio }, { columnas:'id' }),
      ]);
      if (grados[0] && grados[0].vacantes) cupo = grados[0].vacantes;
      ocupados = alumnos.length;
      libres = Math.max(0, cupo - ocupados);
    } catch(e){ /* sin conexión: se responde sin la parte de cupos */ }

    const lineaCupo = libres === null
      ? `Aulas de máximo ${cupo} estudiantes. Los cupos los confirma administración al ${IE.telefono}.`
      : libres > 0
        ? `Quedan **${libres} vacante${libres === 1 ? '' : 's'}** de ${cupo} para ${IE.anio} (hoy hay ${ocupados} matriculado${ocupados === 1 ? '' : 's'}).`
        : `El aula está completa con sus ${cupo} estudiantes. Deja tu solicitud igual: si se libera un cupo, administración te llama.`;

    const acciones = [
      { texto:'Enviar mi solicitud', enlace:'matricula.html#solicitud' },
      { texto:'Hablar con la directora', enlace:'matricula.html#entrevista' },
    ];

    if (foco === 'requisitos'){
      return {
        texto:`**Requisitos para ${grado}** (nivel ${nivel}` +
              `${EDAD_DE[grado] ? `, para ${EDAD_DE[grado]}` : ''}):`,
        lista: REQUISITOS_MATRICULA,
        cola:`${lineaCupo}\nPensión de ${nivel}: **${U.soles(pension)}** mensuales · ` +
             `matrícula ${U.soles(IE.costo_matricula)} · atención de ${IE.horario_atencion}.`,
        acciones,
        fichas:[`Costos de ${grado}`, `Vacantes en ${grado}`],
      };
    }

    if (foco === 'costos'){
      return {
        texto:`**Costos para ${grado}** (nivel ${nivel}):`,
        lista:[
          `Matrícula, una sola vez: ${U.soles(IE.costo_matricula)}`,
          `Pensión mensual: ${U.soles(pension)}`,
          `${IE.mensualidades} mensualidades al año`,
        ],
        cola:`${lineaCupo}\nCualquier detalle lo confirma administración al ${IE.telefono}.`,
        acciones,
        fichas:[`Requisitos para ${grado}`],
      };
    }

    return {
      texto:`Esto es **${grado}** — nivel ${nivel}${EDAD_DE[grado] ? `, para ${EDAD_DE[grado]}` : ''}:`,
      lista:[
        `Vacantes hoy: ${libres === null ? 'consultar' : libres} de ${cupo}`,
        `Pensión: ${U.soles(pension)} mensuales · ${IE.mensualidades} al año`,
        `Matrícula: ${U.soles(IE.costo_matricula)}`,
        ...(cursos.length ? [`Áreas que lleva: ${cursos.join(', ')}`] : []),
        `Horario de clases: ${IE.horario_clases}`,
      ],
      cola:`${lineaCupo}\nLos requisitos de matrícula son los mismos para todo el colegio; ` +
           `escribe «requisitos para ${grado}» y te los listo.`,
      acciones,
      fichas:[`Requisitos para ${grado}`, `Costos de ${grado}`],
    };
  }

  /* Grado mencionado en el texto, si hay alguno. */
  function detectarGrado(texto){
    const t = normalizar(texto);
    /* Los grados de Primaria van primero: "3.er grado" no debe caer en la
       regla de "3 años". */
    const mapa = [
      [/1\s*(er|ro|°)?\s*grado|primer grado|primero/, '1.er grado'],
      [/2\s*(do|°)?\s*grado|segundo grado|segundo/, '2.do grado'],
      [/3\s*(er|ro|°)?\s*grado|tercer grado|tercero/, '3.er grado'],
      [/4\s*(to|°)?\s*grado|cuarto grado|cuarto/, '4.to grado'],
      [/5\s*(to|°)?\s*grado|quinto grado|quinto/, '5.to grado'],
      [/6\s*(to|°)?\s*grado|sexto grado|sexto/, '6.to grado'],
      [/\b5\b\s*(anos|anitos)?|cinco anos/, 'Inicial 5 años'],
      [/\b3\b\s*(anos|anitos)?|tres anos|\b4\b\s*(anos|anitos)?|cuatro anos/, 'Inicial 3 y 4 años'],
    ];
    for (const [re, grado] of mapa) if (re.test(t)) return grado;
    return null;
  }

  /* ==================================================================
     MOTOR DE INTENCIONES
     ================================================================== */
  /* Distancia de edición con corte temprano: si dos palabras se separan por
     más de 'tope' cambios, no hace falta terminar de contar. Sirve para que
     "vacntes", "requisitoss" o "cuanto cuestta" sigan entendiéndose: la gente
     escribe desde el celular y con prisa. */
  function distancia(a, b, tope){
    if (a === b) return 0;
    if (Math.abs(a.length - b.length) > tope) return tope + 1;
    let previa = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++){
      const actual = [i];
      let mejor = i;
      for (let j = 1; j <= b.length; j++){
        const costo = a[i - 1] === b[j - 1] ? 0 : 1;
        actual[j] = Math.min(previa[j] + 1, actual[j - 1] + 1, previa[j - 1] + costo);
        if (actual[j] < mejor) mejor = actual[j];
      }
      if (mejor > tope) return tope + 1;
      previa = actual;
    }
    return previa[b.length];
  }

  /* Cuánta errata se le tolera a una palabra según su largo. */
  const tolerancia = larg => larg <= 4 ? 0 : larg <= 7 ? 1 : 2;

  function puntuar(texto){
    const t = normalizar(texto);
    const pals = palabras(texto);
    const resultados = [];

    INTENCIONES.forEach(i => {
      let puntaje = 0;
      i.claves.forEach(k => {
        const kn = normalizar(k);
        if (kn.includes(' ')){
          /* Frase completa: vale por el número de palabras que tiene. */
          if (t.includes(kn)) puntaje += kn.split(' ').length * 1.5;
        } else {
          if (pals.includes(kn)) puntaje += 1;
          /* Coincidencia por raíz, para plurales y variantes. */
          else if (pals.some(p => p.length > 4 && (p.startsWith(kn.slice(0, 5)) || kn.startsWith(p.slice(0, 5)))))
            puntaje += .6;
          /* Y, por último, con erratas. Vale menos que lo escrito bien, pero
             cuanto más larga es la palabra, menos casual es la coincidencia:
             acertar 8 letras con dos cambios casi nunca es casualidad. */
          else if (pals.some(p => distancia(p, kn, tolerancia(kn.length)) <= tolerancia(kn.length)))
            puntaje += .35 + Math.min(.45, kn.length * .05);
        }
      });
      if (puntaje > 0) resultados.push({ intencion:i, puntaje: puntaje * (i.peso || 1) });
    });

    resultados.sort((a, b) => b.puntaje - a.puntaje);
    return resultados;
  }

  /* Elige la intención: puntaje, desempate por sentido y memoria de la
     pregunta anterior. Va aparte de 'pensar' para poder probarla sola, sin
     base de datos de por medio. */
  function decidir(texto){
    const resultados = puntuar(texto);
    let elegida = resultados[0] ? resultados[0].intencion : null;
    let confianza = resultados[0] ? resultados[0].puntaje : 0;

    /* Desempate por sentido, no por puntaje.
       "¿quedan cupos en inicial de 5 años?" nombra un grado, así que también
       puntúa la intención "niveles" —y con frases largas, alto—. Pero
       preguntar por cupos EN un grado es preguntar por vacantes, no por la
       lista de niveles que ofrece el colegio. Esta regla lo corrige. */
    const pideCupo = /\b(vacant\w*|cupos?|lugares?|sitios?|espacios?|matricul\w*)\b/
      .test(normalizar(texto));
    if (elegida && elegida.id === 'niveles' && pideCupo && detectarGrado(texto)){
      const v = resultados.find(r => r.intencion.id === 'vacantes');
      if (v){ elegida = v.intencion; confianza = Math.max(confianza, v.puntaje); }
    }

    /* Pregunta de seguimiento: si el texto es corto y no se entendió,
       se reutiliza la última intención ("¿y de primaria?"). */
    if (!elegida && ultimaIntencion && palabras(texto).length <= 3){
      elegida = ultimaIntencion;
      confianza = 1;
    }

    return { elegida, confianza, resuelta: !!elegida && confianza >= 0.8 };
  }

  async function pensar(texto){
    const { elegida, resuelta } = decidir(texto);

    /* Toda consulta queda registrada: es el insumo del indicador 3. */
    if (db){
      db.from('consultas').insert({
        pregunta: U.limpiar(texto, 200),
        intencion: resuelta ? elegida.id : 'sin_coincidencia',
        resuelta: resuelta ? 1 : 0,
        ambito: Sesion.actual() ? 'interno' : 'publico',
      }).then(() => {}, () => {});
    }

    if (!resuelta){
      ultimaIntencion = null;
      const s = Sesion.actual();
      /* Con sesión abierta, lo que la persona suele estar buscando es
         cómo se hace algo en el sistema, no las vacantes del colegio. */
      if (s) return {
        texto:'No estoy seguro de haber entendido. 🤔 Como guía del sistema te puedo explicar:',
        lista:['Subir notas por curso','Tomar asistencia','Asignar tareas y subir fichas',
               'Escribir a una sección entera','Generar reportes en PDF o Word',
               'Cuentas, contraseñas y bajas'],
        cola:'Escribe «guía» y te listo lo que puedes hacer con tu cuenta. ' +
             `Si algo falla de verdad, escribe "quiero abrir un ticket" y lo derivo a soporte.`,
        fichas: sugerenciasAhora().slice(0, 4),
      };
      return {
        texto:'No estoy seguro de haber entendido. 🤔 Puedo ayudarte con:',
        lista:['Vacantes y matrícula','Requisitos y costos (de un grado en concreto también)',
               'Horarios y ubicación','Niveles, grados y talleres','Acceso al sistema','Comunicados'],
        cola:`Si es otra cosa, escribe "quiero abrir un ticket" y lo derivo a soporte, o llama al ${IE.telefono}.`,
        fichas:['Vacantes','Requisitos para 1.er grado','Costos','Abrir un ticket'],
      };
    }

    ultimaIntencion = elegida;
    return await elegida.responder({ texto });
  }

  /* ==================================================================
     DIBUJO DE LA CONVERSACIÓN
     ================================================================== */
  /* Las sugerencias cambian según quién esté delante: a una familia le
     sirven las vacantes y los costos; a una profesora con la sesión
     abierta, dónde se suben las notas. */
  const SUGERENCIAS_PUBLICAS = ['¿Hay vacantes?','Requisitos para 1.er grado','¿Cuánto cuesta?',
                                'Horarios','¿Cómo ingreso?','Los talleres'];
  const SUGERENCIAS_ROL = {
    docente:        ['Subir las notas','Tomar asistencia','Subir una ficha','Mandar un mensaje','Generar un reporte'],
    director:       ['Generar un reporte','Emitir una constancia','Dar de baja a un alumno','Crear una cuenta','Guía del sistema'],
    administrativo: ['Emitir una constancia','Generar un reporte','Dar de baja a un alumno','Guía del sistema'],
    soporte:        ['Crear una cuenta','Cambiar mi contraseña','Guía del sistema'],
    estudiante:     ['Mis notas','Mis áreas mes a mes','Mandar un mensaje','Mis tareas'],
  };
  function sugerenciasAhora(){
    const s = Sesion.actual();
    return (s && SUGERENCIAS_ROL[s.rol]) || SUGERENCIAS_PUBLICAS;
  }

  /* Convierte la respuesta estructurada en HTML seguro. */
  function aHTML(r){
    if (typeof r === 'string') r = { texto:r };
    const partes = [];
    if (r.texto)  partes.push(esc(r.texto).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>'));
    if (r.lista)  partes.push(`<ul>${r.lista.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`);
    if (r.cola)   partes.push(`<div class="mt-cola">${esc(r.cola).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')}</div>`);
    /* Acciones: llevan a la parte del portal que resuelve lo que se pidió,
       en vez de dejar al visitante buscándola. */
    if (r.acciones) partes.push(`<div class="acciones-chat">${r.acciones.map(a =>
      `<a class="accion-chat" href="${esc(a.enlace)}">${esc(a.texto)} <span>→</span></a>`).join('')}</div>`);
    if (r.fichas) partes.push(`<div class="fichas">${r.fichas.map(f => `<span data-ficha="${esc(f)}">${esc(f)}</span>`).join('')}</div>`);
    return partes.join('');
  }

  function superficies(){
    return [
      { cuerpo:q('#chatCuerpo'),          sug:q('#chatSugerencias') },
      { cuerpo:q('#chatCuerpoFlotante'),  sug:q('#chatSugerenciasFlotante') },
    ].filter(s => s.cuerpo);
  }

  function repintar(){
    superficies().forEach(({ cuerpo }) => {
      cuerpo.innerHTML = conversacion.map(m =>
        `<div class="globo-chat ${m.quien}">${m.quien === 'yo' ? esc(m.texto) : aHTML(m.respuesta)}</div>`
      ).join('');
      cuerpo.scrollTop = cuerpo.scrollHeight;
    });
  }

  function pintarSugerencias(){
    superficies().forEach(({ sug }) => {
      if (!sug) return;
      sug.innerHTML = sugerenciasAhora().map(s => `<button type="button">${esc(s)}</button>`).join('');
    });
  }

  function mostrarEscribiendo(){
    superficies().forEach(({ cuerpo }) => {
      const el = U.crear('div', { clase:'escribiendo', html:'<i></i><i></i><i></i>' });
      cuerpo.append(el);
      cuerpo.scrollTop = cuerpo.scrollHeight;
    });
  }
  function quitarEscribiendo(){
    superficies().forEach(({ cuerpo }) => U.qq('.escribiendo', cuerpo).forEach(e => e.remove()));
  }

  /* ==================================================================
     ENVÍO
     ================================================================== */
  let pensando = false;

  async function enviar(texto){
    const t = U.limpiar(texto, 200);
    if (!t || pensando) return;
    pensando = true;

    conversacion.push({ quien:'yo', texto:t });
    repintar();
    U.qq('#chatTexto, #chatTextoFlotante').forEach(i => i.value = '');

    mostrarEscribiendo();
    const respuesta = await pensar(t);
    await U.esperar(360);
    quitarEscribiendo();

    conversacion.push({ quien:'bot', respuesta });
    repintar();
    pensando = false;
  }

  function saludoInicial(){
    if (conversacion.length) return;
    const s = Sesion.actual();
    conversacion.push({ quien:'bot', respuesta:{
      texto: s
        ? `¡Hola, ${String(s.nombres).split(' ')[0]}! 👋 ¿En qué te ayudo hoy?`
        : `¡Hola! 👋 Soy el asistente de la **${IE.nombre_corto}**. Pregúntame por vacantes, ` +
          `requisitos, costos, horarios o cómo ingresar al sistema.`,
      fichas:['Vacantes','Requisitos','Costos'],
    }});
  }

  /* ==================================================================
     TICKET DE SOPORTE
     ================================================================== */
  function abrirFormularioTicket(){
    const s = Sesion.actual();
    const campos = [
      { id:'solicitante', etiqueta:'Tu nombre', icono:'🧑', requerido:true, limpiar:'nombre',
        valor: s ? s.nombres : '', ancho:'completo',
        valida:v => U.val.largo(v, 3, 80) || 'Escribe tu nombre completo.' },
      { id:'contacto', etiqueta:'Celular o correo de contacto', icono:'📱', requerido:true, ancho:'completo',
        valida:v => (U.val.celular(U.soloDigitos(v, 9)) || U.val.correo(v)) || 'Escribe un celular (9 dígitos) o un correo válido.' },
      { id:'categoria', etiqueta:'Tipo de problema', tipo:'select', icono:'🏷️',
        opciones:['Acceso al sistema','Datos incorrectos','Error en el sistema','Consulta de matrícula','Otro'] },
      { id:'prioridad', etiqueta:'Urgencia', tipo:'select', icono:'⚡', opciones:PRIORIDADES, valor:'Media' },
      { id:'asunto', etiqueta:'Asunto', icono:'📌', requerido:true, ancho:'completo',
        valida:v => U.val.largo(v, 5, 100) || 'Resume el problema en una línea.' },
      { id:'detalle', etiqueta:'Cuéntanos qué pasó', tipo:'area', filas:4, requerido:true, ancho:'completo',
        valida:v => U.val.largo(v, 10, 600) || 'Describe el problema con un poco más de detalle.' },
    ];

    UI.modal({
      titulo:'Abrir ticket de soporte',
      subtitulo:'El equipo técnico revisa los tickets en horario de oficina.',
      cuerpo: UI.formulario(campos, { columnas:2 }),
      ancho:'ancha',
      botones:[
        { texto:'Cancelar', clase:'btn-fantasma', esperando:false, accion: () => {} },
        { texto:'Enviar ticket', clase:'btn-oro', esperandoTexto:'Enviando…',
          accion: async ({ zona }) => {
            const datos = UI.leerFormulario(zona, campos);
            if (!UI.validarFormulario(zona, campos, datos)) return false;
            const codigo = U.folio('TCK');
            await Datos.tickets.crear({ ...datos, codigo, rol: s ? s.rol : 'publico', estado:'Abierto' });
            Datos.notificaciones.enviar('Nuevo ticket de soporte',
              `${datos.asunto} (${datos.prioridad})`, ROLES.soporte.nombre);
            Datos.auditar('Ticket creado desde el asistente', 'Soporte', { detalle: codigo });

            conversacion.push({ quien:'bot', respuesta:{
              texto:`Listo ✅ Tu ticket es **${codigo}**.`,
              cola:`Soporte te contactará por ${datos.contacto}. Guarda el código para hacer seguimiento.`,
            }});
            repintar();
            UI.exito(`Ticket ${codigo} registrado.`);
          } },
      ],
    });
  }

  /* ==================================================================
     MONTAJE
     ================================================================== */
  function conectarFormulario(form, entrada){
    if (!form) return;
    form.onsubmit = e => { e.preventDefault(); enviar(entrada.value); };
  }

  function conectarFichasYSugerencias(){
    /* Un solo escucha para toda la página: las fichas se crean sobre la marcha. */
    document.addEventListener('click', e => {
      const ficha = e.target.closest('[data-ficha]');
      if (ficha){ enviar(ficha.dataset.ficha); return; }
      const sug = e.target.closest('.chat-sugerencias button');
      if (sug) enviar(sug.textContent);
    });
  }

  /* Chat empotrado en la sección del portal. */
  function montarEmpotrado(){
    if (montado.empotrado || !q('#chatCuerpo')) return;
    montado.empotrado = true;
    saludoInicial();
    pintarSugerencias();
    repintar();
    conectarFormulario(q('#chatForm'), q('#chatTexto'));
  }

  /* Ventana flotante. */
  function montarFlotante(){
    if (montado.flotante || !q('#chatCuerpoFlotante')) return;
    montado.flotante = true;
    saludoInicial();
    pintarSugerencias();
    repintar();
    conectarFormulario(q('#chatFormFlotante'), q('#chatTextoFlotante'));
    const cerrarBtn = q('#chatCerrar');
    if (cerrarBtn) cerrarBtn.onclick = cerrar;
  }

  function abrir(mensajeInicial){
    const v = q('#chatVentana');
    if (!v){
      /* Sin ventana flotante (por ejemplo en un panel): se usa el ticket. */
      if (mensajeInicial) abrirFormularioTicket();
      return;
    }
    montarFlotante();
    v.classList.add('abierta');
    const globo = q('#chatGlobo'); if (globo) globo.classList.add('oculto');
    setTimeout(() => { const t = q('#chatTextoFlotante'); if (t) t.focus(); }, 240);
    if (mensajeInicial) enviar(mensajeInicial);
  }

  function cerrar(){
    const v = q('#chatVentana');
    if (v) v.classList.remove('abierta');
  }

  function alternar(){
    const v = q('#chatVentana');
    if (!v) return;
    v.classList.contains('abierta') ? cerrar() : abrir();
  }

  function conectar(){
    const b = q('#chatBurbuja');
    if (b) b.onclick = alternar;
    conectarFichasYSugerencias();
    addEventListener('keydown', e => { if (e.key === 'Escape') cerrar(); });
  }

  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', conectar);
  else conectar();

  return { abrir, cerrar, alternar, enviar, montarEmpotrado, montarFlotante,
           abrirFormularioTicket, INTENCIONES, puntuar, decidir, pensar };
})();
