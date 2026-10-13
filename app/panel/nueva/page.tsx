import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth';
import ChainForm from '@/components/ChainForm';

export const metadata = { title: 'Nueva cadena' };

export default async function NewChainPage() {
  if (!(await getUser())) redirect('/ingresar');
  return <ChainForm />;
}
