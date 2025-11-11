// ============= VALIDATION UTILITIES =============
class ValidationUtils {
    static validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    static validatePhone(phone) {
        const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
        return phoneRegex.test(phone);
    }

    static validatePassword(password) {
        const errors = [];
        
        if (password.length < 8) {
            errors.push('Password must be at least 8 characters long');
        }
        
        if (!/[A-Z]/.test(password)) {
            errors.push('Password must contain at least one uppercase letter');
        }
        
        if (!/[a-z]/.test(password)) {
            errors.push('Password must contain at least one lowercase letter');
        }
        
        if (!/\d/.test(password)) {
            errors.push('Password must contain at least one number');
        }
        
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
            errors.push('Password must contain at least one special character');
        }
        
        return errors;
    }

    static validateUnitNumber(unitNumber) {
        const unitRegex = /^[A-Za-z0-9\-]{1,10}$/;
        return unitRegex.test(unitNumber);
    }

    static validateAmount(amount) {
        return typeof amount === 'number' && amount > 0 && amount <= 1000000;
    }

    static validateDate(dateString) {
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date);
    }

    static validateUUID(uuid) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
    }

    static sanitizeString(str) {
        if (typeof str !== 'string') return '';
        
        return str
            .trim()
            .replace(/[<>]/g, '') // Remove potential HTML tags
            .replace(/[^\w\s\-\.@]/g, '') // Keep only alphanumeric, spaces, hyphens, dots, and @
            .substring(0, 1000); // Limit length
    }

    static validateRequired(obj, requiredFields) {
        const errors = [];
        
        requiredFields.forEach(field => {
            if (!obj[field] || (typeof obj[field] === 'string' && obj[field].trim() === '')) {
                errors.push(`${field} is required`);
            }
        });
        
        return errors;
    }
}

// ============= RESPONSE UTILITIES =============
class ResponseUtils {
    static createResponse(statusCode, body, headers = {}) {
        return {
            statusCode,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
                ...headers
            },
            body: JSON.stringify(body)
        };
    }

    static success(data, message = 'Success', statusCode = 200) {
        return this.createResponse(statusCode, {
            success: true,
            message,
            data,
            timestamp: new Date().toISOString()
        });
    }

    static error(message, statusCode = 500, errorCode = null) {
        return this.createResponse(statusCode, {
            success: false,
            error: message,
            errorCode,
            timestamp: new Date().toISOString()
        });
    }

    static validationError(errors) {
        return this.createResponse(400, {
            success: false,
            error: 'Validation failed',
            validationErrors: errors,
            timestamp: new Date().toISOString()
        });
    }

    static notFound(resource = 'Resource') {
        return this.createResponse(404, {
            success: false,
            error: `${resource} not found`,
            timestamp: new Date().toISOString()
        });
    }

    static unauthorized(message = 'Unauthorized') {
        return this.createResponse(401, {
            success: false,
            error: message,
            timestamp: new Date().toISOString()
        });
    }

    static forbidden(message = 'Forbidden') {
        return this.createResponse(403, {
            success: false,
            error: message,
            timestamp: new Date().toISOString()
        });
    }

    static conflict(message = 'Resource already exists') {
        return this.createResponse(409, {
            success: false,
            error: message,
            timestamp: new Date().toISOString()
        });
    }

    static tooManyRequests(message = 'Too many requests') {
        return this.createResponse(429, {
            success: false,
            error: message,
            timestamp: new Date().toISOString()
        });
    }
}

// ============= DATABASE UTILITIES =============
class DatabaseUtils {
    static buildUpdateExpression(data, allowedFields) {
        const updateExpressions = [];
        const expressionAttributeNames = {};
        const expressionAttributeValues = {};
        
        allowedFields.forEach(field => {
            if (data[field] !== undefined) {
                updateExpressions.push(`#${field} = :${field}`);
                expressionAttributeNames[`#${field}`] = field;
                expressionAttributeValues[`:${field}`] = data[field];
            }
        });
        
        if (updateExpressions.length === 0) {
            return null;
        }
        
        // Add updatedAt
        updateExpressions.push('#updatedAt = :updatedAt');
        expressionAttributeNames['#updatedAt'] = 'updatedAt';
        expressionAttributeValues[':updatedAt'] = new Date().toISOString();
        
        return {
            UpdateExpression: `SET ${updateExpressions.join(', ')}`,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues
        };
    }

