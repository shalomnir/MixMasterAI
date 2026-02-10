import { NavLink, useLocation } from 'react-router-dom';

function NavigationBar() {
    const location = useLocation();

    const isActive = (path) => location.pathname === path;

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-[100] bottom-nav-safe
                bg-black/80 backdrop-blur-xl border-t border-[#00E5FF]/10">
            <div className="flex justify-around items-center py-1 px-6">
                {/* Profile */}
                <NavLink
                    to="/profile"
                    className={`flex flex-col items-center space-y-1 min-w-[50px] min-h-[50px] justify-center 
                     ${isActive('/profile') ? 'text-[#00E5FF]' : 'text-gray-500 hover:text-gray-300'} 
                     active:scale-95 transition-all group touch-manipulation relative`}
                >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition
                          ${isActive('/profile') ? 'bg-[#00E5FF]/10' : 'bg-white/5 group-hover:bg-white/10'}`}>
                        👤
                    </div>
                    <span className="text-xs font-medium">Profile</span>
                    {isActive('/profile') && (
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 
                           bg-[#00E5FF] rounded-full" />
                    )}
                </NavLink>

                {/* Drinks (Center - Highlighted) */}
                <NavLink
                    to="/menu"
                    className="flex flex-col items-center space-y-1 -mt-8 touch-manipulation relative"
                >
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-lg 
                          transition-all transform hover:scale-105 active:scale-95
                          bg-gradient-to-r from-cyan-500 to-[#00E5FF] shadow-[#00E5FF]/30`}>
                        🍹
                    </div>
                    <span className={`text-xs font-bold ${isActive('/menu') ? 'text-[#00E5FF]' : 'text-cyan-400'}`}>
                        Drinks
                    </span>
                </NavLink>

                {/* Leaderboard */}
                <NavLink
                    to="/leaderboard"
                    className={`flex flex-col items-center space-y-1 min-w-[50px] min-h-[50px] justify-center 
                     ${isActive('/leaderboard') ? 'text-[#00E5FF]' : 'text-gray-500 hover:text-gray-300'} 
                     active:scale-95 transition-all group touch-manipulation relative`}
                >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition
                          ${isActive('/leaderboard') ? 'bg-[#00E5FF]/10' : 'bg-white/5 group-hover:bg-white/10'}`}>
                        🏆
                    </div>
                    <span className="text-xs font-medium">Ranks</span>
                    {isActive('/leaderboard') && (
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 
                           bg-[#00E5FF] rounded-full" />
                    )}
                </NavLink>
            </div>
        </nav>
    );
}

export default NavigationBar;
