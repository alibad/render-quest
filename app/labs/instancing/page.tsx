import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { LabPage } from '@/components/lab/LabPage';
import { InstancingLab } from '@/components/labs/InstancingLab';
import { getLab } from '@/lib/labs';

const lab = getLab('instancing');

export const metadata: Metadata = {
  title: lab?.title,
  description: lab?.blurb,
  alternates: { canonical: '/labs/instancing' },
};

export default function InstancingLabPage() {
  if (!lab) notFound();
  return (
    <LabPage lab={lab}>
      <InstancingLab />
    </LabPage>
  );
}
