import { Link } from 'react-router-dom'

function Header() {
  return (
    <header className="header">
      <div className="header-content">
        <h1>Tikettijärjestelmä</h1>
        <nav>
          <ul>
            <li><Link to="/">Tiketit</Link></li>
            <li><Link to="/new-ticket">Luo tiketti</Link></li>
            <li><Link to="/login">Kirjaudu</Link></li>
          </ul>
        </nav>
      </div>
    </header>
  )
}

export default Header 