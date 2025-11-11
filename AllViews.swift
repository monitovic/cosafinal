import UIKit

// ============= RESIDENT TABLE VIEW CELL =============
class ResidentTableViewCell: UITableViewCell {
    
    private let profileImageView = UIImageView()
    private let nameLabel = UILabel()
    private let emailLabel = UILabel()
    private let unitLabel = UILabel()
    private let statusLabel = UILabel()
    private let phoneLabel = UILabel()
    private let statusIndicator = UIView()
    
    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        setupUI()
    }
    
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupUI()
    }
    
    private func setupUI() {
        // Profile Image
        profileImageView.translatesAutoresizingMaskIntoConstraints = false
        profileImageView.layer.cornerRadius = 25
        profileImageView.clipsToBounds = true
        profileImageView.backgroundColor = UIColor.systemGray5
        profileImageView.contentMode = .scaleAspectFill
        contentView.addSubview(profileImageView)
        
        // Status Indicator
        statusIndicator.translatesAutoresizingMaskIntoConstraints = false
        statusIndicator.layer.cornerRadius = 6
        contentView.addSubview(statusIndicator)
        
        // Name Label
        nameLabel.translatesAutoresizingMaskIntoConstraints = false
        nameLabel.font = UIFont.systemFont(ofSize: 16, weight: .semibold)
        nameLabel.textColor = UIColor.label
        contentView.addSubview(nameLabel)
        
        // Email Label
        emailLabel.translatesAutoresizingMaskIntoConstraints = false
        emailLabel.font = UIFont.systemFont(ofSize: 14, weight: .regular)
        emailLabel.textColor = UIColor.secondaryLabel
        contentView.addSubview(emailLabel)
        
        // Unit Label
        unitLabel.translatesAutoresizingMaskIntoConstraints = false
        unitLabel.font = UIFont.systemFont(ofSize: 14, weight: .medium)
        unitLabel.textColor = UIColor.systemBlue
        unitLabel.backgroundColor = UIColor.systemBlue.withAlphaComponent(0.1)
        unitLabel.layer.cornerRadius = 8
        unitLabel.clipsToBounds = true
        unitLabel.textAlignment = .center
        contentView.addSubview(unitLabel)
        
        // Status Label
        statusLabel.translatesAutoresizingMaskIntoConstraints = false
        statusLabel.font = UIFont.systemFont(ofSize: 12, weight: .medium)
        statusLabel.layer.cornerRadius = 8
        statusLabel.clipsToBounds = true
        statusLabel.textAlignment = .center
        contentView.addSubview(statusLabel)
        
        // Phone Label
        phoneLabel.translatesAutoresizingMaskIntoConstraints = false
        phoneLabel.font = UIFont.systemFont(ofSize: 13, weight: .regular)
        phoneLabel.textColor = UIColor.secondaryLabel
        contentView.addSubview(phoneLabel)
        
        setupConstraints()
    }
    
    private func setupConstraints() {
        NSLayoutConstraint.activate([
            // Profile Image
            profileImageView.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 16),
            profileImageView.centerYAnchor.constraint(equalTo: contentView.centerYAnchor),
            profileImageView.widthAnchor.constraint(equalToConstant: 50),
            profileImageView.heightAnchor.constraint(equalToConstant: 50),
            
            // Status Indicator
            statusIndicator.trailingAnchor.constraint(equalTo: profileImageView.trailingAnchor, constant: -2),
            statusIndicator.bottomAnchor.constraint(equalTo: profileImageView.bottomAnchor, constant: -2),
            statusIndicator.widthAnchor.constraint(equalToConstant: 12),
            statusIndicator.heightAnchor.constraint(equalToConstant: 12),
            
            // Name Label
            nameLabel.leadingAnchor.constraint(equalTo: profileImageView.trailingAnchor, constant: 12),
            nameLabel.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 12),
            nameLabel.trailingAnchor.constraint(equalTo: unitLabel.leadingAnchor, constant: -8),
            
            // Email Label
            emailLabel.leadingAnchor.constraint(equalTo: nameLabel.leadingAnchor),
            emailLabel.topAnchor.constraint(equalTo: nameLabel.bottomAnchor, constant: 2),
            emailLabel.trailingAnchor.constraint(equalTo: nameLabel.trailingAnchor),
            
            // Phone Label
            phoneLabel.leadingAnchor.constraint(equalTo: nameLabel.leadingAnchor),
            phoneLabel.topAnchor.constraint(equalTo: emailLabel.bottomAnchor, constant: 2),
            phoneLabel.trailingAnchor.constraint(equalTo: nameLabel.trailingAnchor),
            phoneLabel.bottomAnchor.constraint(lessThanOrEqualTo: contentView.bottomAnchor, constant: -12),
            
            // Unit Label
            unitLabel.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -16),
            unitLabel.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 12),
            unitLabel.widthAnchor.constraint(equalToConstant: 60),
            unitLabel.heightAnchor.constraint(equalToConstant: 24),
            
            // Status Label
            statusLabel.trailingAnchor.constraint(equalTo: unitLabel.trailingAnchor),
            statusLabel.topAnchor.constraint(equalTo: unitLabel.bottomAnchor, constant: 8),
            statusLabel.widthAnchor.constraint(equalToConstant: 60),
            statusLabel.heightAnchor.constraint(equalToConstant: 20),
            
            // Cell Height
            contentView.heightAnchor.constraint(greaterThanOrEqualToConstant: 80)
        ])
    }
    
    func configure(with resident: Resident) {
        nameLabel.text = resident.name
        emailLabel.text = resident.email
        phoneLabel.text = resident.formattedPhone
        unitLabel.text = resident.unitNumber
        statusLabel.text = resident.status.displayText
        statusLabel.backgroundColor = resident.status.color.withAlphaComponent(0.2)
        statusLabel.textColor = resident.status.color
        statusIndicator.backgroundColor = resident.status.color
        
        // Load profile image
        if let imageURL = resident.profileImageURL {
            loadImage(from: imageURL)
        } else {
            profileImageView.image = UIImage(systemName: "person.circle.fill")
            profileImageView.tintColor = UIColor.systemGray3
        }
    }
    
    private func loadImage(from urlString: String) {
        guard let url = URL(string: urlString) else { return }
        
        URLSession.shared.dataTask(with: url) { [weak self] data, response, error in
            guard let data = data, let image = UIImage(data: data) else { return }
            
            DispatchQueue.main.async {
                self?.profileImageView.image = image
            }
        }.resume()
    }
}

