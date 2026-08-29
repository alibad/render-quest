import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { LabPage } from '@/components/lab/LabPage';
import { ShadingLab } from '@/components/labs/ShadingLab';
import { getLab } from '@/lib/labs';

const lab = getLab('shading');

export const metadata: Metadata = {
  title: lab?.title,
  description: lab?.blurb,
};

export default function ShadingLabPage() {
  if (!lab) notFound();
  return (
    <LabPage lab={lab}>
      <ShadingLab />
    </LabPage>
  );
}
