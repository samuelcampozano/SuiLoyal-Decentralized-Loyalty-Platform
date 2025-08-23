import { Bar, BarChart as RechartsBarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartData } from '../../types';

interface BarChartProps {
  data: ChartData[];
  title: string;
  color: string;
  height?: number;
  showYAxis?: boolean;
  formatValue?: (value: number) => string;
}

const BarChart: React.FC<BarChartProps> = ({
  data,
  title,
  color,
  height = 200,
  showYAxis = true,
  formatValue = (value) => value.toString()
}) => {
  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 shadow-xl">
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
          <Bar 
            dataKey="value" 
            fill={color}
            radius={[4, 4, 0, 0]}
            className="hover:opacity-80 transition-opacity duration-200"
          />
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BarChart;