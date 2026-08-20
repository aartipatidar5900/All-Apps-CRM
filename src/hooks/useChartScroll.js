import { useEffect, useRef } from "react";

/**
 * Helper to generate consistent, polished ECharts dataZoom configuration
 * with proper slider and inside-zoom settings for smooth panning.
 */
export function getDataZoomOptions(dataLength = 0, visibleCount = 8) {
  const isScrollable = dataLength > visibleCount;
  const initialEnd = isScrollable
    ? Math.round((visibleCount / dataLength) * 100)
    : 100;

  return [
    {
      type: "slider",
      show: isScrollable,
      xAxisIndex: [0],
      left: "2%",
      right: "2%",
      bottom: 6,
      height: 16,
      start: 0,
      end: initialEnd,
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
        borderRadius: 4,
      },
      moveHandleSize: 8,
      moveHandleStyle: {
        color: "#64748b",
      },
      borderRadius: 8,
    },
    {
      type: "inside",
      xAxisIndex: [0],
      zoomLock: true,
      zoomOnMouseWheel: false,
      moveOnMouseWheel: false, // Critical: prevent hijacking vertical page scroll
      moveOnMouseMove: true,   // Allow click-and-drag panning
      preventDefaultMouseMove: false,
    },
  ];
}

/**
 * Custom hook to enable buttery-smooth horizontal scrolling on ECharts charts:
 * - Two-finger trackpad horizontal pan (deltaX)
 * - Shift + mouse wheel
 * - Unhampered vertical page scroll when hovering chart
 * - Keeps zoom state synchronized with bottom slider and click-drag
 */
export function useChartScroll({
  chartRef,
  chartInstance,
  dataLength = 0,
  visibleCount = 8,
}) {
  const zoomStateRef = useRef({ start: 0, end: 100 });

  useEffect(() => {
    if (!chartRef.current || !chartInstance.current || dataLength <= 0) return;

    const initialEnd =
      dataLength > visibleCount
        ? Math.round((visibleCount / dataLength) * 100)
        : 100;

    zoomStateRef.current = { start: 0, end: initialEnd };

    const chartDom = chartRef.current;
    const instance = chartInstance.current;

    // Sync zoom state when user interacts with slider or drag-pans chart
    const handleDataZoom = (params) => {
      let s, e;
      if (params.batch && params.batch.length > 0) {
        s = params.batch[0].start;
        e = params.batch[0].end;
      } else if (
        typeof params.start === "number" &&
        typeof params.end === "number"
      ) {
        s = params.start;
        e = params.end;
      }
      if (typeof s === "number" && typeof e === "number") {
        zoomStateRef.current = { start: s, end: e };
      }
    };

    instance.on("datazoom", handleDataZoom);

    // Two-finger trackpad & horizontal mouse wheel smooth scrolling
    const handleWheel = (e) => {
      if (dataLength <= visibleCount) return;

      const isHorizontal =
        Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey;
      if (!isHorizontal) {
        // Natural vertical scroll: do not preventDefault, let page scroll naturally!
        return;
      }

      e.preventDefault();

      const rawDelta =
        Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      let pixelDelta = rawDelta;
      if (e.deltaMode === 1) pixelDelta *= 30;
      else if (e.deltaMode === 2) pixelDelta *= 300;

      const rect = chartDom.getBoundingClientRect();
      const containerWidth = rect.width || 800;
      const currentSpan =
        zoomStateRef.current.end - zoomStateRef.current.start;

      // Direct proportional mapping for 1:1 trackpad feel
      const deltaPercent = (pixelDelta / containerWidth) * currentSpan;

      let newStart = zoomStateRef.current.start + deltaPercent;
      let newEnd = zoomStateRef.current.end + deltaPercent;

      if (newStart < 0) {
        newStart = 0;
        newEnd = currentSpan;
      } else if (newEnd > 100) {
        newEnd = 100;
        newStart = 100 - currentSpan;
      }

      zoomStateRef.current = { start: newStart, end: newEnd };

      instance.dispatchAction({
        type: "dataZoom",
        dataZoomIndex: 0,
        start: newStart,
        end: newEnd,
      });
    };

    chartDom.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      chartDom.removeEventListener("wheel", handleWheel);
      if (instance && !instance.isDisposed()) {
        instance.off("datazoom", handleDataZoom);
      }
    };
  }, [chartRef, chartInstance, dataLength, visibleCount]);

  return zoomStateRef;
}
