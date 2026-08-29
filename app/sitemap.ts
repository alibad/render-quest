import type { MetadataRoute } from 'next';

import { LIVE_LABS } from '@/lib/labs';
import { SITE_URL } from '@/lib/site';
import { TECHNOLOGIES } from '@/lib/technologies';

/**
 * Built from the same data the pages render from, so a new lab or technology
 * cannot be added without appearing here.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    { path: '', priority: 1 },
    { path: '/labs', priority: 0.9 },
    { path: '/tech', priority: 0.9 },
    { path: '/learn', priority: 0.9 },
    { path: '/glossary', priority: 0.7 },
    { path: '/about', priority: 0.5 },
    { path: '/privacy', priority: 0.2 },
  ];

  return [
    ...staticRoutes.map((route) => ({
      url: `${SITE_URL}${route.path}`,
      changeFrequency: 'monthly' as const,
      priority: route.priority,
    })),
    ...LIVE_LABS.map((lab) => ({
      url: `${SITE_URL}/labs/${lab.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    ...TECHNOLOGIES.map((tech) => ({
      url: `${SITE_URL}/tech/${tech.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ];
}
