// lib/toast.ts
import { toast as toastFn } from "@/hooks/use-toast"

export const notify = {
  success: (message: string) => {
    toastFn({
      title: "Success",
      description: message,
      variant: "default",
    })
  },
  error: (message: string) => {
    toastFn({
      title: "Error", 
      description: message,
      variant: "destructive",
    })
  },
  info: (message: string) => {
    toastFn({
      title: "Info",
      description: message,
      variant: "default",
    })
  }
}

export { toastFn as toast }
