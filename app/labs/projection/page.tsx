import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { LabPage } from '@/components/lab/LabPage';
import { ProjectionLab } from '@/components/labs/ProjectionLab';
import { getLab } from '@/lib/labs';
import { pageMetadata } from '@/lib/metadata';

const lab = getLab('projection');

export const metadata: Metadata = pageMetadata({
  title: lab?.title ?? 'Lab',
  description: lab?.blurb ?? '',
  path: '/labs/projection',
});

export default function ProjectionLabPage() {
  if (!lab) notFound();
  return (
    <LabPage lab={lab}>
      <ProjectionLab />
    </LabPage>
  );
}
