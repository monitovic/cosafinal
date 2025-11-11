/**
 * CondoconnectAI - Utilidades
 * Funciones de utilidad y helpers para toda la aplicación
 */

class CondoconnectUtils {
    constructor() {
        this.config = window.CondoconnectConfig;
    }

    /**
     * FORMATEO Y VALIDACIÓN
     */

    // Formatear moneda
    formatCurrency(amount, currency = 'MXN', locale = 'es-MX') {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(amount);
    }

    // Formatear número
    formatNumber(number, locale = 'es-MX') {
        return new Intl.NumberFormat(locale).format(number);
    }

    // Formatear fecha
    formatDate(date, options = {}) {
        const defaultOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        };
        
        const formatOptions = { ...defaultOptions, ...options };
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        
        return dateObj.toLocaleDateString('es-MX', formatOptions);
    }

    // Formatear fecha y hora
    formatDateTime(date, options = {}) {
        const defaultOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        
        const formatOptions = { ...defaultOptions, ...options };
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        
        return dateObj.toLocaleDateString('es-MX', formatOptions);
    }

    // Formatear fecha relativa (hace X tiempo)
    formatRelativeTime(date) {
        const now = new Date();
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        const diffInSeconds = Math.floor((now - dateObj) / 1000);

        const intervals = {
            año: 31536000,
            mes: 2592000,
            semana: 604800,
            día: 86400,
            hora: 3600,
            minuto: 60
        };

        for (const [unit, seconds] of Object.entries(intervals)) {
            const interval = Math.floor(diffInSeconds / seconds);
            if (interval >= 1) {
                return `Hace ${interval} ${unit}${interval > 1 ? (unit === 'mes' ? 'es' : 's') : ''}`;
            }
        }

        return 'Hace un momento';
    }

    // Validar email
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Validar teléfono mexicano
    validatePhone(phone) {
        const phoneRegex = /^(\+52\s?)?(\d{2}\s?\d{4}\s?\d{4}|\d{10})$/;
        return phoneRegex.test(phone.replace(/\s/g, ''));
    }

    // Validar contraseña
    validatePassword(password) {
        const config = this.config.getConfig('security.password');
        const errors = [];

        if (password.length < config.minLength) {
            errors.push(`Mínimo ${config.minLength} caracteres`);
        }

        if (config.requireUppercase && !/[A-Z]/.test(password)) {
            errors.push('Debe contener al menos una mayúscula');
        }

        if (config.requireLowercase && !/[a-z]/.test(password)) {
            errors.push('Debe contener al menos una minúscula');
        }

        if (config.requireNumbers && !/\d/.test(password)) {
            errors.push('Debe contener al menos un número');
        }

        if (config.requireSymbols && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
            errors.push('Debe contener al menos un símbolo');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * MANIPULACIÓN DE STRINGS
     */

    // Capitalizar primera letra
    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    // Convertir a título
    toTitleCase(str) {
        return str.replace(/\w\S*/g, (txt) => 
            txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        );
    }

    // Generar slug
    generateSlug(str) {
        return str
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remover acentos
            .replace(/[^a-z0-9\s-]/g, '') // Remover caracteres especiales
            .replace(/\s+/g, '-') // Reemplazar espacios con guiones
            .replace(/-+/g, '-') // Remover guiones múltiples
            .trim('-'); // Remover guiones al inicio/final
    }

    // Truncar texto
    truncate(str, length = 100, suffix = '...') {
        if (str.length <= length) return str;
        return str.substring(0, length).trim() + suffix;
    }

    // Escapar HTML
    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /**
     * MANIPULACIÓN DE ARRAYS Y OBJETOS
     */

    // Agrupar array por propiedad
    groupBy(array, key) {
        return array.reduce((groups, item) => {
            const group = item[key];
            groups[group] = groups[group] || [];
            groups[group].push(item);
            return groups;
        }, {});
    }

    // Ordenar array por múltiples criterios
    sortBy(array, ...criteria) {
        return array.sort((a, b) => {
            for (const criterion of criteria) {
                let aVal, bVal, desc = false;
                
                if (typeof criterion === 'string') {
                    aVal = a[criterion];
                    bVal = b[criterion];
                } else if (typeof criterion === 'function') {
                    aVal = criterion(a);
                    bVal = criterion(b);
                } else if (criterion.key) {
                    aVal = a[criterion.key];
                    bVal = b[criterion.key];
                    desc = criterion.desc || false;
                }

                if (aVal < bVal) return desc ? 1 : -1;
                if (aVal > bVal) return desc ? -1 : 1;
            }
            return 0;
        });
    }

    // Filtrar array por múltiples criterios
    filterBy(array, filters) {
        return array.filter(item => {
            return Object.entries(filters).every(([key, value]) => {
                if (value === null || value === undefined || value === '') return true;
                
                const itemValue = item[key];
                
                if (Array.isArray(value)) {
                    return value.includes(itemValue);
                }
                
                if (typeof value === 'string') {
                    return itemValue.toString().toLowerCase().includes(value.toLowerCase());
                }
                
                return itemValue === value;
            });
        });
    }

    // Clonar objeto profundo
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (typeof obj === 'object') {
            const clonedObj = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    clonedObj[key] = this.deepClone(obj[key]);
                }
            }
            return clonedObj;
        }
    }

    // Fusionar objetos profundo
    deepMerge(target, ...sources) {
        if (!sources.length) return target;
        const source = sources.shift();

        if (this.isObject(target) && this.isObject(source)) {
            for (const key in source) {
                if (this.isObject(source[key])) {
                    if (!target[key]) Object.assign(target, { [key]: {} });
                    this.deepMerge(target[key], source[key]);
                } else {
                    Object.assign(target, { [key]: source[key] });
                }
            }
        }

        return this.deepMerge(target, ...sources);
    }

    // Verificar si es objeto
    isObject(item) {
        return item && typeof item === 'object' && !Array.isArray(item);
    }

    /**
     * UTILIDADES DE DOM
     */

    // Crear elemento con atributos
    createElement(tag, attributes = {}, children = []) {
        const element = document.createElement(tag);
        
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'innerHTML') {
                element.innerHTML = value;
            } else if (key === 'textContent') {
                element.textContent = value;
            } else {
                element.setAttribute(key, value);
            }
        });

        children.forEach(child => {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else {
                element.appendChild(child);
            }
        });

        return element;
    }

    // Encontrar elemento padre con clase
    findParentWithClass(element, className) {
        let parent = element.parentElement;
        while (parent && !parent.classList.contains(className)) {
            parent = parent.parentElement;
        }
        return parent;
    }

    // Animar elemento
    animate(element, keyframes, options = {}) {
        const defaultOptions = {
            duration: 300,
            easing: 'ease-in-out',
            fill: 'forwards'
        };
        
        const animationOptions = { ...defaultOptions, ...options };
        return element.animate(keyframes, animationOptions);
    }

    /**
     * UTILIDADES DE EVENTOS
     */

    // Debounce
    debounce(func, wait, immediate = false) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func(...args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func(...args);
        };
    }

    // Throttle
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * UTILIDADES DE ARCHIVOS
     */

    // Formatear tamaño de archivo
    formatFileSize(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    // Validar tipo de archivo
    validateFileType(file, allowedTypes) {
        const fileExtension = file.name.split('.').pop().toLowerCase();
        return allowedTypes.includes(fileExtension);
    }

    // Validar tamaño de archivo
    validateFileSize(file, maxSize) {
        return file.size <= maxSize;
    }

    // Leer archivo como Data URL
    readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /**
     * UTILIDADES DE USUARIO
     */

    // Obtener nombre para mostrar del usuario
    getUserDisplayName(user) {
        if (!user) return 'Usuario';
        
        if (user.attributes) {
            return user.attributes.name || 
                   user.attributes.given_name || 
                   user.attributes.email || 
                   user.username || 
                   'Usuario';
        }
        
        return user.name || user.email || user.username || 'Usuario';
    }

    // Obtener rol del usuario
    getUserRole(user) {
        if (!user) return 'Usuario';
        
        if (user.attributes && user.attributes.role) {
            const roles = {
                'admin': 'Administrador',
                'manager': 'Gerente',
                'user': 'Usuario',
                'resident': 'Residente',
                'security': 'Seguridad',
                'maintenance': 'Mantenimiento'
            };
            return roles[user.attributes.role] || user.attributes.role;
        }
        
        return 'Usuario';
    }

    // Obtener iniciales del usuario
    getUserInitials(user) {
        const name = this.getUserDisplayName(user);
        return name.split(' ')
                  .map(word => word.charAt(0))
                  .join('')
                  .toUpperCase()
                  .substring(0, 2);
    }

    /**
     * UTILIDADES DE URL Y NAVEGACIÓN
     */

    // Obtener parámetros de URL
    getUrlParams() {
        const params = new URLSearchParams(window.location.search);
        const result = {};
        for (const [key, value] of params) {
            result[key] = value;
        }
        return result;
    }

    // Actualizar parámetros de URL
    updateUrlParams(params) {
        const url = new URL(window.location);
        Object.entries(params).forEach(([key, value]) => {
            if (value === null || value === undefined) {
                url.searchParams.delete(key);
            } else {
                url.searchParams.set(key, value);
            }
        });
        window.history.replaceState({}, '', url);
    }

    // Generar URL de descarga
    generateDownloadUrl(data, filename, type = 'application/json') {
        const blob = new Blob([data], { type });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * UTILIDADES DE ALMACENAMIENTO
     */

    // Guardar en localStorage con expiración
    setLocalStorage(key, value, expirationMinutes = null) {
        const item = {
            value: value,
            timestamp: Date.now(),
            expiration: expirationMinutes ? Date.now() + (expirationMinutes * 60 * 1000) : null
        };
        localStorage.setItem(key, JSON.stringify(item));
    }

    // Obtener de localStorage con verificación de expiración
    getLocalStorage(key) {
        try {
            const itemStr = localStorage.getItem(key);
            if (!itemStr) return null;

            const item = JSON.parse(itemStr);
            
            if (item.expiration && Date.now() > item.expiration) {
                localStorage.removeItem(key);
                return null;
            }
            
            return item.value;
        } catch (error) {
            console.error('Error leyendo localStorage:', error);
            return null;
        }
    }

    // Limpiar localStorage expirado
    cleanExpiredLocalStorage() {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            this.getLocalStorage(key); // Esto eliminará automáticamente los expirados
        });
    }

    /**
     * UTILIDADES DE RENDIMIENTO
     */

    // Medir tiempo de ejecución
    measureTime(name, func) {
        const start = performance.now();
        const result = func();
        const end = performance.now();
        console.log(`⏱️ ${name}: ${(end - start).toFixed(2)}ms`);
        return result;
    }

    // Lazy loading de imágenes
    lazyLoadImages(selector = 'img[data-src]') {
        const images = document.querySelectorAll(selector);
        
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazy');
                    observer.unobserve(img);
                }
            });
        });

                images.forEach(img => imageObserver.observe(img));
    }

    /**
     * UTILIDADES DE VALIDACIÓN Y SANITIZACIÓN
     */

    // Sanitizar entrada de usuario
    sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        
        return input
            .trim()
            .replace(/[<>]/g, '') // Remover < y >
            .replace(/javascript:/gi, '') // Remover javascript:
            .replace(/on\w+=/gi, ''); // Remover eventos onclick, onload, etc.
    }

    // Validar CURP mexicano
    validateCURP(curp) {
        const curpRegex = /^[A-Z]{1}[AEIOU]{1}[A-Z]{2}[0-9]{2}(0[1-9]|1[0-2])(0[1-9]|1[0-9]|2[0-9]|3[0-1])[HM]{1}(AS|BC|BS|CC|CS|CH|CL|CM|DF|DG|GT|GR|HG|JC|MC|MN|MS|NT|NL|OC|PL|QT|QR|SP|SL|SR|TC|TS|TL|VZ|YN|ZS|NE)[B-DF-HJ-NP-TV-Z]{3}[0-9A-Z]{1}$/;
        return curpRegex.test(curp);
    }

    // Validar RFC mexicano
    validateRFC(rfc) {
        const rfcRegex = /^[A-ZÑ&]{3,4}[0-9]{2}(0[1-9]|1[0-2])(0[1-9]|1[0-9]|2[0-9]|3[0-1])[A-Z0-9]{2}[0-9A]$/;
        return rfcRegex.test(rfc);
    }

    /**
     * UTILIDADES DE GEOLOCALIZACIÓN
     */

    // Obtener ubicación actual
    getCurrentLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocalización no soportada'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                position => resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy
                }),
                error => reject(error),
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 300000 // 5 minutos
                }
            );
        });
    }

    // Calcular distancia entre dos puntos
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Radio de la Tierra en km
        const dLat = this.toRadians(lat2 - lat1);
        const dLon = this.toRadians(lon2 - lon1);
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c; // Distancia en km
    }

    // Convertir grados a radianes
    toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }

    /**
     * UTILIDADES DE COLORES
     */

    // Generar color aleatorio
    generateRandomColor() {
        return '#' + Math.floor(Math.random()*16777215).toString(16);
    }

    // Convertir hex a RGB
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    // Convertir RGB a hex
    rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    // Obtener color de contraste
    getContrastColor(hexColor) {
        const rgb = this.hexToRgb(hexColor);
        if (!rgb) return '#000000';
        
        const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
        return brightness > 128 ? '#000000' : '#ffffff';
    }

    /**
     * UTILIDADES DE CRIPTOGRAFÍA
     */

    // Generar hash simple
    generateHash(str) {
        let hash = 0;
        if (str.length === 0) return hash;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convertir a 32bit integer
        }
        return Math.abs(hash).toString(36);
    }

    // Generar UUID v4
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    // Generar ID corto
    generateShortId(length = 8) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    /**
     * UTILIDADES DE DISPOSITIVO
     */

    // Detectar tipo de dispositivo
    getDeviceType() {
        const userAgent = navigator.userAgent;
        
        if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
            return 'tablet';
        }
        if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(userAgent)) {
            return 'mobile';
        }
        return 'desktop';
    }

    // Detectar sistema operativo
    getOperatingSystem() {
        const userAgent = navigator.userAgent;
        
        if (userAgent.indexOf('Win') !== -1) return 'Windows';
        if (userAgent.indexOf('Mac') !== -1) return 'MacOS';
        if (userAgent.indexOf('Linux') !== -1) return 'Linux';
        if (userAgent.indexOf('Android') !== -1) return 'Android';
        if (userAgent.indexOf('like Mac') !== -1) return 'iOS';
        
        return 'Unknown';
    }

    // Detectar navegador
    getBrowser() {
        const userAgent = navigator.userAgent;
        
        if (userAgent.indexOf('Chrome') !== -1) return 'Chrome';
        if (userAgent.indexOf('Firefox') !== -1) return 'Firefox';
        if (userAgent.indexOf('Safari') !== -1) return 'Safari';
        if (userAgent.indexOf('Edge') !== -1) return 'Edge';
        if (userAgent.indexOf('Opera') !== -1) return 'Opera';
        
        return 'Unknown';
    }

    // Verificar soporte de características
    supportsFeature(feature) {
        const features = {
            localStorage: () => {
                try {
                    localStorage.setItem('test', 'test');
                    localStorage.removeItem('test');
                    return true;
                } catch (e) {
                    return false;
                }
            },
            geolocation: () => 'geolocation' in navigator,
            webgl: () => {
                try {
                    const canvas = document.createElement('canvas');
                    return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
                } catch (e) {
                    return false;
                }
            },
            webworkers: () => typeof Worker !== 'undefined',
            websockets: () => 'WebSocket' in window,
            notifications: () => 'Notification' in window,
            camera: () => 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices
        };

        return features[feature] ? features[feature]() : false;
    }

    /**
     * UTILIDADES DE RENDIMIENTO Y OPTIMIZACIÓN
     */

    // Crear pool de objetos para reutilización
    createObjectPool(createFn, resetFn, initialSize = 10) {
        const pool = [];
        
        // Llenar pool inicial
        for (let i = 0; i < initialSize; i++) {
            pool.push(createFn());
        }

        return {
            get() {
                return pool.length > 0 ? pool.pop() : createFn();
            },
            release(obj) {
                resetFn(obj);
                pool.push(obj);
            },
            size() {
                return pool.length;
            }
        };
    }

    // Memoización de funciones
    memoize(fn, keyGenerator = (...args) => JSON.stringify(args)) {
        const cache = new Map();
        
        return function(...args) {
            const key = keyGenerator(...args);
            
            if (cache.has(key)) {
                return cache.get(key);
            }
            
            const result = fn.apply(this, args);
            cache.set(key, result);
            return result;
        };
    }

    // Batch de operaciones
    createBatcher(batchFn, delay = 100, maxSize = 50) {
        let batch = [];
        let timeoutId = null;

        const processBatch = () => {
            if (batch.length > 0) {
                batchFn([...batch]);
                batch = [];
            }
            timeoutId = null;
        };

        return (item) => {
            batch.push(item);

            if (batch.length >= maxSize) {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                    timeoutId = null;
                }
                processBatch();
            } else if (!timeoutId) {
                timeoutId = setTimeout(processBatch, delay);
            }
        };
    }

    /**
     * UTILIDADES DE TESTING Y DEBUG
     */

    // Logger con niveles
    createLogger(name, level = 'info') {
        const levels = {
            debug: 0,
            info: 1,
            warn: 2,
            error: 3
        };

        const currentLevel = levels[level] || 1;

        return {
            debug: (...args) => {
                if (currentLevel <= 0) console.log(`🐛 [${name}]`, ...args);
            },
            info: (...args) => {
                if (currentLevel <= 1) console.log(`ℹ️ [${name}]`, ...args);
            },
            warn: (...args) => {
                if (currentLevel <= 2) console.warn(`⚠️ [${name}]`, ...args);
            },
            error: (...args) => {
                if (currentLevel <= 3) console.error(`❌ [${name}]`, ...args);
            }
        };
    }

    // Profiler simple
    createProfiler() {
        const marks = new Map();

        return {
            start(name) {
                marks.set(name, performance.now());
            },
            end(name) {
                const start = marks.get(name);
                if (start) {
                    const duration = performance.now() - start;
                    console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`);
                    marks.delete(name);
                    return duration;
                }
                return null;
            },
            clear() {
                marks.clear();
            }
        };
    }

    /**
     * UTILIDADES DE ACCESIBILIDAD
     */

    // Anunciar a lectores de pantalla
    announceToScreenReader(message) {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = message;
        
        document.body.appendChild(announcement);
        
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }

    // Verificar contraste de colores
    checkColorContrast(foreground, background) {
        const getLuminance = (color) => {
            const rgb = this.hexToRgb(color);
            if (!rgb) return 0;
            
            const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => {
                c = c / 255;
                return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
            });
            
            return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };

        const l1 = getLuminance(foreground);
        const l2 = getLuminance(background);
        const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

        return {
            ratio: ratio,
            aa: ratio >= 4.5,
            aaa: ratio >= 7
        };
    }

    /**
     * UTILIDADES ESPECÍFICAS DE CONDOCONNECT
     */

    // Formatear número de unidad
    formatUnitNumber(unit) {
        if (typeof unit === 'number') {
            return unit.toString().padStart(3, '0');
        }
        return unit.toString();
    }

    // Generar código de residente
    generateResidentCode(name, unit) {
        const nameCode = name.split(' ')
                             .map(word => word.charAt(0))
                             .join('')
                             .toUpperCase()
                             .substring(0, 2);
        const unitCode = this.formatUnitNumber(unit);
        const randomCode = Math.floor(Math.random() * 100).toString().padStart(2, '0');
        
        return `${nameCode}${unitCode}${randomCode}`;
    }

    // Calcular cuota de mantenimiento
    calculateMaintenanceFee(unitType, area, baseRate = 15) {
        const typeMultipliers = {
            apartment: 1.0,
            penthouse: 1.5,
            parking: 0.3,
            storage: 0.2,
            commercial: 1.2
        };

        const multiplier = typeMultipliers[unitType] || 1.0;
        return Math.round(area * baseRate * multiplier);
    }

    // Generar reporte de estado
    generateStatusReport(data, type = 'general') {
        const report = {
            timestamp: new Date().toISOString(),
            type: type,
            summary: {},
            details: data
        };

        // Generar resumen basado en el tipo
        switch (type) {
            case 'payments':
                report.summary = {
                    total: data.length,
                    paid: data.filter(p => p.status === 'paid').length,
                    pending: data.filter(p => p.status === 'pending').length,
                    overdue: data.filter(p => p.status === 'overdue').length
                };
                break;
            case 'maintenance':
                report.summary = {
                    total: data.length,
                    completed: data.filter(m => m.status === 'completed').length,
                    inProgress: data.filter(m => m.status === 'in-progress').length,
                    pending: data.filter(m => m.status === 'pending').length
                };
                break;
            default:
                report.summary = { total: data.length };
        }

        return report;
    }
}

// Sistema de notificaciones
class CondoconnectNotifications {
    constructor() {
        this.container = null;
        this.notifications = [];
        this.maxNotifications = 5;
        this.defaultDuration = 3000;
        
        this.init();
    }

    init() {
        this.createContainer();
    }

    createContainer() {
        this.container = document.createElement('div');
        this.container.id = 'notifications-container';
        this.container.className = 'fixed top-4 right-4 z-50 space-y-2';
        document.body.appendChild(this.container);
    }

    show(message, type = 'info', duration = null) {
        const notification = this.createNotification(message, type, duration);
        this.addNotification(notification);
        return notification.id;
    }

    createNotification(message, type, duration) {
        const id = Date.now().toString();
        const notification = {
            id: id,
            message: message,
            type: type,
            duration: duration || this.defaultDuration,
            element: null
        };

        const typeConfig = {
            success: { icon: 'fas fa-check-circle', color: 'green' },
            error: { icon: 'fas fa-exclamation-circle', color: 'red' },
            warning: { icon: 'fas fa-exclamation-triangle', color: 'yellow' },
            info: { icon: 'fas fa-info-circle', color: 'blue' }
        };

        const config = typeConfig[type] || typeConfig.info;

        notification.element = document.createElement('div');
        notification.element.className = `notification bg-slate-800 border border-${config.color}-500 border-opacity-30 rounded-lg p-4 shadow-lg transform transition-all duration-300 translate-x-full opacity-0`;
        notification.element.innerHTML = `
            <div class="flex items-center space-x-3">
                <i class="${config.icon} text-${config.color}-400"></i>
                <div class="flex-1">
                    <p class="text-white text-sm font-medium">${message}</p>
                </div>
                <button class="text-gray-400 hover:text-white" onclick="window.CondoconnectNotifications.hide('${id}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        return notification;
    }

    addNotification(notification) {
        // Limitar número de notificaciones
        if (this.notifications.length >= this.maxNotifications) {
            this.hide(this.notifications[0].id);
        }

        this.notifications.push(notification);
        this.container.appendChild(notification.element);

        // Animar entrada
        setTimeout(() => {
            notification.element.classList.remove('translate-x-full', 'opacity-0');
        }, 10);

        // Auto-hide
        if (notification.duration > 0) {
            setTimeout(() => {
                this.hide(notification.id);
            }, notification.duration);
        }
    }

    hide(id) {
        const index = this.notifications.findIndex(n => n.id === id);
        if (index === -1) return;

        const notification = this.notifications[index];
        
        // Animar salida
        notification.element.classList.add('translate-x-full', 'opacity-0');
        
        setTimeout(() => {
            if (notification.element.parentNode) {
                notification.element.parentNode.removeChild(notification.element);
            }
            this.notifications.splice(index, 1);
        }, 300);
    }

    clear() {
        this.notifications.forEach(notification => {
            this.hide(notification.id);
        });
    }
}

// Inicializar utilidades
const condoconnectUtils = new CondoconnectUtils();
const condoconnectNotifications = new CondoconnectNotifications();

// Exportar para uso global
window.CondoconnectUtils = condoconnectUtils;
window.CondoconnectNotifications = condoconnectNotifications;

console.log('🛠️ Utilidades CondoconnectAI cargadas');

