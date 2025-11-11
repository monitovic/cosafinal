import React, { useState, useEffect, useRef } from 'react';
import './SharedComponents.css';

// ============= LOADING SPINNER COMPONENT =============
const LoadingSpinner = ({ size = 'medium', color = '#2196F3', text = '' }) => {
    const sizeClasses = {
        small: 'spinner-small',
        medium: 'spinner-medium',
        large: 'spinner-large'
    };

    return (
        <div className={`loading-spinner ${sizeClasses[size]}`}>
            <div 
                className="spinner"
                style={{ borderTopColor: color }}
            ></div>
            {text && <p className="spinner-text">{text}</p>}
        </div>
    );
};

// ============= ERROR MESSAGE COMPONENT =============
const ErrorMessage = ({ message, type = 'error', onClose, dismissible = true }) => {
    const [visible, setVisible] = useState(true);

    const handleClose = () => {
        setVisible(false);
        if (onClose) onClose();
    };

    if (!visible) return null;

    const typeClasses = {
        error: 'error-message-error',
        warning: 'error-message-warning',
        info: 'error-message-info',
        success: 'error-message-success'
    };

    const typeIcons = {
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️',
        success: '✅'
    };

    return (
        <div className={`error-message ${typeClasses[type]}`}>
            <div className="error-content">
                <span className="error-icon">{typeIcons[type]}</span>
                <span className="error-text">{message}</span>
            </div>
            {dismissible && (
                <button 
                    className="error-close-btn"
                    onClick={handleClose}
                    aria-label="Cerrar mensaje"
                >
                    ✕
                </button>
            )}
        </div>
    );
};

