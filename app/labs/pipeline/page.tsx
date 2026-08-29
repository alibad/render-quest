import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { LabPage } from '@/components/lab/LabPage';
import { PipelineLab } from '@/components/labs/PipelineLab';
import { getLab } from '@/lib/labs';

const lab = getLab('pipeline');

export const metadata: Metadata = {
  title: lab?.title,
  description: lab?.blurb,
  alternates: { canonical: '/labs/pipeline' },
};

export default function PipelineLabPage() {
  if (!lab) notFound();
  return (
    <LabPage lab={lab}>
      <PipelineLab />
    </LabPage>
  );
}
