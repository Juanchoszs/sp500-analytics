import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import Overview from "./pages/Overview";
import MarketStructure from "./pages/MarketStructure";
import Gamma from "./pages/Gamma";
import DealerPositioning from "./pages/DealerPositioning";
import Flow from "./pages/Flow";
import Liquidity from "./pages/Liquidity";
import Volatility from "./pages/Volatility";
import Anomalies from "./pages/Anomalies";
import PredictionEngine from "./pages/PredictionEngine";
import Reports from "./pages/Reports";
import Research from "./pages/Research";
import Settings from "./pages/Settings";

// Legacy components for fallback
import Dashboard from "./components/Dashboard";
import GammaExposureView from "./components/GammaExposureView";
import PredictionDashboard from "./components/PredictionDashboard";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Overview />} />
          <Route path="market-structure" element={<MarketStructure />} />
          <Route path="gamma" element={<Gamma />} />
          <Route path="dealer-positioning" element={<DealerPositioning />} />
          <Route path="flow" element={<Flow />} />
          <Route path="liquidity" element={<Liquidity />} />
          <Route path="volatility" element={<Volatility />} />
          <Route path="anomalies" element={<Anomalies />} />
          <Route path="prediction-engine" element={<PredictionEngine />} />
          <Route path="reports" element={<Reports />} />
          <Route path="research" element={<Research />} />
          <Route path="settings" element={<Settings />} />
          
          {/* Legacy routes for fallback */}
          <Route path="legacy-dashboard" element={<Dashboard />} />
          <Route path="legacy-gamma" element={<GammaExposureView />} />
          <Route path="legacy-predictions" element={<PredictionDashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
