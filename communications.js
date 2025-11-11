/**
 * CondoconnectAI - Sistema de Comunicaciones Integradas
 * WhatsApp Business, SMS, Email Marketing y Notificaciones Push
 */

class CommunicationsSystem {
    constructor() {
        this.api = window.CondoconnectAPI;
        this.utils = window.CondoconnectUtils;
        this.forms = window.CondoconnectForms;
        this.notifications = window.CondoconnectNotifications;
        
        // Configuración de canales
        this.channels = {
            whatsapp: { enabled: true, provider: 'WhatsApp Business API' },
            sms: { enabled: true, provider: 'Twilio' },
            email: { enabled: true, provider: 'SendGrid' },
            push: { enabled: true, provider: 'Firebase' }
        };
        
        // Templates de mensajes
        this.messageTemplates = new Map();
        this.campaigns = new Map();
        
        this.init();
    }

    init() {
        this.setupMessageTemplates();
        this.setupCampaignEngine();
        
        console.log('📱 Sistema de comunicaciones CondoconnectAI cargado');
    }

    /**
     * CENTRO DE COMUNICACIONES
     */
    createCommunicationsCenter() {
        return `
            <div class="space-y-8">
                <!-- Panel de Control -->
                <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div class="glass-effect rounded-xl p-6">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-blue-300 text-sm font-medium">Mensajes Enviados</p>
                                <p class="text-3xl font-bold text-white">2,847</p>
                            </div>
                            <div class="w-12 h-12 bg-green-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                                <i class="fas fa-paper-plane text-green-400 text-xl"></i>
                            </div>
                        </div>
                        <div class="mt-2 text-xs text-gray-400">
                            Este mes
                        </div>
                    </div>

                    <div class="glass-effect rounded-xl p-6">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-blue-300 text-sm font-medium">Tasa de Apertura</p>
                                <p class="text-3xl font-bold text-white">87.3%</p>
                            </div>
                            <div class="w-12 h-12 bg-blue-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                                <i class="fas fa-envelope-open text-blue-400 text-xl"></i>
                            </div>
                        </div>
                        <div class="mt-2 text-xs text-gray-400">
                            Promedio emails
                        </div>
                    </div>

                    <div class="glass-effect rounded-xl p-6">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-blue-300 text-sm font-medium">WhatsApp</p>
                                <p class="text-3xl font-bold text-white">94.8%</p>
                            </div>
                            <div class="w-12 h-12 bg-green-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                                <i class="fab fa-whatsapp text-green-400 text-xl"></i>
                            </div>
                        </div>
                        <div class="mt-2 text-xs text-gray-400">
                            Tasa de entrega
                        </div>
                    </div>

                    <div class="glass-effect rounded-xl p-6">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-blue-300 text-sm font-medium">Campañas Activas</p>
                                <p class="text-3xl font-bold text-white">5</p>
                            </div>
                            <div class="w-12 h-12 bg-purple-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                                <i class="fas fa-bullhorn text-purple-400 text-xl"></i>
                            </div>
                        </div>
                        <div class="mt-2 text-xs text-gray-400">
                            En ejecución
                        </div>
                    </div>
                </div>

                <!-- Acciones Rápidas -->
                <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div class="glass-effect rounded-xl p-6">
                        <h3 class="text-lg font-bold text-white mb-4">
                            <i class="fas fa-bolt mr-2 text-blue-400"></i>Acciones Rápidas
                        </h3>
                        <div class="space-y-3">
                            <button onclick="CommunicationsSystem.sendQuickMessage()" class="w-full bg-green-600 hover:bg-green-700 text-white p-3 rounded-lg transition-all duration-300">
                                <i class="fab fa-whatsapp text-xl mb-2"></i>
                                <p class="text-sm font-medium">Mensaje WhatsApp</p>
                            </button>
                            <button onclick="CommunicationsSystem.sendBulkSMS()" class="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg transition-all duration-300">
                                <i class="fas fa-sms text-xl mb-2"></i>
                                <p class="text-sm font-medium">SMS Masivo</p>
                            </button>
                            <button onclick="CommunicationsSystem.createEmailCampaign()" class="w-full bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-lg transition-all duration-300">
                                <i class="fas fa-envelope text-xl mb-2"></i>
                                <p class="text-sm font-medium">Campaña Email</p>
                            </button>
                            <button onclick="CommunicationsSystem.sendPushNotification()" class="w-full bg-orange-600 hover:bg-orange-700 text-white p-3 rounded-lg transition-all duration-300">
                                <i class="fas fa-bell text-xl mb-2"></i>
                                <p class="text-sm font-medium">Notificación Push</p>
                            </button>
                        </div>
                    </div>

                    <!-- Mensajes Recientes -->
                    <div class="lg:col-span-2 glass-effect rounded-xl overflow-hidden">
                        <div class="p-6 border-b border-blue-500 border-opacity-30">
                            <h3 class="text-lg font-bold text-white">Mensajes Recientes</h3>
                        </div>
                        <div class="p-6">
                            <div class="space-y-4" id="recent-messages">
                                ${this.renderRecentMessages()}
                            </div>
                        </div>
                    </div>

                    <!-- Templates -->
                    <div class="glass-effect rounded-xl overflow-hidden">
                        <div class="p-6 border-b border-blue-500 border-opacity-30">
                            <h3 class="text-lg font-bold text-white">Templates</h3>
                        </div>
                        <div class="p-6">
                            <div class="space-y-3">
                                ${this.renderTemplatesList()}
                            </div>
                            <button onclick="CommunicationsSystem.createTemplate()" class="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-sm">
                                <i class="fas fa-plus mr-2"></i>Nuevo Template
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Campañas Activas -->
                <div class="glass-effect rounded-xl overflow-hidden">
                    <div class="p-6 border-b border-blue-500 border-opacity-30">
                        <div class="flex justify-between items-center">
                            <h3 class="text-lg font-bold text-white">Campañas Activas</h3>
                            <button onclick="CommunicationsSystem.createCampaign()" class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg">
                                <i class="fas fa-plus mr-2"></i>Nueva Campaña
                            </button>
                        </div>
                    </div>
                    <div class="p-6">
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            ${this.renderActiveCampaigns()}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * WHATSAPP BUSINESS
     */
    sendQuickMessage() {
        const whatsappForm = this.forms.createForm({
            title: '💬 Enviar Mensaje WhatsApp',
            fields: [
                { name: 'recipient_type', type: 'select', label: 'Destinatarios', required: true, options: [
                    { value: 'individual', label: '👤 Individual' },
                    { value: 'group', label: '👥 Grupo' },
                    { value: 'all_residents', label: '🏠 Todos los Residentes' },
                    { value: 'by_building', label: '🏢 Por Edificio' },
                    { value: 'custom_list', label: '📋 Lista Personalizada' }
                ]},
                { name: 'phone_number', type: 'tel', label: 'Número de Teléfono', placeholder: '+52 55 1234 5678' },
                { name: 'template', type: 'select', label: 'Template (Opcional)', options: [
                    { value: '', label: 'Sin template' },
                    { value: 'maintenance_notice', label: '🔧 Aviso de Mantenimiento' },
                    { value: 'payment_reminder', label: '💰 Recordatorio de Pago' },
                    { value: 'emergency_alert', label: '🚨 Alerta de Emergencia' },
                    { value: 'general_notice', label: '📢 Aviso General' }
                ]},
                { name: 'message', type: 'textarea', label: 'Mensaje', required: true, rows: 4, placeholder: 'Escribe tu mensaje aquí...' },
                { name: 'include_media', type: 'checkbox', label: 'Incluir multimedia', checkboxLabel: 'Adjuntar imagen o documento' },
                { name: 'media_file', type: 'file', label: 'Archivo', accept: 'image/*,application/pdf' },
                { name: 'schedule_send', type: 'checkbox', label: 'Programar envío', checkboxLabel: 'Enviar en fecha específica' },
                { name: 'send_date', type: 'date', label: 'Fecha de Envío' },
                { name: 'send_time', type: 'time', label: 'Hora de Envío' }
            ],
            onSubmit: async (data) => {
                await this.processWhatsAppMessage(data);
            }
        });
        
        whatsappForm.show();
    }

    /**
     * Procesar mensaje de WhatsApp
     */
    async processWhatsAppMessage(data) {
        this.notifications.show('📱 Enviando mensaje por WhatsApp...', 'info');
        
        // Simular envío
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const result = await this.api.post('/communications/whatsapp/send', data);
        
        if (result.success) {
            this.notifications.show('✅ Mensaje enviado exitosamente', 'success');
            this.logMessage('whatsapp', data);
        } else {
            this.notifications.show('❌ Error enviando mensaje', 'error');
        }
    }

    /**
     * SMS MASIVO
     */
    sendBulkSMS() {
        const smsForm = this.forms.createForm({
            title: '📱 Envío Masivo de SMS',
            fields: [
                { name: 'recipient_list', type: 'select', label: 'Lista de Destinatarios', required: true, options: [
                    { value: 'all_residents', label: '🏠 Todos los Residentes' },
                    { value: 'owners_only', label: '👑 Solo Propietarios' },
                    { value: 'tenants_only', label: '🏠 Solo Inquilinos' },
                    { value: 'delinquent_accounts', label: '⚠️ Cuentas Morosas' },
                    { value: 'custom_list', label: '📋 Lista Personalizada' }
                ]},
                { name: 'message_type', type: 'select', label: 'Tipo de Mensaje', required: true, options: [
                    { value: 'informational', label: '📢 Informativo' },
                    { value: 'payment_reminder', label: '💰 Recordatorio de Pago' },
                    { value: 'emergency', label: '🚨 Emergencia' },
                    { value: 'maintenance', label: '🔧 Mantenimiento' },
                    { value: 'promotional', label: '🎯 Promocional' }
                ]},
                { name: 'message', type: 'textarea', label: 'Mensaje', required: true, rows: 4, 
                  placeholder: 'Máximo 160 caracteres para SMS estándar...',
                  validation: { maxLength: 160 }
                },
                { name: 'sender_name', type: 'text', label: 'Nombre del Remitente', placeholder: 'CONDOMINIO' },
                { name: 'schedule_send', type: 'checkbox', label: 'Programar envío', checkboxLabel: 'Enviar en fecha específica' },
                { name: 'send_date', type: 'date', label: 'Fecha de Envío' },
                { name: 'send_time', type: 'time', label: 'Hora de Envío' },
                { name: 'track_responses', type: 'checkbox', label: 'Rastrear respuestas', checkboxLabel: 'Habilitar respuestas automáticas' }
            ],
            onSubmit: async (data) => {
                await this.processBulkSMS(data);
            }
        });
        
        smsForm.show();
    }

    /**
     * CAMPAÑA DE EMAIL
     */
    createEmailCampaign() {
        const emailForm = this.forms.createForm({
            title: '📧 Nueva Campaña de Email',
            size: 'lg',
            fields: [
                { name: 'campaign_name', type: 'text', label: 'Nombre de la Campaña', required: true },
                { name: 'subject', type: 'text', label: 'Asunto', required: true },
                { name: 'sender_name', type: 'text', label: 'Nombre del Remitente', placeholder: 'Administración Condominio' },
                { name: 'sender_email', type: 'email', label: 'Email del Remitente', placeholder: 'admin@condominio.com' },
                { name: 'recipient_list', type: 'select', label: 'Lista de Destinatarios', required: true, options: [
                    { value: 'all_residents', label: '🏠 Todos los Residentes' },
                    { value: 'owners_only', label: '👑 Solo Propietarios' },
                    { value: 'newsletter_subscribers', label: '📰 Suscriptores Newsletter' },
                    { value: 'custom_segment', label: '🎯 Segmento Personalizado' }
                ]},
                { name: 'template_type', type: 'select', label: 'Tipo de Template', options: [
                    { value: 'newsletter', label: '📰 Newsletter' },
                    { value: 'announcement', label: '📢 Anuncio' },
                    { value: 'invoice', label: '🧾 Factura' },
                    { value: 'welcome', label: '👋 Bienvenida' },
                    { value: 'custom', label: '🎨 Personalizado' }
                ]},
                { name: 'content', type: 'textarea', label: 'Contenido del Email', required: true, rows: 8,
                  placeholder: 'Contenido HTML o texto plano...' },
                { name: 'include_attachments', type: 'checkbox', label: 'Incluir adjuntos', checkboxLabel: 'Adjuntar archivos' },
                { name: 'attachment', type: 'file', label: 'Archivo Adjunto', accept: '.pdf,.doc,.docx,.jpg,.png' },
                { name: 'track_opens', type: 'checkbox', label: 'Rastrear aperturas', checkboxLabel: 'Habilitar seguimiento' },
                { name: 'track_clicks', type: 'checkbox', label: 'Rastrear clics', checkboxLabel: 'Rastrear enlaces' },
                { name: 'schedule_send', type: 'checkbox', label: 'Programar envío', checkboxLabel: 'Enviar en fecha específica' },
                { name: 'send_date', type: 'date', label: 'Fecha de Envío' },
                { name: 'send_time', type: 'time', label: 'Hora de Envío' }
            ],
            onSubmit: async (data) => {
                await this.processEmailCampaign(data);
            }
        });
        
        emailForm.show();
    }

    /**
     * NOTIFICACIONES PUSH
     */
    sendPushNotification() {
        const pushForm = this.forms.createForm({
            title: '🔔 Enviar Notificación Push',
            fields: [
                { name: 'title', type: 'text', label: 'Título', required: true, placeholder: 'Título de la notificación' },
                { name: 'message', type: 'textarea', label: 'Mensaje', required: true, rows: 3,
                  placeholder: 'Contenido de la notificación...' },
                { name: 'target_audience', type: 'select', label: 'Audiencia', required: true, options: [
                    { value: 'all_users', label: '👥 Todos los Usuarios' },
                    { value: 'residents_only', label: '🏠 Solo Residentes' },
                    { value: 'staff_only', label: '👷 Solo Personal' },
                    { value: 'security_team', label: '🛡️ Equipo de Seguridad' },
                    { value: 'custom_segment', label: '🎯 Segmento Personalizado' }
                ]},
                { name: 'priority', type: 'select', label: 'Prioridad', options: [
                    { value: 'low', label: '🔵 Baja' },
                    { value: 'normal', label: '🟡 Normal' },
                    { value: 'high', label: '🟠 Alta' },
                    { value: 'urgent', label: '🔴 Urgente' }
                ]},
                { name: 'action_url', type: 'text', label: 'URL de Acción (Opcional)', placeholder: 'https://...' },
                { name: 'icon', type: 'select', label: 'Icono', options: [
                    { value: 'info', label: 'ℹ️ Información' },
                    { value: 'warning', label: '⚠️ Advertencia' },
                    { value: 'success', label: '✅ Éxito' },
                    { value: 'error', label: '❌ Error' },
                    { value: 'maintenance', label: '🔧 Mantenimiento' },
                    { value: 'security', label: '🛡️ Seguridad' }
                ]},
                { name: 'schedule_send', type: 'checkbox', label: 'Programar envío', checkboxLabel: 'Enviar en fecha específica' },
                { name: 'send_date', type: 'date', label: 'Fecha de Envío' },
                { name: 'send_time', type: 'time', label: 'Hora de Envío' }
            ],
            onSubmit: async (data) => {
                await this.processPushNotification(data);
            }
        });
        
        pushForm.show();
    }

    /**
     * CREAR TEMPLATE
     */
    createTemplate() {
        const templateForm = this.forms.createForm({
            title: '📝 Crear Template de Mensaje',
            fields: [
                { name: 'template_name', type: 'text', label: 'Nombre del Template', required: true },
                { name: 'template_type', type: 'select', label: 'Tipo', required: true, options: [
                    { value: 'whatsapp', label: '💬 WhatsApp' },
                    { value: 'sms', label: '📱 SMS' },
                    { value: 'email', label: '📧 Email' },
                    { value: 'push', label: '🔔 Push' }
                ]},
                { name: 'category', type: 'select', label: 'Categoría', options: [
                    { value: 'maintenance', label: '🔧 Mantenimiento' },
                    { value: 'payment', label: '💰 Pagos' },
                    { value: 'emergency', label: '🚨 Emergencia' },
                    { value: 'general', label: '📢 General' },
                    { value: 'welcome', label: '👋 Bienvenida' }
                ]},
                { name: 'subject', type: 'text', label: 'Asunto (Email)', placeholder: 'Solo para templates de email' },
                { name: 'content', type: 'textarea', label: 'Contenido', required: true, rows: 6,
                  placeholder: 'Usa {{nombre}}, {{unidad}}, {{fecha}} para personalización...' },
                { name: 'variables', type: 'textarea', label: 'Variables Disponibles', rows: 3,
                  placeholder: 'Lista las variables que se pueden usar: nombre, unidad, fecha, monto...' },
                { name: 'is_active', type: 'checkbox', label: 'Activo', checkboxLabel: 'Template disponible para uso' }
            ],
            onSubmit: async (data) => {
                await this.saveTemplate(data);
            }
        });
        
        templateForm.show();
    }

    /**
     * Configurar templates de mensajes
     */
    setupMessageTemplates() {
        const defaultTemplates = [
            {
                id: 'maintenance_notice',
                name: 'Aviso de Mantenimiento',
                type: 'whatsapp',
                category: 'maintenance',
                content: '🔧 *Aviso de Mantenimiento*\n\nEstimado {{nombre}},\n\nLe informamos que el {{fecha}} se realizará mantenimiento en {{area}}.\n\nHorario: {{horario}}\n\nGracias por su comprensión.',
                variables: ['nombre', 'fecha', 'area', 'horario']
            },
            {
                id: 'payment_reminder',
                name: 'Recordatorio de Pago',
                type: 'sms',
                category: 'payment',
                content: 'Recordatorio: Su cuota de mantenimiento de ${{monto}} vence el {{fecha}}. Evite recargos pagando a tiempo.',
                variables: ['monto', 'fecha']
            },
            {
                id: 'emergency_alert',
                name: 'Alerta de Emergencia',
                type: 'push',
                category: 'emergency',
                content: '🚨 ALERTA: {{tipo_emergencia}} en {{ubicacion}}. Siga las instrucciones del personal de seguridad.',
                variables: ['tipo_emergencia', 'ubicacion']
            }
        ];

        defaultTemplates.forEach(template => {
            this.messageTemplates.set(template.id, template);
        });
    }

    /**
     * Configurar motor de campañas
     */
    setupCampaignEngine() {
        this.campaignEngine = {
            // Crear campaña
            createCampaign: (config) => {
                const campaign = {
                    id: 'camp_' + Date.now(),
                    name: config.name,
                    type: config.type,
                    status: 'draft',
                    created_at: new Date().toISOString(),
                    scheduled_at: config.scheduled_at,
                    target_audience: config.target_audience,
                    content: config.content,
                    metrics: {
                        sent: 0,
                        delivered: 0,
                        opened: 0,
                        clicked: 0,
                        bounced: 0
                    }
                };
                
                this.campaigns.set(campaign.id, campaign);
                return campaign;
            },

            // Ejecutar campaña
            executeCampaign: async (campaignId) => {
                const campaign = this.campaigns.get(campaignId);
                if (!campaign) return false;
                
                campaign.status = 'sending';
                
                // Simular envío
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                campaign.status = 'completed';
                campaign.metrics.sent = 156;
                campaign.metrics.delivered = 152;
                campaign.metrics.opened = 89;
                campaign.metrics.clicked = 23;
                
                return true;
            }
        };
    }

    /**
     * Renderizar mensajes recientes
     */
    renderRecentMessages() {
        const recentMessages = [
            {
                type: 'whatsapp',
                recipient: 'Juan Pérez',
                content: 'Aviso de mantenimiento programado',
                status: 'delivered',
                time: '10:30 AM'
            },
            {
                type: 'email',
                recipient: 'Todos los residentes',
                content: 'Newsletter mensual',
                status: 'sent',
                time: '09:15 AM'
            },
            {
                type: 'sms',
                recipient: 'María González',
                content: 'Recordatorio de pago',
                status: 'delivered',
                time: '08:45 AM'
            }
        ];

        return recentMessages.map(msg => {
            const typeIcons = {
                whatsapp: 'fab fa-whatsapp text-green-400',
                email: 'fas fa-envelope text-blue-400',
                sms: 'fas fa-sms text-purple-400',
                push: 'fas fa-bell text-orange-400'
            };

            const statusColors = {
                sent: 'text-yellow-400',
                delivered: 'text-green-400',
                failed: 'text-red-400'
            };

            return `
                <div class="flex items-center space-x-3 p-3 bg-gray-800 bg-opacity-50 rounded-lg">
                    <i class="${typeIcons[msg.type]} text-xl"></i>
                    <div class="flex-1">
                        <p class="text-white text-sm font-medium">${msg.content}</p>
                        <p class="text-gray-400 text-xs">Para: ${msg.recipient}</p>
                    </div>
                    <div class="text-right">
                        <p class="${statusColors[msg.status]} text-xs font-medium">${msg.status}</p>
                        <p class="text-gray-400 text-xs">${msg.time}</p>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Renderizar lista de templates
     */
    renderTemplatesList() {
        const templates = Array.from(this.messageTemplates.values()).slice(0, 4);
        
        return templates.map(template => `
            <div class="p-3 bg-gray-800 bg-opacity-50 rounded-lg cursor-pointer hover:bg-opacity-70"
                 onclick="CommunicationsSystem.useTemplate('${template.id}')">
                <p class="text-white text-sm font-medium">${template.name}</p>
                <p class="text-gray-400 text-xs">${template.type} • ${template.category}</p>
            </div>
        `).join('');
    }

    /**
     * Renderizar campañas activas
     */
    renderActiveCampaigns() {
        const mockCampaigns = [
            {
                name: 'Newsletter Noviembre',
                type: 'email',
                status: 'active',
                sent: 156,
                opened: 89,
                clicked: 23
            },
            {
                name: 'Recordatorio Pagos',
                type: 'sms',
                status: 'scheduled',
                scheduled: '2024-11-05'
            },
            {
                name: 'Bienvenida Nuevos Residentes',
                type: 'whatsapp',
                status: 'draft',
                recipients: 3
            }
        ];

        return mockCampaigns.map(campaign => {
            const statusColors = {
                active: 'bg-green-900 border-green-500 text-green-300',
                scheduled: 'bg-yellow-900 border-yellow-500 text-yellow-300',
                draft: 'bg-gray-900 border-gray-500 text-gray-300'
            };

            return `
                <div class="bg-gray-800 bg-opacity-50 rounded-lg p-6">
                    <div class="flex justify-between items-start mb-4">
                        <h4 class="text-white font-bold">${campaign.name}</h4>
                        <span class="px-2 py-1 rounded text-xs ${statusColors[campaign.status]} border">
                            ${campaign.status}
                        </span>
                    </div>
                    <p class="text-gray-400 text-sm mb-4">Tipo: ${campaign.type}</p>
                    
                    ${campaign.status === 'active' ? `
                        <div class="space-y-2">
                            <div class="flex justify-between text-sm">
                                <span class="text-gray-400">Enviados:</span>
                                <span class="text-white">${campaign.sent}</span>
                            </div>
                            <div class="flex justify-between text-sm">
                                <span class="text-gray-400">Abiertos:</span>
                                <span class="text-green-400">${campaign.opened}</span>
                            </div>
                            <div class="flex justify-between text-sm">
                                <span class="text-gray-400">Clics:</span>
                                <span class="text-blue-400">${campaign.clicked}</span>
                            </div>
                        </div>
                    ` : campaign.status === 'scheduled' ? `
                        <p class="text-yellow-400 text-sm">Programado para: ${campaign.scheduled}</p>
                    ` : `
                        <p class="text-gray-400 text-sm">Destinatarios: ${campaign.recipients}</p>
                    `}
                    
                    <div class="flex space-x-2 mt-4">
                        <button onclick="CommunicationsSystem.editCampaign('${campaign.name}')" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded text-sm">
                            Editar
                        </button>
                        <button onclick="CommunicationsSystem.viewCampaignStats('${campaign.name}')" class="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-3 rounded text-sm">
                            Ver Stats
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Procesar envíos
     */
    async processBulkSMS(data) {
        this.notifications.show('📱 Enviando SMS masivo...', 'info');
        await new Promise(resolve => setTimeout(resolve, 2000));
        this.notifications.show('✅ SMS enviado a todos los destinatarios', 'success');
    }

    async processEmailCampaign(data) {
        this.notifications.show('📧 Creando campaña de email...', 'info');
        await new Promise(resolve => setTimeout(resolve, 2000));
        this.notifications.show('✅ Campaña de email creada y programada', 'success');
    }

    async processPushNotification(data) {
        this.notifications.show('🔔 Enviando notificación push...', 'info');
        await new Promise(resolve => setTimeout(resolve, 1500));
        this.notifications.show('✅ Notificación push enviada', 'success');
    }

    async saveTemplate(data) {
        this.notifications.show('📝 Guardando template...', 'info');
        await new Promise(resolve => setTimeout(resolve, 1000));
        this.notifications.show('✅ Template guardado exitosamente', 'success');
    }

    logMessage(type, data) {
        // Registrar mensaje en el log
        console.log(`Mensaje ${type} enviado:`, data);
    }

    // Métodos estáticos para uso global
    static sendQuickMessage() {
        if (window.CommunicationsSystem) {
            window.CommunicationsSystem.sendQuickMessage();
        }
    }

    static sendBulkSMS() {
        if (window.CommunicationsSystem) {
            window.CommunicationsSystem.sendBulkSMS();
        }
    }

    static createEmailCampaign() {
        if (window.CommunicationsSystem) {
            window.CommunicationsSystem.createEmailCampaign();
        }
    }

    static sendPushNotification() {
        if (window.CommunicationsSystem) {
            window.CommunicationsSystem.sendPushNotification();
        }
    }

    static createTemplate() {
        if (window.CommunicationsSystem) {
            window.CommunicationsSystem.createTemplate();
        }
    }

    static createCampaign() {
        if (window.CommunicationsSystem) {
            window.CommunicationsSystem.createEmailCampaign();
        }
    }

    static useTemplate(templateId) {
        console.log('Usando template:', templateId);
    }

    static editCampaign(campaignName) {
        console.log('Editando campaña:', campaignName);
    }

    static viewCampaignStats(campaignName) {
        console.log('Viendo estadísticas de:', campaignName);
    }
}

// Inicializar sistema de comunicaciones
const communicationsSystem = new CommunicationsSystem();
window.CommunicationsSystem = communicationsSystem;

console.log('📱 Sistema de comunicaciones CondoconnectAI cargado');
