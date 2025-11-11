import { useState, useEffect, useCallback, useRef, useContext, createContext } from 'react';
import { Auth, API } from 'aws-amplify';

// ============= AUTH CONTEXT =============
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        checkAuthState();
    }, []);

    const checkAuthState = async () => {
        try {
            const currentUser = await Auth.currentAuthenticatedUser();
            const userInfo = await Auth.currentUserInfo();
            
            setUser({
                ...currentUser,
                ...userInfo,
                attributes: currentUser.attributes
            });
            setIsAuthenticated(true);
        } catch (error) {
            setUser(null);
            setIsAuthenticated(false);
        } finally {
            setLoading(false);
        }
    };

    const login = async (credentials, userInfo) => {
        setUser({
            ...credentials,
            ...userInfo
        });
        setIsAuthenticated(true);
    };

    const logout = async () => {
        try {
            await Auth.signOut();
            setUser(null);
            setIsAuthenticated(false);
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    const value = {
        user,
        loading,
        isAuthenticated,
        login,
        logout,
        checkAuthState
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

// ============= USE AUTH HOOK =============
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

// ============= USE API HOOK =============
export const useAPI = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const request = useCallback(async (method, endpoint, options = {}) => {
        setLoading(true);
        setError(null);

        try {
            let response;
            
            switch (method.toUpperCase()) {
                case 'GET':
                    response = await API.get('CondoconnectAPI', endpoint, options);
                    break;
                case 'POST':
                    response = await API.post('CondoconnectAPI', endpoint, options);
                    break;
                case 'PUT':
                    response = await API.put('CondoconnectAPI', endpoint, options);
                    break;
                case 'DELETE':
                    response = await API.del('CondoconnectAPI', endpoint, options);
                    break;
                default:
                    throw new Error(`Unsupported HTTP method: ${method}`);
            }

            return response;
        } catch (err) {
            setError(err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const get = useCallback((endpoint, options) => request('GET', endpoint, options), [request]);
    const post = useCallback((endpoint, options) => request('POST', endpoint, options), [request]);
    const put = useCallback((endpoint, options) => request('PUT', endpoint, options), [request]);
    const del = useCallback((endpoint, options) => request('DELETE', endpoint, options), [request]);

    return {
        loading,
        error,
        request,
        get,
        post,
        put,
        delete: del
    };
};

// ============= USE LOCAL STORAGE HOOK =============
export const useLocalStorage = (key, initialValue) => {
    const [storedValue, setStoredValue] = useState(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error(`Error reading localStorage key "${key}":`, error);
            return initialValue;
        }
    });

    const setValue = useCallback((value) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (error) {
            console.error(`Error setting localStorage key "${key}":`, error);
        }
    }, [key, storedValue]);

    const removeValue = useCallback(() => {
        try {
            window.localStorage.removeItem(key);
            setStoredValue(initialValue);
        } catch (error) {
            console.error(`Error removing localStorage key "${key}":`, error);
        }
    }, [key, initialValue]);

    return [storedValue, setValue, removeValue];
};

// ============= USE DEBOUNCE HOOK =============
export const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
};

// ============= USE DEBOUNCE HOOK =============
export const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
};

// ============= USE PREVIOUS HOOK =============
export const usePrevious = (value) => {
    const ref = useRef();
    
    useEffect(() => {
        ref.current = value;
    });
    
    return ref.current;
};

// ============= USE ONLINE STATUS HOOK =============
export const useOnlineStatus = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return isOnline;
};

