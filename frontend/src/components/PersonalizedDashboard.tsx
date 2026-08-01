import { useState } from "react";
import { Plus, LayoutGrid, Save, RotateCcw } from "lucide-react";
import Card from "./ui/Card";
import Widget from "./Widget";
import InteractiveZoneHeatmap from "./InteractiveZoneHeatmap";

type WidgetType = "scores" | "scenarios" | "regimes" | "zones" | "narrative" | "export";

interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  position: { x: number; y: number };
  size: "small" | "medium" | "large";
}

interface Props {
  intelligence: any;
  exposure: any;
  onRemoveWidget?: (id: string) => void;
}

const availableWidgets: Array<{ type: WidgetType; title: string; description: string }> = [
  { type: "scores", title: "Scores Cuantitativos", description: "Visualización de scores del mercado" },
  { type: "scenarios", title: "Escenarios", description: "Análisis de escenarios probables" },
  { type: "regimes", title: "Regímenes Activos", description: "Régimenes del mercado detectados" },
  { type: "zones", title: "Análisis de Zonas", description: "Heatmap interactivo de zonas" },
  { type: "narrative", title: "Narrativa", description: "Informe narrativo completo" },
  { type: "export", title: "Exportar", description: "Opciones de exportación" },
];

export default function PersonalizedDashboard({ intelligence, exposure, onRemoveWidget }: Props) {
  const [widgets, setWidgets] = useState<DashboardWidget[]>([
    { id: "1", type: "scores", title: "Scores Cuantitativos", position: { x: 0, y: 0 }, size: "medium" },
    { id: "2", type: "scenarios", title: "Escenarios", position: { x: 1, y: 0 }, size: "medium" },
    { id: "3", type: "export", title: "Exportar", position: { x: 0, y: 1 }, size: "small" },
  ]);
  const [isEditing, setIsEditing] = useState(false);

  const addWidget = (type: WidgetType) => {
    const widgetInfo = availableWidgets.find(w => w.type === type);
    if (!widgetInfo) return;

    const newWidget: DashboardWidget = {
      id: Date.now().toString(),
      type,
      title: widgetInfo.title,
      position: { x: 0, y: 0 },
      size: "medium",
    };

    setWidgets([...widgets, newWidget]);
  };

  const removeWidget = (id: string) => {
    setWidgets(widgets.filter(w => w.id !== id));
    onRemoveWidget?.(id);
  };

  const resetLayout = () => {
    setWidgets([
      { id: "1", type: "scores", title: "Scores Cuantitativos", position: { x: 0, y: 0 }, size: "medium" },
      { id: "2", type: "scenarios", title: "Escenarios", position: { x: 1, y: 0 }, size: "medium" },
      { id: "3", type: "export", title: "Exportar", position: { x: 0, y: 1 }, size: "small" },
    ]);
  };

  const renderWidgetContent = (widget: DashboardWidget) => {
    switch (widget.type) {
      case "scores":
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-dim/70">Bullish Score</span>
              <span className="text-2xl font-bold text-success">
                {intelligence?.scores?.bullish_score || 0}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-dim/70">Bearish Score</span>
              <span className="text-2xl font-bold text-destructive">
                {intelligence?.scores?.bearish_score || 0}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-dim/70">Volatility Score</span>
              <span className="text-2xl font-bold text-warning">
                {intelligence?.scores?.volatility_score || 0}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-dim/70">Risk Score</span>
              <span className="text-2xl font-bold text-accent">
                {intelligence?.scores?.risk_score || 0}%
              </span>
            </div>
          </div>
        );
      case "scenarios":
        return (
          <div className="space-y-3">
            {intelligence?.scenarios && (
              <>
                <div className="p-3 bg-success/10 border border-success/30 rounded">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-semibold text-success">Principal</span>
                    <span className="text-xs font-mono text-success">
                      {intelligence.scenarios.principal.probability_pct}%
                    </span>
                  </div>
                  <p className="text-xs text-dim/70">{intelligence.scenarios.principal.narrative}</p>
                </div>
                <div className="p-3 bg-warning/10 border border-warning/30 rounded">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-semibold text-warning">Alternativo</span>
                    <span className="text-xs font-mono text-warning">
                      {intelligence.scenarios.alternative.probability_pct}%
                    </span>
                  </div>
                  <p className="text-xs text-dim/70">{intelligence.scenarios.alternative.narrative}</p>
                </div>
              </>
            )}
          </div>
        );
      case "regimes":
        return (
          <div className="space-y-2">
            {intelligence?.regimes?.map((regime: any, index: number) => (
              <div
                key={index}
                className={`p-2 rounded border ${
                  regime.active
                    ? "bg-accent/10 border-accent/30"
                    : "bg-surface/50 border-border"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      regime.active ? "bg-accent" : "bg-dim/50"
                    }`}
                  />
                  <span className="text-sm font-medium text-white">{regime.name}</span>
                </div>
              </div>
            ))}
          </div>
        );
      case "zones":
        return (
          <InteractiveZoneHeatmap
            strikes={exposure?.strikes || []}
            spotPrice={exposure?.spot_price || 0}
            callWall={exposure?.call_wall || null}
            putWall={exposure?.put_wall || null}
            gammaWall={exposure?.gamma_wall || null}
            zeroGamma={exposure?.zero_gamma || null}
          />
        );
      case "narrative":
        return (
          <div className="max-h-40 overflow-y-auto text-sm text-dim/70 leading-relaxed">
            {intelligence?.narrative || "No narrative available"}
          </div>
        );
      case "export":
        return (
          <div className="text-center py-4">
            <p className="text-sm text-dim/70 mb-3">
              Exportar reporte en múltiples formatos
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <button className="px-3 py-1.5 bg-secondary border border-border rounded text-xs text-white hover:border-border-light transition-colors">
                Word
              </button>
              <button className="px-3 py-1.5 bg-secondary border border-border rounded text-xs text-white hover:border-border-light transition-colors">
                PDF
              </button>
              <button className="px-3 py-1.5 bg-secondary border border-border rounded text-xs text-white hover:border-border-light transition-colors">
                Excel
              </button>
            </div>
          </div>
        );
      default:
        return <div className="text-sm text-dim/70">Widget no disponible</div>;
    }
  };

  return (
    <Card variant="narrative">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-accent" />
            <h3 className="text-lg font-medium text-white">Personalized Dashboard</h3>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`p-2 rounded transition-colors ${
                isEditing
                  ? "bg-accent text-white"
                  : "bg-secondary text-dim/70 hover:text-foreground"
              }`}
              aria-label={isEditing ? "Finalizar edición" : "Editar dashboard"}
            >
              {isEditing ? <Save className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
            </button>
            <button
              onClick={resetLayout}
              className="p-2 rounded bg-secondary text-dim/70 hover:text-foreground transition-colors"
              aria-label="Reset layout"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
        <p className="text-xs text-text-tertiary uppercase tracking-wider">
          Configura tu dashboard personalizado
        </p>
      </div>

      {/* Add Widget Section (shown only when editing) */}
      {isEditing && (
        <div className="mb-6 p-4 bg-surface/30 border border-dashed border-border rounded-lg">
          <div className="text-sm font-medium text-white mb-3">Agregar Widget</div>
          <div className="flex flex-wrap gap-2">
            {availableWidgets.map((widget) => (
              <button
                key={widget.type}
                onClick={() => addWidget(widget.type)}
                className="px-3 py-2 bg-secondary border border-border rounded text-xs text-white hover:border-border-light transition-colors"
              >
                <Plus className="w-3 h-3 inline mr-1" />
                {widget.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Widgets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {widgets.map((widget) => (
          <Widget
            key={widget.id}
            id={widget.id}
            title={widget.title}
            onRemove={isEditing ? removeWidget : undefined}
            isRemovable={isEditing}
          >
            {renderWidgetContent(widget)}
          </Widget>
        ))}
      </div>

      {/* Empty State */}
      {widgets.length === 0 && (
        <div className="text-center py-12">
          <LayoutGrid className="w-12 h-12 text-dim/30 mx-auto mb-4" />
          <p className="text-dim/70 mb-4">Tu dashboard está vacío</p>
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
          >
            <Plus className="w-4 h-4 inline mr-2" />
            Agregar Widget
          </button>
        </div>
      )}
    </Card>
  );
}
