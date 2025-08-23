import { Cell, Pie, PieChart as RechartsPieChart, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface PieChartData {
  name: string;
  value: number;
  color: string;
}

interface PieChartProps {
  data: PieChartData[];
  title: string;
  height?: number;
  formatValue?: (value: number) => string;
}

const PieChart: React.FC<PieChartProps> = ({
  data,
  title,
  height = 300,
  formatValue = (value) => value.toString()
}) => {
  const renderCustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const total = data.value * 4; // Simple approximation for demo
      return (
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-3 shadow-xl">
          <p className="text-white font-medium">{data.name}</p>
          <p className="text-white/80">
            Value: {formatValue(data.value)}
          </p>
          <p className="text-white/80">
            Percentage: {((data.value / total) * 100).toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = ({ percent }: any) => {
    if (percent < 0.05) return null; // Don't show labels for slices < 5%
    return `${(percent * 100).toFixed(0)}%`;
  };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 shadow-xl">
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsPieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomLabel}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            stroke="rgba(255, 255, 255, 0.2)"
            strokeWidth={1}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.color}
                className="hover:opacity-80 transition-opacity duration-200"
              />
            ))}
          </Pie>
          <Tooltip content={renderCustomTooltip} />
          <Legend 
            wrapperStyle={{
              paddingTop: '20px',
              fontSize: '12px',
              color: '#ffffff80'
            }}
            iconType="circle"
            formatter={(value) => <span style={{ color: '#ffffff' }}>{value}</span>}
          />
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PieChart;