import React, { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "../components/ui/Card";
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/Button';
import { Select, SelectItem, SelectTrigger, SelectValue, SelectContent } from '../components/ui/Select';
import { Label } from '../components/ui/Label';
import { fetchCategories } from '../utils/api';

const defaultFilters = {
  status: '',
  priority: '',
  category: '',
  subject: '',
  user: '',
  device: '',
  startDate: '',
  endDate: '',
};

function FilterMenu({ onFilterChange, isOpen, setIsOpen, isMyTickets }) {
  const [filters, setFilters] = useState(defaultFilters);
  const [categories, setCategories] = useState([]);

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

  const handleChange = (name, value) => {
    setFilters((filters) => {
      const newFilters = { ...filters};
      if (value) {
        newFilters[name] = value;
      } else {
        delete newFilters[name];
      }
      onFilterChange(newFilters);
      return newFilters;
    }); 
  };

  // Suodattimien alustus
  const clearFilters = () => {
    setFilters(defaultFilters);
    onFilterChange({});
  };

  // Avaa tai sulje suodatinvalikko
  const toggleFilterMenu = () => setIsOpen(!isOpen);

  return (
    <Card className="w-full mx-auto p-6">
      <CardHeader>
        <CardTitle>Suodatinvalikko</CardTitle>
        <CardDescription>Suodata tikettejä</CardDescription>
        <Button onClick={toggleFilterMenu} className="mt-4 w-full">
          {isOpen ? 'Sulje suodatinvalikko' : 'Avaa suodatinvalikko'}
        </Button>
      </CardHeader>

      {isOpen && (
        <CardContent>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="status-filter">Tila:</Label>
              <Select
                id="status-filter"
                value={filters.status}
                onValueChange={(value) => handleChange("status", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Valitse tila" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open" className="hover:bg-blue-200">Avoin</SelectItem>
                  <SelectItem value="in_progress" className="hover:bg-blue-200">Käsittelyssä</SelectItem>
                  <SelectItem value="resolved" className="hover:bg-blue-200">Ratkaistu</SelectItem>
                  <SelectItem value="closed" className="hover:bg-blue-200">Suljettu</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority-filter">Prioriteetti:</Label>
              <Select
                id="priority-filter"
                value={filters.priority}
                onValueChange={(value) => handleChange("priority", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Valitse prioriteetti" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical" className="hover:bg-blue-200">Kriittinen</SelectItem>
                  <SelectItem value="high" className="hover:bg-blue-200">Korkea</SelectItem>
                  <SelectItem value="medium" className="hover:bg-blue-200">Normaali</SelectItem>
                  <SelectItem value="low" className="hover:bg-blue-200">Matala</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category-filter">Kategoria:</Label>
              <Select
                id="category-filter"
                value={filters.category}
                onValueChange={(value) => handleChange("category", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Valitse kategoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem 
                      key={category.id} 
                      value={category.name}
                      className="hover:bg-blue-200"
                    >
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject-filter">Aihe:</Label>
              <Input
                type="text"
                id="subject-filter"
                name="subject"
                value={filters.subject}
                onChange={(e) => handleChange("subject", e.target.value)}
                placeholder="Kirjoita aihe"
              />
            </div>

            {!isMyTickets && (
              <div className="space-y-2">
                <Label htmlFor="user-filter">Käyttäjä:</Label>
                <Input
                  type="text"
                  id="user-filter"
                  name="user"
                  value={filters.user}
                  onChange={(e) => handleChange("user", e.target.value)}
                  placeholder="Kirjoita käyttäjän nimi"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="device-filter">Laite:</Label>
              <Input
                type="text"
                id="device-filter"
                name="device"
                value={filters.device}
                onChange={(e) => handleChange("device", e.target.value)}
                placeholder="Kirjoita laitteen nimi"
              />
            </div>

            <div className="space-y-2">
              <Label>Päivämäärä</Label>
              <div className="flex space-x-4">
                <div className="flex flex-col">
                  <Label htmlFor="start-date">Alkaen:</Label>
                  <Input
                    type="date"
                    id="start-date"
                    name="startDate"
                    max={new Date().toISOString().split('T')[0]}
                    value={filters.startDate}
                    onChange={(e) => handleChange("startDate", e.target.value)}
                  />
                </div>
                <div className="flex flex-col">
                  <Label htmlFor="end-date">Päättyen:</Label>
                  <Input
                    type="date"
                    id="end-date"
                    name="endDate"
                    max={new Date().toISOString().split('T')[0]}
                    value={filters.endDate}
                    onChange={(e) => handleChange("endDate", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      )}

      {isOpen && (
        <CardFooter className="flex justify-between">
          <Button className="w-32 mt-4 bg-red-400 text-white hover:bg-red-500" onClick={clearFilters}> Tyhjennä suodattimet </Button>
        </CardFooter>
      )}
    </Card>
  );
}

export default FilterMenu;