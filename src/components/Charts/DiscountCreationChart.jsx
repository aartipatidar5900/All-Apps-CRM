import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { Tag, RefreshCw } from 'lucide-react';

const DiscountCreationChart = ({ data, loading, error }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (!data || data.length === 0 || !chartRef.current) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const months = data.map((d) => d.label || d.key);
    const discountsCreatedData = data.map((d) => d.discountsCreated);

    const option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross', label: { backgroundColor: '#475569' } },
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        textStyle: { color: '#0f172a', fontSize: 12 },
        padding: [10, 14],
        extraCssText: 'box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); border-radius: 12px;',
      },
      legend: {
        data: ['Discounts Created'],
        top: 0,
        right: 0,
        textStyle: { color: '#475569', fontWeight: 500 },
      },
      grid: {
        left: '2%',
        right: '2%',
        bottom: '3%',
        top: '18%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: months,
        axisLine: { lineStyle: { color: '#cbd5e1' } },
        axisLabel: { color: '#64748b', fontSize: 12, margin: 12 },
      },
      yAxis: {
        type: 'value',
        name: 'Discounts',
        nameTextStyle: { color: '#64748b', fontSize: 11 },
        splitLine: { lineStyle: { type: 'dashed', color: '#f1f5f9' } },
        axisLabel: { color: '#64748b' },
      },
      series: [
        {
          name: 'Discounts Created',
          type: 'line',
          smooth: true,
          symbolSize: 8,
          itemStyle: { color: '#6366f1' },
          lineStyle: { width: 3, color: '#6366f1' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(99, 102, 241, 0.3)' },
              { offset: 1, color: 'rgba(99, 102, 241, 0.0)' },
            ]),
          },
          data: discountsCreatedData,
        },
      ],
    };

    chartInstance.current.setOption(option, true);

    const handleResize = () => {
      chartInstance.current?.resize();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [data]);

  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, []);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between h-full">
      <div className="flex items-center gap-2 mb-2">
        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
          <Tag className="w-4 h-4" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 text-sm">Discounts Created</h3>
          <p className="text-slate-500 text-xs mt-0.5">Monthly trend of discounts created across stores</p>
        </div>
      </div>

      {loading ? (
        <div className="h-72 flex items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
        </div>
      ) : error ? (
        <div className="h-72 flex items-center justify-center text-xs text-rose-600">
          {error}
        </div>
      ) : !data || data.length === 0 ? (
        <div className="h-72 flex items-center justify-center text-xs text-slate-500">
          No discount creation data recorded.
        </div>
      ) : (
        <div ref={chartRef} className="w-full h-72" />
      )}
    </div>
  );
};

export default DiscountCreationChart;
