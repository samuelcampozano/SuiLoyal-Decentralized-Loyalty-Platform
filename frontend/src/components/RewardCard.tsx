type Props = { title: string; points: number }

export default function RewardCard({ title, points }: Props) {
  return (
    <div className="border rounded p-4 shadow-sm">
      <div className="font-medium">{title}</div>
      <div className="text-sm text-gray-600">{points} points</div>
    </div>
  )
}
