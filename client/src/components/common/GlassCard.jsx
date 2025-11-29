import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const GlassCard = ({ children, className, onClick, hoverEffect = true }) => {
  return (
    <div 
      onClick={onClick}
      className={twMerge(clsx(
        "glass rounded-2xl p-6 transition-all duration-300 relative overflow-hidden",
        hoverEffect && "hover:border-indigo-500/30 hover:shadow-indigo-500/10 hover:-translate-y-1",
        onClick && "cursor-pointer",
        className
      ))}
    >
      {/* Subtle Glow Effect */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default GlassCard;