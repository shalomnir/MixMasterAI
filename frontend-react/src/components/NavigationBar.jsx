import { NavLink, useLocation } from 'react-router-dom';

function NavigationBar() {
    const location = useLocation();

    const isActive = (path) => location.pathname === path;

    return (
        <nav className="fixed bottom-0 left-0 right-0 glass border-t border-white/10 z-[100] bottom-nav-safe">
            <div className="flex justify-around items-center py-1 px-6">
                {/* Profile */}
                <NavLink
                    to="/profile"
                    className={`flex flex-col items-center space-y-1 min-w-[50px] min-h-[50px] justify-center 
                     ${isActive('/profile') ? 'text-white' : 'text-slate-300 hover:text-white'} 
                     active:scale-95 transition-all group touch-manipulation relative`}
                >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition
                          ${isActive('/profile') ? 'bg-slate-700' : 'bg-slate-800 group-hover:bg-slate-700'}`}>
                        👤
                    </div>
                    <span className="text-xs font-medium">Profile</span>
                    {isActive('/profile') && (
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 
                           bg-gradient-to-r from-pink-500 to-violet-500 rounded-full" />
                    )}
                </NavLink>

                {/* Drinks (Center - Highlighted) */}
                <NavLink
                    to="/menu"
                    className="flex flex-col items-center space-y-1 -mt-8 touch-manipulation relative"
                >
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-lg 
                          transition-all transform hover:scale-105 active:scale-95
                          ${isActive('/menu')
                            ? 'bg-gradient-to-r from-pink-600 to-violet-600 shadow-pink-500/30'
                            : 'bg-gradient-to-r from-pink-600 to-violet-600 shadow-pink-500/30'}`}>
                        🍹
                    </div>
                    <span className={`text-xs font-bold ${isActive('/menu') ? 'text-white' : 'text-pink-400'}`}>
                        Drinks
                    </span>
                </NavLink>

                {/* Leaderboard */}
                <NavLink
                    to="/leaderboard"
                    className={`flex flex-col items-center space-y-1 min-w-[50px] min-h-[50px] justify-center 
                     ${isActive('/leaderboard') ? 'text-white' : 'text-slate-300 hover:text-white'} 
                     active:scale-95 transition-all group touch-manipulation relative`}
                >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition
                          ${isActive('/leaderboard') ? 'bg-slate-700' : 'bg-slate-800 group-hover:bg-slate-700'}`}>
                        🏆
                    </div>
                    <span className="text-xs font-medium">Ranks</span>
                    {isActive('/leaderboard') && (
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 
                           bg-gradient-to-r from-pink-500 to-violet-500 rounded-full" />
                    )}
                </NavLink>
            </div>
        </nav>
    );
}

export default NavigationBar;
