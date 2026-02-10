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
                loginAsAdmin();
                navigate('/admin');
                return;
            }
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
        <div className="bg-black text-white min-h-[100dvh] flex flex-col overflow-hidden">
            {/* Brand Header */}
            <header className="px-4 pt-6 text-center pb-2">
                <h1 className="text-2xl font-bold gradient-text-cyan">
                    MixMasterAI
                </h1>
            </header>

            <div className="flex-1 overflow-hidden flex items-center justify-center p-4"
                style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
                <div className="bg-white/[0.03] backdrop-blur-md rounded-3xl p-10 md:p-14 max-w-lg w-full 
                     border border-[#00E5FF]/15 shadow-2xl shadow-[#00E5FF]/5">
                    <div className="text-center space-y-8">
                        <div className="space-y-3">
                            <h1 className="text-5xl md:text-6xl font-extrabold gradient-text-cyan">
                                Pour It Up.
                            </h1>
                            <p className="text-gray-500 text-base md:text-lg">
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
                                <label htmlFor="nickname" className="block text-base text-gray-500 mb-3">
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
                                    className="w-full px-5 py-4 text-lg rounded-xl bg-white/5 border border-white/10 
                                        text-white placeholder-gray-600 focus:outline-none focus:ring-2 
                                        focus:ring-[#00E5FF]/50 focus:border-[#00E5FF]/30 transition"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className={`w-full py-5 text-xl rounded-xl font-bold shadow-lg 
                                  hover:scale-[1.02] transition transform active:scale-95
                                  ${isAdminBypass
                                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-amber-500/30'
                                        : 'bg-gradient-to-r from-cyan-500 to-[#00E5FF] text-black shadow-[#00E5FF]/30'}`}
                            >
                                {isLoading ? 'Please wait...' : (isAdminBypass ? 'Go to Dashboard' : 'Start Mixing')}
                            </button>
                        </form>

                        {/* Recovery Link */}
                        <div className="pt-4 border-t border-white/5">
                            <p className="text-gray-600 text-sm md:text-base mb-3">Lost your session?</p>
                            <a
                                href="/recovery"
                                className="text-[#00E5FF]/70 hover:text-[#00E5FF] text-base font-semibold transition-colors"
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
