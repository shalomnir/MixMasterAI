import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function ProtectedRoute({ children, requireAdmin = false }) {
    const { isAuthenticated, isAdmin } = useAuth();

    if (!isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    if (requireAdmin && !isAdmin) {
        return <Navigate to="/menu" replace />;
    }

    return children;
}

export default ProtectedRoute;