// ============= PAYMENT TABLE VIEW CELL =============
class PaymentTableViewCell: UITableViewCell {
    
    private let amountLabel = UILabel()
    private let methodLabel = UILabel()
    private let dateLabel = UILabel()
    private let statusLabel = UILabel()
    private let iconImageView = UIImageView()
    private let statusIndicator = UIView()
    
    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        setupUI()
    }
    
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupUI()
    }
    
    private func setupUI() {
        // Icon
        iconImageView.translatesAutoresizingMaskIntoConstraints = false
        iconImageView.contentMode = .scaleAspectFit
        iconImageView.tintColor = UIColor.systemBlue
        contentView.addSubview(iconImageView)
        
        // Amount Label
        amountLabel.translatesAutoresizingMaskIntoConstraints = false
        amountLabel.font = UIFont.systemFont(ofSize: 18, weight: .bold)
        amountLabel.textColor = UIColor.label
        contentView.addSubview(amountLabel)
        
        // Method Label
        methodLabel.translatesAutoresizingMaskIntoConstraints = false
        methodLabel.font = UIFont.systemFont(ofSize: 14, weight: .medium)
        methodLabel.textColor = UIColor.secondaryLabel
        contentView.addSubview(methodLabel)
        
        // Date Label
        dateLabel.translatesAutoresizingMaskIntoConstraints = false
        dateLabel.font = UIFont.systemFont(ofSize: 12, weight: .regular)
        dateLabel.textColor = UIColor.tertiaryLabel
        contentView.addSubview(dateLabel)
        
        // Status Label
        statusLabel.translatesAutoresizingMaskIntoConstraints = false
        statusLabel.font = UIFont.systemFont(ofSize: 12, weight: .medium)
        statusLabel.layer.cornerRadius = 8
        statusLabel.clipsToBounds = true
        statusLabel.textAlignment = .center
        contentView.addSubview(statusLabel)
        
        // Status Indicator
        statusIndicator.translatesAutoresizingMaskIntoConstraints = false
        statusIndicator.layer.cornerRadius = 4
        contentView.addSubview(statusIndicator)
        
        setupConstraints()
    }
    
    private func setupConstraints() {
        NSLayoutConstraint.activate([
            // Icon
            iconImageView.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 16),
            iconImageView.centerYAnchor.constraint(equalTo: contentView.centerYAnchor),
            iconImageView.widthAnchor.constraint(equalToConstant: 32),
            iconImageView.heightAnchor.constraint(equalToConstant: 32),
            
            // Status Indicator
            statusIndicator.leadingAnchor.constraint(equalTo: iconImageView.trailingAnchor, constant: 12),
            statusIndicator.centerYAnchor.constraint(equalTo: contentView.centerYAnchor),
            statusIndicator.widthAnchor.constraint(equalToConstant: 8),
            statusIndicator.heightAnchor.constraint(equalToConstant: 8),
            
            // Amount Label
            amountLabel.leadingAnchor.constraint(equalTo: statusIndicator.trailingAnchor, constant: 8),
            amountLabel.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 12),
            amountLabel.trailingAnchor.constraint(equalTo: statusLabel.leadingAnchor, constant: -8),
            
            // Method Label
            methodLabel.leadingAnchor.constraint(equalTo: amountLabel.leadingAnchor),
            methodLabel.topAnchor.constraint(equalTo: amountLabel.bottomAnchor, constant: 2),
            methodLabel.trailingAnchor.constraint(equalTo: amountLabel.trailingAnchor),
            
            // Date Label
            dateLabel.leadingAnchor.constraint(equalTo: amountLabel.leadingAnchor),
            dateLabel.topAnchor.constraint(equalTo: methodLabel.bottomAnchor, constant: 2),
            dateLabel.trailingAnchor.constraint(equalTo: amountLabel.trailingAnchor),
            dateLabel.bottomAnchor.constraint(lessThanOrEqualTo: contentView.bottomAnchor, constant: -12),
            
            // Status Label
            statusLabel.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -16),
            statusLabel.centerYAnchor.constraint(equalTo: contentView.centerYAnchor),
            statusLabel.widthAnchor.constraint(equalToConstant: 80),
            statusLabel.heightAnchor.constraint(equalToConstant: 24),
            
            // Cell Height
            contentView.heightAnchor.constraint(greaterThanOrEqualToConstant: 70)
        ])
    }
    
    func configure(with payment: Payment) {
        amountLabel.text = String(format: "$%.2f", payment.amount)
        methodLabel.text = payment.method
        dateLabel.text = DateFormatter.localizedString(from: payment.date, dateStyle: .medium, timeStyle: .short)
        statusLabel.text = payment.status.displayText
        statusLabel.backgroundColor = payment.status.color.withAlphaComponent(0.2)
        statusLabel.textColor = payment.status.color
        statusIndicator.backgroundColor = payment.status.color
        
        // Set icon based on payment method
        let iconName: String
        switch payment.method.lowercased() {
        case "tarjeta de crédito", "credit card":
            iconName = "creditcard.fill"
        case "tarjeta de débito", "debit card":
            iconName = "creditcard"
        case "transferencia", "transfer":
            iconName = "arrow.left.arrow.right"
        case "efectivo", "cash":
            iconName = "dollarsign.circle.fill"
        default:
            iconName = "creditcard.fill"
        }
        
        iconImageView.image = UIImage(systemName: iconName)
    }
}

