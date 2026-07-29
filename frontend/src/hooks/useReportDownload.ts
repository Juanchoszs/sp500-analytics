import { useState } from "react";
import { marketApi } from "../api/client";

export function useReportDownload() {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadWord = async (ticker: string, expiration: string | undefined) => {
    try {
      setIsDownloading(true);
      const blob = await marketApi.downloadReport({ ticker, expiration });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `${ticker}_Report_${expiration || "Nearest"}.docx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (e) {
      console.error(e);
      alert("Error al descargar el reporte.");
    } finally {
      setIsDownloading(false);
    }
  };

  return { isDownloading, handleDownloadWord };
}
