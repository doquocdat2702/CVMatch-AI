import { useContext } from 'react'
import { AuthContext } from '../context/auth-context'

// Lấy { user, token, role, isAuthenticated, loading, login, logout } từ AuthProvider
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth phải được dùng bên trong AuthProvider')
  }
  return context
}
