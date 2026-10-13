import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth';
import AuthForm from '@/components/AuthForm';

export const metadata = { title: 'Crear cuenta' };

export default async function RegisterPage() {
  if (await getUser()) redirect('/panel');
  return <AuthForm mode="register" />;
}
