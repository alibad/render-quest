import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { LabPage } from '@/components/lab/LabPage';
import { DepthEssay } from '@/components/labs/DepthEssay';
import { DepthLab } from '@/components/labs/DepthLab';
import { getLab } from '@/lib/labs';
import { pageMetadata } from '@/lib/metadata';

const lab = getLab('depth');

export const metadata: Metadata = pageMetadata({
  title: lab?.title ?? 'Lab',
  description: lab?.blurb ?? '',
  path: '/labs/depth',
});

export default function DepthLabPage() {
  if (!lab) notFound();
  return (
    <LabPage lab={lab}>
      <DepthEssay />
      <div className="mt-10">
        <DepthLab />
      </div>
    </LabPage>
  );
}
