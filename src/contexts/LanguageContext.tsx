import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

type Language = 'en' | 'es';

interface Translations {
  [key: string]: {
    en: string;
    es: string;
  };
}

const translations: Translations = {
  // Profile Tab
  'profile.administrator': { en: 'Administrator', es: 'Administrador' },
  'profile.adminAccess': { en: 'Admin Access', es: 'Acceso de Administrador' },
  'profile.openAdminPanel': { en: 'Open Admin Panel', es: 'Abrir Panel de Administrador' },
  'profile.settings': { en: 'Settings', es: 'Configuración' },
  'profile.theme': { en: 'Theme', es: 'Tema' },
  'profile.language': { en: 'Language', es: 'Idioma' },
  'profile.notifications': { en: 'Notifications', es: 'Notificaciones' },
  'profile.smsNotifications': { en: 'SMS Notifications', es: 'Notificaciones SMS' },
  'profile.comingSoon': { en: 'Coming Soon', es: 'Próximamente' },
  'profile.about': { en: 'About', es: 'Acerca de' },
  'profile.appVersion': { en: 'App Version', es: 'Versión de la App' },
  'profile.build': { en: 'Build', es: 'Compilación' },
  'profile.lastUpdated': { en: 'Last Updated', es: 'Última Actualización' },
  'profile.today': { en: 'Today', es: 'Hoy' },
  'profile.signOut': { en: 'Sign Out', es: 'Cerrar Sesión' },
  'profile.selectLanguage': { en: 'Select Language', es: 'Seleccionar Idioma' },
  'profile.english': { en: 'English', es: 'Inglés' },
  'profile.spanish': { en: 'Spanish', es: 'Español' },
  'profile.languageChanged': { en: 'Language changed to', es: 'Idioma cambiado a' },
  'profile.editName': { en: 'Edit Your Name', es: 'Editar Tu Nombre' },
  'profile.fullName': { en: 'Full Name', es: 'Nombre Completo' },
  'profile.enterFullName': { en: 'Enter your full name', es: 'Ingresa tu nombre completo' },
  'profile.enableSms': { en: 'Enable SMS Notifications', es: 'Activar Notificaciones SMS' },
  'profile.stayUpdated': { en: 'Stay Updated', es: 'Mantente Actualizado' },
  'profile.smsDescription': { en: 'Get text messages when:', es: 'Recibe mensajes de texto cuando:' },
  'profile.smsNewMessage': { en: 'You receive a new chat message', es: 'Recibes un nuevo mensaje de chat' },
  'profile.smsJobAssignment': { en: "You're assigned to a job or task", es: 'Te asignan a un trabajo o tarea' },
  'profile.smsRequestReview': { en: 'Your requests are reviewed', es: 'Tus solicitudes son revisadas' },
  'profile.smsProjectUpdate': { en: 'Project updates are posted', es: 'Se publican actualizaciones del proyecto' },
  'profile.smsDisclaimer': { en: "You'll only receive notifications for things that directly involve you. Standard messaging rates may apply.", es: 'Solo recibirás notificaciones de cosas que te involucren directamente. Pueden aplicarse tarifas estándar de mensajería.' },
  'profile.on': { en: 'On', es: 'Activo' },
  'profile.off': { en: 'Off', es: 'Inactivo' },
  
  // Navigation
  'nav.home': { en: 'Home', es: 'Inicio' },
  'nav.projects': { en: 'Projects', es: 'Proyectos' },
  'nav.schedule': { en: 'Schedule', es: 'Horario' },
  'nav.messages': { en: 'Chat', es: 'Chat' },
  'nav.profile': { en: 'Profile', es: 'Perfil' },
  'nav.timeClock': { en: 'Time Clock', es: 'Reloj de Tiempo' },
  'nav.camera': { en: 'Camera', es: 'Cámara' },
  
  // Common
  'common.teamMember': { en: 'Team Member', es: 'Miembro del Equipo' },
  'common.search': { en: 'Search', es: 'Buscar' },
  'common.cancel': { en: 'Cancel', es: 'Cancelar' },
  'common.save': { en: 'Save', es: 'Guardar' },
  'common.saving': { en: 'Saving...', es: 'Guardando...' },
  'common.loading': { en: 'Loading...', es: 'Cargando...' },
  'common.error': { en: 'Error', es: 'Error' },
  'common.success': { en: 'Success', es: 'Éxito' },
  'common.notNow': { en: 'Not Now', es: 'Ahora No' },
  'common.enable': { en: 'Enable', es: 'Activar' },
  'common.enabling': { en: 'Enabling...', es: 'Activando...' },
  'common.back': { en: 'Back', es: 'Atrás' },
  'common.close': { en: 'Close', es: 'Cerrar' },
  'common.view': { en: 'View', es: 'Ver' },
  'common.edit': { en: 'Edit', es: 'Editar' },
  'common.delete': { en: 'Delete', es: 'Eliminar' },
  'common.create': { en: 'Create', es: 'Crear' },
  'common.update': { en: 'Update', es: 'Actualizar' },
  
  // Header
  'header.help': { en: 'Help', es: 'Ayuda' },
  'header.signIn': { en: 'Sign In', es: 'Iniciar Sesión' },
  'header.signedOut': { en: 'Signed out', es: 'Sesión cerrada' },
  'header.signedOutDesc': { en: 'You have been successfully signed out.', es: 'Has cerrado sesión exitosamente.' },
  'header.signOutError': { en: 'Failed to sign out. Please try again.', es: 'Error al cerrar sesión. Por favor intenta de nuevo.' },
  
  // Home Tab
  'home.quickActions': { en: 'Quick Actions', es: 'Acciones Rápidas' },
  'home.goodMorning': { en: 'Good morning', es: 'Buenos días' },
  'home.goodAfternoon': { en: 'Good afternoon', es: 'Buenas tardes' },
  'home.goodEvening': { en: 'Good evening', es: 'Buenas noches' },
  'home.camera': { en: 'Capture project moments', es: 'Captura momentos del proyecto' },
  'home.messages': { en: 'New team messages', es: 'Nuevos mensajes del equipo' },
  'home.timeClock': { en: 'Time Clock', es: 'Reloj de Tiempo' },
  'home.myAssignments': { en: 'My Assignments', es: 'Mis Asignaciones' },
  'home.noAssignments': { en: 'No upcoming assignments', es: 'No hay asignaciones próximas' },
  'home.viewAll': { en: 'View All', es: 'Ver Todo' },
  'home.projectUpdates': { en: 'Project Updates', es: 'Actualizaciones de Proyecto' },
  'home.noUpdates': { en: 'No recent updates', es: 'No hay actualizaciones recientes' },
  'home.moreApps': { en: 'More Apps', es: 'Más Aplicaciones' },
  'home.projects': { en: 'Projects', es: 'Proyectos' },
  'home.myTasks': { en: 'My Tasks', es: 'Mis Tareas' },
  'home.team': { en: 'Team', es: 'Equipo' },
  'home.today': { en: 'Today', es: 'Hoy' },
  'home.assignedTo': { en: 'Assigned to', es: 'Asignado a' },
  'home.photos': { en: 'Photos', es: 'Fotos' },
  'home.chatWithFriends': { en: 'Chat with Friends', es: 'Chatea con Amigos' },
  'home.clockIn': { en: 'Clock In', es: 'Fichar Entrada' },
  'home.aiReview': { en: 'AI Review', es: 'Reseña IA' },
  'home.aiReviewDesc': { en: 'For Google and Yelp in < 1 min', es: 'Para Google y Yelp en < 1 min' },
  'home.recentProjectUpdates': { en: 'Recent Project Updates', es: 'Actualizaciones Recientes' },
  'home.loadingUpdates': { en: 'Loading updates...', es: 'Cargando actualizaciones...' },
  'home.noRecentActivity': { en: 'No recent activity to show.', es: 'No hay actividad reciente.' },
  'home.activityWillAppear': { en: 'Activity will appear here as you use the app', es: 'La actividad aparecerá aquí mientras usas la app' },
  'home.assignmentsTip': { en: "You'll see shifts, tasks, and projects assigned to you here.", es: 'Verás turnos, tareas y proyectos asignados aquí.' },
  
  // Navigation extras
  'nav.admin': { en: 'Admin', es: 'Admin' },
  
  // Profile toasts
  'profile.nameUpdated': { en: 'Name updated successfully', es: 'Nombre actualizado exitosamente' },
  'profile.nameUpdateFailed': { en: 'Failed to update name', es: 'Error al actualizar nombre' },
  'profile.nameEmpty': { en: 'Name cannot be empty', es: 'El nombre no puede estar vacío' },
  'profile.smsEnabled': { en: 'SMS notifications enabled', es: 'Notificaciones SMS activadas' },
  'profile.smsDisabled': { en: 'SMS notifications disabled', es: 'Notificaciones SMS desactivadas' },
  'profile.smsUpdateFailed': { en: 'Failed to update SMS preference', es: 'Error al actualizar preferencia SMS' },
  'profile.fileTooLarge': { en: 'File size must be less than 5MB', es: 'El archivo debe ser menor a 5MB' },
  'profile.selectImageFile': { en: 'Please select an image file', es: 'Por favor selecciona un archivo de imagen' },
  
  // Request form labels
  'requests.requestEdit': { en: 'Request edit', es: 'Solicitar edición' },
  'requests.requestTimeOff': { en: 'Request time off', es: 'Solicitar tiempo libre' },
  'requests.select': { en: 'Select', es: 'Seleccionar' },
  'requests.starts': { en: 'Starts', es: 'Inicia' },
  'requests.ends': { en: 'Ends', es: 'Termina' },
  'requests.start': { en: 'Start', es: 'Inicio' },
  'requests.end': { en: 'End', es: 'Fin' },
  'requests.breakTime': { en: 'Break time', es: 'Tiempo de descanso' },
  'requests.noJob': { en: 'No job', es: 'Sin trabajo' },
  'requests.mileage': { en: 'Mileage', es: 'Kilometraje' },
  'requests.willBeIncluded': { en: 'Will be included', es: 'Será incluido' },
  'requests.leftBlank': { en: '(left blank)', es: '(vacío)' },
  'requests.attachNote': { en: 'Attach a note to your request', es: 'Adjunta una nota a tu solicitud' },
  'requests.note': { en: 'Note', es: 'Nota' },
  'requests.confirm': { en: 'Confirm', es: 'Confirmar' },
  'requests.selectType': { en: 'Select Type', es: 'Seleccionar Tipo' },
  'requests.totalTimeOff': { en: 'Total time off', es: 'Total tiempo libre' },
  
  // Mobile app tip
  'mobile.uploadTip': { en: "You're using the Roofing Friend app. Add photos even without internet—uploads will sync automatically.", es: 'Estás usando la app Roofing Friend. Agrega fotos sin internet—se sincronizarán automáticamente.' },
  
  // Assignment Confirmation
  'assignment.newAssignment': { en: 'New Assignment', es: 'Nueva Asignación' },
  'assignment.youHaveBeenAssignedToJob': { en: 'You have been assigned to a job', es: 'Has sido asignado a un trabajo' },
  'assignment.youHaveBeenAssignedToTask': { en: 'You have been assigned to a task', es: 'Has sido asignado a una tarea' },
  'assignment.location': { en: 'Location', es: 'Ubicación' },
  'assignment.date': { en: 'Date', es: 'Fecha' },
  'assignment.time': { en: 'Time', es: 'Hora' },
  'assignment.confirm': { en: 'Confirm', es: 'Confirmar' },
  'assignment.reject': { en: 'Reject', es: 'Rechazar' },
  'assignment.confirmed': { en: 'Assignment Confirmed', es: 'Asignación Confirmada' },
  'assignment.youHaveConfirmed': { en: 'You have confirmed this assignment', es: 'Has confirmado esta asignación' },
  'assignment.rejected': { en: 'Assignment Rejected', es: 'Asignación Rechazada' },
  'assignment.youHaveRejected': { en: 'You have rejected this assignment', es: 'Has rechazado esta asignación' },
  'assignment.failedToConfirm': { en: 'Failed to confirm assignment', es: 'Error al confirmar la asignación' },
  'assignment.failedToReject': { en: 'Failed to reject assignment', es: 'Error al rechazar la asignación' },
  
  // Projects Tab
  'projects.title': { en: 'Projects', es: 'Proyectos' },
  'projects.subtitle': { en: 'Manage your projects', es: 'Administra tus proyectos' },
  'projects.searchPlaceholder': { en: 'Search projects...', es: 'Buscar proyectos...' },
  'projects.createNew': { en: 'Create New Project', es: 'Crear Nuevo Proyecto' },
  'projects.projectName': { en: 'Project Name', es: 'Nombre del Proyecto' },
  'projects.enterProjectName': { en: 'Enter project name', es: 'Ingresa el nombre del proyecto' },
  'projects.projectAddress': { en: 'Project Address', es: 'Dirección del Proyecto' },
  'projects.enterAddress': { en: 'Enter address', es: 'Ingresa la dirección' },
  'projects.projectType': { en: 'Project Type', es: 'Tipo de Proyecto' },
  'projects.selectType': { en: 'Select type', es: 'Selecciona tipo' },
  'projects.residential': { en: 'Residential', es: 'Residencial' },
  'projects.commercial': { en: 'Commercial', es: 'Comercial' },
  'projects.industrial': { en: 'Industrial', es: 'Industrial' },
  'projects.clientName': { en: "Client's Name", es: 'Nombre del Cliente' },
  'projects.enterClientName': { en: "Enter client's name", es: 'Ingresa el nombre del cliente' },
  'projects.clientPhone': { en: "Client's Phone", es: 'Teléfono del Cliente' },
  'projects.enterClientPhone': { en: "Enter client's phone", es: 'Ingresa el teléfono del cliente' },
  'projects.additionalContact': { en: 'Additional Contact', es: 'Contacto Adicional' },
  'projects.enterAdditionalContact': { en: 'Enter additional contact (optional)', es: 'Ingresa contacto adicional (opcional)' },
  'projects.creating': { en: 'Creating...', es: 'Creando...' },
  'projects.noProjects': { en: 'No projects found', es: 'No se encontraron proyectos' },
  'projects.missingInfo': { en: 'Missing Information', es: 'Falta Información' },
  'projects.enterProjectNameError': { en: 'Please enter a project name.', es: 'Por favor ingresa un nombre de proyecto.' },
  'projects.enterAddressError': { en: 'Please enter a project address.', es: 'Por favor ingresa una dirección de proyecto.' },
  'projects.enterClientNameError': { en: "Please enter client's name.", es: 'Por favor ingresa el nombre del cliente.' },
  'projects.enterClientPhoneError': { en: "Please enter client's phone number.", es: 'Por favor ingresa el teléfono del cliente.' },
  'projects.jobs': { en: 'Jobs', es: 'Trabajos' },
  'projects.searchJobs': { en: 'Search jobs...', es: 'Buscar trabajos...' },
  'projects.noJobs': { en: 'No jobs found', es: 'No se encontraron trabajos' },
  'projects.jobLists': { en: 'Job Lists', es: 'Listas de Trabajo' },
  'projects.sTickets': { en: 'S Tickets', es: 'S Tickets' },
  'projects.filterByLabel': { en: 'Filter by Label', es: 'Filtrar por Etiqueta' },
  'projects.searchJobLists': { en: 'Search job lists...', es: 'Buscar listas de trabajo...' },
  'projects.loading': { en: 'Loading projects...', es: 'Cargando proyectos...' },
  'projects.loadingJobs': { en: 'Loading job lists...', es: 'Cargando listas de trabajo...' },
  'projects.loadError': { en: 'Failed to load projects', es: 'Error al cargar proyectos' },
  'projects.noJobLists': { en: 'No job lists found', es: 'No se encontraron listas de trabajo' },
  'projects.tryAdjusting': { en: 'Try adjusting your search', es: 'Intenta ajustar tu búsqueda' },
  'projects.address': { en: 'Address', es: 'Dirección' },
  'projects.autoFilled': { en: 'Auto-filled from address', es: 'Auto-rellenado desde la dirección' },
  'projects.enterClientNamePlaceholder': { en: "Enter client's name", es: 'Ingresa el nombre del cliente' },
  'projects.enterClientPhonePlaceholder': { en: "Enter client's phone number", es: 'Ingresa el número de teléfono del cliente' },
  'projects.selectProjectType': { en: 'Select project type', es: 'Selecciona tipo de proyecto' },
  
  // Messages Tab
  'messages.title': { en: 'Messages', es: 'Mensajes' },
  'messages.subtitle': { en: 'Your conversations and channels', es: 'Tus conversaciones y canales' },
  'messages.searchPlaceholder': { en: 'Search conversations...', es: 'Buscar conversaciones...' },
  'messages.all': { en: 'All', es: 'Todos' },
  'messages.unread': { en: 'Unread', es: 'No Leídos' },
  'messages.teams': { en: 'Teams', es: 'Equipos' },
  'messages.startConversation': { en: 'Start a conversation', es: 'Iniciar una conversación' },
  'messages.noMessages': { en: 'No messages', es: 'No hay mensajes' },
  'messages.typeMessage': { en: 'Type a message...', es: 'Escribe un mensaje...' },
  'messages.send': { en: 'Send', es: 'Enviar' },
  
  // Time Clock Tab
  'timeClock.title': { en: 'Time Clock', es: 'Reloj de Tiempo' },
  'timeClock.clockIn': { en: 'Clock In', es: 'Fichar Entrada' },
  'timeClock.clockOut': { en: 'Clock Out', es: 'Fichar Salida' },
  'timeClock.startBreak': { en: 'Start Break', es: 'Iniciar Descanso' },
  'timeClock.endBreak': { en: 'End Break', es: 'Terminar Descanso' },
  'timeClock.todayHours': { en: 'Today\'s Hours', es: 'Horas de Hoy' },
  'timeClock.hoursWorked': { en: 'hours worked', es: 'horas trabajadas' },
  'timeClock.currentShift': { en: 'Current Shift', es: 'Turno Actual' },
  'timeClock.currentSession': { en: 'Current session', es: 'Sesión actual' },
  'timeClock.totalWorkHoursToday': { en: 'Total work hours today', es: 'Horas trabajadas hoy' },
  'timeClock.selectProject': { en: 'Select Project', es: 'Seleccionar Proyecto' },
  'timeClock.noProjectSelected': { en: 'No project selected', es: 'No se ha seleccionado proyecto' },
  'timeClock.locationError': { en: 'Location access required', es: 'Se requiere acceso a la ubicación' },
  'timeClock.locationRequired': { en: 'Location Required', es: 'Ubicación Requerida' },
  'timeClock.enableLocationRetry': { en: 'Enable Location & Retry', es: 'Activar Ubicación y Reintentar' },
  'timeClock.iEnabledLocationRetry': { en: "I've Enabled Location - Retry", es: 'Ya Activé la Ubicación - Reintentar' },
  'timeClock.requestPermissionAgain': { en: 'Request Location Permission', es: 'Solicitar Permiso de Ubicación' },
  'timeClock.openSettingsAndRetry': { en: 'Open Settings & Retry', es: 'Abrir Configuración y Reintentar' },
  'timeClock.howToEnableLocation': { en: 'How to enable location:', es: 'Cómo activar la ubicación:' },
  'timeClock.locationStep1': { en: 'Open your device Settings or tap the lock icon in browser', es: 'Abre Configuración de tu dispositivo o toca el candado en el navegador' },
  'timeClock.locationStep2': { en: 'Find "Location" or "Permissions" and enable for this app', es: 'Busca "Ubicación" o "Permisos" y actívalo para esta app' },
  'timeClock.locationStep3': { en: 'Come back and tap the button below', es: 'Regresa y toca el botón de abajo' },
  'timeClock.gettingLocation': { en: 'Getting your location...', es: 'Obteniendo tu ubicación...' },
  'timeClock.timesheet': { en: 'Timesheet', es: 'Hoja de Tiempo' },
  'timeClock.history': { en: 'History', es: 'Historial' },
  'timeClock.noEntries': { en: 'No timesheet entries', es: 'No hay entradas en la hoja de tiempo' },
  'timeClock.noEntriesToday': { en: 'No entries for today', es: 'Sin entradas hoy' },
  'timeClock.status': { en: 'Status', es: 'Estado' },
  'timeClock.active': { en: 'Active', es: 'Activo' },
  'timeClock.completed': { en: 'Completed', es: 'Completado' },
  'timeClock.break': { en: 'Break', es: 'Descanso' },
  'timeClock.myRequests': { en: 'My requests', es: 'Mis solicitudes' },
  'timeClock.addNewRequest': { en: 'Add a new request', es: 'Agregar nueva solicitud' },
  'timeClock.addShiftRequest': { en: 'Add a shift request', es: 'Agregar solicitud de turno' },
  'timeClock.addBreakRequest': { en: 'Add a break request', es: 'Agregar solicitud de descanso' },
  'timeClock.addTimeOffRequest': { en: 'Add a time off request', es: 'Agregar solicitud de tiempo libre' },
  'timeClock.todaysTotal': { en: "Today's Total", es: 'Total de Hoy' },
  'timeClock.refresh': { en: 'Refresh', es: 'Actualizar' },
  'timeClock.entry': { en: 'Entry', es: 'Entrada' },
  'timeClock.working': { en: 'Working', es: 'Trabajando' },
  'timeClock.onBreak': { en: 'On Break', es: 'En Descanso' },
  'timeClock.complete': { en: 'Complete', es: 'Completo' },
  'timeClock.location': { en: 'Location', es: 'Ubicación' },
  'timeClock.gettingAddress': { en: 'Getting address...', es: 'Obteniendo dirección...' },
  'timeClock.breakTime': { en: 'Break Time', es: 'Tiempo de Descanso' },
  'timeClock.minutes': { en: 'minutes', es: 'minutos' },
  
  // Status
  'status.active': { en: 'Active', es: 'Activo' },
  'status.completed': { en: 'Completed', es: 'Completado' },
  'status.pending': { en: 'Pending', es: 'Pendiente' },
  'status.inProgress': { en: 'In Progress', es: 'En Progreso' },
  'status.cancelled': { en: 'Cancelled', es: 'Cancelado' },
  'status.onHold': { en: 'On Hold', es: 'En Espera' },
  
  // Safety Checklist
  'safety.title': { en: 'Safety Checklist', es: 'Lista de Seguridad' },
  'safety.instruction': { en: 'Please confirm you have the following safety equipment:', es: 'Por favor confirma que tienes el siguiente equipo de seguridad:' },
  'safety.hardHat': { en: 'Hard Hat', es: 'Casco' },
  'safety.steelBoots': { en: 'Steel Cap Boots', es: 'Botas con Puntera de Acero' },
  'safety.safetyVest': { en: 'Safety Vest', es: 'Chaleco de Seguridad' },
  'safety.protectiveGlasses': { en: 'Protective Glasses', es: 'Gafas Protectoras' },
  'safety.additionalItems': { en: 'Additional Items (Optional)', es: 'Artículos Adicionales (Opcional)' },
  'safety.additionalPlaceholder': { en: 'List any additional safety equipment...', es: 'Lista cualquier equipo de seguridad adicional...' },
  'safety.confirm': { en: 'Confirm & Clock In', es: 'Confirmar y Fichar Entrada' },
  'safety.pleaseCheckAll': { en: 'Please check all required safety items', es: 'Por favor marca todos los artículos de seguridad requeridos' },
  
  // Chat Suggestions
  'chat.soundsGood': { en: '👍 Sounds good', es: '👍 Me parece bien' },
  'chat.thanksForUpdate': { en: 'Thanks for the update', es: 'Gracias por la actualización' },
  'chat.illTakeCareOfIt': { en: "I'll take care of it", es: 'Yo me encargo' },
  'chat.keepMePosted': { en: 'Keep me posted', es: 'Mantenme informado' },
  'chat.whatTimeWorks': { en: 'What time works best for everyone?', es: '¿Qué hora les funciona mejor a todos?' },
  'chat.sendCalendarInvite': { en: "I'll send a calendar invite", es: 'Enviaré una invitación de calendario' },
  'chat.updateProjectStatus': { en: "I'll update the project status", es: 'Actualizaré el estado del proyecto' },
  'chat.needHelp': { en: 'Need any help with this?', es: '¿Necesitas ayuda con esto?' },
  'chat.letMeLook': { en: 'Let me look into this', es: 'Déjame revisar esto' },
  'chat.shareMoreDetails': { en: 'Can you share more details?', es: '¿Puedes compartir más detalles?' },
  'chat.goodMorningTeam': { en: 'Good morning team!', es: '¡Buenos días equipo!' },
  'chat.haveGreatEvening': { en: 'Have a great evening!', es: '¡Que tengas una buena noche!' },
  'chat.nextMilestone': { en: "What's our next milestone?", es: '¿Cuál es nuestro siguiente hito?' },
  'chat.anyBlockers': { en: 'Any blockers I should know about?', es: '¿Hay algún impedimento que deba saber?' },
  
  // Request Forms
  'requests.missingInfo': { en: 'Missing Information', es: 'Información Incompleta' },
  'requests.fillAllFields': { en: 'Please fill in all required fields', es: 'Por favor completa todos los campos requeridos' },
  'requests.submitted': { en: 'Request Submitted', es: 'Solicitud Enviada' },
  'requests.submitError': { en: 'Failed to submit request. Please try again.', es: 'Error al enviar solicitud. Por favor intenta de nuevo.' },
  'requests.submitting': { en: 'Submitting...', es: 'Enviando...' },
  'requests.sendForApproval': { en: 'Send for approval', es: 'Enviar para aprobación' },
  'requests.notes': { en: 'Notes', es: 'Notas' },
  'requests.additionalInfo': { en: 'Additional information...', es: 'Información adicional...' },
  
  // Shift Request
  'requests.addShift': { en: 'Add shift request', es: 'Agregar solicitud de turno' },
  'requests.job': { en: 'Job', es: 'Trabajo' },
  'requests.selectJob': { en: 'Select or enter job name', es: 'Selecciona o ingresa nombre del trabajo' },
  'requests.startDate': { en: 'Start Date', es: 'Fecha de Inicio' },
  'requests.endDate': { en: 'End Date', es: 'Fecha de Fin' },
  'requests.startTime': { en: 'Start Time', es: 'Hora de Inicio' },
  'requests.endTime': { en: 'End Time', es: 'Hora de Fin' },
  'requests.totalHours': { en: 'Total Hours', es: 'Horas Totales' },
  'requests.hours': { en: 'hours', es: 'horas' },
  'requests.includeMileage': { en: 'Include mileage', es: 'Incluir kilometraje' },
  'requests.shiftSubmitted': { en: 'Your shift request has been sent for approval', es: 'Tu solicitud de turno ha sido enviada para aprobación' },
  
  // Break Request
  'requests.addBreak': { en: 'Add break request', es: 'Agregar solicitud de descanso' },
  'requests.breakType': { en: 'Break Type', es: 'Tipo de Descanso' },
  'requests.selectBreakType': { en: 'Select break type', es: 'Selecciona tipo de descanso' },
  'requests.lunchBreak': { en: 'Lunch Break', es: 'Descanso de Almuerzo' },
  'requests.coffeeBreak': { en: 'Coffee Break', es: 'Descanso para Café' },
  'requests.personalBreak': { en: 'Personal Break', es: 'Descanso Personal' },
  'requests.medicalBreak': { en: 'Medical Break', es: 'Descanso Médico' },
  'requests.other': { en: 'Other', es: 'Otro' },
  'requests.duration': { en: 'Duration', es: 'Duración' },
  'requests.invalidTimeRange': { en: 'Invalid Time Range', es: 'Rango de Tiempo Inválido' },
  'requests.endAfterStart': { en: 'End time must be after start time', es: 'La hora de fin debe ser después de la hora de inicio' },
  'requests.breakSubmitted': { en: 'Your break request has been sent for approval', es: 'Tu solicitud de descanso ha sido enviada para aprobación' },
  
  // Time Off Request
  'requests.addTimeOff': { en: 'Add time off request', es: 'Agregar solicitud de tiempo libre' },
  'requests.type': { en: 'Type', es: 'Tipo' },
  'requests.selectPolicy': { en: 'Select policy', es: 'Seleccionar política' },
  'requests.vacation': { en: 'Vacation', es: 'Vacaciones' },
  'requests.sickLeave': { en: 'Sick Leave', es: 'Permiso por Enfermedad' },
  'requests.personalDay': { en: 'Personal Day', es: 'Día Personal' },
  'requests.familyLeave': { en: 'Family Leave', es: 'Permiso Familiar' },
  'requests.medicalLeave': { en: 'Medical Leave', es: 'Permiso Médico' },
  'requests.bereavement': { en: 'Bereavement', es: 'Duelo' },
  'requests.allDay': { en: 'All day', es: 'Todo el día' },
  'requests.totalTime': { en: 'Total Time', es: 'Tiempo Total' },
  'requests.day': { en: 'day', es: 'día' },
  'requests.days': { en: 'days', es: 'días' },
  'requests.hour': { en: 'hour', es: 'hora' },
  'requests.explanation': { en: 'Explanation', es: 'Explicación' },
  'requests.explanationPlaceholder': { en: 'Please provide a reason for your time off request...', es: 'Por favor proporciona una razón para tu solicitud de tiempo libre...' },
  'requests.missingTimeInfo': { en: 'Missing Time Information', es: 'Falta Información de Tiempo' },
  'requests.specifyTimes': { en: "Please specify start and end times or toggle 'All day'", es: "Por favor especifica las horas de inicio y fin o activa 'Todo el día'" },
  'requests.timeOffSubmitted': { en: 'Your time off request has been sent for approval', es: 'Tu solicitud de tiempo libre ha sido enviada para aprobación' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en');

  // Load language preference from localStorage and database
  useEffect(() => {
    const loadLanguage = async () => {
      // First check localStorage for immediate display
      const savedLanguage = localStorage.getItem('app_language') as Language | null;
      if (savedLanguage) {
        setLanguageState(savedLanguage);
      }

      // Then sync with database if user is logged in
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user?.id) {
          const { data: teamMember } = await supabase
            .from('team_directory')
            .select('language')
            .eq('user_id', user.id)
            .single();

          if (teamMember?.language) {
            setLanguageState(teamMember.language as Language);
            localStorage.setItem('app_language', teamMember.language);
          }
        }
      } catch (error) {
        console.error('Error loading language preference:', error);
      }
    };

    loadLanguage();
  }, []);

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app_language', lang);

    // Save to database if user is logged in
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user?.id) {
        const { error } = await supabase
          .from('team_directory')
          .update({ language: lang })
          .eq('user_id', user.id);
        
        if (error) {
          console.error('Error updating language in database:', error);
          throw error;
        }
        
        console.log('✅ Language preference saved to database:', lang);
      }
    } catch (error) {
      console.error('❌ Failed to save language preference to database:', error);
    }
  };

  const t = (key: string): string => {
    const translation = translations[key];
    if (!translation) {
      console.warn(`Translation missing for key: ${key}`);
      return key;
    }
    return translation[language] || translation.en || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