// ============= MAINTENANCE TABLE VIEW CELL =============
class MaintenanceTableViewCell: UITableViewCell {
    
    private let titleLabel = UILabel()
    private let descriptionLabel = UILabel()
    private let statusLabel = UILabel()
    private let priorityLabel = UILabel()
    private let locationLabel = UILabel()
    private let dateLabel = UILabel()
    private let typeIconView = UIImageView()
    private let priorityIndicator = UIView()
    
    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        setupUI()
    }
    
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupUI()
    }
    
    private func setupUI() {
        // Type Icon
        typeIconView.translatesAutoresizingMaskIntoConstraints = false
        typeIconView.contentMode = .scaleAspectFit
        typeIconView.tintColor = UIColor.systemOrange
        contentView.addSubview(typeIconView)
        
        // Priority Indicator
        priorityIndicator.translatesAutoresizingMaskIntoConstraints = false
        priorityIndicator.layer.cornerRadius = 3
        contentView.addSubview(priorityIndicator)
        
        // Title Label
        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        titleLabel.font = UIFont.systemFont(ofSize: 16, weight: .semibold)
        titleLabel.textColor = UIColor.label
        titleLabel.numberOfLines = 2
        contentView.addSubview(titleLabel)
        
        // Description Label
        descriptionLabel.translatesAutoresizingMaskIntoConstraints = false
        descriptionLabel.font = UIFont.systemFont(ofSize: 13, weight: .regular)
        descriptionLabel.textColor = UIColor.secondaryLabel
        descriptionLabel.numberOfLines = 2
        contentView.addSubview(descriptionLabel)
        
        // Location Label
        locationLabel.translatesAutoresizingMaskIntoConstraints = false
        locationLabel.font = UIFont.systemFont(ofSize: 12, weight: .medium)
        locationLabel.textColor = UIColor.systemBlue
        contentView.addSubview(locationLabel)
        
        // Date Label
        dateLabel.translatesAutoresizingMaskIntoConstraints = false
        dateLabel.font = UIFont.systemFont(ofSize: 11, weight: .regular)
        dateLabel.textColor = UIColor.tertiaryLabel
        contentView.addSubview(dateLabel)
        
        // Status Label
        statusLabel.translatesAutoresizingMaskIntoConstraints = false
        statusLabel.font = UIFont.systemFont(ofSize: 11, weight: .medium)
        statusLabel.layer.cornerRadius = 8
        statusLabel.clipsToBounds = true
        statusLabel.textAlignment = .center
        contentView.addSubview(statusLabel)
        
        // Priority Label
        priorityLabel.translatesAutoresizingMaskIntoConstraints = false
        priorityLabel.font = UIFont.systemFont(ofSize: 10, weight: .bold)
        priorityLabel.layer.cornerRadius = 6
        priorityLabel.clipsToBounds = true
        priorityLabel.textAlignment = .center
        contentView.addSubview(priorityLabel)
        
        setupConstraints()
    }
    
    private func setupConstraints() {
        NSLayoutConstraint.activate([
            // Type Icon
            typeIconView.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 16),
            typeIconView.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 12),
            typeIconView.widthAnchor.constraint(equalToConstant: 28),
            typeIconView.heightAnchor.constraint(equalToConstant: 28),
            
            // Priority Indicator
            priorityIndicator.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 4),
            priorityIndicator.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 8),
            priorityIndicator.widthAnchor.constraint(equalToConstant: 6),
            priorityIndicator.heightAnchor.constraint(equalToConstant: 40),
            
            // Title Label
            titleLabel.leadingAnchor.constraint(equalTo: typeIconView.trailingAnchor, constant: 12),
            titleLabel.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 8),
            titleLabel.trailingAnchor.constraint(equalTo: statusLabel.leadingAnchor, constant: -8),
            
            // Description Label
            descriptionLabel.leadingAnchor.constraint(equalTo: titleLabel.leadingAnchor),
            descriptionLabel.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 4),
            descriptionLabel.trailingAnchor.constraint(equalTo: titleLabel.trailingAnchor),
            
            // Location Label
            locationLabel.leadingAnchor.constraint(equalTo: titleLabel.leadingAnchor),
            locationLabel.topAnchor.constraint(equalTo: descriptionLabel.bottomAnchor, constant: 4),
            
            // Date Label
            dateLabel.leadingAnchor.constraint(equalTo: locationLabel.trailingAnchor, constant: 8),
            dateLabel.centerYAnchor.constraint(equalTo: locationLabel.centerYAnchor),
            dateLabel.trailingAnchor.constraint(lessThanOrEqualTo: titleLabel.trailingAnchor),
            dateLabel.bottomAnchor.constraint(lessThanOrEqualTo: contentView.bottomAnchor, constant: -12),
            
            // Status Label
            statusLabel.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -16),
            statusLabel.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 12),
            statusLabel.widthAnchor.constraint(equalToConstant: 70),
            statusLabel.heightAnchor.constraint(equalToConstant: 20),
            
            // Priority Label
            priorityLabel.trailingAnchor.constraint(equalTo: statusLabel.trailingAnchor),
            priorityLabel.topAnchor.constraint(equalTo: statusLabel.bottomAnchor, constant: 4),
            priorityLabel.widthAnchor.constraint(equalToConstant: 50),
            priorityLabel.heightAnchor.constraint(equalToConstant: 16),
            
            // Cell Height
            contentView.heightAnchor.constraint(greaterThanOrEqualToConstant: 90)
        ])
    }
    
    func configure(with workOrder: WorkOrder) {
        titleLabel.text = workOrder.title
        descriptionLabel.text = workOrder.description
        locationLabel.text = workOrder.location
        
        if let scheduledDate = workOrder.scheduledDate {
            dateLabel.text = DateFormatter.localizedString(from: scheduledDate, dateStyle: .short, timeStyle: .none)
        } else {
            dateLabel.text = DateFormatter.localizedString(from: workOrder.createdAt, dateStyle: .short, timeStyle: .none)
        }
        
        statusLabel.text = workOrder.status.displayText
        statusLabel.backgroundColor = workOrder.status.color.withAlphaComponent(0.2)
        statusLabel.textColor = workOrder.status.color
        
        priorityLabel.text = workOrder.priority.displayText
        priorityLabel.backgroundColor = workOrder.priority.color.withAlphaComponent(0.2)
        priorityLabel.textColor = workOrder.priority.color
        priorityIndicator.backgroundColor = workOrder.priority.color
        
        // Set icon based on work order type
        let iconName: String
        switch workOrder.type.lowercased() {
        case "eléctrico", "electrical":
            iconName = "bolt.fill"
        case "plomería", "plumbing":
            iconName = "drop.fill"
        case "limpieza", "cleaning":
            iconName = "sparkles"
        case "pintura", "painting":
            iconName = "paintbrush.fill"
        case "jardinería", "gardening":
            iconName = "leaf.fill"
        default:
            iconName = "wrench.fill"
        }
        
        typeIconView.image = UIImage(systemName: iconName)
    }
}

