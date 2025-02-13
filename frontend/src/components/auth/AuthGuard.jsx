import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../providers/AuthProvider';
import { Alert } from '../ui/Alert';

export default function AuthGuard({ children, requiredRole }) {
  const { user, loading, userRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Tarkistaa onko käyttäjällä vaaditut oikeudet
  const hasRequiredRole = () => {
    if (!requiredRole) return true;
    if (userRole === 'ADMIN') return true;

    // Jos requiredRole on taulukko, tarkista onko käyttäjän rooli jokin sallituista
    if (Array.isArray(requiredRole)) {
      return requiredRole.includes(userRole);
    }

    // Vanhat tarkistukset string-muotoisille rooleille
    if (requiredRole === 'ADMIN') return userRole === 'ADMIN';
    if (requiredRole === 'MANAGEMENT')
      return userRole === 'ADMIN' || userRole === 'SUPPORT';
    return userRole === requiredRole;
  };

  useEffect(() => {
    if (!loading) {
      if (!user && location.pathname !== '/login') {
        // Tallennetaan alkuperäinen kohde, jotta voidaan palata siihen kirjautumisen jälkeen
        navigate('/login', { state: { from: location.pathname } });
      } else if (user && requiredRole && !hasRequiredRole()) {
        // Jos vaaditaan tietty rooli ja käyttäjällä ei ole sitä
        navigate('/unauthorized');
      }
    }
  }, [user, loading, navigate, location, requiredRole, userRole]);

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

  // Jos vaaditaan tietty rooli ja käyttäjällä ei ole sitä
  if (requiredRole && !hasRequiredRole()) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Alert
          variant="error"
          title="Ei käyttöoikeutta"
          message="Sinulla ei ole tarvittavia oikeuksia tämän sivun katseluun."
        />
      </div>
    );
  }

  // Jos käyttäjä on kirjautunut ja hänellä on tarvittavat oikeudet, näytetään sisältö
  return children;
}
