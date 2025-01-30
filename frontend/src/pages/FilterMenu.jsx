function FilterMenu() {
  return (
    <div id="filter-menu">
      <h2 id="filter-menu-heading">Suodatinvalikko</h2>
      <div className="filter-content">
        <div className="filter-row">
          <div className="filter-item">
            <label htmlFor="status-filter">Tila:</label>
            <select id="status-filter">
              <option value="all">Kaikki</option>
              <option value="open">Avoin</option>
              <option value="closed">Suljettu</option>
            </select>
          </div>
          <div className="filter-item">
            <label htmlFor="priority-filter">Prioriteetti:</label>
            <select id="priority-filter">
              <option value="all">Kaikki</option>
              <option value="high">Korkea</option>
              <option value="normal">Normaali</option>
              <option value="low">Matala</option>
            </select>
          </div>
        </div>
        <div className="filter-group">
          <div className="filter-item">
            <label htmlFor="subject-filter">Aihe:</label>
            <input
              type="text"
              id="subject-filter"
              placeholder="Kirjoita aihe"
            />
          </div>
          <div className="filter-item">
            <label htmlFor="user-filter">Käyttäjä:</label>
            <input
              type="text"
              id="user-filter"
              placeholder="Kirjoita käyttäjän nimi"
            />
          </div>
          <div className="filter-item">
            <label htmlFor="device-filter">Laite:</label>
            <input
              type="text"
              id="device-filter"
              placeholder="Kirjoita laitteen nimi"
            />
          </div>
          <div className="filter-item">
            <label>Päivämäärä</label>
            <div className="date-filter">
              <label htmlFor="start-date">Alkaen:</label>
              <input type="date" id="start-date" />
              <label htmlFor="end-date">Päättyen:</label>
              <input type="date" id="end-date" />
            </div>
          </div>
        </div>
        <button id="clear-filters" className="clear-filters-btn">
          Tyhjennä suodattimet
        </button>
      </div>
    </div>
  );
}

export default FilterMenu;
