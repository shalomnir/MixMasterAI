/**
 * MagicLinkPage — Self-contained authenticated app shell.
 *
 * The URL /u/:token IS the user's permanent identity.
 * - Auth is re-established on every page load via the token in the URL.
 * - Nothing is saved to localStorage. Session lives only while the tab is open.
 * - Navigation (Menu / Leaderboard / Profile) is driven by local state,
 *   so the URL bar never changes from /u/:token.
 */

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { usePour } from '../hooks/usePour';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import CocktailCard from '../components/CocktailCard';
import DrinkModal from '../components/DrinkModal';

// ─── Tab IDs ────────────────────────────────────────────────────────────────
const TAB_MENU = 'menu';
const TAB_LEADERBOARD = 'leaderboard';
const TAB_PROFILE = 'profile';

// ─── Root component ──────────────────────────────────────────────────────────
function MagicLinkPage() {
    const { token } = useParams();
    const [authStatus, setAuthStatus] = useState('loading'); // 'loading' | 'ok' | 'error'
    const [errorMsg, setErrorMsg] = useState('');
    const [authedUser, setAuthedUser] = useState(null);
    const [activeTab, setActiveTab] = useState(TAB_MENU);

    useEffect(() => {
        if (!token) {
            setErrorMsg('Invalid magic link — no token provided.');
            setAuthStatus('error');
            return;
        }

        // Immediately wipe any localStorage session — the URL is the only identity.
        // This prevents visiting / from auto-logging in a magic-link user.
        localStorage.removeItem('cocktail_auth_token');
        localStorage.removeItem('cocktail_user');

        let cancelled = false;

        // Re-authenticate on every visit using the URL token.
        // Stored to sessionStorage only — no localStorage.
        api.tokenLogin(token)
            .then((res) => {
                if (cancelled) return;
                if (res.status === 'success') {
                    setAuthedUser(res.user);
                    setAuthStatus('ok');
                } else {
                    setErrorMsg(res.message || 'Invalid or revoked magic link.');
                    setAuthStatus('error');
                }
            })
            .catch((err) => {
                if (cancelled) return;
                setErrorMsg(err.message || 'This magic link is invalid or has been revoked.');
                setAuthStatus('error');
            });

        return () => { cancelled = true; };
    }, [token]);

    // ── Loading ──
    if (authStatus === 'loading') {
        return (
            <div className="bg-black text-white min-h-[100dvh] flex items-center justify-center">
                <div className="text-center">
                    <div className="spinner mx-auto mb-4" />
                    <p className="text-gray-500 text-sm">Loading your experience…</p>
                </div>
            </div>
        );
    }

    // ── Error ──
    if (authStatus === 'error') {
        return (
            <div className="bg-black text-white min-h-[100dvh] flex items-center justify-center p-6">
                <div className="text-center max-w-sm">
                    <p className="text-5xl mb-4">🔗</p>
                    <h2 className="text-xl font-bold text-red-400 mb-2">Invalid Magic Link</h2>
                    <p className="text-gray-500 text-sm mb-6">{errorMsg}</p>
                    <a
                        href="/"
                        className="inline-block px-6 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-xl text-white font-medium transition"
                    >
                        Back to Login
                    </a>
                </div>
            </div>
        );
    }

    // ── Authenticated app shell ──
    return (
        <div className="bg-black text-white min-h-[100dvh] flex flex-col">
            {activeTab === TAB_MENU && <MenuView user={authedUser} />}
            {activeTab === TAB_LEADERBOARD && <LeaderboardView user={authedUser} />}
            {activeTab === TAB_PROFILE && <ProfileView user={authedUser} token={token} />}

            {/* Bottom navigation — purely state-driven, URL never changes */}
            <TokenNavBar active={activeTab} onChange={setActiveTab} />
        </div>
    );
}

