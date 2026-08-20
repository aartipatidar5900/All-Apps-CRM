import { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { Store } from 'lucide-react';
import { ChartSkeleton } from '../SkeletonLoader';
import ChartScrollBar from './ChartScrollBar';

const StoreStatusChart = ({ data = [], loading, error }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const zoomRef = useRef({ start: 0, end: 100 });
  const [zoomState, setZoomState] = useState({ start: 0, end: 100 });

  const handleScrollBarChange = ({ start, end }) => {
    zoomRef.current = { start, end };
    setZoomState({ start, end });
    if (chartInstance.current) {
      chartInstance.current.dispatchAction({
        type: 'dataZoom',
        dataZoomIndex: 0,
        start,
        end,
      });
    }
  };

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
    const installedData = data.map((d) => d.installed);
    const uninstalledData = data.map((d) => d.uninstalled);
    const initialEnd =
      data.length > 8 ? Math.round((8 / data.length) * 100) : 100;

    zoomRef.current = { start: 0, end: initialEnd };
    setZoomState({ start: 0, end: initialEnd });

    const option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        textStyle: { color: '#0f172a', fontSize: 12 },
        padding: [10, 14],
        extraCssText: 'box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); border-radius: 12px;',
      },
      legend: {
        data: ['Installed Stores', 'Uninstalled Stores'],
        top: 0,
        right: 0,
        textStyle: { color: '#475569', fontWeight: 500 },
        itemGap: 16,
      },
      grid: {
        left: '2%',
        right: '2%',
        bottom: '8%',
        top: '18%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        boundaryGap: true,
        data: months,
        axisLine: { lineStyle: { color: '#cbd5e1' } },
        axisLabel: { color: '#64748b', fontSize: 12, margin: 12, interval: 0 },
      },
      yAxis: {
        type: 'value',
        name: 'Stores',
        nameTextStyle: { color: '#64748b', fontSize: 11 },
        splitLine: { lineStyle: { type: 'dashed', color: '#f1f5f9' } },
        axisLabel: { color: '#64748b' },
      },
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: [0],
          start: 0,
          end: initialEnd,
          zoomLock: true,
          zoomOnMouseWheel: false,
          moveOnMouseWheel: false,
          moveOnMouseMove: true,
          preventDefaultMouseMove: false,
        },
      ],
      series: [
        {
          name: 'Installed Stores',
          type: 'bar',
          barGap: '0%',
          barCategoryGap: '35%',
          barMaxWidth: 32,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#10b981' },
              { offset: 1, color: '#059669' },
            ]),
            borderRadius: [6, 6, 0, 0],
          },
          data: installedData,
        },
        {
          name: 'Uninstalled Stores',
          type: 'bar',
          barMaxWidth: 32,
          barCategoryGap: '35%',
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#f43f5e' },
              { offset: 1, color: '#e11d48' },
            ]),
            borderRadius: [6, 6, 0, 0],
          },
          data: uninstalledData,
        },
      ],
    };

    chartInstance.current.setOption(option, true);

    const handleChartDataZoom = (params) => {
      let s, e;
      if (params.batch && params.batch.length > 0) {
        s = params.batch[0].start;
        e = params.batch[0].end;
      } else if (
        typeof params.start === 'number' &&
        typeof params.end === 'number'
      ) {
        s = params.start;
        e = params.end;
      }
      if (typeof s === 'number' && typeof e === 'number') {
        zoomRef.current = { start: s, end: e };
        setZoomState({ start: s, end: e });
      }
    };

    chartInstance.current.on('datazoom', handleChartDataZoom);

    const chartDom = chartRef.current;
    let rafId = null;

    const handleWheel = (e) => {
      if (!data || data.length <= 8) return;

      const isHorizontal =
        Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey;
      if (!isHorizontal) return;

      e.preventDefault();

      const rawDelta =
        Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      let pixelDelta = rawDelta;
      if (e.deltaMode === 1) pixelDelta *= 30;
      else if (e.deltaMode === 2) pixelDelta *= 300;

      const rect = chartDom.getBoundingClientRect();
      const containerWidth = rect.width || 800;
      const currentSpan = zoomRef.current.end - zoomRef.current.start;

      const deltaPercent = (pixelDelta / containerWidth) * currentSpan;

      let newStart = zoomRef.current.start + deltaPercent;
      let newEnd = zoomRef.current.end + deltaPercent;

      if (newStart < 0) {
        newStart = 0;
        newEnd = currentSpan;
      } else if (newEnd > 100) {
        newEnd = 100;
        newStart = 100 - currentSpan;
      }

      zoomRef.current = { start: newStart, end: newEnd };

      if (chartInstance.current) {
        chartInstance.current.dispatchAction({
          type: 'dataZoom',
          dataZoomIndex: 0,
          start: newStart,
          end: newEnd,
        });
      }

      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setZoomState({ start: newStart, end: newEnd });
      });
    };

    chartDom.addEventListener('wheel', handleWheel, { passive: false });

    const handleResize = () => {
      chartInstance.current?.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      chartDom.removeEventListener('wheel', handleWheel);
      if (rafId) cancelAnimationFrame(rafId);
      if (chartInstance.current && !chartInstance.current.isDisposed()) {
        chartInstance.current.off('datazoom', handleChartDataZoom);
      }
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
        titleWidth="w-56"
        subtitleWidth="w-64"
        type="bar"
      />
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between h-full">
      <div className="flex items-center gap-2 mb-2">
        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
          <Store className="w-4 h-4" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 text-sm">Stores Installed vs Uninstalled</h3>
          <p className="text-slate-500 text-xs mt-0.5">Monthly comparison of store growth and churn</p>
        </div>
      </div>

      {error ? (
        <div className="h-72 flex items-center justify-center text-xs text-rose-600">
          {error}
        </div>
      ) : !data || data.length === 0 ? (
        <div className="h-72 flex items-center justify-center text-xs text-slate-500">
          No store installation data recorded.
        </div>
      ) : (
        <div className="w-full">
          <div
            ref={chartRef}
            className={`w-full h-72 select-none ${data && data.length > 8 ? "cursor-grab active:cursor-grabbing" : ""}`}
            style={{ touchAction: "pan-y" }}
          />
          <ChartScrollBar
            start={zoomState.start}
            end={zoomState.end}
            dataLength={data.length}
            visibleCount={8}
            onChange={handleScrollBarChange}
          />
        </div>
      )}
    </div>
  );
};

export default StoreStatusChart;


