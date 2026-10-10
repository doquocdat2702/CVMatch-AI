import { createContext } from 'react'

// Tách riêng object context để file AuthContext.jsx chỉ export component (giữ Fast Refresh)
export const AuthContext = createContext(null)