// ============= DASHBOARD STATS VIEW =============
class DashboardStatsView: UIView {
    
    private let titleLabel = UILabel()
    private let valueLabel = UILabel()
    private let iconImageView = UIImageView()
    private let changeLabel = UILabel()
    private let backgroundView = UIView()
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
    }
    
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupUI()
    }
    
    private func setupUI() {
        // Background View
        backgroundView.translatesAutoresizingMaskIntoConstraints = false
        backgroundView.backgroundColor = UIColor.systemBackground
        backgroundView.layer.cornerRadius = 12
        backgroundView.layer.shadowColor = UIColor.black.cgColor
        backgroundView.layer.shadowOffset = CGSize(width: 0, height: 2)
        backgroundView.layer.shadowRadius = 4
        backgroundView.layer.shadowOpacity = 0.1
        addSubview(backgroundView)
        
        // Icon
        iconImageView.translatesAutoresizingMaskIntoConstraints = false
        iconImageView.contentMode = .scaleAspectFit
        iconImageView.tintColor = UIColor.systemBlue
        backgroundView.addSubview(iconImageView)
        
        // Value Label
        valueLabel.translatesAutoresizingMaskIntoConstraints = false
        valueLabel.font = UIFont.systemFont(ofSize: 24, weight: .bold)
        valueLabel.textColor = UIColor.label
        valueLabel.textAlignment = .center
        backgroundView.addSubview(valueLabel)
        
        // Title Label
        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        titleLabel.font = UIFont.systemFont(ofSize: 12, weight: .medium)
        titleLabel.textColor = UIColor.secondaryLabel
        titleLabel.textAlignment = .center
        titleLabel.numberOfLines = 2
        backgroundView.addSubview(titleLabel)
        
        // Change Label
        changeLabel.translatesAutoresizingMaskIntoConstraints = false
        changeLabel.font = UIFont.systemFont(ofSize: 10, weight: .medium)
        changeLabel.textAlignment = .center
        changeLabel.layer.cornerRadius = 8
        changeLabel.clipsToBounds = true
        backgroundView.addSubview(changeLabel)
        
        setupConstraints()
    }
    
    private func setupConstraints() {
        NSLayoutConstraint.activate([
            // Background View
            backgroundView.topAnchor.constraint(equalTo: topAnchor),
            backgroundView.leadingAnchor.constraint(equalTo: leadingAnchor),
            backgroundView.trailingAnchor.constraint(equalTo: trailingAnchor),
            backgroundView.bottomAnchor.constraint(equalTo: bottomAnchor),
            
            // Icon
            iconImageView.topAnchor.constraint(equalTo: backgroundView.topAnchor, constant: 12),
            iconImageView.centerXAnchor.constraint(equalTo: backgroundView.centerXAnchor),
            iconImageView.widthAnchor.constraint(equalToConstant: 24),
            iconImageView.heightAnchor.constraint(equalToConstant: 24),
            
            // Value Label
            valueLabel.topAnchor.constraint(equalTo: iconImageView.bottomAnchor, constant: 8),
            valueLabel.leadingAnchor.constraint(equalTo: backgroundView.leadingAnchor, constant: 8),
            valueLabel.trailingAnchor.constraint(equalTo: backgroundView.trailingAnchor, constant: -8),
            
            // Title Label
            titleLabel.topAnchor.constraint(equalTo: valueLabel.bottomAnchor, constant: 4),
            titleLabel.leadingAnchor.constraint(equalTo: backgroundView.leadingAnchor, constant: 8),
            titleLabel.trailingAnchor.constraint(equalTo: backgroundView.trailingAnchor, constant: -8),
            
            // Change Label
            changeLabel.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 4),
            changeLabel.centerXAnchor.constraint(equalTo: backgroundView.centerXAnchor),
            changeLabel.widthAnchor.constraint(equalToConstant: 60),
            changeLabel.heightAnchor.constraint(equalToConstant: 16),
            changeLabel.bottomAnchor.constraint(lessThanOrEqualTo: backgroundView.bottomAnchor, constant: -12)
        ])
    }
    
    func configure(title: String, value: String, icon: String, change: String? = nil, changeType: ChangeType = .neutral) {
        titleLabel.text = title
        valueLabel.text = value
        iconImageView.image = UIImage(systemName: icon)
        
        if let change = change {
            changeLabel.text = change
            changeLabel.isHidden = false
            
            switch changeType {
            case .positive:
                changeLabel.backgroundColor = UIColor.systemGreen.withAlphaComponent(0.2)
                changeLabel.textColor = UIColor.systemGreen
            case .negative:
                changeLabel.backgroundColor = UIColor.systemRed.withAlphaComponent(0.2)
                changeLabel.textColor = UIColor.systemRed
            case .neutral:
                changeLabel.backgroundColor = UIColor.systemGray.withAlphaComponent(0.2)
                changeLabel.textColor = UIColor.systemGray
            }
        } else {
            changeLabel.isHidden = true
        }
    }
    
    enum ChangeType {
        case positive, negative, neutral
    }
}

