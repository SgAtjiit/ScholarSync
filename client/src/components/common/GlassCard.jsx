import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const GlassCard = ({ children, className, onClick, hoverEffect = true, glowColor = 'indigo' }) => {
  const glowColors = {
    indigo: 'bg-indigo-500/10 hover:border-indigo-500/30 hover:shadow-indigo-500/10',
    purple: 'bg-purple-500/10 hover:border-purple-500/30 hover:shadow-purple-500/10',
    blue: 'bg-blue-500/10 hover:border-blue-500/30 hover:shadow-blue-500/10',
    green: 'bg-green-500/10 hover:border-green-500/30 hover:shadow-green-500/10',
  };

  return (
    <div 
      onClick={onClick}
      className={twMerge(clsx(
        // Base glass effect
        "bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-xl sm:rounded-2xl p-4 sm:p-6",
        // Transitions
        "transition-all duration-300 ease-out",
        // Position for glow
        "relative overflow-hidden",
        // Hover effects
        hoverEffect && [
          glowColors[glowColor]?.split(' ').slice(1).join(' '),
          "hover:-translate-y-1 hover:shadow-lg"
        ],
        // Clickable state
        onClick && "cursor-pointer active:scale-[0.99]",
        className
      ))}
    >
      {/* Subtle Glow Effect */}
      <div 
        className={clsx(
          "absolute -top-10 -right-10 w-24 sm:w-32 h-24 sm:h-32 rounded-full blur-3xl pointer-events-none transition-opacity duration-300",
          glowColors[glowColor]?.split(' ')[0],
          hoverEffect && "opacity-50 group-hover:opacity-100"
        )} 
      />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default GlassCard;