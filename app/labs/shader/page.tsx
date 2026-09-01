import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { LabPage } from '@/components/lab/LabPage';
import { ShaderLab } from '@/components/labs/ShaderLab';
import { getLab } from '@/lib/labs';
import { pageMetadata } from '@/lib/metadata';

const lab = getLab('shader');

export const metadata: Metadata = pageMetadata({
  title: lab?.title ?? 'Lab',
  description: lab?.blurb ?? '',
  path: '/labs/shader',
});

export default function ShaderLabPage() {
  if (!lab) notFound();
  return (
    <LabPage lab={lab}>
      <ShaderLab />
    </LabPage>
  );
}