// ============= CHART VIEW =============
class ChartView: UIView {
    
    private var dataPoints: [CGFloat] = []
    private var labels: [String] = []
    private let chartColor = UIColor.systemBlue
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
    }
    
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupUI()
    }
    
    private func setupUI() {
        backgroundColor = UIColor.systemBackground
        layer.cornerRadius = 8
        layer.borderWidth = 1
        layer.borderColor = UIColor.systemGray5.cgColor
    }
    
    override func draw(_ rect: CGRect) {
        super.draw(rect)
        
        guard !dataPoints.isEmpty else { return }
        
        let context = UIGraphicsGetCurrentContext()
        context?.setStrokeColor(chartColor.cgColor)
        context?.setLineWidth(2.0)
        
        let padding: CGFloat = 20
        let availableWidth = rect.width - (padding * 2)
        let availableHeight = rect.height - (padding * 2)
        
        let maxValue = dataPoints.max() ?? 1
        let minValue = dataPoints.min() ?? 0
        let valueRange = maxValue - minValue
        
        // Draw grid lines
        context?.setStrokeColor(UIColor.systemGray5.cgColor)
        context?.setLineWidth(0.5)
        
        for i in 0...4 {
            let y = padding + (availableHeight / 4) * CGFloat(i)
            context?.move(to: CGPoint(x: padding, y: y))
            context?.addLine(to: CGPoint(x: rect.width - padding, y: y))
        }
        context?.strokePath()
        
        // Draw data line
        context?.setStrokeColor(chartColor.cgColor)
        context?.setLineWidth(2.0)
        
        let stepX = availableWidth / CGFloat(dataPoints.count - 1)
        
        for (index, value) in dataPoints.enumerated() {
            let x = padding + stepX * CGFloat(index)
            let normalizedValue = (value - minValue) / valueRange
            let y = rect.height - padding - (normalizedValue * availableHeight)
            
            if index == 0 {
                context?.move(to: CGPoint(x: x, y: y))
            } else {
                context?.addLine(to: CGPoint(x: x, y: y))
            }
        }
        context?.strokePath()
        
        // Draw data points
        context?.setFillColor(chartColor.cgColor)
        
        for (index, value) in dataPoints.enumerated() {
            let x = padding + stepX * CGFloat(index)
            let normalizedValue = (value - minValue) / valueRange
            let y = rect.height - padding - (normalizedValue * availableHeight)
            
            context?.fillEllipse(in: CGRect(x: x - 3, y: y - 3, width: 6, height: 6))
        }
    }
    
    func setData(points: [CGFloat], labels: [String]) {
        self.dataPoints = points
        self.labels = labels
        setNeedsDisplay()
    }
}

// ============= NOTIFICATION VIEW =============
class NotificationView: UIView {
    
    private let titleLabel = UILabel()
    private let messageLabel = UILabel()
    private let iconImageView = UIImageView()
    private let timestampLabel = UILabel()
    private let closeButton = UIButton()
    
