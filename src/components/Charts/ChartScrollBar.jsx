import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Custom modern scrollbar component matching sleek CRM aesthetics:
 * - Left arrow (◀)
 * - Light track with rounded pill thumb
 * - Right arrow (▶)
 * - Direct drag, track click, and button click navigation
 */
export default function ChartScrollBar({
  start = 0,
  end = 100,
  dataLength = 0,
  visibleCount = 8,
  onChange,
}) {
  const trackRef = useRef(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ mouseX: 0, startStart: 0 });

  if (dataLength <= visibleCount) return null;

  const span = end - start;
  const canScrollLeft = start > 0.1;
  const canScrollRight = end < 99.9;

  // Single step scroll amount (roughly 1 bar)
  const step = Math.max(2, Math.round((1 / dataLength) * 100));

  const handleScrollLeft = () => {
    let newStart = Math.max(0, start - step);
    let newEnd = newStart + span;
    if (newEnd > 100) {
      newEnd = 100;
      newStart = 100 - span;
    }
    onChange?.({ start: newStart, end: newEnd });
  };

  const handleScrollRight = () => {
    let newEnd = Math.min(100, end + step);
    let newStart = newEnd - span;
    if (newStart < 0) {
      newStart = 0;
      newEnd = span;
    }
    onChange?.({ start: newStart, end: newEnd });
  };

  const handleTrackClick = (e) => {
    if (isDraggingRef.current || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickPercent = (clickX / rect.width) * 100;

    let newStart = clickPercent - span / 2;
    let newEnd = newStart + span;

    if (newStart < 0) {
      newStart = 0;
      newEnd = span;
    } else if (newEnd > 100) {
      newEnd = 100;
      newStart = 100 - span;
    }

    onChange?.({ start: newStart, end: newEnd });
  };

  const handleThumbMouseDown = (e) => {
    e.stopPropagation();
    e.preventDefault();
    isDraggingRef.current = true;
    dragStartRef.current = {
      mouseX: e.clientX,
      startStart: start,
    };

    const handleMouseMove = (moveEvent) => {
      if (!isDraggingRef.current || !trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const deltaX = moveEvent.clientX - dragStartRef.current.mouseX;
      const deltaPercent = (deltaX / rect.width) * 100;

      let newStart = dragStartRef.current.startStart + deltaPercent;
      let newEnd = newStart + span;

      if (newStart < 0) {
        newStart = 0;
        newEnd = span;
      } else if (newEnd > 100) {
        newEnd = 100;
        newStart = 100 - span;
      }

      onChange?.({ start: newStart, end: newEnd });
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  // Touch support for mobile / touchpads
  const handleThumbTouchStart = (e) => {
    if (e.touches.length !== 1) return;
    isDraggingRef.current = true;
    dragStartRef.current = {
      mouseX: e.touches[0].clientX,
      startStart: start,
    };

    const handleTouchMove = (moveEvent) => {
      if (!isDraggingRef.current || !trackRef.current || moveEvent.touches.length !== 1) return;
      const rect = trackRef.current.getBoundingClientRect();
      const deltaX = moveEvent.touches[0].clientX - dragStartRef.current.mouseX;
      const deltaPercent = (deltaX / rect.width) * 100;

      let newStart = dragStartRef.current.startStart + deltaPercent;
      let newEnd = newStart + span;

      if (newStart < 0) {
        newStart = 0;
        newEnd = span;
      } else if (newEnd > 100) {
        newEnd = 100;
        newStart = 100 - span;
      }

      onChange?.({ start: newStart, end: newEnd });
    };

    const handleTouchEnd = () => {
      isDraggingRef.current = false;
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };

    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd);
  };

  return (
    <div className="flex items-center gap-1.5 mt-1 px-1 w-full select-none">
      {/* Left Navigation Arrow */}
      <button
        type="button"
        onClick={handleScrollLeft}
        disabled={!canScrollLeft}
        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 disabled:cursor-default transition-colors cursor-pointer shrink-0"
        title="Scroll Left"
        aria-label="Scroll chart left"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>

      {/* Horizontal Scroll Track */}
      <div
        ref={trackRef}
        onClick={handleTrackClick}
        className="flex-1 h-1.5 bg-slate-100 hover:bg-slate-200/70 rounded-full relative cursor-pointer transition-colors"
      >
        {/* Draggable Rounded Pill Thumb */}
        <div
          onMouseDown={handleThumbMouseDown}
          onTouchStart={handleThumbTouchStart}
          className="h-full bg-slate-300 hover:bg-slate-400 active:bg-slate-500 rounded-full absolute cursor-grab active:cursor-grabbing transition-colors"
          style={{
            left: `${Math.max(0, Math.min(100 - span, start))}%`,
            width: `${Math.max(6, span)}%`,
          }}
        />
      </div>

      {/* Right Navigation Arrow */}
      <button
        type="button"
        onClick={handleScrollRight}
        disabled={!canScrollRight}
        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 disabled:cursor-default transition-colors cursor-pointer shrink-0"
        title="Scroll Right"
        aria-label="Scroll chart right"
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