// ============= USE WINDOW SIZE HOOK =============
export const useWindowSize = () => {
    const [windowSize, setWindowSize] = useState({
        width: window.innerWidth,
        height: window.innerHeight,
    });

    useEffect(() => {
        const handleResize = () => {
            setWindowSize({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return windowSize;
};

// ============= USE INTERSECTION OBSERVER HOOK =============
export const useIntersectionObserver = (options = {}) => {
    const [isIntersecting, setIsIntersecting] = useState(false);
    const [entry, setEntry] = useState(null);
    const elementRef = useRef(null);

    useEffect(() => {
        const element = elementRef.current;
        if (!element) return;

        const observer = new IntersectionObserver(([entry]) => {
            setIsIntersecting(entry.isIntersecting);
            setEntry(entry);
        }, options);

        observer.observe(element);

        return () => {
            observer.unobserve(element);
        };
    }, [options]);

    return [elementRef, isIntersecting, entry];
};

// ============= USE ASYNC HOOK =============
export const useAsync = (asyncFunction, dependencies = []) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const execute = useCallback(async (...args) => {
        setLoading(true);
        setError(null);

        try {
            const result = await asyncFunction(...args);
            setData(result);
            return result;
        } catch (err) {
            setError(err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, dependencies);

    useEffect(() => {
        execute();
    }, [execute]);

    return { data, loading, error, execute };
};

// ============= USE FORM HOOK =============
export const useForm = (initialValues = {}, validationSchema = {}) => {
    const [values, setValues] = useState(initialValues);
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const setValue = useCallback((name, value) => {
        setValues(prev => ({
            ...prev,
            [name]: value
        }));

        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: undefined
            }));
        }
    }, [errors]);

    const setFieldTouched = useCallback((name, isTouched = true) => {
        setTouched(prev => ({
            ...prev,
            [name]: isTouched
        }));
    }, []);

    const validateField = useCallback((name, value) => {
        const fieldValidation = validationSchema[name];
        if (!fieldValidation) return null;

        try {
            fieldValidation(value);
            return null;
        } catch (error) {
            return error.message;
        }
    }, [validationSchema]);

    const validateForm = useCallback(() => {
        const newErrors = {};
        let isValid = true;

        Object.keys(validationSchema).forEach(fieldName => {
            const error = validateField(fieldName, values[fieldName]);
            if (error) {
                newErrors[fieldName] = error;
                isValid = false;
            }
        });

        setErrors(newErrors);
        return isValid;
    }, [values, validateField, validationSchema]);

    const handleChange = useCallback((e) => {
        const { name, value, type, checked } = e.target;
        const fieldValue = type === 'checkbox' ? checked : value;
        setValue(name, fieldValue);
    }, [setValue]);

    const handleBlur = useCallback((e) => {
        const { name, value } = e.target;
        setFieldTouched(name, true);
        
        const error = validateField(name, value);
        if (error) {
            setErrors(prev => ({
                ...prev,
                [name]: error
            }));
        }
    }, [setFieldTouched, validateField]);

    const handleSubmit = useCallback((onSubmit) => {
        return async (e) => {
            if (e) e.preventDefault();
            
            setIsSubmitting(true);
            
            // Mark all fields as touched
            const allTouched = {};
            Object.keys(values).forEach(key => {
                allTouched[key] = true;
            });
            setTouched(allTouched);

            const isValid = validateForm();
            
            if (isValid) {
                try {
                    await onSubmit(values);
                } catch (error) {
                    console.error('Form submission error:', error);
                }
            }
            
            setIsSubmitting(false);
        };
    }, [values, validateForm]);

    const resetForm = useCallback(() => {
        setValues(initialValues);
        setErrors({});
        setTouched({});
        setIsSubmitting(false);
    }, [initialValues]);

    const isValid = Object.keys(errors).length === 0;

    return {
        values,
        errors,
        touched,
        isSubmitting,
        isValid,
        setValue,
        setFieldTouched,
        handleChange,
        handleBlur,
        handleSubmit,
        resetForm,
        validateForm
    };
};

// ============= USE PAGINATION HOOK =============
export const usePagination = (data, itemsPerPage = 10) => {
    const [currentPage, setCurrentPage] = useState(1);

    const totalPages = Math.ceil(data.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentData = data.slice(startIndex, endIndex);

    const goToPage = useCallback((page) => {
        const pageNumber = Math.max(1, Math.min(page, totalPages));
        setCurrentPage(pageNumber);
    }, [totalPages]);

    const goToNextPage = useCallback(() => {
        goToPage(currentPage + 1);
    }, [currentPage, goToPage]);

    const goToPreviousPage = useCallback(() => {
        goToPage(currentPage - 1);
    }, [currentPage, goToPage]);

    const goToFirstPage = useCallback(() => {
        goToPage(1);
    }, [goToPage]);

    const goToLastPage = useCallback(() => {
        goToPage(totalPages);
    }, [goToPage, totalPages]);

    // Reset to first page when data changes
    useEffect(() => {
        setCurrentPage(1);
    }, [data.length]);

    return {
        currentPage,
        totalPages,
        currentData,
        goToPage,
        goToNextPage,
        goToPreviousPage,
        goToFirstPage,
        goToLastPage,
        hasNextPage: currentPage < totalPages,
        hasPreviousPage: currentPage > 1
    };
};

// ============= USE SEARCH HOOK =============
export const useSearch = (data, searchFields = [], options = {}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredData, setFilteredData] = useState(data);
    
    const {
        caseSensitive = false,
        exactMatch = false,
        debounceMs = 300
    } = options;

    const debouncedSearchTerm = useDebounce(searchTerm, debounceMs);

    useEffect(() => {
        if (!debouncedSearchTerm.trim()) {
            setFilteredData(data);
            return;
        }

        const filtered = data.filter(item => {
            return searchFields.some(field => {
                const fieldValue = getNestedValue(item, field);
                if (fieldValue == null) return false;

                const searchValue = caseSensitive ? debouncedSearchTerm : debouncedSearchTerm.toLowerCase();
                const itemValue = caseSensitive ? String(fieldValue) : String(fieldValue).toLowerCase();

                return exactMatch ? itemValue === searchValue : itemValue.includes(searchValue);
            });
        });

        setFilteredData(filtered);
    }, [data, debouncedSearchTerm, searchFields, caseSensitive, exactMatch]);

    const getNestedValue = (obj, path) => {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    };

    const clearSearch = useCallback(() => {
        setSearchTerm('');
    }, []);

    return {
        searchTerm,
        setSearchTerm,
        filteredData,
        clearSearch,
        hasResults: filteredData.length > 0,
        resultCount: filteredData.length
    };
};

// ============= USE SORT HOOK =============
export const useSort = (data, defaultSortKey = null, defaultSortOrder = 'asc') => {
    const [sortKey, setSortKey] = useState(defaultSortKey);
    const [sortOrder, setSortOrder] = useState(defaultSortOrder);

    const sortedData = useMemo(() => {
        if (!sortKey) return data;

        return [...data].sort((a, b) => {
            const aValue = getNestedValue(a, sortKey);
            const bValue = getNestedValue(b, sortKey);

            if (aValue == null && bValue == null) return 0;
            if (aValue == null) return sortOrder === 'asc' ? 1 : -1;
            if (bValue == null) return sortOrder === 'asc' ? -1 : 1;

            let comparison = 0;

            if (typeof aValue === 'string' && typeof bValue === 'string') {
                comparison = aValue.localeCompare(bValue);
            } else if (typeof aValue === 'number' && typeof bValue === 'number') {
                comparison = aValue - bValue;
            } else if (aValue instanceof Date && bValue instanceof Date) {
                comparison = aValue.getTime() - bValue.getTime();
            } else {
                comparison = String(aValue).localeCompare(String(bValue));
            }

            return sortOrder === 'asc' ? comparison : -comparison;
        });
    }, [data, sortKey, sortOrder]);

    const getNestedValue = (obj, path) => {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    };

    const handleSort = useCallback((key) => {
        if (sortKey === key) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortOrder('asc');
        }
    }, [sortKey]);

    const resetSort = useCallback(() => {
        setSortKey(defaultSortKey);
        setSortOrder(defaultSortOrder);
    }, [defaultSortKey, defaultSortOrder]);

    return {
        sortedData,
        sortKey,
        sortOrder,
        handleSort,
        resetSort,
        isSorted: sortKey !== null
    };
};

// ============= USE FILTER HOOK =============
export const useFilter = (data, initialFilters = {}) => {
    const [filters, setFilters] = useState(initialFilters);
    const [filteredData, setFilteredData] = useState(data);

    useEffect(() => {
        let filtered = data;

        Object.entries(filters).forEach(([key, filterValue]) => {
            if (filterValue == null || filterValue === '' || filterValue === 'all') {
                return; // Skip empty filters
            }

            filtered = filtered.filter(item => {
                const itemValue = getNestedValue(item, key);
                
                if (Array.isArray(filterValue)) {
                    return filterValue.includes(itemValue);
                }
                
                if (typeof filterValue === 'function') {
                    return filterValue(itemValue, item);
                }
                
                return itemValue === filterValue;
            });
        });

        setFilteredData(filtered);
    }, [data, filters]);

    const getNestedValue = (obj, path) => {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    };

    const setFilter = useCallback((key, value) => {
        setFilters(prev => ({
            ...prev,
            [key]: value
        }));
    }, []);

    const removeFilter = useCallback((key) => {
        setFilters(prev => {
            const newFilters = { ...prev };
            delete newFilters[key];
            return newFilters;
        });
    }, []);

    const clearFilters = useCallback(() => {
        setFilters(initialFilters);
    }, [initialFilters]);

    const hasActiveFilters = Object.values(filters).some(value => 
        value != null && value !== '' && value !== 'all'
    );

    return {
        filteredData,
        filters,
        setFilter,
        removeFilter,
        clearFilters,
        hasActiveFilters,
        resultCount: filteredData.length
    };
};

// ============= USE NOTIFICATION HOOK =============
export const useNotification = () => {
    const [notifications, setNotifications] = useState([]);

    const addNotification = useCallback((notification) => {
        const id = Date.now().toString();
        const newNotification = {
            id,
            type: 'info',
            duration: 5000,
            ...notification
        };

        setNotifications(prev => [...prev, newNotification]);

        if (newNotification.duration > 0) {
            setTimeout(() => {
                removeNotification(id);
            }, newNotification.duration);
        }

        return id;
    }, []);

    const removeNotification = useCallback((id) => {
        setNotifications(prev => prev.filter(notification => notification.id !== id));
    }, []);

    const clearNotifications = useCallback(() => {
        setNotifications([]);
    }, []);

    const showSuccess = useCallback((message, options = {}) => {
        return addNotification({
            type: 'success',
            message,
            ...options
        });
    }, [addNotification]);

    const showError = useCallback((message, options = {}) => {
        return addNotification({
            type: 'error',
            message,
            duration: 0, // Don't auto-dismiss errors
            ...options
        });
    }, [addNotification]);

    const showWarning = useCallback((message, options = {}) => {
        return addNotification({
            type: 'warning',
            message,
            ...options
        });
    }, [addNotification]);

    const showInfo = useCallback((message, options = {}) => {
        return addNotification({
            type: 'info',
            message,
            ...options
        });
    }, [addNotification]);

    return {
        notifications,
        addNotification,
        removeNotification,
        clearNotifications,
        showSuccess,
        showError,
        showWarning,
        showInfo
    };
};

// ============= USE CLIPBOARD HOOK =============
export const useClipboard = () => {
    const [copied, setCopied] = useState(false);

    const copyToClipboard = useCallback(async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            
            // Reset copied state after 2 seconds
            setTimeout(() => setCopied(false), 2000);
            
            return true;
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            setCopied(false);
            return false;
        }
    }, []);

    return { copied, copyToClipboard };
};

// ============= USE MEDIA QUERY HOOK =============
export const useMediaQuery = (query) => {
    const [matches, setMatches] = useState(() => {
        if (typeof window !== 'undefined') {
            return window.matchMedia(query).matches;
        }
        return false;
    });

    useEffect(() => {
        const mediaQuery = window.matchMedia(query);
        const handler = (event) => setMatches(event.matches);
        
        mediaQuery.addListener(handler);
        return () => mediaQuery.removeListener(handler);
    }, [query]);

    return matches;
};

// ============= USE THEME HOOK =============
export const useTheme = () => {
    const [theme, setTheme] = useLocalStorage('theme', 'light');

    const toggleTheme = useCallback(() => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    }, [setTheme]);

    const setLightTheme = useCallback(() => {
        setTheme('light');
    }, [setTheme]);

    const setDarkTheme = useCallback(() => {
        setTheme('dark');
    }, [setTheme]);

    // Apply theme to document
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    return {
        theme,
        setTheme,
        toggleTheme,
        setLightTheme,
        setDarkTheme,
        isDark: theme === 'dark',
        isLight: theme === 'light'
    };
};

