import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { LabPage } from '@/components/lab/LabPage';
import { PipelineLab } from '@/components/labs/PipelineLab';
import { getLab } from '@/lib/labs';
import { pageMetadata } from '@/lib/metadata';

const lab = getLab('pipeline');

export const metadata: Metadata = pageMetadata({
  title: lab?.title ?? 'Lab',
  description: lab?.blurb ?? '',
  path: '/labs/pipeline',
});

export default function PipelineLabPage() {
  if (!lab) notFound();
  return (
    <LabPage lab={lab}>
      <PipelineLab />
    </LabPage>
  );
}
