type Props = { icon: string; title: string };

export function SectionTitle({ icon, title }: Props) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <span className="text-2xl">{icon}</span>
      <h2 className="text-xl font-bold text-white">{title}</h2>
      <div className="flex-1 h-px bg-gray-700 ml-2" />
    </div>
  );
}
