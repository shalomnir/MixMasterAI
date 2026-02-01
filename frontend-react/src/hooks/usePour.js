import { useContext } from 'react';
import { PouringContext } from '../context/PouringContext';

export function usePour() {
    const context = useContext(PouringContext);
    if (!context) {
        throw new Error('usePour must be used within a PouringProvider');
    }
    return context;
}
