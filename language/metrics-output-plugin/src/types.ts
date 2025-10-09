export type MetricFunction = (...args: any[]) => any;

export type MetricValue =
  | Record<string, unknown>
  | number
  | string
  | boolean
  | MetricFunction;

export type MetricsRoot = Record<string, MetricValue> | MetricFunction;
export type MetricsStats = Record<string, MetricValue> | MetricFunction;
export type MetricsFeatures = Record<string, MetricValue> | MetricFunction;

export type MetricsContent = {
  stats: MetricsStats;
  features?: MetricsFeatures;
};

export type MetricsReport = MetricsRoot & {
  content: Record<string, MetricsContent>;
};

export type MetricItem = MetricsContent & {
  file: string;
  path?: string;
};
