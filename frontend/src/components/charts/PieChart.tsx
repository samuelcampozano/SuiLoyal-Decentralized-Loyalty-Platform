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
        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-xl">
          <p className="text-gray-900 font-medium">{data.name}</p>
          <p className="text-gray-600">
            Value: {formatValue(data.value)}
          </p>
          <p className="text-gray-600">
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
    <div className="bg-white rounded-xl p-6 shadow-lg">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
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
            stroke="rgba(0, 0, 0, 0.1)"
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
              color: '#6b7280'
            }}
            iconType="circle"
            formatter={(value) => <span style={{ color: '#374151' }}>{value}</span>}
          />
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PieChart;