// ============= MODAL COMPONENT =============
const Modal = ({ 
    title, 
    children, 
    onClose, 
    size = 'medium', 
    closable = true,
    backdrop = true 
}) => {
    const modalRef = useRef(null);

    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && closable) {
                onClose();
            }
        };

        const handleClickOutside = (e) => {
            if (backdrop && modalRef.current && !modalRef.current.contains(e.target)) {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        document.addEventListener('mousedown', handleClickOutside);
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.removeEventListener('mousedown', handleClickOutside);
            document.body.style.overflow = 'unset';
        };
    }, [onClose, closable, backdrop]);

    const sizeClasses = {
        small: 'modal-small',
        medium: 'modal-medium',
        large: 'modal-large',
        fullscreen: 'modal-fullscreen'
    };

    return (
        <div className="modal-overlay">
            <div 
                ref={modalRef}
                className={`modal ${sizeClasses[size]}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
            >
                <div className="modal-header">
                    <h2 id="modal-title" className="modal-title">{title}</h2>
                    {closable && (
                        <button 
                            className="modal-close-btn"
                            onClick={onClose}
                            aria-label="Cerrar modal"
                        >
                            ✕
                        </button>
                    )}
                </div>
                <div className="modal-content">
                    {children}
                </div>
            </div>
        </div>
    );
};

// ============= SEARCH BAR COMPONENT =============
const SearchBar = ({ 
    value, 
    onChange, 
    placeholder = 'Buscar...', 
    onClear,
    disabled = false,
    autoFocus = false 
}) => {
    const inputRef = useRef(null);

    useEffect(() => {
        if (autoFocus && inputRef.current) {
            inputRef.current.focus();
        }
    }, [autoFocus]);

    const handleClear = () => {
        onChange('');
        if (onClear) onClear();
        if (inputRef.current) inputRef.current.focus();
    };

    return (
        <div className="search-bar">
            <div className="search-input-container">
                <span className="search-icon">🔍</span>
                <input
                    ref={inputRef}
                    type="text"
                    className="search-input"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    disabled={disabled}
                />
                {value && (
                    <button 
                        className="search-clear-btn"
                        onClick={handleClear}
                        disabled={disabled}
                        aria-label="Limpiar búsqueda"
                    >
                        ✕
                    </button>
                )}
            </div>
        </div>
    );
};

// ============= FILTER DROPDOWN COMPONENT =============
const FilterDropdown = ({ 
    value, 
    onChange, 
    options, 
    label, 
    disabled = false,
    placeholder = 'Seleccionar...' 
}) => {
    return (
        <div className="filter-dropdown">
            {label && <label className="filter-label">{label}</label>}
            <select
                className="filter-select"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
            >
                {!options.find(opt => opt.value === value) && (
                    <option value="">{placeholder}</option>
                )}
                {options.map(option => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    );
};

// ============= PAGINATION COMPONENT =============
const Pagination = ({ 
    currentPage, 
    totalPages, 
    onPageChange, 
    showInfo = true,
    maxVisiblePages = 5 
}) => {
    if (totalPages <= 1) return null;

    const getVisiblePages = () => {
        const pages = [];
        const half = Math.floor(maxVisiblePages / 2);
        let start = Math.max(1, currentPage - half);
        let end = Math.min(totalPages, start + maxVisiblePages - 1);

        if (end - start + 1 < maxVisiblePages) {
            start = Math.max(1, end - maxVisiblePages + 1);
        }

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }

        return pages;
    };

    const visiblePages = getVisiblePages();

    return (
        <div className="pagination">
            {showInfo && (
                <div className="pagination-info">
                    Página {currentPage} de {totalPages}
                </div>
            )}
            
            <div className="pagination-controls">
                <button
                    className="pagination-btn"
                    onClick={() => onPageChange(1)}
                    disabled={currentPage === 1}
                    aria-label="Primera página"
                >
                    ⏮️
                </button>
                
                <button
                    className="pagination-btn"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    aria-label="Página anterior"
                >
                    ⬅️
                </button>

                {visiblePages[0] > 1 && (
                    <>
                        <button
                            className="pagination-btn"
                            onClick={() => onPageChange(1)}
                        >
                            1
                        </button>
                        {visiblePages[0] > 2 && <span className="pagination-ellipsis">...</span>}
                    </>
                )}

                {visiblePages.map(page => (
                    <button
                        key={page}
                        className={`pagination-btn ${page === currentPage ? 'active' : ''}`}
                        onClick={() => onPageChange(page)}
                    >
                        {page}
                    </button>
                ))}

                {visiblePages[visiblePages.length - 1] < totalPages && (
                    <>
                        {visiblePages[visiblePages.length - 1] < totalPages - 1 && (
                            <span className="pagination-ellipsis">...</span>
                        )}
                        <button
                            className="pagination-btn"
                            onClick={() => onPageChange(totalPages)}
                        >
                            {totalPages}
                        </button>
                    </>
                )}

                <button
                    className="pagination-btn"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    aria-label="Página siguiente"
                >
                    ➡️
                </button>
                
                <button
                    className="pagination-btn"
                    onClick={() => onPageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    aria-label="Última página"
                >
                    ⏭️
                </button>
            </div>
        </div>
    );
};

// ============= STATS CARD COMPONENT =============
const StatsCard = ({ 
    title, 
    value, 
    icon, 
    trend, 
    trendType = 'neutral',
    onClick,
    loading = false 
}) => {
    const trendColors = {
        positive: '#4CAF50',
        negative: '#F44336',
        neutral: '#757575'
    };

    const trendIcons = {
        positive: '📈',
        negative: '📉',
        neutral: '➖'
    };

    return (
        <div 
            className={`stats-card ${onClick ? 'clickable' : ''} ${loading ? 'loading' : ''}`}
            onClick={onClick}
        >
            {loading ? (
                <LoadingSpinner size="small" />
            ) : (
                <>
                    <div className="stats-icon">
                        {icon}
                    </div>
                    <div className="stats-content">
                        <h3 className="stats-value">{value}</h3>
                        <p className="stats-title">{title}</p>
                        {trend && (
                            <div 
                                className="stats-trend"
                                style={{ color: trendColors[trendType] }}
                            >
                                <span className="trend-icon">{trendIcons[trendType]}</span>
                                <span className="trend-value">{trend}</span>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

// ============= DATE RANGE PICKER COMPONENT =============
const DateRangePicker = ({ 
    startDate, 
    endDate, 
    onChange, 
    label,
    disabled = false 
}) => {
    const handleStartDateChange = (e) => {
        const newStartDate = e.target.value ? new Date(e.target.value) : null;
        onChange({ start: newStartDate, end: endDate });
    };

    const handleEndDateChange = (e) => {
        const newEndDate = e.target.value ? new Date(e.target.value) : null;
        onChange({ start: startDate, end: newEndDate });
    };

    const formatDateForInput = (date) => {
        if (!date) return '';
        return date.toISOString().split('T')[0];
    };

    return (
        <div className="date-range-picker">
            {label && <label className="date-range-label">{label}</label>}
            <div className="date-range-inputs">
                <input
                    type="date"
                    className="date-input"
                    value={formatDateForInput(startDate)}
                    onChange={handleStartDateChange}
                    disabled={disabled}
                    placeholder="Fecha inicio"
                />
                <span className="date-separator">-</span>
                <input
                    type="date"
                    className="date-input"
                    value={formatDateForInput(endDate)}
                    onChange={handleEndDateChange}
                    disabled={disabled}
                    min={formatDateForInput(startDate)}
                    placeholder="Fecha fin"
                />
            </div>
        </div>
    );
};

// ============= CHART COMPONENT =============
const Chart = ({ type, data, options = {}, width, height }) => {
    const canvasRef = useRef(null);
    const chartRef = useRef(null);

    useEffect(() => {
        if (!canvasRef.current || !data) return;

        // This would integrate with Chart.js or similar library
        // For now, we'll create a placeholder
        const ctx = canvasRef.current.getContext('2d');
        
        // Clear canvas
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        
        // Draw placeholder chart
        drawPlaceholderChart(ctx, type, canvasRef.current.width, canvasRef.current.height);

    }, [type, data, options]);

    const drawPlaceholderChart = (ctx, chartType, width, height) => {
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, width, height);
        
        ctx.fillStyle = '#666';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${chartType.toUpperCase()} Chart`, width / 2, height / 2);
        ctx.fillText('Chart.js integration needed', width / 2, height / 2 + 25);
    };

    return (
        <div className="chart-container">
            <canvas
                ref={canvasRef}
                width={width || 400}
                height={height || 300}
                className="chart-canvas"
            />
        </div>
    );
};

