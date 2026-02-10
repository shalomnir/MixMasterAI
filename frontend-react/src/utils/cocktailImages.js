/**
 * Shared image resolution for cocktail components.
 * Maps cocktail names → filenames on disk.
 */

export const PLACEHOLDER_IMG = '/assets/cocktails-imgs/placeholder.png';
const IMG_BASE = '/assets/cocktails-imgs/';

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

export function resolveImage(recipe) {
    if (recipe.image_url) {
        return `${IMG_BASE}${recipe.image_url}`;
    }
    const mapped = IMAGE_MAP[recipe.name];
    return mapped ? `${IMG_BASE}${mapped}` : PLACEHOLDER_IMG;
}
