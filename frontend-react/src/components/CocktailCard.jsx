import { useState } from 'react';

const PLACEHOLDER_IMG = '/assets/cocktails-imgs/placeholder.png';
const IMG_BASE = '/assets/cocktails-imgs/';

/**
 * Map from cocktail name → image filename.
 * Keeps the frontend resilient to inconsistent filenames on disk.
 */
const IMAGE_MAP = {
    'Margarita': 'Margarita.webp',
    "Tommy's Margarita": 'Tommys-Margarita.webp',
    'Daiquiri': 'Daiquiri.webp',
    'Gimlet': 'Gimlet.webp',
    'Vodka Sour': 'Vodka-Sour.webp',
    'Tequila Sour': 'Tquila-Sour.webp',
    'Rum Sour': 'Rum-Sour.webp',
    'White Lady': 'White-Lady.webp',
    'Kamikaze': 'Kamikaze.webp',
    'Cosmopolitan': 'Cosmopolitan.webp',
    'Cranberry Margarita': 'Cranberry-Margarita.webp',
    'Ocean Breeze': 'Ocean-Breeze.webp',
    'Vodka Soda Lime': 'Vodka-Soda-Lime.webp',
    'Gin Rickey': 'Gin-Rickey.webp',
    'Tequila Highball': 'Tequila-highball.webp',
    'Rum Soda': 'Rum-Soda.webp',
    'Vodka Cran Soda': 'Vodka-cran-soda.webp',
    'Gin Cran Soda': 'Gin-Cran-Soda.webp',
    'Pink Spritz': 'Pink_Spritz.webp',
    'Citrus Gin Fizz': 'Citrus-Gin-Fizz.webp',
    'Vodka Shot': 'shots.webp',
    'Tequila Shot': 'shots.webp',
    'White Rum Shot': 'shots.webp',
};

/**
 * Resolve the image source for a cocktail:
 *  1. Use `image_url` from the API if it exists
 *  2. Look up the cocktail name in IMAGE_MAP
 *  3. Fall back to the placeholder
 */
function resolveImage(recipe) {
    if (recipe.image_url) {
        return `${IMG_BASE}${recipe.image_url}`;
    }
    const mapped = IMAGE_MAP[recipe.name];
    return mapped ? `${IMG_BASE}${mapped}` : PLACEHOLDER_IMG;
}

function CocktailCard({ recipe, color = 'pink', onClick }) {
    const [imgSrc, setImgSrc] = useState(() => resolveImage(recipe));

    const handleImageError = () => {
        if (imgSrc !== PLACEHOLDER_IMG) {
            setImgSrc(PLACEHOLDER_IMG);
        }
    };

    return (
        <div
            onClick={() => onClick(recipe)}
            className="glass rounded-2xl aspect-square relative overflow-hidden cursor-pointer 
                 hover:scale-[1.02] active:scale-95 transition-all transform 
                 border border-white/5 flex flex-col items-center justify-center p-4 gap-2
                 touch-manipulation"
        >
            <div className="flex-shrink-0 w-14 h-14 rounded-full overflow-hidden shadow-lg ring-1 ring-white/10">
                <img
                    src={imgSrc}
                    alt={recipe.name}
                    loading="lazy"
                    onError={handleImageError}
                    className="w-full h-full object-cover"
                />
            </div>
            <div className="w-full flex flex-col items-center">
                <h3 className="text-lg font-extrabold text-white text-center line-clamp-1 leading-tight mb-1">
                    {recipe.name}
                </h3>
                <p className="text-xs text-slate-400 text-center line-clamp-2 leading-snug px-1 font-medium">
                    {recipe.description || ''}
                </p>
            </div>
        </div>
    );
}

export default CocktailCard;
