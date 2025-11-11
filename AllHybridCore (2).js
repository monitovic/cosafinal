// ============= CAMERA-BRIDGE.JS =============
class CameraBridge {
    constructor() {
        this.androidBridge = window.AndroidBridge ? new window.AndroidBridge() : null;
        this.iosBridge = window.IOSBridge ? new window.IOSBridge() : null;
        this.isSupported = this.checkSupport();
    }

    checkSupport() {
        // Check for native bridges
        if (this.androidBridge || this.iosBridge) {
            return true;
        }
        
        // Check for web camera API
        return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    }

    async capturePhoto(options = {}) {
        const config = {
            quality: options.quality || 0.8,
            maxWidth: options.maxWidth || 1920,
            maxHeight: options.maxHeight || 1080,
            allowEdit: options.allowEdit || false,
            encodingType: options.encodingType || 'JPEG',
            targetWidth: options.targetWidth,
            targetHeight: options.targetHeight,
            mediaType: 'PHOTO',
            correctOrientation: options.correctOrientation || true,
            saveToPhotoAlbum: options.saveToPhotoAlbum || false,
            ...options
        };

        try {
            if (this.androidBridge) {
                return await this.androidBridge.sendToAndroid('camera_capture', config);
            }
            
            if (this.iosBridge) {
                return await this.iosBridge.sendToIOS('camera_capture', config);
            }
            
            // Web implementation
            return await this.webCapturePhoto(config);
            
        } catch (error) {
            throw new Error(`Camera capture failed: ${error.message}`);
        }
    }

    async selectFromGallery(options = {}) {
        const config = {
            quality: options.quality || 0.8,
            maxWidth: options.maxWidth || 1920,
            maxHeight: options.maxHeight || 1080,
            allowEdit: options.allowEdit || false,
            encodingType: options.encodingType || 'JPEG',
            mediaType: options.mediaType || 'PHOTO',
            allowMultiple: options.allowMultiple || false,
            ...options
        };

        try {
            if (this.androidBridge) {
                return await this.androidBridge.sendToAndroid('gallery_select', config);
            }
            
            if (this.iosBridge) {
                return await this.iosBridge.sendToIOS('gallery_select', config);
            }
            
            // Web implementation
            return await this.webSelectFromGallery(config);
            
        } catch (error) {
            throw new Error(`Gallery selection failed: ${error.message}`);
        }
    }

    async recordVideo(options = {}) {
        const config = {
            duration: options.duration || 60, // seconds
            quality: options.quality || 'high',
            maxFileSize: options.maxFileSize || 50 * 1024 * 1024, // 50MB
            ...options
        };

        try {
            if (this.androidBridge) {
                return await this.androidBridge.sendToAndroid('video_record', config);
            }
            
            if (this.iosBridge) {
                return await this.iosBridge.sendToIOS('video_record', config);
            }
            
            // Web implementation
            return await this.webRecordVideo(config);
            
        } catch (error) {
            throw new Error(`Video recording failed: ${error.message}`);
        }
    }

    async webCapturePhoto(config) {
        return new Promise((resolve, reject) => {
            // Create file input for web
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.capture = 'camera';
            
            input.onchange = async (event) => {
                const file = event.target.files[0];
                if (!file) {
                    reject(new Error('No file selected'));
                    return;
                }
                
                try {
                    const processedImage = await this.processImage(file, config);
                    resolve({
                        success: true,
                        imageData: processedImage.dataUrl,
                        filePath: processedImage.blob,
                        fileName: file.name,
                        fileSize: file.size
                    });
                } catch (error) {
                    reject(error);
                }
            };
            
            input.click();
        });
    }

