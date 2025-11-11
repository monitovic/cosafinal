// ============= RESIDENT MODEL =============
class Resident {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.email = data.email;
        this.phone = data.phone;
        this.unitNumber = data.unitNumber;
        this.status = data.status || 'active';
        this.emergencyContact = data.emergencyContact || {};
        this.preferences = data.preferences || {};
        this.tenantId = data.tenantId;
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
    }

    static validate(data) {
        const errors = [];
        
        if (!data.name || data.name.trim().length < 2) {
            errors.push('Name must be at least 2 characters long');
        }
        
        if (!data.email || !this.isValidEmail(data.email)) {
            errors.push('Valid email is required');
        }
        
        if (!data.phone || !this.isValidPhone(data.phone)) {
            errors.push('Valid phone number is required');
        }
        
        if (!data.unitNumber || data.unitNumber.trim().length === 0) {
            errors.push('Unit number is required');
        }
        
        if (data.status && !['active', 'inactive', 'pending', 'suspended'].includes(data.status)) {
            errors.push('Invalid status value');
        }
        
        return errors;
    }

    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    static isValidPhone(phone) {
        const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
        return phoneRegex.test(phone);
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            email: this.email,
            phone: this.phone,
            unitNumber: this.unitNumber,
            status: this.status,
            emergencyContact: this.emergencyContact,
            preferences: this.preferences,
            tenantId: this.tenantId,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
}

// ============= PAYMENT MODEL =============
class Payment {
    constructor(data) {
        this.id = data.id;
        this.residentId = data.residentId;
        this.residentName = data.residentName;
        this.residentEmail = data.residentEmail;
        this.unitNumber = data.unitNumber;
        this.amount = data.amount;
        this.method = data.method;
        this.description = data.description || '';
        this.status = data.status || 'pending';
        this.date = data.date || new Date().toISOString();
        this.transactionId = data.transactionId;
        this.refundInfo = data.refundInfo || null;
        this.tenantId = data.tenantId;
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
    }

    static validate(data) {
        const errors = [];
        
        if (!data.residentId) {
            errors.push('Resident ID is required');
        }
        
        if (!data.amount || data.amount <= 0) {
            errors.push('Amount must be greater than 0');
        }
        
        if (!data.method || !['credit_card', 'debit_card', 'bank_transfer', 'cash', 'check'].includes(data.method)) {
            errors.push('Valid payment method is required');
        }
        
        if (data.status && !['pending', 'processing', 'completed', 'failed', 'refunded'].includes(data.status)) {
            errors.push('Invalid status value');
        }
        
        return errors;
    }

    calculateFees() {
        const feeRates = {
            'credit_card': 0.029, // 2.9%
            'debit_card': 0.015,  // 1.5%
            'bank_transfer': 0.005, // 0.5%
            'cash': 0,
            'check': 0
        };
        
        const rate = feeRates[this.method] || 0;
        return Math.round(this.amount * rate * 100) / 100;
    }

    getNetAmount() {
        return this.amount - this.calculateFees();
    }

    canRefund() {
        return this.status === 'completed' && !this.refundInfo;
    }

