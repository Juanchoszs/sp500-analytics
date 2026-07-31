import { Link, useLocation } from "react-router-dom";
import { 
  Home, 
  BarChart3, 
  Target, 
  Anchor, 
  Waves, 
  Droplets, 
  TrendingUp, 
  AlertTriangle, 
  Brain, 
  FileText, 
  Microscope, 
  Settings 
} from "lucide-react";

const navItems = [
  { path: "/", label: "Overview", icon: Home },
  { path: "/market-structure", label: "Market Structure", icon: BarChart3 },
  { path: "/gamma", label: "Gamma", icon: Target },
  { path: "/dealer-positioning", label: "Dealer Positioning", icon: Anchor },
  { path: "/flow", label: "Flow", icon: Waves },
  { path: "/liquidity", label: "Liquidity", icon: Droplets },
  { path: "/volatility", label: "Volatility", icon: TrendingUp },
  { path: "/anomalies", label: "Anomalies", icon: AlertTriangle },
  { path: "/prediction-engine", label: "Prediction Engine", icon: Brain },
  { path: "/reports", label: "Reports", icon: FileText },
  { path: "/research", label: "Research", icon: Microscope },
  { path: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 h-screen w-[280px] bg-[#0F172A] border-r border-[#1E293B] flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-[#1E293B]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#059669]">
            <span className="text-lg font-semibold text-white">S</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">S&P 500 Intelligence</p>
            <p className="text-[10px] uppercase tracking-wider text-[#94A3B8]">
              Options Console
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-[#1E293B] text-white"
                      : "text-[#94A3B8] hover:bg-[#1E293B]/50 hover:text-white"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-[#1E293B]">
        <p className="text-[10px] text-[#64748B]">
          S&P 500 Analytics Platform
        </p>
      </div>
    </aside>
  );
}