// ============= RICH TEXT EDITOR COMPONENT =============
const RichTextEditor = ({ 
    value, 
    onChange, 
    placeholder = 'Escriba aquí...', 
    disabled = false,
    toolbar = true 
}) => {
    const editorRef = useRef(null);
    const [isEditing, setIsEditing] = useState(false);

    const formatText = (command, value = null) => {
        document.execCommand(command, false, value);
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    };

    const handleInput = () => {
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    };

    const toolbarButtons = [
        { command: 'bold', icon: 'B', title: 'Negrita' },
        { command: 'italic', icon: 'I', title: 'Cursiva' },
        { command: 'underline', icon: 'U', title: 'Subrayado' },
        { command: 'insertUnorderedList', icon: '•', title: 'Lista con viñetas' },
        { command: 'insertOrderedList', icon: '1.', title: 'Lista numerada' },
        { command: 'createLink', icon: '🔗', title: 'Enlace', prompt: true }
    ];

    const handleToolbarClick = (button) => {
        if (button.prompt) {
            const url = prompt('Ingrese la URL:');
            if (url) {
                formatText(button.command, url);
            }
        } else {
            formatText(button.command);
        }
    };

    return (
        <div className="rich-text-editor">
            {toolbar && (
                <div className="editor-toolbar">
                    {toolbarButtons.map((button, index) => (
                        <button
                            key={index}
                            type="button"
                            className="toolbar-btn"
                            onClick={() => handleToolbarClick(button)}
                            disabled={disabled}
                            title={button.title}
                        >
                            {button.icon}
                        </button>
                    ))}
                </div>
            )}
            <div
                ref={editorRef}
                className="editor-content"
                contentEditable={!disabled}
                onInput={handleInput}
                onFocus={() => setIsEditing(true)}
                onBlur={() => setIsEditing(false)}
                dangerouslySetInnerHTML={{ __html: value }}
                data-placeholder={placeholder}
            />
        </div>
    );
};

