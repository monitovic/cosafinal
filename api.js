/**
 * CondoconnectAI - Cliente API
 * Manejo de todas las comunicaciones con AWS y servicios externos
 */

class CondoconnectAPI {
    constructor() {
        this.config = window.CondoconnectConfig;
        this.auth = window.CondoconnectAuth;
        this.baseURL = this.config.getConfig('aws.apiGatewayUrl');
        this.mockMode = this.config.getConfig('env.mockData');
        
        // Cache para optimizar requests
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutos
        
        this.init();
    }

    /**
     * Inicializar cliente API
     */
    init() {
        // Configurar interceptores
        this.setupInterceptors();
        
        console.log('🌐 Cliente API CondoconnectAI inicializado');
    }

    /**
     * Configurar interceptores de request/response
     */
    setupInterceptors() {
        // Interceptor para agregar headers de autenticación
        this.requestInterceptor = async (config) => {
            if (this.auth.isAuthenticated()) {
                const token = await this.auth.getSessionToken();
                if (token) {
                    config.headers = {
                        ...config.headers,
                        'Authorization': `Bearer ${token}`
                    };
                }
            }
            
            // Headers de seguridad
            config.headers = {
                ...config.headers,
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            };
            
            return config;
        };
    }

    /**
     * Realizar request HTTP
     */
    async request(method, endpoint, data = null, options = {}) {
        try {
            // Verificar cache para GET requests
            if (method === 'GET' && !options.skipCache) {
                const cached = this.getFromCache(endpoint);
                if (cached) {
                    return cached;
                }
            }

            // Configurar request
            const config = {
                method: method.toUpperCase(),
                headers: {},
                ...options
            };

            // Aplicar interceptor
            await this.requestInterceptor(config);

            // Agregar body para POST/PUT/PATCH
            if (data && ['POST', 'PUT', 'PATCH'].includes(config.method)) {
                config.body = JSON.stringify(data);
            }

            // Realizar request
            const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;
            
            let response;
            if (this.mockMode) {
                response = await this.mockRequest(method, endpoint, data);
            } else {
                response = await fetch(url, config);
            }

            // Procesar respuesta
            const result = await this.processResponse(response, endpoint, method);
            
            // Guardar en cache para GET requests exitosos
            if (method === 'GET' && result.success) {
                this.setCache(endpoint, result);
            }

            return result;
        } catch (error) {
            console.error(`❌ Error en ${method} ${endpoint}:`, error);
            return {
                success: false,
                error: error.message || 'Error de conexión'
            };
        }
    }

    /**
     * Procesar respuesta HTTP
     */
    async processResponse(response, endpoint, method) {
        if (this.mockMode) {
            return response; // Ya procesada en mockRequest
        }

        try {
            const data = await response.json();
            
            if (response.ok) {
                return {
                    success: true,
                    data: data,
                    status: response.status
                };
            } else {
                return {
                    success: false,
                    error: data.message || `Error ${response.status}`,
                    status: response.status
                };
            }
        } catch (error) {
            return {
                success: false,
                error: 'Error procesando respuesta',
                status: response.status
            };
        }
    }

    /**
     * Métodos HTTP convenientes
     */
    async get(endpoint, options = {}) {
        return this.request('GET', endpoint, null, options);
    }

    async post(endpoint, data, options = {}) {
        return this.request('POST', endpoint, data, options);
    }

    async put(endpoint, data, options = {}) {
        return this.request('PUT', endpoint, data, options);
    }

    async patch(endpoint, data, options = {}) {
        return this.request('PATCH', endpoint, data, options);
    }

    async delete(endpoint, options = {}) {
        return this.request('DELETE', endpoint, null, options);
    }

    /**
     * APIs específicas del dominio
     */

    // === GESTIÓN DE USUARIOS ===
    async getUsers(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        return this.get(`/users${params ? '?' + params : ''}`);
    }

