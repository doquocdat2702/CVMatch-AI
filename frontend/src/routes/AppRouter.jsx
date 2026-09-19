import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import axiosClient from '../api/axiosClient'

function HomePage() {
  const [status, setStatus] = useState('Đang kiểm tra kết nối API...')

  useEffect(() => {
    axiosClient
      .get('/health')
      .then((response) => {
        setStatus(`Đã kết nối API: ${response.data.message}`)
      })
      .catch(() => {
        setStatus('Không kết nối được API')
      })
  }, [])

  return (
    <div style={{ padding: '2rem' }}>
      <h1>CV Matching System</h1>
      <p>{status}</p>
    </div>
  )
}

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRouter
