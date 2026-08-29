import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { LabPage } from '@/components/lab/LabPage';
import { TransformLab } from '@/components/labs/TransformLab';
import { getLab } from '@/lib/labs';

const lab = getLab('transform');

export const metadata: Metadata = {
  title: lab?.title,
  description: lab?.blurb,
};

export default function TransformLabPage() {
  if (!lab) notFound();
  return (
    <LabPage lab={lab}>
      <TransformLab />
    </LabPage>
  );
}
