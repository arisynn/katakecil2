'use client';
import { useTranslation } from '@/hooks/useTranslation';
export default function Offline() {
  const _ = useTranslation();
  return (
    <main className='flex min-h-dvh items-center justify-center p-6'>
      <div className='glass max-w-sm px-8 py-10 text-center'>
        <img src='/katakecil-mark.svg' alt='' className='kk-mark mx-auto mb-5 h-14 w-14' />
        <h1 className='text-xl font-semibold'>Kata Kecil</h1>
        <p className='kk-muted my-5 text-sm'>
          {_('You are offline. Previously saved books can be opened from your collection.')}
        </p>
        <a href='/library' className='btn btn-contrast'>
          {_('Go to Library')}
        </a>
      </div>
    </main>
  );
}
