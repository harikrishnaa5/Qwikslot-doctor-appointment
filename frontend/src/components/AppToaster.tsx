import { Toaster } from "sonner";
import { useAppSelector } from "../store/hooks";

export function AppToaster() {
  const mode = useAppSelector((s) => s.theme.mode);

  return (
    <Toaster
      theme={mode}
      position="top-center"
      expand={false}
      closeButton={false}
      gap={10}
      offset={20}
      toastOptions={{
        unstyled: true,
        classNames: { toast: "qwikslot-toast-host" },
      }}
    />
  );
}
