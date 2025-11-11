/**
 * CondoconnectAI - Aplicación Principal
 * Inicializador y coordinador general del sistema
 */

class CondoconnectApp {
    constructor() {
        this.config = window.CondoconnectConfig;
        this.auth = window.CondoconnectAuth;
        this.api = window.CondoconnectAPI;
        this.utils = window.CondoconnectUtils;
        this.notifications = window.CondoconnectNotifications;
        
        this.currentModule = null;
        this.isInitialized = false;
        
        // Estado de la aplicación
        this.state = {
            user: null,
            tenant: null,
            permissions: [],
            theme: 'dark',
            language: 'es'
        };
        
        this.init();
    }

    /**
     * Inicializar aplicación
     */
    async init() {
        try {
            console.log('🚀 Inicializando CondoconnectAI...');
            
            // Mostrar splash screen
            this.showSplashScreen();
            
            // Verificar dependencias
            await this.checkDependencies();
            
            // Configurar listeners globales
            this.setupGlobalListeners();
            
            // Inicializar componentes
            await this.initializeComponents();
            
            // Verificar autenticación
            await this.checkAuthentication();
            
            // Configurar routing
            this.setupRouting();
            
            // Ocultar splash screen
            this.hideSplashScreen();
            
            this.isInitialized = true;
            console.log('✅ CondoconnectAI inicializado correctamente');
            
            // Emitir evento de inicialización
            this.emit('app:initialized');
            
        } catch (error) {
            console.error('❌ Error inicializando aplicación:', error);
            this.showError('Error inicializando la aplicación', error.message);
        }
    }

    /**
     * Verificar dependencias
     */
    async checkDependencies() {
        const dependencies = [
            { name: 'Config', obj: this.config },
            { name: 'Auth', obj: this.auth },
            { name: 'API', obj: this.api },
            { name: 'Utils', obj: this.utils }
        ];

        const missing = dependencies.filter(dep => !dep.obj);
        
        if (missing.length > 0) {
            throw new Error(`Dependencias faltantes: ${missing.map(d => d.name).join(', ')}`);
        }

        // Verificar configuración AWS
        if (!this.config.validateConfig()) {
            console.warn('⚠️ Configuración AWS incompleta - Ejecutando en modo simulación');
        }
    }

    /**
     * Configurar listeners globales
     */
    setupGlobalListeners() {
        // Listener para cambios de autenticación
        document.addEventListener('authStateChange', (event) => {
            this.handleAuthStateChange(event.detail);
        });

        // Listener para errores globales
        window.addEventListener('error', (event) => {
            this.handleGlobalError(event);
        });

        // Listener para errores de promesas no capturadas
        window.addEventListener('unhandledrejection', (event) => {
            this.handleUnhandledRejection(event);
        });

        // Listener para cambios de conectividad
        window.addEventListener('online', () => {
            this.handleConnectivityChange(true);
        });

        window.addEventListener('offline', () => {
            this.handleConnectivityChange(false);
        });

        // Listener para cambios de tamaño de ventana
        window.addEventListener('resize', this.utils.debounce(() => {
            this.handleWindowResize();
        }, 250));

        // Listener para atajos de teclado
        document.addEventListener('keydown', (event) => {
            this.handleKeyboardShortcuts(event);
        });

        // Listener para beforeunload
        window.addEventListener('beforeunload', (event) => {
            this.handleBeforeUnload(event);
        });
    }

    /**
     * Inicializar componentes
     */
    async initializeComponents() {
        // Inicializar sistema de notificaciones
        if (!this.notifications) {
            this.notifications = new CondoconnectNotifications();
            window.CondoconnectNotifications = this.notifications;
        }

        // Inicializar tema
        this.initializeTheme();

        // Inicializar tooltips
        this.initializeTooltips();

        // Inicializar modales
        this.initializeModals();

        // Inicializar componentes de UI
        this.initializeUIComponents();
    }

    /**
     * Verificar autenticación
     */
    async checkAuthentication() {
        if (this.auth.isAuthenticated()) {
            const user = this.auth.getCurrentUser();
            await this.handleUserLogin(user);
        } else {
            this.showLoginScreen();
        }
    }

