import Foundation
import AWSMobileClient
import AWSS3
import AWSDynamoDB
import AWSAppSync

// ============= AWS SERVICE =============
class AWSService {
    static let shared = AWSService()
    
    private var appSyncClient: AWSAppSyncClient?
    private var s3Client: AWSS3?
    private var dynamoDBClient: AWSDynamoDB?
    
    private init() {
        configureAWS()
    }
    
    private func configureAWS() {
        // Configure AWSMobileClient
        AWSMobileClient.default().initialize { (userState, error) in
            if let error = error {
                print("Error initializing AWSMobileClient: \(error)")
                return
            }
            
            guard let userState = userState else {
                print("UserState is nil")
                return
            }
            
            print("AWSMobileClient initialized with state: \(userState)")
            self.setupAWSServices()
        }
    }
    
    private func setupAWSServices() {
        // Setup AppSync
        do {
            let appSyncConfig = try AWSAppSyncClientConfiguration(
                appSyncServiceConfig: AWSAppSyncServiceConfig(),
                userPoolsAuthProvider: AWSMobileClient.default() as AWSCognitoUserPoolsAuthProvider
            )
            appSyncClient = try AWSAppSyncClient(appSyncConfig: appSyncConfig)
        } catch {
            print("Error configuring AppSync: \(error)")
        }
        
        // Setup S3
        s3Client = AWSS3.default()
        
        // Setup DynamoDB
        dynamoDBClient = AWSDynamoDB.default()
    }
    
    import Foundation
import AWSMobileClient
import AWSS3
import AWSDynamoDB
import AWSAppSync

// ============= AWS SERVICE =============
class AWSService {
    static let shared = AWSService()
    
    private var appSyncClient: AWSAppSyncClient?
    private var s3Client: AWSS3?
    private var dynamoDBClient: AWSDynamoDB?
    
    private init() {
        configureAWS()
    }
    
    private func configureAWS() {
        // Configure AWSMobileClient
        AWSMobileClient.default().initialize { (userState, error) in
            if let error = error {
                print("Error initializing AWSMobileClient: \(error)")
                return
            }
            
            guard let userState = userState else {
                print("UserState is nil")
                return
            }
            
            print("AWSMobileClient initialized with state: \(userState)")
            self.setupAWSServices()
        }
    }
    
    private func setupAWSServices() {
        // Setup AppSync
        do {
            let appSyncConfig = try AWSAppSyncClientConfiguration(
                appSyncServiceConfig: AWSAppSyncServiceConfig(),
                userPoolsAuthProvider: AWSMobileClient.default() as AWSCognitoUserPoolsAuthProvider
            )
            appSyncClient = try AWSAppSyncClient(appSyncConfig: appSyncConfig)
        } catch {
            print("Error configuring AppSync: \(error)")
        }
        
        // Setup S3
        s3Client = AWSS3.default()
        
        // Setup DynamoDB
        dynamoDBClient = AWSDynamoDB.default()
    }
    