    static buildFilterExpression(filters) {
        const conditions = [];
        const expressionAttributeNames = {};
        const expressionAttributeValues = {};
        
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                if (Array.isArray(value)) {
                    // Handle array values (IN operator)
                    const placeholders = value.map((_, index) => `:${key}${index}`);
                    conditions.push(`#${key} IN (${placeholders.join(', ')})`);
                    expressionAttributeNames[`#${key}`] = key;
                    value.forEach((val, index) => {
                        expressionAttributeValues[`:${key}${index}`] = val;
                    });
                } else if (typeof value === 'object' && value.operator) {
                    // Handle complex operators
                    conditions.push(`#${key} ${value.operator} :${key}`);
                    expressionAttributeNames[`#${key}`] = key;
                    expressionAttributeValues[`:${key}`] = value.value;
                } else {
                    // Handle simple equality
                    conditions.push(`#${key} = :${key}`);
                    expressionAttributeNames[`#${key}`] = key;
                    expressionAttributeValues[`:${key}`] = value;
                }
            }
        });
        
        if (conditions.length === 0) {
            return null;
        }
        
        return {
            FilterExpression: conditions.join(' AND '),
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues
        };
    }

    static paginateResults(items, page = 1, limit = 50) {
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedItems = items.slice(startIndex, endIndex);
        
        return {
            items: paginatedItems,
            pagination: {
                currentPage: page,
                totalItems: items.length,
                totalPages: Math.ceil(items.length / limit),
                itemsPerPage: limit,
                hasNextPage: endIndex < items.length,
                hasPreviousPage: page > 1
            }
        };
    }
}

// ============= DATE UTILITIES =============
class DateUtils {
    static formatDate(date, format = 'YYYY-MM-DD') {
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

    static addDays(date, days) {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }

    static addMonths(date, months) {
        const result = new Date(date);
        result.setMonth(result.getMonth() + months);
        return result;
    }

    static getStartOfDay(date) {
        const result = new Date(date);
        result.setHours(0, 0, 0, 0);
        return result;
    }

    static getEndOfDay(date) {
        const result = new Date(date);
        result.setHours(23, 59, 59, 999);
        return result;
    }

    static getStartOfMonth(date) {
        const result = new Date(date);
        result.setDate(1);
        result.setHours(0, 0, 0, 0);
        return result;
    }

    static getEndOf
// ============= VALIDATION UTILITIES =============
class ValidationUtils {
    static validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    static validatePhone(phone) {
        const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
        return phoneRegex.test(phone);
    }

    static validatePassword(password) {
        const errors = [];
        
        if (password.length < 8) {
            errors.push('Password must be at least 8 characters long');
        }
        
        if (!/[A-Z]/.test(password)) {
            errors.push('Password must contain at least one uppercase letter');
        }
        
        if (!/[a-z]/.test(password)) {
            errors.push('Password must contain at least one lowercase letter');
        }
        
        if (!/\d/.test(password)) {
            errors.push('Password must contain at least one number');
        }
        
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
            errors.push('Password must contain at least one special character');
        }
        
        return errors;
    }

    static validateUnitNumber(unitNumber) {
        const unitRegex = /^[A-Za-z0-9\-]{1,10}$/;
        return unitRegex.test(unitNumber);
    }

    static validateAmount(amount) {
        return typeof amount === 'number' && amount > 0 && amount <= 1000000;
    }

    static validateDate(dateString) {
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date);
    }

    static validateUUID(uuid) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
    }

    static sanitizeString(str) {
        if (typeof str !== 'string') return '';
        
        return str
            .trim()
            .replace(/[<>]/g, '')
            .replace(/[^\w\s\-\.@]/g, '')
            .substring(0, 1000);
    }

    static validateRequired(obj, requiredFields) {
        const errors = [];
        
        requiredFields.forEach(field => {
            if (!obj[field] || (typeof obj[field] === 'string' && obj[field].trim() === '')) {
                errors.push(`${field} is required`);
            }
        });
        
        return errors;
    }
}

// ============= RESPONSE UTILITIES =============
class ResponseUtils {
    static createResponse(statusCode, body, headers = {}) {
        return {
            statusCode,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
                ...headers
            },
            body: JSON.stringify(body)
        };
    }

    static success(data, message = 'Success', statusCode = 200) {
        return this.createResponse(statusCode, {
            success: true,
            message,
            data,
            timestamp: new Date().toISOString()
        });
    }

    static error(message, statusCode = 500, errorCode = null) {
        return this.createResponse(statusCode, {
            success: false,
            error: message,
            errorCode,
            timestamp: new Date().toISOString()
        });
    }

    static validationError(errors) {
        return this.createResponse(400, {
            success: false,
            error: 'Validation failed',
            validationErrors: errors,
            timestamp: new Date().toISOString()
        });
    }

    static notFound(resource = 'Resource') {
        return this.createResponse(404, {
            success: false,
            error: `${resource} not found`,
            timestamp: new Date().toISOString()
        });
    }

    static unauthorized(message = 'Unauthorized') {
        return this.createResponse(401, {
            success: false,
            error: message,
            timestamp: new Date().toISOString()
        });
    }

    static forbidden(message = 'Forbidden') {
        return this.createResponse(403, {
            success: false,
            error: message,
            timestamp: new Date().toISOString()
        });
    }

    static conflict(message = 'Resource already exists') {
        return this.createResponse(409, {
            success: false,
            error: message,
            timestamp: new Date().toISOString()
        });
    }

    static tooManyRequests(message = 'Too many requests') {
        return this.createResponse(429, {
            success: false,
            error: message,
            timestamp: new Date().toISOString()
        });
    }
}

