import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { createTicket, fetchCategories } from '../../utils/api';
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
import { Check, AlertTriangle, InfoIcon, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/Select';

export default function NewTicketForm() {
  const [formData, setFormData] = React.useState({
    subject: '',
    device: '',
    description: '',
    additionalInfo: '',
    priority: 2,
    categoryId: '',
    attachment: null,
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  const [error, setError] = React.useState(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createTicket,
    onSuccess: () => {
      queryClient.invalidateQueries(['tickets']);
      setFormSubmitted(true);
      setTimeout(() => navigate('/'), 2000);
    },
    onError: (err) => {
      setError(err.message || 'Tiketin luonti epäonnistui');
      setFormSubmitted(false);
    },
  });

  const [formSubmitted, setFormSubmitted] = React.useState(false);

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));
    setError(null);
  };

  const handleCategoryChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      categoryId: value,
    }));
    setError(null);
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
      setFormData((prev) => ({
        ...prev,
        attachment: file,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.subject || !formData.description || !formData.categoryId) {
      setError('Täytä kaikki pakolliset kentät');
      return;
    }
    mutation.mutate(formData);
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
          color: 'text-orange-600',
          icon: AlertTriangle,
          text: 'Korkea prioriteetti',
        };
      case 4:
        return {
          color: 'text-red-600',
          icon: AlertTriangle,
          text: 'Kriittinen prioriteetti',
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
          Tiketti luotu onnistuneesti!
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
          {error && (
            <Alert className="bg-red-50 border-red-200">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-red-600">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="subject">Tiketin aihe *</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={handleChange('subject')}
              required
              placeholder="Ongelma?"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Kategoria *</Label>
            <Select
              value={formData.categoryId}
              onValueChange={handleCategoryChange}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Valitse kategoria" />
              </SelectTrigger>
              <SelectContent>
                {categories?.categories?.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Label htmlFor="description">Ongelman kuvaus *</Label>
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
            <div className="flex justify-between items-center">
              <Label>Prioriteetti</Label>
              <div className="flex items-center space-x-2">
                <PriorityIcon className={`w-4 h-4 ${priorityInfo.color}`} />
                <span className={`text-sm ${priorityInfo.color}`}>
                  {priorityInfo.text}
                </span>
              </div>
            </div>
            <div className="relative pt-6">
              <Slider
                value={[formData.priority]}
                min={1}
                max={4}
                step={1}
                onValueChange={handlePriorityChange}
                className="w-full"
              />
              <div className="absolute left-0 right-0 -top-2 flex justify-between text-sm text-gray-500">
                <span className="text-green-600">Matala</span>
                <span className="text-yellow-600">Normaali</span>
                <span className="text-orange-600">Korkea</span>
                <span className="text-red-600">Kriittinen</span>
              </div>
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

        <CardFooter className="flex justify-between">
          <Button
            type="submit"
            disabled={mutation.isPending || categoriesLoading}
            className="w-32"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Luodaan...
              </>
            ) : (
              'Luo tiketti'
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/')}
            disabled={mutation.isPending}
          >
            Peruuta
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
