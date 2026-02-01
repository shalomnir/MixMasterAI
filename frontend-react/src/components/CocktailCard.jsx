function CocktailCard({ recipe, color = 'pink', onClick }) {
    const gradientColors = {
        'pink': 'from-pink-500 to-violet-500',
        'cyan': 'from-cyan-500 to-blue-500',
        'amber': 'from-amber-500 to-orange-500'
    };

    return (
        <div
            onClick={() => onClick(recipe)}
            className="glass rounded-2xl aspect-square relative overflow-hidden cursor-pointer 
                 hover:scale-[1.02] active:scale-95 transition-all transform 
                 border border-white/5 flex flex-col items-center justify-center p-4 gap-2
                 touch-manipulation"
        >
            <div className={`flex-shrink-0 w-14 h-14 rounded-full bg-gradient-to-br ${gradientColors[color]} 
                       flex items-center justify-center text-2xl shadow-lg`}>
                🍹
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
