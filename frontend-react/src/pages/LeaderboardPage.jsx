import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import NavigationBar from '../components/NavigationBar';

function LeaderboardPage() {
    const [leaderboard, setLeaderboard] = useState([]);
    const [globalStats, setGlobalStats] = useState({ totalAlcohol: 0, totalCocktails: 0 });
    const [eventName, setEventName] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState(null);
    const { user } = useAuth();

    useEffect(() => {
        loadLeaderboard();
    }, []);

    const loadLeaderboard = async () => {
        try {
            const [leaderboardRes, statsRes, settingsRes] = await Promise.all([
                api.getLeaderboard(),
                api.getGlobalStatistics(),
                api.getSettings()
            ]);

            // Event name
            if (settingsRes.current_event_name) {
                setEventName(settingsRes.current_event_name);
            }

            // Global stats
            setGlobalStats({
                totalAlcohol: statsRes.total_alcohol_liters || 0,
                totalCocktails: statsRes.total_cocktails_poured || 0
            });

            // Leaderboard
            setLeaderboard(leaderboardRes.users || []);
            setIsLoading(false);
        } catch (error) {
            console.error('Failed to load leaderboard:', error);
            setIsLoading(false);
        }
    };

    const showUserStats = async (userId) => {
        try {
            const stats = await api.getUserStatistics(userId);
            setSelectedUser(stats);
        } catch (error) {
            console.error('Failed to fetch user statistics:', error);
        }
    };

    const closeUserStatsModal = () => {
        setSelectedUser(null);
    };

    return (
        <div className="bg-slate-900 text-white min-h-[100dvh] flex flex-col">
            {/* Header */}
            <header className="px-4 pt-1 text-center pb-0">
                <h1 className="text-xl font-bold gradient-text-pink">MixMasterAI</h1>
            </header>
            <div className="px-4 pt-1 text-center">
                <h2 className="text-lg font-semibold text-white">
                    {eventName ? `Rating - ${eventName}` : 'Rating'}
                </h2>
            </div>

            <main className="flex-grow container mx-auto px-4 pt-4 pb-24">
                <div className="space-y-6">
                    <div className="text-center mb-6">
                        <h2 className="text-3xl font-bold text-white">🏆 Leaderboard</h2>
                        <p className="text-slate-400 text-sm">Top drinkers of the night</p>
                    </div>

                    {/* Global Stats */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="glass rounded-xl p-4 text-center">
                            <p className="text-slate-400 text-xs uppercase">Total Alcohol</p>
                            <p className="text-2xl font-bold text-pink-400">{globalStats.totalAlcohol}L</p>
                        </div>
                        <div className="glass rounded-xl p-4 text-center">
                            <p className="text-slate-400 text-xs uppercase">Total Cocktails</p>
                            <p className="text-2xl font-bold text-violet-400">{globalStats.totalCocktails}</p>
                        </div>
                    </div>

                    {/* Leaderboard List */}
                    <div className="space-y-3">
                        {isLoading ? (
                            <div className="text-center py-10">
                                <div className="spinner mx-auto"></div>
                            </div>
                        ) : leaderboard.length === 0 ? (
                            <p className="text-center text-slate-400">No data yet. Start pouring!</p>
                        ) : (
                            leaderboard.map((u, index) => {
                                const rank = index + 1;
                                const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
                                const isCurrentUser = user && u.id === user.id;

                                const bgClass = isCurrentUser
                                    ? 'bg-gradient-to-r from-pink-900/40 to-violet-900/40 border-pink-500/50 ring-2 ring-pink-500/30'
                                    : rank <= 3
                                        ? 'bg-gradient-to-r from-amber-900/30 to-yellow-900/30 border-yellow-500/30'
                                        : 'bg-slate-800/50 border-slate-700';

                                return (
                                    <div
                                        key={u.id}
                                        onClick={() => showUserStats(u.id)}
                                        className={`glass rounded-xl p-4 flex items-center gap-4 border ${bgClass} 
                               cursor-pointer hover:bg-white/5 transition-colors`}
                                    >
                                        <div className="text-2xl font-bold w-10 text-center">{medal}</div>
                                        <div className="flex-grow">
                                            <div className="flex items-center gap-2">
                                                <p className="text-white font-semibold">{u.nickname}</p>
                                                {isCurrentUser && (
                                                    <span className="text-xs bg-pink-500/30 text-pink-300 px-2 py-0.5 rounded-full font-medium">
                                                        You
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xl font-bold text-pink-400">{u.points}</p>
                                            <p className="text-xs text-slate-400">points</p>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </main>

            <NavigationBar />

            {/* User Stats Modal */}
            {selectedUser && (
                <UserStatsModal user={selectedUser} onClose={closeUserStatsModal} />
            )}
        </div>
    );
}

function UserStatsModal({ user, onClose }) {
    return (
        <div className="fixed inset-0 z-[200]">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" onClick={onClose}></div>

            <div className="absolute inset-0 flex items-center justify-center p-4">
                <div className="relative w-full max-w-md">
                    <div className="glass rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-violet-500 px-6 py-5 text-center">
                            <div className="flex items-center justify-center gap-2 mb-1">
                                <span className="text-3xl">🍸</span>
                                <h1 className="text-2xl font-bold text-white">MixMaster AI</h1>
                            </div>
                            <div className="flex items-center justify-center gap-4 text-white/90 text-sm">
                                <span className="font-semibold">{user.nickname || '--'}</span>
                                <span className="text-white/60">•</span>
                                <span className="flex items-center gap-1">
                                    <span className="text-yellow-300 font-bold">{user.points || 0}</span>
                                    <span>points</span>
                                </span>
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gradient-to-br from-pink-500/30 to-purple-500/30 rounded-2xl p-6 border border-pink-500/40 text-center">
                                    <div className="text-5xl mb-3">🍸</div>
                                    <div className="text-4xl font-black text-pink-300 mb-1">
                                        {user.total_alcohol_ml > 0 ? Math.round(user.total_alcohol_ml) : 0}
                                    </div>
                                    <p className="text-white/70 text-xs font-medium uppercase tracking-wide">ml Poured</p>
                                </div>
                                <div className="bg-gradient-to-br from-blue-500/30 to-cyan-500/30 rounded-2xl p-6 border border-blue-500/40 text-center">
                                    <div className="text-5xl mb-3">🥇</div>
                                    <div className="text-4xl font-black text-blue-300 mb-1">
                                        {user.current_rank > 0 ? `#${user.current_rank}` : '--'}
                                    </div>
                                    <p className="text-white/70 text-xs font-medium uppercase tracking-wide">Rank</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gradient-to-br from-yellow-500/30 to-orange-500/30 rounded-2xl p-6 border border-yellow-500/40 text-center">
                                    <div className="text-5xl mb-3">🏆</div>
                                    <div className="text-lg font-bold text-yellow-300 mb-1 truncate">
                                        {user.favorite_cocktail || 'None Yet'}
                                    </div>
                                    <p className="text-white/70 text-xs font-medium uppercase tracking-wide">Favorite</p>
                                </div>
                                <div className="bg-gradient-to-br from-red-500/30 to-orange-500/30 rounded-2xl p-6 border border-red-500/40 text-center">
                                    <div className="text-5xl mb-3">🔥</div>
                                    <div className="text-4xl font-black text-red-300 mb-1">
                                        {user.total_pours > 0 ? `${user.strong_mode_percentage || 0}%` : '0%'}
                                    </div>
                                    <p className="text-white/70 text-xs font-medium uppercase tracking-wide">Strong Mode</p>
                                </div>
                            </div>

                            {/* Close Button */}
                            <div className="pt-2">
                                <button
                                    onClick={onClose}
                                    className="w-full py-3 bg-white/10 hover:bg-white/20 border border-white/20 
                            rounded-xl text-white font-medium transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="bg-slate-900/50 px-6 py-3 text-center border-t border-white/5">
                            <p className="text-slate-500 text-xs">Made with ❤️ by MixMaster AI</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default LeaderboardPage;