    async getUser(userId) {
        return this.get(`/users/${userId}`);
    }

    async createUser(userData) {
        return this.post('/users', userData);
    }

    async updateUser(userId, userData) {
        return this.put(`/users/${userId}`, userData);
    }

    async deleteUser(userId) {
        return this.delete(`/users/${userId}`);
    }

    // === GESTIÓN DE RESIDENTES ===
    async getResidents(tenantId, filters = {}) {
        const params = new URLSearchParams({ tenantId, ...filters }).toString();
        return this.get(`/residents?${params}`);
    }

    async getResident(residentId) {
        return this.get(`/residents/${residentId}`);
    }

    async createResident(residentData) {
        return this.post('/residents', residentData);
    }

    async updateResident(residentId, residentData) {
        return this.put(`/residents/${residentId}`, residentData);
    }

    async deleteResident(residentId) {
        return this.delete(`/residents/${residentId}`);
    }

    // === GESTIÓN DE PAGOS ===
    async getPayments(tenantId, filters = {}) {
        const params = new URLSearchParams({ tenantId, ...filters }).toString();
        return this.get(`/payments?${params}`);
    }

    async getPayment(paymentId) {
        return this.get(`/payments/${paymentId}`);
    }

    async createPayment(paymentData) {
        return this.post('/payments', paymentData);
    }

    async updatePayment(paymentId, paymentData) {
        return this.put(`/payments/${paymentId}`, paymentData);
    }

    async processPayment(paymentId, paymentMethod) {
        return this.post(`/payments/${paymentId}/process`, { paymentMethod });
    }

    // === GESTIÓN DE MANTENIMIENTO ===
    async getMaintenanceOrders(tenantId, filters = {}) {
        const params = new URLSearchParams({ tenantId, ...filters }).toString();
        return this.get(`/maintenance?${params}`);
    }

    async getMaintenanceOrder(orderId) {
        return this.get(`/maintenance/${orderId}`);
    }

    async createMaintenanceOrder(orderData) {
        return this.post('/maintenance', orderData);
    }

    async updateMaintenanceOrder(orderId, orderData) {
        return this.put(`/maintenance/${orderId}`, orderData);
    }

    async completeMaintenanceOrder(orderId, completionData) {
        return this.post(`/maintenance/${orderId}/complete`, completionData);
    }

    // === GESTIÓN DE PROPIEDADES ===
    async getProperties(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        return this.get(`/properties${params ? '?' + params : ''}`);
    }

    async getProperty(propertyId) {
        return this.get(`/properties/${propertyId}`);
    }

    async createProperty(propertyData) {
        return this.post('/properties', propertyData);
    }

    async updateProperty(propertyId, propertyData) {
        return this.put(`/properties/${propertyId}`, propertyData);
    }

    async deleteProperty(propertyId) {
        return this.delete(`/properties/${propertyId}`);
    }

    // === GESTIÓN DE CLIENTES ===
    async getClients(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        return this.get(`/clients${params ? '?' + params : ''}`);
    }

    async getClient(clientId) {
        return this.get(`/clients/${clientId}`);
    }

    async createClient(clientData) {
        return this.post('/clients', clientData);
    }

    async updateClient(clientId, clientData) {
        return this.put(`/clients/${clientId}`, clientData);
    }

    // === GESTIÓN DE SEGURIDAD ===
    async getAccessLogs(tenantId, filters = {}) {
        const params = new URLSearchParams({ tenantId, ...filters }).toString();
        return this.get(`/security/access-logs?${params}`);
    }

    async getVisitors(tenantId, filters = {}) {
        const params = new URLSearchParams({ tenantId, ...filters }).toString();
        return this.get(`/security/visitors?${params}`);
    }

    async authorizeVisitor(visitorId, authData) {
        return this.post(`/security/visitors/${visitorId}/authorize`, authData);
    }

    async getIncidents(tenantId, filters = {}) {
        const params = new URLSearchParams({ tenantId, ...filters }).toString();
        return this.get(`/security/incidents?${params}`);
    }

