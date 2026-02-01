import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';

function RecoveryPage() {
    const [recoveryKey, setRecoveryKey] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { isAuthenticated, recover } = useAuth();
    const navigate = useNavigate();

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated) {
            navigate('/menu');
        }
    }, [isAuthenticated, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await recover(recoveryKey.trim().toUpperCase());
            navigate('/menu');
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-slate-900 text-white min-h-[100dvh] flex flex-col overflow-hidden">
            <div className="h-[100dvh] overflow-hidden flex items-center justify-center p-4">
                <div className="glass rounded-3xl p-10 md:p-14 max-w-lg w-full border border-white/10 shadow-2xl">
                    <div className="text-center space-y-8">
                        <div className="space-y-3">
                            <h1 className="text-4xl md:text-5xl font-extrabold gradient-text-pink">
                                Account Recovery
                            </h1>
                            <p className="text-slate-400 text-base">Enter your 6-character recovery key</p>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-900/30 border border-red-500/50 text-red-300 px-4 py-3 rounded-xl text-sm">
                                {error}
                            </div>
                        )}

                        {/* Recovery Form */}
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <input
                                    type="text"
                                    value={recoveryKey}
                                    onChange={(e) => setRecoveryKey(e.target.value.toUpperCase())}
                                    required
                                    autoFocus
                                    placeholder="ABC123"
                                    maxLength={6}
                                    className="w-full px-5 py-4 text-2xl text-center tracking-[0.5em] font-mono 
                            rounded-xl bg-slate-800 border border-slate-700 text-white 
                            placeholder-slate-500 focus:outline-none focus:ring-2 
                            focus:ring-pink-500 uppercase"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-5 text-xl bg-gradient-to-r from-pink-600 to-violet-600 
                          rounded-xl font-bold shadow-lg hover:scale-[1.02] transition 
                          transform active:scale-95"
                            >
                                {isLoading ? 'Recovering...' : 'Recover Account'}
                            </button>
                        </form>

                        {/* Back Link */}
                        <div className="pt-4 border-t border-slate-700">
                            <a
                                href="/"
                                className="text-slate-400 hover:text-white text-base transition-colors"
                            >
                                ← Back to Login
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default RecoveryPage;
