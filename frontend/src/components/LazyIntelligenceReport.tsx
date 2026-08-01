import { Suspense, lazy } from "react";
import LoadingState from "./ui/LoadingState";

// Lazy load del componente pesado IntelligenceReport
const IntelligenceReportLazy = lazy(() => import("./IntelligenceReport"));

interface Props {
  intelligence: any;
}

export default function LazyIntelligenceReport({ intelligence }: Props) {
  return (
    <Suspense fallback={<LoadingState message="Cargando inteligencia..." />}>
      <IntelligenceReportLazy intelligence={intelligence} />
    </Suspense>
  );
}
