import { useState, useEffect } from 'react';
import api from '../services/api';
import { usePour } from '../hooks/usePour';
import { useToast } from '../hooks/useToast';
import CocktailCard from '../components/CocktailCard';
import NavigationBar from '../components/NavigationBar';
import DrinkModal from '../components/DrinkModal';

function MenuPage() {
    const [recipes, setRecipes] = useState({ classic: [], highball: [], shot: [] });
    const [pumpData, setPumpData] = useState({});
    const [machineState, setMachineState] = useState({});
    const [eventName, setEventName] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedRecipe, setSelectedRecipe] = useState(null);
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
                pumpsResponse.pumps.forEach(p => {
                    pumps[p.id] = p;
                });
            }
            setPumpData(pumps);

            // Machine state
            setMachineState({
                classic_target_vol: pumpsResponse.classic_target_vol || 110,
                highball_target_vol: pumpsResponse.highball_target_vol || 90,
                shot_target_vol: pumpsResponse.shot_target_vol || 40,
                taste_amount_ml: pumpsResponse.taste_amount_ml || 30
            });

            // Event name
            if (settingsResponse.current_event_name) {
                setEventName(settingsResponse.current_event_name);
            }

            // Recipes by category
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
            <div className="bg-slate-900 text-white min-h-[100dvh] flex flex-col">
                <Header eventName={eventName} />
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center py-20">
                        <div className="spinner mx-auto mb-4"></div>
                        <p className="text-slate-400">Loading drinks...</p>
                    </div>
                </div>
                <NavigationBar />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-slate-900 text-white min-h-[100dvh] flex flex-col">
                <Header eventName={eventName} />
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center py-20">
                        <p className="text-red-400 text-lg mb-4">{error}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-2 bg-pink-600 hover:bg-pink-700 rounded-lg transition"
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
        <div className="bg-slate-900 text-white min-h-[100dvh] flex flex-col">
            <Header eventName={eventName} />

            <main className="flex-grow container mx-auto px-4 pt-0 pb-24">
                <div className="space-y-8">
                    <div className="flex justify-between items-end mb-2">
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-0">Menu</h2>
                            <p className="text-slate-400 text-sm">Select a drink to pour.</p>
                        </div>
                    </div>

                    {/* Classic Cocktails */}
                    {recipes.classic.length > 0 && (
                        <CategorySection
                            title="Classic Cocktails"
                            color="pink"
                            recipes={recipes.classic}
                            onDrinkClick={handleDrinkClick}
                        />
                    )}

                    {/* Highballs */}
                    {recipes.highball.length > 0 && (
                        <CategorySection
                            title="Highballs"
                            subtitle="Add Soda/Tonic after pouring"
                            color="cyan"
                            recipes={recipes.highball}
                            onDrinkClick={handleDrinkClick}
                        />
                    )}

                    {/* Shots */}
                    {recipes.shot.length > 0 && (
                        <CategorySection
                            title="Shots"
                            color="amber"
                            recipes={recipes.shot}
                            onDrinkClick={handleDrinkClick}
                        />
                    )}
                </div>
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
        <>
            <header className="px-4 pt-1 text-center pb-0">
                <h1 className="text-xl font-bold gradient-text-pink">
                    MixMasterAI
                </h1>
            </header>
            <div className="px-4 pt-1 text-center">
                <h2 className="text-lg font-semibold text-white">
                    {eventName ? `Menu - ${eventName}` : 'Menu'}
                </h2>
                <p className="text-slate-400 text-sm">Select a drink to pour.</p>
            </div>
        </>
    );
}

function CategorySection({ title, subtitle, color, recipes, onDrinkClick }) {
    const gradients = {
        pink: 'from-pink-500 to-violet-500',
        cyan: 'from-cyan-500 to-blue-500',
        amber: 'from-amber-500 to-orange-500'
    };

    const textGradients = {
        pink: 'from-pink-400 to-violet-400',
        cyan: 'from-cyan-400 to-blue-400',
        amber: 'from-amber-400 to-orange-400'
    };

    return (
        <div className="category-section">
            <div className="flex items-center gap-3 mb-4">
                <div className={`h-1 w-12 bg-gradient-to-r ${gradients[color]} rounded-full`}></div>
                <div className="flex flex-col">
                    <h3 className={`text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r ${textGradients[color]}`}>
                        {title}
                    </h3>
                    {subtitle && (
                        <p className="text-[10px] text-slate-400 italic">{subtitle}</p>
                    )}
                </div>
                <div className={`h-1 flex-grow bg-gradient-to-r ${gradients[color].replace('500', '500/50')} to-transparent rounded-full`}></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                {recipes.map(recipe => (
                    <CocktailCard
                        key={recipe.id}
                        recipe={recipe}
                        color={color}
                        onClick={onDrinkClick}
                    />
                ))}
            </div>
        </div>
    );
}

export default MenuPage;
