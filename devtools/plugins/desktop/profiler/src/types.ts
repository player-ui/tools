export type ProfilerNode = {
  /**
   * hook name
   */
  name: string;
  /*
   * startTime of the hook
   */
  startTime?: number;
  /**
   * endTime of the hook
   */
  endTime?: number;
  /**
   * duration of hook resolution times
   * unit: ms
   */
  value?: number;
  /**
   * tooltip to be shown on hover
   */
  tooltip?: string;
  /**
   * subhook profiler nodes
   */
  children: ProfilerNode[];
};

export interface WrapperComponentProps {
  /** component's children */
  readonly children: React.ReactNode;
  /** Start profiler */
  startProfiler: () => void;
  /** Stop profiler */
  stopProfiler: () => ProfilerNode;
}