    /**
     * Configurar routing
     */
    setupRouting() {
        // Routing simple basado en hash
        window.addEventListener('hashchange', () => {
            this.handleRouteChange();
        });

        // Manejar ruta inicial
        this.handleRouteChange();
    }

    /**
     * Manejar cambio de ruta
     */
    handleRouteChange() {
        const hash = window.location.hash.slice(1) || 'dashboard';
        const [module, section] = hash.split('/');
        
        this.navigateToModule(module, section);
    }

    /**
     * Navegar a módulo
     */
    async navigateToModule(moduleName, section = 'dashboard') {
        try {
            // Verificar si el usuario tiene acceso al módulo
            if (!this.hasModuleAccess(moduleName)) {
                this.showError('Acceso denegado', 'No tienes permisos para acceder a este módulo');
                return;
            }

            // Cargar módulo si es diferente al actual
            if (this.currentModule !== moduleName) {
                await this.loadModule(moduleName);
            }

            // Navegar a sección dentro del módulo
            if (section && section !== 'dashboard') {
                this.navigateToSection(section);
            }

            // Actualizar estado
            this.currentModule = moduleName;
            this.updateNavigationState(moduleName, section);

        } catch (error) {
            console.error('❌ Error navegando a módulo:', error);
            this.showError('Error de navegación', error.message);
        }
    }

    /**
     * Cargar módulo
     */
    async loadModule(moduleName) {
        const moduleConfig = this.config.getConfig(`modules.${moduleName}`);
        
        if (!moduleConfig) {
            throw new Error(`Módulo ${moduleName} no encontrado`);
        }

        // Mostrar loading
        this.showLoading(`Cargando ${moduleConfig.name}...`);

        try {
            // Cargar archivo del módulo
            const moduleUrl = moduleConfig.path;
            const response = await fetch(moduleUrl);
            
            if (!response.ok) {
                throw new Error(`Error cargando módulo: ${response.status}`);
            }

            const moduleHTML = await response.text();
            
            // Inyectar HTML del módulo
            const moduleContainer = document.getElementById('module-container');
            if (moduleContainer) {
                moduleContainer.innerHTML = moduleHTML;
            } else {
                // Crear contenedor si no existe
                document.body.innerHTML = moduleHTML;
            }

            // Ejecutar scripts del módulo
            this.executeModuleScripts(moduleHTML);

            // Emitir evento de módulo cargado
            this.emit('module:loaded', { module: moduleName });

        } finally {
            this.hideLoading();
        }
    }

    /**
     * Ejecutar scripts del módulo
     */
    executeModuleScripts(html) {
        const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
        let match;

        while ((match = scriptRegex.exec(html)) !== null) {
            try {
                const scriptContent = match[1];
                if (scriptContent.trim()) {
                    // Crear y ejecutar script
                    const script = document.createElement('script');
                    script.textContent = scriptContent;
                    document.head.appendChild(script);
                    document.head.removeChild(script);
                }
            } catch (error) {
                console.error('❌ Error ejecutando script del módulo:', error);
            }
        }
    }

    /**
     * Verificar acceso a módulo
     */
    hasModuleAccess(moduleName) {
        // En modo simulación, permitir acceso a todos los módulos
        if (this.config.getConfig('env.mockData')) {
            return true;
        }

        // Verificar permisos del usuario
        const userPermissions = this.state.permissions;
        const requiredPermission = `module:${moduleName}`;
        
        return userPermissions.includes(requiredPermission) || userPermissions.includes('admin');
    }

    /**
     * Manejar cambio de estado de autenticación
     */
    async handleAuthStateChange({ state, user }) {
        if (state === 'signedIn') {
            await this.handleUserLogin(user);
        } else if (state === 'signedOut') {
            this.handleUserLogout();
        }
    }

    /**
     * Manejar login de usuario
     */
    async handleUserLogin(user) {
        try {
            // Actualizar estado
            this.state.user = user;

            // Cargar información del tenant
            await this.loadTenantInfo(user);

            // Cargar permisos del usuario
            await this.loadUserPermissions(user);

            // Ocultar pantalla de login
            this.hideLoginScreen();

            // Mostrar interfaz principal
            this.showMainInterface();

            // Navegar a dashboard por defecto
            if (!window.location.hash) {
                window.location.hash = '#dashboard';
            }

            // Mostrar notificación de bienvenida
            const userName = this.utils.getUserDisplayName(user);
            this.notifications.show(`¡Bienvenido, ${userName}!`, 'success');

        } catch (error) {
            console.error('❌ Error en login:', error);
            this.showError('Error de autenticación', error.message);
        }
    }