// ============= DATABASE UTILITIES =============
class DatabaseUtils {
    static buildUpdateExpression(data, allowedFields) {
        const updateExpressions = [];
        const expressionAttributeNames = {};
        const expressionAttributeValues = {};
        
        allowedFields.forEach(field => {
            if (data[field] !== undefined) {
                updateExpressions.push(`#${field} = :${field}`);
                expressionAttributeNames[`#${field}`] = field;
                expressionAttributeValues[`:${field}`] = data[field];
            }
        });
        
        if (updateExpressions.length === 0) {
            return null;
        }
        
        updateExpressions.push('#updatedAt = :updatedAt');
        expressionAttributeNames['#updatedAt'] = 'updatedAt';
        expressionAttributeValues[':updatedAt'] = new Date().toISOString();
        
        return {
            UpdateExpression: `SET ${updateExpressions.join(', ')}`,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues
        };
    }

    static buildFilterExpression(filters) {
        const conditions = [];
        const expressionAttributeNames = {};
        const expressionAttributeValues = {};
        
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                if (Array.isArray(value)) {
                    const placeholders = value.map((_, index) => `:${key}${index}`);
                    conditions.push(`#${key} IN (${placeholders.join(', ')})`);
                    expressionAttributeNames[`#${key}`] = key;
                    value.forEach((val, index) => {
                        expressionAttributeValues[`:${key}${index}`] = val;
                    });
                } else if (typeof value === 'object' && value.operator) {
                    conditions.push(`#${key} ${value.operator} :${key}`);
                    expressionAttributeNames[`#${key}`] = key;
                    expressionAttributeValues[`:${key}`] = value.value;
                } else {
                    conditions.push(`#${key} = :${key}`);
                    expressionAttributeNames[`#${key}`] = key;
                    expressionAttributeValues[`:${key}`] = value;
                }
            }
        });
        
        if (conditions.length === 0) {
            return null;
        }
        
        return {
            FilterExpression: conditions.join(' AND '),
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues
        };
    }

    static paginateResults(items, page = 1, limit = 50) {
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedItems = items.slice(startIndex, endIndex);
        
        return {
            items: paginatedItems,
            pagination: {
                currentPage: page,
                totalItems: items.length,
                totalPages: Math.ceil(items.length / limit),
                itemsPerPage: limit,
                hasNextPage: endIndex < items.length,
                hasPreviousPage: page > 1
            }
        };
    }
}

// ============= DATE UTILITIES =============
class DateUtils {
    static formatDate(date, format = 'YYYY-MM-DD') {
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

    static addDays(
// ============= VALIDATION UTILITIES =============
class ValidationUtils {
    static validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    static validatePhone(phone) {
        const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
        return phoneRegex.test(phone);
    }

    static validatePassword(password) {
        const errors = [];
        if (password.length < 8) errors.push('Password must be at least 8 characters long');
        if (!/[A-Z]/.test(password)) errors.push('Password must contain at least one uppercase letter');
        if (!/[a-z]/.test(password)) errors.push('Password must contain at least one lowercase letter');
        if (!/\d/.test(password)) errors.push('Password must contain at least one number');
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push('Password must contain at least one special character');
        return errors;
    }

    static validateUUID(uuid) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
    }

    static sanitizeString(str) {
        if (typeof str !== 'string') return '';
        return str.trim().replace(/[<>]/g, '').replace(/[^\w\s\-\.@]/g, '').substring(0, 1000);
    }
}

// ============= RESPONSE UTILITIES =============
class ResponseUtils {
    static createResponse(statusCode, body, headers = {}) {
        return {
            statusCode,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
                ...headers
            },
            body: JSON.stringify(body)
        };
    }

    static success(data, message = 'Success', statusCode = 200) {
        return this.createResponse(statusCode, {
            success: true,
            message,
            data,
            timestamp: new Date().toISOString()
        });
    }

    static error(message, statusCode = 500, errorCode = null) {
        return this.createResponse(statusCode, {
            success: false,
            error: message,
            errorCode,
            timestamp: new Date().toISOString()
        });
    }

    static validationError(errors) {
        return this.createResponse(400, {
            success: false,
            error: 'Validation failed',
            validationErrors: errors,
            timestamp: new Date().toISOString()
        });
    }

    static notFound(resource = 'Resource') {
        return this.createResponse(404, {
            success: false,
            error: `${resource} not found`,
            timestamp: new Date().toISOString()
        });
    }
}

// ============= DATABASE UTILITIES =============
class DatabaseUtils {
    static buildUpdateExpression(data, allowedFields) {
        const updateExpressions = [];
        const expressionAttributeNames = {};
        const expressionAttributeValues = {};
        
        allowedFields.forEach(field => {
            if (data[field] !== undefined) {
                updateExpressions.push(`#${field} = :${field}`);
                expressionAttributeNames[`#${field}`] = field;
                expressionAttributeValues[`:${field}`] = data[field];
            }
        });
        
        if (updateExpressions.length === 0) return null;
        
        updateExpressions.push('#updatedAt = :updatedAt');
        expressionAttributeNames['#updatedAt'] = 'updatedAt';
        expressionAttributeValues[':updatedAt'] = new Date().toISOString();
        
        return {
            UpdateExpression: `SET ${updateExpressions.join(', ')}`,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues
        };
    }

