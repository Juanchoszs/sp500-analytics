import { useState } from "react";
import { marketApi } from "../api/client";
import type { IntelligenceResponse } from "../types";

export type ExportFormat = "word" | "pdf" | "excel" | "html" | "markdown";

interface ExportOptions {
  format: ExportFormat;
  includeCharts?: boolean;
  includeScenarios?: boolean;
  includeRegimes?: boolean;
  customTemplate?: string;
}

export function useMultiFormatExport() {
  const [isExporting, setIsExporting] = useState<Record<ExportFormat, boolean>>({
    word: false,
    pdf: false,
    excel: false,
    html: false,
    markdown: false,
  });

  const handleExport = async (
    ticker: string,
    expiration: string | undefined,
    intelligence: IntelligenceResponse | null,
    options: ExportFormat | ExportOptions
  ) => {
    const format = typeof options === "string" ? options : options.format;
    
    try {
      setIsExporting((prev) => ({ ...prev, [format]: true }));
      
      // Preparar datos para exportación
      const exportData = {
        ticker,
        expiration: expiration || "Nearest",
        intelligence,
        format,
        timestamp: new Date().toISOString(),
      };

      // Generar contenido según formato
      let content: Blob;
      let filename: string;
      let mimeType: string;

      switch (format) {
        case "word":
          content = await marketApi.downloadReport({ ticker, expiration });
          filename = `${ticker}_Report_${expiration || "Nearest"}.docx`;
          mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
          break;
          
        case "pdf":
          // Para PDF, generamos desde el contenido HTML
          const htmlContent = generateHTMLReport(exportData);
          content = new Blob([htmlContent], { type: "text/html" });
          filename = `${ticker}_Report_${expiration || "Nearest"}.html`;
          mimeType = "text/html";
          break;
          
        case "excel":
          // Para Excel, generamos CSV
          const csvContent = generateCSVReport(exportData);
          content = new Blob([csvContent], { type: "text/csv" });
          filename = `${ticker}_Report_${expiration || "Nearest"}.csv`;
          mimeType = "text/csv";
          break;
          
        case "html":
          const htmlReport = generateHTMLReport(exportData);
          content = new Blob([htmlReport], { type: "text/html" });
          filename = `${ticker}_Report_${expiration || "Nearest"}.html`;
          mimeType = "text/html";
          break;
          
        case "markdown":
          const mdContent = generateMarkdownReport(exportData);
          content = new Blob([mdContent], { type: "text/markdown" });
          filename = `${ticker}_Report_${expiration || "Nearest"}.md`;
          mimeType = "text/markdown";
          break;
          
        default:
          throw new Error("Formato no soportado");
      }

      // Descargar archivo
      const downloadUrl = window.URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

    } catch (e) {
      console.error("Error en exportación:", e);
      alert(`Error al exportar reporte en formato ${format}.`);
    } finally {
      setIsExporting((prev) => ({ ...prev, [format]: false }));
    }
  };

  return { isExporting, handleExport };
}