    /**
     * Manejar logout de usuario
     */
    handleUserLogout() {
        // Limpiar estado
        this.state.user = null;
        this.state.tenant = null;
        this.state.permissions = [];
        this.currentModule = null;

        // Limpiar cache
        this.api.clearCache();

        // Mostrar pantalla de login
        this.showLoginScreen();

        // Limpiar hash
        window.location.hash = '';

        // Mostrar notificación
        this.notifications.show('Sesión cerrada correctamente', 'info');
    }

    /**
     * Cargar información del tenant
     */
    async loadTenantInfo(user) {
        try {
            // En modo simulación, usar datos mock
            if (this.config.getConfig('env.mockData')) {
                this.state.tenant = {
                    id: 'tenant_001',
                    name: 'Residencial Las Flores',
                    type: 'residential',
                    modules: ['institucional', 'seguridad', 'propiedades']
                };
                return;
            }

            // Cargar información real del tenant
            const response = await this.api.get('/tenant/info');
            if (response.success) {
                this.state.tenant = response.data;
            }
        } catch (error) {
            console.warn('⚠️ Error cargando información del tenant:', error);
        }
    }

    /**
     * Cargar permisos del usuario
     */
    async loadUserPermissions(user) {
        try {
            // En modo simulación, usar permisos mock
            if (this.config.getConfig('env.mockData')) {
                this.state.permissions = ['admin', 'module:institucional', 'module:seguridad', 'module:propiedades'];
                return;
            }

            // Cargar permisos reales
            const response = await this.api.get('/user/permissions');
            if (response.success) {
                this.state.permissions = response.data.permissions || [];
            }
        } catch (error) {
            console.warn('⚠️ Error cargando permisos:', error);
            this.state.permissions = [];
        }
    }

    /**
     * Mostrar pantalla de splash
     */
    showSplashScreen() {
        const splash = document.createElement('div');
        splash.id = 'splash-screen';
        splash.className = 'fixed inset-0 bg-slate-900 flex items-center justify-center z-50';
        splash.innerHTML = `
            <div class="text-center">
                <div class="w-20 h-20 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <h1 class="text-2xl font-bold text-white mb-2">CondoconnectAI</h1>
                <p class="text-blue-300">Inicializando sistema...</p>
            </div>
        `;
        document.body.appendChild(splash);
    }

    /**
     * Ocultar pantalla de splash
     */
    hideSplashScreen() {
        const splash = document.getElementById('splash-screen');
        if (splash) {
            splash.style.opacity = '0';
            setTimeout(() => {
                splash.remove();
            }, 300);
        }
    }

    /**
     * Mostrar pantalla de login
     */
    showLoginScreen() {
        // Crear o mostrar pantalla de login
        let loginScreen = document.getElementById('login-screen');
        
        if (!loginScreen) {
            loginScreen = document.createElement('div');
            loginScreen.id = 'login-screen';
            loginScreen.innerHTML = this.getLoginScreenHTML();
            document.body.appendChild(loginScreen);
            
            // Configurar eventos del login
            this.setupLoginEvents();
        }
        
        loginScreen.style.display = 'flex';
    }

    /**
     * Ocultar pantalla de login
     */
    hideLoginScreen() {
        const loginScreen = document.getElementById('login-screen');
        if (loginScreen) {
            loginScreen.style.display = 'none';
        }
    }

    /**
     * Mostrar interfaz principal
     */
    showMainInterface() {
        // Crear o mostrar interfaz principal
        let mainInterface = document.getElementById('main-interface');
        
        if (!mainInterface) {
            mainInterface = document.createElement('div');
            mainInterface.id = 'main-interface';
            mainInterface.innerHTML = this.getMainInterfaceHTML();
            document.body.appendChild(mainInterface);
            
            // Configurar eventos de la interfaz
            this.setupMainInterfaceEvents();
        }
        
        mainInterface.style.display = 'block';
    }

