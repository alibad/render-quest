import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { LabPage } from '@/components/lab/LabPage';
import { ShaderLab } from '@/components/labs/ShaderLab';
import { getLab } from '@/lib/labs';

const lab = getLab('shader');

export const metadata: Metadata = {
  title: lab?.title,
  description: lab?.blurb,
  alternates: { canonical: '/labs/shader' },
};

export default function ShaderLabPage() {
  if (!lab) notFound();
  return (
    <LabPage lab={lab}>
      <ShaderLab />
    </LabPage>
  );
}
