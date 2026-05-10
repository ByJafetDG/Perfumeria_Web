import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

export default function AdminGuard({ children }) {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState('checking'); // 'checking' | 'allowed' | 'denied'

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      navigate('/login?redirect=/admin', { replace: true });
      return;
    }

    supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.role === 'admin') {
          setStatus('allowed');
        } else {
          setStatus('denied');
          navigate('/', { replace: true });
        }
      });
  }, [user, authLoading]);

  if (status === 'checking') return null;
  if (status !== 'allowed') return null;
  return children;
}