    /**
     * HTML de la pantalla de login
     */
    getLoginScreenHTML() {
        return `
            <div class="fixed inset-0 bg-slate-900 flex items-center justify-center z-40">
                <div class="max-w-md w-full mx-4">
                    <div class="bg-slate-800 rounded-xl p-8 shadow-2xl border border-blue-500 border-opacity-30">
                        <div class="text-center mb-8">
                            <div class="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <i class="fas fa-building text-white text-2xl"></i>
                            </div>
                            <h1 class="text-2xl font-bold text-white mb-2">CondoconnectAI</h1>
                            <p class="text-blue-300">Sistema integral de gestión inmobiliaria</p>
                        </div>

                        <form id="login-form" class="space-y-6">
                            <div>
                                <label class="block text-sm font-medium text-blue-300 mb-2">Email</label>
                                <input type="email" id="login-email" required 
                                       class="w-full bg-slate-700 border border-blue-500 border-opacity-30 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                                       placeholder="tu@email.com">
                            </div>

                            <div>
                                <label class="block text-sm font-medium text-blue-300 mb-2">Contraseña</label>
                                <input type="password" id="login-password" required 
                                       class="w-full bg-slate-700 border border-blue-500 border-opacity-30 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                                       placeholder="••••••••">
                            </div>

                            <button type="submit" id="login-button" 
                                    class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200">
                                <span id="login-button-text">Iniciar Sesión</span>
                                <i id="login-spinner" class="fas fa-spinner fa-spin ml-2 hidden"></i>
                            </button>
                        </form>

                        <div class="mt-6 text-center">
                            <a href="#" id="forgot-password-link" class="text-blue-400 hover:text-blue-300 text-sm">
                                ¿Olvidaste tu contraseña?
                            </a>
                        </div>

                        <div class="mt-8 p-4 bg-slate-700 rounded-lg">
                            <p class="text-xs text-gray-400 mb-2">Usuarios de prueba:</p>
                            <p class="text-xs text-blue-300">admin@condoconnectai.com / Admin123</p>
                            <p class="text-xs text-blue-300">demo@condoconnectai.com / Demo123</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * HTML de la interfaz principal
     */
    getMainInterfaceHTML() {
        return `
            <div id="main-interface" class="min-h-screen bg-slate-900">
                <!-- Header principal -->
                <header class="fixed top-0 left-0 right-0 z-30 bg-slate-800 bg-opacity-95 backdrop-blur-sm border-b border-blue-500 border-opacity-30">
                    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div class="flex justify-between items-center h-16">
                            <div class="flex items-center space-x-8">
                                <div class="flex items-center space-x-3">
                                    <div class="w-10 h-10 rounded-full border-2 border-blue-500 flex items-center justify-center">
                                        <i class="fas fa-building text-blue-400"></i>
                                    </div>
                                    <div>
                                        <h1 class="text-lg font-bold text-white">CondoconnectAI</h1>
                                        <p class="text-xs text-blue-300" id="tenant-name">Sistema de Gestión</p>
                                    </div>
                                </div>
                                
                                <!-- Navegación de módulos -->
                                <nav class="hidden md:flex space-x-6" id="module-navigation">
                                    <!-- Módulos dinámicos -->
                                </nav>
                            </div>

                            <div class="flex items-center space-x-4">
                                <!-- Notificaciones -->
                                <button id="notifications-button" class="relative p-2 text-gray-300 hover:text-white transition-colors">
                                    <i class="fas fa-bell text-xl"></i>
                                    <span id="notifications-badge" class="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold hidden">0</span>
                                </button>

                                <!-- Usuario -->
                                <div class="flex items-center space-x-3">
                                    <div class="text-right">
                                        <p class="text-sm font-medium text-white" id="user-name">Usuario</p>
                                        <p class="text-xs text-blue-300" id="user-role">Rol</p>
                                    </div>
                                    <div class="relative">
                                        <button id="user-menu-button" class="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                                            <i class="fas fa-user text-white text-sm"></i>
                                        </button>
                                        <!-- Menú de usuario -->
                                        <div id="user-menu" class="absolute right-0 mt-2 w-48 bg-slate-800 rounded-lg shadow-lg border border-blue-500 border-opacity-30 hidden">
                                            <div class="py-1">
                                                <a href="#" id="profile-link" class="block px-4 py-2 text-sm text-gray-300 hover:bg-slate-700">
                                                    <i class="fas fa-user mr-2"></i>Perfil
                                                </a>
                                                <a href="#" id="settings-link" class="block px-4 py-2 text-sm text-gray-300 hover:bg-slate-700">
                                                    <i class="fas fa-cog mr-2"></i>Configuración
                                                </a>
                                                <hr class="border-gray-700 my-1">
                                                <a href="#" id="logout-link" class="block px-4 py-2 text-sm text-gray-300 hover:bg-slate-700">
                                                    <i class="fas fa-sign-out-alt mr-2"></i>Cerrar Sesión
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                <!-- Contenedor de módulos -->
                <main class="pt-16">
                    <div id="module-container" class="min-h-screen">
                        <!-- Módulos se cargan aquí dinámicamente -->
                    </div>
                </main>

                <!-- Loading overlay -->
                <div id="loading-overlay" class="fixed inset-0 bg-slate-900 bg-opacity-75 flex items-center justify-center z-50 hidden">
                    <div class="text-center">
                        <div class="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p class="text-white" id="loading-text">Cargando...</p>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Configurar eventos del login
     */
    setupLoginEvents() {
        const loginForm = document.getElementById('login-form');
        const loginButton = document.getElementById('login-button');
        const loginButtonText = document.getElementById('login-button-text');
        const loginSpinner = document.getElementById('login-spinner');

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;

            // Mostrar loading
            loginButton.disabled = true;
            loginButtonText.textContent = 'Iniciando...';
            loginSpinner.classList.remove('hidden');

            try {
                const result = await this.auth.signIn(email, password);
                
                if (result.success) {
                    // Login exitoso - el evento authStateChange manejará el resto
                } else if (result.requiresMFA) {
                    // Manejar MFA
                    this.showMFADialog(result.user);
                } else {
                    this.showError('Error de autenticación', result.error);
                }
            } catch (error) {
                this.showError('Error de conexión', error.message);
            } finally {
                // Restaurar botón
                loginButton.disabled = false;
                loginButtonText.textContent = 'Iniciar Sesión';
                loginSpinner.classList.add('hidden');
            }
        });