    toJSON() {
        return {
            id: this.id,
            residentId: this.residentId,
            residentName: this.residentName,
            residentEmail: this.residentEmail,
            unitNumber: this.unitNumber,
            amount: this.amount,
            method: this.method,
            description: this.description,
            status: this.status,
            date: this.date,
            transactionId: this.transactionId,
            refundInfo: this.refundInfo,
            fees: this.calculateFees(),
            netAmount: this.getNetAmount(),
            tenantId: this.tenantId,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
}

// ============= WORK ORDER MODEL =============
class WorkOrder {
    constructor(data) {
        this.id = data.id;
        this.title = data.title;
        this.description = data.description;
        this.status = data.status || 'pending';
        this.priority = data.priority;
        this.type = data.type;
        this.location = data.location;
        this.assignedTo = data.assignedTo || null;
        this.scheduledDate = data.scheduledDate || null;
        this.completedDate = data.completedDate || null;
        this.estimatedCost = data.estimatedCost || null;
        this.actualCost = data.actualCost || null;
        this.tenantId = data.tenantId;
        this.createdBy = data.createdBy;
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
    }

    static validate(data) {
        const errors = [];
        
        if (!data.title || data.title.trim().length < 3) {
            errors.push('Title must be at least 3 characters long');
        }
        
        if (!data.description || data.description.trim().length < 10) {
            errors.push('Description must be at least 10 characters long');
        }
        
        if (!data.priority || !['low', 'medium', 'high', 'critical'].includes(data.priority)) {
            errors.push('Valid priority is required');
        }
        
        if (!data.type || !['plumbing', 'electrical', 'hvac', 'cleaning', 'painting', 'landscaping', 'security', 'other'].includes(data.type)) {
            errors.push('Valid type is required');
        }
        
        if (!data.location || data.location.trim().length === 0) {
            errors.push('Location is required');
        }
        
        if (data.status && !['pending', 'assigned', 'in_progress', 'completed', 'cancelled'].includes(data.status)) {
            errors.push('Invalid status value');
        }
        
        if (data.estimatedCost && data.estimatedCost < 0) {
            errors.push('Estimated cost cannot be negative');
        }
        
        if (data.actualCost && data.actualCost < 0) {
            errors.push('Actual cost cannot be negative');
        }
        
        return errors;
    }

    isOverdue() {
        if (!this.scheduledDate || this.status === 'completed' || this.status === 'cancelled') {
            return false;
        }
        
        return new Date(this.scheduledDate) < new Date();
    }

    getDaysUntilDue() {
        if (!this.scheduledDate) return null;
        
        const now = new Date();
        const dueDate = new Date(this.scheduledDate);
        const diffTime = dueDate - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return diffDays;
    }

    getPriorityScore() {
        const priorityScores = {
            'low': 1,
            'medium': 2,
            'high': 3,
            'critical': 4
        };
        
        return priorityScores[this.priority] || 0;
    }

    toJSON() {
        return {
            id: this.id,
            title: this.title,
            description: this.description,
            status: this.status,
            priority: this.priority,
            type: this.type,
            location: this.location,
            assignedTo: this.assignedTo,
            scheduledDate: this.scheduledDate,
            completedDate: this.completedDate,
            estimatedCost: this.estimatedCost,
            actualCost: this.actualCost,
            isOverdue: this.isOverdue(),
            daysUntilDue: this.getDaysUntilDue(),
            priorityScore: this.getPriorityScore(),
            tenantId: this.tenantId,
            createdBy: this.createdBy,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
}

// ============= SECURITY EVENT MODEL =============
class SecurityEvent {
    constructor(data) {
        this.id = data.id;
        this.type = data.type;
        this.description = data.description;
        this.location = data.location;
        this.severity = data.severity;
        this.timestamp = data.timestamp || new Date().toISOString();
        this.userId = data.userId || null;
        this.userName = data.userName || null;
        this.resolved = data.resolved || false;
        this.resolvedAt = data.resolvedAt || null;
        this.resolvedBy = data.resolvedBy || null;
        this.tenantId = data.tenantId;
    }

    static validate(data) {
        const errors = [];
        
        if (!data.type || !['access_granted', 'access_denied', 'alarm_triggered', 'motion_detected', 'door_opened', 'camera_offline', 'system_error', 'emergency_alert'].includes(data.type)) {
            errors.push('Valid event type is required');
        }
        
        if (!data.description || data.description.trim().length < 5) {
            errors.push('Description must be at least 5 characters long');
        }
        
        if (!data.location || data.location.trim().length === 0) {
            errors.push('Location is required');
        }
        
        if (!data.severity || !['info', 'low', 'medium', 'high', 'critical'].includes(data.severity)) {
            errors.push('Valid severity level is required');
        }
        
        return errors;
    }

    isCritical() {
        return this.severity === 'critical' || this.severity === 'high';
    }

    getAgeInMinutes() {
        const now = new Date();
        const eventTime = new Date(this.timestamp);
        return Math.floor((now - eventTime) / (1000 * 60));
    }

    resolve(resolvedBy) {
        this.resolved = true;
        this.resolvedAt = new Date().toISOString();
        this.resolvedBy = resolvedBy;
    }

    toJSON() {
        return {
            id: this.id,
            type: this.type,
            description: this.description,
            location: this.location,
            severity: this.severity,
            timestamp: this.timestamp,
            userId: this.userId,
            userName: this.userName,
            resolved: this.resolved,
            resolvedAt: this.resolvedAt,
            resolvedBy: this.resolvedBy,
            isCritical: this.isCritical(),
            ageInMinutes: this.getAgeInMinutes(),
            tenantId: this.tenantId
        };
    }
}

// ============= VISITOR MODEL =============
class Visitor {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.phone = data.phone;
        this.visitingUnit = data.visitingUnit;
        this.visitDate = data.visitDate;
        this.visitTime = data.visitTime;
        this.purpose = data.purpose;
        this.status = data.status || 'expected';
        this.checkInTime = data.checkInTime || null;
        this.checkOutTime = data.checkOutTime || null;
        this.photo = data.photo || null;
        this.tenantId = data.tenantId;
        this.createdBy = data.createdBy;
        this.createdAt = data.createdAt || new Date().toISOString();
    }

    static validate(data) {
        const errors = [];
        
        if (!data.name || data.name.trim().length < 2) {
            errors.push('Name must be at least 2 characters long');
        }
        
        if (!data.phone || !Resident.isValidPhone(data.phone)) {
            errors.push('Valid phone number is required');
        }
        
        if (!data.visitingUnit || data.visitingUnit.trim().length === 0) {
            errors.push('Visiting unit is required');
        }
        
        if (!data.visitDate) {
            errors.push('Visit date is required');
        }
        
        if (!data.visitTime) {
            errors.push('Visit time is required');
        }
        
        if (!data.purpose || data.purpose.trim().length < 3) {
            errors.push('Purpose must be at least 3 characters long');
        }
        
        if (data.status && !['expected', 'checked_in', 'checked_out', 'denied', 'expired'].includes(data.status)) {
            errors.push('Invalid status value');
        }
        
        return errors;
    }

    isExpired() {
        if (this.status === 'checked_out' || this.status === 'denied') {
            return false;
        }
        
        const visitDateTime = new Date(`${this.visitDate} ${this.visitTime}`);
        const expirationTime = new Date(visitDateTime.getTime() + (24 * 60 * 60 * 1000)); // 24 hours
        
        return new Date() > expirationTime;
    }

    getDurationInMinutes() {
        if (!this.checkInTime || !this.checkOutTime) {
            return null;
        }
        
        const checkIn = new Date(this.checkInTime);
        const checkOut = new Date(this.checkOutTime);
        
        return Math.floor((checkOut - checkIn) / (1000 * 60));
    }

    checkIn() {
        if (this.status !== 'expected') {
            throw new Error('Visitor cannot be checked in');
        }
        
        this.status = 'checked_in';
        this.checkInTime = new Date().toISOString();
    }

    checkOut() {
        if (this.status !== 'checked_in') {
            throw new Error('Visitor cannot be checked out');
        }
        
        this.status = 'checked_out';
        this.checkOutTime = new Date().toISOString();
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            phone: this.phone,
            visitingUnit: this.visitingUnit,
            visitDate: this.visitDate,
            visitTime: this.visitTime,
            purpose: this.purpose,
            status: this.status,
            checkInTime: this.checkInTime,
            checkOutTime: this.checkOutTime,
            photo: this.photo,
            isExpired: this.isExpired(),
            durationInMinutes: this.getDurationInMinutes(),
            tenantId: this.tenantId,
            createdBy: this.createdBy,
            createdAt: this.createdAt
        };
    }
}

// ============= MESSAGE MODEL =============
class Message {
    constructor(data) {
        this.id = data.id;
        this.senderUserId = data.senderUserId;
        this.senderName = data.senderName;
        this.recipientId = data.recipientId;
        this.subject = data.subject;
        this.content = data.content;
        this.messageType = data.messageType || 'personal';
        this.priority = data.priority || 'medium';
        this.isRead = data.isRead || false;
        this.readAt = data.readAt || null;
        this.attachments = data.attachments || [];
        this.timestamp = data.timestamp || new Date().toISOString();
        this.tenantId = data.tenantId;
    }

    static validate(data) {
        const errors = [];
        
        if (!data.senderUserId) {
            errors.push('Sender user ID is required');
        }
        
        if (!data.recipientId) {
            errors.push('Recipient ID is required');
        }
        
        if (!data.subject || data.subject.trim().length < 3) {
            errors.push('Subject must be at least 3 characters long');
        }
        
        if (!data.content || data.content.trim().length < 5) {
            errors.push('Content must be at least 5 characters long');
        }
        
        if (data.messageType && !['personal', 'announcement', 'system', 'emergency'].includes(data.messageType)) {
            errors.push('Invalid message type');
        }
        
        if (data.priority && !['low', 'medium', 'high', 'urgent'].includes(data.priority)) {
            errors.push('Invalid priority level');
        }
        
        return errors;
    }

    markAsRead() {
        this.isRead = true;
        this.readAt = new Date().toISOString();
    }

    getAgeInHours() {
        const now = new Date();
        const messageTime = new Date(this.timestamp);
        return Math.floor((now - messageTime) / (1000 * 60 * 60));
    }

    isUrgent() {
        return this.priority === 'urgent' || this.messageType === 'emergency';
    }

    toJSON() {
        return {
            id: this.id,
            senderUserId: this.senderUserId,
            senderName: this.senderName,
            recipientId: this.recipientId,
            subject: this.subject,
            content: this.content,
            messageType: this.messageType,
            priority: this.priority,
            isRead: this.isRead,
            readAt: this.readAt,
            attachments: this.attachments,
            timestamp: this.timestamp,
            ageInHours: this.getAgeInHours(),
            isUrgent: this.isUrgent(),
            tenantId: this.tenantId
        };
    }
}

// ============= ANNOUNCEMENT MODEL =============
class Announcement {
    constructor(data) {
        this.id = data.id;
        this.title = data.title;
        this.content = data.content;
        this.priority = data.priority || 'medium';
        this.authorId = data.authorId;
        this.author = data.author;
        this.expirationDate = data.expirationDate || null;
        this.timestamp = data.timestamp || new Date().toISOString();
        this.tenantId = data.tenantId;
    }

    static validate(data) {
        const errors = [];
        
        if (!data.title || data.title.trim().length < 5) {
            errors.push('Title must be at least 5 characters long');
        }
        
        if (!data.content || data.content.trim().length < 10) {
            errors.push('Content must be at least 10 characters long');
        }
        
        if (!data.authorId) {
            errors.push('Author ID is required');
        }
        
        if (data.priority && !['low', 'medium', 'high', 'urgent'].includes(data.priority)) {
            errors.push('Invalid priority level');
        }
        
        if (data.expirationDate && new Date(data.expirationDate) <= new Date()) {
            errors.push('Expiration date must be in the future');
        }
        
        return errors;
    }

    isExpired() {
        if (!this.expirationDate) return false;
        return new Date(this.expirationDate) <= new Date();
    }

    isActive() {
        return !this.isExpired();
    }

    getDaysUntilExpiration() {
        if (!this.expirationDate) return null;
        
        const now = new Date();
        const expiration = new Date(this.expirationDate);
        const diffTime = expiration - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return diffDays > 0 ? diffDays : 0;
    }

    toJSON() {
        return {
            id: this.id,
            title: this.title,
            content: this.content,
            priority: this.priority,
            authorId: this.authorId,
            author: this.author,
            expirationDate: this.expirationDate,
            timestamp: this.timestamp,
            isExpired: this.isExpired(),
            isActive: this.isActive(),
            daysUntilExpiration: this.getDaysUntilExpiration(),
            tenantId: this.tenantId
        };
    }
}

module.exports = {
    Resident,
    Payment,
    WorkOrder,
    SecurityEvent,
    Visitor,
    Message,
    Announcement
};
