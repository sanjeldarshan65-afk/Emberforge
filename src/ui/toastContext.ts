import { createContext, useContext } from 'react'

/* The toast context + hook live apart from the provider component so the
   Toast module can export only a component (keeps React Fast Refresh happy). */

export type ToastKind = 'souls' | 'ember' | 'blood'
export type PushToast = (text: string, kind?: ToastKind) => void

export const ToastCtx = createContext<PushToast>(() => {})

/** fire item-pickup notifications from any component */
export const useToast = () => useContext(ToastCtx)
