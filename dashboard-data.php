<?php
/**
 * CondoconnectAI - API Dashboard Data
 * Proporciona datos para todos los widgets del dashboard
 */

// Incluir configuraciones existentes
require_once '../condoconnect/config/database.php';
require_once '../condoconnect/config/auth.php';
require_once '../condoconnect/includes/functions.php';

// Incluir modelos existentes
require_once '../empresa_seguridad/models/Visitor.php';
require_once '../empresa_seguridad/models/AccessLog.php';
require_once '../empresa_seguridad/models/SecurityAlert.php';
require_once '../propiedades/models/Property.php';
require_once '../propiedades/models/Unit.php';
require_once '../propiedades/services/OccupancyService.php';

// Headers para API
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Verificar autenticación
session_start();
if (!isAuthenticated()) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

// Obtener acción solicitada
$action = $_GET['action'] ?? '';
$widget = $_GET['widget'] ?? '';

try {
    switch ($action) {
        case 'widget_data':
            echo json_encode(getWidgetData($widget));
            break;
        
        case 'financial_summary':
            echo json_encode(getFinancialSummary());
            break;
        
        case 'unit_occupancy':
            echo json_encode(getUnitOccupancy());
            break;
        
        case 'maintenance_orders':
            echo json_encode(getMaintenanceOrders());
            break;
        
        case 'recent_payments':
            echo json_encode(getRecentPayments());
            break;
        
        case 'active_communications':
            echo json_encode(getActiveCommunications());
            break;
        
        case 'daily_visitors':
            echo json_encode(getDailyVisitors());
            break;
        
        case 'weather_environment':
            echo json_encode(getWeatherEnvironment());
            break;
        
        case 'alerts_notifications':
            echo json_encode(getAlertsNotifications());
            break;
        
        case 'system_activity':
            echo json_encode(getSystemActivity());
            break;
        
        case 'events_calendar':
            echo json_encode(getEventsCalendar());
            break;
        
        case 'services_consumption':
            echo json_encode(getServicesConsumption());
            break;
        
        case 'space_reservations':
            echo json_encode(getSpaceReservations());
            break;
        
        case 'all_widgets':
            echo json_encode(getAllWidgetsData());
            break;
        
        default:
            http_response_code(400);
            echo json_encode(['error' => 'Invalid action']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Internal server error: ' . $e->getMessage()]);
}

/**
 * Obtener datos de un widget específico
 */
function getWidgetData($widget) {
    switch ($widget) {
        case 'financial-summary':
            return getFinancialSummary();
        case 'unit-occupancy':
            return getUnitOccupancy();
        case 'maintenance-orders':
            return getMaintenanceOrders();
        case 'recent-payments':
            return getRecentPayments();
        case 'active-communications':
            return getActiveCommunications();
        case 'daily-visitors':
            return getDailyVisitors();
        case 'weather-environment':
            return getWeatherEnvironment();
        case 'alerts-notifications':
            return getAlertsNotifications();
        case 'system-activity':
            return getSystemActivity();
        case 'events-calendar':
            return getEventsCalendar();
        case 'services-consumption':
            return getServicesConsumption();
        case 'space-reservations':
            return getSpaceReservations();
        default:
            return ['error' => 'Widget not found'];
    }
}

/**
 * Resumen Financiero
 */
function getFinancialSummary() {
    global $pdo;
    
    try {
        // Ingresos del mes actual
        $stmt = $pdo->prepare("
            SELECT 
                COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
                COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expenses,
                COUNT(CASE WHEN type = 'income' THEN 1 END) as income_count,
                COUNT(CASE WHEN type = 'expense' THEN 1 END) as expense_count
            FROM financial_transactions 
            WHERE YEAR(created_at) = YEAR(CURRENT_DATE()) 
            AND MONTH(created_at) = MONTH(CURRENT_DATE())
        ");
        $stmt->execute();
        $current = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Datos del mes anterior para comparación
        $stmt = $pdo->prepare("
            SELECT 
                COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
                COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expenses
            FROM financial_transactions 
            WHERE YEAR(created_at) = YEAR(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
            AND MONTH(created_at) = MONTH(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
        ");
        $stmt->execute();
        $previous = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Calcular cambios porcentuales
        $income_change = $previous['total_income'] > 0 ? 
            (($current['total_income'] - $previous['total_income']) / $previous['total_income']) * 100 : 0;
        
        $expense_change = $previous['total_expenses'] > 0 ? 
            (($current['total_expenses'] - $previous['total_expenses']) / $previous['total_expenses']) * 100 : 0;
        
        $balance = $current['total_income'] - $current['total_expenses'];
        $previous_balance = $previous['total_income'] - $previous['total_expenses'];
        $balance_change = $previous_balance != 0 ? 
            (($balance - $previous_balance) / abs($previous_balance)) * 100 : 0;
        
        // Datos para gráfico (últimos 6 meses)
        $stmt = $pdo->prepare("
            SELECT 
                DATE_FORMAT(created_at, '%Y-%m') as month,
                SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
                SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expenses
            FROM financial_transactions 
            WHERE created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 6 MONTH)
            GROUP BY DATE_FORMAT(created_at, '%Y-%m')
            ORDER BY month ASC
        ");
        $stmt->execute();
        $chart_data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return [
            'income' => [
                'value' => $current['total_income'],
                'change' => round($income_change, 1),
                'count' => $current['income_count']
            ],
            'expenses' => [
                'value' => $current['total_expenses'],
                'change' => round($expense_change, 1),
                'count' => $current['expense_count']
            ],
            'balance' => [
                'value' => $balance,
                'change' => round($balance_change, 1)
            ],
            'chart_data' => $chart_data,
            'last_updated' => date('Y-m-d H:i:s')
        ];
    } catch (Exception $e) {
        return ['error' => 'Error fetching financial data: ' . $e->getMessage()];
    }
}

/**
 * Ocupación de Unidades
 */
function getUnitOccupancy() {
    try {
        $occupancyService = new OccupancyService();
        $stats = $occupancyService->getOccupancyStats();
        
        global $pdo;
        
        // Obtener datos por torre
        $stmt = $pdo->prepare("
            SELECT 
                p.tower,
                COUNT(u.id) as total_units,
                COUNT(CASE WHEN u.status = 'occupied' THEN 1 END) as occupied_units,
                COUNT(CASE WHEN u.status = 'available' THEN 1 END) as available_units,
                COUNT(CASE WHEN u.status = 'maintenance' THEN 1 END) as maintenance_units
            FROM properties p
            LEFT JOIN units u ON p.id = u.property_id
            GROUP BY p.tower
            ORDER BY p.tower
        ");
        $stmt->execute();
        $towers = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Calcular porcentajes por torre
        foreach ($towers as &$tower) {
            $tower['occupancy_percentage'] = $tower['total_units'] > 0 ? 
                round(($tower['occupied_units'] / $tower['total_units']) * 100, 1) : 0;
        }
        
        return [
            'total_units' => $stats['total_units'] ?? 0,
            'occupied_units' => $stats['occupied_units'] ?? 0,
            'available_units' => $stats['available_units'] ?? 0,
            'maintenance_units' => $stats['maintenance_units'] ?? 0,
            'occupancy_percentage' => $stats['occupancy_percentage'] ?? 0,
            'towers' => $towers,
            'last_updated' => date('Y-m-d H:i:s')
        ];
    } catch (Exception $e) {
        return ['error' => 'Error fetching occupancy data: ' . $e->getMessage()];
    }
}

/**
 * Órdenes de Mantenimiento
 */
function getMaintenanceOrders() {
    global $pdo;
    
    try {
        // Resumen por estado
        $stmt = $pdo->prepare("
            SELECT 
                status,
                COUNT(*) as count,
                AVG(CASE WHEN status = 'completed' THEN 
                    TIMESTAMPDIFF(HOUR, created_at, updated_at) 
                END) as avg_completion_time
            FROM maintenance_orders 
            WHERE created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
            GROUP BY status
        ");
        $stmt->execute();
        $summary = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Órdenes recientes por prioridad
        $stmt = $pdo->prepare("
            SELECT 
                id,
                title,
                description,
                priority,
                status,
                location,
                created_at,
                assigned_to,
                estimated_completion
            FROM maintenance_orders 
            WHERE status IN ('pending', 'in_progress')
            ORDER BY 
                CASE priority 
                    WHEN 'urgent' THEN 1 
                    WHEN 'high' THEN 2 
                    WHEN 'normal' THEN 3 
                    WHEN 'low' THEN 4 
                END,
                created_at DESC
            LIMIT 10
        ");
        $stmt->execute();
        $recent_orders = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Estadísticas por tipo
        $stmt = $pdo->prepare("
            SELECT 
                category,
                COUNT(*) as count,
                AVG(CASE WHEN status = 'completed' THEN 
                    TIMESTAMPDIFF(HOUR, created_at, updated_at) 
                END) as avg_time
            FROM maintenance_orders 
            WHERE created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
            GROUP BY category
            ORDER BY count DESC
        ");
        $stmt->execute();
        $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return [
            'summary' => $summary,
            'recent_orders' => $recent_orders,
            'categories' => $categories,
            'last_updated' => date('Y-m-d H:i:s')
        ];
    } catch (Exception $e) {
        return ['error' => 'Error fetching maintenance data: ' . $e->getMessage()];
    }
}

/**
 * Pagos Recientes
 */
function getRecentPayments() {
    global $pdo;
    
    try {
        // Pagos de hoy
        $stmt = $pdo->prepare("
            SELECT 
                SUM(amount) as total_today,
                COUNT(*) as count_today
            FROM payments 
            WHERE DATE(created_at) = CURRENT_DATE()
            AND status = 'completed'
        ");
        $stmt->execute();
        $today_summary = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Pagos recientes
        $stmt = $pdo->prepare("
            SELECT 
                p.id,
                p.amount,
                p.concept,
                p.payment_method,
                p.created_at,
                u.unit_number,
                u.tower,
                r.first_name,
                r.last_name
            FROM payments p
            JOIN units u ON p.unit_id = u.id
            JOIN residents r ON p.resident_id = r.id
            WHERE p.status = 'completed'
            ORDER BY p.created_at DESC
            LIMIT 20
        ");
        $stmt->execute();
        $recent_payments = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Métodos de pago más usados
        $stmt = $pdo->prepare("
            SELECT 
                payment_method,
                COUNT(*) as count,
                SUM(amount) as total_amount
            FROM payments 
            WHERE DATE(created_at) = CURRENT_DATE()
            AND status = 'completed'
            GROUP BY payment_method
            ORDER BY count DESC
        ");
        $stmt->execute();
        $payment_methods = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Comparación con ayer
        $stmt = $pdo->prepare("
            SELECT 
                SUM(amount) as total_yesterday
            FROM payments 
            WHERE DATE(created_at) = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
            AND status = 'completed'
        ");
        $stmt->execute();
        $yesterday = $stmt->fetch(PDO::FETCH_ASSOC);
        
        $change_percentage = $yesterday['total_yesterday'] > 0 ? 
            (($today_summary['total_today'] - $yesterday['total_yesterday']) / $yesterday['total_yesterday']) * 100 : 0;
        
        return [
            'today_total' => $today_summary['total_today'] ?? 0,
            'today_count' => $today_summary['count_today'] ?? 0,
            'change_percentage' => round($change_percentage, 1),
            'recent_payments' => $recent_payments,
            'payment_methods' => $payment_methods,
            'last_updated' => date('Y-m-d H:i:s')
        ];
    } catch (Exception $e) {
        return ['error' => 'Error fetching payments data: ' . $e->getMessage()];
    }
}

/**
 * Comunicaciones Activas
 */
function getActiveCommunications() {
    global $pdo;
    
    try {
        // Estadísticas de hoy
        $stmt = $pdo->prepare("
            SELECT 
                channel,
                COUNT(*) as sent_count,
                COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_count,
                COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count
            FROM communications 
            WHERE DATE(created_at) = CURRENT_DATE()
            GROUP BY channel
        ");
        $stmt->execute();
        $stats = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Comunicaciones recientes
        $stmt = $pdo->prepare("
            SELECT 
                id,
                title,
                channel,
                recipient_count,
                status,
                created_at,
                delivered_at
            FROM communications 
            ORDER BY created_at DESC
            LIMIT 15
        ");
        $stmt->execute();
        $recent_communications = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Plantillas más usadas
        $stmt = $pdo->prepare("
            SELECT 
                template_name,
                COUNT(*) as usage_count
            FROM communications 
            WHERE template_name IS NOT NULL
            AND DATE(created_at) >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
            GROUP BY template_name
            ORDER BY usage_count DESC
            LIMIT 5
        ");
        $stmt->execute();
        $popular_templates = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return [
            'stats' => $stats,
            'recent_communications' => $recent_communications,
            'popular_templates' => $popular_templates,
            'last_updated' => date('Y-m-d H:i:s')
        ];
    } catch (Exception $e) {
        return ['error' => 'Error fetching communications data: ' . $e->getMessage()];
    }
}

/**
 * Visitantes del Día
 */
function getDailyVisitors() {
    try {
        $visitor = new Visitor();
        $today_visitors = $visitor->getTodayVisitors();
        
        global $pdo;
        
        // Estadísticas adicionales
        $stmt = $pdo->prepare("
            SELECT 
                status,
                COUNT(*) as count
            FROM visitors 
            WHERE DATE(visit_date) = CURRENT_DATE()
            GROUP BY status
        ");
        $stmt->execute();
        $status_stats = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Visitantes pendientes de autorización
        $stmt = $pdo->prepare("
            SELECT 
                v.id,
                v.visitor_name,
                v.visitor_phone,
                v.visit_purpose,
                v.expected_arrival,
                u.unit_number,
                u.tower,
                r.first_name as resident_name
            FROM visitors v
            JOIN units u ON v.unit_id = u.id
            JOIN residents r ON v.resident_id = r.id
            WHERE v.status = 'pending'
            AND DATE(v.visit_date) = CURRENT_DATE()
            ORDER BY v.expected_arrival ASC
        ");
        $stmt->execute();
        $pending_visitors = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Comparación con ayer
        $stmt = $pdo->prepare("
            SELECT COUNT(*) as yesterday_count
            FROM visitors 
            WHERE DATE(visit_date) = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
        ");
        $stmt->execute();
        $yesterday = $stmt->fetch(PDO::FETCH_ASSOC);
        
        $total_today = array_sum(array_column($status_stats, 'count'));
        $change = $total_today - ($yesterday['yesterday_count'] ?? 0);
        
        return [
            'total_today' => $total_today,
            'change_from_yesterday' => $change,
            'status_stats' => $status_stats,
            'pending_visitors' => $pending_visitors,
            'visitors_list' => $today_visitors,
            'last_updated' => date('Y-m-d H:i:s')
        ];
    } catch (Exception $e) {
        return ['error' => 'Error fetching visitors data: ' . $e->getMessage()];
    }
}

/**
 * Clima y Ambiente
 */
function getWeatherEnvironment() {
    try {
        // Datos del clima (simulados - integrar con API real)
        $weather_data = [
            'temperature' => 24,
            'condition' => 'Soleado',
            'humidity' => 65,
            'wind_speed' => 12,
            'visibility' => 10,
            'feels_like' => 26,
            'location' => 'Bogotá, Colombia'
        ];
        
        global $pdo;
        
        // Sensores ambientales
        $stmt = $pdo->prepare("
            SELECT 
                sensor_type,
                sensor_value,
                unit,
                status,
                last_reading
            FROM environmental_sensors 
            WHERE active = 1
            ORDER BY sensor_type
        ");
        $stmt->execute();
        $sensors = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return [
            'weather' => $weather_data,
            'sensors' => $sensors,
            'last_updated' => date('Y-m-d H:i:s')
        ];
    } catch (Exception $e) {
        return [
            'weather' => [
                'temperature' => 24,
                'condition' => 'Soleado',
                'humidity' => 65,
                'wind_speed' => 12,
                'visibility' => 10,
                'feels_like' => 26,
                'location' => 'Bogotá, Colombia'
            ],
            'sensors' => [
                ['sensor_type' => 'air_quality', 'sensor_value' => 'Buena', 'unit' => '', 'status' => 'active'],
                ['sensor_type' => 'water_level', 'sensor_value' => '85', 'unit' => '%', 'status' => 'active']
            ],
            'last_updated' => date('Y-m-d H:i:s')
        ];
    }
}

/**
 * Alertas y Notificaciones
 */
function getAlertsNotifications() {
    try {
        $securityAlert = new SecurityAlert();
        $alerts = $securityAlert->getActiveAlerts();
        
        global $pdo;
        
        // Contar alertas por tipo
        $stmt = $pdo->prepare("
            SELECT 
                alert_type,
                COUNT(*) as count
            FROM security_alerts 
            WHERE status = 'active'
            GROUP BY alert_type
        ");
        $stmt->execute();
        $alert_counts = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Alertas recientes
        $stmt = $pdo->prepare("
            SELECT 
                id,
                title,
                description,
                alert_type,
                priority,
                created_at,
                location
            FROM security_alerts 
            WHERE status = 'active'
            ORDER BY 
                CASE priority 
                    WHEN 'critical' THEN 1 
                    WHEN 'warning' THEN 2 
                    WHEN 'info' THEN 3 
                END,
                created_at DESC
            LIMIT 10
        ");
        $stmt->execute();
        $recent_alerts = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return [
            'alert_counts' => $alert_counts,
            'recent_alerts' => $recent_alerts,
            'total_active' => count($alerts),
            'last_updated' => date('Y-m-d H:i:s')
        ];
    } catch (Exception $e) {
        return ['error' => 'Error fetching alerts data: ' . $e->getMessage()];
    }
}

/**
 * Actividad del Sistema
 */
function getSystemActivity() {
    global $pdo;
    
    try {
        // Usuarios activos
        $stmt = $pdo->prepare("
            SELECT COUNT(DISTINCT user_id) as active_users
            FROM user_sessions 
            WHERE last_activity >= DATE_SUB(NOW(), INTERVAL 30 MINUTE)
        ");
        $stmt->execute();
        $active_users = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Acciones de hoy
        $stmt = $pdo->prepare("
            SELECT COUNT(*) as total_actions
            FROM activity_log 
            WHERE DATE(created_at) = CURRENT_DATE()
        ");
        $stmt->execute();
        $actions_today = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Actividad reciente
        $stmt = $pdo->prepare("
            SELECT 
                al.action,
                al.description,
                al.created_at,
                u.username
            FROM activity_log al
            JOIN users u ON al.user_id = u.id
            ORDER BY al.created_at DESC
            LIMIT 10
        ");
        $stmt->execute();
        $recent_activity = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Datos para gráfico de actividad por hora
        $stmt = $pdo->prepare("
            SELECT 
                HOUR(created_at) as hour,
                COUNT(*) as activity_count
            FROM activity_log 
            WHERE DATE(created_at) = CURRENT_DATE()
            GROUP BY HOUR(created_at)
            ORDER BY hour
        ");
        $stmt->execute();
        $hourly_activity = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return [
            'active_users' => $active_users['active_users'] ?? 0,
            'actions_today' => $actions_today['total_actions'] ?? 0,
            'uptime' => '99.8%', // Calcular uptime real
            'recent_activity' => $recent_activity,
            'hourly_activity' => $hourly_activity,
            'last_updated' => date('Y-m-d H:i:s')
        ];
    } catch (Exception $e) {
        return ['error' => 'Error fetching system activity: ' . $e->getMessage()];
    }
}

/**
 * Calendario de Eventos
 */
function getEventsCalendar() {
    global $pdo;
    
    try {
        // Eventos del mes actual
        $stmt = $pdo->prepare("
            SELECT 
                id,
                title,
                description,
                event_date,
                start_time,
                end_time,
                location,
                event_type
            FROM events 
            WHERE YEAR(event_date) = YEAR(CURRENT_DATE())
            AND MONTH(event_date) = MONTH(CURRENT_DATE())
            ORDER BY event_date ASC, start_time ASC
        ");
        $stmt->execute();
        $monthly_events = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Próximos eventos
        $stmt = $pdo->prepare("
            SELECT 
                id,
                title,
                description,
                event_date,
                start_time,
                location
            FROM events 
            WHERE event_date >= CURRENT_DATE()
            ORDER BY event_date ASC, start_time ASC
            LIMIT 5
        ");
        $stmt->execute();
        $upcoming_events = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return [
            'monthly_events' => $monthly_events,
            'upcoming_events' => $upcoming_events,
            'current_month' => date('Y-m'),
            'last_updated' => date('Y-m-d H:i:s')
        ];
    } catch (Exception $e) {
        return ['error' => 'Error fetching events data: ' . $e->getMessage()];
    }
}

/**
 * Consumo de Servicios
 */
function getServicesConsumption() {
    global $pdo;
    
    try {
        // Consumo del mes actual
        $stmt = $pdo->prepare("
            SELECT 
                service_type,
                SUM(consumption) as total_consumption,
                unit,
                AVG(consumption) as avg_daily
            FROM service_consumption 
            WHERE YEAR(reading_date) = YEAR(CURRENT_DATE())
            AND MONTH(reading_date) = MONTH(CURRENT_DATE())
            GROUP BY service_type, unit
        ");
        $stmt->execute();
        $current_consumption = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Comparación con mes anterior
        $stmt = $pdo->prepare("
            SELECT 
                service_type,
                SUM(consumption) as total_consumption
            FROM service_consumption 
            WHERE YEAR(reading_date) = YEAR(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
            AND MONTH(reading_date) = MONTH(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
            GROUP BY service_type
        ");
        $stmt->execute();
        $previous_consumption = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Calcular cambios porcentuales
        $consumption_data = [];
        foreach ($current_consumption as $current) {
            $previous = array_filter($previous_consumption, function($p) use ($current) {
                return $p['service_type'] === $current['service_type'];
            });
            $previous = reset($previous);
            
            $change = 0;
            if ($previous && $previous['total_consumption'] > 0) {
                $change = (($current['total_consumption'] - $previous['total_consumption']) / $previous['total_consumption']) * 100;
            }
            
            $consumption_data[] = [
                'service_type' => $current['service_type'],
                'current_consumption' => $current['total_consumption'],
                'unit' => $current['unit'],
                'change_percentage' => round($change, 1),
                'avg_daily' => $current['avg_daily']
            ];
        }
        
        return [
            'consumption_data' => $consumption_data,
            'last_updated' => date('Y-m-d H:i:s')
        ];
    } catch (Exception $e) {
        return ['error' => 'Error fetching consumption data: ' . $e->getMessage()];
    }
}

/**
 * Reservas de Espacios
 */
function getSpaceReservations() {
    global $pdo;
    
    try {
        // Reservas de hoy
        $stmt = $pdo->prepare("
            SELECT 
                sr.id,
                sr.start_time,
                sr.end_time,
                sr.status,
                cs.space_name,
                r.first_name,
                r.last_name,
                u.unit_number,
                u.tower
            FROM space_reservations sr
            JOIN common_spaces cs ON sr.space_id = cs.id
            JOIN residents r ON sr.resident_id = r.id
            JOIN units u ON r.unit_id = u.id
            WHERE DATE(sr.reservation_date) = CURRENT_DATE()
            ORDER BY sr.start_time ASC
        ");
        $stmt->execute();
        $today_reservations = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Estadísticas de reservas
        $stmt = $pdo->prepare("
            SELECT 
                COUNT(*) as total_today,
                COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_today,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_today
            FROM space_reservations 
            WHERE DATE(reservation_date) = CURRENT_DATE()
        ");
        $stmt->execute();
        $stats = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Reservas de esta semana
        $stmt = $pdo->prepare("
            SELECT COUNT(*) as week_total
            FROM space_reservations 
            WHERE YEARWEEK(reservation_date) = YEARWEEK(CURRENT_DATE())
        ");
        $stmt->execute();
        $week_stats = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Espacios más reservados
        $stmt = $pdo->prepare("
            SELECT 
                cs.space_name,
                COUNT(*) as reservation_count
            FROM space_reservations sr
            JOIN common_spaces cs ON sr.space_id = cs.id
            WHERE sr.reservation_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
            GROUP BY cs.space_name
            ORDER BY reservation_count DESC
            LIMIT 5
        ");
        $stmt->execute();
        $popular_spaces = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return [
            'today_reservations' => $today_reservations,
            'stats' => $stats,
            'week_total' => $week_stats['week_total'] ?? 0,
            'popular_spaces' => $popular_spaces,
            'last_updated' => date('Y-m-d H:i:s')
        ];
    } catch (Exception $e) {
        return ['error' => 'Error fetching reservations data: ' . $e->getMessage()];
    }
}

/**
 * Obtener datos de todos los widgets
 */
function getAllWidgetsData() {
    return [
        'financial_summary' => getFinancialSummary(),
        'unit_occupancy' => getUnitOccupancy(),
        'maintenance_orders' => getMaintenanceOrders(),
        'recent_payments' => getRecentPayments(),
        'active_communications' => getActiveCommunications(),
        'daily_visitors' => getDailyVisitors(),
        'weather_environment' => getWeatherEnvironment(),
        'alerts_notifications' => getAlertsNotifications(),
        'system_activity' => getSystemActivity(),
        'events_calendar' => getEventsCalendar(),
        'services_consumption' => getServicesConsumption(),
        'space_reservations' => getSpaceReservations()
    ];
}

/**
 * Función auxiliar para verificar autenticación
 */
function isAuthenticated() {
    return isset($_SESSION['user_id']) && !empty($_SESSION['user_id']);
}
?>