    async webSelectFromGallery(config) {
        return new Promise((resolve, reject) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = config.mediaType === 'VIDEO' ? 'video/*' : 'image/*';
            input.multiple = config.allowMultiple;
            
            input.onchange = async (event) => {
                const files = Array.from(event.target.files);
                if (files.length === 0) {
                    reject(new Error('No files selected'));
                    return;
                }
                
                try {
                    const results = [];
                    for (const file of files) {
                        if (config.mediaType === 'VIDEO' || file.type.startsWith('video/')) {
                            results.push({
                                success: true,
                                videoData: URL.createObjectURL(file),
                                filePath: file,
                                fileName: file.name,
                                fileSize: file.size,
                                duration: await this.getVideoDuration(file)
                            });
                        } else {
                            const processedImage = await this.processImage(file, config);
                            results.push({
                                success: true,
                                imageData: processedImage.dataUrl,
                                filePath: processedImage.blob,
                                fileName: file.name,
                                fileSize: file.size
                            });
                        }
                    }
                    
                    resolve(config.allowMultiple ? results : results[0]);
                } catch (error) {
                    reject(error);
                }
            };
            
            input.click();
        });
    }

    async webRecordVideo(config) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: true, 
                audio: true 
            });
            
            return new Promise((resolve, reject) => {
                const mediaRecorder = new MediaRecorder(stream);
                const chunks = [];
                
                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        chunks.push(event.data);
                    }
                };
                
                mediaRecorder.onstop = () => {
                    const blob = new Blob(chunks, { type: 'video/webm' });
                    const videoUrl = URL.createObjectURL(blob);
                    
                    stream.getTracks().forEach(track => track.stop());
                    
                    resolve({
                        success: true,
                        videoData: videoUrl,
                        filePath: blob,
                        fileName: `video_${Date.now()}.webm`,
                        fileSize: blob.size,
                        duration: config.duration
                    });
                };
                
                mediaRecorder.onerror = (error) => {
                    stream.getTracks().forEach(track => track.stop());
                    reject(error);
                };
                
                mediaRecorder.start();
                
                // Stop recording after specified duration
                setTimeout(() => {
                    if (mediaRecorder.state === 'recording') {
                        mediaRecorder.stop();
                    }
                }, config.duration * 1000);
            });
            
        } catch (error) {
            throw new Error(`Failed to access camera: ${error.message}`);
        }
    }

    async processImage(file, config) {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
                // Calculate dimensions
                let { width, height } = img;
                
                if (config.maxWidth && width > config.maxWidth) {
                    height = (height * config.maxWidth) / width;
                    width = config.maxWidth;
                }
                
                if (config.maxHeight && height > config.maxHeight) {
                    width = (width * config.maxHeight) / height;
                    height = config.maxHeight;
                }
                
                if (config.targetWidth && config.targetHeight) {
                    width = config.targetWidth;
                    height = config.targetHeight;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                // Draw and compress
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob((blob) => {
                    const dataUrl = canvas.toDataURL('image/jpeg', config.quality);
                    resolve({ blob, dataUrl });
                }, 'image/jpeg', config.quality);
            };
            
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = URL.createObjectURL(file);
        });
    }

    async getVideoDuration(file) {
        return new Promise((resolve) => {
            const video = document.createElement('video');
            video.preload = 'metadata';
            
            video.onloadedmetadata = () => {
                resolve(video.duration);
                URL.revokeObjectURL(video.src);
            };
            
            video.onerror = () => {
                resolve(0);
                URL.revokeObjectURL(video.src);
            };
            
            video.src = URL.createObjectURL(file);
        });
    }

    async getPermissions() {
        try {
            if (this.androidBridge) {
                return await this.androidBridge.sendToAndroid('camera_permissions', {});
            }
            
            if (this.iosBridge) {
                return await this.iosBridge.sendToIOS('camera_permissions', {});
            }
            
            // Web permissions check
            const permissions = await navigator.permissions.query({ name: 'camera' });
            return {
                camera: permissions.state,
                microphone: (await navigator.permissions.query({ name: 'microphone' })).state
            };
            
        } catch (error) {
            return {
                camera: 'prompt',
                microphone: 'prompt'
            };
        }
    }

    async requestPermissions() {
        try {
            if (this.androidBridge) {
                return await this.androidBridge.sendToAndroid('camera_request_permissions', {});
            }
            
            if (this.iosBridge) {
                return await this.iosBridge.sendToIOS('camera_request_permissions', {});
            }
            
            // Web permissions request
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: true, 
                audio: true 
            });
            stream.getTracks().forEach(track => track.stop());
            
            return { granted: true };
            
        } catch (error) {
            return { 
                granted: false, 
                error: error.message 
            };
        }
    }
}

// ============= NOTIFICATION-BRIDGE.JS =============
class NotificationBridge {
    constructor() {
        this.androidBridge = window.AndroidBridge ? new window.AndroidBridge() : null;
        this.iosBridge = window.IOSBridge ? new window.IOSBridge() : null;
        this.isSupported = this.checkSupport();
        this.permission = 'default';
        this.checkPermission();
    }

    checkSupport() {
        return !!(this.androidBridge || this.iosBridge || 
                 ('Notification' in window) || 
                 ('serviceWorker' in navigator));
    }

    async checkPermission() {
        try {
            if (this.androidBridge) {
                const result = await this.androidBridge.sendToAndroid('notification_permission', {});
                this.permission = result.permission;
                return this.permission;
            }
            
            if (this.iosBridge) {
                const result = await this.iosBridge.sendToIOS('notification_permission', {});
                this.permission = result.permission;
                return this.permission;
            }
            
            // Web notification permission
            if ('Notification' in window) {
                this.permission = Notification.permission;
                return this.permission;
            }
            
            return 'denied';
            
        } catch (error) {
            console.error('Error checking notification permission:', error);
            return 'denied';
        }
    }

    async requestPermission() {
        try {
            if (this.androidBridge) {
                const result = await this.androidBridge.sendToAndroid('notification_request_permission', {});
                this.permission = result.permission;
                return result;
            }
            
            if (this.iosBridge) {
                const result = await this.iosBridge.sendToIOS('notification_request_permission', {});
                this.permission = result.permission;
                return result;
            }
            
            // Web notification permission request
            if ('Notification' in window) {
                const permission = await Notification.requestPermission();
                this.permission = permission;
                return { 
                    permission: permission,
                    granted: permission === 'granted'
                };
            }
            
            return { 
                permission: 'denied',
                granted: false
            };
            
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            return { 
                permission: 'denied',
                granted: false,
                error: error.message
            };
        }
    }

    async showNotification(title, options = {}) {
        if (this.permission !== 'granted') {
            const permissionResult = await this.requestPermission();
            if (!permissionResult.granted) {
                throw new Error('Notification permission not granted');
            }
        }

        const config = {
            title: title,
            body: options.body || options.message || '',
            icon: options.icon || '/assets/icons/notification-icon.png',
            badge: options.badge || '/assets/icons/badge-icon.png',
            image: options.image,
            tag: options.tag || `notification_${Date.now()}`,
            data: options.data || {},
            requireInteraction: options.requireInteraction || false,
            silent: options.silent || false,
            timestamp: options.timestamp || Date.now(),
            actions: options.actions || [],
            ...options
        };

        try {
            if (this.androidBridge) {
                return await this.androidBridge.sendToAndroid('notification_show', config);
            }
            
            if (this.iosBridge) {
                return await this.iosBridge.sendToIOS('notification_show', config);
            }
            
            // Web notification
            return await this.showWebNotification(config);
            
        } catch (error) {
            throw new Error(`Failed to show notification: ${error.message}`);
        }
    }

