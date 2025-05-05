import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  BarChart3, PieChart, TrendingUp, Clock, CheckCircle2, Users,
  HelpCircle, BarChart, ArrowRight, Calendar, Filter, Download, 
  RefreshCw, ChevronDown, X
} from 'lucide-react';
import { aiAnalyticsService } from '../../services/aiAnalyticsService';
import { toast } from 'react-hot-toast';
import AIAgentDetailsModal from './AIAgentDetailsModal';

const AIAssistantAnalytics = () => {
  const [dateRange, setDateRange] = useState('14d');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // State for dashboard data
  const [dashboardData, setDashboardData] = useState({
    usageData: [],
    summary: {
      totalInteractions: 0,
      totalTicketsAssisted: 0,
      avgResponseTime: 0,
      avgRating: 0
    },
    categoryData: [],
    agentUsageData: [],
    responseTimeData: {
      averageResponseTime: '0s',
      fastestResponseTime: '0s',
      percentileData: []
    },
    resolutionData: {
      withAssistant: '0',
      withoutAssistant: '0',
      improvement: '0'
    },
    overallStats: {
      totalInteractions: 0,
      totalSupportAgents: 0,
      totalTicketsAssisted: 0,
      averageSatisfactionRating: '0',
      ticketsResolvedFaster: '0%',
      knowledgeArticlesUsed: 0
    }
  });
  
  // Add state for agent details modal
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [showAgentDetails, setShowAgentDetails] = useState(false);
  const [agentDetailData, setAgentDetailData] = useState(null);
  const [loadingAgentDetails, setLoadingAgentDetails] = useState(false);
  
  // Add state for chart interactions
  const [hoveredBarIndex, setHoveredBarIndex] = useState(null);
  const [selectedUsageMetric, setSelectedUsageMetric] = useState('count'); // 'count' or 'avgResponseTime'
  
  // Add useEffect and useRef to handle clickaway for the dropdown
  const exportMenuRef = useRef(null);
  const exportButtonRef = useRef(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  
  // Handle clickaway for export menu
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        exportMenuRef.current && 
        !exportMenuRef.current.contains(event.target) &&
        exportButtonRef.current &&
        !exportButtonRef.current.contains(event.target)
      ) {
        setShowExportMenu(false);
      }
    }
    
    // Add event listener
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      // Remove event listener on cleanup
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [exportMenuRef, exportButtonRef]);
  
  // Function to fetch data from API
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    setIsRefreshing(true);
    
    try {
      // Log fetch attempt
      console.log('Fetching analytics data for date range:', dateRange);
      
      // Attempt to fetch real data from API
      const data = await aiAnalyticsService.getDashboardData(dateRange);
      
      // Check if the data has valid structure
      if (data && data.usageData) {
        console.log('Successfully fetched analytics data');
        setDashboardData(data);
      } else {
        throw new Error('Received invalid data structure from API');
      }
    } catch (err) {
      console.error('Error fetching analytics data:', err);
      setError('Analytiikkatietojen lataaminen epäonnistui. Yritä myöhemmin uudelleen.');
      toast.error('Analytiikkatietojen lataaminen epäonnistui', { duration: 5000 });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };
  
  // Fetch data on initial load or when date range changes
  useEffect(() => {
    fetchData();
  }, [dateRange]);
  
  // Handle refresh button click
  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };
  
  // Enhanced bar chart rendering
  const renderEnhancedBarChart = (data, options = {}) => {
    const {
      valueKey = 'count',
      labelKey = 'date',
      height = 200,
      showLabels = true,
      primaryColor = 'indigo',
      secondaryColor = 'blue',
      animate = true
    } = options;
    
    if (!data || data.length === 0) {
      return (
        <div className="h-40 flex items-center justify-center bg-gray-50 rounded-md">
          <p className="text-gray-500">Ei dataa saatavilla</p>
        </div>
      );
    }
    
    const maxValue = Math.max(...data.map(item => item[valueKey]));
    const avgValue = data.reduce((sum, item) => sum + item[valueKey], 0) / data.length;
    
    return (
      <div style={{ height: `${height}px` }} className="w-full relative">
        <div className="flex h-full items-end">
          {data.map((item, index) => {
            const percentage = (item[valueKey] / maxValue) * 100;
            const isHovered = hoveredBarIndex === index;
            const isAboveAvg = item[valueKey] > avgValue;
            
            // Format display value based on the type of metric
            const displayValue = valueKey === 'count' 
              ? `${item[valueKey]} interaktiota` 
              : `${item[valueKey].toFixed(1)}s vastausaika`;
            
            return (
              <div 
                key={index} 
                className="flex-1 flex flex-col items-center group"
                onMouseEnter={() => setHoveredBarIndex(index)}
                onMouseLeave={() => setHoveredBarIndex(null)}
              >
                <div className="relative w-full px-1">
                  <div 
                    className={`w-full ${
                      isHovered
                        ? `bg-${primaryColor}-600`
                        : isAboveAvg
                          ? `bg-${primaryColor}-500`
                          : `bg-${secondaryColor}-400`
                    } rounded-t hover:bg-${primaryColor}-600 transition-all duration-200`}
                    style={{ 
                      height: `${Math.max(3, percentage)}%`,
                      transition: animate ? 'height 0.5s ease-out' : 'none'
                    }}
                  >
                    <div 
                      className={`absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-1 px-2 ${isHovered ? 'opacity-100' : 'opacity-0'} group-hover:opacity-100 transition-opacity duration-200 z-10 whitespace-nowrap`}
                    >
                      {displayValue}
                      <br />
                      <span className="text-gray-300 text-[10px]">{item[labelKey]}</span>
                    </div>
                  </div>
                </div>
                {showLabels && (
                  <div className="text-xs text-gray-500 mt-1 whitespace-nowrap overflow-hidden text-ellipsis max-w-[40px] text-center">
                    {item[labelKey]}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Average line overlay */}
        <div 
          className="absolute w-full border-t border-dashed border-gray-400 -mt-1 z-10"
          style={{ 
            bottom: `${(avgValue / maxValue) * height}px`,
          }}
        >
          <div className="absolute -top-6 right-0 text-xs text-gray-500 bg-white px-1 rounded shadow-sm border border-gray-200">
            Keskiarvo: {valueKey === 'count' 
              ? Math.round(avgValue) 
              : avgValue.toFixed(1) + 's'}
          </div>
        </div>
      </div>
    );
  };
  
  // Function to render a horizontal bar chart
  const renderHorizontalBarChart = (data) => {
    if (!data || data.length === 0) {
      return (
        <div className="h-40 flex items-center justify-center bg-gray-50 rounded-md">
          <p className="text-gray-500">No data available</p>
        </div>
      );
    }
    
    const total = data.reduce((sum, item) => sum + item.value, 0);
    
    return (
      <div className="space-y-3">
        {data.map((item, index) => {
          const percentage = (item.value / total) * 100;
          return (
            <div key={index} className="relative">
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">{item.name}</span>
                <span className="text-sm font-medium text-gray-900">{percentage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full" 
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };
  
  // Function to render KPI card
  const renderKpiCard = (title, value, icon, description, color="indigo") => {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm flex flex-col h-full">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <h4 className={`text-2xl font-bold mt-1 text-${color}-600`}>{value}</h4>
          </div>
          <div className={`rounded-full p-2 bg-${color}-50 text-${color}-500`}>
            {icon}
          </div>
        </div>
        {description && (
          <p className="text-xs text-gray-500 mt-2">{description}</p>
        )}
      </div>
    );
  };

  // Function to handle viewing agent details
  const handleViewAgentDetails = async (agent) => {
    setSelectedAgent(agent);
    setShowAgentDetails(true);
    setLoadingAgentDetails(true);
    
    try {
      // Check if agent has an id property, if not, agent.name may be used as identifier
      // This fixes the "undefined" in the API URL
      const agentIdentifier = agent.id || agent.userId || agent.name;
      
      if (!agentIdentifier) {
        throw new Error('No agent identifier available');
      }
      
      // Fetch detailed data about this agent from the API
      const response = await aiAnalyticsService.getAgentDetails(agentIdentifier, dateRange);
      
      if (response && response.totalInteractions !== undefined) {
        setAgentDetailData(response);
      } else {
        throw new Error('Invalid agent details data');
      }
    } catch (err) {
      console.error('Error fetching agent details:', err);
      toast.error('Tukihenkilön tietojen hakeminen epäonnistui');
      setShowAgentDetails(false);
      setLoadingAgentDetails(false);
    } finally {
      setLoadingAgentDetails(false);
    }
  };
  
  // Function to close agent details modal
  const handleCloseAgentDetails = () => {
    setShowAgentDetails(false);
    setSelectedAgent(null);
    setAgentDetailData(null);
  };

  // Enhance resolution time comparison with visual meter
  const renderResolutionMeter = (value, maxValue, label, color) => {
    // Make sure value is at least 0.01 for display purposes
    const displayValue = parseFloat(value) < 0.01 ? 0.01 : parseFloat(value);
    const formattedValue = displayValue.toFixed(2);
    
    // Calculate percentage based on max value (with minimum to avoid div by zero)
    const safeMaxValue = Math.max(0.01, maxValue);
    const percentage = (displayValue / safeMaxValue) * 100;
    
    // For very small values, convert to minutes for better readability
    const isSmallValue = displayValue < 0.1;
    const timeDisplay = isSmallValue 
      ? `${Math.round(displayValue * 60)} min` 
      : `${formattedValue} h`;
    
    return (
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          <span className={`text-sm font-medium ${color === 'green' ? 'text-green-700' : 'text-gray-700'}`}>
            {timeDisplay}
          </span>
        </div>
        <div className="relative w-full">
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div 
              className={`${color === 'green' ? 'bg-green-500' : 'bg-gray-500'} h-4 rounded-full`} 
              style={{ width: `${Math.min(100, Math.max(5, percentage))}%` }} // Ensure bar is at least 5% visible
            />
          </div>
          {color === 'green' && (
            <div 
              className="absolute -right-2 top-1/2 transform -translate-y-1/2 bg-white border border-green-200 rounded-full w-5 h-5 flex items-center justify-center"
              style={{ marginRight: `${100 - Math.min(100, Math.max(5, percentage))}%` }}
            >
              <div className="bg-green-500 rounded-full w-3 h-3"></div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Show loading state
  if (loading && !isRefreshing) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="flex flex-col items-center">
          <RefreshCw size={40} className="text-indigo-500 animate-spin mb-4" />
          <p className="text-gray-600">Ladataan analytiikkatietoja...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error && !dashboardData.usageData.length) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm flex flex-col items-center">
        <HelpCircle size={48} className="text-red-500 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Virhe tietojen lataamisessa</h3>
        <p className="text-gray-600 mb-4 text-center">{error}</p>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md flex items-center"
        >
          <RefreshCw size={16} className="mr-2" />
          Yritä uudelleen
        </button>
      </div>
    );
  }

  const { 
    usageData, 
    summary, 
    categoryData, 
    agentUsageData, 
    responseTimeData, 
    resolutionData, 
    overallStats 
  } = dashboardData;

  // Add this helper function for CSV generation
  const generateCsv = (data, title) => {
    if (!data || data.length === 0) return;
    
    // Create headers based on the first object's keys
    const headers = Object.keys(data[0]);
    
    // Convert data to CSV rows
    const csvRows = [];
    csvRows.push(headers.join(','));
    
    // Add data rows
    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        
        // Handle values that contain commas or quotes
        const escaped = value !== null && value !== undefined 
          ? String(value).replace(/"/g, '""') 
          : '';
        
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }
    
    // Combine rows into a single string
    const csvContent = csvRows.join('\n');
    
    // Create a blob and download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    // Set link properties
    link.setAttribute('href', url);
    link.setAttribute('download', `${title}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    // Add to document, trigger download, and cleanup
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Revoke object URL to free up memory
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 100);
  };

  // Add these utility functions to handle exports
  const handleExportUsageData = () => {
    try {
      // Prepare data for export with properly formatted values
      const exportData = usageData.map(item => ({
        Päivämäärä: item.date,
        Interaktiot: item.count,
        KeskimVastausaika: item.avgResponseTime ? item.avgResponseTime.toFixed(2) + 's' : '-',
        ArvosanaKA: item.avgRating ? item.avgRating.toFixed(2) : '-',
        AvustetutTiketit: item.ticketsAssisted || 0
      }));
      
      generateCsv(exportData, 'AI_Assistant_Usage');
      toast.success('Tiedot ladattu CSV-tiedostona');
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Tietojen lataus epäonnistui');
    }
  };

  const handleExportCategoryData = () => {
    try {
      // Calculate total for percentage calculation
      const totalInteractions = categoryData.reduce((sum, item) => sum + item.value, 0);
      
      // Prepare data for export with properly formatted values
      const exportData = categoryData.map(item => ({
        Kategoria: item.name,
        Interaktiot: item.value,
        ProsOsuus: ((item.value / totalInteractions) * 100).toFixed(2) + '%'
      }));
      
      generateCsv(exportData, 'AI_Assistant_Categories');
      toast.success('Tiedot ladattu CSV-tiedostona');
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Tietojen lataus epäonnistui');
    }
  };

  const handleExportAgentData = () => {
    try {
      // Prepare data for export with properly formatted values
      const exportData = agentUsageData.map(item => ({
        Tukihenkilö: item.name,
        Interaktiot: item.count,
        Arvosana: item.rating ? item.rating.toFixed(2) : '-',
        ArvioidentilukumääräräN: item.ratingCount || '-',
        Keskimvastausaika: item.avgResponseTime ? item.avgResponseTime.toFixed(2) + 's' : '-'
      }));
      
      generateCsv(exportData, 'AI_Assistant_AgentUsage');
      toast.success('Tiedot ladattu CSV-tiedostona');
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Tietojen lataus epäonnistui');
    }
  };

  return (
    <div className="space-y-6">
      {/* Analytics header with filters and controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">AI-avustajan analytiikka</h3>
          <p className="text-sm text-gray-500">Tarkastele suorituskykyä, käyttöä ja vaikutusta</p>
        </div>
        
        <div className="flex flex-col sm:flex-row justify-between space-y-3 sm:space-y-0 sm:space-x-4 mb-6">
          <div className="flex space-x-3">
            <div className="inline-block relative">
              <button
                onClick={() => setDateRange('7d')}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  dateRange === '7d' 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                7 päivää
              </button>
            </div>
            <div className="inline-block relative">
              <button
                onClick={() => setDateRange('14d')}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  dateRange === '14d' 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                14 päivää
              </button>
            </div>
            <div className="inline-block relative">
              <button
                onClick={() => setDateRange('30d')}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  dateRange === '30d' 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                30 päivää
              </button>
            </div>
            <div className="inline-block relative">
              <button
                onClick={() => setDateRange('90d')}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  dateRange === '90d' 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                90 päivää
              </button>
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleRefresh}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <RefreshCw className="animate-spin -ml-1 mr-2 h-5 w-5 text-gray-500" />
              ) : (
                <RefreshCw className="-ml-1 mr-2 h-5 w-5 text-gray-500" />
              )}
              Päivitä
            </button>
            <div className="inline-block relative">
              <button
                ref={exportButtonRef}
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
              >
                <Download className="-ml-1 mr-2 h-5 w-5 text-gray-500" />
                Lataa CSV
                <ChevronDown className="ml-2 h-5 w-5 text-gray-500" />
              </button>
              {showExportMenu && (
                <div 
                  ref={exportMenuRef}
                  className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10"
                >
                  <div className="py-1" role="menu" aria-orientation="vertical">
                    <button
                      onClick={() => {
                        handleExportUsageData();
                        setShowExportMenu(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      role="menuitem"
                    >
                      Käyttödatan vienti
                    </button>
                    <button
                      onClick={() => {
                        handleExportCategoryData();
                        setShowExportMenu(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      role="menuitem"
                    >
                      Kategoriatilastojen vienti
                    </button>
                    <button
                      onClick={() => {
                        handleExportAgentData();
                        setShowExportMenu(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      role="menuitem"
                    >
                      Käyttäjätilastojen vienti
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* KPI summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {renderKpiCard(
          "Avustettuja tikettejä", 
          overallStats.totalTicketsAssisted, 
          <CheckCircle2 size={20} />, 
          "Tikettien määrä, joissa AI-avustaja on auttanut tukihenkilöä"
        )}
        
        {renderKpiCard(
          "Interaktioita yhteensä", 
          overallStats.totalInteractions, 
          <Users size={20} />, 
          "Käyttäjien ja AI-avustajan väliset keskustelut",
          "blue"
        )}
        
        {renderKpiCard(
          "Keskimääräinen vastausaika", 
          responseTimeData.averageResponseTime, 
          <Clock size={20} />, 
          "Aika kysymyksestä AI-avustajan vastaukseen",
          "green"
        )}
        
        {renderKpiCard(
          "Tyytyväisyysaste", 
          overallStats.averageSatisfactionRating + "/5", 
          <TrendingUp size={20} />, 
          "Tukihenkilöiden tyytyväisyys avustajan vastauksiin",
          "purple"
        )}
      </div>
      
      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Usage chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-base font-semibold text-gray-800">Käyttötrendit</h4>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setSelectedUsageMetric('count')}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  selectedUsageMetric === 'count' 
                    ? 'bg-indigo-100 text-indigo-700 font-medium' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Interaktiot
              </button>
              <button
                onClick={() => setSelectedUsageMetric('avgResponseTime')}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  selectedUsageMetric === 'avgResponseTime' 
                    ? 'bg-indigo-100 text-indigo-700 font-medium' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Vastausaika
              </button>
            </div>
          </div>
          
          {renderEnhancedBarChart(usageData, {
            valueKey: selectedUsageMetric,
            labelKey: 'date',
            height: 180,
            primaryColor: selectedUsageMetric === 'count' ? 'indigo' : 'blue',
            secondaryColor: selectedUsageMetric === 'count' ? 'indigo' : 'blue'
          })}
          
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center">
              <div className={`w-3 h-3 ${selectedUsageMetric === 'count' ? 'bg-indigo-500' : 'bg-blue-500'} rounded-full mr-1`}></div>
              <span className="text-xs text-gray-600">
                {selectedUsageMetric === 'count' ? 'Avustajan käyttökerrat' : 'Keskimääräinen vastausaika'}
              </span>
            </div>
            <div className="text-xs text-gray-500">
              {usageData.length} päivän data
            </div>
          </div>
        </div>
        
        {/* Category distribution */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-base font-semibold text-gray-800">Tikettijakaumat kategorioittain</h4>
          </div>
          
          {renderHorizontalBarChart(categoryData)}
          
          <div className="mt-4 text-sm text-gray-500">
            <p>Prosentuaalinen jakauma tikettikategorioista, joissa AI-avustajaa käytetään.</p>
          </div>
        </div>
      </div>
      
      {/* Resolution time comparison */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <h4 className="text-base font-semibold text-gray-800 mb-3">Ratkaisuaikojen vertailu</h4>
        
        <div className="grid grid-cols-1 gap-5">
          {renderResolutionMeter(
            resolutionData.withAssistant,
            Math.max(parseFloat(resolutionData.withAssistant), parseFloat(resolutionData.withoutAssistant)),
            "AI-avustajan kanssa",
            "green"
          )}
          
          {renderResolutionMeter(
            resolutionData.withoutAssistant,
            Math.max(parseFloat(resolutionData.withAssistant), parseFloat(resolutionData.withoutAssistant)),
            "Ilman AI-avustajaa",
            "gray"
          )}
          
          <div className="mt-1 p-3 bg-gray-50 rounded-md border border-gray-200">
            <div className="flex items-start">
              {parseFloat(resolutionData.improvement) > 0 ? (
                <>
                  <TrendingUp className="text-green-500 mr-2 flex-shrink-0 mt-0.5" size={16} />
                  <div>
                    <p className="text-sm text-green-700">
                      <span className="font-medium">Parannus: {Math.abs(parseFloat(resolutionData.improvement)).toFixed(1)}%</span>
                      {' '}nopeampi ratkaisuaika AI-avustajaa käytettäessä.
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      Vertailu perustuu {dateRange} aikana ratkaistuihin tiketteihin.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <TrendingUp className="text-gray-500 mr-2 flex-shrink-0 mt-0.5 transform rotate-180" size={16} />
                  <div>
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Huomio: AI-avustajan käyttö kesti {Math.abs(parseFloat(resolutionData.improvement)).toFixed(1)}%</span>
                      {' '}kauemmin tässä otannassa.
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Vertailu perustuu {dateRange} aikana ratkaistuihin tiketteihin.
                      Pieni otanta voi vääristää tulosta.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Support agent usage table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h4 className="text-base font-semibold text-gray-800">Tukihenkilöiden käyttö</h4>
          <p className="text-sm text-gray-500">Tukihenkilöt, jotka käyttävät AI-avustajaa eniten</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tukihenkilö
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Käyttökerrat
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tyytyväisyys
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Toiminnot
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {agentUsageData && agentUsageData.length > 0 ? (
                agentUsageData.map((agent, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{agent.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{agent.count}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-sm text-gray-900 mr-2">{agent.rating.toFixed(1)}</span>
                        <div className="flex">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <svg 
                              key={i} 
                              className={`w-4 h-4 ${i < Math.floor(agent.rating) ? 'text-yellow-400' : 'text-gray-300'}`} 
                              fill="currentColor" 
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        onClick={() => handleViewAgentDetails(agent)}
                        className="text-indigo-600 hover:text-indigo-900 flex items-center ml-auto"
                      >
                        <span>Näytä tiedot</span>
                        <ArrowRight size={16} className="ml-1" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-sm text-gray-500">
                    Ei tukihenkilötietoja saatavilla.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Response time percentiles */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <h4 className="text-base font-semibold text-gray-800 mb-3">Vastausaikojen jakauma</h4>
        
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prosenttipiste</th>
                {responseTimeData.percentileData && responseTimeData.percentileData.map((item, index) => (
                  <th key={index} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {item.percentile}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-4 py-2 text-sm text-gray-900 font-medium">Vastausaika</td>
                {responseTimeData.percentileData && responseTimeData.percentileData.map((item, index) => (
                  <td key={index} className="px-4 py-2 text-sm text-gray-900">
                    {item.time}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        
        <div className="mt-3 text-xs text-gray-500">
          <p>Prosenttipisteet osoittavat, miten nopeasti AI-avustaja vastaa tukikysymyksiin. Esimerkiksi 90% kaikista vastauksista on nopeampia kuin 90. prosenttipisteen arvo.</p>
        </div>
      </div>
      
      {/* Agent details modal */}
      <AIAgentDetailsModal
        isOpen={showAgentDetails}
        onClose={handleCloseAgentDetails}
        agent={selectedAgent}
        detailData={agentDetailData}
        loading={loadingAgentDetails}
        renderEnhancedBarChart={renderEnhancedBarChart}
      />
    </div>
  );
};

export default AIAssistantAnalytics; 