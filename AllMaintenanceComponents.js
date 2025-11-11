import React, { useState, useEffect } from 'react';
import { API } from 'aws-amplify';
import LoadingSpinner from '../shared/LoadingSpinner';
import ErrorMessage from '../shared/ErrorMessage';
import Modal from '../shared/Modal';
import SearchBar from '../shared/SearchBar';
import FilterDropdown from '../shared/FilterDropdown';
import Calendar from '../shared/Calendar';
import './MaintenanceComponent.css';

// ============= MAINTENANCE COMPONENT =============
const MaintenanceComponent = () => {
    const [workOrders, setWorkOrders] = useState([]);
    const [filteredWorkOrders, setFilteredWorkOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [priorityFilter, setPriorityFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedWorkOrder, setSelectedWorkOrder] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
    const [maintenanceStats, setMaintenanceStats] = useState({
        total: 0,
        pending: 0,
        inProgress: 0,
        completed: 0,
        overdue: 0
    });

    useEffect(() => {
        loadWorkOrders();
        loadMaintenanceStats();
    }, []);

    useEffect(() => {
        filterWorkOrders();
    }, [workOrders, searchTerm, statusFilter, priorityFilter, typeFilter]);

    const loadWorkOrders = async () => {
        try {
            setLoading(true);
            setError('');
            
            const response = await API.get('CondoconnectAPI', '/maintenance/work-orders');
            setWorkOrders(response.data);
            
        } catch (err) {
            console.error('Error loading work orders:', err);
            setError('Error cargando órdenes de trabajo');
        } finally {
            setLoading(false);
        }
    };

    const loadMaintenanceStats = async () => {
        try {
            const response = await API.get('CondoconnectAPI', '/maintenance/stats');
            setMaintenanceStats(response.data);
        } catch (err) {
            console.error('Error loading maintenance stats:', err);
        }
    };

    const filterWorkOrders = () => {
        let filtered = workOrders;
        
        // Apply search filter
        if (searchTerm) {
            filtered = filtered.filter(order =>
                order.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                order.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                order.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                order.assignedTo?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        
        // Apply status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(order => order.status === statusFilter);
        }
        
        // Apply priority filter
        if (priorityFilter !== 'all') {
            filtered = filtered.filter(order => order.priority === priorityFilter);
        }
        
        // Apply type filter
        if (typeFilter !== 'all') {
            filtered = filtered.filter(order => order.type === typeFilter);
        }
        
        setFilteredWorkOrders(filtered);
    };

    const handleCreateWorkOrder = async (workOrderData) => {
        try {
            const response = await API.post('CondoconnectAPI', '/maintenance/work-orders', {
                body: workOrderData
            });
            
            setWorkOrders(prev => [response.data, ...prev]);
            setShowCreateModal(false);
            loadMaintenanceStats();
            
        } catch (err) {
            console.error('Error creating work order:', err);
            throw new Error('Error creando orden de trabajo');
        }
    };

    const handleUpdateWorkOrder = async (workOrderId, updateData) => {
        try {
            const response = await API.put('CondoconnectAPI', `/maintenance/work-orders/${workOrderId}`, {
                body: updateData
            });
            
            setWorkOrders(prev => 
                prev.map(order => 
                    order.id === workOrderId ? response.data : order
                )
            );
            
            setShowDetailModal(false);
            setSelectedWorkOrder(null);
            loadMaintenanceStats();
            
        } catch (err) {
            console.error('Error updating work order:', err);
            throw new Error('Error actualizando orden de trabajo');
        }
    };

    const handleDeleteWorkOrder = async (workOrderId) => {
        if (!window.confirm('¿Está seguro de que desea eliminar esta orden de trabajo?')) {
            return;
        }
        
        try {
            await API.del('CondoconnectAPI', `/maintenance/work-orders/${workOrderId}`);
            
            setWorkOrders(prev => prev.filter(order => order.id !== workOrderId));
            setShowDetailModal(false);
            setSelectedWorkOrder(null);
            loadMaintenanceStats();
            
        } catch (err) {
            console.error('Error deleting work order:', err);
            alert('Error eliminando orden de trabajo');
        }
    };

    const handleWorkOrderClick = (workOrder) => {
        setSelectedWorkOrder(workOrder);
        setShowDetailModal(true);
    };

    const statusOptions = [
        { value: 'all', label: 'Todos los Estados' },
        { value: 'pending', label: 'Pendiente' },
        { value: 'assigned', label: 'Asignado' },
        { value: 'in_progress', label: 'En Progreso' },
        { value: 'completed', label: 'Completado' },
        { value: 'cancelled', label: 'Cancelado' }
    ];

    const priorityOptions = [
        { value: 'all', label: 'Todas las Prioridades' },
        { value: 'low', label: 'Baja' },
        { value: 'medium', label: 'Media' },
        { value: 'high', label: 'Alta' },
        { value: 'critical', label: 'Crítica' }
    ];

    const typeOptions = [
        { value: 'all', label: 'Todos los Tipos' },
        { value: 'plumbing', label: 'Plomería' },
        { value: 'electrical', label: 'Eléctrico' },
        { value: 'hvac', label: 'HVAC' },
        { value: 'cleaning', label: 'Limpieza' },
        { value: 'painting', label: 'Pintura' },
        { value: 'landscaping', label: 'Jardinería' },
        { value: 'security', label: 'Seguridad' },
        { value: 'other', label: 'Otro' }
    ];

    if (loading) {
        return (
            <div className="maintenance-loading">
                <LoadingSpinner size="large" />
                <p>Cargando órdenes de trabajo...</p>
            </div>
        );
    }

    return (
        <div className="maintenance-container">
            <div className="maintenance-header">
                <div className="header-content">
                    <h1>Gestión de Mantenimiento</h1>
                    <p>Administre las órdenes de trabajo y mantenimiento</p>
                </div>
                <div className="header-actions">
                    <div className="view-toggle">
                        <button 
                            className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                            onClick={() => setViewMode('list')}
                        >
                            📋 Lista
                        </button>
                        <button 
                            className={`toggle-btn ${viewMode === 'calendar' ? 'active' : ''}`}
                            onClick={() => setViewMode('calendar')}
                        >
                            📅 Calendario
                        </button>
                    </div>
                    <button 
                        onClick={() => setShowCreateModal(true)}
                        className="create-work-order-btn"
                    >
                        + Nueva Orden
                    </button>
                </div>
            </div>

            {error && <ErrorMessage message={error} />}

            {/* Maintenance Stats */}
            <div className="maintenance-stats">
                <div className="stat-card">
                    <div className="stat-icon">📋</div>
                    <div className="stat-content">
                        <h3>{maintenanceStats.total}</h3>
                        <p>Total de Órdenes</p>
                    </div>
                </div>
                
                <div className="stat-card">
                    <div className="stat-icon">⏳</div>
                    <div className="stat-content">
                        <h3>{maintenanceStats.pending}</h3>
                        <p>Pendientes</p>
                    </div>
                </div>
                
                <div className="stat-card">
                    <div className="stat-icon">🔧</div>
                    <div className="stat-content">
                        <h3>{maintenanceStats.inProgress}</h3>
                        <p>En Progreso</p>
                    </div>
                </div>
                
                <div className="stat-card">
                    <div className="stat-icon">✅</div>
                    <div className="stat-content">
                        <h3>{maintenanceStats.completed}</h3>
                        <p>Completadas</p>
                    </div>
                </div>
                
                <div className="stat-card urgent">
                    <div className="stat-icon">⚠️</div>
                    <div className="stat-content">
                        <h3>{maintenanceStats.overdue}</h3>
                        <p>Vencidas</p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="maintenance-controls">
                <SearchBar
                    value={searchTerm}
                    onChange={setSearchTerm}
                    placeholder="Buscar por título, descripción, ubicación o asignado..."
                />
                
                <FilterDropdown
                    value={statusFilter}
                    onChange={setStatusFilter}
                    options={statusOptions}
                    label="Estado"
                />
                
                <FilterDropdown
                    value={priorityFilter}
                    onChange={setPriorityFilter}
                    options={priorityOptions}
                    label="Prioridad"
                />
                
                <FilterDropdown
                    value={typeFilter}
                    onChange={setTypeFilter}
                    options={typeOptions}
                    label="Tipo"
                />
            </div>

            {/* Content */}
            <div className="maintenance-content">
                {viewMode === 'list' ? (
                    <WorkOrdersList
                        workOrders={filteredWorkOrders}
                        onWorkOrderClick={handleWorkOrderClick}
                    />
                ) : (
                    <WorkOrdersCalendar
                        workOrders={filteredWorkOrders}
                        onWorkOrderClick={handleWorkOrderClick}
                    />
                )}
            </div>

            {/* Create Work Order Modal */}
            {showCreateModal && (
                <Modal
                    title="Crear Nueva Orden de Trabajo"
                    onClose={() => setShowCreateModal(false)}
                    size="large"
                >
                    <CreateWorkOrderForm
                        onSubmit={handleCreateWorkOrder}
                        onCancel={() => setShowCreateModal(false)}
                    />
                </Modal>
            )}

            {/* Work Order Detail Modal */}
            {showDetailModal && selectedWorkOrder && (
                <Modal
                    title="Detalles de la Orden de Trabajo"
                    onClose={() => {
                        setShowDetailModal(false);
                        setSelectedWorkOrder(null);
                    }}
                    size="large"
                >
                    <WorkOrderDetailView
                        workOrder={selectedWorkOrder}
                        onUpdate={handleUpdateWorkOrder}
                        onDelete={handleDeleteWorkOrder}
                        onClose={() => {
                            setShowDetailModal(false);
                            setSelectedWorkOrder(null);
                        }}
                    />
                </Modal>
            )}
        </div>
    );
};

// ============= WORK ORDERS LIST COMPONENT =============
const WorkOrdersList = ({ workOrders, onWorkOrderClick }) => {
    const getPriorityColor = (priority) => {
        const colors = {
            'low': '#4CAF50',
            'medium': '#FF9800',
            'high': '#F44336',
            'critical': '#9C27B0'
        };
        return colors[priority] || '#757575';
    };

    const getStatusColor = (status) => {
        const colors = {
            'pending': '#FF9800',
            'assigned': '#2196F3',
            'in_progress': '#9C27B0',
            'completed': '#4CAF50',
            'cancelled': '#757575'
        };
        return colors[status] || '#757575';
    };

    const getStatusText = (status) => {
        const texts = {
            'pending': 'Pendiente',
            'assigned': 'Asignado',
            'in_progress': 'En Progreso',
            'completed': 'Completado',
            'cancelled': 'Cancelado'
        };
        return texts[status] || status;
    };

    const getPriorityText = (priority) => {
        const texts = {
            'low': 'Baja',
            'medium': 'Media',
            'high': 'Alta',
            'critical': 'Crítica'
        };
        return texts[priority] || priority;
    };

    const getTypeIcon = (type) => {
        const icons = {
            'plumbing': '🚿',
            'electrical': '⚡',
            'hvac': '❄️',
            'cleaning': '🧹',
            'painting': '🎨',
            'landscaping': '🌱',
            'security': '🔒',
            'other': '🔧'
        };
        return icons[type] || '🔧';
    };

    if (workOrders.length === 0) {
        return (
            <div className="no-work-orders">
                <div className="no-work-orders-icon">🔧</div>
                <h3>No se encontraron órdenes de trabajo</h3>
                <p>Comience creando su primera orden de trabajo</p>
            </div>
        );
    }

    return (
        <div className="work-orders-grid">
            {workOrders.map(workOrder => (
                <WorkOrderCard
                    key={workOrder.id}
                    workOrder={workOrder}
                    onClick={() => onWorkOrderClick(workOrder)}
                    getPriorityColor={getPriorityColor}
                    getStatusColor={getStatusColor}
                    getStatusText={getStatusText}
                    getPriorityText={getPriorityText}
                    getTypeIcon={getTypeIcon}
                />
            ))}
        </div>
    );
};

// ============= WORK ORDER CARD COMPONENT =============
const WorkOrderCard = ({ 
    workOrder, 
    onClick, 
    getPriorityColor, 
    getStatusColor, 
    getStatusText, 
    getPriorityText, 
    getTypeIcon 
}) => {
    const isOverdue = workOrder.scheduledDate && 
                     new Date(workOrder.scheduledDate) < new Date() && 
                     workOrder.status !== 'completed';

    return (
        <div 
            className={`work-order-card ${isOverdue ? 'overdue' : ''}`}
            onClick={onClick}
        >
            <div className="work-order-header">
                <div className="work-order-type">
                    <span className="type-icon">{getTypeIcon(workOrder.type)}</span>
                    <span className="type-text">{workOrder.type}</span>
                </div>
                
                <div className="work-order-badges">
                    <span 
                        className="priority-badge"
                        style={{ backgroundColor: getPriorityColor(workOrder.priority) }}
                    >
                        {getPriorityText(workOrder.priority)}
                    </span>
                    <span 
                        className="status-badge"
                        style={{ backgroundColor: getStatusColor(workOrder.status) }}
                    >
                        {getStatusText(workOrder.status)}
                    </span>
                </div>
            </div>
            
            <div className="work-order-content">
                <h3 className="work-order-title">{workOrder.title}</h3>
                <p className="work-order-description">{workOrder.description}</p>
                
                <div className="work-order-meta">
                    <div className="meta-item">
                        <span className="meta-label">📍 Ubicación:</span>
                        <span className="meta-value">{workOrder.location}</span>
                    </div>
                    
                    {workOrder.assignedTo && (
                        <div className="meta-item">
                            <span className="meta-label">👤 Asignado a:</span>
                            <span className="meta-value">{workOrder.assignedTo}</span>
                        </div>
                    )}
                    
                    <div className="meta-item">
                        <span className="meta-label">📅 Creado:</span>
                        <span className="meta-value">
                            {new Date(workOrder.createdAt).toLocaleDateString()}
                        </span>
                    </div>
                    
                    {workOrder.scheduledDate && (
                        <div className="meta-item">
                            <span className="meta-label">⏰ Programado:</span>
                            <span className={`meta-value ${isOverdue ? 'overdue-text' : ''}`}>
                                {new Date(workOrder.scheduledDate).toLocaleDateString()}
                            </span>
                        </div>
                    )}
                </div>
            </div>
            
            {workOrder.estimatedCost && (
                <div className="work-order-cost">
                    <span className="cost-label">Costo Estimado:</span>
                    <span className="cost-value">${workOrder.estimatedCost.toLocaleString()}</span>
                </div>
            )}
        </div>
    );
};

// ============= WORK ORDERS CALENDAR COMPONENT =============
const WorkOrdersCalendar = ({ workOrders, onWorkOrderClick }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    
    const getWorkOrdersForDate = (date) => {
        return workOrders.filter(workOrder => {
            if (!workOrder.scheduledDate) return false;
            
            const workOrderDate = new Date(workOrder.scheduledDate);
            return workOrderDate.toDateString() === date.toDateString();
        });
    };

    const renderCalendarDay = (date) => {
        const dayWorkOrders = getWorkOrdersForDate(date);
        
        return (
            <div className="calendar-day">
                <div className="day-number">{date.getDate()}</div>
                {dayWorkOrders.length > 0 && (
                    <div className="day-work-orders">
                        {dayWorkOrders.slice(0, 3).map(workOrder => (
                            <div
                                key={workOrder.id}
                                className={`day-work-order priority-${workOrder.priority}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onWorkOrderClick(workOrder);
                                }}
                                title={workOrder.title}
                            >
                                {workOrder.title.substring(0, 20)}...
                            </div>
                        ))}
                        {dayWorkOrders.length > 3 && (
                            <div className="more-work-orders">
                                +{dayWorkOrders.length - 3} más
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="work-orders-calendar">
            <Calendar
                currentDate={currentDate}
                onDateChange={setCurrentDate}
                renderDay={renderCalendarDay}
                events={workOrders}
            />
        </div>
    );
};

export { MaintenanceComponent, WorkOrdersList, WorkOrderCard, WorkOrdersCalendar };
