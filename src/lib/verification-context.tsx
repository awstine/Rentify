import { createContext, useContext } from "react"

export interface VerificationContextValue {
  isVerified: boolean
  verificationStatus: "pending" | "approved" | "rejected" | "more_info" | null
}

export const VerificationContext = createContext<VerificationContextValue>({
  isVerified: false,
  verificationStatus: null,
})

export function useVerification() {
  return useContext(VerificationContext)
}
