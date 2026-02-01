import { useToast } from '../hooks/useToast';

function Toast() {
    const { toasts } = useToast();

    if (toasts.length === 0) return null;

    const bgColors = {
        success: 'bg-green-600',
        error: 'bg-red-500',
        info: 'bg-blue-600',
        warning: 'bg-yellow-500'
    };

    const icons = {
        success: '✓',
        error: '✕',
        info: 'ℹ',
        warning: '⚠'
    };

    return (
        <div className="fixed bottom-24 right-4 z-50 flex flex-col gap-2 pointer-events-none">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`${bgColors[toast.type] || bgColors.info} text-white px-6 py-4 rounded-xl 
                     shadow-2xl pointer-events-auto toast-enter flex items-center gap-3`}
                >
                    <span className="text-xl">{icons[toast.type] || icons.info}</span>
                    <span className="font-semibold">{toast.message}</span>
                </div>
            ))}
        </div>
    );
}

export default Toast;
