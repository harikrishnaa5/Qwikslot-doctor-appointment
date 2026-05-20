import { toast as sonnerToast } from "sonner";
import { QwikslotToast, type QwikslotToastVariant } from "../components/QwikslotToast";

export {
  TOAST_DURATION_MS,
  TOAST_ENTER_MS,
  TOAST_EXIT_MS,
  SIGN_IN_SUCCESS_MESSAGE,
} from "./toastConfig";

type ToastOptions = { duration?: number };

function showToast(message: string, variant: QwikslotToastVariant, options?: ToastOptions) {
  const duration = options?.duration;
  return sonnerToast.custom(
    (id) => <QwikslotToast id={id} message={message} variant={variant} duration={duration} />,
    {
      duration: Infinity,
      dismissible: false,
      unstyled: true,
      classNames: { toast: "qwikslot-toast-host" },
    }
  );
}

export const toast = {
  success: (message: string, options?: ToastOptions) => showToast(message, "success", options),
  error: (message: string, options?: ToastOptions) => showToast(message, "error", options),
  warning: (message: string, options?: ToastOptions) => showToast(message, "warning", options),
  info: (message: string, options?: ToastOptions) => showToast(message, "info", options),
  message: (message: string, options?: ToastOptions) => showToast(message, "info", options),
};
