import GlassCard from "../../components/common/GlassCard";

const StatCard = ({ label, value, icon: Icon, colorClass = "text-indigo-400", bgClass = "bg-indigo-500/10" }) => {
  return (
    <GlassCard className="flex items-center gap-4 p-5" hoverEffect={false}>
      <div className={`p-3 rounded-xl ${bgClass} ${colorClass}`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-zinc-500 text-sm font-medium uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
    </GlassCard>
  );
};

export default StatCard;