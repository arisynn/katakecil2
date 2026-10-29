import { useRouter } from 'next/router';
import Reader from '@/app/reader/components/Reader';
export default function Page() {
  const router = useRouter();
  return <Reader ids={router.query['ids'] as string} />;
}
