import { createContext, useState, useCallback, useEffect } from 'react';
import api from '../services/api';

export const PouringContext = createContext(null);

export function PouringProvider({ children }) {
    const [isPouring, setIsPouring] = useState(false);
    const [pouringProgress, setPouringProgress] = useState(0);
    const [pouringStatus, setPouringStatus] = useState('idle'); // idle, pouring, success, error
    const [currentDrink, setCurrentDrink] = useState(null);
    const [estimatedDuration, setEstimatedDuration] = useState(0);
    const [errorMessage, setErrorMessage] = useState(null);
    const [pointsEarned, setPointsEarned] = useState(0);
    const [isGlobalBusy, setIsGlobalBusy] = useState(false);

    // Poll global machine status to lock buttons for all users
    useEffect(() => {
        let isMounted = true;
        const checkStatus = async () => {
            try {
                const res = await api.getStatus();
                if (isMounted) {
                    setIsGlobalBusy(res.is_pouring);
                }
            } catch (err) { }
        };

        checkStatus();
        const intervalId = setInterval(checkStatus, 2000); // Poll every 2 seconds

        return () => {
            isMounted = false;
            clearInterval(intervalId);
        };
    }, []);

    const startPour = useCallback(async (recipe, options, pumpData, machineState) => {
        setIsPouring(true);
        setPouringStatus('pouring');
        setCurrentDrink(recipe);
        setPouringProgress(0);
        setErrorMessage(null);

        // Calculate estimated pour duration
        const { isStrong, isTaste } = options;
        const targetVol = isTaste
            ? machineState.taste_amount_ml
            : getTargetVolume(recipe.category, machineState);

        const originalTotal = Object.values(recipe.ingredients || {}).reduce(
            (sum, ml) => sum + parseFloat(ml), 0
        );

        // Build a robust map of ingredient names to pump info
        const nameToPump = {};
        for (const pump of Object.values(pumpData)) {
            const name = pump.name || pump.ingredient_name || '';
            if (name) nameToPump[name.toLowerCase()] = pump;
        }

        let maxDuration = 0;
        console.log('Calculating duration for ingredients:', recipe.ingredients);
        for (const [ingredientName, ml] of Object.entries(recipe.ingredients || {})) {
            // Check numeric ID fallback or direct name lookup
            let pump = pumpData[ingredientName];
            if (!pump) {
                pump = nameToPump[String(ingredientName).trim().toLowerCase()];
            }

            console.log('Found pump for ingredient:', ingredientName, pump);

            if (pump && pump.seconds_per_50ml) {
                let scaledMl = (parseFloat(ml) / originalTotal) * targetVol;
                if (isStrong && pump.is_alcohol) scaledMl *= 1.5;
                const duration = (scaledMl / 50.0) * parseFloat(pump.seconds_per_50ml);
                console.log(`Pump ${pump.ingredient_name} duration:`, duration);
                maxDuration = Math.max(maxDuration, duration);
            }
        }

        const estimatedSeconds = Math.ceil(maxDuration);
        console.log('Estimated total seconds:', estimatedSeconds);
        setEstimatedDuration(estimatedSeconds);

        try {
            // Set status to loading_server to trigger spinner UI without timer
            setPouringStatus('loading_server');

            const response = await api.pourCocktail(recipe.id, {
                isStrong: isStrong,
                isTaste: isTaste
            });

            // Fallback: If frontend miscalculated 0, use the backend's exact calculation
            const actualSeconds = estimatedSeconds > 0
                ? estimatedSeconds
                : Math.ceil(response.total_duration || 5);

            setEstimatedDuration(actualSeconds);

            // Pour has begun on the server, start the timer UI
            setPouringStatus('pouring');

            // Start progress animation
            let elapsed = 0;
            const intervalId = setInterval(() => {
                elapsed += 0.1;
                const progress = Math.min((elapsed / actualSeconds) * 100, 100);
                setPouringProgress(progress);

                if (elapsed >= actualSeconds) {
                    clearInterval(intervalId);
                    if (response.status === 'success') {
                        setPouringStatus('success');
                        setPointsEarned(response.points_added || 0);
                    } else {
                        setPouringStatus('error');
                        setErrorMessage(response.message || 'Unknown error');
                    }
                }
            }, 100);

            return { success: response.status === 'success', response };
        } catch (error) {
            setPouringStatus('error');
            setErrorMessage(error.message);
            return { success: false, error };
        }
    }, []);

    const resetPour = useCallback(() => {
        setIsPouring(false);
        setPouringProgress(0);
        setPouringStatus('idle');
        setCurrentDrink(null);
        setEstimatedDuration(0);
        setErrorMessage(null);
        setPointsEarned(0);
    }, []);

    const value = {
        isPouring,
        pouringProgress,
        pouringStatus,
        currentDrink,
        estimatedDuration,
        errorMessage,
        pointsEarned,
        isGlobalBusy,
        startPour,
        resetPour
    };

    return (
        <PouringContext.Provider value={value}>
            {children}
        </PouringContext.Provider>
    );
}

function getTargetVolume(category, machineState) {
    switch (category) {
        case 'highball': return machineState.highball_target_vol || 90;
        case 'shot': return machineState.shot_target_vol || 40;
        default: return machineState.classic_target_vol || 110;
    }
}
