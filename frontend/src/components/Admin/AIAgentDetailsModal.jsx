import React from 'react';
import { RefreshCw, HelpCircle, X } from 'lucide-react';

/**
 * Modal component for displaying detailed analytics for an AI agent
 * Follows the same pattern as FilterDialog for consistency
 */
const AIAgentDetailsModal = ({ 
  isOpen, 
  onClose, 
  agent, 
  detailData,
  loading,
  renderEnhancedBarChart
}) => {
  if (!isOpen) return null;
  
  return (
    <div 
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" 
      onClick={onClose} // Close on overlay click
    >
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside dialog
      >
        <div className="sticky top-0 bg-gradient-to-r from-indigo-700 to-indigo-800 px-6 py-4 rounded-t-lg">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-white">
              Tukihenkilön {agent?.name} AI-käyttö
            </h3>
            <button 
              onClick={onClose}
              className="text-indigo-100 hover:text-white p-1 rounded-md hover:bg-indigo-600"
              title="Sulje"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <RefreshCw size={30} className="text-indigo-500 animate-spin" />
              <span className="ml-2 text-gray-600">Ladataan tietoja...</span>
            </div>
          ) : detailData ? (
            <div className="space-y-6">
              {/* Summary statistics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-sm text-gray-500 mb-1">Interaktiot yhteensä</p>
                  <p className="text-2xl font-bold text-indigo-600">{detailData.totalInteractions}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-sm text-gray-500 mb-1">Keskimääräinen vastausaika</p>
                  <p className="text-2xl font-bold text-indigo-600">{detailData.averageResponseTime}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-sm text-gray-500 mb-1">Keskiarvo palautteista</p>
                  <p className="text-2xl font-bold text-indigo-600">{agent?.rating?.toFixed(1) || "N/A"}/5</p>
                </div>
              </div>

              {/* Rating distribution */}
              <div>
                <h4 className="text-base font-medium text-gray-800 mb-3">Arvioiden jakauma</h4>
                {detailData.responseRatings && detailData.responseRatings.length > 0 ? (
                  <div className="space-y-2">
                    {detailData.responseRatings.map((item, index) => (
                      <div key={index} className="relative">
                        <div className="flex justify-between mb-1">
                          <div className="flex items-center">
                            <span className="text-sm font-medium text-gray-700 w-6">{item.rating}</span>
                            <div className="flex ml-1">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <svg 
                                  key={i} 
                                  className={`w-4 h-4 ${i < item.rating ? 'text-yellow-400' : 'text-gray-300'}`} 
                                  fill="currentColor" 
                                  viewBox="0 0 20 20"
                                >
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              ))}
                            </div>
                          </div>
                          <span className="text-sm font-medium text-gray-700">{item.count}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div 
                            className="bg-yellow-400 h-2.5 rounded-full" 
                            style={{ width: `${(item.count / detailData.totalInteractions) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-50 p-4 rounded-md text-center text-gray-500">
                    Ei arviointeja saatavilla
                  </div>
                )}
              </div>

              {/* Usage trend */}
              <div>
                <h4 className="text-base font-medium text-gray-800 mb-3">Käyttötrendi</h4>
                {detailData.interactionsByDay && detailData.interactionsByDay.length > 0 ? (
                  renderEnhancedBarChart(detailData.interactionsByDay, {
                    valueKey: 'count',
                    labelKey: 'date',
                    height: 150,
                    primaryColor: 'indigo',
                    secondaryColor: 'indigo'
                  })
                ) : (
                  <div className="bg-gray-50 p-4 rounded-md text-center text-gray-500">
                    Ei käyttötrendidataa saatavilla
                  </div>
                )}
              </div>

              {/* Common queries */}
              <div>
                <h4 className="text-base font-medium text-gray-800 mb-3">Yleisimmät kysymykset</h4>
                {detailData.commonQueries && detailData.commonQueries.length > 0 ? (
                  <div className="bg-gray-50 rounded-lg border border-gray-200 divide-y divide-gray-200">
                    {detailData.commonQueries.map((query, index) => (
                      <div key={index} className="p-3 flex items-start">
                        <span className="text-indigo-500 mr-2">Q:</span>
                        <span className="text-sm text-gray-700">{query}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-50 p-4 rounded-md text-center text-gray-500">
                    Ei yleisiä kysymyksiä saatavilla
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-gray-500">
              <HelpCircle size={40} className="mx-auto mb-4 text-gray-400" />
              <p>Tietoja ei ole saatavilla</p>
              <p className="text-sm mt-2">Tukihenkilön tietojen hakeminen epäonnistui.</p>
            </div>
          )}
        </div>
        
        <div className="bg-gray-50 px-6 py-3 flex justify-end rounded-b-lg border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            Sulje
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIAgentDetailsModal; 