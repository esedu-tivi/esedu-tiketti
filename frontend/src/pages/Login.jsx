import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';
import { Button } from '../components/ui/Button';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Jos käyttäjä on jo kirjautunut, ohjataan alkuperäiseen kohteeseen tai etusivulle
    if (user) {
      const destination = location.state?.from || '/';
      navigate(destination);
    }
  }, [user, navigate, location]);

  const handleLogin = async () => {
    try {
      await login();
      const destination = location.state?.from || '/';
      navigate(destination);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-6 shadow-lg">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
            Kirjaudu sisään
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Kirjaudu sisään Esedu-tunnuksillasi
          </p>
        </div>
        <div className="mt-8">
          <Button
            onClick={handleLogin}
            className="w-full"
          >
            Kirjaudu Microsoft-tunnuksilla
          </Button>
        </div>
      </div>
    </div>
  );
} 