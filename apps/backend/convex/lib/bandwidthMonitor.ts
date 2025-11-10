/**
 * Bandwidth monitoring utilities for development.
 * Use these helpers to wrap your queries and measure data transfer.
 */

export const measureQuerySize = <T>(data: T, queryName: string): T => {
  if (process.env.ENVIRONMENT === 'development') {
    const jsonSize = JSON.stringify(data).length;
    const sizeKB = (jsonSize / 1024).toFixed(2);
    const sizeMB = (jsonSize / (1024 * 1024)).toFixed(2);
    
    console.log(`[BANDWIDTH] ${queryName}:`, {
      sizeBytes: jsonSize,
      sizeKB: `${sizeKB} KB`,
      sizeMB: `${sizeMB} MB`,
      itemCount: Array.isArray(data) ? data.length : 1,
    });
  }
  return data;
};

export const measureFunctionBandwidth = async <T>(
  fn: () => Promise<T>,
  functionName: string
): Promise<T> => {
  const startTime = Date.now();
  const result = await fn();
  const endTime = Date.now();
  
  if (process.env.ENVIRONMENT === 'development') {
    const jsonSize = JSON.stringify(result).length;
    console.log(`[PERFORMANCE] ${functionName}:`, {
      executionTimeMs: endTime - startTime,
      bandwidthKB: (jsonSize / 1024).toFixed(2),
      itemCount: Array.isArray(result) ? result.length : 1,
    });
  }
  
  return result;
};
