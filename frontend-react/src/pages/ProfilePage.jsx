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

👤 ${stats?.nickname || user?.nickname || 'Guest'}
🏆 ${stats?.points || 0} points
🍸 ${stats?.total_pours || 0} cocktails
💧 ${Math.round(stats?.total_alcohol_ml || 0)}ml poured

#MixMasterAI`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'My MixMasterAI Stats',
                    text: shareText
                });
            } catch (e) {
                console.log('Share cancelled');
            }
        } else {
            navigator.clipboard.writeText(shareText);
            alert('Stats copied to clipboard!');
        }
    };

    if (isLoading) {
        return (
            <div className="bg-black text-white min-h-[100dvh] flex flex-col">
                <div className="flex-1 flex items-center justify-center">
                    <div className="spinner"></div>
                </div>
                <NavigationBar />
            </div>
        );
    }

    return (
        <div className="bg-black text-white min-h-[100dvh] flex flex-col">
            {/* Header */}
            <header className="px-4 pt-3 text-center pb-1">
                <h1 className="text-xl font-bold gradient-text-cyan">MixMasterAI</h1>
                {eventName && <p className="text-sm text-gray-500 mt-0.5">{eventName}</p>}
            </header>

            {/* Profile Card */}
            <main className="flex-1 flex items-center justify-center px-4 pb-24">
                <div className="w-full max-w-sm">
                    {/* User Avatar & Name */}
                    <div className="text-center mb-6">
                        <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-cyan-500 to-[#00E5FF] 
                                       flex items-center justify-center text-5xl shadow-lg shadow-[#00E5FF]/30 mb-4">
                            👤
                        </div>
                        <h2 className="text-2xl font-bold text-white">{user?.nickname || 'Guest'}</h2>
                        <p className="text-gray-500 text-sm">Party Guest</p>
                    </div>

                    {/* Stats Card */}
                    <div className="bg-white/[0.03] border border-[#00E5FF]/10 rounded-3xl p-6 space-y-4">
                        {/* Points */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">🏆</span>
                                <span className="text-gray-400">Total Points</span>
                            </div>
                            <span className="text-2xl font-bold text-[#00E5FF]">
                                {stats?.points || 0}
                            </span>
                        </div>

                        <div className="border-t border-white/5"></div>

                        {/* Cocktails */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">🍸</span>
                                <span className="text-gray-400">Cocktails</span>
                            </div>
                            <span className="text-2xl font-bold text-[#00E5FF]">
                                {stats?.total_pours || 0}
                            </span>
                        </div>

                        <div className="border-t border-white/5"></div>

                        {/* Volume */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">💧</span>
                                <span className="text-gray-400">Alcohol Poured</span>
                            </div>
                            <span className="text-2xl font-bold text-[#00E5FF]">
                                {stats?.total_alcohol_ml || 0}ml
                            </span>
                        </div>

                        {/* Rank */}
                        {stats?.current_rank > 0 && (
                            <>
                                <div className="border-t border-white/5"></div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">📊</span>
                                        <span className="text-gray-400">Current Rank</span>
                                    </div>
                                    <span className="text-2xl font-bold text-[#00E5FF]">
                                        #{stats.current_rank}
                                    </span>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Share Button */}
                    <button
                        onClick={handleShare}
                        className="w-full mt-6 py-4 bg-gradient-to-r from-cyan-500 to-[#00E5FF] text-black
                                  hover:brightness-110 rounded-2xl font-bold text-lg
                                  shadow-lg shadow-[#00E5FF]/30 transition-all transform active:scale-95
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
