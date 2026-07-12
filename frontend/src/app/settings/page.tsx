"use client";

import { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Settings, Building, Key, Bell, Shield, Cloud, CreditCard, Plug, Database, Smartphone } from "lucide-react";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("company");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // State for Settings
  const [companyData, setCompanyData] = useState({
    name: "",
    nip: "",
    city: "",
    street: "",
    postalCode: "",
    country: "Polska",
    email: "",
    phone: ""
  });

  const [apiKeys, setApiKeys] = useState({
    infakt: "",
    vincarioApiKey: "",
    vincarioApiSecret: "",
    twilioAccountSid: "",
    twilioAuthToken: "",
    twilioPhoneNumber: "",
    resendApiKey: "",
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch(`http://${window.location.hostname}:3001/settings`);
        if (response.ok) {
          const data = await response.json();
          setCompanyData({
            name: data.companyName || "",
            nip: data.companyNip || "",
            city: data.companyCity || "",
            street: data.companyStreet || "",
            postalCode: data.companyPostalCode || "",
            country: data.companyCountry || "Polska",
            email: data.companyEmail || "",
            phone: data.companyPhone || ""
          });
          setApiKeys({
            infakt: data.infaktApiKey || "",
            vincarioApiKey: data.vincarioApiKey || "",
            vincarioApiSecret: data.vincarioApiSecret || "",
            twilioAccountSid: data.twilioAccountSid || "",
            twilioAuthToken: data.twilioAuthToken || "",
            twilioPhoneNumber: data.twilioPhoneNumber || "",
            resendApiKey: data.resendApiKey || "",
          });
        }
      } catch (e) {
        toast.error("Nie udało się pobrać ustawień");
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`http://${window.location.hostname}:3001/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: companyData.name,
          companyNip: companyData.nip,
          companyCity: companyData.city,
          companyStreet: companyData.street,
          companyPostalCode: companyData.postalCode,
          companyCountry: companyData.country,
          companyEmail: companyData.email,
          companyPhone: companyData.phone,
          infaktApiKey: apiKeys.infakt,
          vincarioApiKey: apiKeys.vincarioApiKey,
          vincarioApiSecret: apiKeys.vincarioApiSecret,
          twilioAccountSid: apiKeys.twilioAccountSid,
          twilioAuthToken: apiKeys.twilioAuthToken,
          twilioPhoneNumber: apiKeys.twilioPhoneNumber,
          resendApiKey: apiKeys.resendApiKey,
        })
      });

      if (response.ok) {
        toast.success("Ustawienia zostały zapisane.");
      } else {
        toast.error("Błąd podczas zapisywania ustawień");
      }
    } catch (e) {
      toast.error("Błąd połączenia");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 p-6 md:p-10 max-w-6xl mx-auto w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-600">
            Ustawienia Systemu
          </h1>
          <p className="text-zinc-400 mt-2 text-lg">Zarządzaj profilem firmy, integracjami i preferencjami aplikacji.</p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          className="bg-cyan-600 hover:bg-cyan-500 text-white font-medium shadow-lg shadow-cyan-500/25 transition-all duration-300 rounded-full px-8 h-11"
        >
          {isSaving ? "Zapisywanie..." : "Zapisz zmiany"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mt-4">
        
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1 flex flex-col gap-2">
          <button 
            onClick={() => setActiveTab("company")}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === "company" 
                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" 
                : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 border border-transparent"
            }`}
          >
            <Building className="h-5 w-5" />
            <span className="font-medium">Profil Firmy</span>
          </button>
          
          <button 
            onClick={() => setActiveTab("integrations")}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === "integrations" 
                ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" 
                : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 border border-transparent"
            }`}
          >
            <Plug className="h-5 w-5" />
            <span className="font-medium">Integracje (API)</span>
          </button>
          
          <button 
            onClick={() => setActiveTab("notifications")}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === "notifications" 
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" 
                : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 border border-transparent"
            }`}
          >
            <Bell className="h-5 w-5" />
            <span className="font-medium">Powiadomienia</span>
          </button>

          <button 
            onClick={() => setActiveTab("security")}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === "security" 
                ? "bg-green-500/10 text-green-400 border border-green-500/20" 
                : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 border border-transparent"
            }`}
          >
            <Shield className="h-5 w-5" />
            <span className="font-medium">Bezpieczeństwo</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          
          {/* Company Profile Tab */}
          {activeTab === "company" && (
            <GlassCard className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
                <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Building className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-zinc-100">Dane Warsztatu</h2>
                  <p className="text-sm text-zinc-500">Informacje widoczne na dokumentach i w komunikacji z klientem.</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                <div className="grid gap-2">
                  <Label htmlFor="companyName" className="text-zinc-300">Nazwa firmy</Label>
                  <Input 
                    id="companyName" 
                    value={companyData.name} 
                    onChange={e => setCompanyData({...companyData, name: e.target.value})} 
                    className="bg-zinc-900 border-zinc-800 focus-visible:ring-cyan-500" 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="companyNip" className="text-zinc-300">NIP</Label>
                  <Input 
                    id="companyNip" 
                    value={companyData.nip} 
                    onChange={e => setCompanyData({...companyData, nip: e.target.value})} 
                    className="bg-zinc-900 border-zinc-800 focus-visible:ring-cyan-500 font-mono" 
                  />
                </div>
                <div className="grid gap-2 md:col-span-2">
                  <Label htmlFor="companyStreet" className="text-zinc-300">Adres (Ulica i numer)</Label>
                  <Input 
                    id="companyStreet" 
                    value={companyData.street} 
                    onChange={e => setCompanyData({...companyData, street: e.target.value})} 
                    className="bg-zinc-900 border-zinc-800 focus-visible:ring-cyan-500" 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="companyPostalCode" className="text-zinc-300">Kod pocztowy</Label>
                  <Input 
                    id="companyPostalCode" 
                    value={companyData.postalCode} 
                    onChange={e => setCompanyData({...companyData, postalCode: e.target.value})} 
                    className="bg-zinc-900 border-zinc-800 focus-visible:ring-cyan-500" 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="companyCity" className="text-zinc-300">Miejscowość</Label>
                  <Input 
                    id="companyCity" 
                    value={companyData.city} 
                    onChange={e => setCompanyData({...companyData, city: e.target.value})} 
                    className="bg-zinc-900 border-zinc-800 focus-visible:ring-cyan-500" 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="companyCountry" className="text-zinc-300">Kraj</Label>
                  <Input 
                    id="companyCountry" 
                    value={companyData.country} 
                    disabled
                    className="bg-zinc-900/50 border-zinc-800 text-zinc-500 cursor-not-allowed" 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="companyEmail" className="text-zinc-300">Adres e-mail</Label>
                  <Input 
                    id="companyEmail" 
                    type="email"
                    value={companyData.email} 
                    onChange={e => setCompanyData({...companyData, email: e.target.value})} 
                    className="bg-zinc-900 border-zinc-800 focus-visible:ring-cyan-500" 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="companyPhone" className="text-zinc-300">Telefon kontaktowy</Label>
                  <Input 
                    id="companyPhone" 
                    value={companyData.phone} 
                    onChange={e => setCompanyData({...companyData, phone: e.target.value})} 
                    className="bg-zinc-900 border-zinc-800 focus-visible:ring-cyan-500" 
                  />
                </div>
              </div>
            </GlassCard>
          )}

          {/* Integrations Tab */}
          {activeTab === "integrations" && (
            <GlassCard className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
                <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Key className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-zinc-100">Klucze API i Zewnętrzne Usługi</h2>
                  <p className="text-sm text-zinc-500">Zarządzaj połączeniami z usługami zewnętrznymi.</p>
                </div>
              </div>

              <div className="flex flex-col gap-6 mt-2">
                {/* inFakt */}
                <div className="p-5 rounded-xl bg-zinc-900/50 border border-zinc-800 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-500/20 p-2 rounded-lg text-blue-400"><CreditCard className="w-5 h-5" /></div>
                      <div>
                        <h3 className="font-bold text-zinc-200">System Księgowy inFakt</h3>
                        <p className="text-xs text-zinc-500">Automatyczne wystawianie faktur dla klientów.</p>
                      </div>
                    </div>
                    <div className="px-3 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full text-xs font-medium">Połączono</div>
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-zinc-400 text-xs uppercase tracking-wider">Klucz API</Label>
                    <Input 
                      type="password" 
                      value={apiKeys.infakt} 
                      onChange={e => setApiKeys({...apiKeys, infakt: e.target.value})} 
                      className="bg-zinc-950 border-zinc-800 text-zinc-400 focus-visible:ring-purple-500 font-mono" 
                    />
                  </div>
                </div>

                {/* Vincario */}
                <div className="p-5 rounded-xl bg-zinc-900/50 border border-zinc-800 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-cyan-500/20 p-2 rounded-lg text-cyan-400"><Database className="w-5 h-5" /></div>
                      <div>
                        <h3 className="font-bold text-zinc-200">Dekoder VIN (Vincario)</h3>
                        <p className="text-xs text-zinc-500">Pobieranie danych o pojeździe na podstawie nr VIN.</p>
                      </div>
                    </div>
                    <div className="px-3 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full text-xs font-medium">Połączono</div>
                  </div>
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label className="text-zinc-400 text-xs uppercase tracking-wider">API Key</Label>
                      <Input 
                        type="password" 
                        value={apiKeys.vincarioApiKey} 
                        onChange={e => setApiKeys({...apiKeys, vincarioApiKey: e.target.value})} 
                        className="bg-zinc-950 border-zinc-800 text-zinc-400 focus-visible:ring-purple-500 font-mono" 
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-zinc-400 text-xs uppercase tracking-wider">API Secret</Label>
                      <Input 
                        type="password" 
                        value={apiKeys.vincarioApiSecret} 
                        onChange={e => setApiKeys({...apiKeys, vincarioApiSecret: e.target.value})} 
                        className="bg-zinc-950 border-zinc-800 text-zinc-400 focus-visible:ring-purple-500 font-mono" 
                      />
                    </div>
                  </div>
                </div>

                {/* Twilio */}
                <div className="p-5 rounded-xl bg-zinc-900/50 border border-zinc-800 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-amber-500/20 p-2 rounded-lg text-amber-400"><Smartphone className="w-5 h-5" /></div>
                      <div>
                        <h3 className="font-bold text-zinc-200">Bramka SMS (Twilio)</h3>
                        <p className="text-xs text-zinc-500">Powiadomienia SMS o statusie zlecenia.</p>
                      </div>
                    </div>
                    <div className="px-3 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full text-xs font-medium">Połączono</div>
                  </div>
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label className="text-zinc-400 text-xs uppercase tracking-wider">Account SID</Label>
                      <Input 
                        type="password" 
                        value={apiKeys.twilioAccountSid} 
                        onChange={e => setApiKeys({...apiKeys, twilioAccountSid: e.target.value})} 
                        className="bg-zinc-950 border-zinc-800 text-zinc-400 focus-visible:ring-purple-500 font-mono" 
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-zinc-400 text-xs uppercase tracking-wider">Auth Token</Label>
                      <Input 
                        type="password" 
                        value={apiKeys.twilioAuthToken} 
                        onChange={e => setApiKeys({...apiKeys, twilioAuthToken: e.target.value})} 
                        className="bg-zinc-950 border-zinc-800 text-zinc-400 focus-visible:ring-purple-500 font-mono" 
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-zinc-400 text-xs uppercase tracking-wider">Phone Number</Label>
                      <Input 
                        value={apiKeys.twilioPhoneNumber} 
                        onChange={e => setApiKeys({...apiKeys, twilioPhoneNumber: e.target.value})} 
                        className="bg-zinc-950 border-zinc-800 text-zinc-400 focus-visible:ring-purple-500 font-mono" 
                        placeholder="+48..."
                      />
                    </div>
                  </div>
                </div>

                {/* Resend */}
                <div className="p-5 rounded-xl bg-zinc-900/50 border border-zinc-800 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-red-500/20 p-2 rounded-lg text-red-400"><Smartphone className="w-5 h-5" /></div>
                      <div>
                        <h3 className="font-bold text-zinc-200">Wysyłka Email (Resend)</h3>
                        <p className="text-xs text-zinc-500">Powiadomienia i kopie faktur na email klienta.</p>
                      </div>
                    </div>
                    <div className="px-3 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full text-xs font-medium">Połączono</div>
                  </div>
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label className="text-zinc-400 text-xs uppercase tracking-wider">API Key</Label>
                      <Input 
                        type="password" 
                        value={apiKeys.resendApiKey} 
                        onChange={e => setApiKeys({...apiKeys, resendApiKey: e.target.value})} 
                        className="bg-zinc-950 border-zinc-800 text-zinc-400 focus-visible:ring-purple-500 font-mono" 
                      />
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>
          )}

          {/* Notifications Tab */}
          {activeTab === "notifications" && (
            <GlassCard className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
                <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Bell className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-zinc-100">Preferencje Powiadomień</h2>
                  <p className="text-sm text-zinc-500">Zarządzaj w jaki sposób system kontaktuje się z klientami.</p>
                </div>
              </div>
              
              <div className="flex flex-col gap-4 mt-2">
                <div className="flex items-center justify-between p-4 rounded-xl border border-zinc-800 bg-zinc-900/30">
                  <div>
                    <h4 className="font-medium text-zinc-200">Automatyczne SMSy o zmianie statusu</h4>
                    <p className="text-sm text-zinc-500">Wysyłaj SMS, gdy zlecenie zmieni status na "Zakończone".</p>
                  </div>
                  <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-cyan-500">
                    <span className="translate-x-6 inline-block h-4 w-4 rounded-full bg-white transition" />
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 rounded-xl border border-zinc-800 bg-zinc-900/30">
                  <div>
                    <h4 className="font-medium text-zinc-200">Kopia faktur na e-mail klienta</h4>
                    <p className="text-sm text-zinc-500">System wyśle kopię PDF faktury na e-mail klienta.</p>
                  </div>
                  <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-cyan-500">
                    <span className="translate-x-6 inline-block h-4 w-4 rounded-full bg-white transition" />
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 rounded-xl border border-zinc-800 bg-zinc-900/30 opacity-50">
                  <div>
                    <h4 className="font-medium text-zinc-200">Powiadomienia o przeglądach</h4>
                    <p className="text-sm text-zinc-500">Przypomnienia o zbliżających się przeglądach (wkrótce).</p>
                  </div>
                  <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-zinc-700">
                    <span className="translate-x-1 inline-block h-4 w-4 rounded-full bg-zinc-400 transition" />
                  </div>
                </div>
              </div>
            </GlassCard>
          )}

          {/* Security Tab */}
          {activeTab === "security" && (
            <GlassCard className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
                <div className="p-2.5 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20">
                  <Shield className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-zinc-100">Konto i Bezpieczeństwo</h2>
                  <p className="text-sm text-zinc-500">Zmiana hasła i kopie zapasowe danych.</p>
                </div>
              </div>
              
              <div className="flex flex-col gap-6 mt-2">
                <div className="grid gap-2">
                  <Label className="text-zinc-300">Stare hasło</Label>
                  <Input type="password" placeholder="••••••••" className="bg-zinc-900 border-zinc-800" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label className="text-zinc-300">Nowe hasło</Label>
                    <Input type="password" placeholder="••••••••" className="bg-zinc-900 border-zinc-800" />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-zinc-300">Powtórz nowe hasło</Label>
                    <Input type="password" placeholder="••••••••" className="bg-zinc-900 border-zinc-800" />
                  </div>
                </div>
                <div>
                  <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white mt-2">Zmień hasło</Button>
                </div>

                <div className="border-t border-zinc-800 pt-6 mt-2">
                  <h3 className="font-bold text-zinc-200 mb-4">Kopie Zapasowe (Baza Danych)</h3>
                  <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Cloud className="w-8 h-8 text-cyan-500" />
                      <div>
                        <div className="font-medium text-zinc-200">Kopia lokalna SQL</div>
                        <div className="text-xs text-zinc-500">Ostatnia kopia: Dzisiaj, 03:00 AM</div>
                      </div>
                    </div>
                    <Button variant="outline" className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700">Pobierz kopię</Button>
                  </div>
                </div>
              </div>
            </GlassCard>
          )}

        </div>
      </div>
    </div>
  );
}
