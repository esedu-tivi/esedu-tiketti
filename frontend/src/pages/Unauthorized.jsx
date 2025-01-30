import { useNavigate } from 'react-router-dom';
import { Alert } from '../components/ui/Alert';

export default function Unauthorized() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6 rounded-lg bg-white p-6 shadow-lg">
          <div className="text-center">
            <h1 className="mb-4 text-2xl font-bold text-gray-900">
              Ei käyttöoikeutta
            </h1>
            <p className="mb-6 text-gray-600">
              Sinulla ei ole tarvittavia oikeuksia tämän sivun katseluun.
            </p>
          </div>

          <Alert
            variant="error"
            title="Pääsy estetty"
            message="Tämä sivu on tarkoitettu vain tietyille käyttäjärooleille."
          />
          
          <div className="mt-6 flex justify-center space-x-4">
            <button
              onClick={() => navigate('/my-tickets')}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Omat tikettini
            </button>
            
            <button
              onClick={() => navigate('/')}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Etusivulle
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 