import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { LabPage } from '@/components/lab/LabPage';
import { InstancingEssay } from '@/components/labs/InstancingEssay';
import { InstancingLab } from '@/components/labs/InstancingLab';
import { getLab } from '@/lib/labs';
import { pageMetadata } from '@/lib/metadata';

const lab = getLab('instancing');

export const metadata: Metadata = pageMetadata({
  title: lab?.title ?? 'Lab',
  description: lab?.blurb ?? '',
  path: '/labs/instancing',
});

export default function InstancingLabPage() {
  if (!lab) notFound();
  return (
    <LabPage lab={lab}>
      <InstancingEssay />
      <div className="mt-10">
        <InstancingLab />
      </div>
    </LabPage>
  );
}
