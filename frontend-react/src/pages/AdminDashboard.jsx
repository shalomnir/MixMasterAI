import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';

function AdminDashboard() {
    const { user, logout } = useAuth();
    const { showSuccess, showError } = useToast();

    const [pumps, setPumps] = useState([]);
    const [recipes, setRecipes] = useState([]);
    const [users, setUsers] = useState([]);
    const [settings, setSettings] = useState({
        classic_target_vol: 110,
        highball_target_vol: 90,
        shot_target_vol: 40,
        taste_amount_ml: 30,
        current_event_name: ''
    });
    const [isLoading, setIsLoading] = useState(true);

    // Modals
    const [selectedPump, setSelectedPump] = useState(null);
    const [selectedRecipe, setSelectedRecipe] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);
    const [newEventName, setNewEventName] = useState('');

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            const [pumpsRes, recipesRes, usersRes, settingsRes] = await Promise.all([
                api.adminGetPumps(),
                api.adminGetRecipes(),
                api.adminGetUsers(),
                api.getSettings()
            ]);

            // Normalize pumps - handle both object and array formats
            const pumpsData = pumpsRes.pumps || {};
            const pumpsArray = Array.isArray(pumpsData)
                ? pumpsData
                : Object.entries(pumpsData).map(([id, p]) => ({ ...p, id: parseInt(id) }));
            setPumps(pumpsArray);

            // Normalize recipes
            const recipesData = recipesRes.recipes || {};
            const recipesArray = Array.isArray(recipesData)
                ? recipesData
                : Object.values(recipesData);
            setRecipes(recipesArray);

            // Normalize users
            const usersData = usersRes.users || [];
            const usersArray = Array.isArray(usersData)
                ? usersData
                : Object.values(usersData);
            setUsers(usersArray);

            setSettings(settingsRes);
            setIsLoading(false);
        } catch (error) {
            console.error('Dashboard Init Error', error);
            showError('Failed to load dashboard data');
            setIsLoading(false);
        }
    };

    const handlePumpToggle = async (pumpId, isActive) => {
        try {
            await api.adminUpdate('pump', pumpId, 'is_active', isActive ? 1 : 0);
            showSuccess('Pump updated');
            const res = await api.adminGetPumps();
            // Normalize pumps response
            const pumpsData = res.pumps || {};
            const pumpsArray = Array.isArray(pumpsData)
                ? pumpsData
                : Object.entries(pumpsData).map(([id, p]) => ({ ...p, id: parseInt(id) }));
            setPumps(pumpsArray);
        } catch (e) {
            showError('Update failed: ' + e.message);
        }
    };

    const handleUpdateCategoryVolume = async (category, value) => {
        try {
            await api.adminUpdateCategoryVolume(category, parseInt(value));
            showSuccess(`${category} volume saved`);
        } catch (e) {
            showError(e.message);
        }
    };

    const handleUpdateTasteAmount = async (value) => {
        try {
            await api.adminUpdateTasteAmount(parseInt(value));
            showSuccess('Taste amount saved');
        } catch (e) {
            showError(e.message);
        }
    };

    const handleStartNewEvent = async () => {
        if (!newEventName.trim()) {
            showError('Please enter an event name');
            return;
        }

        if (!confirm(`Start new event "${newEventName}"?\n\nThis will DELETE ALL registered guests and reset the leaderboard!`)) {
            return;
        }

        try {
            const response = await api.adminStartEvent(newEventName);
            showSuccess(response.message);
            setSettings({ ...settings, current_event_name: newEventName });
            setNewEventName('');
            const usersRes = await api.adminGetUsers();
            setUsers(usersRes.users || []);
        } catch (e) {
            showError(e.message);
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!confirm('Delete this user? This cannot be undone.')) return;
        try {
            await api.adminDeleteUser(userId);
            showSuccess('User deleted');
            const res = await api.adminGetUsers();
            setUsers(res.users || []);
        } catch (e) {
            showError(e.message);
        }
    };

    const handleLogout = () => {
        logout();
        window.location.href = '/';
    };

    // Helper to normalize pumps after API calls
    const normalizePumps = (pumpsData) => {
        return Array.isArray(pumpsData)
            ? pumpsData
            : Object.entries(pumpsData).map(([id, p]) => ({ ...p, id: parseInt(id) }));
    };

    const handleSavePump = async (pumpData) => {
        try {
            await api.adminUpdate('pump', pumpData.id, 'ingredient_name', pumpData.ingredient_name);
            if (pumpData.gpio_pin !== null) {
                await api.adminUpdate('pump', pumpData.id, 'gpio_pin', pumpData.gpio_pin);
            }
            await api.adminUpdate('pump', pumpData.id, 'seconds_per_50ml', pumpData.seconds_per_50ml);
            await api.adminUpdate('pump', pumpData.id, 'is_alcohol', pumpData.is_alcohol);
            await api.adminUpdate('pump', pumpData.id, 'is_virtual', pumpData.is_virtual);
            showSuccess('Pump saved');
            const res = await api.adminGetPumps();
            setPumps(normalizePumps(res.pumps || {}));
            setSelectedPump(null);
        } catch (e) {
            showError('Save failed: ' + e.message);
        }
    };

    const handleSaveRecipe = async (recipeData) => {
        try {
            if (recipeData.id) {
                // Update existing recipe
                await api.adminUpdate('recipe', recipeData.id, 'name', recipeData.name);
                await api.adminUpdate('recipe', recipeData.id, 'description', recipeData.description);
                await api.adminUpdate('recipe', recipeData.id, 'category', recipeData.category);
                await api.adminUpdate('recipe', recipeData.id, 'ingredients_json', recipeData.ingredients_json);
            } else {
                // Create new recipe
                await api.adminCreateRecipe(recipeData);
            }
            showSuccess('Recipe saved');
            const res = await api.adminGetRecipes();
            const recipesData = res.recipes || {};
            setRecipes(Array.isArray(recipesData) ? recipesData : Object.values(recipesData));
            setSelectedRecipe(null);
        } catch (e) {
            showError('Save failed: ' + e.message);
        }
    };

    const handleDeleteRecipe = async (recipeId) => {
        try {
            await api.adminDeleteRecipe(recipeId);
            showSuccess('Recipe deleted');
            const res = await api.adminGetRecipes();
            const recipesData = res.recipes || {};
            setRecipes(Array.isArray(recipesData) ? recipesData : Object.values(recipesData));
            setSelectedRecipe(null);
        } catch (e) {
            showError('Delete failed: ' + e.message);
        }
    };

    if (isLoading) {
        return (
            <div className="bg-slate-950 text-slate-100 min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="spinner mx-auto mb-4"></div>
                    <p className="text-slate-400">Loading Dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-950 text-slate-100 min-h-screen selection:bg-pink-500 selection:text-white">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 shadow-lg">
                <div className="container mx-auto px-4 h-16 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-8 bg-gradient-to-b from-pink-500 to-violet-600 rounded-full shadow-[0_0_10px_rgba(236,72,153,0.5)]"></div>
                        <div>
                            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                                Admin Panel
                            </h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden md:block text-right">
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Logged In As</p>
                            <p className="text-sm font-bold text-slate-200">{user?.nickname || 'Admin'}</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="text-xs text-red-400 hover:text-red-300 font-bold border border-red-900/30 
                        bg-red-900/10 px-3 py-1.5 rounded-lg transition"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto p-4 md:p-6 pb-20 max-w-7xl space-y-10">

                {/* Pump Configuration */}
                <section>
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-slate-100 flex items-center gap-3">
                            <span className="w-1.5 h-6 bg-pink-500 rounded-full shadow-[0_0_10px_rgba(236,72,153,0.5)]"></span>
                            Pump Configuration
                        </h3>
                        <span className="text-xs font-bold px-3 py-1 bg-slate-800 text-slate-400 rounded-full border border-slate-700">
                            {pumps.length} Pumps Installed
                        </span>
                    </div>
                    <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                        {pumps.map(pump => (
                            <div
                                key={pump.id}
                                className="pump-row flex items-center justify-between px-6 py-4 border-b border-slate-800 
                          last:border-b-0 hover:bg-slate-800/50 transition-all cursor-pointer group"
                                onClick={() => setSelectedPump(pump)}
                            >
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border
                                  ${pump.is_active
                                            ? 'bg-green-500/10 text-green-500 border-green-500/30'
                                            : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
                                        {pump.id}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-slate-200 truncate">
                                            {pump.ingredient_name || 'Empty Pump'}
                                        </p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer" onClick={e => e.stopPropagation()}>
                                    <input
                                        type="checkbox"
                                        checked={pump.is_active}
                                        onChange={(e) => handlePumpToggle(pump.id, e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer 
                                 peer-checked:after:translate-x-full peer-checked:after:border-white 
                                 after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
                                 after:bg-white after:border-gray-300 after:border after:rounded-full 
                                 after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                                </label>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Global Settings */}
                <section>
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-slate-100 flex items-center gap-3">
                            <span className="w-1.5 h-6 bg-cyan-500 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.5)]"></span>
                            Global Settings
                        </h3>
                    </div>
                    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 transition-all hover:border-slate-600">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {/* Classic Volume */}
                            <div>
                                <label className="block text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
                                    <span>🍸</span> Classic (ml)
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        defaultValue={settings.classic_target_vol}
                                        onChange={(e) => handleUpdateCategoryVolume('classic', e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 
                              text-white text-lg font-bold focus:outline-none focus:border-cyan-500 
                              focus:ring-2 focus:ring-cyan-500/50 transition-all"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">ml</span>
                                </div>
                            </div>

                            {/* Highball Volume */}
                            <div>
                                <label className="block text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
                                    <span>🥤</span> Highball (ml)
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        defaultValue={settings.highball_target_vol}
                                        onChange={(e) => handleUpdateCategoryVolume('highball', e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 
                              text-white text-lg font-bold focus:outline-none focus:border-cyan-500 
                              focus:ring-2 focus:ring-cyan-500/50 transition-all"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">ml</span>
                                </div>
                            </div>

                            {/* Shot Volume */}
                            <div>
                                <label className="block text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
                                    <span>🥃</span> Shot (ml)
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        defaultValue={settings.shot_target_vol}
                                        onChange={(e) => handleUpdateCategoryVolume('shot', e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 
                              text-white text-lg font-bold focus:outline-none focus:border-cyan-500 
                              focus:ring-2 focus:ring-cyan-500/50 transition-all"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">ml</span>
                                </div>
                            </div>

                            {/* Taste Amount */}
                            <div>
                                <label className="block text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
                                    <span>🥄</span> Taste (ml)
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        defaultValue={settings.taste_amount_ml}
                                        min="10"
                                        max="100"
                                        step="5"
                                        onChange={(e) => handleUpdateTasteAmount(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 
                              text-white text-lg font-bold focus:outline-none focus:border-cyan-500 
                              focus:ring-2 focus:ring-cyan-500/50 transition-all"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">ml</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Start New Event */}
                <section>
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-slate-100 flex items-center gap-3">
                            <span className="w-1.5 h-6 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
                            Start New Event
                        </h3>
                    </div>
                    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 transition-all hover:border-slate-600">
                        <p className="text-slate-400 text-sm mb-4">
                            ⚠️ Starting a new event will <strong className="text-red-400">delete all registered guests</strong> and reset the leaderboard.
                        </p>
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Event Name</label>
                                <input
                                    type="text"
                                    value={newEventName}
                                    onChange={(e) => setNewEventName(e.target.value)}
                                    placeholder="e.g. Birthday Bash 2026"
                                    maxLength={200}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white 
                            focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/50 transition-all"
                                />
                            </div>
                            <div className="flex items-end">
                                <button
                                    onClick={handleStartNewEvent}
                                    className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 
                            hover:to-teal-500 text-white rounded-xl font-bold text-sm 
                            shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all"
                                >
                                    🎉 Start Event
                                </button>
                            </div>
                        </div>
                        <p className="text-slate-500 text-xs mt-3">
                            Current Event: <span className="text-emerald-400 font-semibold">
                                {settings.current_event_name || '-'}
                            </span>
                        </p>
                    </div>
                </section>

                {/* Recipe Management */}
                <section>
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-slate-100 flex items-center gap-3">
                            <span className="w-1.5 h-6 bg-violet-500 rounded-full shadow-[0_0_10px_rgba(139,92,246,0.5)]"></span>
                            Recipe Management
                        </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {recipes.map(recipe => (
                            <div
                                key={recipe.id}
                                onClick={() => setSelectedRecipe(recipe)}
                                className="bg-slate-900 rounded-xl border border-slate-800 p-5 shadow-sm 
                          hover:border-violet-500/50 hover:shadow-violet-500/10 cursor-pointer 
                          transition-all group relative"
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <h4 className="text-lg font-bold text-slate-200 group-hover:text-white transition-colors">
                                        {recipe.name}
                                    </h4>
                                </div>
                                <p className="text-xs text-slate-500 truncate mb-4">
                                    {recipe.description || 'No description'}
                                </p>
                                <div className="flex flex-wrap gap-1">
                                    {renderIngredients(recipe.ingredients || recipe.ingredients_json, pumps)}
                                </div>
                            </div>
                        ))}

                        {/* Add New Recipe */}
                        <div
                            onClick={() => setSelectedRecipe({})}
                            className="bg-slate-900/50 rounded-xl border-2 border-dashed border-slate-700 
                        hover:border-violet-500/50 hover:bg-slate-800 transition-all cursor-pointer 
                        flex flex-col items-center justify-center p-6 min-h-[160px] group"
                        >
                            <div className="w-12 h-12 rounded-full bg-slate-800 group-hover:bg-violet-500/20 
                             flex items-center justify-center mb-3 transition-colors">
                                <span className="text-2xl text-slate-400 group-hover:text-violet-400 font-light">+</span>
                            </div>
                            <p className="text-sm font-bold text-slate-400 group-hover:text-violet-300">Create New Recipe</p>
                        </div>
                    </div>
                </section>

                {/* User Management */}
                <section>
                    <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center flex-wrap gap-4">
                            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                                <span className="w-1.5 h-5 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"></span>
                                Registered Users ({users.length})
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-950 text-slate-400 font-medium border-b border-slate-800">
                                    <tr>
                                        <th className="px-6 py-3">Nickname</th>
                                        <th className="px-6 py-3">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {users.length === 0 ? (
                                        <tr>
                                            <td colSpan={2} className="p-8 text-center text-slate-500 text-sm">No users yet.</td>
                                        </tr>
                                    ) : (
                                        users.map(u => (
                                            <tr key={u.id} className="hover:bg-slate-800/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <span className="font-semibold text-slate-200">{u.nickname}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <button
                                                        onClick={() => handleDeleteUser(u.id)}
                                                        className="text-xs text-red-400 hover:text-red-300"
                                                    >
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>
            </main>

            {/* Pump Edit Modal */}
            {selectedPump && (
                <PumpModal
                    pump={selectedPump}
                    onClose={() => setSelectedPump(null)}
                    onSave={handleSavePump}
                />
            )}

            {/* Recipe Edit Modal */}
            {selectedRecipe && (
                <RecipeModal
                    recipe={selectedRecipe}
                    pumps={pumps}
                    onClose={() => setSelectedRecipe(null)}
                    onSave={handleSaveRecipe}
                    onDelete={handleDeleteRecipe}
                />
            )}
        </div>
    );
}

function renderIngredients(ingredients, pumps) {
    if (!ingredients) return null;

    let parsed = ingredients;
    if (typeof ingredients === 'string') {
        try { parsed = JSON.parse(ingredients); } catch (e) { return null; }
    }

    return Object.entries(parsed).map(([pumpId, amount]) => {
        const pump = pumps.find(p => p.id == pumpId);
        const name = pump ? pump.ingredient_name : `#${pumpId}`;
        return (
            <span
                key={pumpId}
                className="text-[10px] bg-slate-950 text-slate-400 px-1.5 py-0.5 rounded border border-slate-800"
            >
                {name}: {amount}ml
            </span>
        );
    });
}

function PumpModal({ pump, onClose, onSave }) {
    const [ingredientName, setIngredientName] = useState(pump?.ingredient_name || '');
    const [gpioPin, setGpioPin] = useState(pump?.gpio_pin || '');
    const [secondsPer50ml, setSecondsPer50ml] = useState(pump?.seconds_per_50ml || 5);
    const [isAlcohol, setIsAlcohol] = useState(pump?.is_alcohol || false);
    const [isVirtual, setIsVirtual] = useState(pump?.is_virtual || false);
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        await onSave({
            id: pump.id,
            ingredient_name: ingredientName,
            gpio_pin: gpioPin ? parseInt(gpioPin) : null,
            seconds_per_50ml: parseFloat(secondsPer50ml),
            is_alcohol: isAlcohol ? 1 : 0,
            is_virtual: isVirtual ? 1 : 0
        });
        setIsSaving(false);
    };

    return (
        <div className="fixed inset-0 z-[200]">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
            <div className="absolute inset-0 flex items-center justify-center p-4">
                <div className="bg-slate-900 rounded-2xl border border-slate-700 p-6 w-full max-w-md">
                    <h2 className="text-xl font-bold text-white mb-4">Edit Pump #{pump.id}</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Ingredient Name</label>
                            <input
                                type="text"
                                value={ingredientName}
                                onChange={(e) => setIngredientName(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
                                placeholder="e.g. Vodka"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">GPIO Pin</label>
                                <input
                                    type="number"
                                    value={gpioPin}
                                    onChange={(e) => setGpioPin(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
                                    placeholder="e.g. 17"
                                    min="0"
                                    max="40"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Seconds per 50ml</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={secondsPer50ml}
                                    onChange={(e) => setSecondsPer50ml(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
                                />
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isAlcohol}
                                    onChange={(e) => setIsAlcohol(e.target.checked)}
                                    className="w-5 h-5 rounded"
                                />
                                <span className="text-white">Is Alcohol</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isVirtual}
                                    onChange={(e) => setIsVirtual(e.target.checked)}
                                    className="w-5 h-5 rounded"
                                />
                                <span className="text-white">Virtual Pump</span>
                            </label>
                        </div>
                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="flex-1 py-2 bg-pink-600 hover:bg-pink-500 rounded-lg text-white font-bold"
                            >
                                {isSaving ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

function RecipeModal({ recipe, pumps, onClose, onSave, onDelete }) {
    const isNew = !recipe.id;
    const [name, setName] = useState(recipe?.name || '');
    const [description, setDescription] = useState(recipe?.description || '');
    const [category, setCategory] = useState(recipe?.category || 'classic');
    const [ingredients, setIngredients] = useState(() => {
        let ing = recipe?.ingredients || recipe?.ingredients_json || {};
        if (typeof ing === 'string') {
            try { ing = JSON.parse(ing); } catch (e) { ing = {}; }
        }
        return ing;
    });
    const [isSaving, setIsSaving] = useState(false);

    const handleIngredientChange = (pumpId, amount) => {
        if (amount === '' || parseFloat(amount) <= 0) {
            const newIng = { ...ingredients };
            delete newIng[pumpId];
            setIngredients(newIng);
        } else {
            setIngredients({ ...ingredients, [pumpId]: parseFloat(amount) });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        await onSave({
            id: recipe.id,
            name,
            description,
            category,
            ingredients_json: JSON.stringify(ingredients)
        });
        setIsSaving(false);
    };

    const handleDelete = async () => {
        if (confirm(`Delete recipe "${name}"? This cannot be undone.`)) {
            await onDelete(recipe.id);
        }
    };

    return (
        <div className="fixed inset-0 z-[200]">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
            <div className="absolute inset-0 flex items-center justify-center p-4 overflow-y-auto">
                <div className="bg-slate-900 rounded-2xl border border-slate-700 p-6 w-full max-w-lg my-8">
                    <h2 className="text-xl font-bold text-white mb-4">
                        {isNew ? 'Create Recipe' : `Edit: ${recipe.name}`}
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Description</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
                                rows={2}
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Category</label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
                            >
                                <option value="classic">Classic</option>
                                <option value="highball">Highball</option>
                                <option value="shot">Shot</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-2">Ingredients (ml per pump)</label>
                            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                                {pumps.map(pump => (
                                    <div key={pump.id} className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            min="0"
                                            value={ingredients[pump.id] || ''}
                                            onChange={(e) => handleIngredientChange(pump.id, e.target.value)}
                                            className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-sm"
                                            placeholder="ml"
                                        />
                                        <span className="text-slate-300 text-sm truncate">
                                            {pump.ingredient_name || `#${pump.id}`}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-3 pt-4">
                            {!isNew && (
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    className="py-2 px-4 bg-red-600 hover:bg-red-500 rounded-lg text-white font-medium"
                                >
                                    Delete
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="flex-1 py-2 bg-pink-600 hover:bg-pink-500 rounded-lg text-white font-bold"
                            >
                                {isSaving ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default AdminDashboard;
