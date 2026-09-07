import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { LabPage } from '@/components/lab/LabPage';
import { ShadingEssay } from '@/components/labs/ShadingEssay';
import { ShadingLab } from '@/components/labs/ShadingLab';
import { getLab } from '@/lib/labs';
import { pageMetadata } from '@/lib/metadata';

const lab = getLab('shading');

export const metadata: Metadata = pageMetadata({
  title: lab?.title ?? 'Lab',
  description: lab?.blurb ?? '',
  path: '/labs/shading',
});

export default function ShadingLabPage() {
  if (!lab) notFound();
  return (
    <LabPage lab={lab}>
      <ShadingEssay />
      <div className="mt-10">
        <ShadingLab />
      </div>
    </LabPage>
  );
}
