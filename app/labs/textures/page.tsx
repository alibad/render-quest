import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { LabPage } from '@/components/lab/LabPage';
import { TextureLab } from '@/components/labs/TextureLab';
import { TexturesEssay } from '@/components/labs/TexturesEssay';
import { essayOutline } from '@/lib/essay-outline';
import { getLab } from '@/lib/labs';
import { pageMetadata } from '@/lib/metadata';

const lab = getLab('textures');

export const metadata: Metadata = pageMetadata({
  title: lab?.title ?? 'Lab',
  description: lab?.blurb ?? '',
  path: '/labs/textures',
});

export default function TextureLabPage() {
  if (!lab) notFound();
  return (
    <LabPage lab={lab} outline={essayOutline('textures')}>
      <TexturesEssay />
      <div className="mt-10">
        <TextureLab />
      </div>
    </LabPage>
  );
}
