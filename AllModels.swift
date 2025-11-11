import Foundation

// ============= RESIDENT MODEL =============
struct Resident: Codable, Identifiable {
    let id: String
    let name: String
    let email: String
    let phone: String
    let unitNumber: String
    let status: ResidentStatus
    let createdAt: Date
    let updatedAt: Date
    let tenantId: String
    let profileImageURL: String?
    let emergencyContact: EmergencyContact?
    let preferences: ResidentPreferences
    
    enum ResidentStatus: String, Codable, CaseIterable {
        case active = "active"
        case inactive = "inactive"
        case pending = "pending"
        case suspended = "suspended"
        
        var displayText: String {
            switch self {
            case .active: return "Activo"
            case .inactive: return "Inactivo"
            case .pending: return "Pendiente"
            case .suspended: return "Suspendido"
            }
        }
        
        var color: UIColor {
            switch self {
            case .active: return .systemGreen
            case .inactive: return .systemGray
            case .pending: return .systemOrange
            case .suspended: return .systemRed
            }
        }
    }
    
    init(id: String, name: String, email: String, phone: String, unitNumber: String, status: ResidentStatus) {
        self.id = id
        self.name = name
        self.email = email
        self.phone = phone
        self.unitNumber = unitNumber
        self.status = status
        self.createdAt = Date()
        self.updatedAt = Date()
        self.tenantId = ""
        self.profileImageURL = nil
        self.emergencyContact = nil
        self.preferences = ResidentPreferences()
    }
}

struct EmergencyContact: Codable {
    let name: String
    let phone: String
    let relationship: String
}

struct ResidentPreferences: Codable {
    let language: String
    let notifications: NotificationPreferences
    let privacy: PrivacySettings
    
    init() {
        self.language = "es"
        self.notifications = NotificationPreferences()
        self.privacy = PrivacySettings()
    }
}

struct NotificationPreferences: Codable {
    let email: Bool
    let sms: Bool
    let push: Bool
    let announcements: Bool
    let maintenance: Bool
    let payments: Bool
    let security: Bool
    
    init() {
        self.email = true
        self.sms = true
        self.push = true
        self.announcements = true
        self.maintenance = true
        self.payments = true
        self.security = true
    }
}

struct PrivacySettings: Codable {
    let shareContactInfo: Bool
    let allowDirectMessages: Bool
    let showInDirectory: Bool
    
    init() {
        self.shareContactInfo = false
        self.allowDirectMessages = true
        self.showInDirectory = true
    }
}

// ============= PAYMENT MODEL =============
struct Payment: Codable, Identifiable {
    let id: String
    let amount: Double
    let method: String
    let status: PaymentStatus
    let date: Date
    let description: String?
    let transactionId: String?
    let residentId: String?
    
    enum PaymentStatus: String, Codable, CaseIterable {
        case pending = "pending"
        case processing = "processing"
        case completed = "completed"
        case failed = "failed"
        case refunded = "refunded"
        
        var displayText: String {
            switch self {
            case .pending: return "Pendiente"
            case .processing: return "Procesando"
            case .completed: return "Completado"
            case .failed: return "Fallido"
            case .refunded: return "Reembolsado"
            }
        }
        
        var color: UIColor {
            switch self {
            case .pending: return .systemOrange
            case .processing: return .systemBlue
            case .completed: return .systemGreen
            case .failed: return .systemRed
            case .refunded: return .systemPurple
            }
        }
    }
    
    init(id: String, amount: Double, method: String, status: PaymentStatus, date: Date) {
        self.id = id
        self.amount = amount
        self.method = method
        self.status = status
        self.date = date
        self.description = nil
        self.transactionId = nil
        self.residentId = nil
    }
}

// ============= MAINTENANCE MODEL =============
struct WorkOrder: Codable, Identifiable {
    let id: String
    let title: String
    let description: String
    let status: WorkOrderStatus
    let priority: Priority
    let type: String
    let location: String
    let createdAt: Date
    let scheduledDate: Date?
    let completedDate: Date?
    let assignedTo: String?
    let estimatedCost: Double?
    let actualCost: Double?
    
    enum WorkOrderStatus: String, Codable, CaseIterable {
        case pending = "pending"
        case assigned = "assigned"
        case inProgress = "in_progress"
        case completed = "completed"
        case cancelled = "cancelled"
        
        var displayText: String {
            switch self {
            case .pending: return "Pendiente"
            case .assigned: return "Asignado"
            case .inProgress: return "En Progreso"
            case .completed: return "Completado"
            case .cancelled: return "Cancelado"
            }
        }
        