    async showWebNotification(config) {
        if ('serviceWorker' in navigator && 'showNotification' in ServiceWorkerRegistration.prototype) {
            // Use service worker for better notification handling
            const registration = await navigator.serviceWorker.ready;
            await registration.showNotification(config.title, {
                body: config.body,
                icon: config.icon,
                badge: config.badge,
                image: config.image,
                tag: config.tag,
                data: config.data,
                requireInteraction: config.requireInteraction,
                silent: config.silent,
                timestamp: config.timestamp,
                actions: config.actions
            });
            
            return { success: true, id: config.tag };
        } else if ('Notification' in window) {
            // Fallback to basic notification
            const notification = new Notification(config.title, {
                body: config.body,
                icon: config.icon,
                tag: config.tag,
                data: config.data,
                requireInteraction: config.requireInteraction,
                silent: config.silent
            });
            
            // Handle notification events
            notification.onclick = (event) => {
                event.preventDefault();
                window.focus();
                this.handleNotificationClick(config.data);
            };
            
            return { success: true, id: config.tag, notification: notification };
        } else {
            throw new Error('Notifications not supported');
        }
    }

    async scheduleNotification(title, options = {}, scheduleTime) {
        const config = {
            title: title,
            ...options,
            scheduleTime: scheduleTime
        };

        try {
            if (this.androidBridge) {
                return await this.androidBridge.sendToAndroid('notification_schedule', config);
            }
            
            if (this.iosBridge) {
                return await this.iosBridge.sendToIOS('notification_schedule', config);
            }
            
            // Web scheduled notification (using setTimeout as fallback)
            const delay = scheduleTime - Date.now();
            if (delay > 0) {
                setTimeout(() => {
                    this.showNotification(title, options);
                }, delay);
                
                return { 
                    success: true, 
                    id: config.tag || `scheduled_${Date.now()}`,
                    scheduledFor: scheduleTime
                };
            } else {
                throw new Error('Schedule time must be in the future');
            }
            
        } catch (error) {
            throw new Error(`Failed to schedule notification: ${error.message}`);
        }
    }

    async cancelNotification(notificationId) {
        try {
            if (this.androidBridge) {
                return await this.androidBridge.sendToAndroid('notification_cancel', { id: notificationId });
            }
            
            if (this.iosBridge) {
                return await this.iosBridge.sendToIOS('notification_cancel', { id: notificationId });
            }
            
            // Web notification cancellation
            if ('serviceWorker' in navigator) {
                const registration = await navigator.serviceWorker.ready;
                const notifications = await registration.getNotifications({ tag: notificationId });
                notifications.forEach(notification => notification.close());
                
                return { success: true, cancelled: notifications.length };
            }
            
            return { success: false, error: 'Cannot cancel web notifications' };
            
        } catch (error) {
            throw new Error(`Failed to cancel notification: ${error.message}`);
        }
    }

    async getActiveNotifications() {
        try {
            if (this.androidBridge) {
                return await this.androidBridge.sendToAndroid('notification_get_active', {});
            }
            
            if (this.iosBridge) {
                return await this.iosBridge.sendToIOS('notification_get_active', {});
            }
            
            // Web active notifications
            if ('serviceWorker' in navigator) {
                const registration = await navigator.serviceWorker.ready;
                const notifications = await registration.getNotifications();
                
                return {
                    success: true,
                    notifications: notifications.map(n => ({
                        id: n.tag,
                        title: n.title,
                        body: n.body,
                        data: n.data,
                        timestamp: n.timestamp
                    }))
                };
            }
            
            return { success: true, notifications: [] };
            
        } catch (error) {
            throw new Error(`Failed to get active notifications: ${error.message}`);
        }
    }

    async clearAllNotifications() {
        try {
            if (this.androidBridge) {
                return await this.androidBridge.sendToAndroid('notification_clear_all', {});
            }
            
            if (this.iosBridge) {
                return await this.iosBridge.sendToIOS('notification_clear_all', {});
            }
            
            // Web clear all notifications
            if ('serviceWorker' in navigator) {
                const registration = await navigator.serviceWorker.ready;
                const notifications = await registration.getNotifications();
                notifications.forEach(notification => notification.close());
                
                return { success: true, cleared: notifications.length };
            }
            
            return { success: true, cleared: 0 };
            
        } catch (error) {
            throw new Error(`Failed to clear notifications: ${error.message}`);
        }
    }

    handleNotificationClick(data) {
        // Emit custom event for notification click
        window.dispatchEvent(new CustomEvent('notificationClick', {
            detail: data
        }));
        
        // Handle deep linking or navigation based on data
        if (data && data.action) {
            switch (data.action) {
                case 'open_resident':
                    window.location.hash = `#/residents/${data.residentId}`;
                    break;
                case 'open_payment':
                    window.location.hash = `#/payments/${data.paymentId}`;
                    break;
                case 'open_maintenance':
                    window.location.hash = `#/maintenance/${data.workOrderId}`;
                    break;
                default:
                    window.location.hash = '#/dashboard';
            }
        }
    }

    // Push notification methods
    async registerForPushNotifications() {
        try {
            if (this.androidBridge) {
                return await this.androidBridge.sendToAndroid('push_register', {});
            }
            
            if (this.iosBridge) {
                return await this.iosBridge.sendToIOS('push_register', {});
            }
            
            // Web push registration
            if ('serviceWorker' in navigator && 'PushManager' in window) {
                const registration = await navigator.serviceWorker.ready;
                
                const subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: this.urlBase64ToUint8Array(
                        'YOUR_VAPID_PUBLIC_KEY' // Replace with actual VAPID key
                    )
                });
                
                return {
                    success: true,
                    subscription: subscription,
                    endpoint: subscription.endpoint
                };
            }
            
