import { usePour } from '../hooks/usePour';
import { useNavigate } from 'react-router-dom';

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

    if (!isPouring && pouringStatus === 'idle') {
        return null;
    }

    const remainingSeconds = Math.max(
        Math.ceil(estimatedDuration - (estimatedDuration * pouringProgress / 100)),
        0
    );

    const handleClose = () => {
        resetPour();
    };

    const handleGoToRank = () => {
        resetPour();
        navigate('/leaderboard');
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[300] flex flex-col items-center justify-center text-center p-8">
            {/* Pouring State */}
            {pouringStatus === 'pouring' && (
                <div className="text-center max-w-sm mx-auto">
                    <h2 className="text-3xl font-bold text-white mb-2">Pouring...</h2>
                    <p className="text-slate-400 mb-6">Please wait while we mix your drink.</p>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-700 rounded-full h-4 mb-4 overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-pink-500 to-violet-500 rounded-full transition-all duration-100"
                            style={{ width: `${pouringProgress}%` }}
                        />
                    </div>

                    {/* Countdown Timer */}
                    <p className="text-2xl font-bold text-pink-400 mb-4">
                        {remainingSeconds}s remaining
                    </p>

                    {/* Animated Drink Icon */}
                    <div className="text-6xl animate-bounce">🍹</div>
                </div>
            )}

            {/* Success State */}
            {pouringStatus === 'success' && (
                <div className="relative text-center max-w-md mx-auto">
                    {/* Close Button */}
                    <button
                        onClick={handleClose}
                        className="absolute -top-4 -right-4 w-12 h-12 rounded-full bg-slate-800 hover:bg-slate-700 
                      flex items-center justify-center transition touch-manipulation z-10 border-2 border-white/10"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    {/* Success Icon */}
                    <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg mb-8">
                        <svg className="w-20 h-20 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>

                    <div className="mb-8 animate-fade-in-up">
                        <h2 className="text-5xl font-extrabold gradient-text-pink mb-3">Success!</h2>
                        <p className="text-2xl text-white font-light">Enjoy your drink ✨</p>
                    </div>

                    {/* Points Earned */}
                    <div className="mb-6 transform transition-all hover:scale-105 duration-300">
                        <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 shadow-xl">
                            <span className="text-3xl">🪙</span>
                            <div className="text-left">
                                <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold">Earned</p>
                                <p className="text-xl font-bold text-white">+{pointsEarned} Points</p>
                            </div>
                        </div>
                    </div>

                    {/* Go to Rank Button */}
                    <button
                        onClick={handleGoToRank}
                        className="w-full max-w-xs group relative overflow-hidden px-8 py-4 bg-gradient-to-r from-pink-600 to-violet-600 
                      rounded-2xl font-bold text-lg text-white shadow-2xl shadow-purple-500/30 
                      transition-all transform hover:scale-[1.02] active:scale-95"
                    >
                        <span className="relative z-10 flex items-center justify-center gap-2">
                            Go to Rank
                            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </span>
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    </button>
                </div>
            )}

            {/* Error State */}
            {pouringStatus === 'error' && (
                <div className="text-center">
                    <div className="w-32 h-32 mx-auto rounded-full bg-red-500 flex items-center justify-center shadow-lg mb-8">
                        <svg className="w-20 h-20 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-4">Error</h2>
                    <p className="text-red-300 mb-8">{errorMessage}</p>
                    <button
                        onClick={handleClose}
                        className="px-8 py-4 bg-gradient-to-r from-pink-600 to-violet-600 rounded-xl font-bold text-lg"
                    >
                        Close
                    </button>
                </div>
            )}
        </div>
    );
}

export default PouringStatus;
