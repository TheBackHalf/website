import { legalDocumentList } from "@/content/legal/documents";
import type { Dictionary } from "@/content/i18n/types";

const legalTitleEs: Record<string, string> = {
  "privacy-policy": "Política de privacidad",
  "terms-of-use": "Términos de uso",
  "participant-agreement": "Acuerdo de participante",
  "membership-agreement": "Acuerdo de membresía",
  "ai-disclosure": "Divulgación de IA",
};

const siteDescriptionEs =
  "The Back Half ayuda a las personas a pasar de vivir por expectativa a vivir con intención.";

/** Spanish UI dictionary for The Back Half — participant-facing copy. */
export const esDictionary: Dictionary = {
  locale: "es",
  common: {
    siteName: "The Back Half",
    copyPending: "Contenido aprobado pendiente",
    legalCopyPending: "CONTENIDO LEGAL APROBADO PENDIENTE",
    translationPending: "Contenido aprobado pendiente",
    skipToMain: "Saltar al contenido principal",
    legal: "Legal",
    submitting: "Enviando…",
  },
  languageSwitcher: {
    label: "Idioma",
    english: "English",
    spanish: "Español",
  },
  nav: {
    manifesto: "Manifiesto",
    book: "Libro",
    community: "Comunidad",
    contact: "Contacto",
    support: "Soporte",
  },
  forms: {
    name: "Nombre",
    email: "Correo electrónico",
    reasonCategory: "Categoría de soporte",
    subject: "Asunto",
    alreadyArchitect: "¿Ya eres Architect?",
    architectYes: "Sí",
    architectNo: "No",
    message: "Mensaje",
    nameRequired: "El nombre es obligatorio.",
    emailRequired: "El correo electrónico es obligatorio.",
    emailInvalid: "Introduce un correo electrónico válido.",
    categoryRequired: "Selecciona un motivo o categoría.",
    subjectRequired: "El asunto es obligatorio.",
    messageRequired: "El mensaje es obligatorio.",
    messageMinLength: "El mensaje debe tener al menos 10 caracteres.",
    categoriesPending: "Categorías aprobadas pendientes.",
    approvedCategoriesPending: "Contenido aprobado pendiente",
    sensitiveNotice:
      "No incluyas contraseñas, información de tarjetas de pago ni otros datos sensibles de la cuenta en tu mensaje.",
    submissionPending: "Recibimos tu solicitud.",
    submissionPendingDetail:
      "The Back Half Support suele responder en 3 días, con el objetivo de 72 horas o menos.",
    submissionReceived: "Recibimos tu solicitud.",
    submissionReceivedDetail:
      "Tu ID de ticket es {ticketId}. Suele haber respuesta en 3 días, con el objetivo de 72 horas o menos. Los asuntos urgentes de seguridad y privacidad se priorizan. No envíes contraseñas ni datos de tarjetas de pago.",
    submissionError:
      "No pudimos enviar tu solicitud. Inténtalo de nuevo o escribe a support@thebackhalf.org.",
    contactSubmit: "Contacto",
  },
  registration: {
    title: "Conviértete en Architect",
    description:
      "Crea tu cuenta de The Back Half para comenzar tu Journey como Architect.",
    firstName: "Nombre",
    lastName: "Apellido",
    password: "Contraseña",
    passwordConfirm: "Confirmar contraseña",
    createAccount: "Crear cuenta",
    continueWithGoogle: "Continuar con Google",
    consentLegend: "Reconocimientos de creación de cuenta",
    firstNameRequired: "El nombre es obligatorio.",
    lastNameRequired: "El apellido es obligatorio.",
    passwordRequired: "La contraseña es obligatoria.",
    passwordConfirmRequired: "Confirma tu contraseña.",
    passwordMismatch: "Las contraseñas no coinciden.",
    passwordRequirements:
      "Usa al menos {min} caracteres con al menos una letra y un número.",
    consentRequired: "Debes aceptar los reconocimientos obligatorios.",
    duplicateEmail:
      "Ya existe una cuenta con este correo. Inicia sesión o usa otro correo.",
    genericError: "No pudimos crear tu cuenta. Inténtalo de nuevo.",
    submitting: "Creando cuenta…",
    googleNotConfigured: "",
    googleCancelled: "Se canceló el inicio de sesión con Google.",
    googleConflict:
      "Este correo ya está registrado con correo y contraseña.",
    googleConsentRequired:
      "Acepta todos los reconocimientos obligatorios antes de continuar con Google.",
    confirmationTitle: "Verifica tu correo electrónico",
    confirmationDescription:
      "Tu cuenta se creó. Revisa tu correo para el enlace de verificación y accede a tu espacio de Architect.",
    confirmationResend: "Reenviar correo de verificación",
    confirmationResent: "Correo de verificación enviado.",
    verifyTitle: "Verificación de correo electrónico",
    verifySuccess:
      "Tu correo está verificado. Redirigiendo a tu espacio de Architect…",
    verifyExpired:
      "Este enlace de verificación ha expirado. Solicita uno nuevo.",
    verifyInvalid: "Este enlace de verificación no es válido.",
    verifyRedirecting: "Redirigiendo…",
    alreadyHaveAccount: "¿Ya tienes una cuenta? Inicia sesión",
    googleNoAccount:
      "Aún no hay una cuenta de The Back Half vinculada a este inicio de sesión de Google. Crea una cuenta para continuar.",
    googleAgeRequired:
      "Confirma que tienes al menos 18 años antes de continuar con Google.",
  },
  eligibility: {
    gateTitle: "Confirma que tienes 18 años o más",
    gateDescription:
      "La participación en la plataforma en el lanzamiento — incluido el registro, la compra, el Journey, Lumina, AI Kimberly y la membresía — está disponible para personas de al menos 18 años. El mensaje más amplio de The Back Half puede seguir resonando con personas de muchas edades.",
    question: "¿Tienes 18 años o más?",
    yesLabel: "Sí, tengo 18 años o más",
    noLabel: "No, soy menor de 18 años",
    confirm: "Continuar",
    required: "Confirma si tienes al menos 18 años para continuar.",
    confirmFailed: "No pudimos confirmar tu selección de edad. Inténtalo de nuevo.",
    disclosure:
      "Las personas participantes deben tener al menos 18 años para registrarse, comprar o usar experiencias de participante.",
    marketingDisclosure:
      "Las personas participantes deben tener al menos 18 años para registrarse, comprar o usar el Journey, Lumina, AI Kimberly y la membresía.",
    notEligibleTitle: "Esta experiencia de la plataforma no está disponible",
    notEligibleBody:
      "La plataforma The Back Half está disponible para personas de 18 años o más. Si eres menor de 18 años, no puedes registrarte, comprar, crear una cuenta, completar la incorporación, participar en el Journey, usar Lumina o AI Kimberly, ni enviar información personal a través de experiencias de Architect en el lanzamiento.",
    notEligibleReturn: "Volver a The Back Half",
    supportNote:
      "El formulario de soporte para Architects es para participantes elegibles de 18 años o más. No envíes información personal si eres menor de 18 años.",
    legalHeading: "Elegibilidad de lanzamiento",
    confirmContinue: "Continuar",
  },
  login: {
    title: "Iniciar sesión",
    description: "Inicia sesión para continuar tu Journey como Architect.",
    signIn: "Iniciar sesión",
    continueWithGoogle: "Continuar con Google",
    forgotPassword: "¿Olvidaste tu contraseña?",
    createAccount: "¿Necesitas una cuenta? Conviértete en Architect",
    passwordRequired: "La contraseña es obligatoria.",
    invalidCredentials: "Correo o contraseña no válidos.",
    submitting: "Iniciando sesión…",
    googleNotConfigured: "",
    googleCancelled: "Se canceló el inicio de sesión con Google.",
    googleConflict:
      "Este correo ya está registrado con correo y contraseña. Inicia sesión con tu contraseña.",
    googleFailed: "No se pudo completar el inicio de sesión con Google. Inténtalo de nuevo.",
    resetSuccess:
      "Tu contraseña se actualizó. Inicia sesión con tu nueva contraseña.",
  },
  forgotPassword: {
    title: "Olvidé mi contraseña",
    description:
      "Introduce tu correo electrónico y enviaremos instrucciones para restablecer la contraseña si existe una cuenta.",
    submit: "Enviar instrucciones",
    submitting: "Enviando…",
    accepted:
      "Si existe una cuenta con ese correo electrónico, se han enviado instrucciones para restablecer la contraseña.",
    backToLogin: "Volver a iniciar sesión",
  },
  resetPassword: {
    title: "Restablecer contraseña",
    description: "Elige una nueva contraseña para tu cuenta de The Back Half.",
    newPassword: "Nueva contraseña",
    confirmPassword: "Confirmar nueva contraseña",
    submit: "Actualizar contraseña",
    submitting: "Actualizando…",
    invalidToken: "Este enlace para restablecer la contraseña no es válido.",
    expiredToken:
      "Este enlace para restablecer la contraseña ha expirado. Solicita uno nuevo.",
    usedToken:
      "Este enlace para restablecer la contraseña ya se usó. Solicita uno nuevo.",
    missingToken: "Se requiere un enlace válido para restablecer la contraseña.",
  },
  metadata: {
    home: {
      title: "The Back Half — Magical is Possible",
      description: siteDescriptionEs,
    },
    journey: {
      title: "El Journey — The Back Half",
      description:
        "Toda persona merece la oportunidad de crear intencionalmente una vida mágica.",
    },
    lumina: {
      title: "Conoce a Lumina — The Back Half",
      description: `Conoce a Lumina. ${siteDescriptionEs}`,
    },
    contact: {
      title: "Contacto — The Back Half",
      description: `Contacto. ${siteDescriptionEs}`,
    },
    support: {
      title: "Soporte — The Back Half",
      description: `Soporte. ${siteDescriptionEs}`,
    },
    register: {
      title: "Conviértete en Architect — The Back Half",
      description:
        "Crea tu cuenta de The Back Half para comenzar tu Journey como Architect.",
    },
    registerConfirmation: {
      title: "Verifica tu correo — The Back Half",
      description:
        "Confirma tu dirección de correo para acceder a tu espacio de Architect.",
    },
    verifyEmail: {
      title: "Verificación de correo — The Back Half",
      description: "Verifica el correo de tu cuenta de The Back Half.",
    },
    login: {
      title: "Iniciar sesión — The Back Half",
      description: "Inicia sesión para continuar tu Journey como Architect.",
    },
    forgotPassword: {
      title: "Olvidé mi contraseña — The Back Half",
      description:
        "Solicita instrucciones para restablecer la contraseña de tu cuenta de The Back Half.",
    },
    resetPassword: {
      title: "Restablecer contraseña — The Back Half",
      description: "Elige una nueva contraseña para tu cuenta de The Back Half.",
    },
    checkout: {
      title: "Checkout — The Back Half",
      description:
        "Elige tu oferta de The Back Half y continúa al checkout seguro.",
    },
    checkoutSuccess: {
      title: "Pago exitoso — The Back Half",
      description: "Tu pago de The Back Half se completó.",
    },
    checkoutCancel: {
      title: "Checkout cancelado — The Back Half",
      description:
        "Tu checkout de The Back Half se canceló. Puedes intentarlo de nuevo cuando quieras.",
    },
    eligibility: {
      title: "Confirma tu elegibilidad — The Back Half",
      description:
        "Las personas participantes deben tener al menos 18 años para registrarse, comprar o usar experiencias de participante.",
    },
    notEligible: {
      title: "Elegibilidad — The Back Half",
      description:
        "La plataforma The Back Half está disponible para personas de 18 años o más.",
    },
    legal: (slug: string) => {
      const document = legalDocumentList.find((item) => item.slug === slug);
      if (!document) {
        return null;
      }

      const spanishTitle = legalTitleEs[document.slug] ?? document.title;

      return {
        title: `${spanishTitle} — The Back Half`,
        description: `${spanishTitle}. ${siteDescriptionEs}`,
      };
    },
  },
  access: {
    deniedTitle: "Acceso denegado",
    deniedDescription:
      "No tienes permiso para ver esta área de The Back Half.",
    signInRequired: "Se requiere iniciar sesión.",
    unauthorized: "No autorizado.",
    returnHome: "Volver al inicio",
    returnDashboard: "Volver al Dashboard de Architect",
    adminTitle: "Operaciones de Founder / admin",
    adminDescription:
      "Acceso administrativo autorizado para operar The Back Half.",
    supportTitle: "Operaciones de soporte",
    supportDescription:
      "Acceso limitado de soporte para resolver problemas de cuenta de Architect.",
    accountsHeading: "Cuentas",
    lookupLabel: "Correo del Architect",
    lookupButton: "Buscar cuenta",
    noAccounts: "No se encontraron cuentas.",
    reconcileHeading: "Reconciliación de facturación",
    reconcileDescription:
      "Recupera el estado de facturación de Stripe en compras, entitlements y acceso de cuenta para un Architect.",
    reconcileLabel: "Correo o id de usuario del Architect",
    reconcileButton: "Reconciliar facturación",
    reconcileSuccess: "Facturación reconciliada.",
    reconcileNotFound: "Cuenta no encontrada.",
    reconcileInvalid: "Ingresa un correo o id de usuario.",
  },
  checkout: {
    catalogTitle: "Elige tu camino",
    catalogDescription:
      "Selecciona una oferta aprobada de The Back Half. El pago seguro se procesa con Stripe Checkout.",
    offerCta: "Continuar",
    oneTime: "Pago único",
    monthly: "Mensual",
    continueToPayment: "Continuar al checkout seguro",
    consentLegend: "Reconocimientos de compra",
    consentRequired: "Debes aceptar los reconocimientos obligatorios.",
    signInRequired: "Inicia sesión para continuar con el checkout.",
    notConfigured:
      "El checkout aún no está configurado. Se requieren credenciales de Stripe sandbox.",
    priceMismatch:
      "Esta oferta no está disponible temporalmente. Contacta a soporte.",
    genericError: "No pudimos iniciar el checkout. Inténtalo de nuevo.",
    submitting: "Iniciando checkout seguro…",
    successTitle: "Pago completado",
    successDescription:
      "Gracias. Tu pago de The Back Half se completó correctamente.",
    successOfferLabel: "Oferta comprada",
    successNextStep: "Volver a tu Dashboard de Architect",
    successNextStepOnboarding: "Comenzar la incorporación al Journey",
    successAccessPending:
      "El pago está confirmado. El acceso se provisiona mediante procesamiento seguro de webhooks. Actualiza tu Journey de Architect en breve si aún no ves el acceso.",
    successIncomplete:
      "Esta sesión de checkout no está completa. No se ha otorgado acceso.",
    successInvalid:
      "No pudimos confirmar esta sesión de pago. No se ha otorgado acceso.",
    cancelTitle: "Checkout cancelado",
    cancelDescription:
      "Tu checkout se canceló o quedó incompleto. No se realizó ningún pago y no se otorgó acceso.",
    cancelRetry: "Intentar el checkout de nuevo",
    cancelHome: "Volver al inicio",
    returnOffers: "Ver ofertas",
    returnDashboard: "Ir al Dashboard de Architect",
    offerBlueprintName: "The Back Half Blueprint",
    offerBlueprintDescription:
      "La experiencia Blueprint de siete capítulos — $1,500 compra única.",
    offerBundleName: "Founding Architect",
    offerBundleDescription:
      "Blueprint + primeros seis meses de Architect Community incluidos — $1,750 compra única. Architect Community comienza el 25 de octubre de 2026. El período Founding Architect Community es del 25 de octubre de 2026 al 25 de abril de 2027. Inscripción del 31 de agosto al 31 de diciembre de 2026.",
    offerCommunityName: "The Back Half Community",
    offerCommunityDescription:
      "$50/mes después de completar el Blueprint. Architect Community — Próximamente el 25 de octubre de 2026. Founding Architect se renueva a $50/mes después de los primeros seis meses de acceso a Architect Community.",
    eligibilityDisclosure:
      "Las personas participantes deben tener al menos 18 años para comprar The Back Half Blueprint, una membresía o cualquier oferta de lanzamiento.",
    ageIneligible:
      "El checkout está disponible solo para participantes de al menos 18 años.",
    refundPolicy:
      "La cancelación no es un reembolso. La política estándar de The Back Half es sin reembolsos.",
  },
  appShell: {
    appName: "Architect",
    navLabel: "Aplicación Architect",
    accountMenuLabel: "Menú de cuenta",
    logout: "Cerrar sesión",
    logoutPending: "Cerrando sesión…",
    openMenu: "Abrir menú de navegación",
    closeMenu: "Cerrar menú de navegación",
    skipToApp: "Saltar al contenido de la aplicación",
    downstreamPending: "Implementación pendiente",
    downstreamDetail:
      "Esta área se conectará cuando se complete la fila de Launch Readiness correspondiente.",
    nav: {
      dashboard: "Panel",
      journey: "El Journey",
      lumina: "Lumina",
      resources: "Recursos de Architect",
      settings: "Configuración",
      billing: "Facturación",
      support: "Soporte",
    },
    dashboard: {
      title: "Panel de Architect",
      description:
        "Tu espacio Architect — capítulo actual del Journey, progreso, recursos y el siguiente paso.",
      welcomeSlot: "Bienvenida",
      welcome: "Te damos la bienvenida, {name}.",
      currentChapter: "Capítulo actual del Journey",
      progress: "Progreso del Journey",
      continueJourney: "Continuar el Journey",
      continueOnboarding: "Continuar la incorporación",
      continueCheckout: "Obtener acceso al Journey",
      resourcesPreview: "Recursos de Architect",
      viewAllResources: "Ver todos los recursos de Architect",
      notStarted: "Tu Journey aún no ha comenzado.",
      noProgress: "Aún no hay progreso del Journey registrado.",
      noAccess:
        "El acceso al Journey no está activo en esta cuenta. Continúa al checkout para comenzar.",
      noCurrentChapter: "Aún no hay un capítulo actual registrado.",
      stateNotStarted: "Sin comenzar",
      stateInProgress: "En progreso",
      stateStageCompleted: "Etapa completada",
      stateJourneyCompleted: "Journey completado",
      stateNoAccess: "Se necesita acceso",
      stagePosition: "Etapa {current} de {total}",
      quickLinksLabel: "Cuenta y soporte",
      loadError:
        "No pudimos cargar tu panel de Architect. Inténtalo de nuevo o contacta a soporte.",
      loading: "Cargando tu panel de Architect…",
    },
    settings: {
      title: "Perfil y preferencias",
      description:
        "Administra tu perfil de Architect, preferencias, historial de consentimiento y controles de cuenta.",
      profile: "Perfil",
      preferences: "Preferencias",
      language: "Idioma",
      supportPreference: "Preferencia de soporte",
      timeZone: "Zona horaria",
      consentHistory: "Historial de consentimiento",
      accountControls: "Cuenta",
      optionPlaceholder: "Selecciona una opción",
      firstName: "Nombre",
      lastName: "Apellido",
      pronunciation: "Pronunciación del nombre",
      pronunciationHelper:
        "Opcional. Indica a The Back Half cómo pronunciar tu nombre.",
      languageHelper:
        "Elige el idioma de tu experiencia autenticada de Architect.",
      languageEnglish: "English",
      languageSpanish: "Español",
      supportPreferenceHelper:
        "Elige cómo prefieres usar los canales de soporte disponibles en el lanzamiento.",
      supportChannelSupport: "Página de soporte",
      supportChannelContact: "Página de contacto",
      timeZoneHelper:
        "Se usa para programación, comunicaciones, comunidad y tiempos del Journey.",
      timeZonePlaceholder: "Selecciona una zona horaria",
      save: "Guardar cambios",
      saving: "Guardando…",
      saved: "Tu perfil y preferencias se guardaron.",
      saveError: "No pudimos guardar tus cambios. Inténtalo de nuevo.",
      firstNameRequired: "Ingresa tu nombre.",
      lastNameRequired: "Ingresa tu apellido.",
      firstNameTooLong: "El nombre es demasiado largo.",
      lastNameTooLong: "El apellido es demasiado largo.",
      pronunciationTooLong: "La pronunciación es demasiado larga.",
      languageRequired: "Selecciona un idioma.",
      supportPreferenceRequired: "Selecciona una preferencia de soporte.",
      supportPreferenceInvalid: "Selecciona una preferencia de soporte válida.",
      timeZoneRequired: "Selecciona una zona horaria.",
      timeZoneInvalid: "Selecciona una zona horaria válida.",
      consentType: "Acuerdo",
      consentStatus: "Estado",
      consentAccepted: "Aceptado",
      consentAcceptedAt: "Aceptado el",
      consentVersion: "Versión",
      consentVersionUnavailable: "No registrada",
      consentEmpty:
        "Aún no hay registros de consentimiento disponibles para esta cuenta.",
      consentReadOnlyNote:
        "El historial de consentimiento es información de auditoría de solo lectura y no se puede editar aquí.",
      consentTerms: "Términos de uso",
      consentPrivacy: "Política de privacidad",
      consentParticipant: "Acuerdo de participante",
      consentAi: "Divulgación de IA",
      consentMembership: "Acuerdo de membresía",
      consentBilling: "Facturación y suscripción",
      consentLuminaMemory: "Memoria de Lumina",
      memoryTitle: "Memoria de Lumina",
      memoryDescription:
        "Cuando está activada, Lumina puede guardar resúmenes, decisiones, hitos y punteros de progreso del Journey aprobados entre sesiones. La identidad y las preferencias siguen viniendo de tu perfil.",
      memoryEnableLabel:
        "Opcional: Activa la memoria de Lumina para esta cuenta. Puedes cambiarlo más tarde en Configuración.",
      memoryEnableHelper:
        "Cuando está activada, Lumina puede conservar perspectivas aprobadas entre sesiones. La memoria siempre respeta tu consentimiento. Desactivarla detiene nuevas escrituras duraderas sin borrar el historial de consentimiento.",
      memoryCounts:
        "{summaries} resúmenes · {decisions} decisiones · {milestones} hitos",
      memoryDisabledCounts:
        "La memoria duradera está desactivada. Los elementos guardados no se muestran mientras esté desactivada.",
      memoryClear: "Borrar memoria de Lumina",
      memoryClearConfirm:
        "¿Borrar resúmenes, decisiones, hitos y punteros de progreso de Lumina? Esto no elimina tu cuenta, registros de facturación, historial de consentimiento ni historial de conversación.",
      memoryClearConfirmAction: "Sí, borrar memoria de Lumina",
      memoryClearCancel: "Cancelar",
      memoryClearing: "Borrando…",
      memoryClearSuccess: "La memoria de Lumina se borró.",
      memoryClearError:
        "No pudimos borrar la memoria de Lumina. Inténtalo de nuevo.",
      memoryEnabledSuccess: "La memoria de Lumina está activada.",
      memoryDisabledSuccess:
        "La memoria de Lumina está desactivada. Se bloquean nuevas escrituras duraderas.",
      memoryUpdateError:
        "No pudimos actualizar la memoria de Lumina. Inténtalo de nuevo.",
      memoryClearDistinctNote:
        "Borrar la memoria de Lumina es distinto de la eliminación de cuenta, que aún no está disponible.",
      accountEmail: "Correo de la cuenta",
      accountRole: "Rol de la cuenta",
      roleArchitect: "Architect",
      roleAdmin: "Founder / admin",
      roleSupport: "Soporte",
      roleSystem: "Sistema",
      accountProvider: "Método de inicio de sesión",
      accountProviderEmail: "Correo y contraseña",
      accountProviderGoogle: "Google",
      accountArcCode: "Código ARC",
      accountPassword: "Contraseña",
      resetPasswordLink: "Restablecer contraseña",
      googleLinked: "Cuenta de Google vinculada",
      googleNotLinked: "Cuenta de Google no vinculada",
      signOut: "Cerrar sesión",
      accountDeletionUnavailable:
        "La eliminación de cuenta aún no está disponible. No se ha configurado un proceso aprobado de eliminación o desactivación.",
    },
    journey: {
      title: "El Journey",
      description:
        "Continúa el Capítulo Uno — El Despertar y tu experiencia autenticada del Journey.",
    },
    onboarding: {
      title: "Incorporación al Journey",
      description:
        "Establece tus preferencias y comienza el Capítulo Uno — El Despertar.",
      descriptionLead: "Establece tus preferencias y comienza el ",
      descriptionEmphasis: "Capítulo Uno — El Despertar.",
      progressLabel: "Progreso de incorporación",
      stepOf: "Paso {current} de {total}",
      continue: "Continuar",
      back: "Atrás",
      loading: "Cargando la incorporación…",
      error: "Algo salió mal. Inténtalo de nuevo.",
      saveAndContinue: "Guardar y continuar",
      alreadyComplete:
        "La incorporación ya está completa. Continúa tu Journey.",
      communityBlocked:
        "El acceso Community por sí solo no incluye la incorporación al Journey.",
      welcomeTitle: "Una bienvenida de la Fundadora",
      preferencesTitle: "Preferencias",
      preferencesBody:
        "Confirma las preferencias de tu perfil antes de continuar.",
      consentTitle: "Consentimiento",
      consentBody:
        "Revisa y acepta los acuerdos necesarios para tu Journey.",
      consentAllRecorded:
        "Los reconocimientos necesarios ya están registrados.",
      consentLuminaMemoryOptional:
        "Opcional: activa la memoria de Lumina para esta cuenta. Puedes cambiarlo después en Configuración.",
      luminaTitle: "Conoce a Lumina",
      luminaBody:
        "Lumina está disponible en tu espacio de Architect. Ábrela cuando estés listo y continúa.",
      luminaOpen: "Abrir Lumina",
      assessmentTitle: "Aliveness Index",
      assessmentIntroLabel: "Sobre esta evaluación",
      assessmentScaleLabel: "Escala de valoración",
      assessmentProgress: "{answered} de {total} afirmaciones valoradas",
      assessmentSave: "Guardar respuestas",
      assessmentCompleteHint:
        "Valora cada afirmación para continuar. Tus respuestas se guardan con esta cuenta de Architect.",
      assessmentRememberLabel: "Recuerda",
      assessmentReflectionLabel: "Reflexión",
      assessmentScoreLabel: "Puntuación general de Aliveness: {score} / {max}",
      awakeningTitle: "El Despertar",
      awakeningCta: "Comienza el Capítulo Uno",
      awakeningBegin: "Entrar al Capítulo Uno",
    },
    assessment: {
      questionsDescription:
        "Responde cada afirmación con honestidad según tu vida de hoy. Tus respuestas se guardan con esta cuenta de Architect.",
      resultsTitle: "Tu Aliveness Index",
      resultsDescription:
        "Revisa tus puntuaciones, reflexiona con las preguntas aprobadas y continúa cuando estés listo.",
      resultsEyebrow: "Aliveness Index",
      overallLabel: "Puntuación general de Aliveness",
      domainsLabel: "Puntuaciones por dominio",
      prioritiesLabel: "Más alto y más bajo",
      highestLabel: "Más alto",
      lowestLabel: "Más bajo — invita tu atención",
      attentionHint:
        "Usa las preguntas de reflexión a continuación. No se asigna ninguna banda de puntuación ni etiqueta clínica.",
      highestMarker: "Más alto",
      lowestMarker: "Más bajo",
      domainScoreAria: "{name}: {score} de {max}",
      discussWithLumina: "Conversar con Lumina",
      continueJourney: "Continuar el Journey",
      viewResults: "Ver resultados",
      saved: "Respuestas guardadas.",
      reviewOnlyHint:
        "Esta evaluación está completa y se puede revisar. Las respuestas no se sobrescriben.",
      incompleteBody:
        "Completa cada afirmación antes de ver los resultados.",
      openFullExperience: "Abrir evaluación Aliveness",
      statementFallbackNote:
        "Esta afirmación se muestra en inglés.",
      dashboardLinkIncomplete: "Continuar Aliveness Index",
      dashboardLinkComplete: "Ver resultados de Aliveness",
    },
    chapter1: {
      title: "Capítulo Uno — El Despertar",
      description:
        "Bienvenida del Founder, reflexión, El Proyecto de Aliveness y compromiso semanal — guardados con esta cuenta de Architect.",
      progressLabel: "Secciones del Capítulo Uno",
      sectionWelcome: "Bienvenida del Founder",
      sectionTeaching: "Enseñanza central",
      sectionReflection: "Preguntas de reflexión",
      sectionPractice: "Práctica intencional",
      sectionCommitment: "Compromiso semanal",
      sectionClosing: "Reflexión de cierre del Founder",
      sectionProject: "El Proyecto de Aliveness",
      sectionComplete: "Capítulo completo",
      sectionDone: "Completado",
      continueToTeaching: "Continuar a Enseñanza central",
      continueToReflection: "Continuar a Preguntas de reflexión",
      continueToPractice: "Continuar a Práctica intencional",
      continueToCommitment: "Continuar a Compromiso semanal",
      continueToClosing: "Continuar a Reflexión de cierre del Founder",
      continueToProject: "Continuar a El Proyecto de Aliveness",
      continueToComplete: "Continuar a Capítulo completo",
      back: "Atrás",
      saveAnswers: "Guardar respuestas",
      saving: "Guardando…",
      saved: "Respuestas guardadas.",
      addAnswer: "Agregar otra respuesta",
      answerLabel: "Respuesta {n}",
      answerProgress: "{filled} de {target} respuestas",
      examplesLabel: "Ejemplos",
      examplesOwnLabel: "Ejemplos (no los uses: crea los tuyos):",
      questionsLabel: "Preguntas de El Proyecto de Aliveness",
      alivenessProjectTitle: "El Proyecto de Aliveness",
      alivenessProjectIntro:
        "Responde cada pregunta con honestidad. Tus respuestas se guardan con esta cuenta de Architect y se restauran cuando regreses.",
      projectComplete: "Los requisitos de El Proyecto de Aliveness están completos.",
      incompleteProject:
        "Completa cada pregunta de El Proyecto de Aliveness con el número requerido de respuestas antes de finalizar el Capítulo Uno.",
      reflectionTitle: "Preguntas de reflexión de Architect",
      reflectionIntro:
        "Responde cada pregunta con honestidad. Tus respuestas se guardan con esta cuenta de Architect y se restauran cuando regreses.",
      reflectionComplete: "Las preguntas de reflexión están completas.",
      incompleteReflection:
        "Responde cada pregunta de reflexión antes de continuar.",
      commitmentAffirm:
        "Elijo este compromiso semanal: This week, I choose awareness over autopilot.",
      commitmentNoteLabel: "Nota opcional para esta semana",
      commitmentComplete: "Compromiso semanal guardado.",
      incompleteCommitment:
        "Afirma tu compromiso semanal antes de continuar.",
      incompleteWork:
        "Completa el trabajo requerido en esta sección antes de continuar.",
      completeBody:
        "El Capítulo Uno — El Despertar está completo. Tu trabajo permanece guardado con esta cuenta de Architect.",
      completePendingBody:
        "Confirma la finalización del Capítulo Uno cuando la reflexión, El Proyecto de Aliveness y el compromiso semanal estén terminados. Tus respuestas guardadas se conservan.",
      markComplete: "Marcar Capítulo Uno como completo",
      discussWithLumina: "Conversar sobre el Capítulo Uno con Lumina",
      returnDashboard: "Volver al Dashboard",
      returnJourney: "Resumen del Journey",
      openChapter: "Comenzar Capítulo Uno",
      resumeChapter: "Continuar Capítulo Uno",
      chapterCompleteLink: "Revisar Capítulo Uno",
      resourcesTitle: "Recursos del Capítulo Uno",
      resourcesDescription:
        "Descargas aprobadas disponibles para el trabajo del Capítulo I en esta cuenta de Architect.",
      downloadLabel: "Descargar",
      mediaUnavailable: "Medios del Founder no disponibles",
      mediaUnavailableDetail: "",
      mediaLoading: "Cargando video del Founder…",
      mediaCaptions: "Subtítulos",
      mediaTranscript: "Transcripción",
      translationPendingNote: "",
      error: "Algo salió mal. Inténtalo de nuevo.",
    },
    chapter2: {
      title: "Capítulo Dos — El Espejo",
      description:
        "Bienvenida del Founder, reflexión, El Espejo de The Back Half y compromiso semanal — guardados con esta cuenta de Architect.",
      progressLabel: "Secciones del Capítulo Dos",
      sectionWelcome: "Bienvenida del Founder",
      sectionTeaching: "Enseñanza central",
      sectionReflection: "Preguntas de reflexión",
      sectionPractice: "Práctica intencional",
      sectionCommitment: "Compromiso semanal",
      sectionClosing: "Reflexión de cierre del Founder",
      sectionProject: "El Espejo de The Back Half",
      sectionComplete: "Capítulo completo",
      sectionDone: "Completado",
      continueToTeaching: "Continuar a Enseñanza central",
      continueToReflection: "Continuar a Preguntas de reflexión",
      continueToPractice: "Continuar a Práctica intencional",
      continueToCommitment: "Continuar a Compromiso semanal",
      continueToClosing: "Continuar a Reflexión de cierre del Founder",
      continueToProject: "Continuar a El Espejo de The Back Half",
      continueToComplete: "Continuar a Capítulo completo",
      back: "Atrás",
      saveAnswers: "Guardar respuestas",
      saving: "Guardando…",
      saved: "Respuestas guardadas.",
      addAnswer: "Agregar otra respuesta",
      addMatrixRow: "Agregar otra fila",
      answerLabel: "Respuesta {n}",
      answerProgress: "{filled} de {target} respuestas",
      matrixProgress: "{filled} fila(s) completa(s) (mínimo {target})",
      dimensionProgress: "{filled} de {target} dimensiones anotadas",
      examplesLabel: "Ejemplos",
      questionsLabel: "Pasos de El Espejo de The Back Half",
      mirrorExerciseTitle: "El Espejo de The Back Half",
      mirrorExerciseIntro:
        "Trabaja cada paso con honestidad. Tus respuestas se guardan con esta cuenta de Architect y se restauran cuando regreses.",
      projectComplete: "Los requisitos de El Espejo de The Back Half están completos.",
      incompleteProject:
        "Completa cada paso de El Espejo de The Back Half con los umbrales requeridos antes de finalizar el Capítulo Dos.",
      reflectionTitle: "Preguntas de reflexión de Architect",
      reflectionIntro:
        "Responde cada pregunta con honestidad. Tus respuestas se guardan con esta cuenta de Architect y se restauran cuando regreses.",
      reflectionComplete: "Las preguntas de reflexión están completas.",
      incompleteReflection:
        "Responde cada pregunta de reflexión antes de continuar.",
      commitmentAffirm:
        "Elijo este compromiso semanal: This week, I choose honesty over comfort.",
      commitmentNoteLabel: "Nota opcional para esta semana",
      commitmentComplete: "Compromiso semanal guardado.",
      incompleteCommitment:
        "Afirma tu compromiso semanal antes de continuar.",
      incompleteWork:
        "Completa el trabajo requerido en esta sección antes de continuar.",
      completeBody:
        "El Capítulo Dos — El Espejo está completo. Tu trabajo permanece guardado con esta cuenta de Architect.",
      completePendingBody:
        "Confirma la finalización del Capítulo Dos cuando la reflexión, El Espejo de The Back Half y el compromiso semanal estén terminados. Tus respuestas guardadas se conservan.",
      markComplete: "Marcar Capítulo Dos como completo",
      discussWithLumina: "Conversar sobre el Capítulo Dos con Lumina",
      returnDashboard: "Volver al Dashboard",
      returnJourney: "Resumen del Journey",
      openChapter: "Comenzar Capítulo Dos",
      resumeChapter: "Continuar Capítulo Dos",
      chapterCompleteLink: "Revisar Capítulo Dos",
      resourcesTitle: "Recursos del Capítulo Dos",
      resourcesDescription:
        "Descargas aprobadas disponibles para el trabajo del Capítulo II en esta cuenta de Architect.",
      downloadLabel: "Descargar",
      mediaUnavailable: "Medios del Founder no disponibles",
      mediaUnavailableDetail: "",
      mediaLoading: "Cargando video del Founder…",
      mediaCaptions: "Subtítulos",
      mediaTranscript: "Transcripción",
      translationPendingNote: "",
      error: "Algo salió mal. Inténtalo de nuevo.",
    },
    chapter3: {
      title: "Capítulo III — La Decisión",
      description:
        "Bienvenida del Founder, reflexión, práctica de Declaración de Decisión y compromiso semanal — guardados con esta cuenta de Architect.",
      progressLabel: "Secciones del Capítulo Tres",
      sectionWelcome: "Bienvenida del Founder",
      sectionTeaching: "Enseñanza central",
      sectionReflection: "Preguntas de reflexión",
      sectionPractice: "Práctica intencional",
      sectionCommitment: "Compromiso semanal",
      sectionClosing: "Reflexión de cierre del Founder",
      sectionComplete: "Capítulo completo",
      sectionDone: "Completado",
      continueToTeaching: "Continuar a Enseñanza central",
      continueToReflection: "Continuar a Preguntas de reflexión",
      continueToPractice: "Continuar a Práctica intencional",
      continueToCommitment: "Continuar a Compromiso semanal",
      continueToClosing: "Continuar a Reflexión de cierre del Founder",
      continueToComplete: "Continuar a Capítulo completo",
      back: "Atrás",
      saveAnswers: "Guardar respuestas",
      saving: "Guardando…",
      saved: "Respuestas guardadas.",
      answerLabel: "Respuesta {n}",
      answerProgress: "{filled} de {target} respuestas",
      reflectionTitle: "Preguntas de reflexión de Architect",
      reflectionIntro:
        "Responde cada pregunta con honestidad. Tus respuestas se guardan con esta cuenta de Architect y se restauran cuando regreses.",
      reflectionComplete: "Las preguntas de reflexión están completas.",
      incompleteReflection:
        "Responde cada pregunta de reflexión antes de continuar.",
      practiceHint:
        "Tu Declaración de Decisión se guarda con esta cuenta de Architect.",
      practiceComplete: "Tu Declaración de Decisión está guardada.",
      incompletePractice:
        "Escribe tu Declaración de Decisión antes de continuar.",
      commitmentAffirm:
        "Elijo este compromiso semanal: Esta semana, elijo la intención sobre la expectativa.",
      commitmentNoteLabel: "Nota opcional para esta semana",
      commitmentComplete: "Compromiso semanal guardado.",
      incompleteCommitment:
        "Afirma tu compromiso semanal antes de continuar.",
      incompleteWork:
        "Completa el trabajo requerido en esta sección antes de continuar.",
      completeBody:
        "El Capítulo III — La Decisión está completo. Tu trabajo permanece guardado con esta cuenta de Architect.",
      completePendingBody:
        "Confirma la finalización del Capítulo Tres cuando la reflexión, la práctica y el compromiso estén terminados. Tus respuestas guardadas se conservan.",
      markComplete: "Marcar Capítulo Tres como completo",
      discussWithLumina: "Conversar sobre el Capítulo Tres con Lumina",
      returnDashboard: "Volver al Dashboard",
      returnJourney: "Resumen del Journey",
      openChapter: "Comenzar Capítulo Tres",
      resumeChapter: "Continuar Capítulo Tres",
      chapterCompleteLink: "Revisar Capítulo Tres",
      resourcesTitle: "Recursos del Capítulo Tres",
      resourcesDescription:
        "Descargas aprobadas disponibles para el trabajo del Capítulo III en esta cuenta de Architect.",
      downloadLabel: "Descargar",
      mediaUnavailable: "Medios del Founder no disponibles",
      // Never expose internal missing-asset / project language on Chapter III.
      mediaUnavailableDetail: "",
      mediaLoading: "Cargando video del Founder…",
      mediaCaptions: "Subtítulos",
      mediaTranscript: "Transcripción",
      translationPendingNote: "",
      error: "Algo salió mal. Inténtalo de nuevo.",
    },
    chapter4: {
      title: "Capítulo IV — Los Estándares",
      description:
        "Bienvenida del Founder, reflexión, práctica de Back Half Standards y compromiso semanal — guardados con esta cuenta de Architect.",
      progressLabel: "Secciones del Capítulo Cuatro",
      sectionWelcome: "Bienvenida del Founder",
      sectionTeaching: "Enseñanza central",
      sectionReflection: "Preguntas de reflexión",
      sectionPractice: "Práctica intencional",
      sectionCommitment: "Compromiso semanal",
      sectionClosing: "Reflexión de cierre del Founder",
      sectionComplete: "Capítulo completo",
      sectionDone: "Completado",
      continueToTeaching: "Continuar a Enseñanza central",
      continueToReflection: "Continuar a Preguntas de reflexión",
      continueToPractice: "Continuar a Práctica intencional",
      continueToCommitment: "Continuar a Compromiso semanal",
      continueToClosing: "Continuar a Reflexión de cierre del Founder",
      continueToComplete: "Continuar a Capítulo completo",
      back: "Atrás",
      saveAnswers: "Guardar respuestas",
      saving: "Guardando…",
      saved: "Respuestas guardadas.",
      answerLabel: "Respuesta {n}",
      answerProgress: "{filled} de {target} respuestas",
      reflectionTitle: "Preguntas de reflexión de Architect",
      reflectionIntro:
        "Responde cada pregunta con honestidad. Tus respuestas se guardan con esta cuenta de Architect y se restauran cuando regreses.",
      reflectionComplete: "Las preguntas de reflexión están completas.",
      incompleteReflection:
        "Responde cada pregunta de reflexión antes de continuar.",
      practiceHint:
        "Tus Back Half Standards se guardan con esta cuenta de Architect.",
      practiceComplete: "Tus Back Half Standards están guardados.",
      incompletePractice:
        "Escribe cinco Back Half Standards antes de continuar.",
      commitmentAffirm:
        "Elijo este compromiso semanal: Esta semana, elijo estándares sobre excusas.",
      commitmentNoteLabel: "Nota opcional para esta semana",
      commitmentComplete: "Compromiso semanal guardado.",
      incompleteCommitment:
        "Afirma tu compromiso semanal antes de continuar.",
      incompleteWork:
        "Completa el trabajo requerido en esta sección antes de continuar.",
      completeBody:
        "El Capítulo IV — Los Estándares está completo. Tu trabajo permanece guardado con esta cuenta de Architect.",
      completePendingBody:
        "Confirma la finalización del Capítulo Cuatro cuando la reflexión, la práctica y el compromiso estén terminados. Tus respuestas guardadas se conservan.",
      markComplete: "Marcar Capítulo Cuatro como completo",
      discussWithLumina: "Conversar sobre el Capítulo Cuatro con Lumina",
      returnDashboard: "Volver al Dashboard",
      returnJourney: "Resumen del Journey",
      openChapter: "Comenzar Capítulo Cuatro",
      resumeChapter: "Continuar Capítulo Cuatro",
      chapterCompleteLink: "Revisar Capítulo Cuatro",
      resourcesTitle: "Recursos del Capítulo Cuatro",
      resourcesDescription:
        "Descargas aprobadas disponibles para el trabajo del Capítulo IV en esta cuenta de Architect.",
      downloadLabel: "Descargar",
      mediaUnavailable: "Medios del Founder no disponibles",
      mediaUnavailableDetail: "",
      mediaLoading: "Cargando video del Founder…",
      mediaCaptions: "Subtítulos",
      mediaTranscript: "Transcripción",
      translationPendingNote: "",
      error: "Algo salió mal. Inténtalo de nuevo.",
    },
    chapter5: {
      title: "Capítulo V — Convertirse en Architect",
      description:
        "Bienvenida del Founder, reflexión, práctica de Architect Identity Statement y compromiso semanal — guardado con esta cuenta de Architect.",
      progressLabel: "Secciones del Capítulo Cinco",
      sectionWelcome: "Bienvenida del Founder",
      sectionTeaching: "Enseñanza central",
      sectionReflection: "Preguntas de reflexión",
      sectionPractice: "Práctica intencional",
      sectionCommitment: "Compromiso semanal",
      sectionClosing: "Reflexión de cierre del Founder",
      sectionComplete: "Capítulo completo",
      sectionDone: "Completado",
      continueToTeaching: "Continuar a Enseñanza central",
      continueToReflection: "Continuar a Preguntas de reflexión",
      continueToPractice: "Continuar a Práctica intencional",
      continueToCommitment: "Continuar a Compromiso semanal",
      continueToClosing: "Continuar a Reflexión de cierre del Founder",
      continueToComplete: "Continuar a Capítulo completo",
      back: "Atrás",
      saveAnswers: "Guardar respuestas",
      saving: "Guardando…",
      saved: "Respuestas guardadas.",
      answerLabel: "Respuesta {n}",
      answerProgress: "{filled} de {target} respuestas",
      reflectionTitle: "Preguntas de reflexión de Architect",
      reflectionIntro:
        "Responde cada pregunta con honestidad. Tus respuestas se guardan con esta cuenta de Architect y se restauran cuando regreses.",
      reflectionComplete: "Las preguntas de reflexión están completas.",
      incompleteReflection:
        "Responde cada pregunta de reflexión antes de continuar.",
      practiceHint:
        "Tu Architect Identity Statement se guarda con esta cuenta de Architect.",
      practiceComplete: "Tu Architect Identity Statement está guardada.",
      incompletePractice:
        "Escribe tu Architect Identity Statement antes de continuar.",
      commitmentAffirm:
        "Elijo este compromiso semanal: Esta semana, elijo vivir como el Architect de mi vida.",
      commitmentNoteLabel: "Nota opcional para esta semana",
      commitmentComplete: "Compromiso semanal guardado.",
      incompleteCommitment:
        "Afirma tu compromiso semanal antes de continuar.",
      incompleteWork:
        "Completa el trabajo requerido en esta sección antes de continuar.",
      completeBody:
        "El Capítulo V — Convertirse en Architect está completo. Tu trabajo permanece guardado con esta cuenta de Architect.",
      completePendingBody:
        "Confirma la finalización del Capítulo Cinco cuando la reflexión, la práctica y el compromiso estén terminados. Tus respuestas guardadas se conservan.",
      markComplete: "Marcar Capítulo Cinco como completo",
      discussWithLumina: "Conversar sobre el Capítulo Cinco con Lumina",
      returnDashboard: "Volver al Dashboard",
      returnJourney: "Resumen del Journey",
      openChapter: "Comenzar Capítulo Cinco",
      resumeChapter: "Continuar Capítulo Cinco",
      chapterCompleteLink: "Revisar Capítulo Cinco",
      resourcesTitle: "Recursos del Capítulo Cinco",
      resourcesDescription:
        "Descargas aprobadas disponibles para el trabajo del Capítulo V en esta cuenta.",
      downloadLabel: "Descargar",
      mediaUnavailable: "Medios del Founder no disponibles",
      mediaUnavailableDetail: "",
      mediaLoading: "Cargando video del Founder…",
      mediaCaptions: "Subtítulos",
      mediaTranscript: "Transcripción",
      translationPendingNote: "",
      error: "Algo salió mal. Inténtalo de nuevo.",
    },
    chapter6: {
      title: "Capítulo VI — Expansión",
      description:
        "Bienvenida del Founder, reflexión, práctica de Expansion Plan y compromiso semanal — guardado con esta cuenta de Architect.",
      progressLabel: "Secciones del Capítulo Seis",
      sectionWelcome: "Bienvenida del Founder",
      sectionTeaching: "Enseñanza central",
      sectionReflection: "Preguntas de reflexión",
      sectionPractice: "Práctica intencional",
      sectionCommitment: "Compromiso semanal",
      sectionClosing: "Reflexión de cierre del Founder",
      sectionComplete: "Capítulo completo",
      sectionDone: "Completado",
      continueToTeaching: "Continuar a Enseñanza central",
      continueToReflection: "Continuar a Preguntas de reflexión",
      continueToPractice: "Continuar a Práctica intencional",
      continueToCommitment: "Continuar a Compromiso semanal",
      continueToClosing: "Continuar a Reflexión de cierre del Founder",
      continueToComplete: "Continuar a Capítulo completo",
      back: "Atrás",
      saveAnswers: "Guardar respuestas",
      saving: "Guardando…",
      saved: "Respuestas guardadas.",
      answerLabel: "Respuesta {n}",
      answerProgress: "{filled} de {target} respuestas",
      reflectionTitle: "Preguntas de reflexión de Architect",
      reflectionIntro:
        "Responde cada pregunta con honestidad. Tus respuestas se guardan con esta cuenta de Architect y se restauran cuando regreses.",
      reflectionComplete: "Las preguntas de reflexión están completas.",
      incompleteReflection:
        "Responde cada pregunta de reflexión antes de continuar.",
      practiceHint:
        "Tu Expansion Plan se guarda con esta cuenta de Architect.",
      practiceComplete: "Tu Expansion Plan está guardado.",
      incompletePractice:
        "Completa cada área del Expansion Plan antes de continuar.",
      commitmentAffirm:
        "Elijo este compromiso semanal: Esta semana, elijo contribución sobre complacencia.",
      commitmentNoteLabel: "Nota opcional para esta semana",
      commitmentComplete: "Compromiso semanal guardado.",
      incompleteCommitment:
        "Afirma tu compromiso semanal antes de continuar.",
      incompleteWork:
        "Completa el trabajo requerido en esta sección antes de continuar.",
      completeBody:
        "El Capítulo VI — Expansión está completo. Tu trabajo permanece guardado con esta cuenta de Architect.",
      completePendingBody:
        "Confirma la finalización del Capítulo Seis cuando la reflexión, la práctica y el compromiso estén terminados. Tus respuestas guardadas se conservan.",
      markComplete: "Marcar Capítulo Seis como completo",
      discussWithLumina: "Conversar sobre el Capítulo Seis con Lumina",
      returnDashboard: "Volver al Dashboard",
      returnJourney: "Resumen del Journey",
      openChapter: "Comenzar Capítulo Seis",
      resumeChapter: "Continuar Capítulo Seis",
      chapterCompleteLink: "Revisar Capítulo Seis",
      resourcesTitle: "Recursos del Capítulo Seis",
      resourcesDescription:
        "Descargas aprobadas disponibles para el trabajo del Capítulo VI en esta cuenta.",
      downloadLabel: "Descargar",
      mediaUnavailable: "Medios del Founder no disponibles",
      mediaUnavailableDetail: "",
      mediaLoading: "Cargando video del Founder…",
      mediaCaptions: "Subtítulos",
      mediaTranscript: "Transcripción",
      translationPendingNote: "",
      error: "Algo salió mal. Inténtalo de nuevo.",
    },
    chapter7: {
      title: "Capítulo VII — El Comienzo",
      description:
        "Bienvenida del Founder, reflexión, Back Half Declaration y compromiso final — guardado con esta cuenta de Architect.",
      progressLabel: "Secciones del Capítulo Siete",
      sectionWelcome: "Bienvenida del Founder",
      sectionTeaching: "Enseñanza central",
      sectionReflection: "Preguntas de reflexión",
      sectionPractice: "Práctica intencional",
      sectionCommitment: "Compromiso semanal",
      sectionClosing: "Reflexión de cierre del Founder",
      sectionComplete: "Capítulo completo",
      sectionDone: "Completado",
      continueToTeaching: "Continuar a Enseñanza central",
      continueToReflection: "Continuar a Preguntas de reflexión",
      continueToPractice: "Continuar a Práctica intencional",
      continueToCommitment: "Continuar a Compromiso semanal",
      continueToClosing: "Continuar a Reflexión de cierre del Founder",
      continueToComplete: "Continuar a Capítulo completo",
      back: "Atrás",
      saveAnswers: "Guardar respuestas",
      saving: "Guardando…",
      saved: "Respuestas guardadas.",
      answerLabel: "Respuesta {n}",
      answerProgress: "{filled} de {target} respuestas",
      reflectionTitle: "Preguntas de reflexión de Architect",
      reflectionIntro:
        "Responde cada pregunta con honestidad. Tus respuestas se guardan con esta cuenta de Architect y se restauran cuando regreses.",
      reflectionComplete: "Las preguntas de reflexión están completas.",
      incompleteReflection:
        "Responde cada pregunta de reflexión antes de continuar.",
      practiceHint:
        "Tu Back Half Declaration se guarda con esta cuenta de Architect.",
      practiceComplete: "Tu Back Half Declaration está guardada.",
      incompletePractice:
        "Escribe, firma y fecha tu Back Half Declaration antes de continuar.",
      signatureLabel: "Firma de Architect",
      signedDateLabel: "Fecha",
      commitmentAffirm:
        "Elijo este compromiso semanal: Hoy, y cada día, elijo vivir con intención y crear una vida de plenitud, propósito y posibilidad.",
      commitmentNoteLabel: "Nota opcional para esta semana",
      commitmentComplete: "Compromiso semanal guardado.",
      incompleteCommitment:
        "Afirma tu compromiso semanal antes de continuar.",
      incompleteWork:
        "Completa el trabajo requerido en esta sección antes de continuar.",
      completeBody:
        "El Capítulo VII — El Comienzo está completo. Tu trabajo del Journey permanece guardado con esta cuenta de Architect.",
      completePendingBody:
        "Confirma la finalización del Capítulo Siete cuando la reflexión, la práctica y el compromiso estén terminados. Tus respuestas guardadas se conservan.",
      markComplete: "Marcar Capítulo Siete como completo",
      discussWithLumina: "Conversar sobre el Capítulo Siete con Lumina",
      returnDashboard: "Volver al Dashboard",
      returnJourney: "Resumen del Journey",
      openChapter: "Comenzar Capítulo Siete",
      resumeChapter: "Continuar Capítulo Siete",
      chapterCompleteLink: "Revisar Capítulo Siete",
      resourcesTitle: "Recursos del Capítulo Siete",
      resourcesDescription:
        "Descargas aprobadas disponibles para el Capítulo VII y la finalización del Journey en esta cuenta.",
      downloadLabel: "Descargar",
      mediaUnavailable: "Medios del Founder no disponibles",
      mediaUnavailableDetail: "",
      mediaLoading: "Cargando video del Founder…",
      mediaCaptions: "Subtítulos",
      mediaTranscript: "Transcripción",
      translationPendingNote: "",
      error: "Algo salió mal. Inténtalo de nuevo.",
    },
    lumina: {
      title: "Lumina",
      description: "Un espacio sereno para continuar con Lumina.",
      emptyTitle: "Empieza cuando estés listo",
      emptyBody:
        "Escribe un mensaje abajo. Tu conversación permanece con esta cuenta de Architect.",
      composerLabel: "Mensaje para Lumina",
      composerPlaceholder: "Escribe tu mensaje…",
      send: "Enviar",
      sending: "Enviando…",
      responding: "Lumina está respondiendo…",
      retry: "Reintentar",
      errorGeneric: "Algo salió mal. Puedes intentarlo de nuevo.",
      citationsLabel: "Referencias",
      externalLinkHint: "se abre en una pestaña nueva",
      architectLabel: "Architect",
      luminaLabel: "Lumina",
      disclosureLink: "Divulgación de IA",
      memoryActive: "Memoria activada",
      memoryInactive: "Memoria desactivada",
    },
    resources: {
      title: "Recursos de Architect",
      description:
        "Descargas aprobadas, materiales de portafolio y recursos de diario aparecerán aquí.",
    },
    billing: {
      title: "Facturación",
      description:
        "Revisa tus compras, abre facturas y recibos, y administra la facturación de Community de forma segura a través de Stripe.",
      purchasesHeading: "Tus compras",
      noPurchases: "Aún no hay compras registradas para esta cuenta de Architect.",
      activeCommunity: "Suscripción Community activa",
      noActiveCommunity: "Sin suscripción Community activa",
      paidThrough: "Pagado hasta",
      manageBilling: "Administrar facturación",
      manageBillingPending: "Abriendo el portal de facturación de Stripe…",
      portalUnavailable:
        "El portal de facturación no está disponible en este momento. Inténtalo de nuevo o contacta a soporte.",
      portalNoCustomer:
        "La administración de facturación estará disponible después de asociar una compra de Stripe a tu cuenta.",
      portalError: "No pudimos abrir la administración de facturación. Inténtalo de nuevo.",
      invoicesReceiptsHeading: "Facturas y recibos",
      noDocuments: "Aún no hay facturas ni recibos disponibles.",
      invoiceLabel: "Factura",
      receiptLabel: "Recibo",
      openDocument: "Abrir",
      cancellationHeading: "Cancelación",
      cancellationCommunityOnly:
        "La membresía Community puede cancelarse en Administrar facturación. La cancelación detiene renovaciones futuras.",
      cancellationNotRefund:
        "La cancelación no es un reembolso. La política estándar de The Back Half es sin reembolsos.",
      cancellationOneTimeUnavailable:
        "Las compras únicas de Blueprint y Bundle no incluyen controles de cancelación después de un pago exitoso.",
      supportHeading: "Soporte de facturación",
      supportDescription:
        "¿Necesitas ayuda con un método de pago, factura, recibo o pregunta de suscripción?",
      supportCta: "Contactar soporte",
      statusPaid: "Pagado",
      statusFailed: "Fallido",
      statusRefunded: "Reembolsado",
      journeyAccessOn: "Acceso Journey: activo",
      journeyAccessOff: "Acceso Journey: no activo",
      communityAccessOn: "Acceso Community: activo",
      communityAccessOff: "Acceso Community: no activo",
    },
    metadata: {
      dashboard: {
        title: "Panel de Architect — The Back Half",
        description:
          "Tu espacio Architect con el capítulo actual del Journey, progreso, recursos y acciones para continuar.",
      },
      journey: {
        title: "El Journey — Architect — The Back Half",
        description: "Continúa tu Journey como Architect.",
      },
      onboarding: {
        title: "Incorporación al Journey — Architect — The Back Half",
        description:
          "Establece tus preferencias y comienza tu Journey como Architect.",
      },
      assessment: {
        title: "Aliveness Index — Architect — The Back Half",
        description:
          "Completa la evaluación Aliveness Index para tu Journey de Architect.",
      },
      assessmentResults: {
        title: "Resultados Aliveness Index — Architect — The Back Half",
        description:
          "Revisa tus puntuaciones del Aliveness Index y las preguntas de reflexión.",
      },
      lumina: {
        title: "Lumina — Architect — The Back Half",
        description: "Continúa con Lumina en tu espacio de Architect.",
      },
      resources: {
        title: "Recursos de Architect — The Back Half",
        description: "Recursos para Architects.",
      },
      settings: {
        title: "Perfil y preferencias — Architect — The Back Half",
        description:
          "Perfil, preferencias, historial de consentimiento y controles de cuenta de Architect.",
      },
      billing: {
        title: "Facturación — Architect — The Back Half",
        description:
          "Administra compras, facturas, recibos y la facturación de Community.",
      },
    },
  },
};
