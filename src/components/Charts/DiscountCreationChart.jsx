import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { Tag } from 'lucide-react';
import { ChartSkeleton } from '../SkeletonLoader';

const DiscountCreationChart = ({ data, loading, error }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (loading) {
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
      return;
    }

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
        bottom: data.length > 8 ? '12%' : '3%',
        top: '18%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: months,
        axisLine: { lineStyle: { color: '#cbd5e1' } },
        axisLabel: { color: '#64748b', fontSize: 12, margin: 12, interval: 0 },
      },
      yAxis: {
        type: 'value',
        name: 'Discounts',
        nameTextStyle: { color: '#64748b', fontSize: 11 },
        splitLine: { lineStyle: { type: 'dashed', color: '#f1f5f9' } },
        axisLabel: { color: '#64748b' },
      },
      dataZoom: [
        {
          type: "slider",
          show: data.length > 8,
          xAxisIndex: [0],
          left: "2%",
          right: "2%",
          bottom: 4,
          height: 14,
          start: 0,
          end: data.length > 8 ? Math.round((8 / data.length) * 100) : 100,
          zoomLock: true,
          borderColor: "transparent",
          backgroundColor: "#f1f5f9",
          fillerColor: "#cbd5e1",
          showDetail: false,
          showDataShadow: false,
          brushSelect: false,
          handleIcon: "roundRect",
          handleSize: "100%",
          handleStyle: {
            color: "#94a3b8",
            borderColor: "transparent",
            borderRadius: 3,
          },
          moveHandleSize: 6,
          moveHandleStyle: {
            color: "#64748b",
          },
          borderRadius: 6,
        },
        {
          type: "inside",
          xAxisIndex: [0],
          zoomLock: true,
          zoomOnMouseWheel: false,
          moveOnMouseMove: true,
          moveOnMouseWheel: true,
        },
      ],
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
  }, [data, loading]);

  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, []);

  if (loading) {
    return (
      <ChartSkeleton
        height="h-72"
        showTitle={true}
        titleWidth="w-44"
        subtitleWidth="w-60"
        type="line"
      />
    );
  }

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

      {error ? (
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

