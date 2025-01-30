import { Link } from 'react-router-dom'
import { Button } from '../ui/Button'
import { useAuth } from '../../providers/AuthProvider'

export default function Header() {
  const { user, logout } = useAuth()

  return (
    <header className="bg-white shadow">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Link to="/" className="text-xl font-bold text-gray-900">
              Tikettijärjestelmä
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Link to="/new-ticket">
                  <Button>Uusi tiketti</Button>
                </Link>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-700">{user.name}</span>
                  <Button variant="outline" onClick={logout}>
                    Kirjaudu ulos
                  </Button>
                </div>
              </>
            ) : (
              <Link to="/login">
                <Button>Kirjaudu sisään</Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  )
} 