    static paginateResults(items, page = 1, limit = 50) {
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedItems = items.slice(startIndex, endIndex);
        
        return {
            items: paginatedItems,
            pagination: {
                currentPage: page,
                totalItems: items.length,
                totalPages: Math.ceil(items.length / limit),
                itemsPerPage: limit,
                hasNextPage: endIndex < items.length,
                hasPreviousPage: page > 1
            }
        };
    }
}

// ============= DATE UTILITIES =============
class DateUtils {
    static formatDate(date, format = 'YYYY-MM-DD') {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        
        return format
            .replace('YYYY', year)
            .replace('MM', month)
            .replace('DD', day)
            .replace('HH', hours)
            .replace('mm', minutes);
    }

    static addDays(date, days) {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }

    static getStartOfDay(date) {
        const result = new Date(date);
        result.setHours(0, 0, 0, 0);
        return result;
    }

    static getEndOfDay(date) {
        const result = new Date(date);
        result.setHours(23, 59, 59, 999);
        return result;
    }

    static isToday(date) {
        const today = new Date();
        const checkDate = new Date(date);
        return checkDate.toDateString() === today.toDateString();
    }

    static daysBetween(date1, date2) {
        const oneDay = 24 * 60 * 60 * 1000;
        return Math.round(Math.abs((new Date(date1) - new Date(date2)) / oneDay));
    }
}

// ============= ENCRYPTION UTILITIES =============
class EncryptionUtils {
    static generateSalt() {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

    static hashPassword(password, salt) {
        const crypto = require('crypto');
        return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    }

    static verifyPassword(password, hash, salt) {
        const hashedPassword = this.hashPassword(password, salt);
        return hashedPassword === hash;
    }

    static generateToken() {
        const crypto = require('crypto');
        return crypto.randomBytes(32).toString('hex');
    }

    static encrypt(text, key) {
        const crypto = require('crypto');
        const algorithm = 'aes-256-cbc';
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipher(algorithm, key);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return iv.toString('hex') + ':' + encrypted;
    }

    static decrypt(encryptedText, key) {
        const crypto = require('crypto');
        const algorithm = 'aes-256-cbc';
        const textParts = encryptedText.split(':');
        const iv = Buffer.from(textParts.shift(), 'hex');
        const encrypted = textParts.join(':');
        const decipher = crypto.createDecipher(algorithm, key);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
}

// ============= NOTIFICATION UTILITIES =============
class NotificationUtils {
    static async sendEmail(to, subject, body, isHtml = false) {
        const AWS = require('aws-sdk');
        const ses = new AWS.SES();
        
        const params = {
            Destination: { ToAddresses: [to] },
            Message: {
                Body: isHtml ? { Html: { Data: body } } : { Text: { Data: body } },
                Subject: { Data: subject }
            },
            Source: process.env.FROM_EMAIL || 'noreply@condoconnectai.com'
        };
        
        try {
            return await ses.sendEmail(params).promise();
        } catch (error) {
            console.error('Error sending email:', error);
            throw error;
        }
    }

    static async sendSMS(phoneNumber, message) {
        const AWS = require('aws-sdk');
        const sns = new AWS.SNS();
        
        const params = {
            Message: message,
            PhoneNumber: phoneNumber
        };
        
        try {
            return await sns.publish(params).promise();
        } catch (error) {
            console.error('Error sending SMS:', error);
            throw error;
        }
    }

    static async sendPushNotification(deviceToken, title, body, data = {}) {
        // Implementation would depend on your push notification service (FCM, APNS, etc.)
        console.log('Push notification sent:', { deviceToken, title, body, data });
        return { success: true };
    }
}

module.exports = {
    ValidationUtils,
    ResponseUtils,
    DatabaseUtils,
    DateUtils,
    EncryptionUtils,
    NotificationUtils
};
