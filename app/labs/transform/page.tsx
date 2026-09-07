import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { LabPage } from '@/components/lab/LabPage';
import { TransformEssay } from '@/components/labs/TransformEssay';
import { TransformLab } from '@/components/labs/TransformLab';
import { getLab } from '@/lib/labs';
import { pageMetadata } from '@/lib/metadata';

const lab = getLab('transform');

export const metadata: Metadata = pageMetadata({
  title: lab?.title ?? 'Lab',
  description: lab?.blurb ?? '',
  path: '/labs/transform',
});

export default function TransformLabPage() {
  if (!lab) notFound();
  return (
    <LabPage lab={lab}>
      <TransformEssay />
      <div className="mt-10">
        <TransformLab />
      </div>
    </LabPage>
  );
}
