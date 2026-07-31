interface LoadingStateProps {
  message?: string;
}

export default function LoadingState({ message = "Cargando..." }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-surface-hover border-t-text-secondary mb-4" />
      <p className="text-sm text-text-secondary">{message}</p>
    </div>
  );
}