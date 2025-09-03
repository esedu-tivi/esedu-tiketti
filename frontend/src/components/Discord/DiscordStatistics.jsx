import { useState, useEffect } from 'react';
import { authService } from '../../services/authService';
import axios from 'axios';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Users, 
  Ticket, 
  Radio, 
  Clock,
  TrendingUp,
  MessageSquare,
  RefreshCw,
  Loader2,
  Activity,
  BarChart3,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  Hash
} from 'lucide-react';
import { format } from 'date-fns';
import { fi } from 'date-fns/locale';
import { toast } from 'react-hot-toast';

export default function DiscordStatistics() {
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      if (!loading) setRefreshing(true);
      const token = await authService.acquireToken();
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/discord/statistics`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setStatistics(response.data.data.statistics);
    } catch (error) {
      console.error('Error fetching statistics:', error);
      toast.error('Virhe haettaessa tilastoja');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading || !statistics) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin h-8 w-8 text-indigo-600" />
      </div>
    );
  }

  // Prepare data for status pie chart
  const statusData = statistics.recentActivity ? [
    { 
      name: 'Avoin', 
      value: statistics.recentActivity.filter(t => t.status === 'OPEN').length,
      color: '#10b981'
    },
    { 
      name: 'Käsittelyssä', 
      value: statistics.recentActivity.filter(t => t.status === 'IN_PROGRESS').length,
      color: '#3b82f6'
    },
    { 
      name: 'Ratkaistu', 
      value: statistics.recentActivity.filter(t => t.status === 'RESOLVED').length,
      color: '#8b5cf6'
    },
    { 
      name: 'Suljettu', 
      value: statistics.recentActivity.filter(t => t.status === 'CLOSED').length,
      color: '#6b7280'
    }
  ].filter(item => item.value > 0) : [];

  // Format number with proper separators
  const formatNumber = (num) => {
    return new Intl.NumberFormat('fi-FI').format(num);
  };

  // Get status color
  const getStatusColor = (status) => {
    switch(status) {
      case 'OPEN': return 'bg-green-100 text-green-800';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800';
      case 'RESOLVED': return 'bg-purple-100 text-purple-800';
      case 'CLOSED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get status label
  const getStatusLabel = (status) => {
    switch(status) {
      case 'OPEN': return 'Avoin';
      case 'IN_PROGRESS': return 'Käsittelyssä';
      case 'RESOLVED': return 'Ratkaistu';
      case 'CLOSED': return 'Suljettu';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Discord-tilastot</h2>
          <p className="text-sm text-gray-600 mt-1">Yksityiskohtaiset tilastot ja analytiikka</p>
        </div>
        <button
          onClick={fetchStatistics}
          disabled={refreshing}
          className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {refreshing ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <RefreshCw size={14} />
          )}
          <span className="ml-2">Päivitä</span>
        </button>
      </div>

      {/* Activity Chart */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Päivittäinen aktiviteetti</h3>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Calendar size={16} />
            <span>Viimeiset 7 päivää</span>
          </div>
        </div>
        
        {statistics.activityChart && statistics.activityChart.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={statistics.activityChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="dayName" 
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
              />
              <Tooltip 
                formatter={(value) => [`${value} tiketti(ä)`, 'Määrä']}
                labelFormatter={(label) => `Päivä: ${label}`}
              />
              <Bar 
                dataKey="count" 
                fill="#3b82f6" 
                radius={[8, 8, 0, 0]}
                name="Tiketit"
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <BarChart3 size={48} className="mx-auto mb-2 opacity-50" />
              <p>Ei aktiviteettia viimeisen 7 päivän aikana</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Tikettien tila</h3>
            <span className="text-sm text-gray-500">
              {statistics.recentActivity?.length || 0} viimeisintä
            </span>
          </div>
          
          {statusData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={70}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>

              <div className="mt-4 space-y-2">
                {statusData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-gray-600">{item.name}</span>
                    </div>
                    <span className="font-medium text-gray-900">{item.value} tiketti(ä)</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              <p>Ei dataa saatavilla</p>
            </div>
          )}
        </div>

        {/* Performance Metrics */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Suorituskyky</h3>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-600">Ratkaisuaste</span>
                <span className="text-sm font-bold text-gray-900">
                  {statistics.totalTickets > 0 
                    ? `${Math.round(((statistics.totalTickets - statistics.activeChannels) / statistics.totalTickets) * 100)}%` 
                    : '0%'}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: statistics.totalTickets > 0 
                      ? `${Math.round(((statistics.totalTickets - statistics.activeChannels) / statistics.totalTickets) * 100)}%` 
                      : '0%'
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-600">Aktiivisuusaste</span>
                <span className="text-sm font-bold text-gray-900">
                  {statistics.totalTickets > 0 
                    ? `${Math.round((statistics.activeChannels / statistics.totalTickets) * 100)}%` 
                    : '0%'}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: statistics.totalTickets > 0 
                      ? `${Math.round((statistics.activeChannels / statistics.totalTickets) * 100)}%` 
                      : '0%'
                  }}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Tikettejä per käyttäjä</span>
                <span className="text-sm font-medium text-gray-900">
                  {statistics.totalUsers > 0 ? (statistics.totalTickets / statistics.totalUsers).toFixed(1) : '0'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Päivittäinen keskiarvo</span>
                <span className="text-sm font-medium text-gray-900">
                  {statistics.activityChart && statistics.activityChart.length > 0
                    ? (statistics.activityChart.reduce((sum, day) => sum + day.count, 0) / statistics.activityChart.length).toFixed(1)
                    : '0'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Keskimääräinen käsittelyaika</span>
                <span className="text-sm font-medium text-gray-900">
                  {statistics.avgResponseTimeHours > 0 ? `${statistics.avgResponseTimeHours} tuntia` : 'Ei dataa'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Tickets Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Viimeisimmät tiketit</h3>
          <span className="text-sm text-gray-500">
            Viimeiset {statistics.recentActivity?.length || 0} tiketti(ä)
          </span>
        </div>
        
        {statistics.recentActivity && statistics.recentActivity.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tiketti
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Luoja
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tila
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Luotu
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {statistics.recentActivity.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 bg-indigo-100 rounded-full flex items-center justify-center">
                          <Hash className="h-4 w-4 text-indigo-600" />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900 truncate max-w-xs">
                            {ticket.title}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-6 w-6 bg-gray-100 rounded-full flex items-center justify-center">
                          <User className="h-3 w-3 text-gray-600" />
                        </div>
                        <span className="ml-2 text-sm text-gray-900">
                          {ticket.createdBy.discordUsername || ticket.createdBy.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                        {getStatusLabel(ticket.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(ticket.createdAt), 'dd.MM.yyyy HH:mm', { locale: fi })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">Ei tikettejä viimeisen 7 päivän aikana</p>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertCircle className="text-blue-600 mt-0.5 flex-shrink-0" size={18} />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Tietoa Discord-tilastoista:</p>
            <ul className="list-disc list-inside space-y-0.5 text-blue-700">
              <li>Tilastot päivittyvät reaaliaikaisesti uusien tikettien myötä</li>
              <li>Vasteaika lasketaan ensimmäiseen tukihenkilön vastaukseen</li>
              <li>Aktiiviset kanavat sisältävät avoimet ja käsittelyssä olevat tiketit</li>
              <li>Päivittäinen aktiviteetti näyttää tikettien luontimäärät päivittäin</li>
              <li>Ratkaisuaste kertoo kuinka moni tiketti on ratkaistu tai suljettu</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Last Updated */}
      <div className="text-center text-xs text-gray-500">
        Päivitetty: {format(new Date(statistics.lastUpdated), 'dd.MM.yyyy HH:mm:ss', { locale: fi })}
      </div>
    </div>
  );
}