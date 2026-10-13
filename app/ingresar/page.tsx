import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth';
import AuthForm from '@/components/AuthForm';

export const metadata = { title: 'Ingresar' };

export default async function LoginPage() {
  if (await getUser()) redirect('/panel');
  return <AuthForm mode="login" />;
}