            throw new Error('Push notifications not supported');
            
        } catch (error) {
            throw new Error(`Failed to register for push notifications: ${error.message}`);
        }
    }

    async unregisterFromPushNotifications() {
        try {
            if (this.androidBridge) {
                return await this.androidBridge.sendToAndroid('push_unregister', {});
            }
            
            if (this.iosBridge) {
                return await this.iosBridge.sendToIOS('push_unregister', {});
            }
            
            // Web push unregistration
            if ('serviceWorker' in navigator && 'PushManager' in window) {
                const registration = await navigator.serviceWorker.ready;
                const subscription = await registration.pushManager.getSubscription();
                
                if (subscription) {
                    await subscription.unsubscribe();
                    return { success: true };
                }
                
                return { success: true, message: 'No active subscription' };
            }
            
            throw new Error('Push notifications not supported');
            
        } catch (error) {
            throw new Error(`Failed to unregister from push notifications: ${error.message}`);
        }
    }

    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');
        
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        
        return outputArray;
    }
}

// ============= STORAGE-BRIDGE.JS =============
class StorageBridge {
    constructor() {
        this.androidBridge = window.AndroidBridge ? new window.AndroidBridge() : null;
        this.iosBridge = window.IOSBridge ? new window.IOSBridge() : null;
        this.isSupported = this.checkSupport();
    }

    checkSupport() {
        return !!(this.androidBridge || this.iosBridge || 
                 window.localStorage || window.sessionStorage);
    }

    // Secure storage methods
    async setSecure(key, value) {
        try {
            if (this.androidBridge) {
                return await this.androidBridge.sendToAndroid('secure_storage_set', { key, value });
            }
            
            if (this.iosBridge) {
                return await this.iosBridge.sendToIOS('secure_storage_set', { key, value });
            }
            
            // Web fallback (encrypted localStorage)
            const encrypted = await this.encryptValue(value);
            localStorage.setItem(`secure_${key}`, encrypted);
            
            return { success: true };
            
        } catch (error) {
            throw new Error(`Failed to set secure value: ${error.message}`);
        }
    }

    async getSecure(key) {
        try {
            if (this.androidBridge) {
                return await this.androidBridge.sendToAndroid('secure_storage_get', { key });
            }
            
            if (this.iosBridge) {
                return await this.iosBridge.sendToIOS('secure_storage_get', { key });
            }
            
            // Web fallback (decrypt from localStorage)
            const encrypted = localStorage.getItem(`secure_${key}`);
            if (!encrypted) {
                return { success: true, value: null };
            }
            
            const decrypted = await this.decryptValue(encrypted);
            return { success: true, value: decrypted };
            
        } catch (error) {
            throw new Error(`Failed to get secure value: ${error.message}`);
        }
    }

    async removeSecure(key) {
        try {
            if (this.androidBridge) {
                return await this.androidBridge.sendToAndroid('secure_storage_remove', { key });
            }
            
            if (this.iosBridge) {
                return await this.iosBridge.sendToIOS('secure_storage_remove', { key });
            }
            
            // Web fallback
            localStorage.removeItem(`secure_${key}`);
            return { success: true };
            
        } catch (error) {
            throw new Error(`Failed to remove secure value: ${error.message}`);
        }
    }

    // Regular storage methods
    async set(key, value, options = {}) {
        try {
            const config = {
                key,
                value: JSON.stringify(value),
                persistent: options.persistent !== false,
                encrypted: options.encrypted || false,
                expiry: options.expiry
            };

            if (this.androidBridge) {
                return await this.androidBridge.sendToAndroid('storage_set', config);
            }
            
            if (this.iosBridge) {
                return await this.iosBridge.sendToIOS('storage_set', config);
            }
            
            // Web storage
            const storage = config.persistent ? localStorage : sessionStorage;
            const data = {
                value: config.value,
                timestamp: Date.now(),
                expiry: config.expiry
            };
            
            if (config.encrypted) {
                data.value = await this.encryptValue(config.value);
                data.encrypted = true;
            }
            
            storage.setItem(key, JSON.stringify(data));
            return { success: true };
            
        } catch (error) {
            throw new Error(`Failed to set value: ${error.message}`);
        }
    }

    async get(key, options = {}) {
        try {
            const config = {
                key,
                persistent: options.persistent !== false
            };

            if (this.androidBridge) {
                const result = await this.androidBridge.sendToAndroid('storage_get', config);
                return result.value ? JSON.parse(result.value) : null;
            }
            
            if (this.iosBridge) {
                const result = await this.iosBridge.sendToIOS('storage_get', config);
                return result.value ? JSON.parse(result.value) : null;
            }
            
            // Web storage
            const storage = config.persistent ? localStorage : sessionStorage;
            const item = storage.getItem(key);
            
            if (!item) return null;
            
            const data = JSON.parse(item);
            
            // Check expiry
            if (data.expiry && Date.now() > data.expiry) {
                storage.removeItem(key);
                return null;
            }
            
            let value = data.value;
            
            // Decrypt if needed
            if (data.encrypted) {
                value = await this.decryptValue(value);
            }
            
            return JSON.parse(value);
            
        } catch (error) {
            console.error(`Failed to get value for key ${key}:`, error);
            return null;
        }
    }

    async remove(key, options = {}) {
        try {
            const config = {
                key,
                persistent: options.persistent !== false
            };

            if (this.androidBridge) {
                return await this.androidBridge.sendToAndroid('storage_remove', config);
            }
            
            if (this.iosBridge) {
                return await this.iosBridge.sendToIOS('storage_remove', config);
            }
            
            // Web storage
            const storage = config.persistent ? localStorage : sessionStorage;
            storage.removeItem(key);
            
            return { success: true };
            
        } catch (error) {
            throw new Error(`Failed to remove value: ${error.message}`);
        }
    }

