/**
 * Shared image resolution for cocktail components.
 * Maps cocktail names → filenames on disk (under /assets/cocktails-imgs/).
 *
 * Available images:
 *   Margarita.webp, Tommys-Margarita.webp, Cosmopolitan.webp, Gimlet.webp,
 *   White-Lady.webp, Kamikaze.webp, Cranberry-Margarita.webp, Ocean-Breeze.webp,
 *   Daiquiri.webp, Vodka-Sour.webp, Tquila-Sour.webp, Rum-Sour.webp,
 *   Vodka-Soda-Lime.webp, Vodka-cran-soda.webp, Gin-Rickey.webp,
 *   Tequila-highball.webp, Rum-Soda.webp, Gin-Cran-Soda.webp,
 *   Pink_Spritz.webp, Citrus-Gin-Fizz.webp, shots.webp, placeholder.png
 */

export const PLACEHOLDER_IMG = '/assets/cocktails-imgs/placeholder.png';
const IMG_BASE = '/assets/cocktails-imgs/';

const IMAGE_MAP = {
    // ── Classics ──────────────────────────────────────────────────
    'Classic Margarita': 'Margarita.webp',
    'Cosmopolitan': 'Cosmopolitan.webp',
    'Gimlet': 'Gimlet.webp',
    'Pineapple Margarita': 'Tommys-Margarita.webp',   // tropical margarita variant
    'Lemon Drop Martini': 'Vodka-Sour.webp',          // citrus vodka martini → sour-style glass
    'Bay Breeze': 'Ocean-Breeze.webp',        // fruity build-over-ice drink
    'White Lady': 'White-Lady.webp',
    'Tequila Sunrise (Machine Style)': 'Tquila-Sour.webp',      // tequila-forward warm-hued glass

    // ── Highballs ─────────────────────────────────────────────────
    'Gin Fizz': 'Citrus-Gin-Fizz.webp',
    'Tom Collins': 'Gin-Rickey.webp',          // tall gin-lime-soda classic
    'Vodka Collins': 'Vodka-Soda-Lime.webp',     // vodka + lime + soda tall
    'Tequila Collins': 'Tequila-highball.webp',    // tall tequila drink
    'Tropical Gin Juice': 'Gin-Rickey.webp',          // gin + pineapple + soda
    'Cranberry Gin Fizz': 'Gin-Cran-Soda.webp',       // gin + cranberry + soda = pink fizz
    'Pineapple Express': 'Vodka-cran-soda.webp',     // vodka + pineapple tall
    'Holiday Highball': 'Pink_Spritz.webp',         // tequila + cranberry + soda festive

    // ── Shots ─────────────────────────────────────────────────────
    'Kamikaze': 'Kamikaze.webp',
    'Kamikaze Shot': 'Kamikaze.webp',
    'Mexican Lemonade Shot': 'shots.webp',
    'Pink Gin Shot': 'shots.webp',
    'Pineapple Upside Down': 'shots.webp',
};

export function resolveImage(recipe) {
    if (recipe.image_url) {
        return `${IMG_BASE}${recipe.image_url}`;
    }
    if (recipe.name) {
        const searchName = recipe.name.trim().toLowerCase();
        for (const [key, val] of Object.entries(IMAGE_MAP)) {
            if (key.toLowerCase() === searchName) {
                return `${IMG_BASE}${val}`;
            }
        }
    }
    return PLACEHOLDER_IMG;
}
