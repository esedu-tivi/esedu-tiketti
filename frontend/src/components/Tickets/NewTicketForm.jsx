import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/TextArea';
import { Slider } from '../ui/Slider';
import { Label } from '../ui/Label';
import { Alert, AlertDescription } from '../ui/Alert';
import { Check, AlertTriangle, InfoIcon } from 'lucide-react';

export default function NewTicketForm() {
  const [formData, setFormData] = React.useState({
    subject: '',
    device: '',
    description: '',
    additionalInfo: '',
    priority: 2,
    attachment: null,
  });
  const [formSubmitted, setFormSubmitted] = React.useState(false);
  const navigate = useNavigate();

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));
  };

  const handlePriorityChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      priority: value[0],
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      console.log('Valittu tiedosto:', file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const priorityLabel =
      formData.priority === 1
        ? 'low'
        : formData.priority === 2
          ? 'normal'
          : 'high';
    const newTicket = { ...formData, priority: priorityLabel };
    console.log('Tiketti luotu:', newTicket);
    setFormSubmitted(true);
    setTimeout(() => navigate('/'), 3000);
  };

  const getPriorityInfo = () => {
    switch (formData.priority) {
      case 1:
        return {
          color: 'text-green-600',
          icon: Check,
          text: 'Matala prioriteetti',
        };
      case 2:
        return {
          color: 'text-yellow-600',
          icon: InfoIcon,
          text: 'Normaali prioriteetti',
        };
      case 3:
        return {
          color: 'text-red-600',
          icon: AlertTriangle,
          text: 'Korkea prioriteetti',
        };
      default:
        return {
          color: 'text-yellow-600',
          icon: InfoIcon,
          text: 'Normaali prioriteetti',
        };
    }
  };

  const priorityInfo = getPriorityInfo();
  const PriorityIcon = priorityInfo.icon;

  if (formSubmitted) {
    return (
      <Alert className="max-w-md mx-auto mt-8 bg-green-50 border-green-200">
        <Check className="w-4 h-4 text-green-600" />
        <AlertDescription className="text-green-600">
          Tiketti luotu!
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">Uusi tiketti</CardTitle>
        <CardDescription>Täytä tiedot</CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="subject">Tiketin aihe</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={handleChange('subject')}
              required
              placeholder="Ongelma?"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="device">Laite</Label>
            <Input
              id="device"
              value={formData.device}
              onChange={handleChange('device')}
              placeholder="Laitteen nimi (esim.TEST1234-1)"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Ongelman kuvaus</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={handleChange('description')}
              required
              placeholder="Kuvaile ongelmasi mahdollisimman tarkasti"
              className="min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="additionalInfo">Lisätiedot</Label>
            <Textarea
              id="additionalInfo"
              value={formData.additionalInfo}
              onChange={handleChange('additionalInfo')}
              placeholder="Syötä mahdolliset lisätiedot"
              className="min-h-[80px]"
            />
          </div>

          <div className="space-y-4">
            <Label>Prioriteetti</Label>
            <Slider
              value={[formData.priority]}
              min={1}
              max={3}
              step={1}
              onValueChange={handlePriorityChange}
              className="w-full"
            />
            <div className="flex items-center space-x-2">
              <PriorityIcon className={`w-4 h-4 ${priorityInfo.color}`} />
              <span className={`text-sm ${priorityInfo.color}`}>
                {priorityInfo.text}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="attachment">Lisää liite (screenshotit ym.)</Label>
            <Input
              id="attachment"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
            />
            {formData.attachment && (
              <p className="text-sm text-gray-500">
                Valittu tiedosto: {formData.attachment.name}
              </p>
            )}
          </div>
        </CardContent>

        <CardFooter>
          <Button type="submit">Luo tiketti</Button>
          <Button type="button" variant="outline" onClick={() => navigate('/')}>
            Peruuta
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
