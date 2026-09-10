import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { LabPage } from '@/components/lab/LabPage';
import { PipelineEssay } from '@/components/labs/PipelineEssay';
import { PipelineLab } from '@/components/labs/PipelineLab';
import { essayOutline } from '@/lib/essay-outline';
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
    <LabPage lab={lab} outline={essayOutline('pipeline')}>
      <PipelineEssay />
      <div className="mt-10">
        <PipelineLab />
      </div>
    </LabPage>
  );
}
