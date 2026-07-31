interface ErrorStateProps {
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function ErrorState({ title, message, action }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <div className="mb-4 rounded-full bg-danger/10 p-4">
        <div className="h-8 w-8 rounded-full bg-danger/20 flex items-center justify-center">
          <div className="h-2 w-2 rounded-full bg-danger" />
        </div>
      </div>
      <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
      <p className="text-sm text-text-secondary max-w-md mb-6">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-danger/10 border border-danger/20 rounded-lg text-sm text-danger hover:bg-danger/20 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}