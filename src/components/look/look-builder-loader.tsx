'use client';
import dynamic from 'next/dynamic';
import type { ComponentProps, ReactElement } from 'react';
import type { LookBuilder } from '@/components/look/look-builder';

const Builder = dynamic(() => import('@/components/look/look-builder').then((m) => m.LookBuilder));
export function LookBuilderLoader(props: ComponentProps<typeof LookBuilder>): ReactElement {
  return <Builder {...props} />;
}
