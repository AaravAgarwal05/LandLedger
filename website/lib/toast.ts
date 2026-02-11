import { toast, ToastOptions, TypeOptions } from 'react-toastify';

const defaultOptions: ToastOptions = {
  position: "top-right",
  autoClose: 3000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  progress: undefined,
};

export const showToast = {
  success: (message: string, options?: ToastOptions) => {
    toast.success(message, {
      ...defaultOptions,
      ...options,
      className: 'bg-card border border-primary/50 text-foreground',
      progressClassName: 'bg-gradient-emerald',
    });
  },

  error: (message: string, options?: ToastOptions) => {
    toast.error(message, {
      ...defaultOptions,
      ...options,
      className: 'bg-card border border-red-500/50 text-foreground',
      progressClassName: 'bg-red-500',
    });
  },

  warning: (message: string, options?: ToastOptions) => {
    toast.warning(message, {
      ...defaultOptions,
      ...options,
      className: 'bg-card border border-accent/50 text-foreground',
      progressClassName: 'bg-gradient-gold',
    });
  },

  info: (message: string, options?: ToastOptions) => {
    toast.info(message, {
      ...defaultOptions,
      ...options,
      className: 'bg-card border border-border text-foreground',
      progressClassName: 'bg-primary',
    });
  },

  custom: (message: string, type: TypeOptions, options?: ToastOptions) => {
    toast(message, {
      ...defaultOptions,
      type,
      ...options,
    });
  },
};
