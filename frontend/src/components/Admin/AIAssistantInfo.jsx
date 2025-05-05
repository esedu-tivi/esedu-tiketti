import React from 'react';
import { Bot, Sparkles, Info, MessageSquare, FileText, HelpCircle, CheckCircle2 } from 'lucide-react';

export default function AIAssistantInfo() {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-green-100 p-2 rounded-lg">
            <Bot className="h-6 w-6 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800">
            Tukiavustaja
          </h2>
        </div>
        
        <p className="text-gray-700 mb-4">
          Tukiavustaja on tekoälytyökalu, joka auttaa IT-tukihenkilöitä ratkaisemaan tukipyyntöjä tehokkaammin.
          Avustaja analysoi tiketin tiedot, keskusteluhistorian ja tietopankin artikkelit tarjotakseen räätälöityjä
          vastauksia ja ratkaisuehdotuksia.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <FeatureCard 
            icon={FileText} 
            title="Tikettien analyysi" 
            description="Tukiavustaja analysoi tiketin kuvausta, laitteistotietoja ja kategoriatietoja ymmärtääkseen ongelman kontekstin."
          />
          <FeatureCard 
            icon={MessageSquare} 
            title="Keskusteluhistoria" 
            description="Avustaja lukee aiemman keskusteluhistorian ymmärtääkseen mitä loppukäyttäjän kanssa on jo käyty läpi."
          />
          <FeatureCard 
            icon={HelpCircle} 
            title="Vastaukset kysymyksiin" 
            description="Kysy järjestelmältä tiettyä tikettiin liittyvää kysymystä ja saa asiantuntevaa ohjausta."
          />
          <FeatureCard 
            icon={CheckCircle2} 
            title="Ratkaisuehdotukset" 
            description="Saa konkreettisia vaiheittaisia ohjeita ongelman ratkaisuun perustuen tietopankin tietoihin."
          />
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Info className="h-5 w-5 text-blue-500" />
          <span>Miten käyttää tukiavustajaa</span>
        </h3>
        
        <ol className="list-decimal list-inside space-y-3 text-gray-700">
          <li>
            <strong>Avaa tiketti</strong> - Avaa tukipyynnön tiedot klikkaamalla tikettilistauksesta.
          </li>
          <li>
            <strong>Ota tiketti käsittelyyn</strong> - Tukiavustaja on käytettävissä vain, kun tiketti on sinun käsittelyssäsi.
          </li>
          <li>
            <strong>Avaa tukiavustaja</strong> - Klikkaa "Avaa tukiavustaja" -painiketta tiketin tiedot-näkymän oikeassa reunassa.
          </li>
          <li>
            <strong>Kysy kysymys</strong> - Kirjoita kysymyksesi avustajalle ja lähetä se. Voit kysyä esimerkiksi:
            <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-gray-600">
              <li>Mitä ongelman aiheuttajia kannattaisi tutkia ensimmäisenä?</li>
              <li>Miten tämä ongelma tyypillisesti ratkaistaan?</li>
              <li>Mitä lisätietoja minun kannattaisi pyytää käyttäjältä?</li>
            </ul>
          </li>
          <li>
            <strong>Saa vastaus</strong> - Tukiavustaja vastaa kysymykseesi tiketin kontekstin ja tietopankin tietojen perusteella.
          </li>
        </ol>
        
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="flex items-start gap-2 text-yellow-800">
            <Sparkles className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
            <span>
              <strong>Huomio:</strong> Tukiavustaja toimii vain konsultatiivisessa roolissa. 
              Varmista aina, että sen ehdottamat toimenpiteet ovat asianmukaisia ennen niiden toteuttamista. 
              Järjestelmä hyödyntää kategoriakohtaista tietopankkia vastauksissaan.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

// Feature card component for displaying assistant features
function FeatureCard({ icon: Icon, title, description }) {
  return (
    <div className="p-4 border border-gray-200 rounded-lg bg-white hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-1.5 bg-green-50 rounded-md">
          <Icon className="h-4 w-4 text-green-600" />
        </div>
        <h4 className="font-medium text-gray-800">{title}</h4>
      </div>
      <p className="text-sm text-gray-600 ml-9">{description}</p>
    </div>
  );
} 