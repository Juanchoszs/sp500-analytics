import type { ExposureResponse } from '../types';

interface Props {
  exposure: ExposureResponse;
}

export default function AutomaticAnalysisPanel({ exposure }: Props) {
  // Generate automatic analysis based on data
  const generateAnalysis = (): string[] => {
    const insights: string[] = [];
    
    const highestPositive = exposure.strikes.reduce((prev, curr) => {
      return (curr.gamma_exposure > prev.gamma_exposure) ? curr : prev;
    }, exposure.strikes[0]);
    
    const highestNegative = exposure.strikes.reduce((prev, curr) => {
      return (curr.gamma_exposure < prev.gamma_exposure) ? curr : prev;
    }, exposure.strikes[0]);

    if (highestPositive.gamma_exposure > 0) {
      insights.push(`El mayor Positive Gamma está en ${highestPositive.strike.toFixed(2)}.`);
    }
    
    if (highestNegative.gamma_exposure < 0) {
      insights.push(`El mayor Negative Gamma está en ${highestNegative.strike.toFixed(2)}.`);
    }

    if (exposure.call_wall) {
      insights.push(`Call Wall sigue en ${exposure.call_wall.toFixed(2)}.`);
    }
    if (exposure.put_wall) {
      insights.push(`Put Wall está en ${exposure.put_wall.toFixed(2)}.`);
    }

    if (exposure.zero_gamma) {
      const diff = exposure.spot_price - exposure.zero_gamma;
      if (diff > 0) {
        insights.push(`Gamma Flip está por debajo del precio actual.`);
      } else {
        insights.push(`Gamma Flip está por encima del precio actual.`);
      }
    }

    // Check concentration near spot
    const nearSpotStrikes = exposure.strikes.filter(s => 
      Math.abs(s.strike - exposure.spot_price) < exposure.spot_price * 0.02
    );
    if (nearSpotStrikes.length > 5) {
      const hasHighPutConcentration = nearSpotStrikes.some(s => s.put_oi > 10000);
      const hasHighCallConcentration = nearSpotStrikes.some(s => s.call_oi > 10000);
      if (hasHighPutConcentration) {
        insights.push(`Existe una fuerte concentración de Put Gamma cerca del precio.`);
      }
      if (hasHighCallConcentration) {
        insights.push(`Existe una fuerte concentración de Call Gamma cerca del precio.`);
      }
    }

    if (exposure.net_gamma_exposure > 0) {
      insights.push(`Los Dealers siguen Long Gamma.`);
    } else {
      insights.push(`Los Dealers están Short Gamma.`);
    }

    // Check for major concentrations far from spot
    const lowStrikes = exposure.strikes.filter(s => s.strike < exposure.spot_price * 0.95);
    const hasLowConcentrations = lowStrikes.some(s => s.put_oi > 20000);
    if (!hasLowConcentrations && exposure.put_wall && exposure.put_wall > exposure.spot_price * 0.95) {
      insights.push(`No existen concentraciones importantes por debajo de ${(exposure.spot_price * 0.95).toFixed(0)}.`);
    }

    return insights;
  };

  const analysis = generateAnalysis();

  return (
    <div className="card flex-1">
      <div className="flex items-center gap-2 mb-4 border-b border-border pb-2">
        <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
        <h3 className="font-bold text-lg text-foreground">Análisis Automático</h3>
      </div>
      
      <div className="space-y-3">
        {analysis.map((insight, index) => (
          <div key={index} className="p-3 bg-secondary/50 rounded border border-border flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
            <p className="text-sm text-dim/70 leading-relaxed">{insight}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
