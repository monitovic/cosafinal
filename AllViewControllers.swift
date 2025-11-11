    private func applyFilter() {
        let selectedIndex = filterSegmentedControl.selectedSegmentIndex
        let searchText = searchBar.text ?? ""
        
        var filtered = residents
        
        // Apply status filter
        switch selectedIndex {
        case 1: // Active
            filtered = filtered.filter { $0.status == .active }
        case 2: // Pending
            filtered = filtered.filter { $0.status == .pending }
        case 3: // Inactive
            filtered = filtered.filter { $0.status == .inactive }
        default: // All
            break
        }
        
        // Apply search filter
        if !searchText.isEmpty {
            filtered = filtered.filter { resident in
                resident.name.localizedCaseInsensitiveContains(searchText) ||
                resident.email.localizedCaseInsensitiveContains(searchText) ||
                resident.unitNumber.localizedCaseInsensitiveContains(searchText)
            }
        }
        
        filteredResidents = filtered
        residentsTableView.reloadData()
    }
    
    private func showError(_ message: String) {
        let alert = UIAlertController(title: "Error", message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default))
        present(alert, animated: true)
    }
}

// MARK: - TableView DataSource and Delegate
extension ResidentViewController: UITableViewDataSource, UITableViewDelegate {
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return filteredResidents.count
    }
    
    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: "ResidentCell", for: indexPath) as! ResidentTableViewCell
        cell.configure(with: filteredResidents[indexPath.row])
        return cell
    }
    
    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        
        let resident = filteredResidents[indexPath.row]
        showResidentDetail(resident)
    }
    
    private func showResidentDetail(_ resident: Resident) {
        let storyboard = UIStoryboard(name: "Main", bundle: nil)
        if let detailVC = storyboard.instantiateViewController(withIdentifier: "ResidentDetailViewController") as? ResidentDetailViewController {
            detailVC.resident = resident
            navigationController?.pushViewController(detailVC, animated: true)
        }
    }
}

// MARK: - SearchBar Delegate
extension ResidentViewController: UISearchBarDelegate {
    func searchBar(_ searchBar: UISearchBar, textDidChange searchText: String) {
        applyFilter()
    }
    
    func searchBarSearchButtonClicked(_ searchBar: UISearchBar) {
        searchBar.resignFirstResponder()
    }
}

// MARK: - AddResident Delegate
extension ResidentViewController: AddResidentDelegate {
    func didAddResident(_ resident: Resident) {
        residents.append(resident)
        applyFilter()
    }
}

// ============= PAYMENT VIEW CONTROLLER =============
class PaymentViewController: UIViewController {
    
    @IBOutlet weak var currentBalanceLabel: UILabel!
    @IBOutlet weak var amountTextField: UITextField!
    @IBOutlet weak var paymentMethodSegmentedControl: UISegmentedControl!
    @IBOutlet weak var processPaymentButton: UIButton!
    @IBOutlet weak var paymentHistoryTableView: UITableView!
    