    var onClose: (() -> Void)?
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
    }
    
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupUI()
    }
    
    private func setupUI() {
        backgroundColor = UIColor.systemBackground
        layer.cornerRadius = 12
        layer.shadowColor = UIColor.black.cgColor
        layer.shadowOffset = CGSize(width: 0, height: 4)
        layer.shadowRadius = 8
        layer.shadowOpacity = 0.15
        
        // Icon
        iconImageView.translatesAutoresizingMaskIntoConstraints = false
        iconImageView.contentMode = .scaleAspectFit
        iconImageView.tintColor = UIColor.systemBlue
        addSubview(iconImageView)
        
        // Close Button
        closeButton.translatesAutoresizingMaskIntoConstraints = false
        closeButton.setImage(UIImage(systemName: "xmark"), for: .normal)
        closeButton.tintColor = UIColor.systemGray
        closeButton.addTarget(self, action: #selector(closeButtonTapped), for: .touchUpInside)
        addSubview(closeButton)
        
        // Title Label
        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        titleLabel.font = UIFont.systemFont(ofSize: 16, weight: .semibold)
        titleLabel.textColor = UIColor.label
        titleLabel.numberOfLines = 2
        addSubview(titleLabel)
        
        // Message Label
        messageLabel.translatesAutoresizingMaskIntoConstraints = false
        messageLabel.font = UIFont.systemFont(ofSize: 14, weight: .regular)
        messageLabel.textColor = UIColor.secondaryLabel
        messageLabel.numberOfLines = 3
        addSubview(messageLabel)
        
        // Timestamp Label
        timestampLabel.translatesAutoresizingMaskIntoConstraints = false
        timestampLabel.font = UIFont.systemFont(ofSize: 12, weight: .regular)
        timestampLabel.textColor = UIColor.tertiaryLabel
        addSubview(timestampLabel)
        
        setupConstraints()
    }
    
    private func setupConstraints() {
        NSLayoutConstraint.activate([
            // Icon
            iconImageView.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 16),
            iconImageView.topAnchor.constraint(equalTo: topAnchor, constant: 16),
            iconImageView.widthAnchor.constraint(equalToConstant: 24),
            iconImageView.heightAnchor.constraint(equalToConstant: 24),
            
            // Close Button
            closeButton.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -16),
            closeButton.topAnchor.constraint(equalTo: topAnchor, constant: 16),
            closeButton.widthAnchor.constraint(equalToConstant: 24),
            closeButton.heightAnchor.constraint(equalToConstant: 24),
            
            // Title Label
            titleLabel.leadingAnchor.constraint(equalTo: iconImageView.trailingAnchor, constant: 12),
            titleLabel.topAnchor.constraint(equalTo: topAnchor, constant: 16),
            titleLabel.trailingAnchor.constraint(equalTo: closeButton.leadingAnchor, constant: -8),
            
            // Message Label
            messageLabel.leadingAnchor.constraint(equalTo: titleLabel.leadingAnchor),
            messageLabel.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 4),
            messageLabel.trailingAnchor.constraint(equalTo: titleLabel.trailingAnchor),
            
            // Timestamp Label
            timestampLabel.leadingAnchor.constraint(equalTo: titleLabel.leadingAnchor),
            timestampLabel.topAnchor.constraint(equalTo: messageLabel.bottomAnchor, constant: 8),
            timestampLabel.trailingAnchor.constraint(equalTo: titleLabel.trailingAnchor),
            timestampLabel.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -16)
        ])
    }
    
    @objc private func closeButtonTapped() {
        onClose?()
    }
    
    func configure(title: String, message: String, timestamp: Date, type: NotificationType) {
        titleLabel.text = title
        messageLabel.text = message
        timestampLabel.text = DateFormatter.localizedString(from: timestamp, dateStyle: .none, timeStyle: .short)
        
        let iconName: String
        let iconColor: UIColor
        
        switch type {
        case .info:
            iconName = "info.circle.fill"
            iconColor = UIColor.systemBlue
        case .success:
            iconName = "checkmark.circle.fill"
            iconColor = UIColor.systemGreen
        case .warning:
            iconName = "exclamationmark.triangle.fill"
            iconColor = UIColor.systemOrange
        case .error:
            iconName = "xmark.circle.fill"
            iconColor = UIColor.systemRed
        }
        
        iconImageView.image = UIImage(systemName: iconName)
        iconImageView.tintColor = iconColor
    }
    
    enum NotificationType {
        case info, success, warning, error
    }
}

// ============= LOADING VIEW =============
class LoadingView: UIView {
    
