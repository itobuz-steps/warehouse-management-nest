export interface TablePayload {
  title: string;
  columns: {
    key: string;
    label: string;
    type: 'string' | 'number' | 'date' | 'currency';
  }[];
  rows: Record<string, unknown>[];
  summary?: string;
}

export interface ChartPayload {
  chartType: 'bar' | 'line' | 'pie' | 'doughnut' | 'area' | 'stacked-bar';
  title: string;
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string[];
  }[];
}

export interface ListPayload {
  title: string;
  items: { label: string; value?: string | number; badge?: string }[];
}

export interface MetricPayload {
  label: string;
  value: string | number;
  change?: string;
  icon?: string;
}

export interface ChatResponsePayload {
  text: string;
  tables?: TablePayload[];
  charts?: ChartPayload[];
  lists?: ListPayload[];
  metrics?: MetricPayload[];
  sessionId: string;
}
