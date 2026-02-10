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

    const accentColors = {
        'pink': { btn: 'from-pink-500 to-violet-500', glow: 'shadow-pink-500/30' },
        'cyan': { btn: 'from-cyan-500 to-blue-500', glow: 'shadow-[#00E5FF]/40' },
        'amber': { btn: 'from-amber-500 to-orange-500', glow: 'shadow-amber-500/30' },
    };

    const accent = accentColors[color] || accentColors.pink;

    return (
        <div
            onClick={() => onClick(recipe)}
            className="group bg-[#1A1A1A] rounded-2xl overflow-hidden cursor-pointer
                 hover:scale-[1.02] active:scale-95 transition-all duration-200
                 border border-white/5 flex flex-col
                 touch-manipulation"
        >
            {/* Hero Image */}
            <div className="relative h-48 w-full overflow-hidden">
                <img
                    src={imgSrc}
                    alt={recipe.name}
                    loading="lazy"
                    onError={handleImageError}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                {/* Bottom gradient mask – blends image into the card body */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background: 'linear-gradient(to bottom, transparent 60%, #1A1A1A 100%)',
                    }}
                />
            </div>

            {/* Content */}
            <div className="p-4 pt-1 flex flex-col flex-1">
                <h3 className="text-xl font-bold text-white line-clamp-1 leading-tight mb-1">
                    {recipe.name}
                </h3>
                <p className="text-sm text-gray-400 line-clamp-2 leading-snug mb-3 flex-1">
                    {recipe.description || ''}
                </p>

                {/* Pour CTA */}
                <button
                    className={`w-full py-2 rounded-xl text-sm font-bold text-white
                        bg-gradient-to-r ${accent.btn}
                        shadow-lg ${accent.glow}
                        hover:brightness-110 active:brightness-90
                        transition-all duration-150`}
                    onClick={(e) => {
                        e.stopPropagation();
                        onClick(recipe);
                    }}
                >
                    Pour
                </button>
            </div>
        </div>
    );
}

export default CocktailCard;