    async createIncident(incidentData) {
        return this.post('/security/incidents', incidentData);
    }

    // === GESTIÓN DE ARCHIVOS ===
    async uploadFile(file, folder = 'general') {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', folder);

        return this.request('POST', '/files/upload', formData, {
            headers: {} // Dejar que el browser configure Content-Type para FormData
        });
    }

    async deleteFile(fileId) {
        return this.delete(`/files/${fileId}`);
    }

    async getFileUrl(fileId) {
        return this.get(`/files/${fileId}/url`);
    }

    // === REPORTES Y ANALYTICS ===
    async getAnalytics(type, filters = {}) {
        const params = new URLSearchParams({ type, ...filters }).toString();
        return this.get(`/analytics?${params}`);
    }

    async generateReport(reportType, filters = {}) {
        return this.post('/reports/generate', { reportType, filters });
    }

    async getReportStatus(reportId) {
        return this.get(`/reports/${reportId}/status`);
    }

    async downloadReport(reportId) {
        return this.get(`/reports/${reportId}/download`);
    }

    /**
     * Sistema de cache
     */
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }

    setCache(key, data) {
        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
    }

    clearCache(pattern = null) {
        if (pattern) {
            for (const key of this.cache.keys()) {
                if (key.includes(pattern)) {
                    this.cache.delete(key);
                }
            }
        } else {
            this.cache.clear();
        }
    }

    /**
     * Modo simulación - Mock requests
     */
    async mockRequest(method, endpoint, data) {
        // Simular delay de red
        await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 400));

        // Datos mock por endpoint
        const mockData = this.getMockData(endpoint, method, data);
        
        return {
            success: true,
            data: mockData,
            status: 200
        };
    }

    /**
     * Obtener datos mock basados en endpoint
     */
    getMockData(endpoint, method, data) {
        // Datos de ejemplo para diferentes endpoints
        const mockResponses = {
            '/users': this.generateMockUsers(),
            '/residents': this.generateMockResidents(),
            '/payments': this.generateMockPayments(),
            '/maintenance': this.generateMockMaintenance(),
            '/properties': this.generateMockProperties(),
            '/clients': this.generateMockClients(),
            '/security/access-logs': this.generateMockAccessLogs(),
            '/security/visitors': this.generateMockVisitors(),
            '/security/incidents': this.generateMockIncidents()
        };

        // Buscar coincidencia de endpoint
        for (const [pattern, mockData] of Object.entries(mockResponses)) {
            if (endpoint.includes(pattern)) {
                return mockData;
            }
        }

        // Respuesta por defecto
        return { message: 'Mock response', endpoint, method, data };
    }

    /**
     * Generadores de datos mock
     */
    generateMockUsers() {
        return [
            {
                id: 'user_001',
                name: 'Juan Pérez',
                email: 'juan.perez@email.com',
                role: 'admin',
                status: 'active',
                createdAt: '2024-01-15'
            },
            {
                id: 'user_002',
                name: 'María González',
                email: 'maria.gonzalez@email.com',
                role: 'user',
                status: 'active',
                createdAt: '2024-02-20'
            }
        ];
    }

    generateMockResidents() {
        return [
            {
                id: 'res_001',
                name: 'Carlos Martínez',
                email: 'carlos.martinez@email.com',
                unit: '304',
                phone: '+52 55 1234 5678',
                status: 'active'
            },
            {
                id: 'res_002',
                name: 'Ana López',
                email: 'ana.lopez@email.com',
                unit: '507',
                phone: '+52 55 9876 5432',
                status: 'active'
            }
        ];
    }

    generateMockPayments() {
        return [
            {
                id: 'pay_001',
                residentId: 'res_001',
                amount: 5200,
                concept: 'Mantenimiento Octubre',
                status: 'paid',
                dueDate: '2024-10-31',
                paidDate: '2024-10-28'
            },
            {
                id: 'pay_002',
                residentId: 'res_002',
                amount: 5200,
                concept: 'Mantenimiento Octubre',
                status: 'pending',
                dueDate: '2024-10-31',
                paidDate: null
            }
        ];
    }

    generateMockMaintenance() {
        return [
            {
                id: 'maint_001',
                title: 'Revisión Elevador',
                description: 'Mantenimiento preventivo mensual',
                priority: 'medium',
                status: 'completed',
                assignedTo: 'Técnico López'
            },
            {
                id: 'maint_002',
                title: 'Reparación Plomería',
                description: 'Fuga en tubería principal',
                priority: 'urgent',
                status: 'in-progress',
                assignedTo: 'Plomero García'
            }
        ];
    }

    generateMockProperties() {
        return [
            {
                id: 'prop_001',
                title: 'Casa Moderna en Polanco',
                price: 8500000,
                bedrooms: 4,
                bathrooms: 3,
                area: 350,
                status: 'available',
                location: 'Polanco, CDMX'
            },
            {
                id: 'prop_002',
                title: 'Departamento de Lujo',
                price: 4200000,
                bedrooms: 2,
                bathrooms: 2,
                area: 120,
                status: 'sold',
                location: 'Santa Fe, CDMX'
            }
        ];
    }

    generateMockClients() {
        return [
            {
                id: 'client_001',
                name: 'Roberto Martínez',
                email: 'roberto.martinez@email.com',
                phone: '+52 55 1234 5678',
                interest: 'Casa',
                budget: 8000000,
                status: 'active'
            },
            {
                id: 'client_002',
                name: 'Ana Fernández',
                email: 'ana.fernandez@email.com',
                phone: '+52 55 9876 5432',
                interest: 'Departamento',
                budget: 4500000,
                status: 'prospect'
            }
        ];
    }

    generateMockAccessLogs() {
        return [
            {
                id: 'log_001',
                userId: 'res_001',
                userName: 'Carlos Martínez',
                action: 'entry',
                location: 'Entrada Principal',
                timestamp: '2024-10-31 22:45:00',
                status: 'authorized'
            },
            {
                id: 'log_002',
                userId: 'vis_001',
                userName: 'Visitante - María García',
                action: 'entry_attempt',
                location: 'Lobby',
                timestamp: '2024-10-31 22:30:00',
                status: 'pending'
            }
        ];
    }

    generateMockVisitors() {
        return [
            {
                id: 'vis_001',
                name: 'María García',
                visiting: 'Carlos Martínez - Depto 304',
                purpose: 'Visita familiar',
                status: 'authorized',
                entryTime: '2024-10-31 20:30:00',
                expectedExit: '2024-10-31 23:00:00'
            },
            {
                id: 'vis_002',
                name: 'Pedro Rodríguez',
                visiting: 'Ana López - Depto 507',
                purpose: 'Entrega de paquete',
                status: 'pending',
                entryTime: null,
                expectedExit: '2024-10-31 23:30:00'
            }
        ];
    }

    generateMockIncidents() {
        return [
            {
                id: 'inc_001',
                title: 'Ruido excesivo',
                description: 'Reporte de ruido en Depto 205',
                priority: 'medium',
                status: 'resolved',
                reportedBy: 'Residente Depto 203',
                createdAt: '2024-10-30 23:15:00'
            },
            {
                id: 'inc_002',
                title: 'Vehículo sospechoso',
                description: 'Vehículo no identificado en estacionamiento',
                priority: 'high',
                status: 'investigating',
                reportedBy: 'Guardia de Seguridad',
                createdAt: '2024-10-31 21:45:00'
            }
        ];
    }
}

// Inicializar cliente API
const condoconnectAPI = new CondoconnectAPI();

// Exportar para uso global
window.CondoconnectAPI = condoconnectAPI;

console.log('🌐 Cliente API CondoconnectAI cargado');
