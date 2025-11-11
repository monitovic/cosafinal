import React, { useState, useEffect } from 'react';
import { API } from 'aws-amplify';
import LoadingSpinner from '../shared/LoadingSpinner';
import ErrorMessage from '../shared/ErrorMessage';
import Modal from '../shared/Modal';
import SearchBar from '../shared/SearchBar';
import FilterDropdown from '../shared/FilterDropdown';
import DateRangePicker from '../shared/DateRangePicker';
import Chart from '../shared/Chart';
import './PaymentsComponent.css';

// ============= PAYMENTS COMPONENT =============
const PaymentsComponent = () => {
    const [payments, setPayments] = useState([]);
    const [filteredPayments, setFilteredPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [methodFilter, setMethodFilter] = useState('all');
    const [dateRange, setDateRange] = useState({ start: null, end: null });
    const [showProcessModal, setShowProcessModal] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [paymentStats, setPaymentStats] = useState({
        totalRevenue: 0,
        pendingAmount: 0,
        completedCount: 0,
        failedCount: 0
    });
    const [chartData, setChartData] = useState({
        monthly: [],
        byMethod: [],
        byStatus: []
    });

    useEffect(() => {
        loadPayments();
        loadPaymentStats();
        loadChartData();
    }, []);

    useEffect(() => {
        filterPayments();
    }, [payments, searchTerm, statusFilter, methodFilter, dateRange]);

    const loadPayments = async () => {
        try {
            setLoading(true);
            setError('');
            
            const response = await API.get('CondoconnectAPI', '/payments');
            setPayments(response.data);
            
        } catch (err) {
            console.error('Error loading payments:', err);
            setError('Error cargando pagos');
        } finally {
            setLoading(false);
        }
    };

    const loadPaymentStats = async () => {
        try {
            const response = await API.get('CondoconnectAPI', '/payments/stats');
            setPaymentStats(response.data);
        } catch (err) {
            console.error('Error loading payment stats:', err);
        }
    };

    const loadChartData = async () => {
        try {
            const response = await API.get('CondoconnectAPI', '/payments/charts');
            setChartData(response.data);
        } catch (err) {
            console.error('Error loading chart data:', err);
        }
    };

    const filterPayments = () => {
        let filtered = payments;
        
        // Apply search filter
        if (searchTerm) {
            filtered = filtered.filter(payment =>
                payment.residentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                payment.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                payment.transactionId?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        
        // Apply status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(payment => payment.status === statusFilter);
        }
        
        // Apply method filter
        if (methodFilter !== 'all') {
            filtered = filtered.filter(payment => payment.method === methodFilter);
        }
        
        // Apply date range filter
        if (dateRange.start && dateRange.end) {
            filtered = filtered.filter(payment => {
                const paymentDate = new Date(payment.date);
                return paymentDate >= dateRange.start && paymentDate <= dateRange.end;
            });
        }
        
        setFilteredPayments(filtered);
    };

    const handleProcessPayment = async (paymentData) => {
        try {
            const response = await API.post('CondoconnectAPI', '/payments', {
                body: paymentData
            });
            
            setPayments(prev => [response.data, ...prev]);
            setShowProcessModal(false);
            loadPaymentStats();
            
        } catch (err) {
            console.error('Error processing payment:', err);
            throw new Error('Error procesando pago');
        }
    };

    const handleRefundPayment = async (paymentId, reason) => {
        try {
            const response = await API.post('CondoconnectAPI', `/payments/${paymentId}/refund`, {
                body: { reason }
            });
            
            setPayments(prev => 
                prev.map(payment => 
                    payment.id === paymentId ? response.data : payment
                )
            );
            
            setShowDetailModal(false);
            setSelectedPayment(null);
            loadPaymentStats();
            
        } catch (err) {
            console.error('Error refunding payment:', err);
            throw new Error('Error procesando reembolso');
        }
    };

    const handlePaymentClick = (payment) => {
        setSelectedPayment(payment);
        setShowDetailModal(true);
    };

    const exportPayments = async () => {
        try {
            const response = await API.get('CondoconnectAPI', '/payments/export', {
                queryStringParameters: {
                    status: statusFilter !== 'all' ? statusFilter : undefined,
                    method: methodFilter !== 'all' ? methodFilter : undefined,
                    startDate: dateRange.start?.toISOString(),
                    endDate: dateRange.end?.toISOString()
                }
            });
            
            // Create and download file
            const blob = new Blob([response.data], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `payments_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
        } catch (err) {
            console.error('Error exporting payments:', err);
            alert('Error exportando pagos');
        }
    };

    const statusOptions = [
        { value: 'all', label: 'Todos los Estados' },
        { value: 'pending', label: 'Pendiente' },
        { value: 'processing', label: 'Procesando' },
        { value: 'completed', label: 'Completado' },
        { value: 'failed', label: 'Fallido' },
        { value: 'refunded', label: 'Reembolsado' }
    ];

    const methodOptions = [
        { value: 'all', label: 'Todos los Métodos' },
        { value: 'credit_card', label: 'Tarjeta de Crédito' },
        { value: 'debit_card', label: 'Tarjeta de Débito' },
        { value: 'bank_transfer', label: 'Transferencia Bancaria' },
        { value: 'cash', label: 'Efectivo' },
        { value: 'check', label: 'Cheque' }
    ];

    if (loading) {
        return (
            <div className="payments-loading">
                <LoadingSpinner size="large" />
                <p>Cargando pagos...</p>
            </div>
        );
    }

    return (
        <div className="payments-container">
            <div className="payments-header">
                <div className="header-content">
                    <h1>Gestión de Pagos</h1>
                    <p>Administre los pagos y transacciones</p>
                </div>
                <div className="header-actions">
                    <button onClick={exportPayments} className="export-btn">
                        📊 Exportar
                    </button>
                    <button 
                        onClick={() => setShowProcessModal(true)}
                        className="process-payment-btn"
                    >
                        + Procesar Pago
                    </button>
                </div>
            </div>

            {error && <ErrorMessage message={error} />}

            {/* Payment Stats */}
            <div className="payment-stats">
                <div className="stat-card">
                    <div className="stat-icon">💰</div>
                    <div className="stat-content">
                        <h3>${paymentStats.totalRevenue.toLocaleString()}</h3>
                        <p>Ingresos Totales</p>
                    </div>
                </div>
                
                <div className="stat-card">
                    <div className="stat-icon">⏳</div>
                    <div className="stat-content">
                        <h3>${paymentStats.pendingAmount.toLocaleString()}</h3>
                        <p>Pagos Pendientes</p>
                    </div>
                </div>
                
                <div className="stat-card">
                    <div className="stat-icon">✅</div>
                    <div className="stat-content">
                        <h3>{paymentStats.completedCount}</h3>
                        <p>Pagos Completados</p>
                    </div>
                </div>
                
                <div className="stat-card">
                    <div className="stat-icon">❌</div>
                    <div className="stat-content">
                        <h3>{paymentStats.failedCount}</h3>
                        <p>Pagos Fallidos</p>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="charts-section">
                <div className="chart-container">
                    <h3>Ingresos Mensuales</h3>
                    <Chart
                        type="line"
                        data={chartData.monthly}
                        options={{
                            responsive: true,
                            plugins: {
                                legend: { position: 'top' },
                                title: { display: true, text: 'Ingresos por Mes' }
                            }
                        }}
                    />
                </div>
                
                <div className="chart-container">
                    <h3>Pagos por Método</h3>
                    <Chart
                        type="doughnut"
                        data={chartData.byMethod}
                        options={{
                            responsive: true,
                            plugins: { legend: { position: 'bottom' } }
                        }}
                    />
                </div>
            </div>

            {/* Filters */}
            <div className="payments-controls">
                <SearchBar
                    value={searchTerm}
                    onChange={setSearchTerm}
                    placeholder="Buscar por residente, descripción o ID de transacción..."
                />
                
                <FilterDropdown
                    value={statusFilter}
                    onChange={setStatusFilter}
                    options={statusOptions}
                    label="Estado"
                />
                
                <FilterDropdown
                    value={methodFilter}
                    onChange={setMethodFilter}
                    options={methodOptions}
                    label="Método"
                />
                
                <DateRangePicker
                    startDate={dateRange.start}
                    endDate={dateRange.end}
                    onChange={setDateRange}
                    label="Rango de Fechas"
                />
            </div>

            {/* Payments List */}
            <div className="payments-content">
                {filteredPayments.length === 0 ? (
                    <div className="no-payments">
                        <div className="no-payments-icon">💳</div>
                        <h3>No se encontraron pagos</h3>
                        <p>
                            {searchTerm || statusFilter !== 'all' || methodFilter !== 'all' || dateRange.start
                                ? 'Intente ajustar los filtros de búsqueda'
                                : 'Comience procesando su primer pago'
                            }
                        </p>
                    </div>
                ) : (
                    <div className="payments-table">
                        <PaymentsTable
                            payments={filteredPayments}
                            onPaymentClick={handlePaymentClick}
                        />
                    </div>
                )}
            </div>

            {/* Process Payment Modal */}
            {showProcessModal && (
                <Modal
                    title="Procesar Nuevo Pago"
                    onClose={() => setShowProcessModal(false)}
                    size="large"
                >
                    <ProcessPaymentForm
                        onSubmit={handleProcessPayment}
                        onCancel={() => setShowProcessModal(false)}
                    />
                </Modal>
            )}

            {/* Payment Detail Modal */}
            {showDetailModal && selectedPayment && (
                <Modal
                    title="Detalles del Pago"
                    onClose={() => {
                        setShowDetailModal(false);
                        setSelectedPayment(null);
                    }}
                    size="large"
                >
                    <PaymentDetailView
                        payment={selectedPayment}
                        onRefund={handleRefundPayment}
                        onClose={() => {
                            setShowDetailModal(false);
                            setSelectedPayment(null);
                        }}
                    />
                </Modal>
            )}
        </div>
    );
};

// ============= PAYMENTS TABLE COMPONENT =============
const PaymentsTable = ({ payments, onPaymentClick }) => {
    const getStatusColor = (status) => {
        const colors = {
            'pending': '#FF9800',
            'processing': '#2196F3',
            'completed': '#4CAF50',
            'failed': '#F44336',
            'refunded': '#9C27B0'
        };
        return colors[status] || '#757575';
    };

    const getStatusText = (status) => {
        const texts = {
            'pending': 'Pendiente',
            'processing': 'Procesando',
            'completed': 'Completado',
            'failed': 'Fallido',
            'refunded': 'Reembolsado'
        };
        return texts[status] || status;
    };

    const getMethodText = (method) => {
        const texts = {
            'credit_card': 'Tarjeta de Crédito',
            'debit_card': 'Tarjeta de Débito',
            'bank_transfer': 'Transferencia',
            'cash': 'Efectivo',
            'check': 'Cheque'
        };
        return texts[method] || method;
    };

    return (
        <div className="table-container">
            <table className="payments-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Residente</th>
                        <th>Monto</th>
                        <th>Método</th>
                        <th>Estado</th>
                        <th>Fecha</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {payments.map(payment => (
                        <tr key={payment.id} onClick={() => onPaymentClick(payment)}>
                            <td className="payment-id">
                                {payment.id.substring(0, 8)}...
                            </td>
                            <td className="payment-resident">
                                <div className="resident-info">
                                    <span className="resident-name">{payment.residentName}</span>
                                    <span className="resident-unit">Unidad {payment.unitNumber}</span>
                                </div>
                            </td>
                            <td className="payment-amount">
                                ${payment.amount.toLocaleString()}
                            </td>
                            <td className="payment-method">
                                {getMethodText(payment.method)}
                            </td>
                            <td className="payment-status">
                                <span 
                                    className="status-badge"
                                    style={{ 
                                        backgroundColor: getStatusColor(payment.status),
                                        color: 'white'
                                    }}
                                >
                                    {getStatusText(payment.status)}
                                </span>
                            </td>
                            <td className="payment-date">
                                {new Date(payment.date).toLocaleDateString()}
                            </td>
                            <td className="payment-actions">
                                <button 
                                    className="view-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onPaymentClick(payment);
                                    }}
                                >
                                    Ver
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// ============= PROCESS PAYMENT FORM COMPONENT =============
const ProcessPaymentForm = ({ onSubmit, onCancel }) => {
    const [formData, setFormData] = useState({
        residentId: '',
        amount: '',
        method: 'credit_card',
        description: '',
        dueDate: '',
        recurring: false,
        recurringPeriod: 'monthly'
    });
    const [residents, setResidents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        loadResidents();
    }, []);

    const loadResidents = async () => {
        try {
            const response = await API.get('CondoconnectAPI', '/residents');
            setResidents(response.data.items || []);
        } catch (err) {
            console.error('Error loading residents:', err);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const validateForm = () => {
        if (!formData.residentId) {
            setError('Seleccione un residente');
            return false;
        }
        
        if (!formData.amount || parseFloat(formData.amount) <= 0) {
            setError('Ingrese un monto válido');
            return false;
        }
        
        if (!formData.description.trim()) {
            setError('Ingrese una descripción');
            return false;
        }
        
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) return;
        
        setLoading(true);
        setError('');
        
        try {
            await onSubmit({
                ...formData,
                amount: parseFloat(formData.amount)
            });
        } catch (err) {
            setError(err.message || 'Error procesando pago');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="process-payment-form">
            {error && <ErrorMessage message={error} />}
            
            <div className="form-section">
                <h4>Información del Pago</h4>
                
                <div className="form-group">
                    <label htmlFor="residentId">Residente *</label>
                    <select
                        id="residentId"
                        name="residentId"
                        value={formData.residentId}
                        onChange={handleInputChange}
                        required
                        disabled={loading}
                    >
                        <option value="">Seleccionar residente...</option>
                        {residents.map(resident => (
                            <option key={resident.id} value={resident.id}>
                                {resident.name} - Unidad {resident.unitNumber}
                            </option>
                        ))}
                    </select>
                </div>
                
                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="amount">Monto *</label>
                        <input
                            type="number"
                            id="amount"
                            name="amount"
                            value={formData.amount}
                            onChange={handleInputChange}
                            min="0"
                            step="0.01"
                            required
                            disabled={loading}
                        />
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="method">Método de Pago *</label>
                        <select
                            id="method"
                            name="method"
                            value={formData.method}
                            onChange={handleInputChange}
                            required
                            disabled={loading}
                        >
                            <option value="credit_card">Tarjeta de Crédito</option>
                            <option value="debit_card">Tarjeta de Débito</option>
                            <option value="bank_transfer">Transferencia Bancaria</option>
                            <option value="cash">Efectivo</option>
                            <option value="check">Cheque</option>
                        </select>
                    </div>
                </div>
                
                <div className="form-group">
                    <label htmlFor="description">Descripción *</label>
                    <textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        rows="3"
                        placeholder="Ej: Renta mensual de Enero 2024"
                        required
                        disabled={loading}
                    />
                </div>
                
                <div className="form-group">
                    <label htmlFor="dueDate">Fecha de Vencimiento</label>
                    <input
                        type="date"
                        id="dueDate"
                        name="dueDate"
                        value={formData.dueDate}
                        onChange={handleInputChange}
                        disabled={loading}
                    />
                </div>
            </div>
            
            <div className="form-section">
                <h4>Configuración de Recurrencia</h4>
                
                <div className="form-group checkbox-group">
                    <label className="checkbox-label">
                        <input
                            type="checkbox"
                            name="recurring"
                            checked={formData.recurring}
                            onChange={handleInputChange}
                            disabled={loading}
                        />
                        <span className="checkmark"></span>
                        Pago recurrente
                    </label>
                </div>
                
                {formData.recurring && (
                    <div className="form-group">
                        <label htmlFor="recurringPeriod">Período de Recurrencia</label>
                        <select
                            id="recurringPeriod"
                            name="recurringPeriod"
                            value={formData.recurringPeriod}
                            onChange={handleInputChange}
                            disabled={loading}
                        >
                            <option value="weekly">Semanal</option>
                            <option value="monthly">Mensual</option>
                            <option value="quarterly">Trimestral</option>
                            <option value="yearly">Anual</option>
                        </select>
                    </div>
                )}
            </div>
            
            <div className="form-actions">
                <button 
                    type="button" 
                    onClick={onCancel}
                    className="cancel-btn"
                    disabled={loading}
                >
                    Cancelar
                </button>
                
                <button 
                    type="submit" 
                    className="submit-btn"
                    disabled={loading}
                >
                    {loading ? <LoadingSpinner size="small" /> : 'Procesar Pago'}
                </button>
            </div>
        </form>
    );
};

// ============= PAYMENT DETAIL VIEW COMPONENT =============
const PaymentDetailView = ({ payment, onRefund, onClose }) => {
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [refundReason, setRefundReason] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRefund = async () => {
        if (!refundReason.trim()) {
            alert('Por favor, ingrese una razón para el reembolso');
            return;
        }
        
        setLoading(true);
        try {
            await onRefund(payment.id, refundReason);
            setShowRefundModal(false);
        } catch (err) {
            alert(err.message || 'Error procesando reembolso');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            'pending': '#FF9800',
            'processing': '#2196F3',
            'completed': '#4CAF50',
            'failed': '#F44336',
            'refunded': '#9C27B0'
        };
        return colors[status] || '#757575';
    };

    const canRefund = payment.status === 'completed' && !payment.refunded;

    return (
        <div className="payment-detail-view">
            <div className="payment-header">
                <div className="payment-info">
                    <h2>Pago #{payment.id}</h2>
                    <span 
                        className="payment-status-large"
                        style={{ 
                            backgroundColor: getStatusColor(payment.status),
                            color: 'white'
                        }}
                    >
                        {payment.status.toUpperCase()}
                    </span>
                </div>
                
                <div className="payment-amount-large">
                    ${payment.amount.toLocaleString()}
                </div>
            </div>
            
            <div className="payment-details">
                <div className="detail-section">
                    <h4>Información del Residente</h4>
                    <div className="detail-grid">
                        <div className="detail-item">
                            <label>Nombre:</label>
                            <span>{payment.residentName}</span>
                        </div>
                        <div className="detail-item">
                            <label>Unidad:</label>
                            <span>{payment.unitNumber}</span>
                        </div>
                        <div className="detail-item">
                            <label>Email:</label>
                            <span>{payment.residentEmail}</span>
                        </div>
                    </div>
                </div>
                
                <div className="detail-section">
                    <h4>Detalles del Pago</h4>
                    <div className="detail-grid">
                        <div className="detail-item">
                            <label>Método:</label>
                            <span>{payment.method}</span>
                        </div>
                        <div className="detail-item">
                            <label>Descripción:</label>
                            <span>{payment.description}</span>
                        </div>
                        <div className="detail-item">
                            <label>Fecha:</label>
                            <span>{new Date(payment.date).toLocaleString()}</span>
                        </div>
                        <div className="detail-item">
                            <label>ID de Transacción:</label>
                            <span>{payment.transactionId}</span>
                        </div>
                    </div>
                </div>
                
                {payment.refundInfo && (
                    <div className="detail-section">
                        <h4>Información del Reembolso</h4>
                        <div className="detail-grid">
                            <div className="detail-item">
                                <label>Fecha de Reembolso:</label>
                                <span>{new Date(payment.refundInfo.date).toLocaleString()}</span>
                            </div>
                            <div className="detail-item">
                                <label>Razón:</label>
                                <span>{payment.refundInfo.reason}</span>
                            </div>
                            <div className="detail-item">
                                <label>Monto Reembolsado:</label>
                                <span>${payment.refundInfo.amount.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            
            <div className="payment-actions">
                {canRefund && (
                    <button 
                        onClick={() => setShowRefundModal(true)}
                        className="refund-btn"
                    >
                        💰 Procesar Reembolso
                    </button>
                )}
                
                <button onClick={onClose} className="close-btn">
                    Cerrar
                </button>
            </div>
            
            {/* Refund Modal */}
            {showRefundModal && (
                <Modal
                    title="Procesar Reembolso"
                    onClose={() => setShowRefundModal(false)}
                >
                    <div className="refund-form">
                        <p>¿Está seguro de que desea procesar un reembolso para este pago?</p>
                        <p><strong>Monto:</strong> ${payment.amount.toLocaleString()}</p>
                        
                        <div className="form-group">
                            <label htmlFor="refundReason">Razón del Reembolso *</label>
                            <textarea
                                id="refundReason"
                                value={refundReason}
                                onChange={(e) => setRefundReason(e.target.value)}
                                rows="3"
                                placeholder="Ingrese la razón del reembolso..."
                                required
                                disabled={loading}
                            />
                        </div>
                        
                        <div className="form-actions">
                            <button 
                                onClick={() => setShowRefundModal(false)}
                                className="cancel-btn"
                                disabled={loading}
                            >
                                Cancelar
                            </button>
                            
                            <button 
                                onClick={handleRefund}
                                className="refund-confirm-btn"
                                disabled={loading || !refundReason.trim()}
                            >
                                {loading ? <LoadingSpinner size="small" /> : 'Confirmar Reembolso'}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export { PaymentsComponent, PaymentsTable, ProcessPaymentForm, PaymentDetailView };