        var color: UIColor {
            switch self {
            case .pending: return .systemOrange
            case .assigned: return .systemBlue
            case .inProgress: return .systemYellow
            case .completed: return .systemGreen
            case .cancelled: return .systemRed
            }
        }
    }
    
    enum Priority: String, Codable, CaseIterable {
        case low = "low"
        case medium = "medium"
        case high = "high"
        case critical = "critical"
        
        var displayText: String {
            switch self {
            case .low: return "Baja"
            case .medium: return "Media"
            case .high: return "Alta"
            case .critical: return "Crítica"
            }
        }
        
        var color: UIColor {
            switch self {
            case .low: return .systemGreen
            case .medium: return .systemYellow
            case .high: return .systemOrange
            case .critical: return .systemRed
            }
        }
    }
    
    init(id: String, title: String, description: String, status: WorkOrderStatus, priority: Priority, type: String, location: String, createdAt: Date, scheduledDate: Date?) {
        self.id = id
        self.title = title
        self.description = description
        self.status = status
        self.priority = priority
        self.type = type
        self.location = location
        self.createdAt = createdAt
        self.scheduledDate = scheduledDate
        self.completedDate = nil
        self.assignedTo = nil
        self.estimatedCost = nil
        self.actualCost = nil
    }
}

// ============= SECURITY MODEL =============
struct SecurityEvent: Codable, Identifiable {
    let id: String
    let type: String
    let description: String
    let severity: Severity
    let location: String
    let timestamp: Date
    let status: String?
    let userId: String?
    let deviceId: String?
    
    enum Severity: String, Codable, CaseIterable {
        case info = "info"
        case low = "low"
        case medium = "medium"
        case high = "high"
        case critical = "critical"
        
        var displayText: String {
            switch self {
            case .info: return "Información"
            case .low: return "Baja"
            case .medium: return "Media"
            case .high: return "Alta"
            case .critical: return "Crítica"
            }
        }
        
        var color: UIColor {
            switch self {
            case .info: return .systemBlue
            case .low: return .systemGreen
            case .medium: return .systemYellow
            case .high: return .systemOrange
            case .critical: return .systemRed
            }
        }
    }
    
    init(id: String, type: String, description: String, severity: Severity, location: String, timestamp: Date) {
        self.id = id
        self.type = type
        self.description = description
        self.severity = severity
        self.location = location
        self.timestamp = timestamp
        self.status = nil
        self.userId = nil
        self.deviceId = nil
    }
}

struct Visitor: Codable, Identifiable {
    let id: String
    let name: String
    let phone: String
    let visitingUnit: String
    let visitDate: Date
    let visitTime: String
    let status: VisitorStatus
    let purpose: String
    let authorizedBy: String?
    let checkInTime: Date?
    let checkOutTime: Date?
    
    enum VisitorStatus: String, Codable, CaseIterable {
        case expected = "expected"
        case checkedIn = "checked_in"
        case checkedOut = "checked_out"
        case denied = "denied"
        case expired = "expired"
        
        var displayText: String {
            switch self {
            case .expected: return "Esperado"
            case .checkedIn: return "Ingresado"
            case .checkedOut: return "Salió"
            case .denied: return "Denegado"
            case .expired: return "Expirado"
            }
        }
        
        var color: UIColor {
            switch self {
            case .expected: return .systemBlue
            case .checkedIn: return .systemGreen
            case .checkedOut: return .systemGray
            case .denied: return .systemRed
            case .expired: return .systemOrange
            }
        }
    }
    
    init(id: String, name: String, phone: String, visitingUnit: String, visitDate: Date, visitTime: String, status: VisitorStatus, purpose: String) {
        self.id = id
        self.name = name
        self.phone = phone
        self.visitingUnit = visitingUnit
        self.visitDate = visitDate
        self.visitTime = visitTime
        self.status = status
        self.purpose = purpose
        self.authorizedBy = nil
        self.checkInTime = nil
        self.checkOutTime = nil
    }
}

// ============= COMMUNICATION MODEL =============
struct Message: Codable, Identifiable {
    let id: String
    let senderId: String
    let senderName: String
    let recipientId: String
    let subject: String
    let content: String
    let timestamp: Date
    let isRead: Bool
    let messageType: MessageType
    let attachments: [Attachment]?
    
    enum MessageType: String, Codable {
        case personal = "personal"
        case announcement = "announcement"
        case system = "system"
        case emergency = "emergency"
    }
}

struct Announcement: Codable, Identifiable {
    let id: String
    let title: String
    let content: String
    let author: String
    let timestamp: Date
    let priority: Priority
    let expirationDate: Date?
    let targetAudience: [String]?
    
