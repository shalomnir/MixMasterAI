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

function MenuPage() {
    const [recipes, setRecipes] = useState({ classic: [], highball: [], shot: [] });
    const [pumpData, setPumpData] = useState({});
    const [machineState, setMachineState] = useState({});
    const [eventName, setEventName] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedRecipe, setSelectedRecipe] = useState(null);
    const [activeCategory, setActiveCategory] = useState('all');
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

    // Filtered cocktails based on active tab
    const filteredRecipes = useMemo(() => {
        if (activeCategory === 'all') {
            return [...recipes.classic, ...recipes.highball, ...recipes.shot];
        }
        return recipes[activeCategory] || [];
    }, [recipes, activeCategory]);

    // Smooth category switch with fade
    const switchCategory = (key) => {
        if (key === activeCategory) return;
        setIsFading(true);
        setTimeout(() => {
            setActiveCategory(key);
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
                                    ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/30'
                                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5'
                                }`}
                        >
                            {tab.label}
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
                        <p className="text-gray-500 text-sm">No cocktails in this category.</p>
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
            <h1 className="text-xl font-bold gradient-text-pink">
                MixMasterAI
            </h1>
            {eventName && (
                <p className="text-sm text-gray-500 mt-0.5">{eventName}</p>
            )}
        </header>
    );
}

export default MenuPage;
