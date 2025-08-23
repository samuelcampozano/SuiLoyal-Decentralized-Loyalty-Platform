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
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 shadow-xl">
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsLineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <XAxis 
            dataKey="date" 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#ffffff80' }}
          />
          {showYAxis && (
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#ffffff80' }}
              tickFormatter={formatValue}
            />
          )}
          <Tooltip 
            contentStyle={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              color: 'white'
            }}
            formatter={(value: any) => [formatValue(value), title]}
            labelStyle={{ color: '#ffffff80' }}
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