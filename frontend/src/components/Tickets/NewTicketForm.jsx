import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createTicket } from '../../utils/api';
import { useCategories } from '../../hooks/useCategories';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/TextArea';
import { Slider } from '../ui/Slider';
import { Label } from '../ui/Label';
import { Alert, AlertDescription } from '../ui/Alert';
import {
  Check,
  AlertTriangle,
  InfoIcon,
  Loader2,
  Paperclip,
  X,
  FileText,
  Monitor,
  MessageSquareText,
  ClipboardList,
  Tag,
  Image,
  TicketIcon,
  Upload,
  Upload as UploadIcon
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/Select';
import { motion, AnimatePresence } from 'framer-motion';

export default function NewTicketForm({ onClose }) {
  const [formData, setFormData] = React.useState({
    subject: '',
    device: '',
    description: '',
    additionalInfo: '',
    priority: 2,
    categoryId: '',
    attachment: [],
    contentType: 'text',
    userProfile: 'student'
  });

  const [fieldStatus, setFieldStatus] = React.useState({
    subject: null,
    device: null,
    description: null,
    additionalInfo: null,
    categoryId: null,
    contentType: null
  });

  const { data: categories, isLoading: categoriesLoading } = useCategories();

  const [error, setError] = React.useState(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const queryClient = useQueryClient();
  const fileInputRef = React.useRef(null);

  const updateFieldStatus = (field, value) => {
    let status = null;
    
    if (['subject', 'description', 'categoryId', 'contentType'].includes(field)) {
      status = value ? 'valid' : null;
    } else {
      status = value ? 'valid' : 'empty';
    }
    
    setFieldStatus(prev => ({
      ...prev,
      [field]: status
    }));
  };

  const mutation = useMutation({
    mutationFn: createTicket,
    onSuccess: () => {
      queryClient.invalidateQueries(['tickets']);
      setFormSubmitted(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    },
    onError: (err) => {
      setError(err.message || 'Tiketin luonti epäonnistui');
      setFormSubmitted(false);
    },
  });

  const [formSubmitted, setFormSubmitted] = React.useState(false);

  const handleChange = (field) => (e) => {
    const value = e.target.value;
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    updateFieldStatus(field, value);
    setError(null);
  };

  const handleCategoryChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      categoryId: value,
    }));
    updateFieldStatus('categoryId', value);
    setError(null);
  };

  const handlePriorityChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      priority: value[0],
    }));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    addFiles(files);
  };

  const addFiles = (files) => {
    setFormData((prev) => {
      const newAttachments = [...(prev.attachment || []), ...files];
      if (newAttachments.length > 5) {
        setError('Voit lähettää enintään 5 liitettä');
        setTimeout(() => {
          setError(null);
        }, 3000);
        return { ...prev, attachment: prev.attachment };
      }
      return { ...prev, attachment: newAttachments };
    });
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    addFiles(files);
    e.target.value = null;
  };

  const handleContentTypeChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      contentType: value,
    }));
    updateFieldStatus('contentType', value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Update all field statuses before submission
    updateFieldStatus('subject', formData.subject);
    updateFieldStatus('description', formData.description);
    updateFieldStatus('categoryId', formData.categoryId);
    updateFieldStatus('contentType', formData.contentType);
    
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
          bgColor: 'bg-green-100',
          borderColor: 'border-green-200',
          icon: Check,
          text: 'Matala prioriteetti',
        };
      case 2:
        return {
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          borderColor: 'border-yellow-200',
          icon: InfoIcon,
          text: 'Normaali prioriteetti',
        };
      case 3:
        return {
          color: 'text-orange-600',
          bgColor: 'bg-orange-100',
          borderColor: 'border-orange-200',
          icon: AlertTriangle,
          text: 'Korkea prioriteetti',
        };
      case 4:
        return {
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          borderColor: 'border-red-200',
          icon: AlertTriangle,
          text: 'Kriittinen prioriteetti',
        };
      default:
        return {
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          borderColor: 'border-yellow-200',
          icon: InfoIcon,
          text: 'Normaali prioriteetti',
        };
    }
  };

  const priorityInfo = getPriorityInfo();
  const PriorityIcon = priorityInfo.icon;

  const renderFieldIcon = (field) => {
    const icons = {
      subject: <FileText className="w-4 h-4 text-gray-500" />,
      device: <Monitor className="w-4 h-4 text-gray-500" />,
      description: <MessageSquareText className="w-4 h-4 text-gray-500" />,
      additionalInfo: <ClipboardList className="w-4 h-4 text-gray-500" />,
      categoryId: <Tag className="w-4 h-4 text-gray-500" />,
      contentType: <Image className="w-4 h-4 text-gray-500" />
    };
    
    return icons[field] || null;
  };

  const renderFieldStatus = (field) => {
    const status = fieldStatus[field];
    
    if (status === 'valid') {
      return <Check className="w-4 h-4 text-green-600" />;
    }
    
    return null;
  };

  if (formSubmitted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        <Alert variant="success" className="shadow-lg border-2 border-green-100">
          <div className="flex items-center justify-center flex-col p-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-green-700 mb-2">Tiketti luotu onnistuneesti!</h3>
            <p className="text-green-600">Saat ilmoituksen, kun tikettisi on käsitelty</p>
          </div>
        </Alert>
      </motion.div>
    );
  }

  return (
    <div
      id="modal-background"
      className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto relative shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <Card className="border-none shadow-none">
          <CardHeader className="p-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-t-xl relative overflow-hidden">
            <div className="absolute inset-0 bg-pattern opacity-10"></div>
            <div className="flex justify-between items-center relative z-10">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                  <TicketIcon className="w-6 h-6" />
                </div>
                <CardTitle className="text-xl font-bold tracking-tight">
                  Uusi tiketti
                </CardTitle>
              </div>
              <button 
                onClick={onClose} 
                className="bg-white/20 hover:bg-white/30 rounded-full p-1.5 transition-colors"
                aria-label="Sulje"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </CardHeader>
    
          <form onSubmit={handleSubmit} className="p-0">
            <CardContent className="p-6 space-y-6">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="sticky top-0 bg-white z-50 pb-4"
                >
                  <Alert className="bg-red-50 border border-red-200 shadow-md">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <AlertDescription className="text-red-600 font-medium">
                      {error}
                    </AlertDescription>
                  </Alert>
                </motion.div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="subject" className="text-sm font-medium flex items-center gap-2">
                      {renderFieldIcon('subject')}
                      Tiketin aihe <span className="text-red-500">*</span>
                    </Label>
                    {renderFieldStatus('subject')}
                  </div>
                  <div className="relative">
                    <Input
                      id="subject"
                      value={formData.subject}
                      onChange={handleChange('subject')}
                      required
                      placeholder="Mitä ongelmasi koskee?"
                      className={`pl-3 pr-8 py-2 h-10 transition-all ${formData.subject ? 'border-green-300 ring-green-100' : ''}`}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="category" className="text-sm font-medium flex items-center gap-2">
                      {renderFieldIcon('categoryId')}
                      Kategoria <span className="text-red-500">*</span>
                    </Label>
                    {renderFieldStatus('categoryId')}
                  </div>
                  <Select
                    value={formData.categoryId}
                    onValueChange={handleCategoryChange}
                    required
                  >
                    <SelectTrigger className={`h-10 transition-all ${formData.categoryId ? 'border-green-300 ring-green-100' : ''}`}>
                      <SelectValue placeholder="Valitse kategoria" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {(categories || []).map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="contentType" className="text-sm font-medium flex items-center gap-2">
                      {renderFieldIcon('contentType')}
                      Vastauksen muoto <span className="text-red-500">*</span>
                    </Label>
                    {renderFieldStatus('contentType')}
                  </div>
                  <Select
                    value={formData.contentType}
                    onValueChange={handleContentTypeChange}
                    required
                  >
                    <SelectTrigger className={`h-10 transition-all ${formData.contentType ? 'border-green-300 ring-green-100' : ''}`}>
                      <SelectValue placeholder="Valitse muoto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Teksti</SelectItem>
                      <SelectItem value="image">Kuva</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="device" className="text-sm font-medium flex items-center gap-2">
                      {renderFieldIcon('device')}
                      Laite
                    </Label>
                    {renderFieldStatus('device')}
                  </div>
                  <Input
                    id="device"
                    value={formData.device}
                    onChange={handleChange('device')}
                    placeholder="Laitteen nimi (esim. TEST1234-1)"
                    className={`pl-3 pr-8 py-2 h-10 transition-all ${formData.device ? 'border-green-300 ring-green-100' : ''}`}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="description" className="text-sm font-medium flex items-center gap-2">
                    {renderFieldIcon('description')}
                    Ongelman kuvaus <span className="text-red-500">*</span>
                  </Label>
                  {renderFieldStatus('description')}
                </div>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={handleChange('description')}
                  required
                  placeholder="Kuvaile ongelmasi mahdollisimman tarkasti"
                  className={`min-h-[120px] transition-all ${formData.description ? 'border-green-300 ring-green-100' : ''}`}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="additionalInfo" className="text-sm font-medium flex items-center gap-2">
                    {renderFieldIcon('additionalInfo')}
                    Lisätiedot
                  </Label>
                  {renderFieldStatus('additionalInfo')}
                </div>
                <Textarea
                  id="additionalInfo"
                  value={formData.additionalInfo}
                  onChange={handleChange('additionalInfo')}
                  placeholder="Syötä mahdolliset lisätiedot"
                  className={`min-h-[80px] transition-all ${formData.additionalInfo ? 'border-green-300 ring-green-100' : ''}`}
                />
              </div>

              <div className="space-y-4 border border-gray-100 rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Prioriteetti</Label>
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${priorityInfo.bgColor} ${priorityInfo.borderColor} border`}>
                    <PriorityIcon className={`w-4 h-4 ${priorityInfo.color}`} />
                    <span className={`text-sm font-medium ${priorityInfo.color}`}>
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
                  <div className="absolute left-0 right-0 -top-2 flex justify-between text-xs font-medium">
                    <span className="text-green-600">Matala</span>
                    <span className="text-yellow-600">Normaali</span>
                    <span className="text-orange-600">Korkea</span>
                    <span className="text-red-600">Kriittinen</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium">Liitteet (max 5)</Label>
                
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
                    isDragging 
                      ? 'border-blue-400 bg-blue-50' 
                      : 'border-gray-300 hover:border-blue-300 hover:bg-gray-50'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <UploadIcon className="w-6 h-6 text-blue-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-700">Raahaa ja pudota tiedostoja tai</p>
                    <Button 
                      type="button" 
                      variant="outline"
                      className="mt-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                    >
                      <Paperclip className="w-4 h-4 mr-2" />
                      Valitse tiedostot
                    </Button>
                    <p className="text-xs text-gray-500 mt-2">PNG, JPG, PDF tai muut tiedostot</p>
                  </div>
                  
                  <input
                    ref={fileInputRef}
                    id="attachment"
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
                
                {formData.attachment.length > 0 && (
                  <div className="space-y-2 mt-3">
                    <h4 className="text-sm font-medium text-gray-700">Valitut tiedostot:</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {formData.attachment.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between text-sm text-gray-700 bg-gray-50 p-2 rounded-md border border-gray-200 group hover:border-red-200 transition-all"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Paperclip className="w-4 h-4 text-gray-500 flex-shrink-0" />
                            <span className="truncate">{file.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFormData((prev) => ({
                                ...prev,
                                attachment: prev.attachment.filter((_, i) => i !== index),
                              }));
                            }}
                            className="text-gray-400 hover:text-red-500 transition duration-200 p-1 rounded-full hover:bg-red-50"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>

            <CardFooter className="flex justify-between items-center p-6 border-t border-gray-100 bg-gray-50 rounded-b-xl">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={mutation.isPending}
                className="border-gray-200 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              >
                Peruuta
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending || categoriesLoading}
                className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white px-6 shadow-lg transition-all hover:shadow-xl"
              >
                {mutation.isPending ? (
                  <div className="flex items-center">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Luodaan...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Check className="w-4 h-4 mr-2" />
                    Luo tiketti
                  </div>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
