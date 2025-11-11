class HybridBridge {
    constructor() {
        this.amplify = require('aws-amplify');
        this.handlers = new Map();
        this.isInitialized = false;
        this.configureAmplify();
    }
    
    configureAmplify() {
        this.amplify.configure({
            Auth: {
                identityPoolId: 'us-east-1:12345678-1234-1234-1234-123456789012',
                region: 'us-east-1',
                userPoolId: 'us-east-1_xxxxxxxxx',
                userPoolWebClientId: 'xxxxxxxxxxxxxxxxxx'
            },
            API: {
                endpoints: [
                    {
                        name: "CondoconnectAPI",
                        endpoint: "https://api.condoconnectai.com",
                        region: "us-east-1"
                    }
                ]
            },
            Storage: {
                AWSS3: {
                    bucket: 'condoconnectai-storage-us-east-1',
                    region: 'us-east-1'
                }
            }
        });
    }

    initialize() {
        if (this.isInitialized) return;
        
        this.setupMessageHandlers();
        this.initializeOfflineSync();
        this.setupRealtimeConnection();
        this.isInitialized = true;
    }

    setupMessageHandlers() {
        if (window.Android) {
            window.Android.setMessageHandler((message) => {
                this.handleNativeMessage(JSON.parse(message));
            });
        }
        
        if (window.webkit && window.webkit.messageHandlers) {
            window.webkit.messageHandlers.condoconnectai.postMessage = (message) => {
                this.handleNativeMessage(message);
            };
        }
    }

    registerHandler(type, handler) {
        this.handlers.set(type, handler);
    }

    handleNativeMessage(message) {
        const { type, data, callback } = message;
        const handler = this.handlers.get(type);
        
        if (handler) {
            handler(data).then(result => {
                if (callback) {
                    this.sendToNative({
                        type: 'callback',
                        callbackId: callback,
                        result: result
                    });
                }
            }).catch(error => {
                if (callback) {
                    this.sendToNative({
                        type: 'callback',
                        callbackId: callback,
                        error: error.message
                    });
                }
            });
        }
    }

    sendToNative(message) {
        if (window.Android) {
            window.Android.receiveMessage(JSON.stringify(message));
        } else if (window.webkit) {
            window.webkit.messageHandlers.condoconnectai.postMessage(message);
        }
    }

    initializeOfflineSync() {
        this.offlineSync = new OfflineSync({
            storage: window.localStorage,
            syncInterval: 300000,
            tables: [
                'residents',
                'payments', 
                'maintenance',
                'communications'
            ]
        });
        
        this.offlineSync.start();
    }

    setupRealtimeConnection() {
        this.realtimeClient = new RealtimeClient({
            endpoint: 'wss://realtime.condoconnectai.com',
            auth: () => this.amplify.Auth.currentSession()
        });
        
        this.realtimeClient.connect();
    }

    async authenticateUser(credentials) {
        try {
            const user = await this.amplify.Auth.signIn(credentials.username, credentials.password);
            return { success: true, user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async uploadFile(file, key) {
        try {
            const result = await this.amplify.Storage.put(key, file, {
                contentType: file.type,
                level: 'private'
            });
            return { success: true, result };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async syncData() {
        try {
            await this.offlineSync.performSync();
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

class OfflineSync {
    constructor(config) {
        this.storage = config.storage;
        this.syncInterval = config.syncInterval;
        this.tables = config.tables;
        this.isRunning = false;
        this.syncTimer = null;
    }

    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.syncTimer = setInterval(() => {
            this.performSync();
        }, this.syncInterval);
    }

    stop() {
        this.isRunning = false;
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
            this.syncTimer = null;
        }
    }

    async performSync() {
        for (const table of this.tables) {
            await this.syncTable(table);
        }
    }

    async syncTable(tableName) {
        try {
            const localData = this.getLocalData(tableName);
            const remoteData = await this.getRemoteData(tableName);
            
            const merged = this.mergeData(localData, remoteData);
            await this.saveLocalData(tableName, merged);
            await this.uploadChanges(tableName, merged);
            
        } catch (error) {
            console.error(`Error syncing table ${tableName}:`, error);
        }
    }

    getLocalData(tableName) {
        const data = this.storage.getItem(`offline_${tableName}`);
        return data ? JSON.parse(data) : [];
    }

    async getRemoteData(tableName) {
        const response = await fetch(`/api/${tableName}`, {
            headers: {
                'Authorization': `Bearer ${await this.getAuthToken()}`
            }
        });
        return response.json();
    }

    mergeData(local, remote) {
        const merged = new Map();
        
        local.forEach(item => {
            merged.set(item.id, { ...item, _source: 'local' });
        });
        
        remote.forEach(item => {
            const existing = merged.get(item.id);
            if (!existing || item.updatedAt > existing.updatedAt) {
                merged.set(item.id, { ...item, _source: 'remote' });
            }
        });
        
        return Array.from(merged.values());
    }

    saveLocalData(tableName, data) {
        this.storage.setItem(`offline_${tableName}`, JSON.stringify(data));
    }

    async uploadChanges(tableName, data) {
        const localChanges = data.filter(item => item._source === 'local');
        
        for (const item of localChanges) {
            try {
                await fetch(`/api/${tableName}/${item.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${await this.getAuthToken()}`
                    },
                    body: JSON.stringify(item)
                });
            } catch (error) {
                console.error(`Error uploading item ${item.id}:`, error);
            }
        }
    }

    async getAuthToken() {
        const session = await window.hybridBridge.amplify.Auth.currentSession();
        return session.getAccessToken().getJwtToken();
    }
}

class RealtimeClient {
    constructor(config) {
        this.endpoint = config.endpoint;
        this.auth = config.auth;
        this.socket = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
    }

    async connect() {
        try {
            const token = await this.auth();
            this.socket = new WebSocket(`${this.endpoint}?token=${token.getAccessToken().getJwtToken()}`);
            
            this.socket.onopen = () => {
                console.log('Realtime connection established');
                this.reconnectAttempts = 0;
            };
            
            this.socket.onmessage = (event) => {
                this.handleMessage(JSON.parse(event.data));
            };
            
            this.socket.onclose = () => {
                console.log('Realtime connection closed');
                this.attemptReconnect();
            };
            
            this.socket.onerror = (error) => {
                console.error('Realtime connection error:', error);
            };
            
        } catch (error) {
            console.error('Error connecting to realtime service:', error);
        }
    }

    handleMessage(message) {
        const { type, data } = message;
        
        switch (type) {
            case 'notification':
                this.handleNotification(data);
                break;
            case 'data_update':
                this.handleDataUpdate(data);
                break;
            case 'system_message':
                this.handleSystemMessage(data);
                break;
        }
    }

    handleNotification(data) {
        if (window.hybridBridge) {
            window.hybridBridge.sendToNative({
                type: 'notification',
                data: data
            });
        }
    }

    handleDataUpdate(data) {
        if (window.hybridBridge && window.hybridBridge.offlineSync) {
            window.hybridBridge.offlineSync.handleRemoteUpdate(data);
        }
    }

    handleSystemMessage(data) {
        console.log('System message:', data);
    }

    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            setTimeout(() => {
                console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
                this.connect();
            }, this.reconnectDelay * this.reconnectAttempts);
        }
    }

    send(message) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(message));
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    }
}

// Inicializar el puente híbrido globalmente
window.hybridBridge = new HybridBridge();

// Exportar para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { HybridBridge, OfflineSync, RealtimeClient };
}
