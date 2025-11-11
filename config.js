/**
 * CondoconnectAI - Configuración Global
 * Archivo de configuración principal del sistema
 */

// Configuración AWS
const AWS_CONFIG = {
    // Región principal
    region: 'us-east-1',
    
    // Cognito User Pool (se actualizará cuando esté listo)
    userPoolId: 'us-east-1_XXXXXXXXX',
    userPoolWebClientId: 'XXXXXXXXXXXXXXXXXXXXXXXXXX',
    
    // Cognito Identity Pool (se actualizará cuando esté listo)
    identityPoolId: 'us-east-1:12345678-1234-1234-1234-123456789012',
    
    // API Gateway
    apiGatewayUrl: 'https://api.condoconnectai.com',
    
    // DynamoDB Tables
    tables: {
        licenses: 'condoconnectai-licenses',
        tenants: 'condoconnectai-tenants',
        users: 'condoconnectai-users',
        permissions: 'condoconnectai-permissions',
        residents: 'condoconnectai-residents',
        payments: 'condoconnectai-payments',
        maintenance: 'condoconnectai-maintenance',
        communications: 'condoconnectai-communications',
        properties: 'condoconnectai-properties',
        clients: 'condoconnectai-clients',
        sales: 'condoconnectai-sales',
        security_logs: 'condoconnectai-security-logs',
        access_control: 'condoconnectai-access-control',
        visitors: 'condoconnectai-visitors',
        incidents: 'condoconnectai-incidents'
    },
    
    // S3 Buckets
    buckets: {
        storage: 'condoconnectai-storage-us-east-1',
        assets: 'condoconnectai-assets',
        documents: 'condoconnectai-documents',
        images: 'condoconnectai-images'
    }
};

// Configuración de la aplicación
const APP_CONFIG = {
    // Información básica
    name: 'CondoconnectAI',
    version: '1.0.0',
    description: 'Sistema integral de gestión inmobiliaria con IA',
    
    // URLs y dominios
    domain: 'condoconnectai.com',
    subdomains: {
        app: 'app.condoconnectai.com',
        api: 'api.condoconnectai.com',
        cdn: 'cdn.condoconnectai.com'
    },
    
    // Módulos disponibles
    modules: {
        institucional: {
            name: 'Módulo Institucional',
            description: 'Gestión de condominios y residentes',
            icon: 'fas fa-building',
            color: 'blue',
            path: '/modules/institucional.html',
            features: [
                'Gestión de residentes',
                'Control de pagos',
                'Mantenimiento',
                'Comunicados',
                'Dashboard analítico'
            ]
        },
        seguridad: {
            name: 'Módulo Seguridad',
            description: 'Control de acceso y videovigilancia',
            icon: 'fas fa-shield-alt',
            color: 'red',
            path: '/modules/seguridad.html',
            features: [
                'Control de acceso',
                'Videovigilancia',
                'Gestión de visitantes',
                'Registro de incidentes',
                'Alertas en tiempo real'
            ]
        },
        propiedades: {
            name: 'Módulo Propiedades',
            description: 'Gestión inmobiliaria y ventas',
            icon: 'fas fa-home',
            color: 'green',
            path: '/modules/propiedades.html',
            features: [
                'Catálogo de propiedades',
                'Gestión de clientes',
                'Pipeline de ventas',
                'Marketing digital',
                'Reportes de rendimiento'
            ]
        }
    },
    
    // Configuración de UI
    ui: {
        theme: 'dark',
        primaryColor: '#3b82f6',
        secondaryColor: '#1e293b',
        accentColor: '#22c55e',
        
        // Animaciones
        animations: {
            duration: 300,
            easing: 'ease-in-out'
        },
        
        // Breakpoints responsivos
        breakpoints: {
            sm: '640px',
            md: '768px',
            lg: '1024px',
            xl: '1280px',
            '2xl': '1536px'
        }
    },
    
    // Configuración de notificaciones
    notifications: {
        position: 'top-right',
        duration: 3000,
        maxVisible: 5,
        types: {
            success: {
                icon: 'fas fa-check-circle',
                color: '#22c55e'
            },
            error: {
                icon: 'fas fa-exclamation-circle',
                color: '#ef4444'
            },
            warning: {
                icon: 'fas fa-exclamation-triangle',
                color: '#f59e0b'
            },
            info: {
                icon: 'fas fa-info-circle',
                color: '#3b82f6'
            }
        }
    },
    
    // Configuración de paginación
    pagination: {
        defaultPageSize: 20,
        pageSizeOptions: [10, 20, 50, 100],
        maxPages: 10
    },
    
    // Configuración de archivos
    files: {
        maxSize: 10 * 1024 * 1024, // 10MB
        allowedTypes: {
            images: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
            documents: ['pdf', 'doc', 'docx', 'xls', 'xlsx'],
            videos: ['mp4', 'avi', 'mov', 'wmv']
        }
    }
};

