import { PiBooks } from 'react-icons/pi';
import { useTranslation } from '@/hooks/useTranslation';

export default function LibraryEmptyState() {
  const _ = useTranslation();
  return (
    <div className='hero-content text-neutral-content text-center'>
      <div className='flex max-w-md flex-col items-center'>
        <PiBooks aria-hidden className='text-base-content/60 mb-10 size-16' />
        <h1 className='mb-5 text-balance text-4xl font-semibold leading-tight tracking-tight'>
          {_('Your Library')}
        </h1>
        <p className='text-base-content/70 text-pretty text-base leading-relaxed'>
          {_('Published books will appear here automatically.')}
        </p>
      </div>
    </div>
  );
}
