import { useState, useEffect, useMemo } from 'react';
import { resolveImage, PLACEHOLDER_IMG } from '../utils/cocktailImages';

function DrinkModal({ recipe, pumpData, machineState, onClose, onPour }) {
    const [isStrong, setIsStrong] = useState(false);
    const [isTaste, setIsTaste] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    const [imgSrc, setImgSrc] = useState(() => resolveImage(recipe));
    const handleImageError = () => {
        if (imgSrc !== PLACEHOLDER_IMG) setImgSrc(PLACEHOLDER_IMG);
    };

    // Entrance animation
    useEffect(() => {
        requestAnimationFrame(() => setIsVisible(true));
    }, []);

    // Reset toggles when recipe changes
    useEffect(() => {
        setIsStrong(false);
        setIsTaste(false);
        setImgSrc(resolveImage(recipe));
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
        if (isStrong && isTaste) return `${points} PTS (2× STRONG TASTE)`;
        if (isStrong) return `${points} PTS (2× STRONG)`;
        if (isTaste) return `${points} PTS (Taste)`;
        return `${points} PTS`;
    };

    const handlePour = () => {
        onPour(recipe, { isStrong, isTaste });
    };

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(onClose, 200);
    };

    return (
        <div className="fixed inset-0 z-[200]">
            {/* Backdrop */}
            <div
                onClick={handleClose}
                className={`absolute inset-0 bg-black/90 backdrop-blur-sm transition-opacity duration-200
                    ${isVisible ? 'opacity-100' : 'opacity-0'}`}
            />

            {/* Modal */}
            <div
                className={`absolute bottom-0 left-0 right-0
                     md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2
                     md:max-w-lg md:bottom-auto md:rounded-3xl
                     bg-black rounded-t-3xl md:rounded-b-3xl
                     flex flex-col max-h-[92vh] overflow-hidden
                     border border-white/5
                     transition-all duration-300 ease-out
                     ${isVisible
                        ? 'translate-y-0 scale-100 opacity-100'
                        : 'translate-y-8 scale-95 opacity-0'
                    }`}
            >
                {/* ─── Hero Image Header ─── */}
                <div className="relative w-full flex-shrink-0" style={{ height: '40%', minHeight: '220px' }}>
                    <img
                        src={imgSrc}
                        alt={recipe.name}
                        onError={handleImageError}
                        className="w-full h-full object-cover"
                    />
                    {/* Gradient fade into black */}
                    <div
                        className="absolute inset-0 pointer-events-none"
                        style={{ background: 'linear-gradient(to bottom, transparent 40%, #000000 100%)' }}
                    />
                    {/* Close button */}
                    <button
                        onClick={handleClose}
                        className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/60 backdrop-blur-sm
                             flex items-center justify-center transition hover:bg-white/20 z-10"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    {/* Title overlay at bottom of image */}
                    <div className="absolute bottom-0 left-0 right-0 px-6 pb-4">
                        <h2 className="text-3xl font-bold text-white drop-shadow-lg">{recipe.name}</h2>
                        {recipe.description && (
                            <p className="text-sm text-gray-400 mt-1 line-clamp-2">{recipe.description}</p>
                        )}
                    </div>
                </div>

                {/* ─── Scrollable Body ─── */}
                <div className="flex-1 overflow-y-auto px-6 pt-4 pb-2">
                    {/* Points Badge */}
                    <div className="flex items-center gap-3 mb-5">
                        <div className="bg-white/5 border border-white/10 px-4 py-1.5 rounded-full text-sm font-bold text-cyan-400">
                            {getPointsLabel()}
                        </div>
                        <div className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-full text-xs text-gray-400 uppercase tracking-wider">
                            {recipe.category}
                        </div>
                    </div>

                    {/* Ingredients — 2-column pill grid */}
                    <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-3">Ingredients</p>
                    <div className="grid grid-cols-2 gap-3 mb-5">
                        {ingredientsList.map((ing, idx) => (
                            <div
                                key={idx}
                                className="flex items-center justify-between px-3 py-2.5
                                     bg-white/[0.03] border border-white/10 rounded-xl"
                            >
                                <span className="text-sm text-white font-medium truncate mr-2">{ing.name}</span>
                                <span className="text-sm text-cyan-400 font-bold whitespace-nowrap">{ing.amount}ml</span>
                            </div>
                        ))}
                    </div>

                    {/* Toggles */}
                    <div className="space-y-3 mb-4">
                        <TogglePill
                            label="Strong Drink"
                            sublabel="50% more alcohol • 2× PTS"
                            emoji="💪"
                            active={isStrong}
                            activeColor="amber"
                            onToggle={() => setIsStrong(!isStrong)}
                        />
                        <TogglePill
                            label="Tasting Pour"
                            sublabel="Small portion"
                            emoji="🥄"
                            active={isTaste}
                            activeColor="cyan"
                            onToggle={() => setIsTaste(!isTaste)}
                        />
                    </div>
                </div>

                {/* ─── Pour CTA ─── */}
                <div className="flex-shrink-0 px-6 pb-6 pt-3"
                    style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
                >
                    <button
                        onClick={handlePour}
                        className="w-full py-4 rounded-2xl font-bold text-base uppercase tracking-wider
                             bg-gradient-to-r from-cyan-500 to-cyan-400 text-black
                             shadow-lg shadow-[#00E5FF]/40
                             hover:brightness-110 active:scale-95
                             transition-all duration-150 touch-manipulation"
                    >
                        Pour Cocktail
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ─── Toggle Pill subcomponent ─── */
function TogglePill({ label, sublabel, emoji, active, activeColor, onToggle }) {
    const borderClass = active
        ? (activeColor === 'amber' ? 'border-amber-500/50' : 'border-cyan-500/50')
        : 'border-white/5';
    const bgSwitch = active
        ? (activeColor === 'amber' ? 'bg-amber-500' : 'bg-cyan-500')
        : 'bg-white/10';

    return (
        <div className={`flex items-center justify-between px-4 py-3
                bg-white/[0.03] border rounded-xl transition-colors ${borderClass}`}>
            <div className="flex items-center gap-2">
                <span className="text-base">{emoji}</span>
                <div>
                    <p className="text-sm text-white font-semibold">{label}</p>
                    <p className="text-[11px] text-gray-500">{sublabel}</p>
                </div>
            </div>
            <button
                onClick={onToggle}
                className={`w-12 h-6 rounded-full relative transition-all duration-300 ${bgSwitch}`}
            >
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-300
                    ${active ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
        </div>
    );
}

export default DrinkModal;
