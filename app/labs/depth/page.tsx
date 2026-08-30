import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { LabPage } from '@/components/lab/LabPage';
import { DepthLab } from '@/components/labs/DepthLab';
import { getLab } from '@/lib/labs';

const lab = getLab('depth');

export const metadata: Metadata = {
  title: lab?.title,
  description: lab?.blurb,
  alternates: { canonical: '/labs/depth' },
};

export default function DepthLabPage() {
  if (!lab) notFound();
  return (
    <LabPage lab={lab}>
      <DepthLab />
    </LabPage>
  );
}