// ─── Shared bottom nav (no react-router NavLink) ─────────────────────────────
function TokenNavBar({ active, onChange }) {
    return (
        <nav className="fixed bottom-0 left-0 right-0 z-[100] bottom-nav-safe
                bg-black/80 backdrop-blur-xl border-t border-[#00E5FF]/10">
            <div className="flex justify-around items-center py-1 px-6">
                {/* Profile */}
                <button
                    onClick={() => onChange(TAB_PROFILE)}
                    className={`flex flex-col items-center space-y-1 min-w-[50px] min-h-[50px] justify-center
                        active:scale-95 transition-all touch-manipulation relative
                        ${active === TAB_PROFILE ? 'text-[#00E5FF]' : 'text-gray-500'}`}
                >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition
                        ${active === TAB_PROFILE ? 'bg-[#00E5FF]/10' : 'bg-white/5'}`}>
                        👤
                    </div>
                    <span className="text-xs font-medium">Profile</span>
                    {active === TAB_PROFILE && (
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#00E5FF] rounded-full" />
                    )}
                </button>

                {/* Drinks (center raised) */}
                <button
                    onClick={() => onChange(TAB_MENU)}
                    className="flex flex-col items-center space-y-1 -mt-8 touch-manipulation relative"
                >
                    <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-lg
                        transition-all transform hover:scale-105 active:scale-95
                        bg-gradient-to-r from-cyan-500 to-[#00E5FF] shadow-[#00E5FF]/30">
                        🍹
                    </div>
                    <span className={`text-xs font-bold ${active === TAB_MENU ? 'text-[#00E5FF]' : 'text-cyan-400'}`}>
                        Drinks
                    </span>
                </button>

                {/* Leaderboard */}
                <button
                    onClick={() => onChange(TAB_LEADERBOARD)}
                    className={`flex flex-col items-center space-y-1 min-w-[50px] min-h-[50px] justify-center
                        active:scale-95 transition-all touch-manipulation relative
                        ${active === TAB_LEADERBOARD ? 'text-[#00E5FF]' : 'text-gray-500'}`}
                >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition
                        ${active === TAB_LEADERBOARD ? 'bg-[#00E5FF]/10' : 'bg-white/5'}`}>
                        🏆
                    </div>
                    <span className="text-xs font-medium">Ranks</span>
                    {active === TAB_LEADERBOARD && (
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#00E5FF] rounded-full" />
                    )}
                </button>
            </div>
        </nav>
    );
}

// ─── Menu view ───────────────────────────────────────────────────────────────
const CATEGORY_TABS = [
    { key: 'all', label: 'All' },
    { key: 'classic', label: 'Classics' },
    { key: 'highball', label: 'Highballs' },
    { key: 'shot', label: 'Shots' },
];

const SPIRIT_FILTERS = [
    { key: 'all', label: 'All Spirits' },
    { key: 'vodka', label: 'Vodka' },
    { key: 'gin', label: 'Gin' },
    { key: 'tequila', label: 'Tequila' },
    { key: 'rum', label: 'Rum' },
];

