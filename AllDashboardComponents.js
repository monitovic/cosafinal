import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { API } from 'aws-amplify';
import LoadingSpinner from '../shared/LoadingSpinner';
import ErrorMessage from '../shared/ErrorMessage';
import StatsCard from '../shared/StatsCard';
import Chart from '../shared/Chart';
import './DashboardComponent.css';

// ============= DASHBOARD COMPONENT =============
const DashboardComponent = () => {
    const [dashboardData, setDashboardData] = useState({
        stats: {
            totalResidents: 0,
            monthlyRevenue: 0,
            pendingMaintenance: 0,
            securityIncidents: 0
        },
        recentActivities: [],
        pendingTasks: [],
        chartData: {
            revenue: [],
            maintenance: [],
            occupancy: []
        }
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    
    const { user } = useAuth();

    useEffect(() => {
        loadDashboardData();
        
        // Set up auto-refresh every 5 minutes
        const interval = setInterval(() => {
            refreshDashboardData();
        }, 300000);
        
        return () => clearInterval(interval);
    }, []);

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            setError('');
            
            const [stats, activities, tasks, charts] = await Promise.all([
                API.get('CondoconnectAPI', '/dashboard/stats'),
                API.get('CondoconnectAPI', '/dashboard/activities'),
                API.get('CondoconnectAPI', '/dashboard/tasks'),
                API.get('CondoconnectAPI', '/dashboard/charts')
            ]);
            
            setDashboardData({
                stats: stats.data,
                recentActivities: activities.data,
                pendingTasks: tasks.data,
                chartData: charts.data
            });
            
        } catch (err) {
            console.error('Error loading dashboard data:', err);
            setError('Error cargando datos del dashboard');
        } finally {
            setLoading(false);
        }
    };

    const refreshDashboardData = async () => {
        try {
            setRefreshing(true);
            await loadDashboardData();
        } catch (err) {
            console.error('Error refreshing dashboard:', err);
        } finally {
            setRefreshing(false);
        }
    };

    const handleTaskComplete = async (taskId) => {
        try {
            await API.put('CondoconnectAPI', `/tasks/${taskId}`, {
                body: { status: 'completed' }
            });
            
            // Update local state
            setDashboardData(prev => ({
                ...prev,
                pendingTasks: prev.pendingTasks.filter(task => task.id !== taskId)
            }));
            
        } catch (err) {
            console.error('Error completing task:', err);
        }
    };

    if (loading) {
        return (
            <div className="dashboard-loading">
                <LoadingSpinner size="large" />
                <p>Cargando dashboard...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="dashboard-error">
                <ErrorMessage message={error} />
                <button onClick={loadDashboardData} className="retry-btn">
                    Reintentar
                </button>
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <div className="header-content">
                    <h1>Dashboard</h1>
                    <p>Bienvenido, {user?.name || user?.email}</p>
                </div>
                <div className="header-actions">
                    <button 
                        onClick={refreshDashboardData} 
                        className={`refresh-btn ${refreshing ? 'refreshing' : ''}`}
                        disabled={refreshing}
                    >
                        {refreshing ? <LoadingSpinner size="small" /> : '🔄'}
                        Actualizar
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="stats-grid">
                <StatsCard
                    title="Residentes Totales"
                    value={dashboardData.stats.totalResidents}
                    icon="👥"
                    trend="+5%"
                    trendType="positive"
                />
                <StatsCard
                    title="Ingresos Mensuales"
                    value={`$${dashboardData.stats.monthlyRevenue.toLocaleString()}`}
                    icon="💰"
                    trend="+12%"
                    trendType="positive"
                />
                <StatsCard
                    title="Mantenimiento Pendiente"
                    value={dashboardData.stats.pendingMaintenance}
                    icon="🔧"
                    trend="-3"
                    trendType="negative"
                />
                <StatsCard
                    title="Incidentes de Seguridad"
                    value={dashboardData.stats.securityIncidents}
                    icon="🛡️"
                    trend="0"
                    trendType="neutral"
                />
            </div>

            {/* Charts Section */}
            <div className="charts-section">
                <div className="chart-container">
                    <h3>Ingresos Mensuales</h3>
                    <Chart
                        type="line"
                        data={dashboardData.chartData.revenue}
                        options={{
                            responsive: true,
                            plugins: {
                                legend: {
                                    position: 'top',
                                },
                                title: {
                                    display: true,
                                    text: 'Ingresos por Mes'
                                }
                            }
                        }}
                    />
                </div>
                
                <div className="chart-container">
                    <h3>Órdenes de Mantenimiento</h3>
                    <Chart
                        type="doughnut"
                        data={dashboardData.chartData.maintenance}
                        options={{
                            responsive: true,
                            plugins: {
                                legend: {
                                    position: 'bottom',
                                }
                            }
                        }}
                    />
                </div>
            </div>

            {/* Activities and Tasks */}
            <div className="content-grid">
                <div className="activities-section">
                    <div className="section-header">
                        <h3>Actividades Recientes</h3>
                        <button className="view-all-btn">Ver todas</button>
                    </div>
                    
                    <div className="activities-list">
                        {dashboardData.recentActivities.map(activity => (
                            <ActivityItem key={activity.id} activity={activity} />
                        ))}
                    </div>
                </div>

                <div className="tasks-section">
                    <div className="section-header">
                        <h3>Tareas Pendientes</h3>
                        <button className="add-task-btn">+ Nueva Tarea</button>
                    </div>
                    
                    <div className="tasks-list">
                        {dashboardData.pendingTasks.map(task => (
                            <TaskItem 
                                key={task.id} 
                                task={task} 
                                onComplete={handleTaskComplete}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ============= ACTIVITY ITEM COMPONENT =============
const ActivityItem = ({ activity }) => {
    const getActivityIcon = (type) => {
        const icons = {
            'new_resident': '👤',
            'payment': '💳',
            'maintenance': '🔧',
            'security': '🛡️',
            'communication': '💬'
        };
        return icons[type] || '📋';
    };

    const getActivityColor = (type) => {
        const colors = {
            'new_resident': '#4CAF50',
            'payment': '#2196F3',
            'maintenance': '#FF9800',
            'security': '#F44336',
            'communication': '#9C27B0'
        };
        return colors[type] || '#757575';
    };

    return (
        <div className="activity-item">
            <div 
                className="activity-icon"
                style={{ backgroundColor: getActivityColor(activity.type) }}
            >
                {getActivityIcon(activity.type)}
            </div>
            <div className="activity-content">
                <p className="activity-description">{activity.description}</p>
                <span className="activity-time">{activity.timeAgo}</span>
            </div>
        </div>
    );
};

// ============= TASK ITEM COMPONENT =============
const TaskItem = ({ task, onComplete }) => {
    const [completing, setCompleting] = useState(false);

    const handleComplete = async () => {
        setCompleting(true);
        try {
            await onComplete(task.id);
        } catch (err) {
            console.error('Error completing task:', err);
        } finally {
            setCompleting(false);
        }
    };

    const getPriorityColor = (priority) => {
        const colors = {
            'high': '#F44336',
            'medium': '#FF9800',
            'low': '#4CAF50'
        };
        return colors[priority] || '#757575';
    };

    return (
        <div className="task-item">
            <div className="task-content">
                <h4 className="task-title">{task.title}</h4>
                <p className="task-description">{task.description}</p>
                <div className="task-meta">
                    <span 
                        className="task-priority"
                        style={{ color: getPriorityColor(task.priority) }}
                    >
                        {task.priority.toUpperCase()}
                    </span>
                    <span className="task-due-date">
                        Vence: {new Date(task.dueDate).toLocaleDateString()}
                    </span>
                </div>
            </div>
            <div className="task-actions">
                <button 
                    onClick={handleComplete}
                    className="complete-btn"
                    disabled={completing}
                >
                    {completing ? <LoadingSpinner size="small" /> : '✓'}
                </button>
            </div>
        </div>
    );
};

export { DashboardComponent, ActivityItem, TaskItem };
