import React from 'react';

// Performance monitoring utilities
export interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private isEnabled: boolean = process.env.NODE_ENV === 'development';

  // Start timing a performance metric
  startTiming(name: string, metadata?: Record<string, any>): void {
    if (!this.isEnabled) return;

    const metric: PerformanceMetric = {
      name,
      startTime: performance.now(),
      ...(metadata && { metadata }),
    };
    
    this.metrics.set(name, metric);
  }

  // End timing and calculate duration
  endTiming(name: string): number | null {
    if (!this.isEnabled) return null;

    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`Performance metric "${name}" not found`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - metric.startTime;
    
    metric.endTime = endTime;
    metric.duration = duration;

    // Log slow operations (> 100ms)
    if (duration > 100) {
      console.warn(`Slow operation detected: ${name} took ${duration.toFixed(2)}ms`, metric.metadata);
    }

    return duration;
  }

  // Measure a function execution time
  measure<T>(name: string, fn: () => T, metadata?: Record<string, any>): T {
    if (!this.isEnabled) return fn();

    this.startTiming(name, metadata);
    try {
      const result = fn();
      return result;
    } finally {
      this.endTiming(name);
    }
  }

  // Measure async function execution time
  async measureAsync<T>(name: string, fn: () => Promise<T>, metadata?: Record<string, any>): Promise<T> {
    if (!this.isEnabled) return fn();

    this.startTiming(name, metadata);
    try {
      const result = await fn();
      return result;
    } finally {
      this.endTiming(name);
    }
  }

  // Get all metrics
  getMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values());
  }

  // Get metrics summary
  getSummary(): Record<string, { count: number; totalTime: number; avgTime: number; maxTime: number }> {
    const summary: Record<string, { count: number; totalTime: number; avgTime: number; maxTime: number }> = {};
    
    this.metrics.forEach(metric => {
      if (!metric.duration) return;
      
      if (!summary[metric.name]) {
        summary[metric.name] = { count: 0, totalTime: 0, avgTime: 0, maxTime: 0 };
      }
      
      summary[metric.name].count++;
      summary[metric.name].totalTime += metric.duration;
      summary[metric.name].maxTime = Math.max(summary[metric.name].maxTime, metric.duration);
      summary[metric.name].avgTime = summary[metric.name].totalTime / summary[metric.name].count;
    });
    
    return summary;
  }

  // Clear all metrics
  clear(): void {
    this.metrics.clear();
  }

  // Enable/disable monitoring
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Decorator for measuring method performance
export function measurePerformance(name?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const metricName = name || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = function (...args: any[]) {
      return performanceMonitor.measure(metricName, () => originalMethod.apply(this, args));
    };

    return descriptor;
  };
}

// Hook for measuring React component render performance
export function usePerfMeasure(componentName: string) {
  const startTime = performance.now();
  
  React.useEffect(() => {
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    if (duration > 16) { // Longer than one frame (60fps)
      console.warn(`Slow render: ${componentName} took ${duration.toFixed(2)}ms`);
    }
  });
}

// Memory usage monitoring
export function getMemoryUsage(): { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } | null {
  if ('memory' in performance) {
    return (performance as any).memory;
  }
  return null;
}

// Log memory usage
export function logMemoryUsage(label: string): void {
  const memory = getMemoryUsage();
  if (memory) {
    console.log(`Memory usage (${label}):`, {
      used: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
      total: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
      limit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`,
    });
  }
}

// Bundle size analyzer (development only)
export function analyzeBundleSize(): void {
  if (process.env.NODE_ENV !== 'development') return;
  
  // This would typically integrate with webpack-bundle-analyzer
  console.log('Bundle analysis would be performed here in a real implementation');
}