    async clear(options = {}) {
        try {
            const config = {
                persistent: options.persistent !== false,
                prefix: options.prefix
            };

            if (this.androidBridge) {
                return await this.androidBridge.sendToAndroid('storage_clear', config);
            }
            
            if (this.iosBridge) {
                return await this.iosBridge.sendToIOS('storage_clear', config);
            }
            
            // Web storage
            const storage = config.persistent ? localStorage : sessionStorage;
            
            if (config.prefix) {
                // Clear only keys with specific prefix
                const keysToRemove = [];
                for (let i = 0; i < storage.length; i++) {
                    const key = storage.key(i);
                    if (key && key.startsWith(config.prefix)) {
                        keysToRemove.push(key);
                    }
                }
                keysToRemove.forEach(key => storage.removeItem(key));
            } else {
                storage.clear();
            }
            
            return { success: true };
            
        } catch (error) {
            throw new Error(`Failed to clear storage: ${error.message}`);
        }
    }

    async getKeys(options = {}) {
        try {
            const config = {
                persistent: options.persistent !== false,
                prefix: options.prefix
            };

            if (this.androidBridge) {
                return await this.androidBridge.sendToAndroid('storage_get_keys', config);
            }
            
            if (this.iosBridge) {
                return await this.iosBridge.sendToIOS('storage_get_keys', config);
            }
            
            // Web storage
            const storage = config.persistent ? localStorage : sessionStorage;
            const keys = [];
            
            for (let i = 0; i < storage.length; i++) {
                const key = storage.key(i);
                if (key && (!config.prefix || key.startsWith(config.prefix))) {
                    keys.push(key);
                }
            }
            
            return { success: true, keys };
            
        } catch (error) {
            throw new Error(`Failed to get keys: ${error.message}`);
        }
    }

    async getSize(options = {}) {
        try {
            const config = {
                persistent: options.persistent !== false
            };

            if (this.androidBridge) {
                return await this.androidBridge.sendToAndroid('storage_get_size', config);
            }
            
            if (this.iosBridge) {
                return await this.iosBridge.sendToIOS('storage_get_size', config);
            }
            
            // Web storage size calculation
            const storage = config.persistent ? localStorage : sessionStorage;
            let totalSize = 0;
            
            for (let i = 0; i < storage.length; i++) {
                const key = storage.key(i);
                if (key) {
                    const value = storage.getItem(key);
                    totalSize += key.length + (value ? value.length : 0);
                }
            }
            
            return { 
                success: true, 
                size: totalSize,
                sizeFormatted: this.formatBytes(totalSize)
            };
            
        } catch (error) {
            throw new Error(`Failed to get storage size: ${error.message}`);
        }
    }

