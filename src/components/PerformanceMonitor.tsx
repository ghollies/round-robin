import React, { useState, useEffect } from 'react';
import { performanceMonitor, getMemoryUsage } from '../utils/performance';

interface PerformanceMonitorProps {
  enabled?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  enabled = process.env.NODE_ENV === 'development',
  position = 'bottom-right'
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [memoryInfo, setMemoryInfo] = useState<any>(null);

  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      const currentMetrics = performanceMonitor.getMetrics();
      const memory = getMemoryUsage();
      
      setMetrics(currentMetrics.slice(-10)); // Keep last 10 metrics
      setMemoryInfo(memory);
    }, 1000);

    return () => clearInterval(interval);
  }, [enabled]);

  if (!enabled) return null;

  const positionStyles = {
    'top-left': { top: '10px', left: '10px' },
    'top-right': { top: '10px', right: '10px' },
    'bottom-left': { bottom: '10px', left: '10px' },
    'bottom-right': { bottom: '10px', right: '10px' },
  };

  return (
    <div
      style={{
        position: 'fixed',
        ...positionStyles[position],
        zIndex: 9999,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '10px',
        borderRadius: '8px',
        fontSize: '12px',
        fontFamily: 'monospace',
        maxWidth: '300px',
        transition: 'all 0.3s ease',
        opacity: isVisible ? 1 : 0.3,
      }}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>
        Performance Monitor
      </div>
      
      {memoryInfo && (
        <div style={{ marginBottom: '8px' }}>
          <div>Memory: {(memoryInfo.usedJSHeapSize / 1024 / 1024).toFixed(1)}MB</div>
          <div>Limit: {(memoryInfo.jsHeapSizeLimit / 1024 / 1024).toFixed(1)}MB</div>
        </div>
      )}
      
      {isVisible && (
        <div>
          <div style={{ marginBottom: '4px', fontWeight: 'bold' }}>Recent Operations:</div>
          {metrics.slice(-5).map((metric, index) => (
            <div key={index} style={{ fontSize: '10px', marginBottom: '2px' }}>
              {metric.name}: {metric.duration?.toFixed(1)}ms
            </div>
          ))}
          
          <div style={{ marginTop: '8px', fontSize: '10px' }}>
            <button
              onClick={() => {
                performanceMonitor.clear();
                setMetrics([]);
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '10px',
              }}
            >
              Clear Metrics
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Hook for component-level performance monitoring
export function usePerformanceMonitoring(componentName: string) {
  const [renderCount, setRenderCount] = useState(0);
  const [lastRenderTime, setLastRenderTime] = useState<number | null>(null);

  useEffect(() => {
    const startTime = performance.now();
    setRenderCount(prev => prev + 1);
    
    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      setLastRenderTime(renderTime);
      
      if (renderTime > 16) { // Longer than one frame at 60fps
        console.warn(`Slow render in ${componentName}: ${renderTime.toFixed(2)}ms`);
      }
    };
  });

  return {
    renderCount,
    lastRenderTime,
  };
}