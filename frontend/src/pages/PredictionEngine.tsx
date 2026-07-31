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
import LoadingState from "../components/ui/LoadingState";
import ErrorState from "../components/ui/ErrorState";
import Card from "../components/ui/Card";

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

export default function PredictionEngine() {
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
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [selectedType]);

  const COLORS = {
    high: '#10B981',
    medium: '#F59E0B', 
    low: '#EF4444',
    success: '#059669',
    warning: '#F59E0B',
    danger: '#DC2626'
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
    return <LoadingState message="Cargando métricas de predicción..." />;
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-white mb-2">Prediction Engine</h1>
            <p className="text-sm text-text-secondary">
              Métricas de accuracy y calibración del sistema de inteligencia
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <label className="font-mono text-xs text-text-tertiary uppercase tracking-wider">Tipo:</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-surface border border-border rounded-lg text-text-primary text-sm px-4 py-2 outline-none focus:border-border-light"
            >
              <option value="directional">Direccional</option>
              <option value="volatility">Volatilidad</option>
              <option value="regime">Régimen</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <ErrorState
          title="Sistema no disponible"
          message={error}
        />
      )}

      {metrics && calibration && (
        <div className="flex flex-col gap-8">
          {/* Key Metrics - Máximo 4 cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card variant="metric">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-success" />
                  <span className="font-mono text-xs text-text-tertiary uppercase tracking-wider">Accuracy</span>
                </div>
                {metrics.accuracy_rate >= 0.7 ? (
                  <TrendingUp className="w-5 h-5 text-success" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-danger" />
                )}
              </div>
              <div className="text-3xl font-bold text-white mb-2">
                {(metrics.accuracy_rate * 100).toFixed(1)}%
              </div>
              <p className="text-sm text-text-secondary">
                {metrics.correct_predictions}/{metrics.total_predictions} correctas
              </p>
            </Card>

            <Card variant="metric">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-info" />
                <span className="font-mono text-xs text-text-tertiary uppercase tracking-wider">Precision</span>
              </div>
              <div className="text-3xl font-bold text-white mb-2">
                {(metrics.precision * 100).toFixed(1)}%
              </div>
              <p className="text-sm text-text-secondary">Precisión de predicciones positivas</p>
            </Card>

            <Card variant="metric">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-info" />
                <span className="font-mono text-xs text-text-tertiary uppercase tracking-wider">F1 Score</span>
              </div>
              <div className="text-3xl font-bold text-white mb-2">
                {metrics.f1_score.toFixed(3)}
              </div>
              <p className="text-sm text-text-secondary">Balance precision-recall</p>
            </Card>

            <Card variant="metric">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-info" />
                <span className="font-mono text-xs text-text-tertiary uppercase tracking-wider">Calibración</span>
              </div>
              <div className="text-3xl font-bold text-white mb-2">
                {(calibration.calibration_score * 100).toFixed(1)}%
              </div>
              <p className="text-sm text-text-secondary">Error: {(calibration.average_calibration_error * 100).toFixed(1)}%</p>
            </Card>
          </div>

          {/* Charts - Máximo 2-3 gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card variant="chart" className="h-[400px]">
              <div className="mb-4">
                <h3 className="text-lg font-medium text-white mb-1">Tendencia de Accuracy (7 días)</h3>
                <p className="text-xs text-text-tertiary uppercase tracking-wider">Evolución temporal</p>
              </div>
              <ResponsiveContainer width="100%" height="320">
                <LineChart data={MockAccuracyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis dataKey="day" stroke="#64748B" />
                  <YAxis stroke="#64748B" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0F172A', border: '1px solid #1E293B' }}
                    itemStyle={{ color: '#F8FAFC' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="accuracy" 
                    stroke="#10B981" 
                    strokeWidth={2}
                    dot={{ fill: '#10B981' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            <Card variant="chart" className="h-[400px]">
              <div className="mb-4">
                <h3 className="text-lg font-medium text-white mb-1">Distribución por Confianza</h3>
                <p className="text-xs text-text-tertiary uppercase tracking-wider">Accuracy por nivel</p>
              </div>
              <ResponsiveContainer width="100%" height="320">
                <BarChart data={ConfidenceDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis dataKey="name" stroke="#64748B" />
                  <YAxis stroke="#64748B" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0F172A', border: '1px solid #1E293B' }}
                    itemStyle={{ color: '#F8FAFC' }}
                  />
                  <Legend />
                  <Bar dataKey="value" fill="#3B82F6" name="Predicciones" />
                  <Bar dataKey="accuracy" fill="#10B981" name="Accuracy %" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Calibration Detail */}
          <Card variant="narrative">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-white mb-1">Detalle de Calibración</h3>
              <p className="text-xs text-text-tertiary uppercase tracking-wider">Análisis por nivel de confianza</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 bg-surface-hover rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-success" />
                  <span className="font-medium text-white">Alta Confianza</span>
                </div>
                <p className="text-2xl font-bold text-white mb-1">
                  {calibration.by_confidence_level.high.accuracy.toFixed(1)}%
                </p>
                <p className="text-sm text-text-secondary">
                  {calibration.by_confidence_level.high.count} predicciones
                </p>
              </div>

              <div className="p-4 bg-surface-hover rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-warning" />
                  <span className="font-medium text-white">Confianza Media</span>
                </div>
                <p className="text-2xl font-bold text-white mb-1">
                  {calibration.by_confidence_level.medium.accuracy.toFixed(1)}%
                </p>
                <p className="text-sm text-text-secondary">
                  {calibration.by_confidence_level.medium.count} predicciones
                </p>
              </div>

              <div className="p-4 bg-surface-hover rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-danger" />
                  <span className="font-medium text-white">Baja Confianza</span>
                </div>
                <p className="text-2xl font-bold text-white mb-1">
                  {calibration.by_confidence_level.low.accuracy.toFixed(1)}%
                </p>
                <p className="text-sm text-text-secondary">
                  {calibration.by_confidence_level.low.count} predicciones
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}