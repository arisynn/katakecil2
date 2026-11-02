import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, BookOpen, RotateCw } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import ReaderTitle from './ReaderTitle';

/** Loading is recoverable; retries keep the saved location and annotations. */
export default function ReaderLoadScreen({
  title,
  error = false,
  restoring = false,
  onRetry,
  onBack,
}: {
  title: string;
  error?: boolean;
  restoring?: boolean;
  onRetry: () => void;
  onBack: () => void;
}) {
  const _ = useTranslation();
  const headerRef = useRef<HTMLDivElement>(null);
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), 8000);
    return () => clearTimeout(timer);
  }, []);
  return (
    <section className='kk-reader-load bg-base-100' aria-label={_('Book loading')}>
      <div ref={headerRef} className='kk-reader-load-header'>
        <div data-title-start>
          <button className='kk-circle-button' aria-label={_('Go to Library')} onClick={onBack}>
            <ArrowLeft size={22} className='rtl:rotate-180' />
          </button>
        </div>
        <ReaderTitle title={title} headerRef={headerRef} />
      </div>
      <div className='kk-reader-load-content' role={error ? 'alert' : 'status'} aria-live='polite'>
        <BookOpen size={32} aria-hidden='true' />
        <h1>
          {error
            ? 'Buku belum dapat dibuka'
            : restoring
              ? 'Mengembalikan posisi baca…'
              : 'Menyiapkan halaman…'}
        </h1>
        <p>
          {error
            ? 'Posisi baca dan anotasi tersimpan tetap dipertahankan. Silakan coba lagi.'
            : slow
              ? 'Proses ini memerlukan waktu lebih lama. Anda dapat mencoba lagi atau kembali ke rak.'
              : 'Kata Kecil'}
        </p>
        {(error || slow) && (
          <div className='kk-reader-load-actions'>
            <button className='btn btn-contrast' onClick={onRetry}>
              <RotateCw size={18} />
              Coba lagi
            </button>
            <button className='btn btn-ghost eink-bordered' onClick={onBack}>
              Kembali ke rak
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
