import { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { usePour } from '../hooks/usePour';
import { useToast } from '../hooks/useToast';
import CocktailCard from '../components/CocktailCard';
import NavigationBar from '../components/NavigationBar';
import DrinkModal from '../components/DrinkModal';

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

function MenuPage() {
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

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [pumpsResponse, recipesResponse, settingsResponse] = await Promise.all([
                api.getPumps(),
                api.getRecipes(),
                api.getSettings()
            ]);

            // Build pump data map
            const pumps = {};
            if (pumpsResponse.pumps) {
                const pumpsData = pumpsResponse.pumps;
                if (Array.isArray(pumpsData)) {
                    pumpsData.forEach(p => { pumps[p.id] = p; });
                } else {
                    Object.entries(pumpsData).forEach(([id, p]) => {
                        pumps[id] = { ...p, id: parseInt(id) };
                    });
                }
            }
            setPumpData(pumps);

            setMachineState({
                classic_target_vol: pumpsResponse.classic_target_vol || 110,
                highball_target_vol: pumpsResponse.highball_target_vol || 90,
                shot_target_vol: pumpsResponse.shot_target_vol || 40,
                taste_amount_ml: pumpsResponse.taste_amount_ml || 30
            });

            if (settingsResponse.current_event_name) {
                setEventName(settingsResponse.current_event_name);
            }

            setRecipes({
                classic: recipesResponse.classic_cocktails || [],
                highball: recipesResponse.highballs || [],
                shot: recipesResponse.shots || []
            });

            setIsLoading(false);
        } catch (err) {
            console.error('Failed to load data:', err);
            setError(err.isServerDown
                ? '⚠️ Server is offline. Please ensure the backend is running.'
                : 'Failed to load menu. Please refresh.');
            setIsLoading(false);
        }
    };

    // Build a map from pump name → spirit keyword for filtering
    const spiritPumpIds = useMemo(() => {
        const map = {};
        for (const filter of SPIRIT_FILTERS) {
            if (filter.key === 'all') continue;
            map[filter.key] = [];
        }
        for (const [id, pump] of Object.entries(pumpData)) {
            const nameLower = (pump.name || pump.ingredient_name || '').toLowerCase();
            if (nameLower.includes('vodka')) map.vodka?.push(id);
            else if (nameLower.includes('gin')) map.gin?.push(id);
            else if (nameLower.includes('tequila')) map.tequila?.push(id);
            else if (nameLower.includes('rum')) map.rum?.push(id);
        }
        return map;
    }, [pumpData]);

    // Filtered cocktails based on category + spirit
    const filteredRecipes = useMemo(() => {
        let pool;
        if (activeCategory === 'all') {
            pool = [...recipes.classic, ...recipes.highball, ...recipes.shot];
        } else {
            pool = recipes[activeCategory] || [];
        }

        // Apply spirit filter
        if (activeSpirit !== 'all') {
            const pumpIds = spiritPumpIds[activeSpirit] || [];
            if (pumpIds.length > 0) {
                pool = pool.filter(recipe => {
                    const ings = recipe.ingredients || {};
                    return pumpIds.some(id => ings[id] !== undefined && parseFloat(ings[id]) > 0);
                });
            } else {
                pool = [];
            }
        }

        return pool;
    }, [recipes, activeCategory, activeSpirit, spiritPumpIds]);

    // Smooth filter switch with fade
    const switchCategory = (key) => {
        if (key === activeCategory) return;
        setIsFading(true);
        setTimeout(() => {
            setActiveCategory(key);
            setIsFading(false);
        }, 150);
    };

    const switchSpirit = (key) => {
        if (key === activeSpirit) return;
        setIsFading(true);
        setTimeout(() => {
            setActiveSpirit(key);
            setIsFading(false);
        }, 150);
    };

    const handleDrinkClick = (recipe) => {
        setSelectedRecipe(recipe);
    };

    const handleCloseModal = () => {
        setSelectedRecipe(null);
    };

    const handlePour = async (recipe, options) => {
        setSelectedRecipe(null);
        const result = await startPour(recipe, options, pumpData, machineState);
        if (result.success && result.response.is_highball) {
            setTimeout(() => showHighball(), 1500);
        }
    };

    if (isLoading) {
        return (
            <div className="bg-black text-white min-h-[100dvh] flex flex-col">
                <Header eventName={eventName} />
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center py-20">
                        <div className="spinner mx-auto mb-4"></div>
                        <p className="text-gray-500">Loading drinks...</p>
                    </div>
                </div>
                <NavigationBar />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-black text-white min-h-[100dvh] flex flex-col">
                <Header eventName={eventName} />
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center py-20">
                        <p className="text-red-400 text-lg mb-4">{error}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg transition"
                        >
                            Retry
                        </button>
                    </div>
                </div>
                <NavigationBar />
            </div>
        );
    }

    return (
        <div className="bg-black text-white min-h-[100dvh] flex flex-col">
            <Header eventName={eventName} />

            {/* ─── Category Tab Bar ─── */}
            <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/5">
                <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide">
                    {CATEGORY_TABS.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => switchCategory(tab.key)}
                            className={`flex-shrink-0 px-5 py-2 rounded-full text-sm font-semibold
                                transition-all duration-200 touch-manipulation whitespace-nowrap
                                ${activeCategory === tab.key
                                    ? 'bg-[#00E5FF] text-black shadow-lg shadow-[#00E5FF]/30'
                                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ─── Spirit Filter Bar ─── */}
            <div className="bg-black/60 backdrop-blur-sm border-b border-white/[0.03]">
                <div className="flex gap-2 px-4 py-2 overflow-x-auto scrollbar-hide">
                    {SPIRIT_FILTERS.map(filter => (
                        <button
                            key={filter.key}
                            onClick={() => switchSpirit(filter.key)}
                            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium
                                transition-all duration-200 touch-manipulation whitespace-nowrap
                                ${activeSpirit === filter.key
                                    ? 'bg-white/10 text-[#00E5FF] border border-[#00E5FF]/30'
                                    : 'text-gray-500 hover:text-gray-300 border border-transparent'
                                }`}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ─── Cocktail Grid ─── */}
            <main className="flex-grow container mx-auto px-4 pt-4 pb-24">
                <div
                    className={`grid grid-cols-2 gap-4 transition-opacity duration-150
                        ${isFading ? 'opacity-0' : 'opacity-100'}`}
                >
                    {filteredRecipes.map(recipe => (
                        <CocktailCard
                            key={recipe.id}
                            recipe={recipe}
                            onClick={handleDrinkClick}
                        />
                    ))}
                </div>

                {filteredRecipes.length === 0 && (
                    <div className="text-center py-20">
                        <p className="text-gray-500 text-sm">No cocktails match this filter.</p>
                    </div>
                )}
            </main>

            <NavigationBar />

            {/* Drink Modal */}
            {selectedRecipe && (
                <DrinkModal
                    recipe={selectedRecipe}
                    pumpData={pumpData}
                    machineState={machineState}
                    onClose={handleCloseModal}
                    onPour={handlePour}
                />
            )}
        </div>
    );
}

function Header({ eventName }) {
    return (
        <header className="px-4 pt-3 pb-1 text-center">
            <h1 className="text-xl font-bold gradient-text-cyan">
                MixMasterAI
            </h1>
            {eventName && (
                <p className="text-sm text-gray-500 mt-0.5">{eventName}</p>
            )}
        </header>
    );
}

export default MenuPage;