    // Encryption helpers for web
    async encryptValue(value) {
        if (!window.crypto || !window.crypto.subtle) {
            // Fallback: simple base64 encoding (not secure)
            return btoa(value);
        }
        
        try {
            const key = await this.getOrCreateEncryptionKey();
            const encoder = new TextEncoder();
            const data = encoder.encode(value);
            const iv = window.crypto.getRandomValues(new Uint8Array(12));
            
            const encrypted = await window.crypto.subtle.encrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                data
            );
            
            const result = new Uint8Array(iv.length + encrypted.byteLength);
            result.set(iv);
            result.set(new Uint8Array(encrypted), iv.length);
            
            return btoa(String.fromCharCode(...result));
        } catch (error) {
            console.error('Encryption failed, using base64:', error);
            return btoa(value);
        }
    }

    async decryptValue(encryptedValue) {
        if (!window.crypto || !window.crypto.subtle) {
            // Fallback: simple base64 decoding
            try {
                return atob(encryptedValue);
            } catch (error) {
                return encryptedValue;
            }
        }
        
        try {
            const key = await this.getOrCreateEncryptionKey();
            const data = new Uint8Array(
                atob(encryptedValue).split('').map(char => char.charCodeAt(0))
            );
            
            const iv = data.slice(0, 12);
            const encrypted = data.slice(12);
            
            const decrypted = await window.crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                encrypted
            );
            
            const decoder = new TextDecoder();
            return decoder.decode(decrypted);
        } catch (error) {
            console.error('Decryption failed, trying base64:', error);
            try {
                return atob(encryptedValue);
            } catch (e) {
                return encryptedValue;
            }
        }
    }

    async getOrCreateEncryptionKey() {
        const keyName = 'condoconnectai_encryption_key';
        
        // Try to get existing key
        let keyData = localStorage.getItem(keyName);
        
        if (!keyData) {
            // Generate new key
            const key = await window.crypto.subtle.generateKey(
                { name: 'AES-GCM', length: 256 },
                true,
                ['encrypt', 'decrypt']
            );
            
            const exported = await window.crypto.subtle.exportKey('raw', key);
            keyData = btoa(String.fromCharCode(...new Uint8Array(exported)));
            localStorage.setItem(keyName, keyData);
        }
        
        // Import key
        const keyBuffer = new Uint8Array(
            atob(keyData).split('').map(char => char.charCodeAt(0))
        );
        
        return await window.crypto.subtle.importKey(
            'raw',
            keyBuffer,
            { name: 'AES-GCM' },
            false,
            ['encrypt', 'decrypt']
        );
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// ============= SECURITY-BRIDGE.JS =============
class SecurityBridge {
    constructor() {
        this.androidBridge = window.AndroidBridge ? new window.AndroidBridge() : null;
        this.iosBridge = window.IOSBridge ? new window.IOSBridge() : null;
        this.isSupported = this.checkSupport();
    }

    checkSupport() {
        return !!(this.androidBridge || this.iosBridge || window.crypto);
    }

    // Certificate pinning
    async enableCertificatePinning(domains) {
        try {
            if (this.androidBridge) {
                return await this.androidBridge.sendToAndroid('security_cert_pinning', { domains });
            }
            
            if (this.iosBridge) {
                return await this.iosBridge.sendToIOS('security_cert_pinning', { domains });
            }
            
            // Web: Certificate pinning is handled by HPKP headers
            console.warn('Certificate pinning should be configured via HTTP headers on web');
            return { success: true, message: 'Configure HPKP headers on server' };
            
        } catch (error) {
            throw new Error(`Failed to enable certificate pinning: ${error.message}`);
        }
    }

    // Root/Jailbreak detection
    async detectRootJailbreak() {
        try {
            if (this.androidBridge) {
                return await this.androidBridge.sendToAndroid('security_root_detection', {});
            }
            
            if (this.iosBridge) {
                return await this.iosBridge.sendToIOS('security_jailbreak_detection', {});
            }
            
            // Web: Limited detection capabilities
            return await this.webSecurityCheck();
            
        } catch (error) {
            throw new Error(`Failed to detect root/jailbreak: ${error.message}`);
        }
    }

    async webSecurityCheck() {
        const checks = {
            isRooted: false,
            isJailbroken: false,
            isEmulator: false,
            isDebugger: false,
            securityWarnings: []
        };

        // Check for common debugging tools
        if (window.console && typeof window.console.clear === 'function') {
            const start = performance.now();
            console.clear();
            const end = performance.now();
            
            if (end - start > 100) {
                checks.isDebugger = true;
                checks.securityWarnings.push('Developer tools may be open');
            }
        }

        // Check for common emulator indicators
        if (navigator.userAgent.includes('Emulator') || 
            navigator.userAgent.includes('Simulator')) {
            checks.isEmulator = true;
            checks.securityWarnings.push('Running in emulator/simulator');
        }

        // Check for suspicious global variables
        const suspiciousGlobals = ['__REACT_DEVTOOLS_GLOBAL_HOOK__', '__VUE_DEVTOOLS_GLOBAL_HOOK__'];
        for (const global of suspiciousGlobals) {
            if (window[global]) {
                checks.isDebugger = true;
                checks.securityWarnings.push('Development tools detected');
                break;
            }
        }

        return {
            success: true,
            ...checks
        };
    }

    // App integrity verification
    async verifyAppIntegrity() {
        try {
            if (this.androidBridge) {
                return await this.androidBridge.sendToAndroid('security_app_integrity', {});
            }
            
            if (this.iosBridge) {
                return await this.iosBridge.sendToIOS('security_app_integrity', {});
            }
            
            // Web: Check for tampering
            return await this.webIntegrityCheck();
            
        } catch (error) {
            throw new Error(`Failed to verify app integrity: ${error.message}`);
        }
    }

    async webIntegrityCheck() {
        const checks = {
            isIntact: true,
            warnings: []
        };

        // Check if critical scripts are modified
        const scripts = document.querySelectorAll('script[src]');
        for (const script of scripts) {
            if (script.src.includes('condoconnectai') && !script.integrity) {
                checks.warnings.push('Script without integrity check detected');
            }
        }

        // Check for suspicious modifications
        if (document.documentElement.getAttribute('data-modified')) {
            checks.isIntact = false;
            checks.warnings.push('DOM modifications detected');
        }

        return {
            success: true,
            ...checks
        };
    }

    // Network security
    async enableNetworkSecurity(config = {}) {
        const securityConfig = {
            enableSSLPinning: config.enableSSLPinning || true,
            allowInsecureConnections: config.allowInsecureConnections || false,
            trustedDomains: config.trustedDomains || [],
            blockedDomains: config.blockedDomains || [],
            ...config
        };

        try {
            if (this.androidBridge) {
                return await this.androidBridge.sendToAndroid('security_network_config', securityConfig);
            }
            
            if (this.iosBridge) {
                return await this.iosBridge.sendToIOS('security_network_config', securityConfig);
            }
            
            // Web: Configure CSP and other security headers
            return this.webNetworkSecurity(securityConfig);
            
        } catch (error) {
            throw new Error(`Failed to configure network security: ${error.message}`);
        }
    }

    webNetworkSecurity(config) {
        // Check current security headers
        const securityHeaders = {
            'Content-Security-Policy': document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.content,
            'Strict-Transport-Security': 'Check server headers',
            'X-Frame-Options': 'Check server headers',
            'X-Content-Type-Options': 'Check server headers'
        };

        return {
            success: true,
            message: 'Network security should be configured via server headers',
            currentHeaders: securityHeaders,
            recommendations: [
                'Configure CSP headers',
                'Enable HSTS',
                'Set X-Frame-Options',
                'Set X-Content-Type-Options'
            ]
        };
    }

    // Data encryption
    async encryptData(data, key) {
        try {
            if (this.androidBridge) {
                return await this.androidBridge.sendToAndroid('security_encrypt', { data, key });
            }
            
            if (this.iosBridge) {
                return await this.iosBridge.sendToIOS('security_encrypt', { data, key });
            }
            
            // Web encryption
            return await this.webEncrypt(data, key);
            
        } catch (error) {
            throw new Error(`Failed to encrypt data: ${error.message}`);
        }
    }

    async decryptData(encryptedData, key) {
        try {
            if (this.androidBridge) {
                return await this.androidBridge.sendToAndroid('security_decrypt', { encryptedData, key });
            }
            
            if (this.iosBridge) {
                return await this.iosBridge.sendToIOS('security_decrypt', { encryptedData, key });
            }
            
            // Web decryption
            return await this.webDecrypt(encryptedData, key);
            
        } catch (error) {
            throw new Error(`Failed to decrypt data: ${error.message}`);
        }
    }

    async webEncrypt(data, key) {
        if (!window.crypto || !window.crypto.subtle) {
            throw new Error('Web Crypto API not supported');
        }

        const encoder = new TextEncoder();
        const keyData = encoder.encode(key.padEnd(32, '0').substring(0, 32));
        
        const cryptoKey = await window.crypto.subtle.importKey(
            'raw',
            keyData,
            { name: 'AES-GCM' },
            false,
            ['encrypt']
        );

        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const encodedData = encoder.encode(JSON.stringify(data));

        const encrypted = await window.crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv },
            cryptoKey,
            encodedData
        );

        const result = new Uint8Array(iv.length + encrypted.byteLength);
        result.set(iv);
        result.set(new Uint8Array(encrypted), iv.length);

        return {
            success: true,
            encryptedData: btoa(String.fromCharCode(...result))
        };
    }

    async webDecrypt(encryptedData, key) {
        if (!window.crypto || !window.crypto.subtle) {
            throw new Error('Web Crypto API not supported');
        }

        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        const keyData = encoder.encode(key.padEnd(32, '0').substring(0, 32));
        
        const cryptoKey = await window.crypto.subtle.importKey(
            'raw',
            keyData,
            { name: 'AES-GCM' },
            false,
            ['decrypt']
        );

        const data = new Uint8Array(
            atob(encryptedData).split('').map(char => char.charCodeAt(0))
        );

        const iv = data.slice(0, 12);
        const encrypted = data.slice(12);

        const decrypted = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv },
            cryptoKey,
            encrypted
        );

        const decryptedText = decoder.decode(decrypted);
        
        return {
            success: true,
            data: JSON.parse(decryptedText)
        };
    }

    // Hash generation
    async generateHash(data, algorithm = 'SHA-256') {
        try {
            if (this.androidBridge) {
                return await this.androidBridge.sendToAndroid('security_hash', { data, algorithm });
            }
            
            if (this.iosBridge) {
                return await this.iosBridge.sendToIOS('security_hash', { data, algorithm });
            }
            
            // Web hash generation
            return await this.webGenerateHash(data, algorithm);
            
        } catch (error) {
            throw new Error(`Failed to generate hash: ${error.message}`);
        }
    }

    async webGenerateHash(data, algorithm) {
        if (!window.crypto || !window.crypto.subtle) {
            throw new Error('Web Crypto API not supported');
        }

        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(JSON.stringify(data));
        
        const hashBuffer = await window.crypto.subtle.digest(algorithm, dataBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        return {
            success: true,
            hash: hashHex,
            algorithm: algorithm
        };
    }

    // Secure random generation
    async generateSecureRandom(length = 32) {
        try {
            if (this.androidBridge) {
                return await this.androidBridge.sendToAndroid('security_random', { length });
            }
            
            if (this.iosBridge) {
                return await this.iosBridge.sendToIOS('security_random', { length });
            }
            
            // Web secure random
            if (window.crypto && window.crypto.getRandomValues) {
                const array = new Uint8Array(length);
                window.crypto.getRandomValues(array);
                
                return {
                    success: true,
                    random: Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('')
                };
            }
            
            throw new Error('Secure random generation not supported');
            
        } catch (error) {
            throw new Error(`Failed to generate secure random: ${error.message}`);
        }
    }
}

