import GlassCard from "../../components/common/GlassCard";

const StatCard = ({ label, value, icon: Icon, colorClass = "text-indigo-400", bgClass = "bg-indigo-500/10" }) => {
  return (
    <GlassCard className="flex items-center gap-2 sm:gap-4 p-3 sm:p-5" hoverEffect={false}>
      <div className={`p-2 sm:p-3 rounded-lg sm:rounded-xl ${bgClass} ${colorClass}`}>
        <Icon size={18} className="sm:w-6 sm:h-6" />
      </div>
      <div className="min-w-0">
        <p className="text-zinc-500 text-[10px] sm:text-sm font-medium uppercase tracking-wider truncate">{label}</p>
        <p className="text-lg sm:text-2xl font-bold text-white">{value}</p>
      </div>
    </GlassCard>
  );
};

export default StatCard;