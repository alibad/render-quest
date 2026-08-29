import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { LabPage } from '@/components/lab/LabPage';
import { ComputeLab } from '@/components/labs/ComputeLab';
import { getLab } from '@/lib/labs';

const lab = getLab('compute');

export const metadata: Metadata = {
  title: lab?.title,
  description: lab?.blurb,
  alternates: { canonical: '/labs/compute' },
};

export default function ComputeLabPage() {
  if (!lab) notFound();
  return (
    <LabPage lab={lab}>
      <ComputeLab />
    </LabPage>
  );
}
