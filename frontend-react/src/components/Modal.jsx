function Modal({ isOpen, onClose, children, title, icon = '✨' }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200]">
            {/* Backdrop */}
            <div
                onClick={onClose}
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            {/* Modal Content */}
            <div className="absolute bottom-0 left-0 right-0 md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 
                     md:max-w-lg md:bottom-auto md:rounded-3xl glass rounded-t-3xl md:rounded-b-3xl p-8 
                     transform transition-transform duration-300 flex flex-col max-h-[90vh]"
                style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 
                    flex items-center justify-center transition touch-manipulation z-10"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Header */}
                {title && (
                    <div className="flex-shrink-0 mb-4">
                        <div className="flex justify-center mb-4">
                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 
                             flex items-center justify-center text-4xl shadow-lg">
                                {icon}
                            </div>
                        </div>
                        <h2 className="text-3xl font-bold text-center text-white mb-3">{title}</h2>
                    </div>
                )}

                {/* Content */}
                <div className="overflow-y-auto flex-grow">
                    {children}
                </div>
            </div>
        </div>
    );
}

export default Modal;
