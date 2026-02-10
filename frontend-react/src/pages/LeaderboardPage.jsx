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

            if (settingsRes.current_event_name) {
                setEventName(settingsRes.current_event_name);
            }

            setGlobalStats({
                totalAlcohol: statsRes.total_alcohol_liters || 0,
                totalCocktails: statsRes.total_cocktails_poured || 0
            });

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
        <div className="bg-black text-white min-h-[100dvh] flex flex-col">
            {/* Header */}
            <header className="px-4 pt-3 text-center pb-1">
                <h1 className="text-xl font-bold gradient-text-cyan">MixMasterAI</h1>
                {eventName && <p className="text-sm text-gray-500 mt-0.5">{eventName}</p>}
            </header>

            <main className="flex-grow container mx-auto px-4 pt-4 pb-24">
                <div className="space-y-6">
                    <div className="text-center mb-4">
                        <h2 className="text-2xl font-bold text-white">Leaderboard</h2>
                        <p className="text-gray-500 text-sm">Top drinkers of the night</p>
                    </div>

                    {/* Global Stats */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-white/[0.03] border border-[#00E5FF]/10 rounded-3xl p-4 text-center">
                            <p className="text-gray-500 text-xs uppercase tracking-wider">Total Alcohol</p>
                            <p className="text-2xl font-bold text-[#00E5FF]">{globalStats.totalAlcohol}L</p>
                        </div>
                        <div className="bg-white/[0.03] border border-[#00E5FF]/10 rounded-3xl p-4 text-center">
                            <p className="text-gray-500 text-xs uppercase tracking-wider">Total Cocktails</p>
                            <p className="text-2xl font-bold text-[#00E5FF]">{globalStats.totalCocktails}</p>
                        </div>
                    </div>

                    {/* Leaderboard List */}
                    <div className="space-y-3">
                        {isLoading ? (
                            <div className="text-center py-10">
                                <div className="spinner mx-auto"></div>
                            </div>
                        ) : leaderboard.length === 0 ? (
                            <p className="text-center text-gray-500">No data yet. Start pouring!</p>
                        ) : (
                            leaderboard.map((u, index) => {
                                const rank = index + 1;
                                const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
                                const isCurrentUser = user && u.id === user.id;

                                const bgClass = isCurrentUser
                                    ? 'bg-[#00E5FF]/5 border-[#00E5FF]/30 ring-1 ring-[#00E5FF]/20'
                                    : rank <= 3
                                        ? 'bg-white/[0.03] border-amber-500/20'
                                        : 'bg-white/[0.02] border-white/5';

                                return (
                                    <div
                                        key={u.id}
                                        onClick={() => showUserStats(u.id)}
                                        className={`rounded-2xl p-4 flex items-center gap-4 border ${bgClass} 
                                       cursor-pointer hover:bg-white/5 transition-colors`}
                                    >
                                        <div className="text-2xl font-bold w-10 text-center">{medal}</div>
                                        <div className="flex-grow">
                                            <div className="flex items-center gap-2">
                                                <p className="text-white font-semibold">{u.nickname}</p>
                                                {isCurrentUser && (
                                                    <span className="text-xs bg-[#00E5FF]/20 text-[#00E5FF] px-2 py-0.5 rounded-full font-medium">
                                                        You
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xl font-bold text-[#00E5FF]">{u.points}</p>
                                            <p className="text-xs text-gray-500">points</p>
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
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={onClose}></div>

            <div className="absolute inset-0 flex items-center justify-center p-4">
                <div className="relative w-full max-w-md">
                    <div className="bg-black rounded-3xl border border-[#00E5FF]/15 overflow-hidden shadow-2xl shadow-[#00E5FF]/5">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-cyan-600 to-[#00E5FF] px-6 py-5 text-center">
                            <h1 className="text-2xl font-bold text-black mb-1">MixMaster AI</h1>
                            <div className="flex items-center justify-center gap-4 text-black/70 text-sm">
                                <span className="font-semibold">{user.nickname || '--'}</span>
                                <span className="text-black/40">•</span>
                                <span className="flex items-center gap-1">
                                    <span className="font-bold">{user.points || 0}</span>
                                    <span>points</span>
                                </span>
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/[0.03] border border-[#00E5FF]/10 rounded-2xl p-5 text-center">
                                    <div className="text-4xl mb-2">🍸</div>
                                    <div className="text-3xl font-black text-[#00E5FF] mb-1">
                                        {user.total_alcohol_ml > 0 ? Math.round(user.total_alcohol_ml) : 0}
                                    </div>
                                    <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">ml Poured</p>
                                </div>
                                <div className="bg-white/[0.03] border border-[#00E5FF]/10 rounded-2xl p-5 text-center">
                                    <div className="text-4xl mb-2">🥇</div>
                                    <div className="text-3xl font-black text-[#00E5FF] mb-1">
                                        {user.current_rank > 0 ? `#${user.current_rank}` : '--'}
                                    </div>
                                    <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">Rank</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/[0.03] border border-amber-500/10 rounded-2xl p-5 text-center">
                                    <div className="text-4xl mb-2">🏆</div>
                                    <div className="text-lg font-bold text-amber-400 mb-1 truncate">
                                        {user.favorite_cocktail || 'None Yet'}
                                    </div>
                                    <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">Favorite</p>
                                </div>
                                <div className="bg-white/[0.03] border border-red-500/10 rounded-2xl p-5 text-center">
                                    <div className="text-4xl mb-2">🔥</div>
                                    <div className="text-3xl font-black text-red-400 mb-1">
                                        {user.total_pours > 0 ? `${user.strong_mode_percentage || 0}%` : '0%'}
                                    </div>
                                    <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">Strong Mode</p>
                                </div>
                            </div>

                            {/* Close Button */}
                            <div className="pt-2">
                                <button
                                    onClick={onClose}
                                    className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 
                                        rounded-xl text-white font-medium transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default LeaderboardPage;
