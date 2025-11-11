class CondoconnectApp {
    static init() {
        this.setupNavigation();
        this.loadDashboardData();
        this.startRealTimeUpdates();
    }
    
    static setupNavigation() {
        document.querySelectorAll('[data-module]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const module = e.target.dataset.module;
                this.loadModule(module);
            });
        });
    }
    
    static async loadModule(moduleName) {
        try {
            const response = await fetch(`modules/${moduleName}.html`);
            const html = await response.text();
            
            document.getElementById('dashboard-container').style.display = 'none';
            document.getElementById('module-container').innerHTML = html;
            document.getElementById('module-container').style.display = 'block';
            
            // Inicializar el módulo específico
            if (window[`${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}Module`]) {
                window[`${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}Module`].init();
            }
        } catch (error) {
            console.error('Error loading module:', error);
        }
    }
    
    static async loadDashboardData() {
        // Cargar datos para widgets del dashboard
        const widgets = ['financial_summary', 'unit_occupancy', 'daily_visitors', 'maintenance_orders'];
        
        for (const widget of widgets) {
            try {
                const response = await fetch(`api/dashboard-data.php?action=${widget}`);
                const data = await response.json();
                this.updateWidget(widget, data);
            } catch (error) {
                console.error(`Error loading ${widget}:`, error);
            }
        }
    }
    
    static updateWidget(widgetName, data) {
        const widget = document.querySelector(`[data-widget="${widgetName}"]`);
        if (!widget) return;
        
        switch (widgetName) {
            case 'financial_summary':
                this.updateFinancialWidget(widget, data);
                break;
            case 'unit_occupancy':
                this.updateOccupancyWidget(widget, data);
                break;
            case 'daily_visitors':
                this.updateVisitorsWidget(widget, data);
                break;
            case 'maintenance_orders':
                this.updateMaintenanceWidget(widget, data);
                break;
        }
    }
    
    static updateFinancialWidget(widget, data) {
        widget.querySelector('.income-value').textContent = 
            new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' })
                .format(data.income);
        
        widget.querySelector('.expenses-value').textContent = 
            new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' })
                .format(data.expenses);
        
        widget.querySelector('.balance-value').textContent = 
            new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' })
                .format(data.balance);
    }
    
    static startRealTimeUpdates() {
        setInterval(() => {
            this.loadDashboardData();
        }, 30000); // Actualizar cada 30 segundos
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    CondoconnectApp.init();
});
