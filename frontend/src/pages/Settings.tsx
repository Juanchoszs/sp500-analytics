import { useState, useEffect } from "react";
import { Settings as SettingsIcon, Palette, Clock, Bell, Database, Info, Save, RefreshCw, Monitor, Smartphone } from "lucide-react";
import Card from "../components/ui/Card";

type Theme = "dark" | "light" | "system";
type RefreshInterval = 5000 | 15000 | 30000 | 60000;
type Device = "desktop" | "mobile";

interface SettingsState {
  theme: Theme;
  refreshInterval: RefreshInterval;
  notifications: boolean;
  soundAlerts: boolean;
  autoRefresh: boolean;
  compactMode: boolean;
  showTooltips: boolean;
  device: Device;
}

const defaultSettings: SettingsState = {
  theme: "dark",
  refreshInterval: 30000,
  notifications: true,
  soundAlerts: false,
  autoRefresh: true,
  compactMode: false,
  showTooltips: true,
  device: "desktop",
};

export default function Settings() {
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [saved, setSaved] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem("appSettings");
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error("Error loading settings:", e);
      }
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem("appSettings", JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setResetting(true);
    setTimeout(() => {
      setSettings(defaultSettings);
      localStorage.removeItem("appSettings");
      setResetting(false);
    }, 500);
  };

  const updateSetting = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const themeOptions = [
    { value: "dark" as Theme, label: "Oscuro", icon: Monitor },
    { value: "light" as Theme, label: "Claro", icon: Monitor },
    { value: "system" as Theme, label: "Sistema", icon: Smartphone },
  ];

  const refreshOptions = [
    { value: 5000 as RefreshInterval, label: "5 segundos" },
    { value: 15000 as RefreshInterval, label: "15 segundos" },
    { value: 30000 as RefreshInterval, label: "30 segundos" },
    { value: 60000 as RefreshInterval, label: "1 minuto" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-accent/30 font-sans p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-white mb-2">Configuración</h1>
            <p className="text-sm text-text-secondary">
              Personaliza tu experiencia y preferencias de la aplicación
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              disabled={resetting}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:border-border-light text-sm text-text-secondary transition-colors disabled:opacity-50"
            >
              {resetting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Restablecer
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent/90 text-sm font-medium text-white transition-colors"
            >
              <Save className="w-4 h-4" />
              {saved ? "Guardado" : "Guardar"}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appearance Settings */}
        <Card variant="narrative">
          <div className="flex items-center gap-2 mb-6">
            <Palette className="w-5 h-5 text-accent" />
            <h3 className="text-lg font-medium text-white">Apariencia</h3>
          </div>

          <div className="space-y-6">
            {/* Theme Selection */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-3">Tema</label>
              <div className="grid grid-cols-3 gap-3">
                {themeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => updateSetting("theme", option.value)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      settings.theme === option.value
                        ? "border-accent bg-accent/10"
                        : "border-border hover:border-border-light bg-surface/50"
                    }`}
                  >
                    <option.icon className="w-6 h-6 mx-auto mb-2 text-text-secondary" />
                    <span className="text-sm text-text-primary">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Compact Mode */}
            <div className="flex items-center justify-between p-4 bg-surface/50 rounded-lg border border-border">
              <div>
                <div className="font-medium text-white mb-1">Modo Compacto</div>
                <div className="text-sm text-text-secondary">Reduce el espaciado entre elementos</div>
              </div>
              <button
                onClick={() => updateSetting("compactMode", !settings.compactMode)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.compactMode ? "bg-accent" : "bg-border"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    settings.compactMode ? "translate-x-6" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>

            {/* Tooltips */}
            <div className="flex items-center justify-between p-4 bg-surface/50 rounded-lg border border-border">
              <div>
                <div className="font-medium text-white mb-1">Mostrar Tooltips</div>
                <div className="text-sm text-text-secondary">Descripciones emergentes de elementos</div>
              </div>
              <button
                onClick={() => updateSetting("showTooltips", !settings.showTooltips)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.showTooltips ? "bg-accent" : "bg-border"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    settings.showTooltips ? "translate-x-6" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          </div>
        </Card>

        {/* Data Settings */}
        <Card variant="narrative">
          <div className="flex items-center gap-2 mb-6">
            <Database className="w-5 h-5 text-accent" />
            <h3 className="text-lg font-medium text-white">Datos</h3>
          </div>

          <div className="space-y-6">
            {/* Refresh Interval */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-3">
                Intervalo de Actualización
              </label>
              <div className="grid grid-cols-2 gap-3">
                {refreshOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => updateSetting("refreshInterval", option.value)}
                    className={`p-3 rounded-lg border transition-all ${
                      settings.refreshInterval === option.value
                        ? "border-accent bg-accent/10 text-white"
                        : "border-border hover:border-border-light text-text-secondary bg-surface/50"
                    }`}
                  >
                    <span className="text-sm">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Auto Refresh */}
            <div className="flex items-center justify-between p-4 bg-surface/50 rounded-lg border border-border">
              <div>
                <div className="font-medium text-white mb-1">Auto Refresh</div>
                <div className="text-sm text-text-secondary">Actualización automática de datos</div>
              </div>
              <button
                onClick={() => updateSetting("autoRefresh", !settings.autoRefresh)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.autoRefresh ? "bg-accent" : "bg-border"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    settings.autoRefresh ? "translate-x-6" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          </div>
        </Card>

        {/* Notification Settings */}
        <Card variant="narrative">
          <div className="flex items-center gap-2 mb-6">
            <Bell className="w-5 h-5 text-accent" />
            <h3 className="text-lg font-medium text-white">Notificaciones</h3>
          </div>

          <div className="space-y-4">
            {/* Notifications */}
            <div className="flex items-center justify-between p-4 bg-surface/50 rounded-lg border border-border">
              <div>
                <div className="font-medium text-white mb-1">Notificaciones</div>
                <div className="text-sm text-text-secondary">Alertas visuales de eventos importantes</div>
              </div>
              <button
                onClick={() => updateSetting("notifications", !settings.notifications)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.notifications ? "bg-accent" : "bg-border"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    settings.notifications ? "translate-x-6" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>

            {/* Sound Alerts */}
            <div className="flex items-center justify-between p-4 bg-surface/50 rounded-lg border border-border">
              <div>
                <div className="font-medium text-white mb-1">Alertas Sonoras</div>
                <div className="text-sm text-text-secondary">Sonidos para alertas críticas</div>
              </div>
              <button
                onClick={() => updateSetting("soundAlerts", !settings.soundAlerts)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.soundAlerts ? "bg-accent" : "bg-border"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    settings.soundAlerts ? "translate-x-6" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          </div>
        </Card>

        {/* About Section */}
        <Card variant="narrative">
          <div className="flex items-center gap-2 mb-6">
            <Info className="w-5 h-5 text-accent" />
            <h3 className="text-lg font-medium text-white">Acerca de</h3>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-surface/50 rounded-lg border border-border">
              <div className="text-sm text-text-tertiary mb-1">Versión</div>
              <div className="text-base font-medium text-white">1.0.0</div>
            </div>

            <div className="p-4 bg-surface/50 rounded-lg border border-border">
              <div className="text-sm text-text-tertiary mb-1">Motor de Análisis</div>
              <div className="text-base font-medium text-white">SPY Intelligence Engine</div>
            </div>

            <div className="p-4 bg-surface/50 rounded-lg border border-border">
              <div className="text-sm text-text-tertiary mb-1">Datos en Tiempo Real</div>
              <div className="text-base font-medium text-white">Options Flow & Gamma Exposure</div>
            </div>

            <div className="p-4 bg-surface/50 rounded-lg border border-border">
              <div className="text-sm text-text-tertiary mb-1">Última Actualización</div>
              <div className="text-base font-medium text-white">
                {new Date().toLocaleDateString()}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Status Bar */}
      <div className="mt-6 p-4 bg-surface/30 rounded-lg border border-border">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-text-secondary">
            <SettingsIcon className="w-4 h-4" />
            <span>Configuración {saved ? "guardada exitosamente" : "modificada"}</span>
          </div>
          <div className="text-text-tertiary">
            {settings.autoRefresh ? `Auto-refresh: ${settings.refreshInterval / 1000}s` : "Auto-refresh: desactivado"}
          </div>
        </div>
      </div>
    </div>
  );
}