// ============= UTILS.JS COMPLETO =============
class HybridUtils {
    static formatDate(date, format = 'YYYY-MM-DD') {
        if (!date) return '';
        
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');
        
        return format
            .replace('YYYY', year)
            .replace('MM', month)
            .replace('DD', day)
            .replace('HH', hours)
            .replace('mm', minutes)
            .replace('ss', seconds);
    }

    static formatCurrency(amount, currency = 'USD', locale = 'en-US') {
        if (typeof amount !== 'number') return '$0.00';
        
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency
        }).format(amount);
    }

    static formatPhone(phone, format = 'US') {
        if (!phone) return '';
        
        const cleaned = phone.replace(/\D/g, '');
        
        switch (format) {
            case 'US':
                if (cleaned.length === 10) {
                    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
                }
                break;
            case 'INTERNATIONAL':
                if (cleaned.length >= 10) {
                    return `+${cleaned.slice(0, -10)} ${cleaned.slice(-10, -7)} ${cleaned.slice(-7, -4)} ${cleaned.slice(-4)}`;
                }
                break;
        }
        
        return phone;
    }

    static validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    static validatePhone(phone) {
        const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
        return phoneRegex.test(phone);
    }

    static generateUUID() {
        if (window.crypto && window.crypto.randomUUID) {
            return window.crypto.randomUUID();
        }
        
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    static debounce(func, wait, immediate = false) {
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

    static throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    static deepClone(obj) {
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

    static isOnline() {
        return navigator.onLine;
    }

    static getDeviceType() {
        const userAgent = navigator.userAgent.toLowerCase();
        
        if (/android/.test(userAgent)) {
            return 'android';
        } else if (/iphone|ipad|ipod/.test(userAgent)) {
            return 'ios';
        } else if (/windows phone/.test(userAgent)) {
            return 'windows';
        } else {
            return 'web';
        }
    }

    static isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    static isTablet() {
        return /iPad|Android(?!.*Mobile)/i.test(navigator.userAgent);
    }

    static getScreenSize() {
        return {
            width: window.screen.width,
            height: window.screen.height,
            availWidth: window.screen.availWidth,
            availHeight: window.screen.availHeight,
            devicePixelRatio: window.devicePixelRatio || 1
        };
    }

    static formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    static sanitizeHTML(str) {
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    }

    static escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    static capitalizeFirst(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    static capitalizeWords(str) {
        if (!str) return '';
        return str.replace(/\w\S*/g, (txt) => 
            txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        );
    }

    static truncateText(text, maxLength, suffix = '...') {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength - suffix.length) + suffix;
    }

    static getRelativeTime(date) {
        const now = new Date();
        const diffInSeconds = Math.floor((now - new Date(date)) / 1000);
        
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
                return `hace ${interval} ${unit}${interval > 1 ? 's' : ''}`;
            }
        }
        
        return 'hace un momento';
    }

    static parseQueryString(queryString) {
        const params = {};
        const pairs = (queryString || window.location.search.slice(1)).split('&');
        
        for (const pair of pairs) {
            const [key, value] = pair.split('=');
            if (key) {
                params[decodeURIComponent(key)] = decodeURIComponent(value || '');
            }
        }
        
        return params;
    }

    static buildQueryString(params) {
        return Object.entries(params)
            .filter(([key, value]) => value !== null && value !== undefined)
            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
            .join('&');
    }

    static loadScript(src, async = true) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.async = async;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    static loadCSS(href) {
        return new Promise((resolve, reject) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            link.onload = resolve;
            link.onerror = reject;
            document.head.appendChild(link);
        });
    }

    static async copyToClipboard(text) {
        if (navigator.clipboard && window.isSecureContext) {
            try {
                await navigator.clipboard.writeText(text);
                return { success: true };
            } catch (error) {
                return { success: false, error: error.message };
            }
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            try {
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                return { success: successful };
            } catch (error) {
                document.body.removeChild(textArea);
                return { success: false, error: error.message };
            }
        }
    }

    static async readFromClipboard() {
        if (navigator.clipboard && window.isSecureContext) {
            try {
                const text = await navigator.clipboard.readText();
                return { success: true, text };
            } catch (error) {
                return { success: false, error: error.message };
            }
        } else {
            return { success: false, error: 'Clipboard API not supported' };
        }
    }

    static createEventEmitter() {
        const events = {};
        
        return {
            on(event, callback) {
                if (!events[event]) events[event] = [];
                events[event].push(callback);
            },
            
            off(event, callback) {
                if (!events[event]) return;
                events[event] = events[event].filter(cb => cb !== callback);
            },
            
            emit(event, ...args) {
                if (!events[event]) return;
                events[event].forEach(callback => callback(...args));
            },
            
            once(event, callback) {
                const onceCallback = (...args) => {
                    callback(...args);
                    this.off(event, onceCallback);
                };
                this.on(event, onceCallback);
            }
        };
    }

    static retry(fn, maxAttempts = 3, delay = 1000) {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            
            const attempt = async () => {
                try {
                    const result = await fn();
                    resolve(result);
                } catch (error) {
                    attempts++;
                    if (attempts >= maxAttempts) {
                        reject(error);
                    } else {
                        setTimeout(attempt, delay * attempts);
                    }
                }
            };
            
            attempt();
        });
    }

    static timeout(promise, ms) {
        return Promise.race([
            promise,
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Operation timed out')), ms)
            )
        ]);
    }

    static batchProcess(items, batchSize, processor) {
        return new Promise(async (resolve, reject) => {
            try {
                const results = [];
                
                for (let i = 0; i < items.length; i += batchSize) {
                    const batch = items.slice(i, i + batchSize);
                    const batchResults = await Promise.all(
                        batch.map(item => processor(item))
                    );
                    results.push(...batchResults);
                }
                
                resolve(results);
            } catch (error) {
                reject(error);
            }
        });
    }

    static memoize(fn, keyGenerator = (...args) => JSON.stringify(args)) {
        const cache = new Map();
        
        return (...args) => {
            const key = keyGenerator(...args);
            
            if (cache.has(key)) {
                return cache.get(key);
            }
            
            const result = fn(...args);
            cache.set(key, result);
            
            return result;
        };
    }

    static createLogger(prefix = 'CondoconnectAI') {
        const isDevelopment = process.env.NODE_ENV === 'development' || 
                             window.location.hostname === 'localhost';
        
        return {
            debug: (...args) => {
                if (isDevelopment) {
                    console.debug(`[${prefix}]`, ...args);
                }
            },
            
            info: (...args) => {
                console.info(`[${prefix}]`, ...args);
            },
            
            warn: (...args) => {
                console.warn(`[${prefix}]`, ...args);
            },
            
            error: (...args) => {
                console.error(`[${prefix}]`, ...args);
            }
        };
    }
}

