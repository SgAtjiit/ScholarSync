import { Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const Button = ({ 
  children, 
  variant = 'primary', // primary, secondary, outline, ghost, danger
  size = 'md', // sm, md, lg
  loading = false, 
  disabled, 
  className, 
  ...props 
}) => {
  
  const variants = {
    primary: "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:shadow-xl",
    secondary: "bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-white/5 hover:border-white/10",
    outline: "bg-transparent border border-zinc-700 hover:border-indigo-500/50 text-zinc-300 hover:text-white hover:bg-indigo-500/5",
    ghost: "bg-transparent hover:bg-zinc-800/50 text-zinc-400 hover:text-white",
    danger: "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/40"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-5 py-2.5 text-sm",
    lg: "px-6 py-3 text-base"
  };

  return (
    <button
      disabled={disabled || loading}
      className={twMerge(clsx(
        // Base styles
        "flex items-center justify-center gap-2 rounded-xl font-medium",
        // Transitions
        "transition-all duration-200 ease-out",
        // Interactive states
        "active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
        // Focus ring for accessibility
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900",
        // Variant and size
        variants[variant],
        sizes[size],
        className
      ))}
      {...props}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
};

export default Button;