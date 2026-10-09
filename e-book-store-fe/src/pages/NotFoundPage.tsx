import { useNavigate } from 'react-router-dom'
import { usePageTitle } from '@/hooks/usePageTitle'
import { NotFoundState } from '@/components/ui'

export function NotFoundPage() {
  usePageTitle('Page Not Found')
  const navigate = useNavigate()
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <NotFoundState onGoHome={() => navigate('/')} />
    </div>
  )
}
