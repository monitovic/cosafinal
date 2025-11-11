class AndroidBridge {
    constructor() {
        this.isAndroid = window.Android !== undefined;
        this.callbacks = new Map();
        this.callbackId = 0;
    }

    initialize() {
        if (!this.isAndroid) return;
        
        // Configurar handler para recibir mensajes desde Android
        window.receiveFromAndroid = (message) => {
            this.handleAndroidMessage(JSON.parse(message));
        };
    }

    sendToAndroid(type, data) {
        if (!this.isAndroid) {
            return Promise.reject(new Error('Android bridge not available'));
        }

        return new Promise((resolve, reject) => {
            const callbackId = ++this.callbackId;
            
            this.callbacks.set(callbackId, { resolve, reject });
            
            const message = {
                type,
                data,
                callbackId
            };

            window.Android.receiveMessage(JSON.stringify(message));
            
            // Timeout después de 30 segundos
            setTimeout(() => {
                if (this.callbacks.has(callbackId)) {
                    this.callbacks.delete(callbackId);
                    reject(new Error('Android bridge timeout'));
                }
            }, 30000);
        });
    }

    handleAndroidMessage(message) {
        const { type, callbackId, result, error } = message;
        
        if (type === 'callback' && this.callbacks.has(callbackId)) {
            const callback = this.callbacks.get(callbackId);
            this.callbacks.delete(callbackId);
            
            if (error) {
                callback.reject(new Error(error));
            } else {
                callback.resolve(result);
            }
        }
    }

    // Métodos específicos para funcionalidades Android
    async requestBiometricAuth() {
        return this.sendToAndroid('biometric_auth', {});
    }

    async capturePhoto(options = {}) {
        return this.sendToAndroid('capture_photo', options);
    }

    async selectFromGallery(options = {}) {
        return this.sendToAndroid('select_gallery', options);
    }

    async storeSecurely(key, value) {
        return this.sendToAndroid('secure_storage_set', { key, value });
    }

    async retrieveSecurely(key) {
        return this.sendToAndroid('secure_storage_get', { key });
    }

    async showNotification(title, message, options = {}) {
        return this.sendToAndroid('show_notification', { title, message, ...options });
    }

    async vibrate(pattern = [100, 200, 100]) {
        return this.sendToAndroid('vibrate', { pattern });
    }

    async getDeviceInfo() {
        return this.sendToAndroid('device_info', {});
    }

    async checkPermissions(permissions) {
        return this.sendToAndroid('check_permissions', { permissions });
    }

    async requestPermissions(permissions) {
        return this.sendToAndroid('request_permissions', { permissions });
    }

    async openSettings() {
        return this.sendToAndroid('open_settings', {});
    }

    async shareContent(content, options = {}) {
        return this.sendToAndroid('share_content', { content, ...options });
    }

    async scanQRCode() {
        return this.sendToAndroid('scan_qr', {});
    }

    async generateQRCode(data) {
        return this.sendToAndroid('generate_qr', { data });
    }

    async playSound(soundId) {
        return this.sendToAndroid('play_sound', { soundId });
    }

    async setScreenBrightness(level) {
        return this.sendToAndroid('set_brightness', { level });
    }

    async keepScreenOn(enabled) {
        return this.sendToAndroid('keep_screen_on', { enabled });
    }

    async getNetworkInfo() {
        return this.sendToAndroid('network_info', {});
    }

    async getBatteryInfo() {
        return this.sendToAndroid('battery_info', {});
    }

    async getLocationInfo() {
        return this.sendToAndroid('location_info', {});
    }

    async openExternalApp(packageName, data = {}) {
        return this.sendToAndroid('open_external_app', { packageName, data });
    }

    async downloadFile(url, filename) {
        return this.sendToAndroid('download_file', { url, filename });
    }

    async uploadFile(filePath, endpoint) {
        return this.sendToAndroid('upload_file', { filePath, endpoint });
    }

    async compressImage(imagePath, quality = 80) {
        return this.sendToAndroid('compress_image', { imagePath, quality });
    }

    async resizeImage(imagePath, width, height) {
        return this.sendToAndroid('resize_image', { imagePath, width, height });
    }

    async encryptData(data, key) {
        return this.sendToAndroid('encrypt_data', { data, key });
    }

    async decryptData(encryptedData, key) {
        return this.sendToAndroid('decrypt_data', { encryptedData, key });
    }

    async generateHash(data, algorithm = 'SHA256') {
        return this.sendToAndroid('generate_hash', { data, algorithm });
    }

    async validateFingerprint() {
        return this.sendToAndroid('validate_fingerprint', {});
    }

    async validateFaceID() {
        return this.sendToAndroid('validate_face_id', {});
    }

    async getInstalledApps() {
        return this.sendToAndroid('get_installed_apps', {});
    }

    async isAppInstalled(packageName) {
        return this.sendToAndroid('is_app_installed', { packageName });
    }

    async getSystemInfo() {
        return this.sendToAndroid('system_info', {});
    }

    async clearCache() {
        return this.sendToAndroid('clear_cache', {});
    }

    async restartApp() {
        return this.sendToAndroid('restart_app', {});
    }
}

// Exportar para uso global
window.AndroidBridge = AndroidBridge;

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AndroidBridge;
}
