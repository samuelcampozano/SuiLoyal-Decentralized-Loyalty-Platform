import { Line, LineChart as RechartsLineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartData } from '../../types';

interface LineChartProps {
  data: ChartData[];
  title: string;
  color: string;
  height?: number;
  showYAxis?: boolean;
  formatValue?: (value: number) => string;
  strokeWidth?: number;
}

const LineChart: React.FC<LineChartProps> = ({
  data,
  title,
  color,
  height = 200,
  showYAxis = true,
  formatValue = (value) => value.toString(),
  strokeWidth = 2
}) => {
  return (
    <div className="bg-white rounded-xl p-6 shadow-lg">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsLineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <XAxis 
            dataKey="date" 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#6b7280' }}
          />
          {showYAxis && (
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickFormatter={formatValue}
            />
          )}
          <Tooltip 
            contentStyle={{
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              color: '#111827',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
            formatter={(value: any) => [formatValue(value), title]}
            labelStyle={{ color: '#6b7280' }}
          />
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={color} 
            strokeWidth={strokeWidth}
            dot={{ fill: color, strokeWidth: 2, r: 3 }}
            activeDot={{ 
              r: 5, 
              stroke: color, 
              strokeWidth: 2,
              fill: 'white'
            }}
            className="drop-shadow-sm"
          />
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default LineChart;