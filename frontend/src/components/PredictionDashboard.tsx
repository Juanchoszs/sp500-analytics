import { useState, useEffect } from "react";
import { marketApi } from "../api/client";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { TrendingUp, TrendingDown, Target, Activity, AlertCircle } from "lucide-react";

const TICKER = "SPY";

interface PredictionMetrics {
  total_predictions: number;
  correct_predictions: number;
  accuracy_rate: number;
  precision: number;
  recall: number;
  f1_score: number;
  calibration_error: number;
  calibration_score: number;
}

interface CalibrationReport {
  ticker: string;
  prediction_type: string;
  total_evaluated: number;
  calibration_score: number;
  average_calibration_error: number;
  by_confidence_level: {
    high: { count: number; accuracy: number; avg_confidence: number };
    medium: { count: number; accuracy: number; avg_confidence: number };
    low: { count: number; accuracy: number; avg_confidence: number };
  };
}

export default function PredictionDashboard() {
  const [metrics, setMetrics] = useState<PredictionMetrics | null>(null);
  const [calibration, setCalibration] = useState<CalibrationReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState("directional");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [metricsData, calibrationData] = await Promise.all([
          marketApi.getPredictionAccuracy(TICKER, selectedType, 30),
          marketApi.getPredictionCalibration(TICKER, selectedType)
        ]);
        
        setMetrics(metricsData);
        setCalibration(calibrationData);
      } catch (err: any) {
        if (err.response?.status === 503) {
          setError("Sistema de predicciones no disponible - requiere configuración de base de datos");
        } else if (err.response?.status === 404) {
          setError("Sistema de predicciones no disponible - el backend no tiene configurado el módulo de predicciones");
        } else {
          setError(err.message || "Error cargando métricas");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // Actualizar cada 30s
    return () => clearInterval(interval);
  }, [selectedType]);

  const COLORS = {
    high: '#22c55e',
    medium: '#f59e0b', 
    low: '#ef4444',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444'
  };

  const MockAccuracyData = [
    { day: 'Lun', accuracy: 72 },
    { day: 'Mar', accuracy: 78 },
    { day: 'Mié', accuracy: 75 },
    { day: 'Jue', accuracy: 82 },
    { day: 'Vie', accuracy: 79 },
    { day: 'Sáb', accuracy: 85 },
    { day: 'Dom', accuracy: 80 },
  ];

  const ConfidenceDistribution = calibration ? [
    { name: 'Alta Confianza', value: calibration.by_confidence_level.high.count, accuracy: calibration.by_confidence_level.high.accuracy },
    { name: 'Confianza Media', value: calibration.by_confidence_level.medium.count, accuracy: calibration.by_confidence_level.medium.accuracy },
    { name: 'Baja Confianza', value: calibration.by_confidence_level.low.count, accuracy: calibration.by_confidence_level.low.accuracy },
  ] : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent/20 border-t-accent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-mono text-dim/70 text-sm uppercase tracking-wider">Cargando métricas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Dashboard de Predicciones</h1>
            <p className="text-dim/70 font-mono text-sm">Métricas de accuracy y calibración del sistema de inteligencia</p>
          </div>
          
          <div className="flex items-center gap-3">
            <label className="font-mono text-xs text-dim/70 uppercase">Tipo:</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-secondary border border-border rounded-lg text-foreground font-mono text-sm px-4 py-2 outline-none focus:border-accent"
            >
              <option value="directional">Direccional</option>
              <option value="volatility">Volatilidad</option>
              <option value="regime">Régimen</option>
            </select>
          </div>
        </div>
      </header>

      {error && (
        <div className="mb-6 border border-destructive/40 bg-destructive/10 text-destructive p-4 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5" />
          <div>
            <p className="font-semibold">Sistema no disponible</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        {/* Accuracy Card */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-accent" />
              <span className="font-mono text-sm text-dim/70 uppercase">Accuracy</span>
            </div>
            {metrics?.accuracy_rate && metrics.accuracy_rate >= 0.7 ? (
              <TrendingUp className="w-5 h-5 text-success" />
            ) : (
              <TrendingDown className="w-5 h-5 text-danger" />
            )}
          </div>
          <div className="text-4xl font-bold text-white mb-2">
            {metrics ? `${(metrics.accuracy_rate * 100).toFixed(1)}%` : '--'}
          </div>
          <p className="text-xs text-dim/70">
            {metrics ? `${metrics.correct_predictions}/${metrics.total_predictions} correctas` : '--'}
          </p>
        </div>

        {/* Precision Card */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-accent" />
            <span className="font-mono text-sm text-dim/70 uppercase">Precision</span>
          </div>
          <div className="text-4xl font-bold text-white mb-2">
            {metrics ? `${(metrics.precision * 100).toFixed(1)}%` : '--'}
          </div>
          <p className="text-xs text-dim/70">Precisión de predicciones positivas</p>
        </div>

        {/* F1 Score Card */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-accent" />
            <span className="font-mono text-sm text-dim/70 uppercase">F1 Score</span>
          </div>
          <div className="text-4xl font-bold text-white mb-2">
            {metrics ? metrics.f1_score.toFixed(3) : '--'}
          </div>
          <p className="text-xs text-dim/70">Balance precision-recall</p>
        </div>

        {/* Calibration Score Card */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-accent" />
            <span className="font-mono text-sm text-dim/70 uppercase">Calibración</span>
          </div>
          <div className="text-4xl font-bold text-white mb-2">
            {calibration ? `${(calibration.calibration_score * 100).toFixed(1)}%` : '--'}
          </div>
          <p className="text-xs text-dim/70">Error promedio: {calibration ? (calibration.average_calibration_error * 100).toFixed(1) + '%' : '--'}</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Accuracy Trend */}
        <div className="card p-6">
          <h3 className="font-bold text-lg text-white mb-4">Tendencia de Accuracy (7 días)</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={MockAccuracyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.4)" />
                <XAxis 
                  dataKey="day" 
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  axisLine={{ stroke: 'rgba(51,65,85,0.4)' }}
                />
                <YAxis 
                  domain={[0, 100]}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  axisLine={{ stroke: 'rgba(51,65,85,0.4)' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid rgba(51,65,85,0.4)',
                    borderRadius: '8px'
                  }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="accuracy" 
                  stroke="#22c55e" 
                  strokeWidth={2}
                  dot={{ fill: '#22c55e', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Confidence Distribution */}
        <div className="card p-6">
          <h3 className="font-bold text-lg text-white mb-4">Distribución por Nivel de Confianza</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ConfidenceDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.4)" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(51,65,85,0.4)' }}
                />
                <YAxis 
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  axisLine={{ stroke: 'rgba(51,65,85,0.4)' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid rgba(51,65,85,0.4)',
                    borderRadius: '8px'
                  }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend />
                <Bar dataKey="value" name="Cantidad" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Calibration Details */}
      {calibration && (
        <div className="card p-6">
          <h3 className="font-bold text-lg text-white mb-4">Desglose de Calibración por Nivel de Confianza</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* High Confidence */}
            <div className="bg-secondary/50 rounded-lg p-4 border border-border">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full bg-success" />
                <span className="font-semibold text-white">Alta Confianza ({">"}70%)</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-dim/70">Cantidad:</span>
                  <span className="font-mono text-white">{calibration.by_confidence_level.high.count}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-dim/70">Accuracy Real:</span>
                  <span className="font-mono text-success">{(calibration.by_confidence_level.high.accuracy * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-dim/70">Conf. Promedio:</span>
                  <span className="font-mono text-white">{(calibration.by_confidence_level.high.avg_confidence * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* Medium Confidence */}
            <div className="bg-secondary/50 rounded-lg p-4 border border-border">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full bg-warning" />
                <span className="font-semibold text-white">Confianza Media (40-70%)</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-dim/70">Cantidad:</span>
                  <span className="font-mono text-white">{calibration.by_confidence_level.medium.count}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-dim/70">Accuracy Real:</span>
                  <span className="font-mono text-warning">{(calibration.by_confidence_level.medium.accuracy * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-dim/70">Conf. Promedio:</span>
                  <span className="font-mono text-white">{(calibration.by_confidence_level.medium.avg_confidence * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* Low Confidence */}
            <div className="bg-secondary/50 rounded-lg p-4 border border-border">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full bg-danger" />
                <span className="font-semibold text-white">Baja Confianza (&lt;40%)</span>
              </div>
              <div className="space-y-2">
                
                <div className="flex justify-between text-sm">
                  <span className="text-dim/70">Cantidad:</span>
                  <span className="font-mono text-white">{calibration.by_confidence_level.low.count}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-dim/70">Accuracy Real:</span>
                  <span className="font-mono text-danger">{(calibration.by_confidence_level.low.accuracy * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-dim/70">Conf. Promedio:</span>
                  <span className="font-mono text-white">{(calibration.by_confidence_level.low.avg_confidence * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info Panel */}
      <div className="mt-6 bg-secondary/30 border border-border rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-accent mt-0.5" />
          <div>
            <p className="font-semibold text-white mb-1">Información del Sistema</p>
            <p className="text-sm text-dim/70">
              Este dashboard muestra las métricas de accuracy y calibración del sistema de predicciones. 
              Un buen sistema de calibración significa que cuando el sistema indica "90% de confianza", 
              realmente acierta el 90% de las veces. La precisión mide la calidad de las predicciones positivas,
              mientras que el F1 Score balancea precisión y recall.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
