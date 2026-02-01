import { createContext, useState, useCallback } from 'react';

export const ToastContext = createContext(null);

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback((message, type = 'info', duration = 3000) => {
        const id = Date.now();
        const toast = { id, message, type };

        setToasts(prev => [...prev, toast]);

        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, duration);

        return id;
    }, []);

    const hideToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const showSuccess = useCallback((message, duration) => {
        return showToast(message, 'success', duration);
    }, [showToast]);

    const showError = useCallback((message, duration) => {
        return showToast(message, 'error', duration);
    }, [showToast]);

    const showHighball = useCallback(() => {
        return showToast('Base poured! Please top up with Soda/Tonic. 🥤', 'info', 8000);
    }, [showToast]);

    const value = {
        toasts,
        showToast,
        hideToast,
        showSuccess,
        showError,
        showHighball
    };

    return (
        <ToastContext.Provider value={value}>
            {children}
        </ToastContext.Provider>
    );
}
