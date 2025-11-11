/**
 * CondoconnectAI - Sistema de Reportes Avanzados y Analytics
 * Reportes ejecutivos, análisis predictivo y exportación
 */

class AdvancedReportsSystem {
    constructor() {
        this.api = window.CondoconnectAPI;
        this.utils = window.CondoconnectUtils;
        this.forms = window.CondoconnectForms;
        this.notifications = window.CondoconnectNotifications;
        
        // Cache de reportes
        this.reportsCache = new Map();
        this.analyticsEngine = null;
        
        this.init();
    }

    init() {
        this.setupAnalyticsEngine();
        this.setupReportTemplates();
        
        console.log('📊 Sistema de reportes avanzados CondoconnectAI cargado');
    }

    /**
     * DASHBOARD EJECUTIVO
     */
    createExecutiveDashboard() {
        return `
            <div class="space-y-8">
                <!-- KPIs Principales -->
                <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div class="glass-effect rounded-xl p-6">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-blue-300 text-sm font-medium">Ingresos Totales</p>
                                <p class="text-3xl font-bold text-white">$2.4M</p>
                            </div>
                            <div class="w-12 h-12 bg-green-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                                <i class="fas fa-chart-line text-green-400 text-xl"></i>
                            </div>
                        </div>
                        <div class="mt-2 text-xs text-gray-400">
                            <i class="fas fa-arrow-up text-green-400 mr-1"></i>
                            +18% vs año anterior
                        </div>
                    </div>

                    <div class="glass-effect rounded-xl p-6">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-blue-300 text-sm font-medium">Ocupación</p>
                                <p class="text-3xl font-bold text-white">94.2%</p>
                            </div>
                            <div class="w-12 h-12 bg-blue-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                                <i class="fas fa-home text-blue-400 text-xl"></i>
                            </div>
                        </div>
                        <div class="mt-2 text-xs text-gray-400">
                            156 de 166 unidades
                        </div>
                    </div>

                    <div class="glass-effect rounded-xl p-6">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-blue-300 text-sm font-medium">Satisfacción</p>
                                <p class="text-3xl font-bold text-white">4.7/5</p>
                            </div>
                            <div class="w-12 h-12 bg-yellow-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                                <i class="fas fa-star text-yellow-400 text-xl"></i>
                            </div>
                        </div>
                        <div class="mt-2 text-xs text-gray-400">
                            Basado en 89 evaluaciones
                        </div>
                    </div>

                    <div class="glass-effect rounded-xl p-6">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-blue-300 text-sm font-medium">ROI</p>
                                <p class="text-3xl font-bold text-white">23.4%</p>
                            </div>
                            <div class="w-12 h-12 bg-purple-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                                <i class="fas fa-percentage text-purple-400 text-xl"></i>
                            </div>
                        </div>
                        <div class="mt-2 text-xs text-gray-400">
                            Retorno de inversión anual
                        </div>
                    </div>
                </div>

                <!-- Gráficos Principales -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <!-- Ingresos vs Gastos -->
                    <div class="glass-effect rounded-xl overflow-hidden">
                        <div class="p-6 border-b border-blue-500 border-opacity-30">
                            <h3 class="text-xl font-bold text-white">
                                <i class="fas fa-chart-area mr-2 text-blue-400"></i>Ingresos vs Gastos
                            </h3>
                        </div>
                        <div class="p-6">
                            <div class="h-64">
                                <canvas id="incomeExpensesChart"></canvas>
                            </div>
                        </div>
                    </div>

                    <!-- Análisis Predictivo -->
                    <div class="glass-effect rounded-xl overflow-hidden">
                        <div class="p-6 border-b border-purple-500 border-opacity-30">
                            <h3 class="text-xl font-bold text-white">
                                <i class="fas fa-crystal-ball mr-2 text-purple-400"></i>Predicciones IA
                            </h3>
                        </div>
                        <div class="p-6">
                            <div class="space-y-4">
                                <div class="flex items-center justify-between p-3 bg-green-900 bg-opacity-30 rounded-lg">
                                    <div>
                                        <p class="text-white font-medium">Ingresos Q1 2025</p>
                                        <p class="text-green-300 text-sm">Predicción: $650K</p>
                                    </div>
                                    <div class="text-green-400 font-bold">+8%</div>
                                </div>
                                <div class="flex items-center justify-between p-3 bg-yellow-900 bg-opacity-30 rounded-lg">
                                    <div>
                                        <p class="text-white font-medium">Mantenimiento</p>
                                        <p class="text-yellow-300 text-sm">Pico en Marzo 2025</p>
                                    </div>
                                    <div class="text-yellow-400 font-bold">⚠️</div>
                                </div>
                                <div class="flex items-center justify-between p-3 bg-blue-900 bg-opacity-30 rounded-lg">
                                    <div>
                                        <p class="text-white font-medium">Ocupación</p>
                                        <p class="text-blue-300 text-sm">Estable 95%+</p>
                                    </div>
                                    <div class="text-blue-400 font-bold">📈</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Reportes Rápidos -->
                <div class="glass-effect rounded-xl overflow-hidden">
                    <div class="p-6 border-b border-blue-500 border-opacity-30">
                        <div class="flex justify-between items-center">
                            <h3 class="text-xl font-bold text-white">
                                <i class="fas fa-file-alt mr-2 text-blue-400"></i>Reportes Ejecutivos
                            </h3>
                            <button onclick="AdvancedReportsSystem.createCustomReport()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
                                <i class="fas fa-plus mr-2"></i>Nuevo Reporte
                            </button>
                        </div>
                    </div>
                    <div class="p-6">
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                            ${this.renderQuickReports()}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Renderizar reportes rápidos
     */
    renderQuickReports() {
        const quickReports = [
            {
                title: 'Estado Financiero',
                description: 'Balance general y estado de resultados',
                icon: 'fas fa-chart-pie',
                color: 'green',
                action: 'generateFinancialReport'
            },
            {
                title: 'Análisis de Ocupación',
                description: 'Tendencias y proyecciones de ocupación',
                icon: 'fas fa-building',
                color: 'blue',
                action: 'generateOccupancyReport'
            },
            {
                title: 'Reporte de Mantenimiento',
                description: 'Costos y eficiencia de mantenimiento',
                icon: 'fas fa-tools',
                color: 'yellow',
                action: 'generateMaintenanceReport'
            },
            {
                title: 'Satisfacción del Cliente',
                description: 'Encuestas y feedback de residentes',
                icon: 'fas fa-smile',
                color: 'purple',
                action: 'generateSatisfactionReport'
            },
            {
                title: 'Análisis de Seguridad',
                description: 'Incidentes y métricas de seguridad',
                icon: 'fas fa-shield-alt',
                color: 'red',
                action: 'generateSecurityReport'
            },
            {
                title: 'Reporte de Ventas',
                description: 'Performance y pipeline de ventas',
                icon: 'fas fa-handshake',
                color: 'indigo',
                action: 'generateSalesReport'
            }
        ];

        return quickReports.map(report => `
            <div class="bg-gray-800 bg-opacity-50 rounded-lg p-6 hover:bg-opacity-70 transition-all cursor-pointer"
                 onclick="AdvancedReportsSystem.${report.action}()">
                <div class="flex items-center mb-4">
                    <div class="w-12 h-12 bg-${report.color}-500 bg-opacity-20 rounded-lg flex items-center justify-center mr-4">
                        <i class="${report.icon} text-${report.color}-400 text-xl"></i>
                    </div>
                    <div>
                        <h4 class="text-white font-bold">${report.title}</h4>
                        <p class="text-gray-400 text-sm">${report.description}</p>
                    </div>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-${report.color}-400 text-sm font-medium">Generar</span>
                    <i class="fas fa-arrow-right text-${report.color}-400"></i>
                </div>
            </div>
        `).join('');
    }

    /**
     * GENERADOR DE REPORTES PERSONALIZADOS
     */
    createCustomReport() {
        const reportForm = this.forms.createForm({
            title: 'Crear Reporte Personalizado',
            size: 'lg',
            fields: [
                { name: 'report_name', type: 'text', label: 'Nombre del Reporte', required: true },
                { name: 'report_type', type: 'select', label: 'Tipo de Reporte', required: true, options: [
                    { value: 'financial', label: '💰 Financiero' },
                    { value: 'operational', label: '⚙️ Operacional' },
                    { value: 'marketing', label: '📢 Marketing' },
                    { value: 'hr', label: '👥 Recursos Humanos' },
                    { value: 'security', label: '🛡️ Seguridad' },
                    { value: 'maintenance', label: '🔧 Mantenimiento' },
                    { value: 'custom', label: '📊 Personalizado' }
                ]},
                { name: 'date_range', type: 'select', label: 'Período', required: true, options: [
                    { value: 'last_7_days', label: 'Últimos 7 días' },
                    { value: 'last_30_days', label: 'Últimos 30 días' },
                    { value: 'current_month', label: 'Mes actual' },
                    { value: 'last_month', label: 'Mes anterior' },
                    { value: 'current_quarter', label: 'Trimestre actual' },
                    { value: 'current_year', label: 'Año actual' },
                    { value: 'custom', label: 'Personalizado' }
                ]},
                { name: 'start_date', type: 'date', label: 'Fecha Inicio' },
                { name: 'end_date', type: 'date', label: 'Fecha Fin' },
                { name: 'metrics', type: 'select', label: 'Métricas a Incluir', options: [
                    { value: 'revenue', label: 'Ingresos' },
                    { value: 'expenses', label: 'Gastos' },
                    { value: 'occupancy', label: 'Ocupación' },
                    { value: 'maintenance_costs', label: 'Costos de Mantenimiento' },
                    { value: 'security_incidents', label: 'Incidentes de Seguridad' },
                    { value: 'customer_satisfaction', label: 'Satisfacción del Cliente' }
                ]},
                { name: 'format', type: 'select', label: 'Formato de Salida', required: true, options: [
                    { value: 'pdf', label: '📄 PDF' },
                    { value: 'excel', label: '📊 Excel' },
                    { value: 'powerpoint', label: '📈 PowerPoint' },
                    { value: 'dashboard', label: '🖥️ Dashboard Interactivo' }
                ]},
                { name: 'recipients', type: 'textarea', label: 'Destinatarios (emails)', placeholder: 'email1@ejemplo.com, email2@ejemplo.com', rows: 2 },
                { name: 'schedule', type: 'select', label: 'Programación', options: [
                    { value: 'once', label: 'Una vez' },
                    { value: 'daily', label: 'Diario' },
                    { value: 'weekly', label: 'Semanal' },
                    { value: 'monthly', label: 'Mensual' },
                    { value: 'quarterly', label: 'Trimestral' }
                ]},
                { name: 'notes', type: 'textarea', label: 'Notas Adicionales', rows: 3 }
            ],
            onSubmit: async (data) => {
                await this.generateCustomReport(data);
            }
        });
        
        reportForm.show();
    }

    /**
     * Generar reporte personalizado
     */
    async generateCustomReport(reportConfig) {
        this.notifications.show('📊 Generando reporte personalizado...', 'info');
        
        // Simular generación
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const reportData = await this.collectReportData(reportConfig);
        const formattedReport = await this.formatReport(reportData, reportConfig);
        
        // Mostrar resultado
        this.showReportResult(formattedReport, reportConfig);
    }

    /**
     * REPORTES ESPECÍFICOS
     */
    
    // Reporte Financiero
    async generateFinancialReport() {
        this.notifications.show('💰 Generando reporte financiero...', 'info');
        
        const reportData = {
            period: 'Octubre 2024',
            totalRevenue: 847200,
            totalExpenses: 234500,
            netIncome: 612700,
            profitMargin: 72.3,
            breakdown: {
                maintenance_fees: 650000,
                parking_fees: 120000,
                amenity_fees: 77200,
                maintenance_costs: 145000,
                utilities: 45000,
                staff_salaries: 44500
            }
        };
        
        this.showFinancialReportModal(reportData);
    }

    // Reporte de Ocupación
    async generateOccupancyReport() {
        this.notifications.show('🏠 Generando análisis de ocupación...', 'info');
        
        const reportData = {
            currentOccupancy: 94.2,
            totalUnits: 166,
            occupiedUnits: 156,
            vacantUnits: 10,
            trends: [
                { month: 'Jun', occupancy: 91.5 },
                { month: 'Jul', occupancy: 92.8 },
                { month: 'Ago', occupancy: 93.4 },
                { month: 'Sep', occupancy: 94.0 },
                { month: 'Oct', occupancy: 94.2 }
            ]
        };
        
        this.showOccupancyReportModal(reportData);
    }

    /**
     * MOTOR DE ANALYTICS
     */
    setupAnalyticsEngine() {
        this.analyticsEngine = {
            // Análisis predictivo
            predictTrends: (historicalData, metric) => {
                // Algoritmo simple de regresión lineal
                const predictions = [];
                const trend = this.calculateTrend(historicalData);
                
                for (let i = 1; i <= 6; i++) { // Predecir 6 meses
                    const prediction = historicalData[historicalData.length - 1] + (trend * i);
                    predictions.push(Math.max(0, prediction));
                }
                
                return predictions;
            },

            // Análisis de correlación
            findCorrelations: (dataset1, dataset2) => {
                // Calcular correlación de Pearson
                const n = Math.min(dataset1.length, dataset2.length);
                let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
                
                for (let i = 0; i < n; i++) {
                    sumX += dataset1[i];
                    sumY += dataset2[i];
                    sumXY += dataset1[i] * dataset2[i];
                    sumX2 += dataset1[i] * dataset1[i];
                    sumY2 += dataset2[i] * dataset2[i];
                }
                
                const correlation = (n * sumXY - sumX * sumY) / 
                    Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
                
                return correlation;
            },

            // Detección de anomalías
            detectAnomalies: (data, threshold = 2) => {
                const mean = data.reduce((a, b) => a + b) / data.length;
                const stdDev = Math.sqrt(data.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / data.length);
                
                return data.map((value, index) => ({
                    index: index,
                    value: value,
                    isAnomaly: Math.abs(value - mean) > threshold * stdDev,
                    zScore: (value - mean) / stdDev
                }));
            }
        };
    }

    /**
     * Mostrar modal de reporte financiero
     */
    showFinancialReportModal(data) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="fixed inset-0 bg-slate-900 bg-opacity-75 backdrop-blur-sm"></div>
            <div class="glass-effect rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div class="p-6 border-b border-green-500 border-opacity-30">
                    <div class="flex justify-between items-center">
                        <h3 class="text-xl font-bold text-white">
                            💰 Reporte Financiero - ${data.period}
                        </h3>
                        <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-white">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>
                </div>
                
                <!-- Resumen Ejecutivo -->
                <div class="p-6 border-b border-green-500 border-opacity-20">
                    <h4 class="text-lg font-bold text-white mb-4">Resumen Ejecutivo</h4>
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div class="text-center p-4 bg-green-900 bg-opacity-30 rounded-lg">
                            <p class="text-green-300 text-sm">Ingresos Totales</p>
                            <p class="text-2xl font-bold text-white">${this.utils.formatCurrency(data.totalRevenue)}</p>
                        </div>
                        <div class="text-center p-4 bg-red-900 bg-opacity-30 rounded-lg">
                            <p class="text-red-300 text-sm">Gastos Totales</p>
                            <p class="text-2xl font-bold text-white">${this.utils.formatCurrency(data.totalExpenses)}</p>
                        </div>
                        <div class="text-center p-4 bg-blue-900 bg-opacity-30 rounded-lg">
                            <p class="text-blue-300 text-sm">Utilidad Neta</p>
                            <p class="text-2xl font-bold text-white">${this.utils.formatCurrency(data.netIncome)}</p>
                        </div>
                        <div class="text-center p-4 bg-purple-900 bg-opacity-30 rounded-lg">
                            <p class="text-purple-300 text-sm">Margen</p>
                            <p class="text-2xl font-bold text-white">${data.profitMargin}%</p>
                        </div>
                    </div>
                </div>
                
                <!-- Desglose Detallado -->
                <div class="p-6">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <!-- Ingresos -->
                        <div>
                            <h5 class="text-lg font-bold text-green-400 mb-4">📈 Ingresos</h5>
                            <div class="space-y-3">
                                            <div class="space-y-3">
                                <div class="flex justify-between items-center p-3 bg-gray-800 bg-opacity-50 rounded-lg">
                                    <span class="text-white">Cuotas de Mantenimiento</span>
                                    <span class="text-green-400 font-bold">${this.utils.formatCurrency(data.breakdown.maintenance_fees)}</span>
                                </div>
                                <div class="flex justify-between items-center p-3 bg-gray-800 bg-opacity-50 rounded-lg">
                                    <span class="text-white">Estacionamientos</span>
                                    <span class="text-green-400 font-bold">${this.utils.formatCurrency(data.breakdown.parking_fees)}</span>
                                </div>
                                <div class="flex justify-between items-center p-3 bg-gray-800 bg-opacity-50 rounded-lg">
                                    <span class="text-white">Amenidades</span>
                                    <span class="text-green-400 font-bold">${this.utils.formatCurrency(data.breakdown.amenity_fees)}</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Gastos -->
                        <div>
                            <h5 class="text-lg font-bold text-red-400 mb-4">📉 Gastos</h5>
                            <div class="space-y-3">
                                <div class="flex justify-between items-center p-3 bg-gray-800 bg-opacity-50 rounded-lg">
                                    <span class="text-white">Mantenimiento</span>
                                    <span class="text-red-400 font-bold">${this.utils.formatCurrency(data.breakdown.maintenance_costs)}</span>
                                </div>
                                <div class="flex justify-between items-center p-3 bg-gray-800 bg-opacity-50 rounded-lg">
                                    <span class="text-white">Servicios</span>
                                    <span class="text-red-400 font-bold">${this.utils.formatCurrency(data.breakdown.utilities)}</span>
                                </div>
                                <div class="flex justify-between items-center p-3 bg-gray-800 bg-opacity-50 rounded-lg">
                                    <span class="text-white">Nómina</span>
                                    <span class="text-red-400 font-bold">${this.utils.formatCurrency(data.breakdown.staff_salaries)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Acciones -->
                <div class="p-6 border-t border-green-500 border-opacity-30 flex justify-between">
                    <div class="space-x-3">
                        <button onclick="AdvancedReportsSystem.exportToPDF('financial')" class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg">
                            <i class="fas fa-file-pdf mr-2"></i>Exportar PDF
                        </button>
                        <button onclick="AdvancedReportsSystem.exportToExcel('financial')" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg">
                            <i class="fas fa-file-excel mr-2"></i>Exportar Excel
                        </button>
                    </div>
                    <button onclick="this.closest('.fixed').remove()" class="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg">
                        Cerrar
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.notifications.show('✅ Reporte financiero generado', 'success');
    }

    /**
     * Configurar plantillas de reportes
     */
    setupReportTemplates() {
        this.reportTemplates = {
            financial: {
                name: 'Reporte Financiero',
                sections: ['executive_summary', 'income_statement', 'cash_flow', 'budget_variance'],
                charts: ['revenue_trend', 'expense_breakdown', 'profit_margin']
            },
            operational: {
                name: 'Reporte Operacional',
                sections: ['occupancy_metrics', 'maintenance_summary', 'staff_performance'],
                charts: ['occupancy_trend', 'maintenance_costs', 'response_times']
            },
            security: {
                name: 'Reporte de Seguridad',
                sections: ['incident_summary', 'access_logs', 'patrol_reports'],
                charts: ['incident_trends', 'access_patterns', 'response_metrics']
            }
        };
    }

    /**
     * Recopilar datos para reporte
     */
    async collectReportData(config) {
        // Simular recopilación de datos
        const mockData = {
            financial: {
                revenue: 847200,
                expenses: 234500,
                profit: 612700,
                trends: [650000, 720000, 780000, 820000, 847200]
            },
            operational: {
                occupancy: 94.2,
                maintenance_requests: 23,
                avg_response_time: 2.4,
                satisfaction_score: 4.7
            },
            security: {
                incidents: 2,
                access_logs: 1247,
                patrol_completions: 98.5,
                false_alarms: 1
            }
        };
        
        return mockData[config.report_type] || mockData.financial;
    }

    /**
     * Formatear reporte
     */
    async formatReport(data, config) {
        const template = this.reportTemplates[config.report_type];
        
        return {
            title: config.report_name,
            type: config.report_type,
            period: config.date_range,
            data: data,
            template: template,
            format: config.format,
            generated_at: new Date().toISOString()
        };
    }

    /**
     * Mostrar resultado del reporte
     */
    showReportResult(report, config) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="fixed inset-0 bg-slate-900 bg-opacity-75 backdrop-blur-sm"></div>
            <div class="glass-effect rounded-xl max-w-2xl w-full">
                <div class="p-6 border-b border-blue-500 border-opacity-30">
                    <h3 class="text-xl font-bold text-white">
                        ✅ Reporte Generado Exitosamente
                    </h3>
                </div>
                <div class="p-6">
                    <div class="space-y-4">
                        <div class="flex justify-between">
                            <span class="text-gray-400">Nombre:</span>
                            <span class="text-white font-medium">${report.title}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Tipo:</span>
                            <span class="text-white font-medium">${report.type}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Período:</span>
                            <span class="text-white font-medium">${report.period}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Formato:</span>
                            <span class="text-white font-medium">${config.format.toUpperCase()}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Generado:</span>
                            <span class="text-white font-medium">${new Date().toLocaleString()}</span>
                        </div>
                    </div>
                </div>
                <div class="p-6 border-t border-blue-500 border-opacity-30 flex justify-between">
                    <div class="space-x-3">
                        <button onclick="AdvancedReportsSystem.downloadReport('${report.title}')" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
                            <i class="fas fa-download mr-2"></i>Descargar
                        </button>
                        <button onclick="AdvancedReportsSystem.emailReport('${report.title}')" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg">
                            <i class="fas fa-envelope mr-2"></i>Enviar por Email
                        </button>
                    </div>
                    <button onclick="this.closest('.fixed').remove()" class="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg">
                        Cerrar
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    /**
     * Calcular tendencia
     */
    calculateTrend(data) {
        const n = data.length;
        const sumX = (n * (n - 1)) / 2;
        const sumY = data.reduce((a, b) => a + b, 0);
        const sumXY = data.reduce((sum, y, x) => sum + x * y, 0);
        const sumX2 = data.reduce((sum, _, x) => sum + x * x, 0);
        
        return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    }

    // Métodos estáticos para uso global
    static createCustomReport() {
        if (window.AdvancedReportsSystem) {
            window.AdvancedReportsSystem.createCustomReport();
        }
    }

    static generateFinancialReport() {
        if (window.AdvancedReportsSystem) {
            window.AdvancedReportsSystem.generateFinancialReport();
        }
    }

    static generateOccupancyReport() {
        if (window.AdvancedReportsSystem) {
            window.AdvancedReportsSystem.generateOccupancyReport();
        }
    }

    static generateMaintenanceReport() {
        window.CondoconnectNotifications.show('🔧 Generando reporte de mantenimiento...', 'info');
    }

    static generateSatisfactionReport() {
        window.CondoconnectNotifications.show('😊 Generando reporte de satisfacción...', 'info');
    }

    static generateSecurityReport() {
        window.CondoconnectNotifications.show('🛡️ Generando reporte de seguridad...', 'info');
    }

    static generateSalesReport() {
        window.CondoconnectNotifications.show('🤝 Generando reporte de ventas...', 'info');
    }

    static exportToPDF(reportType) {
        window.CondoconnectNotifications.show('📄 Exportando a PDF...', 'info');
    }

    static exportToExcel(reportType) {
        window.CondoconnectNotifications.show('📊 Exportando a Excel...', 'info');
    }

    static downloadReport(reportName) {
        window.CondoconnectNotifications.show(`📥 Descargando ${reportName}...`, 'info');
    }

    static emailReport(reportName) {
        window.CondoconnectNotifications.show(`📧 Enviando ${reportName} por email...`, 'info');
    }
}

// Inicializar sistema de reportes avanzados
const advancedReportsSystem = new AdvancedReportsSystem();
window.AdvancedReportsSystem = advancedReportsSystem;

console.log('📊 Sistema de reportes avanzados CondoconnectAI cargado');

