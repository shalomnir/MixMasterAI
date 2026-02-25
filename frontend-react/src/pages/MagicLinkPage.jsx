import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

/**
 * MagicLinkPage — handles /u/:token routes.
 * Immediately exchanges the personal_token for a JWT session and
 * redirects the user to /menu. No user interaction needed.
 */
function MagicLinkPage() {
    const { token } = useParams();
    const navigate = useNavigate();
    const [error, setError] = useState('');

    useEffect(() => {
        if (!token) {
            setError('Invalid magic link — no token provided.');
            return;
        }

        let cancelled = false;

        api.tokenLogin(token)
            .then(() => {
                if (!cancelled) navigate('/menu', { replace: true });
            })
            .catch((err) => {
                if (!cancelled) setError(err.message || 'This magic link is invalid or has been revoked.');
            });

        return () => { cancelled = true; };
    }, [token, navigate]);

    return (
        <div className="bg-slate-900 text-white min-h-[100dvh] flex items-center justify-center p-4">
            <div className="glass rounded-3xl p-10 md:p-14 max-w-lg w-full border border-white/10 shadow-2xl text-center space-y-6">

                {error ? (
                    /* ─── Error State ─── */
                    <>
                        <div className="text-5xl">🔗</div>
                        <h1 className="text-3xl font-extrabold gradient-text-pink">
                            Invalid Magic Link
                        </h1>
                        <p className="text-slate-400 text-base">{error}</p>
                        <a
                            href="/"
                            className="inline-block mt-4 px-8 py-3 rounded-xl bg-gradient-to-r
                                       from-pink-600 to-violet-600 font-bold text-white
                                       hover:scale-[1.02] active:scale-95 transition-transform"
                        >
                            Back to Login
                        </a>
                    </>
                ) : (
                    /* ─── Loading State ─── */
                    <>
                        <div className="flex justify-center">
                            <div className="w-14 h-14 rounded-full border-4 border-cyan-500 border-t-transparent
                                            animate-spin" />
                        </div>
                        <h1 className="text-3xl font-extrabold gradient-text">
                            Signing you in…
                        </h1>
                        <p className="text-slate-400 text-base">
                            Please wait while we verify your magic link.
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}

export default MagicLinkPage;
