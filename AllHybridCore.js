// ============= BRIDGE-IOS.JS =============
class IOSBridge {
    constructor() {
        this.isIOS = window.webkit !== undefined;
        this.callbacks = new Map();
        this.callbackId = 0;
    }

    initialize() {
        if (!this.isIOS) return;
        
        // Configure handler to receive messages from iOS
        window.receiveFromIOS = (message) => {
            this.handleIOSMessage(message);
        };
    }

    sendToIOS(type, data) {
        if (!this.isIOS) {
            return Promise.reject(new Error('iOS bridge not available'));
        }

        return new Promise((resolve, reject) => {
            const callbackId = ++this.callbackId;
            
            this.callbacks.set(callbackId, { resolve, reject });
            
            const message = {
                type,
                data,
                callbackId
            };

            if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.condoconnectai) {
                window.webkit.messageHandlers.condoconnectai.postMessage(message);
            } else {
                reject(new Error('iOS message handler not available'));
            }
            
            // Timeout after 30 seconds
            setTimeout(() => {
                if (this.callbacks.has(callbackId)) {
                    this.callbacks.delete(callbackId);
                    reject(new Error('iOS bridge timeout'));
                }
            }, 30000);
        });
    }

    handleIOSMessage(message) {
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

    // iOS specific methods
    async requestBiometricAuth() {
        return this.sendToIOS('biometric_auth', {});
    }

    async capturePhoto(options = {}) {
        return this.sendToIOS('capture_photo', options);
    }

    async selectFromGallery(options = {}) {
        return this.sendToIOS('select_gallery', options);
    }

    async storeSecurely(key, value) {
        return this.sendToIOS('secure_storage_set', { key, value });
    }

    async retrieveSecurely(key) {
        return this.sendToIOS('secure_storage_get', { key });
    }

    async showNotification(title, message, options = {}) {
        return this.sendToIOS('show_notification', { title, message, ...options });
    }

    async hapticFeedback(type = 'impact') {
        return this.sendToIOS('haptic_feedback', { type });
    }

    async getDeviceInfo() {
        return this.sendToIOS('device_info', {});
    }

    async checkPermissions(permissions) {
        return this.sendToIOS('check_permissions', { permissions });
    }

    async requestPermissions(permissions) {
        return this.sendToIOS('request_permissions', { permissions });
    }

    async openSettings() {
        return this.sendToIOS('open_settings', {});
    }

    async shareContent(content, options = {}) {
        return this.sendToIOS('share_content', { content, ...options });
    }

    async scanQRCode() {
        return this.sendToIOS('scan_qr', {});
    }

    async generateQRCode(data) {
        return this.sendToIOS('generate_qr', { data });
    }

    async playSound(soundId) {
        return this.sendToIOS('play_sound', { soundId });
    }

    async setBrightness(level) {
        return this.sendToIOS('set_brightness', { level });
    }

    async getNetworkInfo() {
        return this.sendToIOS('network_info', {});
    }

    async getBatteryInfo() {
        return this.sendToIOS('battery_info', {});
    }

    async getLocationInfo() {
        return this.sendToIOS('location_info', {});
    }

    async openExternalApp(scheme, data = {}) {
        return this.sendToIOS('open_external_app', { scheme, data });
    }

    async downloadFile(url, filename) {
        return this.sendToIOS('download_file', { url, filename });
    }

    async uploadFile(filePath, endpoint) {
        return this.sendToIOS('upload_file', { filePath, endpoint });
    }

    async compressImage(imagePath, quality = 0.8) {
        return this.sendToIOS('compress_image', { imagePath, quality });
    }

    async resizeImage(imagePath, width, height) {
        return this.sendToIOS('resize_image', { imagePath, width, height });
    }

    async encryptData(data, key) {
        return this.sendToIOS('encrypt_data', { data, key });
    }

    async decryptData(encryptedData, key) {
        return this.sendToIOS('decrypt_data', { encryptedData, key });
    }

    async generateHash(data, algorithm = 'SHA256') {
        return this.sendToIOS('generate_hash', { data, algorithm });
    }

    async validateTouchID() {
        return this.sendToIOS('validate_touch_id', {});
    }

    async validateFaceID() {
        return this.sendToIOS('validate_face_id', {});
    }

    async getSystemInfo() {
        return this.sendToIOS('system_info', {});
    }

    async clearCache() {
        return this.sendToIOS('clear_cache', {});
    }

    async restartApp() {
        return this.sendToIOS('restart_app', {});
    }
}

