import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { LandingPage } from '@/pages/LandingPage'
import { RoomPage } from '@/pages/RoomPage'
import { GlobalConnectionAlert } from '@/components/ui/GlobalConnectionAlert'
import { printVersionInfo } from '@/utils/version'
import '@/index.css'

// 打印版本信息（生产环境自动执行）
printVersionInfo()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Toaster
        position="top-center"
        toastOptions={{
          className: 'shadow-lg rounded-full font-medium text-sm',
          duration: 3000,
        }}
      />
      <GlobalConnectionAlert />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/room/:roomId" element={<RoomPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