    private let activityIndicator = UIActivityIndicatorView(style: .large)
    private let messageLabel = UILabel()
    private let backgroundView = UIView()
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
    }
    
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupUI()
    }
    
    private func setupUI() {
        backgroundColor = UIColor.black.withAlphaComponent(0.5)
        
        // Background View
        backgroundView.translatesAutoresizingMaskIntoConstraints = false
        backgroundView.backgroundColor = UIColor.systemBackground
        backgroundView.layer.cornerRadius = 12
        addSubview(backgroundView)
        
        // Activity Indicator
        activityIndicator.translatesAutoresizingMaskIntoConstraints = false
        activityIndicator.color = UIColor.systemBlue
        backgroundView.addSubview(activityIndicator)
        
        // Message Label
        messageLabel.translatesAutoresizingMaskIntoConstraints = false
        messageLabel.font = UIFont.systemFont(ofSize: 16, weight: .medium)
        messageLabel.textColor = UIColor.label
        messageLabel.textAlignment = .center
        messageLabel.text = "Cargando..."
        backgroundView.addSubview(messageLabel)
        
        setupConstraints()
    }
    
    private func setupConstraints() {
        NSLayoutConstraint.activate([
            // Background View
            backgroundView.centerXAnchor.constraint(equalTo: centerXAnchor),
            backgroundView.centerYAnchor.constraint(equalTo: centerYAnchor),
            backgroundView.widthAnchor.constraint(equalToConstant: 120),
            backgroundView.heightAnchor.constraint(equalToConstant: 100),
            
            // Activity Indicator
            activityIndicator.centerXAnchor.constraint(equalTo: backgroundView.centerXAnchor),
            activityIndicator.topAnchor.constraint(equalTo: backgroundView.topAnchor, constant: 20),
            
            // Message Label
            messageLabel.centerXAnchor.constraint(equalTo: backgroundView.centerXAnchor),
            messageLabel.topAnchor.constraint(equalTo: activityIndicator.bottomAnchor, constant: 12),
            messageLabel.leadingAnchor.constraint(equalTo: backgroundView.leadingAnchor, constant: 8),
            messageLabel.trailingAnchor.constraint(equalTo: backgroundView.trailingAnchor, constant: -8)
        ])
    }
    
    func show(in view: UIView, message: String = "Cargando...") {
        messageLabel.text = message
        activityIndicator.startAnimating()
        
        translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(self)
        
        NSLayoutConstraint.activate([
            topAnchor.constraint(equalTo: view.topAnchor),
            leadingAnchor.constraint(equalTo: view.leadingAnchor),
            trailingAnchor.constraint(equalTo: view.trailingAnchor),
            bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
        
        alpha = 0
        UIView.animate(withDuration: 0.3) {
            self.alpha = 1
        }
    }
    
    func hide() {
        UIView.animate(withDuration: 0.3, animations: {
            self.alpha = 0
        }) { _ in
            self.activityIndicator.stopAnimating()
            self.removeFromSuperview()
        }
    }
}

// ============= ERROR VIEW =============
class ErrorView: UIView {
    
    private let iconImageView = UIImageView()
    private let titleLabel = UILabel()
    private let messageLabel = UILabel()
    private let retryButton = UIButton()
    
    var onRetry: (() -> Void)?
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
    }
    
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupUI()
    }
    
    private func setupUI() {
        backgroundColor = UIColor.systemBackground
        
        // Icon
        iconImageView.translatesAutoresizingMaskIntoConstraints = false
        iconImageView.image = UIImage(systemName: "exclamationmark.triangle.fill")
        iconImageView.tintColor = UIColor.systemRed
        iconImageView.contentMode = .scaleAspectFit
        addSubview(iconImageView)
        
        // Title Label
        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        titleLabel.font = UIFont.systemFont(ofSize: 20, weight: .bold)
        titleLabel.textColor = UIColor.label
        titleLabel.textAlignment = .center
        titleLabel.text = "Error"
        addSubview(titleLabel)
        
        // Message Label
        messageLabel.translatesAutoresizingMaskIntoConstraints = false
        messageLabel.font = UIFont.systemFont(ofSize: 16, weight: .regular)
        messageLabel.textColor = UIColor.secondaryLabel
        messageLabel.textAlignment = .center
        messageLabel.numberOfLines = 0
        addSubview(messageLabel)
        
        // Retry Button
        retryButton.translatesAutoresizingMaskIntoConstraints = false
        retryButton.setTitle("Reintentar", for: .normal)
        retryButton.setTitleColor(UIColor.white, for: .normal)
        retryButton.backgroundColor = UIColor.systemBlue
        retryButton.layer.cornerRadius = 8
        retryButton.addTarget(self, action: #selector(retryButtonTapped), for: .touchUpInside)
        addSubview(retryButton)
        
        setupConstraints()
    }
    
    private func setupConstraints() {
        NSLayoutConstraint.activate([
            // Icon
            iconImageView.centerXAnchor.constraint(equalTo: centerXAnchor),
            iconImageView.centerYAnchor.constraint(equalTo: centerYAnchor, constant: -60),
            iconImageView.widthAnchor.constraint(equalToConstant: 60),
            iconImageView.heightAnchor.constraint(equalToConstant: 60),
            
            // Title Label
            titleLabel.centerXAnchor.constraint(equalTo: centerXAnchor),
            titleLabel.topAnchor.constraint(equalTo: iconImageView.bottomAnchor, constant: 16),
            titleLabel.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 32),
            titleLabel.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -32),
            
            // Message Label
            messageLabel.centerXAnchor.constraint(equalTo: centerXAnchor),
            messageLabel.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 8),
            messageLabel.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 32),
            messageLabel.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -32),
            
            // Retry Button
            retryButton.centerXAnchor.constraint(equalTo: centerXAnchor),
            retryButton.topAnchor.constraint(equalTo: messageLabel.bottomAnchor, constant: 24),
            retryButton.widthAnchor.constraint(equalToConstant: 120),
            retryButton.heightAnchor.constraint(equalToConstant: 44)
        ])
    }
    
    @objc private func retryButtonTapped() {
        onRetry?()
    }
    
    func configure(title: String, message: String) {
        titleLabel.text = title
        messageLabel.text = message
    }
}

