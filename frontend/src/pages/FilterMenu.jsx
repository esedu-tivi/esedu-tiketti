import React, { useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "../components/ui/Card";
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Select, SelectItem, SelectTrigger, SelectValue, SelectContent } from '../components/ui/Select';
import { Label } from '../components/ui/Label';

function FilterMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [category, setCategory] = useState('');
  const [subject, setSubject] = useState('');
  const [user, setUser] = useState('');
  const [device, setDevice] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const toggleFilterMenu = () => setIsOpen(!isOpen);

  const clearFilters = () => {
    setStatus('');
    setPriority('');
    setCategory('');
    setSubject('');
    setUser('');
    setDevice('');
    setStartDate('');
    setEndDate('');
  };

  return (
    <Card className="w-full mx-auto p-6">
      <CardHeader className="mb-4">
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
              <Select id="status-filter" value={status} onValueChange={(value) => setStatus(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Valitse tila" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Kaikki</SelectItem>
                  <SelectItem value="open">Avoin</SelectItem>
                  <SelectItem value="closed">Suljettu</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority-filter">Prioriteetti:</Label>
              <Select id="priority-filter" value={priority} onValueChange={(value) => setPriority(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Valitse prioriteetti" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Kaikki</SelectItem>
                  <SelectItem value="high">Kriittinen</SelectItem>
                  <SelectItem value="high">Korkea</SelectItem>
                  <SelectItem value="normal">Normaali</SelectItem>
                  <SelectItem value="low">Matala</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category-filter">Kategoria:</Label>
              <Select id="category-filter" value={category} onValueChange={(value) => setCategory(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Valitse kategoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">Yleinen</SelectItem>
                  <SelectItem value="technical">Tekninen</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject-filter">Aihe:</Label>
              <Input type="text" id="subject-filter" value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Kirjoita aihe" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="user-filter">Käyttäjä:</Label>
              <Input type="text" id="user-filter" value={user} onChange={(event) => setUser(event.target.value)} placeholder="Kirjoita käyttäjän nimi" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="device-filter">Laite:</Label>
              <Input type="text" id="device-filter" value={device} onChange={(event) => setDevice(event.target.value)} placeholder="Kirjoita laitteen nimi" />
            </div>

            <div className="space-y-2">
              <Label>Päivämäärä</Label>
              <div className="flex space-x-4">
                <div className="flex flex-col">
                  <Label htmlFor="start-date">Alkaen:</Label>
                  <Input type="date" id="start-date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
                </div>
                <div className="flex flex-col">
                  <Label htmlFor="end-date">Päättyen:</Label>
                  <Input type="date" id="end-date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      )}

      {isOpen && (
        <CardFooter className="flex justify-between">
          <Button className="w-32 mt-4 bg-red-400 text-white hover:bg-red-500" onClick={clearFilters}>Tyhjennä suodattimet</Button>
          <Button className="w-32 mt-4 bg-blue-500 hover:bg-blue-600 text-white">Hae</Button>
        </CardFooter>
      )}
    </Card>
  );
}

export default FilterMenu;