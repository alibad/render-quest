import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { LabPage } from '@/components/lab/LabPage';
import { ColourEssay } from '@/components/labs/ColourEssay';
import { ColourLab } from '@/components/labs/ColourLab';
import { essayOutline } from '@/lib/essay-outline';
import { getLab } from '@/lib/labs';
import { pageMetadata } from '@/lib/metadata';

const lab = getLab('colour');

export const metadata: Metadata = pageMetadata({
  title: lab?.title ?? 'Lab',
  description: lab?.blurb ?? '',
  path: '/labs/colour',
});

export default function ColourLabPage() {
  if (!lab) notFound();
  return (
    <LabPage lab={lab} outline={essayOutline('colour')}>
      <ColourEssay />
      <div className="mt-10">
        <ColourLab />
      </div>
    </LabPage>
  );
}
