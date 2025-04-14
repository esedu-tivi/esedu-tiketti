import { useState } from 'react';
import AITicketGenerator from '../components/Admin/AITicketGenerator';
import AiTicketAnalysis from '../components/Admin/AiTicketAnalysis';
import ConversationModal from '../components/Admin/ConversationModal';
import SolutionWindow from '../components/Admin/SolutionWindow';
import { 
  Sparkles, 
  CogIcon, 
  MessageSquare, 
  BarChart3, 
  ChevronRight,
  Brain,
  RefreshCw,
  FileText,
  Users,
  ShieldAlert
} from 'lucide-react';

/**
 * AITools - Page for AI-related tools for administrators and support staff
 * Displays AI-based tools for helpdesk management and training
 */
const AITools = () => {
  // State for active tab
  const [activeTab, setActiveTab] = useState('ticket-generator');

  // State for conversation modal
  const [selectedConvTicketId, setSelectedConvTicketId] = useState(null);
  const [isConvModalOpen, setIsConvModalOpen] = useState(false);

  // State for solution window
  const [selectedSolTicketId, setSelectedSolTicketId] = useState(null);
  const [isSolWindowOpen, setIsSolWindowOpen] = useState(false);

  // Handler to open conversation modal
  const handleViewConversation = (ticketId) => {
    setSelectedConvTicketId(ticketId);
    setIsConvModalOpen(true);
  };

  // Handler to close conversation modal
  const handleCloseConversationModal = () => {
    setIsConvModalOpen(false);
    setSelectedConvTicketId(null);
  };

  // Handler to open solution window
  const handleViewSolution = (ticketId) => {
    setSelectedSolTicketId(ticketId);
    setIsSolWindowOpen(true);
  };

  // Handler to close solution window
  const handleCloseSolutionWindow = () => {
    setIsSolWindowOpen(false);
    setSelectedSolTicketId(null);
  };
  
  // Stats used in the dashboard (these would be real metrics in production)
  const stats = [
    { label: 'Tikettejä luotu', value: '248', icon: <FileText size={16} className="text-blue-500" /> },
    { label: 'AI:n analysoituja', value: '1,024', icon: <Brain size={16} className="text-purple-500" /> },
    { label: 'Vastausaika', value: '2.4s', icon: <RefreshCw size={16} className="text-green-500" /> },
    { label: 'Tarkkuus', value: '97%', icon: <ShieldAlert size={16} className="text-orange-500" /> }
  ];

  // Tabs available in the AI tools section
  const tabs = [
    { 
      id: 'ticket-generator', 
      label: 'Tikettigeneraattori', 
      icon: <Sparkles size={16} className="text-indigo-500" />,
      description: 'Luo realistisia IT-tukitikettejä opiskelijoiden harjoittelua varten'
    },
    { 
      id: 'analysis', 
      label: 'Tikettien analyysi', 
      icon: <BarChart3 size={16} className="text-blue-500" />,
      description: 'Analysoi AI-generoituja tikettejä ja niiden keskusteluja',
    },
    { 
      id: 'assistant', 
      label: 'AI-avustaja', 
      icon: <MessageSquare size={16} className="text-green-500" />,
      description: 'Tekoälyavustaja tukihenkilöille tikettien ratkaisuun',
      disabled: true
    },
    { 
      id: 'config', 
      label: 'AI-asetukset', 
      icon: <CogIcon size={16} className="text-gray-500" />,
      description: 'Määritä tekoälyominaisuuksien asetukset ja mallit',
      disabled: true
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-12 relative">
      {/* Hero section with gradient background */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-500 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <div className="flex items-center">
                <Sparkles className="mr-3" size={28} />
                <h1 className="text-3xl font-bold">Tekoälytyökalut</h1>
              </div>
              <p className="mt-2 text-indigo-100 max-w-2xl">
                Tehosta IT-tukikeskusta tekoälypohjaisilla ratkaisuilla ja luo realistisia harjoitustilanteita
              </p>
            </div>
            <div className="mt-4 md:mt-0 flex space-x-3">
              <button className="px-4 py-2 bg-white bg-opacity-10 rounded-lg text-sm font-medium hover:bg-opacity-20 transition-all flex items-center">
                <Users size={16} className="mr-2" />
                Tukihenkilöt
              </button>
              <button className="px-4 py-2 bg-white bg-opacity-10 rounded-lg text-sm font-medium hover:bg-opacity-20 transition-all flex items-center">
                Dokumentaatio
                <ChevronRight size={16} className="ml-2" />
              </button>
            </div>
          </div>
          
          {/* Metrics display */}
          <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, i) => (
              <div key={i} className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg px-5 py-4">
                <div className="flex items-center space-x-2 mb-2">
                  {stat.icon}
                  <p className="text-xs font-medium text-indigo-100">{stat.label}</p>
                </div>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Main content area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Tab navigation */}
          <div className="flex flex-wrap border-b border-gray-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => !tab.disabled && setActiveTab(tab.id)}
                disabled={tab.disabled}
                className={`
                  px-6 py-4 text-sm font-medium border-b-2 flex items-center
                  ${activeTab === tab.id 
                    ? 'border-indigo-500 text-indigo-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                  ${tab.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                {tab.icon}
                <span className="ml-2">{tab.label}</span>
                {tab.disabled && (
                  <span className="ml-2 text-xs bg-gray-100 text-gray-500 py-0.5 px-2 rounded-full">
                    Tulossa
                  </span>
                )}
              </button>
            ))}
          </div>
          
          {/* Tab description bar */}
          <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
            <p className="text-sm text-gray-600">
              {tabs.find(tab => tab.id === activeTab)?.description}
            </p>
          </div>
          
          {/* Tab content */}
          <div className="p-6">
            {activeTab === 'ticket-generator' && <AITicketGenerator />}
            {activeTab === 'analysis' && (
              <AiTicketAnalysis 
                onViewConversation={handleViewConversation}
              />
            )}
            {activeTab === 'assistant' && (
              <div className="text-center py-20 text-gray-500">
                <MessageSquare size={48} className="mx-auto mb-4 opacity-30" />
                <h3 className="text-lg font-medium mb-2">AI-avustaja</h3>
                <p className="max-w-md mx-auto">
                  Tämä ominaisuus on kehityksen alla. Se tarjoaa tekoälyavusteisen
                  apuvälineen tukihenkilöille tikettien ratkaisuun.
                </p>
              </div>
            )}
            {activeTab === 'config' && (
              <div className="text-center py-20 text-gray-500">
                <CogIcon size={48} className="mx-auto mb-4 opacity-30" />
                <h3 className="text-lg font-medium mb-2">AI-asetukset</h3>
                <p className="max-w-md mx-auto">
                  Tämä ominaisuus on kehityksen alla. Se mahdollistaa tekoälyominaisuuksien
                  asetusten ja mallien määrittämisen.
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* Info section */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0 bg-indigo-50 p-3 rounded-lg">
              <Brain className="text-indigo-500" size={24} />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">Tietoa tekoälytyökaluista</h3>
              <div className="mt-2 text-sm text-gray-600 space-y-3">
                <p>
                  Tekoälytyökalut on suunniteltu auttamaan IT-tuen opiskelijoita harjoittelemaan 
                  realististen tukipyyntöjen kanssa. Tämä alusta tarjoaa työkaluja tikettien luomiseen, 
                  analysointiin ja ratkaisemiseen tekoälyn avulla.
                </p>
                <p>
                  <strong>Tikettigeneraattori</strong> luo realistisia harjoitustikettejä, jotka jäljittelevät oikeita IT-tukitikettejä. 
                  Voit määrittää tiketin vaikeustason, kategorian ja käyttäjäprofiilin luodaksesi monipuolisia harjoitustilanteita.
                </p>
                <p className="italic">
                  Huomaa: Tämän toiminnon käyttäminen vaatii OpenAI API -avaimen. Tekoälyominaisuudet käyttävät
                  LLM-malleja tikettien generointiin.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal and Window Container */}
      {(isConvModalOpen || isSolWindowOpen) && ( 
          <div className={`
            fixed inset-0 z-50 flex p-4 
            overflow-y-auto md:overflow-y-hidden /* Allow scroll on mobile stack */ 
            
            /* Mobile: Stack vertically, align center */
            flex-col items-center justify-start pt-8 space-y-4 
            
            /* Medium and Up: Side-by-side, align top */
            md:flex-row md:justify-around md:items-start md:pt-16 md:space-y-0
            
            bg-black/30 backdrop-blur-sm 
            transition-opacity duration-300 ease-out 
            ${(isConvModalOpen || isSolWindowOpen) ? 'opacity-100' : 'opacity-0 pointer-events-none'}
          `}>
            {/* Render Conversation Modal conditionally */}
            {isConvModalOpen && (
              <ConversationModal
                open={isConvModalOpen} 
                onClose={handleCloseConversationModal}
                ticketId={selectedConvTicketId}
                onOpenSolutionWindow={handleViewSolution}
                // Pass state for conditional rendering of internal solution
                isSolutionWindowOpen={isSolWindowOpen} 
                solutionWindowTicketId={selectedSolTicketId} 
              />
            )}
            
            {/* Render Solution Window conditionally */}
            {isSolWindowOpen && ( 
              <SolutionWindow
                open={isSolWindowOpen} 
                onClose={handleCloseSolutionWindow}
                ticketId={selectedSolTicketId}
              />
            )}
          </div>
      )}
    </div>
  );
};

export default AITools; 