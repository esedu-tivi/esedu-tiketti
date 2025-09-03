import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  ScatterChart,
  Scatter
} from 'recharts';
import {
  Coins,
  TrendingUp,
  TrendingDown,
  Users,
  Brain,
  DollarSign,
  Activity,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  AlertCircle,
  Loader2,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Zap,
  ChevronDown,
  ChevronUp,
  Search
} from 'lucide-react';
import {
  useTokenAnalytics,
  useDailyTokenUsage,
  useTopUsersByTokenUsage,
  useTokenUsageSummary
} from '../../hooks/useTokenAnalytics';
import { Button } from '../ui/Button';

const TokenAnalytics = () => {
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [dateRange, setDateRange] = useState(30); // days
  const [showDetailedBreakdown, setShowDetailedBreakdown] = useState(false);
  const [selectedModel, setSelectedModel] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequestType, setSelectedRequestType] = useState(null);
  
  // Fetch data
  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = useTokenUsageSummary();
  const { data: dailyUsage, isLoading: dailyLoading } = useDailyTokenUsage(dateRange);
  const { data: topUsers, isLoading: topUsersLoading } = useTopUsersByTokenUsage(10);
  const { data: analytics, isLoading: analyticsLoading, refetch: refetchAnalytics } = useTokenAnalytics({
    agentType: selectedAgent
  });

  // Colors for charts
  const COLORS = {
    chat: '#10b981',
    support: '#3b82f6',
    generator: '#8b5cf6',
    summarizer: '#f97316'
  };

  const AGENT_LABELS = {
    chat: 'Chat Agent',
    support: 'Support Assistant',
    generator: 'Ticket Generator',
    summarizer: 'Summarizer'
  };

  const REQUEST_TYPE_LABELS = {
    'generate_ticket': 'Tiketin luonti',
    'generate_solution_preview': 'Ratkaisun luonti',
    'chat_response': 'Chat-vastaus',
    'support_assistance': 'Tukiavustus',
    'support_assistance_stream': 'Tukiavustus (stream)',
    'summarize_conversation': 'Yhteenveto'
  };

  // Format currency with appropriate decimal places
  const formatCurrency = (value) => {
    // For very small amounts (less than $0.01), show 4 decimal places
    if (value > 0 && value < 0.01) {
      return new Intl.NumberFormat('fi-FI', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 4,
        maximumFractionDigits: 4
      }).format(value);
    }
    // For small amounts (less than $1), show 3 decimal places
    if (value > 0 && value < 1) {
      return new Intl.NumberFormat('fi-FI', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 3,
        maximumFractionDigits: 3
      }).format(value);
    }
    // For larger amounts, show standard 2 decimal places
    return new Intl.NumberFormat('fi-FI', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Format large numbers (for tokens - show exact values)
  const formatNumber = (num) => {
    // Always show exact numbers with proper thousand separators
    // No K/M abbreviations - show full numbers
    return new Intl.NumberFormat('fi-FI', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0
    }).format(num);
  };

  // Calculate percentage with color
  const getChangeColor = (change) => {
    if (change > 0) return 'text-red-600';
    if (change < 0) return 'text-green-600';
    return 'text-gray-600';
  };

  // Extract data with safe defaults
  const summaryData = summary?.data?.currentMonth;
  const changes = summary?.data?.changes;
  const dailyData = dailyUsage?.data || [];
  const topUsersData = topUsers?.data || [];
  const analyticsData = analytics?.data;
  const detailedUsage = analyticsData?.usage || [];

  // Prepare pie chart data for agent distribution
  const agentDistributionData = summaryData?.byAgent 
    ? Object.entries(summaryData.byAgent).map(([agent, data]) => ({
        name: AGENT_LABELS[agent],
        value: data.totalTokens,
        cost: data.totalCost,
        avgResponseTime: data.avgResponseTime,
        requests: data.requests,
        color: COLORS[agent]
      }))
    : [];

  // Prepare model distribution data
  const modelDistributionData = summaryData?.byModel
    ? Object.entries(summaryData.byModel).map(([model, data]) => ({
        name: model,
        tokens: data.totalTokens,
        cost: data.totalCost,
        requests: data.requests
      }))
    : [];

  // Calculate hourly patterns from detailed usage
  const hourlyPatterns = useMemo(() => {
    if (!detailedUsage.length) return [];
    
    const hourlyData = {};
    detailedUsage.forEach(record => {
      const hour = new Date(record.createdAt).getHours();
      if (!hourlyData[hour]) {
        hourlyData[hour] = { hour, requests: 0, tokens: 0, avgResponseTime: 0, responseTimeSum: 0 };
      }
      hourlyData[hour].requests++;
      hourlyData[hour].tokens += record.totalTokens;
      hourlyData[hour].responseTimeSum += record.responseTime || 0;
    });

    // Calculate averages
    Object.values(hourlyData).forEach(data => {
      data.avgResponseTime = data.requests > 0 ? data.responseTimeSum / data.requests : 0;
      delete data.responseTimeSum;
    });

    // Fill missing hours with zeros
    const completeHourlyData = [];
    for (let i = 0; i < 24; i++) {
      completeHourlyData.push(hourlyData[i] || { hour: i, requests: 0, tokens: 0, avgResponseTime: 0 });
    }
    
    return completeHourlyData;
  }, [detailedUsage]);

  // Calculate error statistics
  const errorStats = useMemo(() => {
    if (!detailedUsage.length) return { total: 0, byAgent: {}, byError: {} };
    
    const errors = detailedUsage.filter(r => !r.success);
    const stats = {
      total: errors.length,
      rate: (errors.length / detailedUsage.length) * 100,
      byAgent: {},
      byError: {}
    };

    errors.forEach(error => {
      // By agent
      if (!stats.byAgent[error.agentType]) {
        stats.byAgent[error.agentType] = { count: 0, messages: [] };
      }
      stats.byAgent[error.agentType].count++;
      
      // By error message
      const errorKey = error.errorMessage || 'Unknown error';
      if (!stats.byError[errorKey]) {
        stats.byError[errorKey] = 0;
      }
      stats.byError[errorKey]++;
    });

    return stats;
  }, [detailedUsage]);

  // Response time distribution
  const responseTimeDistribution = useMemo(() => {
    if (!detailedUsage.length) return [];
    
    const buckets = [
      { range: '0-1s', min: 0, max: 1, count: 0, tokens: 0 },
      { range: '1-3s', min: 1, max: 3, count: 0, tokens: 0 },
      { range: '3-5s', min: 3, max: 5, count: 0, tokens: 0 },
      { range: '5-10s', min: 5, max: 10, count: 0, tokens: 0 },
      { range: '10s+', min: 10, max: Infinity, count: 0, tokens: 0 }
    ];

    detailedUsage.forEach(record => {
      const responseTime = record.responseTime || 0;
      const bucket = buckets.find(b => responseTime >= b.min && responseTime < b.max);
      if (bucket) {
        bucket.count++;
        bucket.tokens += record.totalTokens;
      }
    });

    return buckets;
  }, [detailedUsage]);

  // Filter detailed usage based on search
  const filteredUsage = useMemo(() => {
    let filtered = detailedUsage;
    
    if (searchQuery) {
      filtered = filtered.filter(record => 
        record.userId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.ticketId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.agentType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.modelUsed?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (selectedRequestType) {
      filtered = filtered.filter(record => record.requestType === selectedRequestType);
    }
    
    return filtered;
  }, [detailedUsage, searchQuery, selectedRequestType]);

  // Get unique request types
  const uniqueRequestTypes = useMemo(() => {
    const types = new Set();
    detailedUsage.forEach(record => {
      if (record.requestType) {
        types.add(record.requestType);
      }
    });
    return Array.from(types).sort();
  }, [detailedUsage]);

  // Loading state - MUST be after all hooks
  if (summaryLoading || dailyLoading || analyticsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin h-8 w-8 text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Tokens */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <Coins className="text-indigo-600 mr-2" size={20} />
              <span className="text-sm font-medium text-gray-600">Tokeneja yhteensä</span>
            </div>
            {changes?.tokenChange !== undefined && (
              <div className={`flex items-center ${getChangeColor(changes.tokenChange)}`}>
                {changes.tokenChange > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                <span className="text-xs ml-1">{Math.abs(changes.tokenChange).toFixed(1)}%</span>
              </div>
            )}
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatNumber(summaryData?.totalTokens || 0)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Tässä kuussa
          </p>
        </div>

        {/* Total Cost */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <DollarSign className="text-green-600 mr-2" size={20} />
              <span className="text-sm font-medium text-gray-600">Kustannukset</span>
            </div>
            {changes?.costChange !== undefined && (
              <div className={`flex items-center ${getChangeColor(changes.costChange)}`}>
                {changes.costChange > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                <span className="text-xs ml-1">{Math.abs(changes.costChange).toFixed(1)}%</span>
              </div>
            )}
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(summaryData?.totalCost || 0)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Arvioitu kustannus
          </p>
        </div>

        {/* Total Requests */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <Activity className="text-blue-600 mr-2" size={20} />
              <span className="text-sm font-medium text-gray-600">Pyyntöjä</span>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatNumber(summaryData?.totalRequests || 0)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            API-kutsuja
          </p>
        </div>

        {/* Success Rate */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <Brain className="text-purple-600 mr-2" size={20} />
              <span className="text-sm font-medium text-gray-600">Onnistumisprosentti</span>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {(summaryData?.successRate || 0).toFixed(1)}%
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Onnistuneet pyynnöt
          </p>
        </div>
      </div>

      {/* Daily Usage Chart */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Päivittäinen käyttö</h3>
          <div className="flex items-center gap-2">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(Number(e.target.value))}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value={7}>7 päivää</option>
              <option value={30}>30 päivää</option>
              <option value={90}>90 päivää</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchSummary()}
              className="flex items-center gap-1"
            >
              <RefreshCw size={14} />
              Päivitä
            </Button>
          </div>
        </div>
        
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={dailyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tickFormatter={(date) => new Date(date).toLocaleDateString('fi-FI', { day: 'numeric', month: 'numeric' })}
            />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip 
              labelFormatter={(date) => new Date(date).toLocaleDateString('fi-FI')}
              formatter={(value, name) => {
                if (name === 'Kustannus') return formatCurrency(value);
                return formatNumber(value);
              }}
            />
            <Legend />
            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="totalTokens" 
              stroke="#8b5cf6" 
              name="Tokenit"
              strokeWidth={2}
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="totalCost" 
              stroke="#10b981" 
              name="Kustannus"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agent Distribution */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Käyttö agenteittain</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedAgent(selectedAgent ? null : agentDistributionData[0]?.name?.toLowerCase()?.replace(' agent', ''))}
              className="text-xs"
            >
              {selectedAgent ? 'Näytä kaikki' : 'Analysoi'}
            </Button>
          </div>
          
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={agentDistributionData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {agentDistributionData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color}
                    style={{ 
                      cursor: 'pointer',
                      opacity: selectedAgent && !entry.name.toLowerCase().includes(selectedAgent) ? 0.3 : 1
                    }}
                    onClick={() => {
                      const agentKey = entry.name.toLowerCase().replace(' agent', '').replace('support assistant', 'support').replace('ticket generator', 'generator');
                      setSelectedAgent(selectedAgent === agentKey ? null : agentKey);
                      refetchAnalytics();
                    }}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatNumber(value)} />
            </PieChart>
          </ResponsiveContainer>

          <div className="mt-4 space-y-2">
            {agentDistributionData.map((agent) => {
              const agentKey = agent.name.toLowerCase().replace(' agent', '').replace('support assistant', 'support').replace('ticket generator', 'generator');
              const isSelected = selectedAgent === agentKey;
              
              return (
                <div 
                  key={agent.name} 
                  className={`flex items-center justify-between text-sm p-2 rounded-lg transition-all cursor-pointer
                    ${isSelected ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-gray-50'}`}
                  onClick={() => {
                    setSelectedAgent(isSelected ? null : agentKey);
                    refetchAnalytics();
                  }}
                >
                  <div className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: agent.color }}
                    />
                    <span className="text-gray-600">{agent.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-medium text-gray-900">{formatNumber(agent.value)}</span>
                    <span className="text-gray-500 ml-2">({formatCurrency(agent.cost)})</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detailed Agent Metrics */}
          {selectedAgent && analyticsData?.stats && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                {AGENT_LABELS[selectedAgent]} - Yksityiskohtaiset tiedot
              </h4>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded p-2">
                  <p className="text-xs text-gray-500">Keskimääräinen vastausaika</p>
                  <p className="text-sm font-medium text-gray-900">
                    {analyticsData.stats.avgResponseTime?.toFixed(2) || '0'} s
                  </p>
                </div>
                
                <div className="bg-gray-50 rounded p-2">
                  <p className="text-xs text-gray-500">Tokenit/pyyntö</p>
                  <p className="text-sm font-medium text-gray-900">
                    {formatNumber(analyticsData.stats.avgTokensPerRequest || 0)}
                  </p>
                </div>
                
                <div className="bg-gray-50 rounded p-2">
                  <p className="text-xs text-gray-500">Onnistumisprosentti</p>
                  <p className="text-sm font-medium text-gray-900">
                    {analyticsData.stats.successRate?.toFixed(1) || '100'}%
                  </p>
                </div>
                
                <div className="bg-gray-50 rounded p-2">
                  <p className="text-xs text-gray-500">Kustannus/pyyntö</p>
                  <p className="text-sm font-medium text-gray-900">
                    {formatCurrency((analyticsData.stats.totalCost || 0) / (analyticsData.stats.totalRequests || 1))}
                  </p>
                </div>
              </div>

              {/* Token breakdown for selected agent */}
              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Prompt / Completion tokenit</span>
                  <span>{((analyticsData.stats.totalPromptTokens / analyticsData.stats.totalTokens) * 100).toFixed(0)}% / {((analyticsData.stats.totalCompletionTokens / analyticsData.stats.totalTokens) * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 flex overflow-hidden">
                  <div 
                    className="bg-blue-500 h-full"
                    style={{ width: `${(analyticsData.stats.totalPromptTokens / analyticsData.stats.totalTokens) * 100}%` }}
                    title={`Prompt: ${formatNumber(analyticsData.stats.totalPromptTokens)} tokenia`}
                  />
                  <div 
                    className="bg-green-500 h-full"
                    style={{ width: `${(analyticsData.stats.totalCompletionTokens / analyticsData.stats.totalTokens) * 100}%` }}
                    title={`Completion: ${formatNumber(analyticsData.stats.totalCompletionTokens)} tokenia`}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>{formatNumber(analyticsData.stats.totalPromptTokens)}</span>
                  <span>{formatNumber(analyticsData.stats.totalCompletionTokens)}</span>
                </div>
              </div>

              {/* Model usage for selected agent */}
              {analyticsData.stats.byModel && Object.keys(analyticsData.stats.byModel).length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-gray-600 mb-2">Mallien käyttö:</p>
                  {Object.entries(analyticsData.stats.byModel).map(([model, data]) => (
                    <div key={model} className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600">{model}</span>
                      <span className="text-gray-900 font-medium">
                        {data.requests} pyyntöä ({formatNumber(data.totalTokens)} tok)
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Top Users */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Aktiivisimmat käyttäjät</h3>
          
          <div className="space-y-3">
            {topUsersData.slice(0, 5).map((userData, index) => (
              <div key={userData.user?.id || index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-sm font-medium text-indigo-600">{index + 1}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {userData.user?.name || 'Tuntematon'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {userData.requests} pyyntöä
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {formatNumber(userData.totalTokens)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatCurrency(userData.totalCost)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Agent Analytics - Shows when an agent is selected */}
      {selectedAgent && analyticsData && (
        <div className="bg-indigo-50 rounded-lg shadow-sm border border-indigo-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <Brain className="mr-2 text-indigo-600" size={20} />
            {AGENT_LABELS[selectedAgent]} - Syväanalyysi
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Performance Metrics */}
            <div className="bg-white rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                <Zap className="mr-1 text-yellow-500" size={14} />
                Suorituskyky
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Nopein vastaus:</span>
                  <span className="font-medium">
                    {Math.min(...(analyticsData.usage?.map(u => u.responseTime || 999) || [0])).toFixed(2)}s
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Hitain vastaus:</span>
                  <span className="font-medium">
                    {Math.max(...(analyticsData.usage?.map(u => u.responseTime || 0) || [0])).toFixed(2)}s
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Mediaani:</span>
                  <span className="font-medium">
                    {(() => {
                      const times = analyticsData.usage?.map(u => u.responseTime || 0).sort((a, b) => a - b) || [];
                      const mid = Math.floor(times.length / 2);
                      return times.length ? (times.length % 2 ? times[mid] : (times[mid - 1] + times[mid]) / 2).toFixed(2) : '0';
                    })()}s
                  </span>
                </div>
              </div>
            </div>

            {/* Token Efficiency */}
            <div className="bg-white rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                <Coins className="mr-1 text-green-500" size={14} />
                Token-tehokkuus
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Min tokenit:</span>
                  <span className="font-medium">
                    {formatNumber(Math.min(...(analyticsData.usage?.map(u => u.totalTokens) || [0])))}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Max tokenit:</span>
                  <span className="font-medium">
                    {formatNumber(Math.max(...(analyticsData.usage?.map(u => u.totalTokens) || [0])))}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Prompt/Completion suhde:</span>
                  <span className="font-medium">
                    1:{((analyticsData.stats?.totalCompletionTokens || 0) / (analyticsData.stats?.totalPromptTokens || 1)).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Cost Analysis */}
            <div className="bg-white rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                <DollarSign className="mr-1 text-blue-500" size={14} />
                Kustannusanalyysi
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Halvin pyyntö:</span>
                  <span className="font-medium">
                    {formatCurrency(Math.min(...(analyticsData.usage?.map(u => u.estimatedCost || 0) || [0])))}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Kallein pyyntö:</span>
                  <span className="font-medium">
                    {formatCurrency(Math.max(...(analyticsData.usage?.map(u => u.estimatedCost || 0) || [0])))}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">ROI (per 1000 tok):</span>
                  <span className="font-medium">
                    {formatCurrency(((analyticsData.stats?.totalCost || 0) / (analyticsData.stats?.totalTokens || 1)) * 1000)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Usage Timeline for Selected Agent */}
          <div className="bg-white rounded-lg p-4 mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Käyttöhistoria (viimeiset 20 pyyntöä)</h4>
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart data={analyticsData.usage?.slice(-20).map((u, idx) => ({
                index: idx,
                tokens: u.totalTokens,
                cost: u.estimatedCost,
                responseTime: u.responseTime,
                success: u.success
              })) || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="index" />
                <YAxis />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-2 border border-gray-200 rounded shadow-lg">
                          <p className="text-xs font-medium">Pyyntö #{data.index + 1}</p>
                          <p className="text-xs text-gray-600">Tokenit: {formatNumber(data.tokens)}</p>
                          <p className="text-xs text-gray-600">Kustannus: {formatCurrency(data.cost)}</p>
                          <p className="text-xs text-gray-600">Aika: {data.responseTime?.toFixed(2)}s</p>
                          <p className="text-xs text-gray-600">Tila: {data.success ? '✅ OK' : '❌ Virhe'}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area type="monotone" dataKey="tokens" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Request Type Breakdown */}
          {analyticsData.usage && (
            <div className="bg-white rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Pyyntötyypit ja niiden jakautuminen</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {(() => {
                  const requestTypes = {};
                  analyticsData.usage.forEach(u => {
                    const type = u.requestType || 'Tuntematon';
                    if (!requestTypes[type]) {
                      requestTypes[type] = { count: 0, tokens: 0, cost: 0 };
                    }
                    requestTypes[type].count++;
                    requestTypes[type].tokens += u.totalTokens;
                    requestTypes[type].cost += u.estimatedCost || 0;
                  });
                  
                  return Object.entries(requestTypes).map(([type, data]) => (
                    <div key={type} className="bg-gray-50 rounded p-2">
                      <p className="text-xs font-medium text-gray-700 truncate" title={type}>{type}</p>
                      <p className="text-xs text-gray-600">{data.count} pyyntöä</p>
                      <p className="text-xs text-gray-600">{formatNumber(data.tokens)} tok</p>
                      <p className="text-xs text-gray-600">{formatCurrency(data.cost)}</p>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Model Distribution Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Käyttö malleittain</h3>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Malli
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pyynnöt
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tokenit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kustannus
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Keskiarvo/pyyntö
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {modelDistributionData.map((model) => (
                <tr key={model.name}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {model.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatNumber(model.requests)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatNumber(model.tokens)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatCurrency(model.cost)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatNumber(model.tokens / model.requests)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hourly Usage Pattern */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <Clock className="mr-2" size={20} />
          Käyttö tunneittain (24h)
        </h3>
        
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={hourlyPatterns}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="hour" 
              tickFormatter={(hour) => `${hour}:00`}
            />
            <YAxis />
            <Tooltip 
              labelFormatter={(hour) => `Klo ${hour}:00`}
              formatter={(value, name) => {
                if (name === 'Vastausaika') return `${value.toFixed(2)}s`;
                return formatNumber(value);
              }}
            />
            <Area 
              type="monotone" 
              dataKey="tokens" 
              stroke="#8b5cf6" 
              fill="#8b5cf6" 
              fillOpacity={0.3}
              name="Tokenit"
            />
            <Area 
              type="monotone" 
              dataKey="avgResponseTime" 
              stroke="#f97316" 
              fill="#f97316" 
              fillOpacity={0.3}
              name="Vastausaika"
              yAxisId="right"
            />
            <YAxis yAxisId="right" orientation="right" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Error Analytics */}
      {errorStats.total > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <AlertTriangle className="mr-2 text-red-600" size={20} />
            Virheanalyysi
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-red-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-red-700">Virheitä yhteensä</span>
                <XCircle className="text-red-600" size={18} />
              </div>
              <p className="text-2xl font-bold text-red-900 mt-2">{errorStats.total}</p>
              <p className="text-xs text-red-600 mt-1">{errorStats.rate.toFixed(1)}% kaikista</p>
            </div>

            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-orange-700">Virheelliset agentit</span>
                <AlertTriangle className="text-orange-600" size={18} />
              </div>
              <p className="text-2xl font-bold text-orange-900 mt-2">
                {Object.keys(errorStats.byAgent).length}
              </p>
              <p className="text-xs text-orange-600 mt-1">
                {Object.entries(errorStats.byAgent)
                  .sort((a, b) => b[1].count - a[1].count)[0]?.[0] || '-'} eniten
              </p>
            </div>

            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-yellow-700">Yleisin virhe</span>
                <AlertCircle className="text-yellow-600" size={18} />
              </div>
              <p className="text-xs font-medium text-yellow-900 mt-2 line-clamp-2">
                {Object.entries(errorStats.byError)
                  .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Ei virheitä'}
              </p>
              <p className="text-xs text-yellow-600 mt-1">
                {Object.entries(errorStats.byError)
                  .sort((a, b) => b[1] - a[1])[0]?.[1] || 0} kertaa
              </p>
            </div>
          </div>

          {/* Error breakdown by agent */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Virheet agenteittain:</h4>
            {Object.entries(errorStats.byAgent).map(([agent, data]) => (
              <div key={agent} className="flex items-center justify-between bg-gray-50 rounded p-2">
                <span className="text-sm text-gray-600">{AGENT_LABELS[agent] || agent}</span>
                <span className="text-sm font-medium text-red-600">{data.count} virhettä</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Response Time Distribution */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <Zap className="mr-2" size={20} />
          Vastausaikojen jakauma
        </h3>
        
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={responseTimeDistribution}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="range" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip 
              formatter={(value, name) => {
                if (name === 'Tokenit') return formatNumber(value);
                return value;
              }}
            />
            <Legend />
            <Bar yAxisId="left" dataKey="count" fill="#3b82f6" name="Pyynnöt" />
            <Bar yAxisId="right" dataKey="tokens" fill="#10b981" name="Tokenit" />
          </BarChart>
        </ResponsiveContainer>

        <div className="mt-4 grid grid-cols-5 gap-2">
          {responseTimeDistribution.map((bucket) => (
            <div key={bucket.range} className="text-center">
              <p className="text-xs text-gray-500">{bucket.range}</p>
              <p className="text-sm font-medium text-gray-900">
                {((bucket.count / detailedUsage.length) * 100).toFixed(1)}%
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Request Breakdown */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <Activity className="mr-2" size={20} />
            Yksityiskohtainen pyyntöhistoria
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDetailedBreakdown(!showDetailedBreakdown)}
            className="flex items-center gap-1"
          >
            {showDetailedBreakdown ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {showDetailedBreakdown ? 'Piilota' : 'Näytä'}
          </Button>
        </div>

        {showDetailedBreakdown && (
          <>
            <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1 relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Hae käyttäjän, tiketin tai agentin mukaan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <select
                value={selectedModel || ''}
                onChange={(e) => setSelectedModel(e.target.value || null)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Kaikki mallit</option>
                {modelDistributionData.map(model => (
                  <option key={model.name} value={model.name}>{model.name}</option>
                ))}
              </select>
              <select
                value={selectedRequestType || ''}
                onChange={(e) => setSelectedRequestType(e.target.value || null)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Kaikki pyyntötyypit</option>
                {uniqueRequestTypes.map(type => (
                  <option key={type} value={type}>
                    {REQUEST_TYPE_LABELS[type] || type}
                  </option>
                ))}
              </select>
            </div>

            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Aika</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Agentti</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tyyppi</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Malli</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Prompt</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Completion</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Yhteensä</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Kustannus</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Aika</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tila</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsage
                    .filter(r => !selectedModel || r.modelUsed === selectedModel)
                    .slice(0, 100)
                    .map((record, idx) => (
                    <tr key={record.id || idx} className={!record.success ? 'bg-red-50' : ''}>
                      <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-500">
                        {new Date(record.createdAt).toLocaleString('fi-FI', { 
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-xs font-medium text-gray-900">
                        {AGENT_LABELS[record.agentType] || record.agentType}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-xs">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                          ${record.requestType === 'generate_ticket' ? 'bg-purple-100 text-purple-800' : ''}
                          ${record.requestType === 'generate_solution_preview' ? 'bg-indigo-100 text-indigo-800' : ''}
                          ${record.requestType === 'chat_response' ? 'bg-green-100 text-green-800' : ''}
                          ${record.requestType === 'support_assistance' ? 'bg-blue-100 text-blue-800' : ''}
                          ${record.requestType === 'support_assistance_stream' ? 'bg-blue-100 text-blue-800' : ''}
                          ${record.requestType === 'summarize_conversation' ? 'bg-orange-100 text-orange-800' : ''}
                          ${!record.requestType || !['generate_ticket', 'generate_solution_preview', 'chat_response', 'support_assistance', 'support_assistance_stream', 'summarize_conversation'].includes(record.requestType) ? 'bg-gray-100 text-gray-800' : ''}
                        `}>
                          {REQUEST_TYPE_LABELS[record.requestType] || record.requestType || 'Tuntematon'}
                        </span>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-500">
                        {record.modelUsed}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-500">
                        {formatNumber(record.promptTokens)}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-500">
                        {formatNumber(record.completionTokens)}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-xs font-medium text-gray-900">
                        {formatNumber(record.totalTokens)}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-500">
                        {formatCurrency(record.estimatedCost)}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-500">
                        {record.responseTime ? `${record.responseTime.toFixed(2)}s` : '-'}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-xs">
                        {record.success ? (
                          <CheckCircle className="text-green-600" size={14} />
                        ) : (
                          <div className="flex items-center gap-1">
                            <XCircle className="text-red-600" size={14} />
                            <span className="text-red-600 truncate max-w-xs" title={record.errorMessage}>
                              {record.errorMessage}
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredUsage.length > 100 && (
              <p className="text-sm text-gray-500 mt-2">
                Näytetään 100 / {filteredUsage.length} pyyntöä
              </p>
            )}
          </>
        )}
      </div>

      {/* Token/Cost Efficiency Scatter Plot */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Token-tehokkuus malleittain</h3>
        
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="avgTokensPerRequest" 
              name="Tokenit/pyyntö" 
              label={{ value: 'Keskimääräiset tokenit per pyyntö', position: 'insideBottom', offset: -5 }}
            />
            <YAxis 
              dataKey="avgCostPerRequest" 
              name="Kustannus/pyyntö"
              label={{ value: 'Keskimääräinen kustannus per pyyntö ($)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              formatter={(value, name) => {
                if (name === 'Kustannus/pyyntö') return formatCurrency(value);
                return formatNumber(value);
              }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white p-2 border border-gray-200 rounded shadow-lg">
                      <p className="text-sm font-medium">{data.name}</p>
                      <p className="text-xs text-gray-600">Pyynnöt: {formatNumber(data.requests)}</p>
                      <p className="text-xs text-gray-600">Tokenit/pyyntö: {formatNumber(data.avgTokensPerRequest)}</p>
                      <p className="text-xs text-gray-600">Kustannus/pyyntö: {formatCurrency(data.avgCostPerRequest)}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Scatter 
              name="Mallit" 
              data={modelDistributionData.map(model => ({
                name: model.name,
                requests: model.requests,
                avgTokensPerRequest: model.tokens / model.requests,
                avgCostPerRequest: model.cost / model.requests
              }))}
              fill="#8b5cf6"
            />
          </ScatterChart>
        </ResponsiveContainer>

        <div className="mt-4 text-sm text-gray-600">
          <p>💡 Vihje: Alempi ja vasemmalle sijoittuva = tehokkaampi (vähemmän tokeneita ja kustannuksia)</p>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertCircle className="text-blue-600 mt-0.5 flex-shrink-0" size={18} />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Tietoa token-seurannasta:</p>
            <ul className="list-disc list-inside space-y-0.5 text-blue-700">
              <li>Tokenit lasketaan jokaisesta AI-mallien kutsuista</li>
              <li>Kustannukset ovat arvioita perustuen mallien hinnoitteluun</li>
              <li>Tiedot päivittyvät reaaliajassa jokaisen AI-kutsun jälkeen</li>
              <li>Käytä mallivalintoja kustannusten optimointiin</li>
              <li>Virheanalyysi auttaa tunnistamaan ongelmakohdat</li>
              <li>Tuntikohtainen käyttö paljastaa ruuhka-ajat</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TokenAnalytics;