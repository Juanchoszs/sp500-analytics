import { useEffect } from "react";

interface Shortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: () => void;
  description: string;
}

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const shortcut = shortcuts.find(
        (s) =>
          s.key.toLowerCase() === event.key.toLowerCase() &&
          (s.ctrlKey === undefined || s.ctrlKey === event.ctrlKey) &&
          (s.shiftKey === undefined || s.shiftKey === event.shiftKey) &&
          (s.altKey === undefined || s.altKey === event.altKey)
      );

      if (shortcut) {
        event.preventDefault();
        shortcut.action();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);
}

// Presets de shortcuts comunes
export const commonShortcuts = {
  export: {
    key: "e",
    ctrlKey: true,
    description: "Exportar reporte",
  } as Shortcut,
  refresh: {
    key: "r",
    ctrlKey: true,
    description: "Refrescar datos",
  } as Shortcut,
  help: {
    key: "?",
    description: "Mostrar ayuda",
  } as Shortcut,
  dashboard: {
    key: "d",
    ctrlKey: true,
    description: "Ir a dashboard",
  } as Shortcut,
  search: {
    key: "/",
    description: "Buscar",
  } as Shortcut,
  settings: {
    key: ",",
    description: "Configuración",
  } as Shortcut,
};
