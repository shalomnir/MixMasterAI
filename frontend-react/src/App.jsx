import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import LoginPage from './pages/LoginPage'
import MenuPage from './pages/MenuPage'
import AdminDashboard from './pages/AdminDashboard'
import MagicLinkPage from './pages/MagicLinkPage'
import ProtectedRoute from './components/ProtectedRoute'
import PouringStatus from './components/PouringStatus'

function App() {
    return (
        <>
            <Routes>
                {/* Public Routes */}
                <Route path="/" element={<LoginPage />} />
                <Route path="/u/:token" element={<MagicLinkPage />} />

                {/* Protected User Routes */}
                <Route path="/menu" element={
                    <ProtectedRoute>
                        <MenuPage />
                    </ProtectedRoute>
                } />
                <Route path="/profile" element={
                    <ProtectedRoute>
                        <ProfilePage />
                    </ProtectedRoute>
                } />
                <Route path="/leaderboard" element={
                    <ProtectedRoute>
                        <LeaderboardPage />
                    </ProtectedRoute>
                } />

                {/* Admin Route */}
                <Route path="/admin" element={
                    <ProtectedRoute requireAdmin>
                        <AdminDashboard />
                    </ProtectedRoute>
                } />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>

            {/* Global Pouring Overlay */}
            <PouringStatus />
        </>
    )
}

export default App
