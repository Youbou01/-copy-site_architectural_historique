import { RenderMode, ServerRoute } from '@angular/ssr';

// Prerender only static routes; render dynamic routes on the client to avoid server-side data fetch issues
export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'patrimoines', renderMode: RenderMode.Prerender },
  { path: '**', renderMode: RenderMode.Client }
];