    private var paymentHistory: [Payment] = []
    private var currentBalance: Double = 0.0
    
    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        setupTableView()
        loadPaymentData()
    }
    
    private func setupUI() {
        title = "Pagos"
        
        processPaymentButton.addTarget(self, action: #selector(processPaymentTapped), for: .touchUpInside)
        processPaymentButton.layer.cornerRadius = 8
        processPaymentButton.backgroundColor = UIColor.systemBlue
        
        amountTextField.keyboardType = .decimalPad
        amountTextField.placeholder = "Ingrese el monto"
        
        // Add toolbar to amount text field
        let toolbar = UIToolbar()
        toolbar.sizeToFit()
        let doneButton = UIBarButtonItem(barButtonSystemItem: .done, target: self, action: #selector(dismissKeyboard))
        toolbar.setItems([doneButton], animated: false)
        amountTextField.inputAccessoryView = toolbar
    }
    
    private func setupTableView() {
        paymentHistoryTableView.delegate = self
        paymentHistoryTableView.dataSource = self
        paymentHistoryTableView.register(PaymentTableViewCell.self, forCellReuseIdentifier: "PaymentCell")
    }
    
    private func loadPaymentData() {
        Task {
            do {
                async let balance = loadCurrentBalance()
                async let history = loadPaymentHistory()
                
                let results = try await (balance, history)
                
                await MainActor.run {
                    self.currentBalance = results.0
                    self.paymentHistory = results.1
                    self.updateUI()
                }
            } catch {
                await MainActor.run {
                    self.showError("Error loading payment data: \(error.localizedDescription)")
                }
            }
        }
    }
    
    private func loadCurrentBalance() async throws -> Double {
        try await Task.sleep(nanoseconds: 1_000_000_000)
        return 1250.00
    }
    
    private func loadPaymentHistory() async throws -> [Payment] {
        try await Task.sleep(nanoseconds: 1_000_000_000)
        
        return [
            Payment(id: "1", amount: 1250.00, method: "Tarjeta de Crédito", status: .completed, date: Date()),
            Payment(id: "2", amount: 1250.00, method: "Transferencia", status: .completed, date: Date().addingTimeInterval(-2592000)),
            Payment(id: "3", amount: 1250.00, method: "Tarjeta de Débito", status: .completed, date: Date().addingTimeInterval(-5184000)),
            Payment(id: "4", amount: 1250.00, method: "Efectivo", status: .pending, date: Date().addingTimeInterval(-7776000))
        ]
    }
    
    private func updateUI() {
        currentBalanceLabel.text = String(format: "$%.2f", currentBalance)
        paymentHistoryTableView.reloadData()
    }
    
    @objc private func processPaymentTapped() {
        guard let amountText = amountTextField.text,
              let amount = Double(amountText),
              amount > 0 else {
            showError("Por favor, ingrese un monto válido")
            return
        }
        
        processPayment(amount: amount)
    }
    
    @objc private func dismissKeyboard() {
        view.endEditing(true)
    }
    
    private func processPayment(amount: Double) {
        let selectedMethod = paymentMethodSegmentedControl.selectedSegmentIndex
        let methods = ["Tarjeta de Crédito", "Tarjeta de Débito", "Transferencia", "Amazon Pay"]
        let method = methods[selectedMethod]
        
        // Show loading
        processPaymentButton.isEnabled = false
        processPaymentButton.setTitle("Procesando...", for: .normal)
        
        Task {
            do {
                let success = try await submitPayment(amount: amount, method: method)
                
                await MainActor.run {
                    self.processPaymentButton.isEnabled = true
                    self.processPaymentButton.setTitle("Procesar Pago", for: .normal)
                    
                    if success {
                        self.showSuccess("Pago procesado exitosamente")
                        self.amountTextField.text = ""
                        self.loadPaymentData() // Refresh data
                    } else {
                        self.showError("Error procesando el pago")
                    }
                }
            } catch {
                await MainActor.run {
                    self.processPaymentButton.isEnabled = true
                    self.processPaymentButton.setTitle("Procesar Pago", for: .normal)
                    self.showError("Error: \(error.localizedDescription)")
                }
            }
        }
    }
    
    private func submitPayment(amount: Double, method: String) async throws -> Bool {
        try await Task.sleep(nanoseconds: 2_000_000_000) // Simulate API call
        return true
    }
    
    private func showError(_ message: String) {
        let alert = UIAlertController(title: "Error", message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default))
        present(alert, animated: true)
    }
    
    private func showSuccess(_ message: String) {
        let alert = UIAlertController(title: "Éxito", message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default))
        present(alert, animated: true)
    }
}