// Export all classes for global use
window.CameraBridge = CameraBridge;
window.NotificationBridge = NotificationBridge;
window.StorageBridge = StorageBridge;
window.SecurityBridge = SecurityBridge;
window.HybridUtils = HybridUtils;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        AndroidBridge,
        IOSBridge,
        OfflineSync,
        AWSMobileSDK,
        BiometricBridge,
        CameraBridge,
        NotificationBridge,
        StorageBridge,
        SecurityBridge,
        HybridUtils
    };
}

// Initialize bridges when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Android Bridge
    if (window.Android) {
        window.androidBridge = new AndroidBridge();
        window.androidBridge.initialize();
    }
    
    // Initialize iOS Bridge
    if (window.webkit && window.webkit.messageHandlers) {
        window.iosBridge = new IOSBridge();
        window.iosBridge.initialize();
    }
    
    // Initialize other bridges
    window.biometricBridge = new BiometricBridge();
    window.cameraBridge = new CameraBridge();
    window.notificationBridge = new NotificationBridge();
    window.storageBridge = new StorageBridge();
    window.securityBridge = new SecurityBridge();
    
    // Initialize AWS Mobile SDK
    window.awsMobileSDK = new AWSMobileSDK();
    
    // Initialize Offline Sync
    window.offlineSync = new OfflineSync({
        tables: ['residents', 'payments', 'workOrders', 'securityEvents', 'visitors'],
        syncInterval: 300000 // 5 minutes
    });
    
    console.log('CondoconnectAI Hybrid Core initialized successfully');
});