// Configuración de seguridad
const SECURITY_CONFIG = {
    // Configuración de sesión
    session: {
        timeout: 30 * 60 * 1000, // 30 minutos
        refreshThreshold: 5 * 60 * 1000, // 5 minutos antes de expirar
        maxConcurrentSessions: 3
    },
    
    // Configuración de contraseñas
    password: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSymbols: false,
        maxAttempts: 5,
        lockoutDuration: 15 * 60 * 1000 // 15 minutos
    },
    
    // Configuración MFA
    mfa: {
        enabled: true,
        methods: ['SMS', 'TOTP'],
        backupCodes: 10
    },
    
    // Headers de seguridad
    headers: {
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://unpkg.com; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; img-src 'self' data: https:; font-src 'self' https://cdnjs.cloudflare.com;",
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin'
    }
};

// Configuración de desarrollo/producción
const ENV_CONFIG = {
    development: {
        debug: true,
        logging: 'verbose',
        apiUrl: 'http://localhost:3000',
        mockData: true
    },
    staging: {
        debug: true,
        logging: 'info',
        apiUrl: 'https://staging-api.condoconnectai.com',
        mockData: false
    },
    production: {
        debug: false,
        logging: 'error',
        apiUrl: 'https://api.condoconnectai.com',
        mockData: false
    }
};

// Detectar entorno actual
const CURRENT_ENV = (() => {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'development';
    } else if (hostname.includes('staging')) {
        return 'staging';
    } else {
        return 'production';
    }
})();

// Configuración activa basada en el entorno
const ACTIVE_CONFIG = {
    ...APP_CONFIG,
    aws: AWS_CONFIG,
    security: SECURITY_CONFIG,
    env: ENV_CONFIG[CURRENT_ENV],
    currentEnv: CURRENT_ENV
};

// Función para obtener configuración
function getConfig(path = null) {
    if (!path) return ACTIVE_CONFIG;
    
    return path.split('.').reduce((config, key) => {
        return config && config[key] !== undefined ? config[key] : null;
    }, ACTIVE_CONFIG);
}

// Función para actualizar configuración AWS (cuando esté lista)
function updateAWSConfig(newConfig) {
    Object.assign(AWS_CONFIG, newConfig);
    
    // Reinicializar AWS SDK si está disponible
    if (window.AWS) {
        window.AWS.config.update({
            region: AWS_CONFIG.region,
            credentials: new window.AWS.CognitoIdentityCredentials({
                IdentityPoolId: AWS_CONFIG.identityPoolId
            })
        });
    }
    
    // Reinicializar Amplify si está disponible
    if (window.Amplify) {
        window.Amplify.configure({
            Auth: {
                region: AWS_CONFIG.region,
                userPoolId: AWS_CONFIG.userPoolId,
                userPoolWebClientId: AWS_CONFIG.userPoolWebClientId,
                identityPoolId: AWS_CONFIG.identityPoolId
            },
            API: {
                endpoints: [
                    {
                        name: 'condoconnectai',
                        endpoint: AWS_CONFIG.apiGatewayUrl
                    }
                ]
            },
            Storage: {
                AWSS3: {
                    bucket: AWS_CONFIG.buckets.storage,
                    region: AWS_CONFIG.region
                }
            }
        });
    }
    
    console.log('✅ Configuración AWS actualizada:', newConfig);
}

// Función para validar configuración
function validateConfig() {
    const required = [
        'aws.region',
        'aws.userPoolId',
        'aws.userPoolWebClientId',
        'aws.identityPoolId'
    ];
    
    const missing = required.filter(path => !getConfig(path));
    
    if (missing.length > 0) {
        console.warn('⚠️ Configuración AWS incompleta:', missing);
        return false;
    }
    
    console.log('✅ Configuración AWS válida');
    return true;
}

// Exportar configuraciones
if (typeof module !== 'undefined' && module.exports) {
    // Node.js
    module.exports = {
        AWS_CONFIG,
        APP_CONFIG,
        SECURITY_CONFIG,
        ENV_CONFIG,
        ACTIVE_CONFIG,
        getConfig,
        updateAWSConfig,
        validateConfig
    };
} else {
    // Browser
    window.CondoconnectConfig = {
        AWS_CONFIG,
        APP_CONFIG,
        SECURITY_CONFIG,
        ENV_CONFIG,
        ACTIVE_CONFIG,
        getConfig,
        updateAWSConfig,
        validateConfig
    };
}

// Log de inicialización
console.log(`🚀 CondoconnectAI Config cargado - Entorno: ${CURRENT_ENV}`);
