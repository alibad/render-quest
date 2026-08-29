import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { LabPage } from '@/components/lab/LabPage';
import { TextureLab } from '@/components/labs/TextureLab';
import { getLab } from '@/lib/labs';

const lab = getLab('textures');

export const metadata: Metadata = {
  title: lab?.title,
  description: lab?.blurb,
  alternates: { canonical: '/labs/textures' },
};

export default function TextureLabPage() {
  if (!lab) notFound();
  return (
    <LabPage lab={lab}>
      <TextureLab />
    </LabPage>
  );
}