// MARK: - TableView DataSource and Delegate
extension PaymentViewController: UITableViewDataSource, UITableViewDelegate {
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return paymentHistory.count
    }
    
    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: "PaymentCell", for: indexPath) as! PaymentTableViewCell
        cell.configure(with: paymentHistory[indexPath.row])
        return cell
    }
    
    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        
        let payment = paymentHistory[indexPath.row]
        showPaymentDetail(payment)
    }
    
    private func showPaymentDetail(_ payment: Payment) {
        let message = """
        Monto: $\(String(format: "%.2f", payment.amount))
        Método: \(payment.method)
        Estado: \(payment.status.rawValue)
        Fecha: \(DateFormatter.localizedString(from: payment.date, dateStyle: .medium, timeStyle: .short))
        """
        
        let alert = UIAlertController(title: "Detalle del Pago", message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default))
        present(alert, animated: true)
    }
}

// ============= MAINTENANCE VIEW CONTROLLER =============
class MaintenanceViewController: UIViewController {
    
    @IBOutlet weak var createWorkOrderButton: UIButton!
    @IBOutlet weak var workOrdersTableView: UITableView!
    @IBOutlet weak var statusFilterSegmentedControl: UISegmentedControl!
    @IBOutlet weak var priorityFilterSegmentedControl: UISegmentedControl!
    
    private var workOrders: [WorkOrder] = []
    private var filteredWorkOrders: [WorkOrder] = []
    
    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        setupTableView()
        loadWorkOrders()
    }
    
    private func setupUI() {
        title = "Mantenimiento"
        
        createWorkOrderButton.addTarget(self, action: #selector(createWorkOrderTapped), for: .touchUpInside)
        createWorkOrderButton.layer.cornerRadius = 8
        createWorkOrderButton.backgroundColor = UIColor.systemGreen
        
        statusFilterSegmentedControl.addTarget(self, action: #selector(filterChanged), for: .valueChanged)
        priorityFilterSegmentedControl.addTarget(self, action: #selector(filterChanged), for: .valueChanged)
    }
    
    private func setupTableView() {
        workOrdersTableView.delegate = self
        workOrdersTableView.dataSource = self
        workOrdersTableView.register(MaintenanceTableViewCell.self, forCellReuseIdentifier: "MaintenanceCell")
    }
    
    private func loadWorkOrders() {
        Task {
            do {
                let orders = try await fetchWorkOrders()
                await MainActor.run {
                    self.workOrders = orders
                    self.applyFilters()
                }
            } catch {
                await MainActor.run {
                    self.showError("Error loading work orders: \(error.localizedDescription)")
                }
            }
        }
    }
    
    private func fetchWorkOrders() async throws -> [WorkOrder] {
        try await Task.sleep(nanoseconds: 1_000_000_000)
        
        return [
            WorkOrder(id: "1", title: "Reparar ascensor A", description: "El ascensor A no funciona correctamente", status: .pending, priority: .high, type: "Eléctrico", location: "Edificio Principal", createdAt: Date(), scheduledDate: Date().addingTimeInterval(86400)),
            WorkOrder(id: "2", title: "Mantenimiento piscina", description: "Limpieza y mantenimiento mensual de la piscina", status: .inProgress, priority: .medium, type: "Limpieza", location: "Área Recreativa", createdAt: Date().addingTimeInterval(-86400), scheduledDate: Date().addingTimeInterval(172800)),
            WorkOrder(id: "3", title: "Pintar paredes lobby", description: "Repintar las paredes del lobby principal", status: .completed, priority: .low, type: "Pintura", location: "Lobby", createdAt: Date().addingTimeInterval(-172800), scheduledDate: Date().addingTimeInterval(-86400))
        ]
    }
    
    @objc private func createWorkOrderTapped() {
        let storyboard = UIStoryboard(name: "Main", bundle: nil)
        if let createVC = storyboard.instantiateViewController(withIdentifier: "CreateWorkOrderViewController") as? CreateWorkOrderViewController {
            createVC.delegate = self
            let navController = UINavigationController(rootViewController: createVC)
            present(navController, animated: true)
        }
    }
    
    @objc private func filterChanged() {
        applyFilters()
    }
    
    private func applyFilters() {
        var filtered = workOrders
        
        // Apply status filter
        let statusIndex = statusFilterSegmentedControl.selectedSegmentIndex
        switch statusIndex {
        case 1: // Pending
            filtered = filtered.filter { $0.status == .pending }
        case 2: // In Progress
            filtered = filtered.filter { $0.status == .inProgress }
        case 3: // Completed
            filtered = filtered.filter { $0.status == .completed }
        default: // All
            break
        }
        
        // Apply priority filter
        let priorityIndex = priorityFilterSegmentedControl.selectedSegmentIndex
        switch priorityIndex {
        case 1: // High
            filtered = filtered.filter { $0.priority == .high }
        case 2: // Medium
            filtered = filtered.filter { $0.priority == .medium }
        case 3: // Low
            filtered = filtered.filter { $0.priority == .low }
        default: // All
            break
        }
        
        filteredWorkOrders = filtered
        workOrdersTableView.reloadData()
    }
    
    private func showError(_ message: String) {
        let alert = UIAlertController(title: "Error", message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default))
        present(alert, animated: true)
    }
}

// MARK: - TableView DataSource and Delegate
extension MaintenanceViewController: UITableViewDataSource, UITableViewDelegate {
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return filteredWorkOrders.count
    }
    
    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: "MaintenanceCell", for: indexPath) as! MaintenanceTableViewCell
        cell.configure(with: filteredWorkOrders[indexPath.row])
        return cell
    }
    
    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        
        let workOrder = filteredWorkOrders[indexPath.row]
        showWorkOrderDetail(workOrder)
    }
    
    private func showWorkOrderDetail(_ workOrder: WorkOrder) {
        let storyboard = UIStoryboard(name: "Main", bundle: nil)
        if let detailVC = storyboard.instantiateViewController(withIdentifier: "WorkOrderDetailViewController") as? WorkOrderDetailViewController {
            detailVC.workOrder = workOrder
            navigationController?.pushViewController(detailVC, animated: true)
        }
    }
}

