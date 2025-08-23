import { Area, AreaChart as RechartsAreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartData } from '../../types';

interface AreaChartProps {
  data: ChartData[];
  title: string;
  color: string;
  gradientId: string;
  height?: number;
  showYAxis?: boolean;
  formatValue?: (value: number) => string;
}

const AreaChart: React.FC<AreaChartProps> = ({
  data,
  title,
  color,
  gradientId,
  height = 200,
  showYAxis = true,
  formatValue = (value) => value.toString()
}) => {
  return (
    <div className="bg-white rounded-xl p-6 shadow-lg">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsAreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.8}/>
              <stop offset="95%" stopColor={color} stopOpacity={0.1}/>
            </linearGradient>
          </defs>
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
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke={color} 
            strokeWidth={2}
            fillOpacity={1} 
            fill={`url(#${gradientId})`}
            dot={{ fill: color, strokeWidth: 2, r: 3 }}
            activeDot={{ r: 5, stroke: color, strokeWidth: 2 }}
          />
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AreaChart;