        // Enlace de contraseña olvidada
        document.getElementById('forgot-password-link').addEventListener('click', (e) => {
            e.preventDefault();
            this.showForgotPasswordDialog();
        });
    }

    /**
     * Configurar eventos de la interfaz principal
     */
    setupMainInterfaceEvents() {
        // Menú de usuario
        const userMenuButton = document.getElementById('user-menu-button');
        const userMenu = document.getElementById('user-menu');

        userMenuButton.addEventListener('click', () => {
            userMenu.classList.toggle('hidden');
        });

        // Cerrar menú al hacer clic fuera
        document.addEventListener('click', (e) => {
            if (!userMenuButton.contains(e.target) && !userMenu.contains(e.target)) {
                userMenu.classList.add('hidden');
            }
        });

        // Logout
        document.getElementById('logout-link').addEventListener('click', async (e) => {
            e.preventDefault();
            await this.auth.signOut();
        });

        // Cargar navegación de módulos
        this.loadModuleNavigation();

        // Actualizar información del usuario
        this.updateUserInfo();
    }

    /**
     * Cargar navegación de módulos
     */
    loadModuleNavigation() {
        const navigation = document.getElementById('module-navigation');
        const modules = this.config.getConfig('modules');
        
        navigation.innerHTML = '';

        Object.entries(modules).forEach(([key, module]) => {
            if (this.hasModuleAccess(key)) {
                const link = document.createElement('a');
                link.href = `#${key}`;
                link.className = 'nav-link text-gray-300 hover:text-white transition-colors';
                link.innerHTML = `<i class="${module.icon} mr-2"></i>${module.name}`;
                navigation.appendChild(link);
            }
        });
    }

    /**
     * Actualizar información del usuario
     */
    updateUserInfo() {
        const user = this.state.user;
        const tenant = this.state.tenant;

        if (user) {
            const userName = this.utils.getUserDisplayName(user);
            const userRole = this.utils.getUserRole(user);

            document.getElementById('user-name').textContent = userName;
            document.getElementById('user-role').textContent = userRole;
        }

        if (tenant) {
            document.getElementById('tenant-name').textContent = tenant.name;
        }
    }

    /**
     * Mostrar loading
     */
    showLoading(text = 'Cargando...') {
        const overlay = document.getElementById('loading-overlay');
        const loadingText = document.getElementById('loading-text');
        
        if (overlay && loadingText) {
            loadingText.textContent = text;
            overlay.classList.remove('hidden');
        }
    }

    /**
     * Ocultar loading
     */
    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
        }
    }

    /**
     * Mostrar error
     */
    showError(title, message) {
        if (this.notifications) {
            this.notifications.show(`${title}: ${message}`, 'error');
        } else {
            alert(`${title}: ${message}`);
        }
    }

    /**
     * Inicializar tema
     */
    initializeTheme() {
        const savedTheme = localStorage.getItem('condoconnect_theme') || 'dark';
        this.state.theme = savedTheme;
        document.documentElement.setAttribute('data-theme', savedTheme);
    }

    /**
     * Inicializar tooltips
     */
    initializeTooltips() {
        // Implementar tooltips si es necesario
    }

    /**
     * Inicializar modales
     */
    initializeModals() {
        // Implementar sistema de modales si es necesario
    }

    /**
     * Inicializar componentes de UI
     */
    initializeUIComponents() {
        // Implementar componentes adicionales si es necesario
    }

    /**
     * Manejar errores globales
     */
    handleGlobalError(event) {
        console.error('❌ Error global:', event.error);
        
        if (!this.config.getConfig('env.debug')) {
            event.preventDefault();
        }
    }

    /**
     * Manejar promesas rechazadas
     */
    handleUnhandledRejection(event) {
        console.error('❌ Promesa rechazada:', event.reason);
        
        if (!this.config.getConfig('env.debug')) {
            event.preventDefault();
        }
    }

    /**
     * Manejar cambios de conectividad
     */
    handleConnectivityChange(isOnline) {
        if (isOnline) {
            this.notifications.show('Conexión restaurada', 'success');
        } else {
            this.notifications.show('Sin conexión a internet', 'warning');
        }
    }

    /**
     * Manejar cambios de tamaño de ventana
     */
    handleWindowResize() {
        // Implementar lógica de responsive si es necesario
    }

    /**
     * Manejar atajos de teclado
     */
    handleKeyboardShortcuts(event) {
        // Ctrl/Cmd + K para búsqueda rápida
        if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
            event.preventDefault();
            this.showQuickSearch();
        }

        // Escape para cerrar modales
        if (event.key === 'Escape') {
            this.closeModals();
        }
    }

    /**
     * Manejar antes de cerrar ventana
     */
    handleBeforeUnload(event) {
        // Verificar si hay cambios sin guardar
        if (this.hasUnsavedChanges()) {
            event.preventDefault();
            event.returnValue = '';
        }
    }

    /**
     * Emitir evento personalizado
     */
    emit(eventName, data = null) {
        const event = new CustomEvent(eventName, { detail: data });
        document.dispatchEvent(event);
    }

    /**
     * Métodos de utilidad
     */
    showQuickSearch() {
        // Implementar búsqueda rápida
        console.log('🔍 Búsqueda rápida');
    }

    closeModals() {
        // Cerrar todos los modales abiertos
        const modals = document.querySelectorAll('.modal:not(.hidden)');
        modals.forEach(modal => modal.classList.add('hidden'));
    }

    hasUnsavedChanges() {
        // Verificar cambios sin guardar
        return false;
    }

    showMFADialog(user) {
        // Implementar diálogo MFA
        console.log('🔐 MFA requerido');
    }

    showForgotPasswordDialog() {
        // Implementar diálogo de contraseña olvidada
        console.log('🔑 Recuperar contraseña');
    }

    navigateToSection(section) {
        // Navegar a sección específica dentro del módulo
        if (window.showSection && typeof window.showSection === 'function') {
            window.showSection(section);
        }
    }

    updateNavigationState(module, section) {
        // Actualizar estado visual de navegación
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.classList.remove('text-blue-300');
            link.classList.add('text-gray-300');
        });

        const activeLink = document.querySelector(`[href="#${module}"]`);
        if (activeLink) {
            activeLink.classList.remove('text-gray-300');
            activeLink.classList.add('text-blue-300');
        }
    }
}

// Inicializar aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.CondoconnectApp = new CondoconnectApp();
});

console.log('🚀 Aplicación principal CondoconnectAI cargada');
