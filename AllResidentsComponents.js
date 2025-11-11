import React, { useState, useEffect } from 'react';
import { API } from 'aws-amplify';
import LoadingSpinner from '../shared/LoadingSpinner';
import ErrorMessage from '../shared/ErrorMessage';
import Modal from '../shared/Modal';
import SearchBar from '../shared/SearchBar';
import FilterDropdown from '../shared/FilterDropdown';
import Pagination from '../shared/Pagination';
import './ResidentsComponent.css';

// ============= RESIDENTS COMPONENT =============
const ResidentsComponent = () => {
    const [residents, setResidents] = useState([]);
    const [filteredResidents, setFilteredResidents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedResident, setSelectedResident] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    
    const pageSize = 10;

    useEffect(() => {
        loadResidents();
    }, [currentPage]);

    useEffect(() => {
        filterResidents();
    }, [residents, searchTerm, statusFilter]);

    const loadResidents = async () => {
        try {
            setLoading(true);
            setError('');
            
            const response = await API.get('CondoconnectAPI', '/residents', {
                queryStringParameters: {
                    page: currentPage,
                    limit: pageSize
                }
            });
            
            setResidents(response.data.items);
            setTotalPages(Math.ceil(response.data.totalCount / pageSize));
            
        } catch (err) {
            console.error('Error loading residents:', err);
            setError('Error cargando residentes');
        } finally {
            setLoading(false);
        }
    };

    const filterResidents = () => {
        let filtered = residents;
        
        // Apply search filter
        if (searchTerm) {
            filtered = filtered.filter(resident =>
                resident.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                resident.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                resident.unitNumber.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        
        // Apply status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(resident => resident.status === statusFilter);
        }
        
        setFilteredResidents(filtered);
    };

    const handleAddResident = async (residentData) => {
        try {
            const response = await API.post('CondoconnectAPI', '/residents', {
                body: residentData
            });
            
            setResidents(prev => [response.data, ...prev]);
            setShowAddModal(false);
            
        } catch (err) {
            console.error('Error adding resident:', err);
            throw new Error('Error agregando residente');
        }
    };

    const handleUpdateResident = async (residentId, updateData) => {
        try {
            const response = await API.put('CondoconnectAPI', `/residents/${residentId}`, {
                body: updateData
            });
            
            setResidents(prev => 
                prev.map(resident => 
                    resident.id === residentId ? response.data : resident
                )
            );
            
            setShowDetailModal(false);
            setSelectedResident(null);
            
        } catch (err) {
            console.error('Error updating resident:', err);
            throw new Error('Error actualizando residente');
        }
    };

    const handleDeleteResident = async (residentId) => {
        if (!window.confirm('¿Está seguro de que desea eliminar este residente?')) {
            return;
        }
        
        try {
            await API.del('CondoconnectAPI', `/residents/${residentId}`);
            
            setResidents(prev => prev.filter(resident => resident.id !== residentId));
            setShowDetailModal(false);
            setSelectedResident(null);
            
        } catch (err) {
            console.error('Error deleting resident:', err);
            alert('Error eliminando residente');
        }
    };

    const handleResidentClick = (resident) => {
        setSelectedResident(resident);
        setShowDetailModal(true);
    };

    const statusOptions = [
        { value: 'all', label: 'Todos los Estados' },
        { value: 'active', label: 'Activo' },
        { value: 'inactive', label: 'Inactivo' },
        { value: 'pending', label: 'Pendiente' },
        { value: 'suspended', label: 'Suspendido' }
    ];

    if (loading && residents.length === 0) {
        return (
            <div className="residents-loading">
                <LoadingSpinner size="large" />
                <p>Cargando residentes...</p>
            </div>
        );
    }

    return (
        <div className="residents-container">
            <div className="residents-header">
                <div className="header-content">
                    <h1>Gestión de Residentes</h1>
                    <p>Administre la información de los residentes</p>
                </div>
                <div className="header-actions">
                    <button 
                        onClick={() => setShowAddModal(true)}
                        className="add-resident-btn"
                    >
                        + Agregar Residente
                    </button>
                </div>
            </div>

            {error && <ErrorMessage message={error} />}

            <div className="residents-controls">
                <SearchBar
                    value={searchTerm}
                    onChange={setSearchTerm}
                    placeholder="Buscar por nombre, email o unidad..."
                />
                
                <FilterDropdown
                    value={statusFilter}
                    onChange={setStatusFilter}
                    options={statusOptions}
                    label="Estado"
                />
            </div>

            <div className="residents-content">
                {filteredResidents.length === 0 ? (
                    <div className="no-residents">
                        <div className="no-residents-icon">👥</div>
                        <h3>No se encontraron residentes</h3>
                        <p>
                            {searchTerm || statusFilter !== 'all' 
                                ? 'Intente ajustar los filtros de búsqueda'
                                : 'Comience agregando su primer residente'
                            }
                        </p>
                        {!searchTerm && statusFilter === 'all' && (
                            <button 
                                onClick={() => setShowAddModal(true)}
                                className="add-first-resident-btn"
                            >
                                Agregar Primer Residente
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="residents-grid">
                            {filteredResidents.map(resident => (
                                <ResidentCard
                                    key={resident.id}
                                    resident={resident}
                                    onClick={() => handleResidentClick(resident)}
                                />
                            ))}
                        </div>
                        
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                        />
                    </>
                )}
            </div>

            {/* Add Resident Modal */}
            {showAddModal && (
                <Modal
                    title="Agregar Nuevo Residente"
                    onClose={() => setShowAddModal(false)}
                >
                    <AddResidentForm
                        onSubmit={handleAddResident}
                        onCancel={() => setShowAddModal(false)}
                    />
                </Modal>
            )}

            {/* Resident Detail Modal */}
            {showDetailModal && selectedResident && (
                <Modal
                    title="Detalles del Residente"
                    onClose={() => {
                        setShowDetailModal(false);
                        setSelectedResident(null);
                    }}
                    size="large"
                >
                    <ResidentDetailForm
                        resident={selectedResident}
                        onUpdate={handleUpdateResident}
                        onDelete={handleDeleteResident}
                        onCancel={() => {
                            setShowDetailModal(false);
                            setSelectedResident(null);
                        }}
                    />
                </Modal>
            )}
        </div>
    );
};

// ============= RESIDENT CARD COMPONENT =============
const ResidentCard = ({ resident, onClick }) => {
    const getStatusColor = (status) => {
        const colors = {
            'active': '#4CAF50',
            'inactive': '#757575',
            'pending': '#FF9800',
            'suspended': '#F44336'
        };
        return colors[status] || '#757575';
    };

    const getStatusText = (status) => {
        const texts = {
            'active': 'Activo',
            'inactive': 'Inactivo',
            'pending': 'Pendiente',
            'suspended': 'Suspendido'
        };
        return texts[status] || status;
    };

    return (
        <div className="resident-card" onClick={onClick}>
            <div className="resident-avatar">
                {resident.profileImage ? (
                    <img src={resident.profileImage} alt={resident.name} />
                ) : (
                    <div className="avatar-placeholder">
                        {resident.name.charAt(0).toUpperCase()}
                    </div>
                )}
            </div>
            
            <div className="resident-info">
                <h3 className="resident-name">{resident.name}</h3>
                <p className="resident-email">{resident.email}</p>
                <p className="resident-unit">Unidad: {resident.unitNumber}</p>
                
                <div className="resident-meta">
                    <span 
                        className="resident-status"
                        style={{ 
                            backgroundColor: getStatusColor(resident.status),
                            color: 'white'
                        }}
                    >
                        {getStatusText(resident.status)}
                    </span>
                    <span className="resident-date">
                        Desde: {new Date(resident.createdAt).toLocaleDateString()}
                    </span>
                </div>
            </div>
        </div>
    );
};

// ============= ADD RESIDENT FORM COMPONENT =============
const AddResidentForm = ({ onSubmit, onCancel }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        unitNumber: '',
        emergencyContact: {
            name: '',
            phone: '',
            relationship: ''
        }
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        
        if (name.startsWith('emergencyContact.')) {
            const field = name.split('.')[1];
            setFormData(prev => ({
                ...prev,
                emergencyContact: {
                    ...prev.emergencyContact,
                    [field]: value
                }
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const validateForm = () => {
        if (!formData.name.trim()) {
            setError('El nombre es requerido');
            return false;
        }
        
        if (!formData.email.trim()) {
            setError('El email es requerido');
            return false;
        }
        
        if (!formData.email.includes('@')) {
            setError('El email no es válido');
            return false;
        }
        
        if (!formData.phone.trim()) {
            setError('El teléfono es requerido');
            return false;
        }
        
        if (!formData.unitNumber.trim()) {
            setError('El número de unidad es requerido');
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
            await onSubmit(formData);
        } catch (err) {
            setError(err.message || 'Error agregando residente');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="add-resident-form">
            {error && <ErrorMessage message={error} />}
            
            <div className="form-section">
                <h4>Información Personal</h4>
                
                <div className="form-group">
                    <label htmlFor="name">Nombre Completo *</label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        disabled={loading}
                    />
                </div>
                
                <div className="form-group">
                    <label htmlFor="email">Email *</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        disabled={loading}
                    />
                </div>
                
                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="phone">Teléfono *</label>
                        <input
                            type="tel"
                            id="phone"
                            name="phone"
                            value={formData.phone}
                            onChange={handleInputChange}
                            required
                            disabled={loading}
                        />
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="unitNumber">Número de Unidad *</label>
                        <input
                            type="text"
                            id="unitNumber"
                            name="unitNumber"
                            value={formData.unitNumber}
                            onChange={handleInputChange}
                            required
                            disabled={loading}
                        />
                    </div>
                </div>
            </div>
            
            <div className="form-section">
                <h4>Contacto de Emergencia</h4>
                
                <div className="form-group">
                    <label htmlFor="emergencyContact.name">Nombre</label>
                    <input
                        type="text"
                        id="emergencyContact.name"
                        name="emergencyContact.name"
                        value={formData.emergencyContact.name}
                        onChange={handleInputChange}
                        disabled={loading}
                    />
                </div>
                
                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="emergencyContact.phone">Teléfono</label>
                        <input
                            type="tel"
                            id="emergencyContact.phone"
                            name="emergencyContact.phone"
                            value={formData.emergencyContact.phone}
                            onChange={handleInputChange}
                            disabled={loading}
                        />
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="emergencyContact.relationship">Relación</label>
                        <select
                            id="emergencyContact.relationship"
                            name="emergencyContact.relationship"
                            value={formData.emergencyContact.relationship}
                            onChange={handleInputChange}
                            disabled={loading}
                        >
                            <option value="">Seleccionar...</option>
                            <option value="spouse">Cónyuge</option>
                            <option value="parent">Padre/Madre</option>
                            <option value="child">Hijo/Hija</option>
                            <option value="sibling">Hermano/Hermana</option>
                            <option value="friend">Amigo/Amiga</option>
                            <option value="other">Otro</option>
                        </select>
                    </div>
                </div>
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
                    {loading ? <LoadingSpinner size="small" /> : 'Agregar Residente'}
                </button>
            </div>
        </form>
    );
};

// ============= RESIDENT DETAIL FORM COMPONENT =============
const ResidentDetailForm = ({ resident, onUpdate, onDelete, onCancel }) => {
    const [formData, setFormData] = useState({
        name: resident.name || '',
        email: resident.email || '',
        phone: resident.phone || '',
        unitNumber: resident.unitNumber || '',
        status: resident.status || 'active',
        emergencyContact: {
            name: resident.emergencyContact?.name || '',
            phone: resident.emergencyContact?.phone || '',
            relationship: resident.emergencyContact?.relationship || ''
        }
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isEditing, setIsEditing] = useState(false);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        
        if (name.startsWith('emergencyContact.')) {
            const field = name.split('.')[1];
            setFormData(prev => ({
                ...prev,
                emergencyContact: {
                    ...prev.emergencyContact,
                    [field]: value
                }
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        
        setLoading(true);
        setError('');
        
        try {
            await onUpdate(resident.id, formData);
            setIsEditing(false);
        } catch (err) {
            setError(err.message || 'Error actualizando residente');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        setLoading(true);
        try {
            await onDelete(resident.id);
        } catch (err) {
            setError(err.message || 'Error eliminando residente');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="resident-detail-form">
            {error && <ErrorMessage message={error} />}
            
            <div className="resident-header">
                <div className="resident-avatar-large">
                    {resident.profileImage ? (
                        <img src={resident.profileImage} alt={resident.name} />
                    ) : (
                        <div className="avatar-placeholder-large">
                            {resident.name.charAt(0).toUpperCase()}
                        </div>
                    )}
                </div>
                
                <div className="resident-basic-info">
                    <h2>{resident.name}</h2>
                    <p>{resident.email}</p>
                    <span className="resident-id">ID: {resident.id}</span>
                </div>
                
                <div className="resident-actions">
                    {!isEditing ? (
                        <>
                            <button 
                                onClick={() => setIsEditing(true)}
                                className="edit-btn"
                                disabled={loading}
                            >
                                ✏️ Editar
                            </button>
                            <button 
                                onClick={handleDelete}
                                className="delete-btn"
                                disabled={loading}
                            >
                                {loading ? <LoadingSpinner size="small" /> : '🗑️ Eliminar'}
                            </button>
                        </>
                    ) : (
                        <button 
                            onClick={() => setIsEditing(false)}
                            className="cancel-edit-btn"
                            disabled={loading}
                        >
                            Cancelar Edición
                        </button>
                    )}
                </div>
            </div>
            
            <form onSubmit={handleUpdate} className="resident-form">
                <div className="form-section">
                    <h4>Información Personal</h4>
                    
                    <div className="form-group">
                        <label htmlFor="name">Nombre Completo</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            disabled={!isEditing || loading}
                            required
                        />
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            disabled={!isEditing || loading}
                            required
                        />
                    </div>
                    
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="phone">Teléfono</label>
                            <input
                                type="tel"
                                id="phone"
                                name="phone"
                                value={formData.phone}
                                onChange={handleInputChange}
                                disabled={!isEditing || loading}
                                required
                            />
                        </div>
                        
                        <div className="form-group">
                            <label htmlFor="unitNumber">Número de Unidad</label>
                            <input
                                type="text"
                                id="unitNumber"
                                name="unitNumber"
                                value={formData.unitNumber}
                                onChange={handleInputChange}
                                disabled={!isEditing || loading}
                                required
                            />
                        </div>
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="status">Estado</label>
                        <select
                            id="status"
                            name="status"
                            value={formData.status}
                            onChange={handleInputChange}
                            disabled={!isEditing || loading}
                        >
                            <option value="active">Activo</option>
                            <option value="inactive">Inactivo</option>
                            <option value="pending">Pendiente</option>
                            <option value="suspended">Suspendido</option>
                        </select>
                    </div>
                </div>
                
                <div className="form-section">
                    <h4>Contacto de Emergencia</h4>
                    
                    <div className="form-group">
                        <label htmlFor="emergencyContact.name">Nombre</label>
                        <input
                            type="text"
                            id="emergencyContact.name"
                            name="emergencyContact.name"
                            value={formData.emergencyContact.name}
                            onChange={handleInputChange}
                            disabled={!isEditing || loading}
                        />
                    </div>
                    
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="emergencyContact.phone">Teléfono</label>
                            <input
                                type="tel"
                                id="emergencyContact.phone"
                                name="emergencyContact.phone"
                                value={formData.emergencyContact.phone}
                                onChange={handleInputChange}
                                disabled={!isEditing || loading}
                            />
                        </div>
                        
                        <div className="form-group">
                            <label htmlFor="emergencyContact.relationship">Relación</label>
                            <select
                                id="emergencyContact.relationship"
                                name="emergencyContact.relationship"
                                value={formData.emergencyContact.relationship}
                                onChange={handleInputChange}
                                disabled={!isEditing || loading}
                            >
                                <option value="">Seleccionar...</option>
                                <option value="spouse">Cónyuge</option>
                                <option value="parent">Padre/Madre</option>
                                <option value="child">Hijo/Hija</option>
                                <option value="sibling">Hermano/Hermana</option>
                                <option value="friend">Amigo/Amiga</option>
                                <option value="other">Otro</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <div className="resident-metadata">
                    <h4>Información del Sistema</h4>
                    <div className="metadata-grid">
                        <div className="metadata-item">
                            <label>Fecha de Registro:</label>
                            <span>{new Date(resident.createdAt).toLocaleString()}</span>
                        </div>
                        <div className="metadata-item">
                            <label>Última Actualización:</label>
                            <span>{new Date(resident.updatedAt).toLocaleString()}</span>
                        </div>
                        <div className="metadata-item">
                            <label>Tenant ID:</label>
                            <span>{resident.tenantId}</span>
                        </div>
                    </div>
                </div>
                
                {isEditing && (
                    <div className="form-actions">
                        <button 
                            type="button" 
                            onClick={onCancel}
                            className="cancel-btn"
                            disabled={loading}
                        >
                            Cerrar
                        </button>
                        
                        <button 
                            type="submit" 
                            className="submit-btn"
                            disabled={loading}
                        >
                            {loading ? <LoadingSpinner size="small" /> : 'Guardar Cambios'}
                        </button>
                    </div>
                )}
                
                {!isEditing && (
                    <div className="form-actions">
                        <button 
                            type="button" 
                            onClick={onCancel}
                            className="close-btn"
                        >
                            Cerrar
                        </button>
                    </div>
                )}
            </form>
        </div>
    );
};

export { ResidentsComponent, ResidentCard, AddResidentForm, ResidentDetailForm };