    enum Priority: String, Codable {
        case low = "low"
        case medium = "medium"
        case high = "high"
        case urgent = "urgent"
    }
}

struct Attachment: Codable {
    let id: String
    let filename: String
    let fileType: String
    let fileSize: Int
    let url: String
}

// ============= REPORT MODEL =============
struct Report: Codable, Identifiable {
    let id: String
    let name: String
    let type: ReportType
    let status: ReportStatus
    let createdAt: Date
    let completedAt: Date?
    let fileUrl: String?
    let parameters: [String: String]?
    
    enum ReportType: String, Codable, CaseIterable {
        case financial = "financial"
        case operational = "operational"
        case maintenance = "maintenance"
        case security = "security"
        case residents = "residents"
        
        var displayText: String {
            switch self {
            case .financial: return "Financiero"
            case .operational: return "Operacional"
            case .maintenance: return "Mantenimiento"
            case .security: return "Seguridad"
            case .residents: return "Residentes"
            }
        }
    }
    
    enum ReportStatus: String, Codable {
        case generating = "generating"
        case completed = "completed"
        case failed = "failed"
        
        var displayText: String {
            switch self {
            case .generating: return "Generando"
            case .completed: return "Completado"
            case .failed: return "Fallido"
            }
        }
    }
}

// ============= USER MODEL =============
struct User: Codable, Identifiable {
    let id: String
    let username: String
    let email: String
    let name: String
    let phone: String?
    let role: UserRole
    let tenantId: String
    let isActive: Bool
    let lastLogin: Date?
    let createdAt: Date
    let preferences: UserPreferences?
    
    enum UserRole: String, Codable, CaseIterable {
        case superAdmin = "super_admin"
        case admin = "admin"
        case propertyManager = "property_manager"
        case resident = "resident"
        case maintenance = "maintenance"
        case security = "security"
        
        var displayText: String {
            switch self {
            case .superAdmin: return "Super Administrador"
            case .admin: return "Administrador"
            case .propertyManager: return "Gerente de Propiedad"
            case .resident: return "Residente"
            case .maintenance: return "Mantenimiento"
            case .security: return "Seguridad"
            }
        }
    }
}

struct UserPreferences: Codable {
    let language: String
    let theme: String
    let notifications: NotificationPreferences
    let privacy: PrivacySettings
}

// ============= CONFIGURATION MODEL =============
struct Configuration: Codable {
    let tenantId: String
    let settings: [String: Any]
    let features: [String: Bool]
    let integrations: [String: IntegrationConfig]
    let updatedAt: Date
    
    private enum CodingKeys: String, CodingKey {
        case tenantId, settings, features, integrations, updatedAt
    }
}

struct IntegrationConfig: Codable {
    let enabled: Bool
    let apiKey: String?
    let endpoint: String?
    let settings: [String: String]?
}

// ============= ACTIVITY MODEL =============
struct Activity: Codable, Identifiable {
    let id: String
    let type: ActivityType
    let description: String
    let timestamp: Date
    let userId: String?
    let entityId: String?
    let entityType: String?
    
    enum ActivityType: String, Codable {
        case newResident = "new_resident"
        case payment = "payment"
        case maintenance = "maintenance"
        case security = "security"
        case communication = "communication"
        case system = "system"
    }
}

// ============= TASK MODEL =============
struct Task: Codable, Identifiable {
    let id: String
    let title: String
    let description: String?
    let priority: Priority
    let status: TaskStatus
    let assignedTo: String?
    let createdBy: String
    let dueDate: Date?
    let completedDate: Date?
    let createdAt: Date
    
    enum Priority: String, Codable {
        case low = "low"
        case medium = "medium"
        case high = "high"
        
        var displayText: String {
            switch self {
            case .low: return "Baja"
            case .medium: return "Media"
            case .high: return "Alta"
            }
        }
    }
    
    enum TaskStatus: String, Codable {
        case pending = "pending"
        case inProgress = "in_progress"
        case completed = "completed"
        case cancelled = "cancelled"
    }
    
    init(id: String, title: String, priority: Priority, dueDate: Date?) {
        self.id = id
        self.title = title
        self.description = nil
        self.priority = priority
        self.status = .pending
        self.assignedTo = nil
        self.createdBy = ""
        self.dueDate = dueDate
        self.completedDate = nil
        self.createdAt = Date()
    }
}

// ============= API RESPONSE MODELS =============
struct APIResponse<T: Codable>: Codable {
    let success: Bool
    let data: T?
    let message: String?
    let error: String?
}

struct PaginatedResponse<T: Codable>: Codable {
    let items: [T]
    let totalCount: Int
    let page: Int
    let pageSize: Int
    let hasMore: Bool
}
