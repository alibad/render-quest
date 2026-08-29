import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { LabPage } from '@/components/lab/LabPage';
import { ColourLab } from '@/components/labs/ColourLab';
import { getLab } from '@/lib/labs';

const lab = getLab('colour');

export const metadata: Metadata = {
  title: lab?.title,
  description: lab?.blurb,
  alternates: { canonical: '/labs/colour' },
};

export default function ColourLabPage() {
  if (!lab) notFound();
  return (
    <LabPage lab={lab}>
      <ColourLab />
    </LabPage>
  );
}
