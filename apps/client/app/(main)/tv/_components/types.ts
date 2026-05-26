export interface EpgProgram {
  id:        string;
  title:     string;
  startTime: string;
  endTime:   string;
  category?: string;
}

export interface EpgChannel {
  id:       string;
  name:     string;
  slug:     string;
  programs: EpgProgram[];
}

/* Channel.thumbnailUrl null үед ашиглах placeholder */
export const FALLBACK_LOGO = "/mnbtv.png";