// ============= OFFLINE-SYNC.JS =============
class OfflineSync {
    constructor(config = {}) {
        this.storage = config.storage || window.localStorage;
        this.syncInterval = config.syncInterval || 300000; // 5 minutes
        this.tables = config.tables || [];
        this.isRunning = false;
        this.syncTimer = null;
        this.conflictResolver = config.conflictResolver || this.defaultConflictResolver;
        this.syncQueue = [];
        this.lastSyncTimestamp = this.getLastSyncTimestamp();
    }

    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.loadSyncQueue();
        
        // Initial sync
        this.performSync();
        
        // Set up periodic sync
        this.syncTimer = setInterval(() => {
            this.performSync();
        }, this.syncInterval);

        // Listen for online/offline events
        window.addEventListener('online', () => {
            console.log('Device came online, performing sync...');
            this.performSync();
        });

        window.addEventListener('offline', () => {
            console.log('Device went offline, sync paused');
        });
    }

    stop() {
        this.isRunning = false;
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
            this.syncTimer = null;
        }
    }

    async performSync() {
        if (!navigator.onLine) {
            console.log('Device is offline, skipping sync');
            return;
        }

        console.log('Starting sync process...');
        
        try {
            // Process offline queue first
            await this.processOfflineQueue();
            
            // Sync each table
            for (const table of this.tables) {
                await this.syncTable(table);
            }
            
            this.updateLastSyncTimestamp();
            this.notifySync('success');
            
        } catch (error) {
            console.error('Sync failed:', error);
            this.notifySync('error', error.message);
        }
    }

    async syncTable(tableName) {
        try {
            console.log(`Syncing table: ${tableName}`);
            
            const localData = this.getLocalData(tableName);
            const remoteData = await this.getRemoteData(tableName);
            
            const syncResult = this.mergeData(localData, remoteData);
            
            // Save merged data locally
            await this.saveLocalData(tableName, syncResult.merged);
            
            // Upload local changes to server
            if (syncResult.localChanges.length > 0) {
                await this.uploadChanges(tableName, syncResult.localChanges);
            }
            
            console.log(`Table ${tableName} synced successfully`);
            
        } catch (error) {
            console.error(`Error syncing table ${tableName}:`, error);
            throw error;
        }
    }

    getLocalData(tableName) {
        try {
            const data = this.storage.getItem(`offline_${tableName}`);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error(`Error reading local data for ${tableName}:`, error);
            return [];
        }
    }

    async getRemoteData(tableName) {
        const response = await fetch(`/api/${tableName}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${await this.getAuthToken()}`,
                'Content-Type': 'application/json',
                'If-Modified-Since': new Date(this.lastSyncTimestamp).toISOString()
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch remote data: ${response.statusText}`);
        }

        return await response.json();
    }

    mergeData(localData, remoteData) {
        const merged = new Map();
        const localChanges = [];
        const conflicts = [];

        // Add local data to merged set
        localData.forEach(item => {
            merged.set(item.id, { 
                ...item, 
                _source: 'local',
                _lastModified: item._lastModified || Date.now()
            });
            
            if (item._isModified) {
                localChanges.push(item);
            }
        });

        // Merge remote data
        remoteData.forEach(remoteItem => {
            const localItem = merged.get(remoteItem.id);
            
            if (!localItem) {
                // New remote item
                merged.set(remoteItem.id, { 
                    ...remoteItem, 
                    _source: 'remote',
                    _lastModified: new Date(remoteItem.updatedAt).getTime()
                });
            } else {
                // Conflict resolution
                const remoteTimestamp = new Date(remoteItem.updatedAt).getTime();
                const localTimestamp = localItem._lastModified;
                
                if (remoteTimestamp > localTimestamp) {
                    // Remote is newer
                    merged.set(remoteItem.id, { 
                        ...remoteItem, 
                        _source: 'remote',
                        _lastModified: remoteTimestamp
                    });
                } else if (localTimestamp > remoteTimestamp && localItem._isModified) {
                    // Local is newer and modified
                    // Keep local version but mark for upload
                    if (!localChanges.find(item => item.id === localItem.id)) {
                        localChanges.push(localItem);
                    }
                } else if (localTimestamp === remoteTimestamp) {
                    // Same timestamp, check content
                    const hasConflict = this.detectConflict(localItem, remoteItem);
                    if (hasConflict) {
                        const resolved = this.conflictResolver(localItem, remoteItem);
                        merged.set(remoteItem.id, resolved);
                        conflicts.push({ local: localItem, remote: remoteItem, resolved });
                    }
                }
            }
        });

        return {
            merged: Array.from(merged.values()),
            localChanges,
            conflicts
        };
    }

    detectConflict(localItem, remoteItem) {
        // Simple content comparison (excluding metadata)
        const localContent = { ...localItem };
        const remoteContent = { ...remoteItem };
        
        // Remove metadata fields
        delete localContent._source;
        delete localContent._lastModified;
        delete localContent._isModified;
        delete remoteContent.updatedAt;
        delete remoteContent.createdAt;
        
        return JSON.stringify(localContent) !== JSON.stringify(remoteContent);
    }

    defaultConflictResolver(localItem, remoteItem) {
        // Default: prefer remote (server wins)
        return { 
            ...remoteItem, 
            _source: 'remote',
            _lastModified: new Date(remoteItem.updatedAt).getTime()
        };
    }

    async saveLocalData(tableName, data) {
        try {
            this.storage.setItem(`offline_${tableName}`, JSON.stringify(data));
            this.storage.setItem(`offline_${tableName}_timestamp`, Date.now().toString());
        } catch (error) {
            console.error(`Error saving local data for ${tableName}:`, error);
            throw error;
        }
    }

    async uploadChanges(tableName, changes) {
        for (const item of changes) {
            try {
                const method = item._isNew ? 'POST' : 'PUT';
                const endpoint = item._isNew ? `/api/${tableName}` : `/api/${tableName}/${item.id}`;
                
                const response = await fetch(endpoint, {
                    method,
                    headers: {
                        'Authorization': `Bearer ${await this.getAuthToken()}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(this.cleanItemForUpload(item))
                });

                if (!response.ok) {
                    throw new Error(`Failed to upload item: ${response.statusText}`);
                }

                // Mark as synced
                item._isModified = false;
                item._isNew = false;
                
            } catch (error) {
                console.error(`Error uploading item ${item.id}:`, error);
                // Add to retry queue
                this.addToSyncQueue({
                    action: 'upload',
                    table: tableName,
                    item: item,
                    timestamp: Date.now()
                });
            }
        }
    }

    cleanItemForUpload(item) {
        const cleaned = { ...item };
        delete cleaned._source;
        delete cleaned._lastModified;
        delete cleaned._isModified;
        delete cleaned._isNew;
        return cleaned;
    }

    async processOfflineQueue() {
        if (this.syncQueue.length === 0) return;
        
        console.log(`Processing ${this.syncQueue.length} queued operations...`);
        
        const processedItems = [];
        
        for (const queueItem of this.syncQueue) {
            try {
                await this.processQueueItem(queueItem);
                processedItems.push(queueItem);
            } catch (error) {
                console.error('Failed to process queue item:', error);
                // Keep failed items in queue for retry
            }
        }
        
        // Remove successfully processed items
        this.syncQueue = this.syncQueue.filter(item => !processedItems.includes(item));
        this.saveSyncQueue();
    }

    async processQueueItem(queueItem) {
        const { action, table, item } = queueItem;
        
        switch (action) {
            case 'upload':
                await this.uploadChanges(table, [item]);
                break;
            case 'delete':
                await this.deleteRemoteItem(table, item.id);
                break;
            default:
                console.warn(`Unknown queue action: ${action}`);
        }
    }

    async deleteRemoteItem(tableName, itemId) {
        const response = await fetch(`/api/${tableName}/${itemId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${await this.getAuthToken()}`
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to delete item: ${response.statusText}`);
        }
    }

    addToSyncQueue(queueItem) {
        this.syncQueue.push(queueItem);
        this.saveSyncQueue();
    }

    loadSyncQueue() {
        try {
            const queueData = this.storage.getItem('sync_queue');
            this.syncQueue = queueData ? JSON.parse(queueData) : [];
        } catch (error) {
            console.error('Error loading sync queue:', error);
            this.syncQueue = [];
        }
    }

    saveSyncQueue() {
        try {
            this.storage.setItem('sync_queue', JSON.stringify(this.syncQueue));
        } catch (error) {
            console.error('Error saving sync queue:', error);
        }
    }

    getLastSyncTimestamp() {
        const timestamp = this.storage.getItem('last_sync_timestamp');
        return timestamp ? parseInt(timestamp) : 0;
    }

    updateLastSyncTimestamp() {
        this.lastSyncTimestamp = Date.now();
        this.storage.setItem('last_sync_timestamp', this.lastSyncTimestamp.toString());
    }

    async getAuthToken() {
        // Get auth token from AWS Amplify or other auth provider
        try {
            if (window.Amplify && window.Amplify.Auth) {
                const session = await window.Amplify.Auth.currentSession();
                return session.getAccessToken().getJwtToken();
            }
        } catch (error) {
            console.error('Error getting auth token:', error);
        }
        return null;
    }

    notifySync(status, message = '') {
        const event = new CustomEvent('syncStatusChanged', {
            detail: { status, message, timestamp: Date.now() }
        });
        window.dispatchEvent(event);
    }

    // Public API methods
    async addItem(tableName, item) {
        const localData = this.getLocalData(tableName);
        const newItem = {
            ...item,
            id: item.id || this.generateId(),
            _isNew: true,
            _isModified: true,
            _lastModified: Date.now(),
            _source: 'local'
        };
        
        localData.push(newItem);
        await this.saveLocalData(tableName, localData);
        
        if (navigator.onLine) {
            this.performSync();
        }
        
        return newItem;
    }

    async updateItem(tableName, itemId, updates) {
        const localData = this.getLocalData(tableName);
        const itemIndex = localData.findIndex(item => item.id === itemId);
        
        if (itemIndex === -1) {
            throw new Error(`Item with id ${itemId} not found`);
        }
        
        localData[itemIndex] = {
            ...localData[itemIndex],
            ...updates,
            _isModified: true,
            _lastModified: Date.now()
        };
        
        await this.saveLocalData(tableName, localData);
        
        if (navigator.onLine) {
            this.performSync();
        }
        
        return localData[itemIndex];
    }

    async deleteItem(tableName, itemId) {
        const localData = this.getLocalData(tableName);
        const filteredData = localData.filter(item => item.id !== itemId);
        
        await this.saveLocalData(tableName, filteredData);
        
        // Add to delete queue if item exists remotely
        const deletedItem = localData.find(item => item.id === itemId);
        if (deletedItem && !deletedItem._isNew) {
            this.addToSyncQueue({
                action: 'delete',
                table: tableName,
                item: { id: itemId },
                timestamp: Date.now()
            });
        }
        
        if (navigator.onLine) {
            this.performSync();
        }
    }

    generateId() {
        return 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Status methods
    getSyncStatus() {
        return {
            isRunning: this.isRunning,
            lastSync: this.lastSyncTimestamp,
            queueSize: this.syncQueue.length,
            isOnline: navigator.onLine
        };
    }

    getQueuedOperations() {
        return [...this.syncQueue];
    }

    clearQueue() {
        this.syncQueue = [];
        this.saveSyncQueue();
    }
}

// ============= AWS-MOBILE-SDK.JS =============
class AWSMobileSDK {
    constructor() {
        this.amplify = null;
        this.isInitialized = false;
        this.config = null;
    }

    async initialize(config) {
        if (this.isInitialized) return;

        this.config = {
            Auth: {
                identityPoolId: config.identityPoolId || 'us-east-1:12345678-1234-1234-1234-123456789012',
                region: config.region || 'us-east-1',
                userPoolId: config.userPoolId || 'us-east-1_xxxxxxxxx',
                userPoolWebClientId: config.userPoolWebClientId || 'xxxxxxxxxxxxxxxxxx',
                mandatorySignIn: config.mandatorySignIn || false,
                cookieStorage: {
                    domain: config.cookieDomain || window.location.hostname,
                    path: '/',
                    expires: 365,
                    secure: config.cookieSecure || window.location.protocol === 'https:'
                }
            },
            API: {
                endpoints: config.apiEndpoints || [
                    {
                        name: "CondoconnectAPI",
                        endpoint: "https://api.condoconnectai.com",
                        region: "us-east-1"
                    }
                ]
            },
            Storage: {
                AWSS3: {
                    bucket: config.s3Bucket || 'condoconnectai-storage-us-east-1',
                    region: config.s3Region || 'us-east-1'
                }
            },
            Analytics: {
                AWSPinpoint: {
                    appId: config.pinpointAppId || 'xxxxxxxxxxxxxxxxxx',
                    region: config.pinpointRegion || 'us-east-1'
                }
            }
        };

        try {
            // Load AWS Amplify if not already loaded
            if (!window.Amplify) {
                await this.loadAmplifySDK();
            }

            this.amplify = window.Amplify;
            this.amplify.configure(this.config);
            
            this.isInitialized = true;
            console.log('AWS Mobile SDK initialized successfully');
            
            // Set up auth state listener
            this.setupAuthStateListener();
            
        } catch (error) {
            console.error('Failed to initialize AWS Mobile SDK:', error);
            throw error;
        }
    }

    async loadAmplifySDK() {
        return new Promise((resolve, reject) => {
            if (window.Amplify) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://unpkg.com/aws-amplify@latest/dist/aws-amplify.min.js';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load AWS Amplify SDK'));
            document.head.appendChild(script);
        });
    }

    setupAuthStateListener() {
        if (!this.amplify || !this.amplify.Hub) return;

        this.amplify.Hub.listen('auth', (data) => {
            const { payload } = data;
            console.log('Auth state changed:', payload.event);
            
            // Dispatch custom event for app to listen to
            window.dispatchEvent(new CustomEvent('authStateChanged', {
                detail: payload
            }));
        });
    }

    // Authentication methods
    async signUp(username, password, attributes = {}) {
        if (!this.isInitialized) throw new Error('SDK not initialized');
        
        try {
            const result = await this.amplify.Auth.signUp({
                username,
                password,
                attributes: {
                    email: attributes.email || username,
                    name: attributes.name || '',
                    phone_number: attributes.phone || '',
                    'custom:tenant_id': attributes.tenantId || '',
                    'custom:role': attributes.role || 'resident'
                }
            });
            
            return {
                success: true,
                user: result.user,
                userSub: result.userSub
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                code: error.code
            };
        }
    }

    async confirmSignUp(username, code) {
        if (!this.isInitialized) throw new Error('SDK not initialized');
        
        try {
            await this.amplify.Auth.confirmSignUp(username, code);
            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                code: error.code
            };
        }
    }

    async signIn(username, password) {
        if (!this.isInitialized) throw new Error('SDK not initialized');
        
        try {
            const user = await this.amplify.Auth.signIn(username, password);
            
            if (user.challengeName) {
                return {
                    success: false,
                    challengeName: user.challengeName,
                    challengeParam: user.challengeParam,
                    user: user
                };
            }
            
            return {
                success: true,
                user: user
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                code: error.code
            };
        }
    }

    async confirmSignIn(user, code, challengeName) {
        if (!this.isInitialized) throw new Error('SDK not initialized');
        
        try {
            const confirmedUser = await this.amplify.Auth.confirmSignIn(user, code, challengeName);
            return {
                success: true,
                user: confirmedUser
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                code: error.code
            };
        }
    }

    async signOut() {
        if (!this.isInitialized) throw new Error('SDK not initialized');
        
        try {
            await this.amplify.Auth.signOut();
            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async getCurrentUser() {
        if (!this.isInitialized) throw new Error('SDK not initialized');
        
        try {
            const user = await this.amplify.Auth.currentAuthenticatedUser();
            return {
                success: true,
                user: user
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async getCurrentSession() {
        if (!this.isInitialized) throw new Error('SDK not initialized');
        
        try {
            const session = await this.amplify.Auth.currentSession();
            return {
                success: true,
                session: session,
                accessToken: session.getAccessToken().getJwtToken(),
                idToken: session.getIdToken().getJwtToken(),
                refreshToken: session.getRefreshToken().getToken()
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // API methods
    async apiGet(apiName, path, options = {}) {
        if (!this.isInitialized) throw new Error('SDK not initialized');
        
        try {
            const response = await this.amplify.API.get(apiName, path, options);
            return {
                success: true,
                data: response
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                response: error.response
            };
        }
    }

    async apiPost(apiName, path, options = {}) {
        if (!this.isInitialized) throw new Error('SDK not initialized');
        
        try {
            const response = await this.amplify.API.post(apiName, path, options);
            return {
                success: true,
                data: response
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                response: error.response
            };
        }
    }

    async apiPut(apiName, path, options = {}) {
        if (!this.isInitialized) throw new Error('SDK not initialized');
        
        try {
            const response = await this.amplify.API.put(apiName, path, options);
            return {
                success: true,
                data: response
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                response: error.response
            };
        }
    }

    async apiDelete(apiName, path, options = {}) {
        if (!this.isInitialized) throw new Error('SDK not initialized');
        
        try {
            const response = await this.amplify.API.del(apiName, path, options);
            return {
                success: true,
                data: response
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                response: error.response
            };
        }
    }

    // Storage methods
    async storageGet(key, options = {}) {
        if (!this.isInitialized) throw new Error('SDK not initialized');
        
        try {
            const result = await this.amplify.Storage.get(key, options);
            return {
                success: true,
                url: result
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async storagePut(key, object, options = {}) {
        if (!this.isInitialized) throw new Error('SDK not initialized');
        
        try {
            const result = await this.amplify.Storage.put(key, object, {
                level: options.level || 'private',
                contentType: options.contentType || 'application/octet-stream',
                progressCallback: options.progressCallback,
                ...options
            });
            
            return {
                success: true,
                key: result.key
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async storageRemove(key, options = {}) {
        if (!this.isInitialized) throw new Error('SDK not initialized');
        
        try {
            await this.amplify.Storage.remove(key, options);
            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async storageList(path = '', options = {}) {
        if (!this.isInitialized) throw new Error('SDK not initialized');
        
        try {
            const result = await this.amplify.Storage.list(path, options);
            return {
                success: true,
                items: result
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Analytics methods
    async recordEvent(eventName, attributes = {}, metrics = {}) {
        if (!this.isInitialized) throw new Error('SDK not initialized');
        
        try {
            await this.amplify.Analytics.record({
                name: eventName,
                attributes: attributes,
                metrics: metrics
            });
            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async updateEndpoint(attributes = {}) {
        if (!this.isInitialized) throw new Error('SDK not initialized');
        
        try {
            await this.amplify.Analytics.updateEndpoint({
                address: attributes.address,
                channelType: attributes.channelType || 'GCM',
                demographic: attributes.demographic || {},
                location: attributes.location || {},
                metrics: attributes.metrics || {},
                optOut: attributes.optOut || 'NONE',
                userAttributes: attributes.userAttributes || {}
            });
            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Utility methods
    isAuthenticated() {
        return this.amplify && this.amplify.Auth.currentAuthenticatedUser()
            .then(() => true)
            .catch(() => false);
    }

    getConfig() {
        return this.config;
    }

    getAmplifyInstance() {
        return this.amplify;
    }
}

// ============= BIOMETRIC-BRIDGE.JS =============
class BiometricBridge {
    constructor() {
        this.isSupported = this.checkSupport();
        this.androidBridge = window.AndroidBridge ? new window.AndroidBridge() : null;
        this.iosBridge = window.IOSBridge ? new window.IOSBridge() : null;
    }

    checkSupport() {
        // Check for Web Authentication API
        if (window.PublicKeyCredential) {
            return true;
        }
        
        // Check for native bridges
        if (window.Android || (window.webkit && window.webkit.messageHandlers)) {
            return true;
        }
        
        return false;
    }

    async isAvailable() {
        if (!this.isSupported) {
            return { available: false, reason: 'Biometric authentication not supported' };
        }

        try {
            if (this.androidBridge) {
                const result = await this.androidBridge.sendToAndroid('biometric_available', {});
                return result;
            }
            
            if (this.iosBridge) {
                const result = await this.iosBridge.sendToIOS('biometric_available', {});
                return result;
            }
            
            // Web API check
            if (window.PublicKeyCredential) {
                const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
                return { 
                    available, 
                    types: available ? ['platform'] : [],
                    reason: available ? null : 'No platform authenticator available'
                };
            }
            
            return { available: false, reason: 'No biometric method available' };
            
        } catch (error) {
            return { available: false, reason: error.message };
        }
    }

    async authenticate(options = {}) {
        if (!this.isSupported) {
            throw new Error('Biometric authentication not supported');
        }

        const config = {
            title: options.title || 'Autenticación Biométrica',
            subtitle: options.subtitle || 'Confirme su identidad',
            description: options.description || 'Use su huella dactilar o Face ID para continuar',
            fallbackTitle: options.fallbackTitle || 'Usar PIN',
            negativeButtonText: options.negativeButtonText || 'Cancelar',
            ...options
        };

        try {
            if (this.androidBridge) {
                return await this.androidBridge.sendToAndroid('biometric_authenticate', config);
            }
            
            if (this.iosBridge) {
                return await this.iosBridge.sendToIOS('biometric_authenticate', config);
            }
            
            // Web API authentication
            return await this.webAuthenticate(config);
            
        } catch (error) {
            throw new Error(`Biometric authentication failed: ${error.message}`);
        }
    }

    async webAuthenticate(config) {
        if (!window.PublicKeyCredential) {
            throw new Error('WebAuthn not supported');
        }

        const challenge = new Uint8Array(32);
        crypto.getRandomValues(challenge);

        const publicKeyCredentialRequestOptions = {
            challenge: challenge,
            allowCredentials: [],
            userVerification: 'required',
            timeout: config.timeout || 60000
        };

        try {
            const credential = await navigator.credentials.get({
                publicKey: publicKeyCredentialRequestOptions
            });

            return {
                success: true,
                credential: credential,
                authenticatorData: credential.response.authenticatorData,
                signature: credential.response.signature
            };
        } catch (error) {
            if (error.name === 'NotAllowedError') {
                throw new Error('User cancelled authentication');
            } else if (error.name === 'NotSupportedError') {
                throw new Error('Biometric authentication not supported');
            } else {
                throw new Error(`Authentication failed: ${error.message}`);
            }
        }
    }

    async enroll(options = {}) {
        if (!this.isSupported) {
            throw new Error('Biometric enrollment not supported');
        }

        const config = {
            title: options.title || 'Registrar Biométrico',
            description: options.description || 'Configure su autenticación biométrica',
            ...options
        };

        try {
            if (this.androidBridge) {
                return await this.androidBridge.sendToAndroid('biometric_enroll', config);
            }
            
            if (this.iosBridge) {
                return await this.iosBridge.sendToIOS('biometric_enroll', config);
            }
            
            // Web API enrollment
            return await this.webEnroll(config);
            
        } catch (error) {
            throw new Error(`Biometric enrollment failed: ${error.message}`);
        }
    }

    async webEnroll(config) {
        if (!window.PublicKeyCredential) {
            throw new Error('WebAuthn not supported');
        }

        const challenge = new Uint8Array(32);
        crypto.getRandomValues(challenge);

        const userId = new Uint8Array(16);
        crypto.getRandomValues(userId);

        const publicKeyCredentialCreationOptions = {
            challenge: challenge,
            rp: {
                name: config.rpName || "CondoconnectAI",
                id: config.rpId || window.location.hostname,
            },
            user: {
                id: userId,
                name: config.userName || "user@condoconnectai.com",
                displayName: config.userDisplayName || "Usuario CondoconnectAI",
            },
            pubKeyCredParams: [
                { alg: -7, type: "public-key" },
                { alg: -257, type: "public-key" }
            ],
            authenticatorSelection: {
                authenticatorAttachment: "platform",
                userVerification: "required"
            },
            timeout: config.timeout || 60000,
            attestation: "direct"
        };

        try {
            const credential = await navigator.credentials.create({
                publicKey: publicKeyCredentialCreationOptions
            });

            return {
                success: true,
                credentialId: credential.id,
                publicKey: credential.response.publicKey,
                attestationObject: credential.response.attestationObject
            };
        } catch (error) {
            if (error.name === 'NotAllowedError') {
                throw new Error('User cancelled enrollment');
            } else if (error.name === 'NotSupportedError') {
                throw new Error('Biometric enrollment not supported');
            } else {
                throw new Error(`Enrollment failed: ${error.message}`);
            }
        }
    }

    async getEnrolledBiometrics() {
        try {
            if (this.androidBridge) {
                return await this.androidBridge.sendToAndroid('biometric_get_enrolled', {});
            }
            
            if (this.iosBridge) {
                return await this.iosBridge.sendToIOS('biometric_get_enrolled', {});
            }
            
            // For web, we can't directly get enrolled biometrics
            // but we can check if platform authenticator is available
            const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
            return {
                enrolled: available,
                types: available ? ['platform'] : []
            };
            
        } catch (error) {
            throw new Error(`Failed to get enrolled biometrics: ${error.message}`);
        }
    }

    async deleteBiometric(biometricId) {
        try {
            if (this.androidBridge) {
                return await this.androidBridge.sendToAndroid('biometric_delete', { biometricId });
            }
            
            if (this.iosBridge) {
                return await this.iosBridge.sendToIOS('biometric_delete', { biometricId });
            }
            
            // Web API doesn't support deleting specific credentials
            throw new Error('Deleting specific biometrics not supported on web');
            
        } catch (error) {
            throw new Error(`Failed to delete biometric: ${error.message}`);
        }
    }

    // Utility methods
    getSupportedTypes() {
        const types = [];
        
        if (this.androidBridge) {
            types.push('fingerprint', 'face', 'iris');
        }
        
        if (this.iosBridge) {
            types.push('touchid', 'faceid');
        }
        
        if (window.PublicKeyCredential) {
            types.push('platform');
        }
        
        return types;
    }

    async getCapabilities() {
        try {
            const available = await this.isAvailable();
            const supportedTypes = this.getSupportedTypes();
            
            return {
                isSupported: this.isSupported,
                isAvailable: available.available,
                supportedTypes: supportedTypes,
                reason: available.reason
            };
        } catch (error) {
            return {
                isSupported: false,
                isAvailable: false,
                supportedTypes: [],
                reason: error.message
            };
        }
    }
}

// Export classes for global use
window.IOSBridge = IOSBridge;
window.OfflineSync = OfflineSync;
window.AWSMobileSDK = AWSMobileSDK;
window.BiometricBridge = BiometricBridge;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        IOSBridge,
        OfflineSync,
        AWSMobileSDK,
        BiometricBridge
    };
}
