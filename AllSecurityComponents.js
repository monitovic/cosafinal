import React, { useState, useEffect } from 'react';
import { API } from 'aws-amplify';
import LoadingSpinner from '../shared/LoadingSpinner';
import ErrorMessage from '../shared/ErrorMessage';
import Modal from '../shared/Modal';
import SearchBar from '../shared/SearchBar';
import FilterDropdown from '../shared/FilterDropdown';
import LiveFeed from '../shared/LiveFeed';
import './SecurityComponent.css';

// ============= SECURITY COMPONENT =============
const SecurityComponent = () => {
    const [securityEvents, setSecurityEvents] = useState([]);
    const [visitors, setVisitors] = useState([]);
    const [accessLogs, setAccessLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('events'); // 'events', 'visitors', 'access', 'cameras'
    const [searchTerm, setSearchTerm] = useState('');
    const [severityFilter, setSeverityFilter] = useState('all');
    const [showAddVisitorModal, setShowAddVisitorModal] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [showEventModal, setShowEventModal] = useState(false);
    const [securityStats, setSecurityStats] = useState({
        totalEvents: 0,
        criticalEvents: 0,
        activeVisitors: 0,
        accessAttempts: 0,
        systemStatus: 'online'
    });
    const [systemControls, setSystemControls] = useState({
        alarmSystem: true,
        cameraMonitoring: true,
        accessControl: true,
        motionDetection: true
    });

    useEffect(() => {
        loadSecurityData();
        
        // Set up real-time updates
        const interval = setInterval(() => {
            refreshSecurityData();
        }, 30000); // Refresh every 30 seconds
        
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        filterData();
    }, [securityEvents, visitors, accessLogs, searchTerm, severityFilter]);

    const loadSecurityData = async () => {
        try {
            setLoading(true);
            setError('');
            
            const [events, visitorsData, access, stats] = await Promise.all([
                API.get('CondoconnectAPI', '/security/events'),
                API.get('CondoconnectAPI', '/security/visitors'),
                API.get('CondoconnectAPI', '/security/access-logs'),
                API.get('CondoconnectAPI', '/security/stats')
            ]);
            
            setSecurityEvents(events.data);
            setVisitors(visitorsData.data);
            setAccessLogs(access.data);
            setSecurityStats(stats.data);
            
        } catch (err) {
            console.error('Error loading security data:', err);
            setError('Error cargando datos de seguridad');
        } finally {
            setLoading(false);
        }
    };

    const refreshSecurityData = async () => {
        try {
            const [events, visitorsData, access] = await Promise.all([
                API.get('CondoconnectAPI', '/security/events'),
                API.get('CondoconnectAPI', '/security/visitors'),
                API.get('CondoconnectAPI', '/security/access-logs')
            ]);
            
            setSecurityEvents(events.data);
            setVisitors(visitorsData.data);
            setAccessLogs(access.data);
            
        } catch (err) {
            console.error('Error refreshing security data:', err);
        }
    };

    const filterData = () => {
        // Filter logic will be implemented based on active tab
        // This is a placeholder for the filtering functionality
    };

    const handleSystemControlChange = async (control, value) => {
        try {
            await API.put('CondoconnectAPI', '/security/controls', {
                body: { [control]: value }
            });
            
            setSystemControls(prev => ({
                ...prev,
                [control]: value
            }));
            
        } catch (err) {
            console.error('Error updating system control:', err);
            alert('Error actualizando control del sistema');
        }
    };

    const handleEmergencyAlert = async () => {
        if (!window.confirm('¿Está seguro de que desea activar la alerta de emergencia?')) {
            return;
        }
        
        try {
            await API.post('CondoconnectAPI', '/security/emergency-alert', {
                body: { 
                    type: 'manual',
                    location: 'Security Dashboard',
                    timestamp: new Date().toISOString()
                }
            });
            
            alert('Alerta de emergencia activada');
            loadSecurityData();
            
        } catch (err) {
            console.error('Error activating emergency alert:', err);
            alert('Error activando alerta de emergencia');
        }
    };

    const handleAddVisitor = async (visitorData) => {
        try {
            const response = await API.post('CondoconnectAPI', '/security/visitors', {
                body: visitorData
            });
            
            setVisitors(prev => [response.data, ...prev]);
            setShowAddVisitorModal(false);
            
        } catch (err) {
            console.error('Error adding visitor:', err);
            throw new Error('Error agregando visitante');
        }
    };

    const handleEventClick = (event) => {
        setSelectedEvent(event);
        setShowEventModal(true);
    };

    if (loading) {
        return (
            <div className="security-loading">
                <LoadingSpinner size="large" />
                <p>Cargando sistema de seguridad...</p>
            </div>
        );
    }

    return (
        <div className="security-container">
            <div className="security-header">
                <div className="header-content">
                    <h1>Centro de Seguridad</h1>
                    <p>Monitoreo y control de seguridad en tiempo real</p>
                </div>
                <div className="header-actions">
                    <button 
                        onClick={handleEmergencyAlert}
                        className="emergency-btn"
                    >
                        🚨 Alerta de Emergencia
                    </button>
                    <div className={`system-status ${securityStats.systemStatus}`}>
                        <span className="status-indicator"></span>
                        Sistema {securityStats.systemStatus === 'online' ? 'En Línea' : 'Fuera de Línea'}
                    </div>
                </div>
            </div>

            {error && <ErrorMessage message={error} />}

            {/* Security Stats */}
            <div className="security-stats">
                <div className="stat-card">
                    <div className="stat-icon">🛡️</div>
                    <div className="stat-content">
                        <h3>{securityStats.totalEvents}</h3>
                        <p>Eventos Totales</p>
                    </div>
                </div>
                
                <div className="stat-card critical">
                    <div className="stat-icon">⚠️</div>
                    <div className="stat-content">
                        <h3>{securityStats.criticalEvents}</h3>
                        <p>Eventos Críticos</p>
                    </div>
                </div>
                
                <div className="stat-card">
                    <div className="stat-icon">👥</div>
                    <div className="stat-content">
                        <h3>{securityStats.activeVisitors}</h3>
                        <p>Visitantes Activos</p>
                    </div>
                </div>
                
                <div className="stat-card">
                    <div className="stat-icon">🔑</div>
                    <div className="stat-content">
                        <h3>{securityStats.accessAttempts}</h3>
                        <p>Intentos de Acceso</p>
                    </div>
                </div>
            </div>

            {/* System Controls */}
            <div className="system-controls">
                <h3>Controles del Sistema</h3>
                <div className="controls-grid">
                    <SystemControl
                        label="Sistema de Alarma"
                        icon="🚨"
                        active={systemControls.alarmSystem}
                        onChange={(value) => handleSystemControlChange('alarmSystem', value)}
                    />
                    <SystemControl
                        label="Monitoreo de Cámaras"
                        icon="📹"
                        active={systemControls.cameraMonitoring}
                        onChange={(value) => handleSystemControlChange('cameraMonitoring', value)}
                    />
                    <SystemControl
                        label="Control de Acceso"
                        icon="🔐"
                        active={systemControls.accessControl}
                        onChange={(value) => handleSystemControlChange('accessControl', value)}
                    />
                    <SystemControl
                        label="Detección de Movimiento"
                        icon="🏃"
                        active={systemControls.motionDetection}
                        onChange={(value) => handleSystemControlChange('motionDetection', value)}
                    />
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="security-tabs">
                <button 
                    className={`tab-btn ${activeTab === 'events' ? 'active' : ''}`}
                    onClick={() => setActiveTab('events')}
                >
                    🛡️ Eventos de Seguridad
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'visitors' ? 'active' : ''}`}
                    onClick={() => setActiveTab('visitors')}
                >
                    👥 Visitantes
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'access' ? 'active' : ''}`}
                    onClick={() => setActiveTab('access')}
                >
                    🔑 Registro de Acceso
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'cameras' ? 'active' : ''}`}
                    onClick={() => setActiveTab('cameras')}
                >
                    📹 Cámaras en Vivo
                </button>
            </div>

            {/* Tab Content */}
            <div className="security-content">
                {activeTab === 'events' && (
                    <SecurityEventsTab
                        events={securityEvents}
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                        severityFilter={severityFilter}
                        setSeverityFilter={setSeverityFilter}
                        onEventClick={handleEventClick}
                    />
                )}
                
                {activeTab === 'visitors' && (
                    <VisitorsTab
                        visitors={visitors}
                        onAddVisitor={() => setShowAddVisitorModal(true)}
                    />
                )}
                
                {activeTab === 'access' && (
                    <AccessLogsTab
                        accessLogs={accessLogs}
                    />
                )}
                
                {activeTab === 'cameras' && (
                    <CamerasTab />
                )}
            </div>

            {/* Add Visitor Modal */}
            {showAddVisitorModal && (
                <Modal
                    title="Registrar Nuevo Visitante"
                    onClose={() => setShowAddVisitorModal(false)}
                >
                    <AddVisitorForm
                        onSubmit={handleAddVisitor}
                        onCancel={() => setShowAddVisitorModal(false)}
                    />
                </Modal>
            )}

            {/* Event Detail Modal */}
            {showEventModal && selectedEvent && (
                <Modal
                    title="Detalles del Evento de Seguridad"
                    onClose={() => {
                        setShowEventModal(false);
                        setSelectedEvent(null);
                    }}
                >
                    <SecurityEventDetail
                        event={selectedEvent}
                        onClose={() => {
                            setShowEventModal(false);
                            setSelectedEvent(null);
                        }}
                    />
                </Modal>
            )}
        </div>
    );
};

// ============= SYSTEM CONTROL COMPONENT =============
const SystemControl = ({ label, icon, active, onChange }) => {
    return (
        <div className="system-control">
            <div className="control-info">
                <span className="control-icon">{icon}</span>
                <span className="control-label">{label}</span>
            </div>
            <div className="control-toggle">
                <label className="toggle-switch">
                    <input
                        type="checkbox"
                        checked={active}
                        onChange={(e) => onChange(e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                </label>
            </div>
        </div>
    );
};

// ============= SECURITY EVENTS TAB COMPONENT =============
const SecurityEventsTab = ({ 
    events, 
    searchTerm, 
    setSearchTerm, 
    severityFilter, 
    setSeverityFilter, 
    onEventClick 
}) => {
    const severityOptions = [
        { value: 'all', label: 'Todas las Severidades' },
        { value: 'info', label: 'Información' },
        { value: 'low', label: 'Baja' },
        { value: 'medium', label: 'Media' },
        { value: 'high', label: 'Alta' },
        { value: 'critical', label: 'Crítica' }
    ];

    const filteredEvents = events.filter(event => {
        const matchesSearch = !searchTerm || 
            event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            event.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
            event.type.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesSeverity = severityFilter === 'all' || event.severity === severityFilter;
        
        return matchesSearch && matchesSeverity;
    });

    return (
        <div className="security-events-tab">
            <div className="events-controls">
                <SearchBar
                    value={searchTerm}
                    onChange={setSearchTerm}
                    placeholder="Buscar eventos por descripción, ubicación o tipo..."
                />
                
                <FilterDropdown
                    value={severityFilter}
                    onChange={setSeverityFilter}
                    options={severityOptions}
                    label="Severidad"
                />
            </div>
            
            <div className="events-list">
                {filteredEvents.length === 0 ? (
                    <div className="no-events">
                        <div className="no-events-icon">🛡️</div>
                        <h3>No se encontraron eventos</h3>
                        <p>No hay eventos de seguridad que coincidan con los filtros</p>
                    </div>
                ) : (
                    filteredEvents.map(event => (
                        <SecurityEventCard
                            key={event.id}
                            event={event}
                            onClick={() => onEventClick(event)}
                        />
                    ))
                )}
            </div>
        </div>
    );
};

// ============= SECURITY EVENT CARD COMPONENT =============
const SecurityEventCard = ({ event, onClick }) => {
    const getSeverityColor = (severity) => {
        const colors = {
            'info': '#2196F3',
            'low': '#4CAF50',
            'medium': '#FF9800',
            'high': '#F44336',
            'critical': '#9C27B0'
        };
        return colors[severity] || '#757575';
    };

    const getSeverityText = (severity) => {
        const texts = {
            'info': 'Información',
            'low': 'Baja',
            'medium': 'Media',
            'high': 'Alta',
            'critical': 'Crítica'
        };
        return texts[severity] || severity;
    };

    const getEventIcon = (type) => {
        const icons = {
            'access_granted': '✅',
            'access_denied': '❌',
            'alarm_triggered': '🚨',
            'motion_detected': '🏃',
            'door_opened': '🚪',
            'camera_offline': '📹',
            'system_error': '⚠️',
            'emergency_alert': '🆘'
        };
        return icons[type] || '🛡️';
    };

    return (
        <div className="security-event-card" onClick={onClick}>
            <div className="event-header">
                <div className="event-icon">
                    {getEventIcon(event.type)}
                </div>
                <div className="event-info">
                    <h4 className="event-type">{event.type.replace('_', ' ').toUpperCase()}</h4>
                    <span 
                        className="event-severity"
                        style={{ 
                            backgroundColor: getSeverityColor(event.severity),
                            color: 'white'
                        }}
                    >
                        {getSeverityText(event.severity)}
                    </span>
                </div>
                <div className="event-time">
                    {new Date(event.timestamp).toLocaleString()}
                </div>
            </div>
            
            <div className="event-content">
                <p className="event-description">{event.description}</p>
                <div className="event-meta">
                    <span className="event-location">📍 {event.location}</span>
                    {event.userId && (
                        <span className="event-user">👤 {event.userName || event.userId}</span>
                    )}
                </div>
            </div>
        </div>
    );
};

// ============= VISITORS TAB COMPONENT =============
const VisitorsTab = ({ visitors, onAddVisitor }) => {
    const [statusFilter, setStatusFilter] = useState('all');
    
    const statusOptions = [
        { value: 'all', label: 'Todos los Estados' },
        { value: 'expected', label: 'Esperado' },
        { value: 'checked_in', label: 'Ingresado' },
        { value: 'checked_out', label: 'Salió' },
        { value: 'denied', label: 'Denegado' },
        { value: 'expired', label: 'Expirado' }
    ];

    const filteredVisitors = visitors.filter(visitor => 
        statusFilter === 'all' || visitor.status === statusFilter
    );

    return (
        <div className="visitors-tab">
            <div className="visitors-controls">
                <FilterDropdown
                    value={statusFilter}
                    onChange={setStatusFilter}
                    options={statusOptions}
                    label="Estado"
                />
                
                <button onClick={onAddVisitor} className="add-visitor-btn">
                    + Registrar Visitante
                </button>
            </div>
            
            <div className="visitors-list">
                {filteredVisitors.length === 0 ? (
                    <div className="no-visitors">
                        <div className="no-visitors-icon">👥</div>
                        <h3>No hay visitantes</h3>
                        <p>No hay visitantes registrados con el estado seleccionado</p>
                    </div>
                ) : (
                    <div className="visitors-grid">
                        {filteredVisitors.map(visitor => (
                            <VisitorCard key={visitor.id} visitor={visitor} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// ============= VISITOR CARD COMPONENT =============
const VisitorCard = ({ visitor }) => {
    const getStatusColor = (status) => {
        const colors = {
            'expected': '#2196F3',
            'checked_in': '#4CAF50',
            'checked_out': '#757575',
            'denied': '#F44336',
            'expired': '#FF9800'
        };
        return colors[status] || '#757575';
    };

    const getStatusText = (status) => {
        const texts = {
            'expected': 'Esperado',
            'checked_in': 'Ingresado',
            'checked_out': 'Salió',
            'denied': 'Denegado',
            'expired': 'Expirado'
        };
        return texts[status] || status;
    };

    return (
        <div className="visitor-card">
            <div className="visitor-header">
                <div className="visitor-avatar">
                    {visitor.photo ? (
                        <img src={visitor.photo} alt={visitor.name} />
                    ) : (
                        <div className="avatar-placeholder">
                            {visitor.name.charAt(0).toUpperCase()}
                        </div>
                    )}
                </div>
                <div className="visitor-info">
                    <h4 className="visitor-name">{visitor.name}</h4>
                    <p className="visitor-phone">{visitor.phone}</p>
                </div>
                <span 
                    className="visitor-status"
                    style={{ 
                        backgroundColor: getStatusColor(visitor.status),
                        color: 'white'
                    }}
                >
                    {getStatusText(visitor.status)}
                </span>
            </div>
            
            <div className="visitor-details">
                <div className="detail-item">
                    <span className="detail-label">Visitando:</span>
                    <span className="detail-value">Unidad {visitor.visitingUnit}</span>
                </div>
                <div className="detail-item">
                    <span className="detail-label">Fecha:</span>
                    <span className="detail-value">
                        {new Date(visitor.visitDate).toLocaleDateString()}
                    </span>
                </div>
                <div className="detail-item">
                    <span className="detail-label">Hora:</span>
                    <span className="detail-value">{visitor.visitTime}</span>
                </div>
                <div className="detail-item">
                    <span className="detail-label">Propósito:</span>
                    <span className="detail-value">{visitor.purpose}</span>
                </div>
            </div>
            
            {visitor.checkInTime && (
                <div className="visitor-timestamps">
                    <div className="timestamp-item">
                        <span className="timestamp-label">Ingreso:</span>
                        <span className="timestamp-value">
                            {new Date(visitor.checkInTime).toLocaleTimeString()}
                        </span>
                    </div>
                    {visitor.checkOutTime && (
                        <div className="timestamp-item">
                            <span className="timestamp-label">Salida:</span>
                            <span className="timestamp-value">
                                {new Date(visitor.checkOutTime).toLocaleTimeString()}
                            </span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ============= ACCESS LOGS TAB COMPONENT =============
const AccessLogsTab = ({ accessLogs }) => {
    const [dateFilter, setDateFilter] = useState('today');
    
    const dateOptions = [
        { value: 'today', label: 'Hoy' },
        { value: 'yesterday', label: 'Ayer' },
        { value: 'week', label: 'Esta Semana' },
        { value: 'month', label: 'Este Mes' }
    ];

    const filteredLogs = accessLogs.filter(log => {
        const logDate = new Date(log.timestamp);
        const now = new Date();
        
        switch (dateFilter) {
            case 'today':
                return logDate.toDateString() === now.toDateString();
            case 'yesterday':
                const yesterday = new Date(now);
                yesterday.setDate(yesterday.getDate() - 1);
                return logDate.toDateString() === yesterday.toDateString();
            case 'week':
                const weekAgo = new Date(now);
                weekAgo.setDate(weekAgo.getDate() - 7);
                return logDate >= weekAgo;
            case 'month':
                const monthAgo = new Date(now);
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                return logDate >= monthAgo;
            default:
                return true;
        }
    });

    return (
        <div className="access-logs-tab">
            <div className="logs-controls">
                <FilterDropdown
                    value={dateFilter}
                    onChange={setDateFilter}
                    options={dateOptions}
                    label="Período"
                />
            </div>
            
            <div className="access-logs-table">
                <table>
                    <thead>
                        <tr>
                            <th>Hora</th>
                            <th>Usuario</th>
                            <th>Acción</th>
                            <th>Ubicación</th>
                            <th>Estado</th>
                            <th>Método</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredLogs.map(log => (
                            <AccessLogRow key={log.id} log={log} />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// ============= ACCESS LOG ROW COMPONENT =============
const AccessLogRow = ({ log }) => {
    const getStatusColor = (status) => {
        const colors = {
            'success': '#4CAF50',
            'denied': '#F44336',
            'error': '#FF9800'
        };
        return colors[status] || '#757575';
    };

    const getActionIcon = (action) => {
        const icons = {
            'entry': '🚪➡️',
            'exit': '🚪⬅️',
            'unlock': '🔓',
            'lock': '🔒'
        };
        return icons[action] || '🔑';
    };

    return (
        <tr className="access-log-row">
            <td className="log-time">
                {new Date(log.timestamp).toLocaleTimeString()}
            </td>
            <td className="log-user">
                <div className="user-info">
                    <span className="user-name">{log.userName}</span>
                    <span className="user-id">{log.userId}</span>
                </div>
            </td>
            <td className="log-action">
                <span className="action-icon">{getActionIcon(log.action)}</span>
                {log.action}
            </td>
            <td className="log-location">{log.location}</td>
            <td className="log-status">
                <span 
                    className="status-badge"
                    style={{ 
                        backgroundColor: getStatusColor(log.status),
                        color: 'white'
                    }}
                >
                    {log.status}
                </span>
            </td>
            <td className="log-method">{log.method}</td>
        </tr>
    );
};

// ============= CAMERAS TAB COMPONENT =============
const CamerasTab = () => {
    const [cameras] = useState([
        { id: 'cam_001', name: 'Entrada Principal', location: 'Lobby', status: 'online', streamUrl: '/api/camera/cam_001/stream' },
        { id: 'cam_002', name: 'Estacionamiento A', location: 'Estacionamiento', status: 'online', streamUrl: '/api/camera/cam_002/stream' },
        { id: 'cam_003', name: 'Piscina', location: 'Área Recreativa', status: 'offline', streamUrl: '/api/camera/cam_003/stream' },
        { id: 'cam_004', name: 'Gimnasio', location: 'Gimnasio', status: 'online', streamUrl: '/api/camera/cam_004/stream' }
    ]);

    return (
        <div className="cameras-tab">
            <div className="cameras-grid">
                {cameras.map(camera => (
                    <CameraFeed key={camera.id} camera={camera} />
                ))}
            </div>
        </div>
    );
};

// ============= CAMERA FEED COMPONENT =============
const CameraFeed = ({ camera }) => {
    return (
        <div className="camera-feed">
            <div className="camera-header">
                <h4 className="camera-name">{camera.name}</h4>
                <span className={`camera-status ${camera.status}`}>
                    <span className="status-indicator"></span>
                    {camera.status === 'online' ? 'En Línea' : 'Fuera de Línea'}
                </span>
            </div>
            
            <div className="camera-video">
                {camera.status === 'online' ? (
                    <LiveFeed streamUrl={camera.streamUrl} />
                ) : (
                    <div className="camera-offline">
                        <div className="offline-icon">📹</div>
                        <p>Cámara fuera de línea</p>
                    </div>
                )}
            </div>
            
            <div className="camera-info">
                <span className="camera-location">📍 {camera.location}</span>
                <div className="camera-controls">
                    <button className="control-btn" title="Pantalla completa">⛶</button>
                    <button className="control-btn" title="Grabar">⏺️</button>
                    <button className="control-btn" title="Captura">📷</button>
                </div>
            </div>
        </div>
    );
};

export { SecurityComponent, SystemControl, SecurityEventsTab, VisitorsTab, AccessLogsTab, CamerasTab };
