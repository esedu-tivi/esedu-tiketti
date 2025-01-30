import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../providers/AuthProvider';

export default function AuthGuard({ children }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user && location.pathname !== '/login') {
      // Tallennetaan alkuperäinen kohde, jotta voidaan palata siihen kirjautumisen jälkeen
      navigate('/login', { state: { from: location.pathname } });
    }
  }, [user, loading, navigate, location]);

  // Näytetään tyhjää kun tarkistetaan autentikaatiota
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="mt-2 text-sm text-gray-500">Ladataan...</p>
        </div>
      </div>
    );
  }

  // Jos käyttäjä ei ole kirjautunut ja ei olla login-sivulla, ei näytetä mitään
  if (!user && location.pathname !== '/login') {
    return null;
  }

  // Jos käyttäjä on kirjautunut tai ollaan login-sivulla, näytetään sisältö
  return children;
}