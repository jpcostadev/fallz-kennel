import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertTriangle, CheckCircle2, Info, Trash2, X } from "lucide-react";
type Tone = "info" | "success" | "danger";
type DialogOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: Tone;
};
type DialogState = DialogOptions & {
  kind: "alert" | "confirm";
  resolve: (value: boolean) => void;
};
type DialogApi = {
  alert(options: DialogOptions): Promise<void>;
  confirm(options: DialogOptions): Promise<boolean>;
};
const DialogContext = createContext<DialogApi | null>(null);
export function UiDialogProvider({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  const [dialog, setDialog] = useState<DialogState | null>(null),
    confirmRef = useRef<HTMLButtonElement>(null);
  const finish = useCallback((value: boolean) => {
    setDialog((current) => {
      current?.resolve(value);
      return null;
    });
  }, []);
  const alert = useCallback(
    (options: DialogOptions) =>
      new Promise<void>((resolve) =>
        setDialog({ ...options, kind: "alert", resolve: () => resolve() }),
      ),
    [],
  );
  const confirm = useCallback(
    (options: DialogOptions) =>
      new Promise<boolean>((resolve) =>
        setDialog({ ...options, kind: "confirm", resolve }),
      ),
    [],
  );
  useEffect(() => {
    if (!dialog) return;
    confirmRef.current?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") finish(false);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [dialog, finish]);
  const Icon =
    dialog?.tone === "danger"
      ? Trash2
      : dialog?.tone === "success"
        ? CheckCircle2
        : dialog?.tone === "info"
          ? Info
          : AlertTriangle;
  return (
    <DialogContext.Provider value={{ alert, confirm }}>
      {children}
      {dialog && (
        <div
          className="ui-dialog-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) finish(false);
          }}
        >
          <section
            className={`ui-dialog ${dialog.tone ?? "info"}`}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="ui-dialog-title"
          >
            <div className="ui-dialog-icon">
              <Icon />
            </div>
            <div className="ui-dialog-copy">
              <div className="ui-dialog-heading">
                <h2 id="ui-dialog-title">{dialog.title}</h2>
                <button
                  aria-label="Fechar"
                  className="icon-button"
                  onClick={() => finish(false)}
                >
                  <X />
                </button>
              </div>
              <p>{dialog.message}</p>
              <div className="ui-dialog-actions">
                {dialog.kind === "confirm" && (
                  <button
                    className="ghost-button"
                    onClick={() => finish(false)}
                  >
                    {dialog.cancelLabel ?? "Cancelar"}
                  </button>
                )}
                <button
                  ref={confirmRef}
                  className={
                    dialog.tone === "danger"
                      ? "danger-button"
                      : "primary-button"
                  }
                  onClick={() => finish(true)}
                >
                  {dialog.confirmLabel ??
                    (dialog.kind === "confirm" ? "Confirmar" : "Entendi")}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </DialogContext.Provider>
  );
}
// eslint-disable-next-line react-refresh/only-export-components
export function useUiDialog(): DialogApi {
  const value = useContext(DialogContext);
  if (!value)
    throw new Error("useUiDialog deve estar dentro de UiDialogProvider");
  return value;
}