function MenuView({ user }) {
    const [recipes, setRecipes] = useState({ classic: [], highball: [], shot: [] });
    const [pumpData, setPumpData] = useState({});
    const [machineState, setMachineState] = useState({});
    const [eventName, setEventName] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedRecipe, setSelectedRecipe] = useState(null);
    const [activeCategory, setActiveCategory] = useState('all');
    const [activeSpirit, setActiveSpirit] = useState('all');
    const [isFading, setIsFading] = useState(false);
    const { startPour } = usePour();
    const { showHighball, showError } = useToast();

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const [pumpsRes, recipesRes, settingsRes] = await Promise.all([
                api.getPumps(),
                api.getRecipes(),
                api.getSettings(),
            ]);

            const pumps = {};
            if (pumpsRes.pumps) {
                const pd = pumpsRes.pumps;
                if (Array.isArray(pd)) {
                    pd.forEach(p => { pumps[p.id] = p; });
                } else {
                    Object.entries(pd).forEach(([id, p]) => { pumps[id] = { ...p, id: parseInt(id) }; });
                }
            }
            setPumpData(pumps);
            setMachineState({
                classic_target_vol: pumpsRes.classic_target_vol || 110,
                highball_target_vol: pumpsRes.highball_target_vol || 90,
                shot_target_vol: pumpsRes.shot_target_vol || 40,
                taste_amount_ml: pumpsRes.taste_amount_ml || 30,
            });
            if (settingsRes.current_event_name) setEventName(settingsRes.current_event_name);
            setRecipes({
                classic: recipesRes.classic_cocktails || [],
                highball: recipesRes.highballs || [],
                shot: recipesRes.shots || [],
            });
            setIsLoading(false);
        } catch (err) {
            setError(err.isServerDown
                ? '⚠️ Server is offline. Please ensure the backend is running.'
                : 'Failed to load menu. Please refresh.');
            setIsLoading(false);
        }
    };

    const spiritPumpIds = useMemo(() => {
        const map = { vodka: [], gin: [], tequila: [], rum: [] };
        for (const [id, pump] of Object.entries(pumpData)) {
            const n = (pump.ingredient_name || '').toLowerCase();
            if (n.includes('vodka')) map.vodka.push(id);
            else if (n.includes('gin')) map.gin.push(id);
            else if (n.includes('tequila')) map.tequila.push(id);
            else if (n.includes('rum')) map.rum.push(id);
        }
        return map;
    }, [pumpData]);

    const filteredRecipes = useMemo(() => {
        let pool = activeCategory === 'all'
            ? [...recipes.classic, ...recipes.highball, ...recipes.shot]
            : (recipes[activeCategory] || []);
        if (activeSpirit !== 'all') {
            const ids = spiritPumpIds[activeSpirit] || [];
            pool = ids.length
                ? pool.filter(r => ids.some(id => (r.ingredients || {})[id] > 0))
                : [];
        }
        return pool;
    }, [recipes, activeCategory, activeSpirit, spiritPumpIds]);

    const switchCategory = (key) => {
        if (key === activeCategory) return;
        setIsFading(true);
        setTimeout(() => { setActiveCategory(key); setIsFading(false); }, 150);
    };

    const switchSpirit = (key) => {
        if (key === activeSpirit) return;
        setIsFading(true);
        setTimeout(() => { setActiveSpirit(key); setIsFading(false); }, 150);
    };

    const handlePour = async (recipe, options) => {
        setSelectedRecipe(null);
        const result = await startPour(recipe, options, pumpData, machineState);
        if (result.success && result.response.is_highball) {
            setTimeout(() => showHighball(), 1500);
        }
    };

    if (isLoading) return (
        <div className="flex-1 flex items-center justify-center">
            <div className="text-center py-20">
                <div className="spinner mx-auto mb-4" />
                <p className="text-gray-500">Loading drinks…</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="flex-1 flex items-center justify-center">
            <div className="text-center py-20">
                <p className="text-red-400 text-lg mb-4">{error}</p>
                <button onClick={() => { setError(null); setIsLoading(true); loadData(); }}
                    className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg transition">Retry</button>
            </div>
        </div>
    );

    return (
        <>
            <header className="px-4 pt-3 pb-1 text-center">
                <h1 className="text-xl font-bold gradient-text-cyan">MixMasterAI</h1>
                {eventName && <p className="text-sm text-gray-500 mt-0.5">{eventName}</p>}
            </header>

            {/* Category tabs */}
            <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/5">
                <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide">
                    {CATEGORY_TABS.map(tab => (
                        <button key={tab.key} onClick={() => switchCategory(tab.key)}
                            className={`flex-shrink-0 px-5 py-2 rounded-full text-sm font-semibold
                                transition-all duration-200 touch-manipulation whitespace-nowrap
                                ${activeCategory === tab.key
                                    ? 'bg-[#00E5FF] text-black shadow-lg shadow-[#00E5FF]/30'
                                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5'}`}>
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Spirit filter */}
            <div className="bg-black/60 backdrop-blur-sm border-b border-white/[0.03]">
                <div className="flex gap-2 px-4 py-2 overflow-x-auto scrollbar-hide">
                    {SPIRIT_FILTERS.map(filter => (
                        <button key={filter.key} onClick={() => switchSpirit(filter.key)}
                            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium
                                transition-all duration-200 touch-manipulation whitespace-nowrap
                                ${activeSpirit === filter.key
                                    ? 'bg-white/10 text-[#00E5FF] border border-[#00E5FF]/30'
                                    : 'text-gray-500 hover:text-gray-300 border border-transparent'}`}>
                            {filter.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid */}
            <main className="flex-grow container mx-auto px-4 pt-4 pb-24">
                <div className={`grid grid-cols-2 gap-4 transition-opacity duration-150 ${isFading ? 'opacity-0' : 'opacity-100'}`}>
                    {filteredRecipes.map(recipe => (
                        <CocktailCard key={recipe.id} recipe={recipe} onClick={setSelectedRecipe} />
                    ))}
                </div>
                {filteredRecipes.length === 0 && (
                    <div className="text-center py-20">
                        <p className="text-gray-500 text-sm">No cocktails match this filter.</p>
                    </div>
                )}
            </main>

            {selectedRecipe && (
                <DrinkModal
                    recipe={selectedRecipe}
                    pumpData={pumpData}
                    machineState={machineState}
                    onClose={() => setSelectedRecipe(null)}
                    onPour={handlePour}
                />
            )}
        </>
    );
}

// ─── Leaderboard view ─────────────────────────────────────────────────────────
function LeaderboardView({ user }) {
    const [leaderboard, setLeaderboard] = useState([]);
    const [globalStats, setGlobalStats] = useState({ totalAlcohol: 0, totalCocktails: 0 });
    const [eventName, setEventName] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState(null);

    useEffect(() => {
        Promise.all([api.getLeaderboard(), api.getGlobalStatistics(), api.getSettings()])
            .then(([lb, stats, settings]) => {
                if (settings.current_event_name) setEventName(settings.current_event_name);
                setGlobalStats({
                    totalAlcohol: stats.total_alcohol_liters || 0,
                    totalCocktails: stats.total_cocktails_poured || 0,
                });
                setLeaderboard(lb.users || []);
            })
            .catch(console.error)
            .finally(() => setIsLoading(false));
    }, []);

    const showUserStats = async (userId) => {
        try { setSelectedUser(await api.getUserStatistics(userId)); } catch { /* ignore */ }
    };

    return (
        <>
            <header className="px-4 pt-3 text-center pb-1">
                <h1 className="text-xl font-bold gradient-text-cyan">MixMasterAI</h1>
                {eventName && <p className="text-sm text-gray-500 mt-0.5">{eventName}</p>}
            </header>

            <main className="flex-grow container mx-auto px-4 pt-4 pb-24 space-y-6">
                <div className="text-center mb-4">
                    <h2 className="text-2xl font-bold text-white">Leaderboard</h2>
                    <p className="text-gray-500 text-sm">Top drinkers of the night</p>
                </div>

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

                <div className="space-y-3">
                    {isLoading ? (
                        <div className="text-center py-10"><div className="spinner mx-auto" /></div>
                    ) : leaderboard.length === 0 ? (
                        <p className="text-center text-gray-500">No data yet. Start pouring!</p>
                    ) : leaderboard.map((u, index) => {
                        const rank = index + 1;
                        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
                        const isMe = user && u.id === user.id;
                        return (
                            <div key={u.id} onClick={() => showUserStats(u.id)}
                                className={`rounded-2xl p-4 flex items-center gap-4 border cursor-pointer
                                    hover:bg-white/5 transition-colors
                                    ${isMe ? 'bg-[#00E5FF]/5 border-[#00E5FF]/30 ring-1 ring-[#00E5FF]/20'
                                        : rank <= 3 ? 'bg-white/[0.03] border-amber-500/20'
                                            : 'bg-white/[0.02] border-white/5'}`}>
                                <div className="text-2xl font-bold w-10 text-center">{medal}</div>
                                <div className="flex-grow">
                                    <div className="flex items-center gap-2">
                                        <p className="text-white font-semibold">{u.nickname}</p>
                                        {isMe && (
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
                    })}
                </div>
            </main>

            {selectedUser && (
                <UserStatsModal user={selectedUser} onClose={() => setSelectedUser(null)} />
            )}
        </>
    );
}

function UserStatsModal({ user, onClose }) {
    return (
        <div className="fixed inset-0 z-[200]">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={onClose} />
            <div className="absolute inset-0 flex items-center justify-center p-4">
                <div className="relative w-full max-w-md">
                    <div className="bg-black rounded-3xl border border-[#00E5FF]/15 overflow-hidden shadow-2xl shadow-[#00E5FF]/5">
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
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/[0.03] border border-[#00E5FF]/10 rounded-2xl p-5 text-center">
                                    <div className="text-4xl mb-2">🍸</div>
                                    <div className="text-3xl font-black text-[#00E5FF] mb-1">{Math.round(user.total_alcohol_ml || 0)}</div>
                                    <p className="text-gray-500 text-xs uppercase tracking-wide">ml Poured</p>
                                </div>
                                <div className="bg-white/[0.03] border border-[#00E5FF]/10 rounded-2xl p-5 text-center">
                                    <div className="text-4xl mb-2">🥇</div>
                                    <div className="text-3xl font-black text-[#00E5FF] mb-1">{user.current_rank > 0 ? `#${user.current_rank}` : '--'}</div>
                                    <p className="text-gray-500 text-xs uppercase tracking-wide">Rank</p>
                                </div>
                            </div>
                            <button onClick={onClose}
                                className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-medium transition-colors">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Profile view ─────────────────────────────────────────────────────────────
function ProfileView({ user, token }) {
    const [stats, setStats] = useState(null);
    const [eventName, setEventName] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const { showSuccess } = useToast();

    useEffect(() => {
        const localUser = api.getUser();
        const uid = localUser?.id || user?.id;
        Promise.all([
            uid ? api.getUserStatistics(uid) : Promise.resolve(null),
            api.getSettings(),
        ]).then(([statsRes, settings]) => {
            if (statsRes) setStats(statsRes);
            if (settings.current_event_name) setEventName(settings.current_event_name);
        }).catch(console.error).finally(() => setIsLoading(false));
    }, [user]);

    const magicLink = `${window.location.origin}/u/${token}`;

    const handleShare = async () => {
        const shareText = `🍹 My MixMasterAI Stats${eventName ? ` @ ${eventName}` : ''}\n\n👤 ${stats?.nickname || user?.nickname || 'Guest'}\n🏆 ${stats?.points || 0} points\n🍸 ${stats?.total_pours || 0} cocktails\n💧 ${Math.round(stats?.total_alcohol_ml || 0)}ml poured\n\n#MixMasterAI`;
        if (navigator.share) {
            try { await navigator.share({ title: 'My MixMasterAI Stats', text: shareText }); } catch { /* cancelled */ }
        } else {
            navigator.clipboard.writeText(shareText);
        }
    };

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(magicLink);
            showSuccess('Magic link copied!');
        } catch { /* ignore */ }
    };

    if (isLoading) return (
        <div className="flex-1 flex items-center justify-center">
            <div className="spinner" />
        </div>
    );

    return (
        <>
            <header className="px-4 pt-3 text-center pb-1">
                <h1 className="text-xl font-bold gradient-text-cyan">MixMasterAI</h1>
                {eventName && <p className="text-sm text-gray-500 mt-0.5">{eventName}</p>}
            </header>

            <main className="flex-1 flex items-center justify-center px-4 pb-24">
                <div className="w-full max-w-sm space-y-4">
                    {/* Avatar */}
                    <div className="text-center mb-6">
                        <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-cyan-500 to-[#00E5FF]
                            flex items-center justify-center text-5xl shadow-lg shadow-[#00E5FF]/30 mb-4">
                            👤
                        </div>
                        <h2 className="text-2xl font-bold text-white">{user?.nickname || 'Guest'}</h2>
                        <p className="text-gray-500 text-sm">Party Guest</p>
                    </div>

                    {/* Stats */}
                    <div className="bg-white/[0.03] border border-[#00E5FF]/10 rounded-3xl p-6 space-y-4">
                        {[
                            { icon: '🏆', label: 'Total Points', value: stats?.points || 0 },
                            { icon: '🍸', label: 'Cocktails', value: stats?.total_pours || 0 },
                            { icon: '💧', label: 'Alcohol Poured', value: `${stats?.total_alcohol_ml || 0}ml` },
                            stats?.current_rank > 0 && { icon: '📊', label: 'Current Rank', value: `#${stats.current_rank}` },
                        ].filter(Boolean).map((row, i, arr) => (
                            <div key={row.label}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">{row.icon}</span>
                                        <span className="text-gray-400">{row.label}</span>
                                    </div>
                                    <span className="text-2xl font-bold text-[#00E5FF]">{row.value}</span>
                                </div>
                                {i < arr.length - 1 && <div className="border-t border-white/5 mt-4" />}
                            </div>
                        ))}
                    </div>

                    {/* Your magic link */}
                    <div className="bg-white/[0.03] border border-[#00E5FF]/10 rounded-2xl p-4">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Your Magic Link</p>
                        <p className="text-xs text-gray-400 font-mono truncate mb-3">{magicLink}</p>
                        <button onClick={handleCopyLink}
                            className="w-full py-2.5 bg-[#00E5FF]/10 hover:bg-[#00E5FF]/20 border border-[#00E5FF]/30
                                text-[#00E5FF] rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2">
                            📋 Copy My Link
                        </button>
                    </div>

                    {/* Share */}
                    <button onClick={handleShare}
                        className="w-full py-4 bg-gradient-to-r from-cyan-500 to-[#00E5FF] text-black
                            hover:brightness-110 rounded-2xl font-bold text-lg
                            shadow-lg shadow-[#00E5FF]/30 transition-all transform active:scale-95
                            flex items-center justify-center gap-2">
                        <span>📤</span> Share My Stats
                    </button>
                </div>
            </main>
        </>
    );
}

export default MagicLinkPage;