// Helper functions para generar diferentes formatos
function generateHTMLReport(data: any): string {
  const { intelligence, ticker, expiration, timestamp } = data;
  
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${ticker} Market Intelligence Report</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; background: #f8f9fa; color: #37474F; }
    .header { background: linear-gradient(135deg, #1B5E20 0%, #0D47A1 100%); color: white; padding: 30px; border-radius: 8px; margin-bottom: 30px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
    .card { background: white; padding: 25px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); border-left: 4px solid #1B5E20; }
    .score-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
    .score-item { background: #f5f5f5; padding: 20px; border-radius: 6px; text-align: center; border: 1px solid #e0e0e0; }
    .score-value { font-size: 2.2em; font-weight: bold; color: #1B5E20; }
    .score-label { font-size: 0.9em; color: #78909C; text-transform: uppercase; letter-spacing: 1px; margin-top: 8px; }
    .scenario { border-left: 4px solid #0D47A1; padding-left: 20px; margin: 20px 0; background: #f8f9fa; border-radius: 0 6px 6px 0; }
    .scenario h3 { color: #0D47A1; margin-bottom: 10px; }
    .scenario.principal { border-left-color: #1B5E20; }
    .scenario.principal h3 { color: #1B5E20; }
    .scenario.risk { border-left-color: #B71C1C; }
    .scenario.risk h3 { color: #B71C1C; }
    .regime { background: #e8f5e9; padding: 15px; border-radius: 6px; margin: 10px 0; border-left: 4px solid #1B5E20; }
    .regime.active { background: #c8e6c9; border-left: 4px solid #1B5E20; }
    .regime h4 { color: #1B5E20; margin: 0 0 8px 0; }
    .narrative { line-height: 1.8; color: #37474F; }
    .narrative h2 { color: #0D47A1; border-bottom: 2px solid #0D47A1; padding-bottom: 12px; margin-top: 30px; }
    .narrative h3 { color: #1B5E20; margin-top: 25px; }
    .narrative strong { color: #0D47A1; font-weight: 600; }
    .narrative em { color: #78909C; }
    .footer { text-align: center; color: #78909C; margin-top: 40px; font-size: 0.9em; padding: 20px; background: #f5f5f5; border-radius: 6px; }
    .metric { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e0e0e0; }
    .metric:last-child { border-bottom: none; }
    .metric-label { color: #78909C; font-weight: 500; }
    .metric-value { color: #37474F; font-weight: 600; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${ticker} Market Intelligence Report</h1>
    <p>Expiration: ${expiration} | Generated: ${new Date(timestamp).toLocaleString()}</p>
  </div>

  <div class="card">
    <h2>Market Scores</h2>
    <div class="score-grid">
      <div class="score-item">
        <div class="score-value">${intelligence?.scores?.bullish_score || 0}%</div>
        <div class="score-label">Bullish Score</div>
      </div>
      <div class="score-item">
        <div class="score-value">${intelligence?.scores?.bearish_score || 0}%</div>
        <div class="score-label">Bearish Score</div>
      </div>
      <div class="score-item">
        <div class="score-value">${intelligence?.scores?.volatility_score || 0}%</div>
        <div class="score-label">Volatility Score</div>
      </div>
      <div class="score-item">
        <div class="score-value">${intelligence?.scores?.risk_score || 0}%</div>
        <div class="score-label">Risk Score</div>
      </div>
    </div>
  </div>

  <div class="card">
    <h2>Scenarios</h2>
    ${intelligence?.scenarios ? `
      <div class="scenario principal">
        <h3>Principal Scenario (${intelligence.scenarios.principal.probability_pct}%)</h3>
        <p>${intelligence.scenarios.principal.narrative}</p>
      </div>
      <div class="scenario">
        <h3>Alternative Scenario (${intelligence.scenarios.alternative.probability_pct}%)</h3>
        <p>${intelligence.scenarios.alternative.narrative}</p>
      </div>
      <div class="scenario risk">
        <h3>Risk Scenario (${intelligence.scenarios.risk.probability_pct}%)</h3>
        <p>${intelligence.scenarios.risk.narrative}</p>
      </div>
    ` : '<p>No scenarios available</p>'}
  </div>

  <div class="card">
    <h2>Active Regimes</h2>
    ${intelligence?.regimes?.map((regime: any) => `
      <div class="regime ${regime.active ? 'active' : ''}">
        <h4>${regime.name} ${regime.active ? '✅' : ''}</h4>
        <p>${regime.description}</p>
      </div>
    `).join('') || '<p>No regimes available</p>'}
  </div>

  <div class="card">
    <h2>Market Narrative</h2>
    <div class="narrative">
      ${intelligence?.narrative || 'No narrative available'}
    </div>
  </div>

  <div class="footer">
    <p>Generated by SPY Market Intelligence Platform</p>
    <p>Report ID: ${Date.now()}</p>
  </div>
</body>
</html>
  `;
}

function generateCSVReport(data: any): string {
  const { intelligence, ticker, expiration } = data;
  
  let csv = "=".repeat(80) + "\n";
  csv += "SPY MARKET INTELLIGENCE REPORT\n";
  csv += "=".repeat(80) + "\n\n";
  csv += `Ticker,${ticker}\n`;
  csv += `Expiration,${expiration}\n`;
  csv += `Generated,${new Date().toISOString()}\n\n`;
  
  csv += "-".repeat(40) + "\n";
  csv += "MARKET SCORES\n";
  csv += "-".repeat(40) + "\n\n";
  csv += "Metric,Value,Assessment\n";
  
  const bullish = intelligence?.scores?.bullish_score || 0;
  const bearish = intelligence?.scores?.bearish_score || 0;
  const volatility = intelligence?.scores?.volatility_score || 0;
  const risk = intelligence?.scores?.risk_score || 0;
  
  csv += `Bullish Score,${bullish}%,${bullish > 50 ? 'Positive' : 'Negative'}\n`;
  csv += `Bearish Score,${bearish}%,${bearish > 50 ? 'Negative' : 'Positive'}\n`;
  csv += `Volatility Score,${volatility}%,${volatility > 70 ? 'High' : volatility > 40 ? 'Moderate' : 'Low'}\n`;
  csv += `Risk Score,${risk}%,${risk > 70 ? 'High Risk' : risk > 40 ? 'Moderate Risk' : 'Low Risk'}\n`;
  csv += `Dealer Support Score,${intelligence?.scores?.dealer_support_score || 0}%,${intelligence?.scores?.dealer_support_score > 50 ? 'Supportive' : 'Neutral'}\n\n`;
  
  csv += "-".repeat(40) + "\n";
  csv += "SCENARIOS\n";
  csv += "-".repeat(40) + "\n\n";
  csv += "Scenario,Probability,Confidence,Narrative\n";
  if (intelligence?.scenarios) {
    csv += `Principal,${intelligence.scenarios.principal.probability_pct}%,${intelligence.scenarios.principal.confidence || 'N/A'},"${intelligence.scenarios.principal.narrative.replace(/,/g, ';')}\n`;
    csv += `Alternative,${intelligence.scenarios.alternative.probability_pct}%,${intelligence.scenarios.alternative.confidence || 'N/A'},"${intelligence.scenarios.alternative.narrative.replace(/,/g, ';')}\n`;
    csv += `Risk,${intelligence.scenarios.risk.probability_pct}%,${intelligence.scenarios.risk.confidence || 'N/A'},"${intelligence.scenarios.risk.narrative.replace(/,/g, ';')}\n`;
  }
  
  csv += "\n" + "-".repeat(40) + "\n";
  csv += "ACTIVE REGIMES\n";
  csv += "-".repeat(40) + "\n\n";
  csv += "Regime,Status,Description\n";
  if (intelligence?.regimes) {
    intelligence.regimes.forEach((regime: any) => {
      csv += `"${regime.name}",${regime.active ? 'Active' : 'Inactive'},"${regime.description.replace(/,/g, ';')}\n`;
    });
  }
  
  csv += "\n" + "=".repeat(80) + "\n";
  csv += "END OF REPORT\n";
  csv += "=".repeat(80) + "\n";
  
  return csv;
}

function generateMarkdownReport(data: any): string {
  const { intelligence, ticker, expiration, timestamp } = data;
  
  let md = `# ${ticker} Market Intelligence Report\n\n`;
  md += `> **Expiration:** ${expiration}  |  **Generated:** ${new Date(timestamp).toLocaleString()}\n\n`;
  md += `---\n\n`;
  
  md += `## 📊 Market Scores\n\n`;
  md += `| Metric | Value | Assessment |\n`;
  md += `|--------|-------|------------|\n`;
  
  const bullish = intelligence?.scores?.bullish_score || 0;
  const bearish = intelligence?.scores?.bearish_score || 0;
  const volatility = intelligence?.scores?.volatility_score || 0;
  const risk = intelligence?.scores?.risk_score || 0;
  
  md += `| Bullish Score | **${bullish}%** | ${bullish > 50 ? '✅ Positive' : '⚠️ Negative'} |\n`;
  md += `| Bearish Score | **${bearish}%** | ${bearish > 50 ? '🔴 Negative' : '✅ Positive'} |\n`;
  md += `| Volatility Score | **${volatility}%** | ${volatility > 70 ? '🔴 High' : volatility > 40 ? '⚠️ Moderate' : '✅ Low'} |\n`;
  md += `| Risk Score | **${risk}%** | ${risk > 70 ? '🔴 High Risk' : risk > 40 ? '⚠️ Moderate Risk' : '✅ Low Risk'} |\n`;
  md += `| Dealer Support Score | **${intelligence?.scores?.dealer_support_score || 0}%** | ${intelligence?.scores?.dealer_support_score > 50 ? '✅ Supportive' : '⚠️ Neutral'} |\n\n`;
  
  md += `## 🎯 Scenarios\n\n`;
  if (intelligence?.scenarios) {
    md += `### ✅ Principal Scenario (${intelligence.scenarios.principal.probability_pct}%)\n\n`;
    md += `> **Confidence:** ${intelligence.scenarios.principal.confidence || 'N/A'}\n\n`;
    md += `${intelligence.scenarios.principal.narrative}\n\n`;
    
    md += `**Supporting Factors:**\n`;
    (intelligence.scenarios.principal.supporting_factors || []).forEach((factor: string) => {
      md += `- ${factor}\n`;
    });
    md += `\n**Invalidation Conditions:**\n`;
    (intelligence.scenarios.principal.invalidation_conditions || []).forEach((condition: string) => {
      md += `- ${condition}\n`;
    });
    md += `\n`;
    
    md += `### ⚠️ Alternative Scenario (${intelligence.scenarios.alternative.probability_pct}%)\n\n`;
    md += `> **Confidence:** ${intelligence.scenarios.alternative.confidence || 'N/A'}\n\n`;
    md += `${intelligence.scenarios.alternative.narrative}\n\n`;
    
    md += `### 🔴 Risk Scenario (${intelligence.scenarios.risk.probability_pct}%)\n\n`;
    md += `> **Confidence:** ${intelligence.scenarios.risk.confidence || 'N/A'}\n\n`;
    md += `${intelligence.scenarios.risk.narrative}\n\n`;
  }
  
  md += `## 🏛️ Active Regimes\n\n`;
  if (intelligence?.regimes) {
    intelligence.regimes.forEach((regime: any) => {
      md += `### ${regime.active ? '✅' : '⚪'} ${regime.name}\n\n`;
      md += `${regime.description}\n\n`;
    });
  } else {
    md += `No regimes available\n\n`;
  }
  
  md += `## 📝 Market Narrative\n\n`;
  md += intelligence?.narrative || 'No narrative available\n\n';
  
  md += `---\n\n`;
  md += `*Generated by SPY Market Intelligence Platform*\n`;
  md += `*Report ID: ${Date.now()}*\n`;
  
  return md;
}
