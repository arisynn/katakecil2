import type { SystemSettings } from '@/types/settings';

/** Old installations adopt the carousel without resetting any reading settings. */
export function libraryPresentation(
  settings: Pick<SystemSettings, 'libraryViewMode' | 'libraryCarouselEnabled'>,
  view?: string | null,
) {
  if (view === 'carousel' || view === 'grid' || view === 'list') return view;
  return settings.libraryCarouselEnabled === false ? settings.libraryViewMode : 'carousel';
}