    // MARK: - Authentication Methods
    func signIn(username: String, password: String) async throws -> AWSMobileClientResult<SignInResult> {
        return try await withCheckedThrowingContinuation { continuation in
            AWSMobileClient.default().signIn(username: username, password: password) { result
    func putItem(tableName: String, item: [String: AWSDynamoDBAttributeValue]) async throws {
        guard let dynamoDBClient = dynamoDBClient else {
            throw AWSServiceError.serviceNotConfigured
        }
        
        return try await withCheckedThrowingContinuation { continuation in
            let putInput = AWSDynamoDBPutItemInput()
            putInput?.tableName = tableName
            putInput?.item = item
            
            dynamoDBClient.putItem(putInput!).continueWith { task in
                if let error = task.error {
                    continuation.resume(throwing: error)
                } else {
                    continuation.resume(returning: ())
                }
                return nil
            }
        }
    }
}

enum AWSServiceError: Error {
    case serviceNotConfigured
    case unknownError
    case noData
    case authenticationFailed
    case networkError
    
    var localizedDescription: String {
        switch self {
        case .serviceNotConfigured:
            return "AWS service not configured"
        case .unknownError:
            return "Unknown error occurred"
        case .noData:
            return "No data received"
        case .authenticationFailed:
            return "Authentication failed"
        case .networkError:
            return "Network error"
        }
    }
}

// ============= API SERVICE =============
class APIService {
    static let shared = APIService()
    
    private let baseURL = "https://api.condoconnectai.com"
    private let session = URLSession.shared
    
    private init() {}
    
    // MARK: - Generic Request Method
    private func performRequest<T: Codable>(
        endpoint: String,
        method: HTTPMethod = .GET,
        body: Data? = nil,
        responseType: T.Type
    ) async throws -> T {
        guard let url = URL(string: "\(baseURL)\(endpoint)") else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = method.rawValue
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        // Add authentication token
        if let token = await getAuthToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        if let body = body {
            request.httpBody = body
        }
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        guard 200...299 ~= httpResponse.statusCode else {
            throw APIError.serverError(httpResponse.statusCode)
        }
        
        do {
            let decodedResponse = try JSONDecoder().decode(T.self, from: data)
            return decodedResponse
        } catch {
            throw APIError.decodingError(error)
        }
    }
    
    private func getAuthToken() async -> String? {
        do {
            let session = try await AWSMobileClient.default().getTokens()
            return session.accessToken?.tokenString
        } catch {
            print("Error getting auth token: \(error)")
            return nil
        }
    }
    
    // MARK: - Resident API Methods
    func getResidents(page: Int = 1, limit: Int = 50) async throws -> PaginatedResponse<Resident> {
        return try await performRequest(
            endpoint: "/residents?page=\(page)&limit=\(limit)",
            responseType: PaginatedResponse<Resident>.self
        )
    }
    
    func createResident(_ resident: ResidentCreateRequest) async throws -> APIResponse<Resident> {
        let body = try JSONEncoder().encode(resident)
        return try await performRequest(
            endpoint: "/residents",
            method: .POST,
            body: body,
            responseType: APIResponse<Resident>.self
        )
    }
    
    func updateResident(id: String, _ resident: ResidentUpdateRequest) async throws -> APIResponse<Resident> {
        let body = try JSONEncoder().encode(resident)
        return try await performRequest(
            endpoint: "/residents/\(id)",
            method: .PUT,
            body: body,
            responseType: APIResponse<Resident>.self
        )
    }
    
    func deleteResident(id: String) async throws -> APIResponse<Bool> {
        return try await performRequest(
            endpoint: "/residents/\(id)",
            method: .DELETE,
            responseType: APIResponse<Bool>.self
        )
    }
    
    // MARK: - Payment API Methods
    func getPayments(residentId: String? = nil, page: Int = 1, limit: Int = 50) async throws -> PaginatedResponse<Payment> {
        var endpoint = "/payments?page=\(page)&limit=\(limit)"
        if let residentId = residentId {
            endpoint += "&resident_id=\(residentId)"
        }
        
        return try await performRequest(
            endpoint: endpoint,
            responseType: PaginatedResponse<Payment>.self
        )
    }
    
    func processPayment(_ paymentRequest: PaymentRequest) async throws -> APIResponse<Payment> {
        let body = try JSONEncoder().encode(paymentRequest)
        return try await performRequest(
            endpoint: "/payments",
            method: .POST,
            body: body,
            responseType: APIResponse<Payment>.self
        )
    }
    
    // MARK: - Work Order API Methods
    func getWorkOrders(status: String? = nil, priority: String? = nil) async throws -> [WorkOrder] {
        var endpoint = "/work-orders"
        var queryParams: [String] = []
        
        if let status = status {
            queryParams.append("status=\(status)")
        }
        if let priority = priority {
            queryParams.append("priority=\(priority)")
        }
        
        if !queryParams.isEmpty {
            endpoint += "?" + queryParams.joined(separator: "&")
        }
        
        let response: APIResponse<[WorkOrder]> = try await performRequest(
            endpoint: endpoint,
            responseType: APIResponse<[WorkOrder]>.self
        )
        
        return response.data ?? []
    }
    
    func createWorkOrder(_ workOrder: WorkOrderCreateRequest) async throws -> APIResponse<WorkOrder> {
        let body = try JSONEncoder().encode(workOrder)
        return try await performRequest(
            endpoint: "/work-orders",
            method: .POST,
            body: body,
            responseType: APIResponse<WorkOrder>.self
        )
    }
    
    // MARK: - Security API Methods
    func getSecurityEvents(limit: Int = 50) async throws -> [SecurityEvent] {
        let response: APIResponse<[SecurityEvent]> = try await performRequest(
            endpoint: "/security/events?limit=\(limit)",
            responseType: APIResponse<[SecurityEvent]>.self
        )
        
        return response.data ?? []
    }
    
    func getVisitors(date: Date? = nil) async throws -> [Visitor] {
        var endpoint = "/security/visitors"
        
        if let date = date {
            let formatter = DateFormatter()
            formatter.dateFormat = "yyyy-MM-dd"
            endpoint += "?date=\(formatter.string(from: date))"
        }
        
        let response: APIResponse<[Visitor]> = try await performRequest(
            endpoint: endpoint,
            responseType: APIResponse<[Visitor]>.self
        )
        
        return response.data ?? []
    }
    
    func addVisitor(_ visitor: VisitorCreateRequest) async throws -> APIResponse<Visitor> {
        let body = try JSONEncoder().encode(visitor)
        return try await performRequest(
            endpoint: "/security/visitors",
            method: .POST,
            body: body,
            responseType: APIResponse<Visitor>.self
        )
    }
}

enum HTTPMethod: String {
    case GET = "GET"
    case POST = "POST"
    case PUT = "PUT"
    case DELETE = "DELETE"
    case PATCH = "PATCH"
}

enum APIError: Error {
    case invalidURL
    case invalidResponse
    case serverError(Int)
    case decodingError(Error)
    case networkError(Error)
    
    var localizedDescription: String {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .invalidResponse:
            return "Invalid response"
        case .serverError(let code):
            return "Server error with code: \(code)"
        case .decodingError(let error):
            return "Decoding error: \(error.localizedDescription)"
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        }
    }
}

// MARK: - Request Models
struct ResidentCreateRequest: Codable {
    let name: String
    let email: String
    let phone: String
    let unitNumber: String
    let tenantId: String
    let emergencyContact: EmergencyContact?
}

struct ResidentUpdateRequest: Codable {
    let name: String?
    let email: String?
    let phone: String?
    let unitNumber: String?
    let status: Resident.ResidentStatus?
    let emergencyContact: EmergencyContact?
    let preferences: ResidentPreferences?
}

struct PaymentRequest: Codable {
    let amount: Double
    let method: String
    let residentId: String
    let description: String?
}

struct WorkOrderCreateRequest: Codable {
    let title: String
    let description: String
    let priority: WorkOrder.Priority
    let type: String
    let location: String
    let scheduledDate: Date?
}

struct VisitorCreateRequest: Codable {
    let name: String
    let phone: String
    let visitingUnit: String
    let visitDate: Date
    let visitTime: String
    let purpose: String
}

// ============= OFFLINE SERVICE =============
class OfflineService {
    static let shared = OfflineService()
    
    private let userDefaults = UserDefaults.standard
    private let fileManager = FileManager.default
    private let documentsDirectory: URL
    
    private init() {
        documentsDirectory = fileManager.urls(for: .documentDirectory, in: .userDomainMask).first!
    }
    
    // MARK: - Generic Storage Methods
    func store<T: Codable>(_ object: T, forKey key: String) throws {
        let data = try JSONEncoder().encode(object)
        let url = documentsDirectory.appendingPathComponent("\(key).json")
        try data.write(to: url)
    }
    
    func retrieve<T: Codable>(_ type: T.Type, forKey key: String) throws -> T? {
        let url = documentsDirectory.appendingPathComponent("\(key).json")
        
        guard fileManager.fileExists(atPath: url.path) else {
            return nil
        }
        
        let data = try Data(contentsOf: url)
        return try JSONDecoder().decode(type, from: data)
    }
    
    func remove(forKey key: String) throws {
        let url = documentsDirectory.appendingPathComponent("\(key).json")
        
        if fileManager.fileExists(atPath: url.path) {
            try fileManager.removeItem(at: url)
        }
    }
    
    // MARK: - Specific Data Methods
    func storeResidents(_ residents: [Resident]) throws {
        try store(residents, forKey: "residents")
        userDefaults.set(Date(), forKey: "residents_last_updated")
    }
    
    func getStoredResidents() throws -> [Resident]? {
        return try retrieve([Resident].self, forKey: "residents")
    }
    
    func storePayments(_ payments: [Payment]) throws {
        try store(payments, forKey: "payments")
        userDefaults.set(Date(), forKey: "payments_last_updated")
    }
    
    func getStoredPayments() throws -> [Payment]? {
        return try retrieve([Payment].self, forKey: "payments")
    }
    
    func storeWorkOrders(_ workOrders: [WorkOrder]) throws {
        try store(workOrders, forKey: "work_orders")
        userDefaults.set(Date(), forKey: "work_orders_last_updated")
    }
    
    func getStoredWorkOrders() throws -> [WorkOrder]? {
        return try retrieve([WorkOrder].self, forKey: "work_orders")
    }
    
    func storeSecurityEvents(_ events: [SecurityEvent]) throws {
        try store(events, forKey: "security_events")
        userDefaults.set(Date(), forKey: "security_events_last_updated")
    }
    
    func getStoredSecurityEvents() throws -> [SecurityEvent]? {
        return try retrieve([SecurityEvent].self, forKey: "security_events")
    }
    
    func storeVisitors(_ visitors: [Visitor]) throws {
        try store(visitors, forKey: "visitors")
        userDefaults.set(Date(), forKey: "visitors_last_updated")
    }
    
    func getStoredVisitors() throws -> [Visitor]? {
        return try retrieve([Visitor].self, forKey: "visitors")
    }
    
    // MARK: - Sync Status Methods
    func getLastSyncDate(for key: String) -> Date? {
        return userDefaults.object(forKey: "\(key)_last_updated") as? Date
    }
    
    func isDataStale(for key: String, maxAge: TimeInterval = 300) -> Bool {
        guard let lastSync = getLastSyncDate(for: key) else {
            return true
        }
        
        return Date().timeIntervalSince(lastSync) > maxAge
    }
    
    // MARK: - Cache Management
    func clearAllCache() throws {
        let keys = ["residents", "payments", "work_orders", "security_events", "visitors"]
        
        for key in keys {
            try remove(forKey: key)
            userDefaults.removeObject(forKey: "\(key)_last_updated")
        }
    }
    
    func getCacheSize() -> Int64 {
        var totalSize: Int64 = 0
        
        do {
            let contents = try fileManager.contentsOfDirectory(at: documentsDirectory, includingPropertiesForKeys: [.fileSizeKey])
            
            for url in contents where url.pathExtension == "json" {
                let resourceValues = try url.resourceValues(forKeys: [.fileSizeKey])
                totalSize += Int64(resourceValues.fileSize ?? 0)
            }
        } catch {
            print("Error calculating cache size: \(error)")
        }
        
        return totalSize
    }
    
    // MARK: - Offline Queue Management
    private var offlineQueue: [OfflineAction] = []
    
    func addToOfflineQueue(_ action: OfflineAction) {
        offlineQueue.append(action)
        saveOfflineQueue()
    }
    
    func processOfflineQueue() async {
        guard !offlineQueue.isEmpty else { return }
        
        var processedActions: [OfflineAction] = []
        
        for action in offlineQueue {
            do {
                try await processOfflineAction(action)
                processedActions.append(action)
            } catch {
                print("Failed to process offline action: \(error)")
                // Keep failed actions in queue for retry
            }
        }
        
        // Remove successfully processed actions
        offlineQueue.removeAll { processedActions.contains($0) }
        saveOfflineQueue()
    }
    
    private func processOfflineAction(_ action: OfflineAction) async throws {
        switch action.type {
        case .createResident:
            if let data = action.data,
               let request = try? JSONDecoder().decode(ResidentCreateRequest.self, from: data) {
                _ = try await APIService.shared.createResident(request)
            }
        case .updateResident:
            if let data = action.data,
               let request = try? JSONDecoder().decode(ResidentUpdateRequest.self, from: data) {
                _ = try await APIService.shared.updateResident(id: action.entityId ?? "", request)
            }
        case .createWorkOrder:
            if let data = action.data,
               let request = try? JSONDecoder().decode(WorkOrderCreateRequest.self, from: data) {
                _ = try await APIService.shared.createWorkOrder(request)
            }
        case .processPayment:
            if let data = action.data,
               let request = try? JSONDecoder().decode(PaymentRequest.self, from: data) {
                _ = try await APIService.shared.processPayment(request)
            }
        }
    }
    
    private func saveOfflineQueue() {
        do {
            try store(offlineQueue, forKey: "offline_queue")
        } catch {
            print("Failed to save offline queue: \(error)")
        }
    }
    
    private func loadOfflineQueue() {
        do {
            offlineQueue = try retrieve([OfflineAction].self, forKey: "offline_queue") ?? []
        } catch {
            print("Failed to load offline queue: \(error)")
            offlineQueue = []
        }
    }
}

struct OfflineAction: Codable, Equatable {
    let id: String
    let type: ActionType
    let entityId: String?
    let data: Data?
    let timestamp: Date
    
    enum ActionType: String, Codable {
        case createResident
        case updateResident
        case createWorkOrder
        case processPayment
    }
    
    static func == (lhs: OfflineAction, rhs: OfflineAction) -> Bool {
        return lhs.id == rhs.id
    }
}
