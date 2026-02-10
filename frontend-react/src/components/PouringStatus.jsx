import { useState, useEffect } from 'react';
import { usePour } from '../hooks/usePour';
import { useNavigate } from 'react-router-dom';
import { resolveImage, PLACEHOLDER_IMG } from '../utils/cocktailImages';
import api from '../services/api';

function PouringStatus() {
    const {
        isPouring,
        pouringProgress,
        pouringStatus,
        currentDrink,
        estimatedDuration,
        errorMessage,
        pointsEarned,
        resetPour
    } = usePour();
    const navigate = useNavigate();

    const [leaderboardData, setLeaderboardData] = useState(null);
    const [isVisible, setIsVisible] = useState(false);
    const [imgSrc, setImgSrc] = useState(PLACEHOLDER_IMG);

    // Load leaderboard data when pour succeeds
    useEffect(() => {
        if (pouringStatus === 'success') {
            loadLeaderboardPosition();
            setIsVisible(true);
        } else if (pouringStatus === 'pouring') {
            setIsVisible(true);
            setLeaderboardData(null);
        } else {
            setIsVisible(false);
        }
    }, [pouringStatus]);

    // Resolve hero image
    useEffect(() => {
        if (currentDrink) {
            setImgSrc(resolveImage(currentDrink));
        }
    }, [currentDrink]);

    const loadLeaderboardPosition = async () => {
        try {
            const localUser = api.getUser();
            if (!localUser?.id) return;

            const [leaderboardRes, userStats] = await Promise.all([
                api.getLeaderboard(),
                api.getUserStatistics(localUser.id)
            ]);

            const users = leaderboardRes.users || [];
            const myRank = userStats.current_rank || 0;
            const myPoints = userStats.points || 0;

            let userAbove = null;
            let pointsBehind = 0;

            if (myRank > 1 && users.length >= myRank - 1) {
                userAbove = users[myRank - 2]; // 0-indexed, person above is rank-2
                pointsBehind = (userAbove?.points || 0) - myPoints;
            }

            setLeaderboardData({
                rank: myRank,
                totalPlayers: users.length,
                userAbove: userAbove?.nickname || null,
                pointsBehind: Math.max(pointsBehind, 0),
            });
        } catch (err) {
            console.error('Failed to load leaderboard position:', err);
        }
    };

    if (!isPouring && pouringStatus === 'idle') {
        return null;
    }

    const remainingSeconds = Math.max(
        Math.ceil(estimatedDuration - (estimatedDuration * pouringProgress / 100)),
        0
    );

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(resetPour, 200);
    };

    const handleGoToRank = () => {
        setIsVisible(false);
        setTimeout(() => {
            resetPour();
            navigate('/leaderboard');
        }, 200);
    };

    return (
        <div className={`fixed inset-0 bg-black/95 backdrop-blur-sm z-[300] flex flex-col items-center justify-center text-center p-6
            transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>

            {/* ─── Pouring State ─── */}
            {pouringStatus === 'pouring' && (
                <div className="text-center max-w-sm mx-auto">
                    <h2 className="text-3xl font-bold text-white mb-2">Pouring...</h2>
                    <p className="text-gray-500 mb-6">Please wait while we mix your drink.</p>

                    {/* Progress Bar */}
                    <div className="w-full bg-white/5 rounded-full h-3 mb-4 overflow-hidden border border-white/5">
                        <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-[#00E5FF] rounded-full transition-all duration-100"
                            style={{ width: `${pouringProgress}%` }}
                        />
                    </div>

                    {/* Countdown Timer */}
                    <p className="text-2xl font-bold text-[#00E5FF] mb-6">
                        {remainingSeconds}s remaining
                    </p>

                    {/* Drink Emoji */}
                    <div className="text-6xl animate-bounce">🍹</div>
                </div>
            )}

            {/* ─── Success State (Gamification) ─── */}
            {pouringStatus === 'success' && (
                <div className="relative w-full max-w-sm mx-auto">
                    {/* Close */}
                    <button
                        onClick={handleClose}
                        className="absolute -top-2 right-0 w-10 h-10 rounded-full bg-white/5 border border-white/10
                             flex items-center justify-center transition hover:bg-white/10 z-10"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    {/* Hero Image */}
                    <div className="w-36 h-36 mx-auto rounded-full overflow-hidden border-4 border-[#00E5FF]/30 
                         shadow-[0_0_40px_rgba(0,229,255,0.3)] mb-6">
                        <img
                            src={imgSrc}
                            alt={currentDrink?.name}
                            onError={() => setImgSrc(PLACEHOLDER_IMG)}
                            className="w-full h-full object-cover"
                        />
                    </div>

                    {/* Enjoy text */}
                    <div className="mb-6">
                        <h2 className="text-4xl font-extrabold gradient-text-cyan mb-2">Cheers!</h2>
                        <p className="text-xl text-white font-light">
                            Enjoy your <span className="font-semibold text-[#00E5FF]">{currentDrink?.name}</span> ✨
                        </p>
                    </div>

                    {/* Points Earned */}
                    <div className="mb-5">
                        <div className="inline-flex items-center gap-3 bg-white/[0.03] backdrop-blur-md 
                             px-6 py-3 rounded-2xl border border-[#00E5FF]/15 shadow-lg shadow-[#00E5FF]/5">
                            <span className="text-3xl">🪙</span>
                            <div className="text-left">
                                <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Earned</p>
                                <p className="text-xl font-bold text-white">+{pointsEarned} Points</p>
                            </div>
                        </div>
                    </div>

                    {/* Rank & Gamification */}
                    {leaderboardData && (
                        <div className="mb-6 space-y-2">
                            <div className="bg-white/[0.03] border border-[#00E5FF]/10 rounded-2xl px-5 py-3">
                                <p className="text-sm text-gray-400">
                                    You are in <span className="text-[#00E5FF] font-bold text-lg">#{leaderboardData.rank}</span> place
                                    {leaderboardData.totalPlayers > 0 && (
                                        <span className="text-gray-600"> of {leaderboardData.totalPlayers}</span>
                                    )}
                                </p>
                            </div>
                            {leaderboardData.userAbove && leaderboardData.pointsBehind > 0 && (
                                <div className="bg-white/[0.03] border border-amber-500/10 rounded-2xl px-5 py-3">
                                    <p className="text-sm text-gray-400">
                                        Only <span className="text-amber-400 font-bold">{leaderboardData.pointsBehind}</span> points behind{' '}
                                        <span className="text-white font-semibold">{leaderboardData.userAbove}</span>!
                                    </p>
                                </div>
                            )}
                            {leaderboardData.rank === 1 && (
                                <div className="bg-white/[0.03] border border-amber-500/10 rounded-2xl px-5 py-3">
                                    <p className="text-sm text-amber-400 font-semibold">
                                        🏆 You're in the lead!
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Go to Rank Button */}
                    <button
                        onClick={handleGoToRank}
                        className="w-full max-w-xs mx-auto group relative overflow-hidden px-8 py-4 
                             bg-gradient-to-r from-cyan-500 to-[#00E5FF] 
                             rounded-2xl font-bold text-base text-black shadow-lg shadow-[#00E5FF]/30
                             transition-all transform hover:scale-[1.02] active:scale-95"
                    >
                        <span className="relative z-10 flex items-center justify-center gap-2">
                            View Leaderboard
                            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </span>
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    </button>
                </div>
            )}

            {/* ─── Error State ─── */}
            {pouringStatus === 'error' && (
                <div className="text-center">
                    <div className="w-28 h-28 mx-auto rounded-full bg-red-500/20 border border-red-500/30 
                         flex items-center justify-center mb-6">
                        <svg className="w-16 h-16 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-4">Error</h2>
                    <p className="text-red-300 mb-8">{errorMessage}</p>
                    <button
                        onClick={handleClose}
                        className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-[#00E5FF] text-black rounded-2xl font-bold text-lg"
                    >
                        Close
                    </button>
                </div>
            )}
        </div>
    );
}

export default PouringStatus;
