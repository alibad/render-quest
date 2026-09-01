import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { LabPage } from '@/components/lab/LabPage';
import { ComputeLab } from '@/components/labs/ComputeLab';
import { getLab } from '@/lib/labs';
import { pageMetadata } from '@/lib/metadata';

const lab = getLab('compute');

export const metadata: Metadata = pageMetadata({
  title: lab?.title ?? 'Lab',
  description: lab?.blurb ?? '',
  path: '/labs/compute',
});

export default function ComputeLabPage() {
  if (!lab) notFound();
  return (
    <LabPage lab={lab}>
      <ComputeLab />
    </LabPage>
  );
}
