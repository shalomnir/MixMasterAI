import { useState } from 'react';
import { resolveImage, PLACEHOLDER_IMG } from '../utils/cocktailImages';

function CocktailCard({ recipe, onClick }) {
    const [imgSrc, setImgSrc] = useState(() => resolveImage(recipe));

    const handleImageError = () => {
        if (imgSrc !== PLACEHOLDER_IMG) {
            setImgSrc(PLACEHOLDER_IMG);
        }
    };

    return (
        <div
            onClick={() => onClick(recipe)}
            className="relative aspect-[4/5] rounded-2xl overflow-hidden cursor-pointer
                 bg-black border border-white/5
                 hover:scale-[1.02] active:scale-95 transition-all duration-200
                 touch-manipulation group"
        >
            {/* Hero Image — fills the entire card */}
            <img
                src={imgSrc}
                alt={recipe.name}
                loading="lazy"
                onError={handleImageError}
                className="absolute inset-0 w-full h-full object-cover
                     transition-transform duration-500 group-hover:scale-110"
            />

            {/* Name overlay at the bottom */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-12 pb-4 px-3">
                <h3 className="text-lg font-bold text-white leading-tight line-clamp-2 drop-shadow-lg">
                    {recipe.name}
                </h3>
            </div>
        </div>
    );
}

export default CocktailCard;
