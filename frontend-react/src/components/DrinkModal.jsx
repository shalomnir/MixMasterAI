import { useState, useEffect, useMemo } from 'react';

function DrinkModal({ recipe, pumpData, machineState, onClose, onPour }) {
    const [isStrong, setIsStrong] = useState(false);
    const [isTaste, setIsTaste] = useState(false);

    // Reset toggles when recipe changes
    useEffect(() => {
        setIsStrong(false);
        setIsTaste(false);
    }, [recipe]);

    const getTargetVolume = () => {
        if (isTaste) return machineState.taste_amount_ml || 30;
        switch (recipe.category) {
            case 'highball': return machineState.highball_target_vol || 90;
            case 'shot': return machineState.shot_target_vol || 40;
            default: return machineState.classic_target_vol || 110;
        }
    };

    const { points, ingredientsList } = useMemo(() => {
        if (!recipe.ingredients) return { points: 0, ingredientsList: [] };

        const targetVol = getTargetVolume();
        const originalTotal = Object.values(recipe.ingredients).reduce((sum, ml) => sum + parseFloat(ml), 0);
        if (originalTotal === 0) return { points: 0, ingredientsList: [] };

        let totalAlcoholMl = 0;
        const ingredients = [];

        for (const [pumpId, ml] of Object.entries(recipe.ingredients)) {
            const pump = pumpData[pumpId];
            const ingredientName = pump ? pump.name : `Pump ${pumpId}`;

            let scaledMl = (parseFloat(ml) / originalTotal) * targetVol;
            if (isStrong && pump?.is_alcohol) scaledMl *= 1.5;

            if (pump?.is_alcohol) {
                totalAlcoholMl += scaledMl;
            }

            ingredients.push({ name: ingredientName, amount: Math.round(scaledMl) });
        }

        let pts = Math.round(totalAlcoholMl);
        if (isStrong) pts = Math.round(pts * 2);

        return { points: pts, ingredientsList: ingredients };
    }, [recipe, pumpData, machineState, isStrong, isTaste]);

    const getPointsLabel = () => {
        if (isStrong && isTaste) return `${points} PTS (2x STRONG TASTE!)`;
        if (isStrong) return `${points} PTS (2x STRONG!)`;
        if (isTaste) return `${points} PTS (Taste)`;
        return `${points} PTS`;
    };

    const getButtonText = () => {
        if (isStrong && isTaste) return 'Strong Taste! 💪🥄';
        if (isStrong) return 'Strong Pour! 💪 (2x PTS)';
        if (isTaste) return 'Tasting Pour 🥄';
        return 'Pour This Drink';
    };

    const getButtonGradient = () => {
        if (isStrong && isTaste) return 'from-red-600 to-amber-500';
        if (isStrong) return 'from-red-600 to-orange-600';
        if (isTaste) return 'from-cyan-500 to-blue-600';
        return 'from-pink-600 to-violet-600';
    };

    const handlePour = () => {
        onPour(recipe, { isStrong, isTaste });
    };

    return (
        <div className="fixed inset-0 z-[200]">
            <div onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-md"></div>

            <div className="absolute bottom-0 left-0 right-0 md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 
                     md:max-w-lg md:bottom-auto md:rounded-3xl glass rounded-t-3xl md:rounded-b-3xl p-8 
                     transform transition-transform duration-300 flex flex-col max-h-[90vh]"
                style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 
                    flex items-center justify-center transition touch-manipulation z-10"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Header */}
                <div className="flex-shrink-0">
                    <div className="flex justify-center mb-4">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 
                           flex items-center justify-center text-4xl shadow-lg">
                            🍹
                        </div>
                    </div>
                    <h2 className="text-3xl font-bold text-center text-white mb-3">{recipe.name}</h2>

                    {recipe.description && (
                        <div className="mb-3">
                            <p className="text-slate-300 text-center text-sm italic">{recipe.description}</p>
                        </div>
                    )}

                    <div className="flex justify-center mb-4">
                        <div className="bg-violet-600 px-4 py-1 rounded-full text-sm font-bold">
                            {getPointsLabel()}
                        </div>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="overflow-y-auto flex-grow" style={{ maxHeight: '50vh' }}>
                    {/* Strong Toggle */}
                    <div className={`mb-3 p-3 bg-slate-800/50 rounded-xl border-2 transition-colors
                          ${isStrong ? 'border-amber-500' : 'border-transparent'}`}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-white font-bold text-sm">Strong Drink 💪</p>
                                <p className="text-slate-400 text-xs">50% more alcohol</p>
                            </div>
                            <button
                                onClick={() => setIsStrong(!isStrong)}
                                className={`w-16 h-8 rounded-full relative transition-all duration-300
                           ${isStrong ? 'bg-amber-500' : 'bg-slate-700'}`}
                            >
                                <div className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white transition-all duration-300
                               ${isStrong ? 'translate-x-8' : 'translate-x-0'}`} />
                            </button>
                        </div>
                    </div>

                    {/* Taste Toggle */}
                    <div className={`mb-4 p-3 bg-slate-800/50 rounded-xl border-2 transition-colors
                          ${isTaste ? 'border-cyan-500' : 'border-transparent'}`}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-white font-bold text-sm">Not Sure? Get a Taste 🥄</p>
                                <p className="text-slate-400 text-xs">Small portion</p>
                            </div>
                            <button
                                onClick={() => setIsTaste(!isTaste)}
                                className={`w-16 h-8 rounded-full relative transition-all duration-300
                           ${isTaste ? 'bg-cyan-500' : 'bg-slate-700'}`}
                            >
                                <div className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white transition-all duration-300
                               ${isTaste ? 'translate-x-8' : 'translate-x-0'}`} />
                            </button>
                        </div>
                    </div>

                    {/* Ingredients */}
                    <div className="mb-4 bg-slate-800/50 rounded-xl p-4">
                        <p className="text-slate-300 text-sm font-semibold mb-3">What's in it:</p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-white text-sm">
                            {ingredientsList.map((ing, idx) => (
                                <div key={idx} className="contents">
                                    <div className="text-left font-medium">{ing.name}</div>
                                    <div className="text-right text-slate-400">{ing.amount}ml</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Pour Button */}
                <div className="flex-shrink-0 mt-4">
                    <button
                        onClick={handlePour}
                        className={`w-full py-4 bg-gradient-to-r ${getButtonGradient()} rounded-xl 
                       font-bold text-lg shadow-lg hover:scale-[1.02] active:scale-95 
                       transition-all transform touch-manipulation text-white`}
                    >
                        {getButtonText()}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default DrinkModal;
