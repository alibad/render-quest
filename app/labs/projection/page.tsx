import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { LabPage } from '@/components/lab/LabPage';
import { ProjectionLab } from '@/components/labs/ProjectionLab';
import { getLab } from '@/lib/labs';

const lab = getLab('projection');

export const metadata: Metadata = {
  title: lab?.title,
  description: lab?.blurb,
  alternates: { canonical: '/labs/projection' },
};

export default function ProjectionLabPage() {
  if (!lab) notFound();
  return (
    <LabPage lab={lab}>
      <ProjectionLab />
    </LabPage>
  );
}
