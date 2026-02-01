import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';

function LoginPage() {
    const [nickname, setNickname] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [eventName, setEventName] = useState('');
    const { isAuthenticated, register, loginAsAdmin } = useAuth();
    const navigate = useNavigate();

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated) {
            navigate('/menu');
        }
    }, [isAuthenticated, navigate]);

    // Load event name
    useEffect(() => {
        api.getSettings()
            .then(settings => {
                if (settings.current_event_name) {
                    setEventName(settings.current_event_name);
                }
            })
            .catch(() => console.log('Could not load event name'));
    }, []);

    const isAdminBypass = nickname === 'Admin2001';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            if (isAdminBypass) {
                // Admin bypass - no password required
                loginAsAdmin();
                navigate('/admin');
                return;
            }

            // Regular user registration
            await register(nickname.trim());
            navigate('/menu');
        } catch (err) {
            const message = err.isServerDown
                ? '⚠️ Server is offline. Please ensure the backend is running.'
                : err.message;
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-slate-900 text-white min-h-[100dvh] flex flex-col overflow-hidden">
            {/* Brand Header */}
            <header className="px-4 pt-4 text-center pb-2">
                <h1 className="text-2xl font-bold gradient-text-pink">
                    MixMasterAI
                </h1>
            </header>

            <div className="flex-1 overflow-hidden flex items-center justify-center p-4"
                style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
                <div className="glass rounded-3xl p-10 md:p-14 max-w-lg w-full border border-white/10 shadow-2xl">
                    <div className="text-center space-y-8">
                        <div className="space-y-3">
                            <h1 className="text-5xl md:text-6xl font-extrabold gradient-text-pink">
                                Pour It Up.
                            </h1>
                            <p className="text-slate-400 text-base md:text-lg">
                                {eventName ? `Welcome to ${eventName}` : 'The AI-powered cocktail experience.'}
                            </p>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-900/30 border border-red-500/50 text-red-300 px-4 py-3 rounded-xl text-sm">
                                {error}
                            </div>
                        )}

                        {/* Registration Form */}
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label htmlFor="nickname" className="block text-base text-slate-400 mb-3">
                                    Who are you?
                                </label>
                                <input
                                    type="text"
                                    id="nickname"
                                    value={nickname}
                                    onChange={(e) => setNickname(e.target.value)}
                                    required
                                    autoFocus
                                    placeholder="Enter your nickname"
                                    className="w-full px-5 py-4 text-lg rounded-xl bg-slate-800 border border-slate-700 
                            text-white placeholder-slate-500 focus:outline-none focus:ring-2 
                            focus:ring-pink-500 focus:border-transparent transition"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className={`w-full py-5 text-xl rounded-xl font-bold shadow-lg 
                          hover:scale-[1.02] transition transform active:scale-95
                          ${isAdminBypass
                                        ? 'bg-gradient-to-r from-pink-500 to-orange-500'
                                        : 'bg-gradient-to-r from-pink-600 to-violet-600'}`}
                            >
                                {isLoading ? 'Please wait...' : (isAdminBypass ? 'Go to Dashboard' : 'Start Mixing')}
                            </button>
                        </form>

                        {/* Recovery Link */}
                        <div className="pt-4 border-t border-slate-700">
                            <p className="text-slate-500 text-sm md:text-base mb-3">Lost your session?</p>
                            <a
                                href="/recovery"
                                className="text-pink-400 hover:text-pink-300 text-base font-semibold transition-colors"
                            >
                                → Recover Account with Key
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default LoginPage;
