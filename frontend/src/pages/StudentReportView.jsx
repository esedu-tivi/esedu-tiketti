import { useState, useEffect } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { useQueryClient } from '@tanstack/react-query';
import { useSocket } from '../hooks/useSocket';
import { Alert } from '../components/ui/Alert';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { FileText, FileSpreadsheet, FileJson, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { fi } from 'date-fns/locale';
import { useCategories, useWorkReport, useExportReport } from '../hooks/useReports';
import toast from 'react-hot-toast';

export default function StudentReportView() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { subscribe } = useSocket();
  
  // Filters
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  
  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [expandedTickets, setExpandedTickets] = useState(new Set());

  // Use custom hooks for data fetching
  const { data: categories = [] } = useCategories();
  const { 
    data: report, 
    isLoading: loading, 
    error: reportError 
  } = useWorkReport({
    startDate,
    endDate,
    categoryId: selectedCategory,
    priority: selectedPriority
  });
  
  const exportMutation = useExportReport();

  // Set up WebSocket listeners for ticket updates
  useEffect(() => {
    if (!user) return;

    const unsubscribers = [];

    // Invalidate report queries when tickets change
    const handleTicketUpdate = () => {
      queryClient.invalidateQueries(['work-report']);
    };

    // Subscribe to relevant events
    subscribe('ticketUpdated', handleTicketUpdate).then(unsub => unsubscribers.push(unsub));
    subscribe('ticketStatusChanged', handleTicketUpdate).then(unsub => unsubscribers.push(unsub));
    subscribe('ticketDeleted', handleTicketUpdate).then(unsub => unsubscribers.push(unsub));
    subscribe('commentAdded', handleTicketUpdate).then(unsub => unsubscribers.push(unsub));

    // Cleanup on unmount
    return () => {
      unsubscribers.forEach(unsub => unsub && unsub());
    };
  }, [user, subscribe, queryClient]);

  const error = reportError ? (reportError.response?.data?.message || 'Virhe raportin hakemisessa') : null;

  const handleExport = async (exportFormat) => {
    try {
      const result = await exportMutation.mutateAsync({
        format: exportFormat,
        filters: {
          startDate,
          endDate,
          categoryId: selectedCategory,
          priority: selectedPriority
        }
      });
      
      // Create filename
      const extension = exportFormat === 'csv' ? 'csv' : exportFormat === 'pdf' ? 'pdf' : 'json';
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `tyoraportti_${user?.name?.replace(/\s+/g, '_')}_${dateStr}.${extension}`;
      
      // Download the file
      const url = window.URL.createObjectURL(result.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success(`Raportti viety muodossa ${exportFormat.toUpperCase()}`);
    } catch (err) {
      toast.error(`Virhe ${exportFormat.toUpperCase()}-tiedoston luomisessa`);
      console.error('Export error:', err);
    }
  };

  const setQuickDateRange = (range) => {
    const today = new Date();
    
    switch (range) {
      case 'week':
        setStartDate(format(subDays(today, 7), 'yyyy-MM-dd'));
        setEndDate(format(today, 'yyyy-MM-dd'));
        break;
      case 'month':
        setStartDate(format(startOfMonth(today), 'yyyy-MM-dd'));
        setEndDate(format(endOfMonth(today), 'yyyy-MM-dd'));
        break;
      case '3months':
        setStartDate(format(subDays(today, 90), 'yyyy-MM-dd'));
        setEndDate(format(today, 'yyyy-MM-dd'));
        break;
      default:
        break;
    }
  };

  const toggleTicketExpansion = (ticketId) => {
    const newExpanded = new Set(expandedTickets);
    if (newExpanded.has(ticketId)) {
      newExpanded.delete(ticketId);
    } else {
      newExpanded.add(ticketId);
    }
    setExpandedTickets(newExpanded);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'CRITICAL': return 'text-red-600 bg-red-50';
      case 'HIGH': return 'text-orange-600 bg-orange-50';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50';
      case 'LOW': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'RESOLVED': return 'text-green-600 bg-green-50';
      case 'CLOSED': return 'text-gray-600 bg-gray-50';
      case 'IN_PROGRESS': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const formatDuration = (minutes) => {
    if (!minutes) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins}min`;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Ladataan raporttia...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <Alert variant="error" title="Virhe" message={error} />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Työraportti</h1>
        <p className="mt-1 text-sm text-gray-500">
          Tarkastele ja vie raportteja ratkaisemistasi tiketeistä
        </p>
      </div>

      {/* Filters Section */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Suodattimet</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 mr-2" />
              {showFilters ? 'Piilota' : 'Näytä'} suodattimet
              {showFilters ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
            </Button>
          </div>
        </CardHeader>
        
        {showFilters && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Date Range */}
              <div>
                <Label htmlFor="startDate">Alkupäivä</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="endDate">Loppupäivä</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              {/* Category Filter */}
              <div>
                <Label htmlFor="category">Kategoria</Label>
                <Select value={selectedCategory || "all"} onValueChange={(value) => setSelectedCategory(value === "all" ? "" : value)}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Kaikki kategoriat" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Kaikki kategoriat</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Priority Filter */}
              <div>
                <Label htmlFor="priority">Prioriteetti</Label>
                <Select value={selectedPriority || "all"} onValueChange={(value) => setSelectedPriority(value === "all" ? "" : value)}>
                  <SelectTrigger id="priority">
                    <SelectValue placeholder="Kaikki prioriteetit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Kaikki prioriteetit</SelectItem>
                    <SelectItem value="CRITICAL">Kriittinen</SelectItem>
                    <SelectItem value="HIGH">Korkea</SelectItem>
                    <SelectItem value="MEDIUM">Keskitaso</SelectItem>
                    <SelectItem value="LOW">Matala</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Quick Date Range Buttons */}
            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuickDateRange('week')}
              >
                Viikko
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuickDateRange('month')}
              >
                Kuukausi
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuickDateRange('3months')}
              >
                3 kuukautta
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {report && (
        <>
          {/* Show message if no tickets */}
          {report.tickets.length === 0 && (
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="text-center">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Ei tikettejä näytettävänä
                  </h3>
                  <p className="text-gray-600">
                    Et ole vielä käsitellyt tikettejä valitulla aikajaksolla.
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Raportti näyttää tiketit, jotka olet ottanut käsittelyyn tai kommentoinut.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold text-green-600">
                  {report.statistics.totalResolved}
                </div>
                <p className="text-sm text-gray-500">Ratkaistut tiketit</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold text-gray-600">
                  {report.statistics.totalClosed}
                </div>
                <p className="text-sm text-gray-500">Suljetut tiketit</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold text-blue-600">
                  {report.statistics.totalInProgress}
                </div>
                <p className="text-sm text-gray-500">Käsittelyssä</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold text-purple-600">
                  {formatDuration(report.statistics.averageResolutionTime)}
                </div>
                <p className="text-sm text-gray-500">Keskim. ratkaisuaika</p>
              </CardContent>
            </Card>
          </div>

          {/* Export Buttons */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Vie raportti</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => handleExport('pdf')}
                  disabled={exportMutation.isLoading}
                  variant="outline"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Vie PDF
                </Button>
                <Button
                  onClick={() => handleExport('csv')}
                  disabled={exportMutation.isLoading}
                  variant="outline"
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Vie CSV
                </Button>
                <Button
                  onClick={() => handleExport('json')}
                  disabled={exportMutation.isLoading}
                  variant="outline"
                >
                  <FileJson className="w-4 h-4 mr-2" />
                  Vie JSON
                </Button>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Voit palauttaa viedyn raportin ESEDU:n Ossi-oppimisympäristöön
              </p>
            </CardContent>
          </Card>

          {/* Category and Priority Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Kategoriat</CardTitle>
              </CardHeader>
              <CardContent>
                {report.statistics.categoriesHandled.length > 0 ? (
                  <div className="space-y-2">
                    {report.statistics.categoriesHandled.map((cat, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-sm">{cat.name}</span>
                        <span className="text-sm font-semibold">{cat.count} tiketti(ä)</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Ei käsiteltyjä tikettejä</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Prioriteetit</CardTitle>
              </CardHeader>
              <CardContent>
                {report.statistics.priorityBreakdown.length > 0 ? (
                  <div className="space-y-2">
                    {report.statistics.priorityBreakdown.map((priority, index) => {
                      const priorityText = {
                        'CRITICAL': 'Kriittinen',
                        'HIGH': 'Korkea',
                        'MEDIUM': 'Keskitaso',
                        'LOW': 'Matala'
                      }[priority.priority] || priority.priority;
                      
                      return (
                        <div key={index} className="flex justify-between items-center">
                          <span className={`text-sm px-2 py-1 rounded ${getPriorityColor(priority.priority)}`}>
                            {priorityText}
                          </span>
                          <span className="text-sm font-semibold">{priority.count} tiketti(ä)</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Ei käsiteltyjä tikettejä</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Tickets List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Käsitellyt tiketit ({report.tickets.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {report.tickets.length > 0 ? (
                <div className="space-y-3">
                  {report.tickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-gray-900">
                              {ticket.title}
                            </h3>
                            <span className={`text-xs px-2 py-1 rounded ${getStatusColor(ticket.status)}`}>
                              {ticket.status === 'RESOLVED' ? 'Ratkaistu' : 
                               ticket.status === 'CLOSED' ? 'Suljettu' : 
                               ticket.status === 'IN_PROGRESS' ? 'Käsittelyssä' : ticket.status}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded ${getPriorityColor(ticket.priority)}`}>
                              {ticket.priority}
                            </span>
                          </div>
                          
                          <div className="text-sm text-gray-600 space-y-1">
                            <div className="flex items-center gap-4">
                              <span>ID: {ticket.id}</span>
                              <span>Kategoria: {ticket.category}</span>
                              <span>Vastausmuoto: {ticket.responseFormat}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span>Luotu: {format(new Date(ticket.createdAt), 'dd.MM.yyyy HH:mm', { locale: fi })}</span>
                              {ticket.resolvedAt && (
                                <span>Ratkaistu: {format(new Date(ticket.resolvedAt), 'dd.MM.yyyy HH:mm', { locale: fi })}</span>
                              )}
                              {ticket.processingTime && (
                                <span>Käsittelyaika: {formatDuration(ticket.processingTime)}</span>
                              )}
                            </div>
                            <div>
                              Kommentteja: {ticket.commentsCount}
                            </div>
                          </div>

                          {/* Expandable description */}
                          {ticket.description && (
                            <div className="mt-2">
                              <button
                                onClick={() => toggleTicketExpansion(ticket.id)}
                                className="text-sm text-blue-600 hover:text-blue-800"
                              >
                                {expandedTickets.has(ticket.id) ? 'Piilota kuvaus' : 'Näytä kuvaus'}
                              </button>
                              {expandedTickets.has(ticket.id) && (
                                <div className="mt-2 p-3 bg-gray-50 rounded text-sm text-gray-700">
                                  {ticket.description}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Ei tikettejä valitulla aikajaksolla</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}