// ============= EMPTY STATE VIEW =============
class EmptyStateView: UIView {
    
    private let iconImageView = UIImageView()
    private let titleLabel = UILabel()
    private let messageLabel = UILabel()
    private let actionButton = UIButton()
    
    var onAction: (() -> Void)?
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
    }
    
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupUI()
    }
    
    private func setupUI() {
        backgroundColor = UIColor.systemBackground
        
        // Icon
        iconImageView.translatesAutoresizingMaskIntoConstraints = false
        iconImageView.tintColor = UIColor.systemGray3
        iconImageView.contentMode = .scaleAspectFit
        addSubview(iconImageView)
        
        // Title Label
        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        titleLabel.font = UIFont.systemFont(ofSize: 20, weight: .semibold)
        titleLabel.textColor = UIColor.label
        titleLabel.textAlignment = .center
        addSubview(titleLabel)
        
        // Message Label
        messageLabel.translatesAutoresizingMaskIntoConstraints = false
        messageLabel.font = UIFont.systemFont(ofSize: 16, weight: .regular)
        messageLabel.textColor = UIColor.secondaryLabel
        messageLabel.textAlignment = .center
        messageLabel.numberOfLines = 0
        addSubview(messageLabel)
        
        // Action Button
        actionButton.translatesAutoresizingMaskIntoConstraints = false
        actionButton.setTitleColor(UIColor.white, for: .normal)
        actionButton.backgroundColor = UIColor.systemBlue
        actionButton.layer.cornerRadius = 8
        actionButton.addTarget(self, action: #selector(actionButtonTapped), for: .touchUpInside)
        addSubview(actionButton)
        
        setupConstraints()
    }
    
    private func setupConstraints() {
        NSLayoutConstraint.activate([
            // Icon
            iconImageView.centerXAnchor.constraint(equalTo: centerXAnchor),
            iconImageView.centerYAnchor.constraint(equalTo: centerYAnchor, constant: -80),
            iconImageView.widthAnchor.constraint(equalToConstant: 80),
            iconImageView.heightAnchor.constraint(equalToConstant: 80),
            
            // Title Label
            titleLabel.centerXAnchor.constraint(equalTo: centerXAnchor),
            titleLabel.topAnchor.constraint(equalTo: iconImageView.bottomAnchor, constant: 20),
            titleLabel.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 32),
            titleLabel.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -32),
            
            // Message Label
            messageLabel.centerXAnchor.constraint(equalTo: centerXAnchor),
            messageLabel.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 8),
            messageLabel.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 32),
            messageLabel.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -32),
            
            // Action Button
            actionButton.centerXAnchor.constraint(equalTo: centerXAnchor),
            actionButton.topAnchor.constraint(equalTo: messageLabel.bottomAnchor, constant: 24),
            actionButton.widthAnchor.constraint(equalToConstant: 160),
            actionButton.heightAnchor.constraint(equalToConstant: 44)
        ])
    }
    
    @objc private func actionButtonTapped() {
        onAction?()
    }
    
    func configure(icon: String, title: String, message: String, actionTitle: String? = nil) {
        iconImageView.image = UIImage(systemName: icon)
        titleLabel.text = title
        messageLabel.text = message
        
        if let actionTitle = actionTitle {
            actionButton.setTitle(actionTitle, for: .normal)
            actionButton.isHidden = false
        } else {
            actionButton.isHidden = true
        }
    }
}

// ============= CUSTOM BUTTON =============
class CustomButton: UIButton {
    
    enum ButtonStyle {
        case primary, secondary, accent, danger
    }
    
    private var buttonStyle: ButtonStyle = .primary
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
    }
    
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupUI()
    }
    
    private func setupUI() {
        layer.cornerRadius = 8
        titleLabel?.font = UIFont.systemFont(ofSize: 16, weight: .semibold)
        
        addTarget(self, action: #selector(buttonPressed), for: .touchDown)
        addTarget(self, action: #selector(buttonReleased), for: [.touchUpInside, .touchUpOutside, .touchCancel])
    }
    
    func setStyle(_ style: ButtonStyle) {
        self.buttonStyle = style
        updateAppearance()
    }
    
    private func updateAppearance() {
        switch buttonStyle {
        case .primary:
            backgroundColor = UIColor.systemBlue
            setTitleColor(UIColor.white, for: .normal)
            layer.borderWidth = 0
            
        case .secondary:
            backgroundColor = UIColor.clear
            setTitleColor(UIColor.systemBlue, for: .normal)
            layer.borderWidth = 2
            layer.borderColor = UIColor.systemBlue.cgColor
            
        case .accent:
            backgroundColor = UIColor.systemOrange
            setTitleColor(UIColor.white, for: .normal)
            layer.borderWidth = 0
            
        case .danger:
            backgroundColor = UIColor.systemRed
            setTitleColor(UIColor.white, for: .normal)
            layer.borderWidth = 0
        }
    }
    
    @objc private func buttonPressed() {
        UIView.animate(withDuration: 0.1) {
            self.transform = CGAffineTransform(scaleX: 0.95, y: 0.95)
            self.alpha = 0.8
        }
    }
    
    @objc private func buttonReleased() {
        UIView.animate(withDuration: 0.1) {
            self.transform = CGAffineTransform.identity
            self.alpha = 1.0
        }
    }
    
    override var isEnabled: Bool {
        didSet {
            alpha = isEnabled ? 1.0 : 0.5
        }
    }
}