// ============= LIVE FEED COMPONENT =============
const LiveFeed = ({ streamUrl, autoPlay = true, controls = true }) => {
    const videoRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (videoRef.current && streamUrl) {
            const video = videoRef.current;
            
            const handleLoadStart = () => setIsLoading(true);
            const handleCanPlay = () => setIsLoading(false);
            const handleError = () => {
                setIsLoading(false);
                setError('Error cargando el stream de video');
            };

            video.addEventListener('loadstart', handleLoadStart);
            video.addEventListener('canplay', handleCanPlay);
            video.addEventListener('error', handleError);

            return () => {
                video.removeEventListener('loadstart', handleLoadStart);
                video.removeEventListener('canplay', handleCanPlay);
                video.removeEventListener('error', handleError);
            };
        }
    }, [streamUrl]);

    if (error) {
        return (
            <div className="live-feed-error">
                <div className="error-icon">📹</div>
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div className="live-feed">
            {isLoading && (
                <div className="live-feed-loading">
                    <LoadingSpinner size="medium" />
                    <p>Cargando stream...</p>
                </div>
            )}
            <video
                ref={videoRef}
                className="live-feed-video"
                src={streamUrl}
                autoPlay={autoPlay}
                controls={controls}
                muted
                playsInline
            />
        </div>
    );
};

// ============= CALENDAR COMPONENT =============
const Calendar = ({ 
    currentDate, 
    onDateChange, 
    renderDay, 
    events = [],
    minDate,
    maxDate 
}) => {
    const [viewDate, setViewDate] = useState(currentDate || new Date());

    const getDaysInMonth = (date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    };

    const generateCalendarDays = () => {
        const daysInMonth = getDaysInMonth(viewDate);
        const firstDay = getFirstDayOfMonth(viewDate);
        const days = [];

        // Previous month days
        const prevMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 0);
        const daysInPrevMonth = prevMonth.getDate();
        
        for (let i = firstDay - 1; i >= 0; i--) {
            const day = daysInPrevMonth - i;
            const date = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, day);
            days.push({ date, isCurrentMonth: false });
        }

        // Current month days
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
            days.push({ date, isCurrentMonth: true });
        }

        // Next month days
        const remainingDays = 42 - days.length; // 6 weeks * 7 days
        for (let day = 1; day <= remainingDays; day++) {
            const date = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, day);
            days.push({ date, isCurrentMonth: false });
        }

        return days;
    };

    const navigateMonth = (direction) => {
        const newDate = new Date(viewDate);
        newDate.setMonth(newDate.getMonth() + direction);
        setViewDate(newDate);
    };

    const isDateDisabled = (date) => {
        if (minDate && date < minDate) return true;
        if (maxDate && date > maxDate) return true;
        return false;
    };

    const calendarDays = generateCalendarDays();
    const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    return (
        <div className="calendar">
            <div className="calendar-header">
                <button 
                    className="calendar-nav-btn"
                    onClick={() => navigateMonth(-1)}
                >
                    ⬅️
                </button>
                <h3 className="calendar-title">
                    {monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}
                </h3>
                <button 
                    className="calendar-nav-btn"
                    onClick={() => navigateMonth(1)}
                >
                    ➡️
                </button>
            </div>

            <div className="calendar-grid">
                {dayNames.map(day => (
                    <div key={day} className="calendar-day-header">
                        {day}
                    </div>
                ))}
                
                {calendarDays.map((dayInfo, index) => (
                    <div
                        key={index}
                        className={`calendar-day ${
                            !dayInfo.isCurrentMonth ? 'other-month' : ''
                        } ${
                            currentDate && dayInfo.date.toDateString() === currentDate.toDateString() ? 'selected' : ''
                        } ${
                            isDateDisabled(dayInfo.date) ? 'disabled' : ''
                        }`}
                        onClick={() => {
                            if (!isDateDisabled(dayInfo.date) && onDateChange) {
                                onDateChange(dayInfo.date);
                            }
                        }}
                    >
                        {renderDay ? renderDay(dayInfo.date) : dayInfo.date.getDate()}
                    </div>
                ))}
            </div>
        </div>
    );
};

export {
    LoadingSpinner,
    ErrorMessage,
    Modal,
    SearchBar,
    FilterDropdown,
    Pagination,
    StatsCard,
    DateRangePicker,
    Chart,
    RichTextEditor,
    LiveFeed,
    Calendar
};
