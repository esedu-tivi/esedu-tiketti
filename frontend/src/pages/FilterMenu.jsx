import React, { useState, useEffect } from "react";
import { CardContent, CardFooter } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { Label } from "../components/ui/Label";
import { Checkbox } from "../components/ui/Checkbox";
import { ChevronDown } from "lucide-react";
import { fetchCategories } from "../utils/api";
import '../index.css';

const defaultFilters = {
  status: [],
  priority: [],
  category: [],
  subject: "",
  user: "",
  device: "",
  startDate: "",
  endDate: "",
};

function FilterMenu({ onFilterChange, isOpen, setIsOpen, isMyTickets }) {
  const [filters, setFilters] = useState(defaultFilters);
  const [categories, setCategories] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [dateError, setDateError] = useState("");

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await fetchCategories();
        setCategories(response.categories || []);
      } catch (error) {
        console.error('Error loading categories:', error);
      }
    };
    loadCategories();
  }, []);

  const handleCheckboxChange = (key, value, checked) => {
    console.log(`Checkbox changed - Key: ${key}, Value: ${value}, Checked: ${checked}`);
    setFilters((currentFilters) => {
      const updatedFilters = checked
        ? [...currentFilters[key], value]
        : currentFilters[key].filter((item) => item !== value);

      const newFilters = { ...currentFilters, [key]: updatedFilters };
      console.log("Päivitetyt suodattimet:", newFilters);
      onFilterChange(newFilters);
      return newFilters;
    });
  };

  const handleChange = (name, value) => {
    setFilters((filters) => {
      const newFilters = { ...filters};
      if (value) {
        newFilters[name] = value;
      } else {
        newFilters[name]= "";
      }

      if (newFilters.startDate && newFilters.endDate) {
        if (newFilters.startDate > newFilters.endDate) {
          setDateError("Alkupäivämäärä ei voi olla myöhemmin kuin päättymispäivämäärä!");
          newFilters.endDate = newFilters.startDate; // Jos startDate on suurempi kuin endDate, asetetaan endDate samaksi
        } else {
          setDateError(""); // Tyhjennetään virheilmoitus
        }
      }
      onFilterChange(newFilters);
      return newFilters;
    }); 
  };

  // Suodattimien alustus
  const clearFilters = () => {
    setFilters(defaultFilters);
    setDateError("");
    onFilterChange({});
  };

  // Avaa tai sulje suodatinvalikko
  const toggleFilterMenu = () => setIsOpen(!isOpen);

  // Suodatinpalkin hakukentän käsittely
  const handleSearchChange = (e) => {
    setSearchInput(e.target.value);
    handleChange("subject", e.target.value);
  };

  return (
    <div className="container mx-auto mt-0 mb-0 sticky top-0 shadow-md border border-gray-300 rounded-b-md">
      <div
        className="flex items-center gap-3 px-4 py-1 cursor-pointer bg-gradient-to-r from-blue-500 to-indigo-600 rounded-b-md"
        onClick={() => toggleFilterMenu()}
      >
      <div className="flex items-center gap-3">
        <h3 className="text-white text-left font-semibold p-1 w-32">
          {isOpen ? "Sulje suodatin" : "Näytä suodatin"}
        </h3>

        <Input 
        type= "text"
        placeholder="Hae aiheesta"
        value={searchInput}
        onChange={handleSearchChange}
        onClick={(e) => e.stopPropagation()} // Estää suodatinvalikon avautumisen ja sulkeutumisen kun hakukenttää klikataan
        className="w-40 md:w-60 h-7 border-1 rounded-full bg-white bg-opacity-30 text-white placeholder-white px-2 py-1 text-sm"
        />
      </div>
      <div className="ml-auto">
        <ChevronDown className={`w-5 h-5 text-white transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
      </div>
    </div>

      <div className={`filter-menu-content ${isOpen ? 'open' : 'closed'}`}>
        <CardContent className="bg-white shadow-md">
          <div className="flex gap-4 flex-wrap">
            <div className="space-y-1">
              <Label>Tila:</Label>
              <div className="flex flex-col gap-2">
                {["open", "in_progress", "resolved", "closed"].map((status) => (
                  <label key={status} className="flex items-center gap-2 cursor-pointer text-sm">
                    <Checkbox
                      checked={filters.status.includes(status)}
                      onCheckedChange={(checked) =>
                        handleCheckboxChange("status", status, checked === true)
                      }
                    />
                    {status === "open" && "Avoin"}
                    {status === "in_progress" && "Käsittelyssä"}
                    {status === "resolved" && "Ratkaistu"}
                    {status === "closed" && "Suljettu"}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Label>Prioriteetti:</Label>
              <div className="flex flex-col gap-2">
                {["critical", "high", "medium", "low"].map((priority) => (
                  <label key={priority} className="flex items-center gap-2 cursor-pointer text-sm">
                    <Checkbox
                      checked={filters.priority.includes(priority)}
                      onCheckedChange={(checked) =>
                        handleCheckboxChange("priority", priority, checked === true)
                      }
                    />
                    {priority === "critical" && "Kriittinen"}
                    {priority === "high" && "Korkea"}
                    {priority === "medium" && "Normaali"}
                    {priority === "low" && "Matala"}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Label>Kategoria:</Label>
              <div className="flex flex-col gap-2">
                {categories.map((category) => (
                  <label key={category.id} className="flex items-center gap-2 cursor-pointer text-sm">
                    <Checkbox
                      checked={filters.category.includes(category.name)}
                      onCheckedChange={(checked) =>
                        handleCheckboxChange("category", category.name, checked === true)
                      }
                    />
                    {category.name}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="subject-filter">Aihe:</Label>
              <Input
                type="text"
                id="subject-filter"
                name="subject"
                value={filters.subject || ""}
                onChange={(e) => handleChange("subject", e.target.value)}
                placeholder="Kirjoita aihe"
                className="border-2 border-gray-400 rounded hover:border-blue-500"
              />
            </div>

            {!isMyTickets && (
              <div className="space-y-1">
                <Label htmlFor="user-filter">Käyttäjä:</Label>
                <Input
                  type="text"
                  id="user-filter"
                  name="user"
                  value={filters.user || "" }
                  onChange={(e) => handleChange("user", e.target.value)}
                  placeholder="Kirjoita käyttäjän nimi"
                  className="border-2 border-gray-400 rounded hover:border-blue-500"
                />
              </div>
            )}
            
            <div className="space-y-1">
              <Label htmlFor="device-filter">Laite:</Label>
              <Input
                type="text"
                id="device-filter"
                name="device"
                value={filters.device || "" }
                onChange={(e) => handleChange("device", e.target.value)}
                placeholder="Kirjoita laiteen nimi"
                className="border-2 border-gray-400 rounded hover:border-blue-500"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="start-date">Alkaen pvm:</Label>
              <Input
                type="date"
                id="start-date"
                name="startDate"
                max={new Date().toISOString().split('T')[0]}
                value={filters.startDate || "" }
                onChange={(e) => handleChange("startDate", e.target.value)}
                className="border-2 border-gray-400 rounded hover:border-blue-500"
              />
              {dateError && (
                  <p className="absolute text-red-500 text-sm mt-1 whitespace-nowrap">
                    {dateError}
                  </p>
                )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="end-date">Päättyen pvm:</Label>
              <Input
                type="date"
                id="end-date"
                name="endDate"
                max={new Date().toISOString().split('T')[0]}
                value={filters.endDate || "" }
                onChange={(e) => handleChange("endDate", e.target.value)}
                className="border-2 border-gray-400 rounded hover:border-blue-500"
              />
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-between bg-white">
          <Button className="w-28 bg-red-400 text-white text-sm hover:bg-red-500" onClick={clearFilters}>Tyhjennä suodattimet</Button>
        </CardFooter>
      </div>
    </div>
  );
}

export default FilterMenu;