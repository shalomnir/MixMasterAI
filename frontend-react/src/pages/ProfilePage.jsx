import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import NavigationBar from '../components/NavigationBar';

function ProfilePage() {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [eventName, setEventName] = useState('');

    useEffect(() => {
        loadUserStats();
    }, []);

    const loadUserStats = async () => {
        try {
            const localUser = api.getUser();
            if (localUser?.id) {
                const statsRes = await api.getUserStatistics(localUser.id);
                setStats(statsRes);
            }

            // Get event name
            const settings = await api.getSettings();
            if (settings.current_event_name) {
                setEventName(settings.current_event_name);
            }
        } catch (error) {
            console.error('Failed to load stats:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleShare = async () => {
        const shareText = `🍹 My MixMasterAI Stats${eventName ? ` @ ${eventName}` : ''}

👤 ${user?.nickname || 'Guest'}
🏆 ${stats?.total_points || 0} points
🍸 ${stats?.total_cocktails || 0} cocktails
💧 ${stats?.total_alcohol_ml || 0}ml poured

#MixMasterAI`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'My MixMasterAI Stats',
                    text: shareText
                });
            } catch (e) {
                // User cancelled or error
                console.log('Share cancelled');
            }
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(shareText);
            alert('Stats copied to clipboard!');
        }
    };

    if (isLoading) {
        return (
            <div className="bg-slate-900 text-white min-h-[100dvh] flex flex-col">
                <div className="flex-1 flex items-center justify-center">
                    <div className="spinner"></div>
                </div>
                <NavigationBar />
            </div>
        );
    }

    return (
        <div className="bg-slate-900 text-white min-h-[100dvh] flex flex-col">
            {/* Header */}
            <header className="px-4 pt-4 text-center">
                <h1 className="text-xl font-bold gradient-text-pink">MixMasterAI</h1>
                {eventName && (
                    <p className="text-cyan-400 text-sm mt-1">{eventName}</p>
                )}
            </header>

            {/* Profile Card */}
            <main className="flex-1 flex items-center justify-center px-4 pb-24">
                <div className="w-full max-w-sm">
                    {/* User Avatar & Name */}
                    <div className="text-center mb-6">
                        <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-pink-500 to-violet-600 
                                       flex items-center justify-center text-5xl shadow-lg shadow-pink-500/30 mb-4">
                            👤
                        </div>
                        <h2 className="text-2xl font-bold text-white">{user?.nickname || 'Guest'}</h2>
                        <p className="text-slate-400 text-sm">Party Guest</p>
                    </div>

                    {/* Stats Card */}
                    <div className="glass rounded-2xl p-6 space-y-4">
                        {/* Points */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">🏆</span>
                                <span className="text-slate-300">Total Points</span>
                            </div>
                            <span className="text-2xl font-bold text-yellow-400">
                                {stats?.total_points || 0}
                            </span>
                        </div>

                        {/* Divider */}
                        <div className="border-t border-white/10"></div>

                        {/* Cocktails */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">🍸</span>
                                <span className="text-slate-300">Cocktails</span>
                            </div>
                            <span className="text-2xl font-bold text-pink-400">
                                {stats?.total_cocktails || 0}
                            </span>
                        </div>

                        {/* Divider */}
                        <div className="border-t border-white/10"></div>

                        {/* Volume */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">💧</span>
                                <span className="text-slate-300">Alcohol Poured</span>
                            </div>
                            <span className="text-2xl font-bold text-cyan-400">
                                {stats?.total_alcohol_ml || 0}ml
                            </span>
                        </div>

                        {/* Rank if available */}
                        {stats?.rank && (
                            <>
                                <div className="border-t border-white/10"></div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">📊</span>
                                        <span className="text-slate-300">Current Rank</span>
                                    </div>
                                    <span className="text-2xl font-bold text-emerald-400">
                                        #{stats.rank}
                                    </span>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Share Button */}
                    <button
                        onClick={handleShare}
                        className="w-full mt-6 py-4 bg-gradient-to-r from-pink-600 to-violet-600 
                                  hover:from-pink-500 hover:to-violet-500 rounded-xl font-bold text-lg
                                  shadow-lg shadow-pink-500/30 transition-all transform active:scale-95
                                  flex items-center justify-center gap-2"
                    >
                        <span>📤</span> Share My Stats
                    </button>
                </div>
            </main>

            <NavigationBar />
        </div>
    );
}

export default ProfilePage;