// MARK: - CreateWorkOrder Delegate
extension MaintenanceViewController: CreateWorkOrderDelegate {
    func didCreateWorkOrder(_ workOrder: WorkOrder) {
        workOrders.insert(workOrder, at: 0)
        applyFilters()
    }
}

// ============= SECURITY VIEW CONTROLLER =============
class SecurityViewController: UIViewController {
    
    @IBOutlet weak var securityStatusLabel: UILabel!
    @IBOutlet weak var alarmSystemSwitch: UISwitch!
    @IBOutlet weak var cameraMonitoringSwitch: UISwitch!
    @IBOutlet weak var accessControlSwitch: UISwitch!
    @IBOutlet weak var emergencyButton: UIButton!
    @IBOutlet weak var addVisitorButton: UIButton!
    @IBOutlet weak var securityEventsTableView: UITableView!
    @IBOutlet weak var visitorsTableView: UITableView!
    
    private var securityEvents: [SecurityEvent] = []
    private var visitors: [Visitor] = []
    
    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        setupTableViews()
        loadSecurityData()
    }
    
    private func setupUI() {
        title = "Seguridad"
        
        emergencyButton.addTarget(self, action: #selector(emergencyButtonTapped), for: .touchUpInside)
        emergencyButton.backgroundColor = UIColor.systemRed
        emergencyButton.layer.cornerRadius = 8
        
        addVisitorButton.addTarget(self, action: #selector(addVisitorTapped), for: .touchUpInside)
        addVisitorButton.backgroundColor = UIColor.systemBlue
        addVisitorButton.layer.cornerRadius = 8
        
        alarmSystemSwitch.addTarget(self, action: #selector(switchChanged(_:)), for: .valueChanged)
        cameraMonitoringSwitch.addTarget(self, action: #selector(switchChanged(_:)), for: .valueChanged)
        accessControlSwitch.addTarget(self, action: #selector(switchChanged(_:)), for: .valueChanged)
    }
    
    private func setupTableViews() {
        securityEventsTableView.delegate = self
        securityEventsTableView.dataSource = self
        securityEventsTableView.register(SecurityEventTableViewCell.self, forCellReuseIdentifier: "SecurityEventCell")
        
        visitorsTableView.delegate = self
        visitorsTableView.dataSource = self
        visitorsTableView.register(VisitorTableViewCell.self, forCellReuseIdentifier: "VisitorCell")
    }
    
    private func loadSecurityData() {
        Task {
            do {
                async let events = loadSecurityEvents()
                async let visitorList = loadVisitors()
                
                let results = try await (events, visitorList)
                
                await MainActor.run {
                    self.securityEvents = results.0
                    self.visitors = results.1
                    self.updateUI()
                }
            } catch {
                await MainActor.run {
                    self.showError("Error loading security data: \(error.localizedDescription)")
                }
            }
        }
    }
    
    private func loadSecurityEvents() async throws -> [SecurityEvent] {
        try await Task.sleep(nanoseconds: 1_000_000_000)
        
        return [
            SecurityEvent(id: "1", type: "access_granted", description: "Acceso concedido a Juan Pérez", severity: .low, location: "Entrada Principal", timestamp: Date()),
            SecurityEvent(id: "2", type: "visitor_registered", description: "Visitante registrado para Unidad 304", severity: .info, location: "Recepción", timestamp: Date().addingTimeInterval(-3600)),
            SecurityEvent(id: "3", type: "alarm_triggered", description: "Alarma activada en Estacionamiento", severity: .high, location: "Estacionamiento B", timestamp: Date().addingTimeInterval(-7200))
        ]
    }
    
    private func loadVisitors() async throws -> [Visitor] {
        try await Task.sleep(nanoseconds: 1_000_000_000)
        
        return [
            Visitor(id: "1", name: "Carlos Mendoza", phone: "555-0201", visitingUnit: "304", visitDate: Date(), visitTime: "14:30", status: .expected, purpose: "Visita familiar"),
            Visitor(id: "2", name: "Ana Silva", phone: "555-0202", visitingUnit: "205", visitDate: Date(), visitTime: "16:00", status: .checkedIn, purpose: "Entrega de paquete")
        ]
    }
    
    private func updateUI() {
        updateSecurityStatus()
        securityEventsTableView.reloadData()
        visitorsTableView.reloadData()
    }
    
    private func updateSecurityStatus() {
        let allSystemsActive = alarmSystemSwitch.isOn && cameraMonitoringSwitch.isOn && accessControlSwitch.isOn
        
        if allSystemsActive {
            securityStatusLabel.text = "Sistema de Seguridad: ACTIVO"
            securityStatusLabel.textColor = UIColor.systemGreen
        } else {
            securityStatusLabel.text = "Sistema de Seguridad: PARCIAL"
            securityStatusLabel.textColor = UIColor.systemOrange
        }
    }
    
    @objc private func emergencyButtonTapped() {
        let alert = UIAlertController(title: "Alerta de Emergencia", message: "¿Está seguro de que desea activar la alerta de emergencia?", preferredStyle: .alert)
        
        alert.addAction(UIAlertAction(title: "Activar", style: .destructive) { _ in
            self.triggerEmergencyAlert()
        })
        alert.addAction(UIAlertAction(title: "Cancelar", style: .cancel))
        
        present(alert, animated: true)
    }
    
    @objc private func addVisitorTapped() {
        let storyboard = UIStoryboard(name: "Main", bundle: nil)
        if let addVisitorVC = storyboard.instantiateViewController(withIdentifier: "AddVisitorViewController") as? AddVisitorViewController {
            addVisitorVC.delegate = self
            let navController = UINavigationController(rootViewController: addVisitorVC)
            present(navController, animated: true)
        }
    }
    
    @objc private func switchChanged(_ sender: UISwitch) {
        updateSecurityStatus()
        
        // Send IoT command based on switch
        let command: String
        switch sender {
        case alarmSystemSwitch:
            command = sender.isOn ? "enable_alarm" : "disable_alarm"
        case cameraMonitoringSwitch:
            command = sender.isOn ? "enable_cameras" : "disable_cameras"
        case accessControlSwitch:
            command = sender.isOn ? "enable_access_control" : "disable_access_control"
        default:
            return
        }
        
        sendIoTCommand(command)
    }
    
    private func triggerEmergencyAlert() {
        // Implement emergency alert logic
        let newEvent = SecurityEvent(
            id: UUID().uuidString,
            type: "emergency_alert",
            description: "Alerta de emergencia activada manualmente",
            severity: .critical,
            location: "Aplicación Móvil",
            timestamp: Date()
        )
        
        securityEvents.insert(newEvent, at: 0)
        securityEventsTableView.reloadData()
        
        showSuccess("Alerta de emergencia activada")
    }
    
    private func sendIoTCommand(_ command: String) {
        // Implement IoT command sending
        print("Sending IoT command: \(command)")
    }
    
    private func showError(_ message: String) {
        let alert = UIAlertController(title: "Error", message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default))
        present(alert, animated: true)
    }
    
    private func showSuccess(_ message: String) {
        let alert = UIAlertController(title: "Éxito", message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default))
        present(alert, animated: true)
    }
}

// MARK: - TableView DataSource and Delegate
extension SecurityViewController: UITableViewDataSource, UITableViewDelegate {
    func numberOfSections(in tableView: UITableView) -> Int {
        return 1
    }
    
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        if tableView == securityEventsTableView {
            return securityEvents.count
        } else {
            return visitors.count
        }
    }
    
    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        if tableView == securityEventsTableView {
            let cell = tableView.dequeueReusableCell(withIdentifier: "SecurityEventCell", for: indexPath) as! SecurityEventTableViewCell
            cell.configure(with: securityEvents[indexPath.row])
            return cell
        } else {
            let cell = tableView.dequeueReusableCell(withIdentifier: "VisitorCell", for: indexPath) as! VisitorTableViewCell
            cell.configure(with: visitors[indexPath.row])
            return cell
        }
    }
    
    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        
        if tableView == securityEventsTableView {
            let event = securityEvents[indexPath.row]
            showSecurityEventDetail(event)
        } else {
            let visitor = visitors[indexPath.row]
            showVisitorDetail(visitor)
        }
    }
    
    private func showSecurityEventDetail(_ event: SecurityEvent) {
        let message = """
        Tipo: \(event.type)
        Descripción: \(event.description)
        Severidad: \(event.severity.rawValue)
        Ubicación: \(event.location)
        Fecha: \(DateFormatter.localizedString(from: event.timestamp, dateStyle: .medium, timeStyle: .short))
        """
        
        let alert = UIAlertController(title: "Evento de Seguridad", message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default))
        present(alert, animated: true)
    }
    
    private func showVisitorDetail(_ visitor: Visitor) {
        let message = """
        Nombre: \(visitor.name)
        Teléfono: \(visitor.phone)
        Unidad a visitar: \(visitor.visitingUnit)
        Hora de visita: \(visitor.visitTime)
        Estado: \(visitor.status.rawValue)
        Propósito: \(visitor.purpose)
        """
        
        let alert = UIAlertController(title: "Detalle del Visitante", message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default))
        present(alert, animated: true)
    }
}

// MARK: - AddVisitor Delegate
extension SecurityViewController: AddVisitorDelegate {
    func didAddVisitor(_ visitor: Visitor) {
        visitors.insert(visitor, at: 0)
        visitorsTableView.reloadData()
    }
}
