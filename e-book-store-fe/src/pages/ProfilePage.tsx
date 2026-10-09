import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { usePageTitle } from '@/hooks/usePageTitle'
import { Heading, Text, Card, CardBody, Button, ErrorState, Skeleton } from '@/components/ui'

export function ProfilePage() {
  usePageTitle('My Profile')
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: profile, isLoading, isError, refetch } = useProfile()

  const handleSignOut = async () => {
    await signOut()
    queryClient.clear()
    navigate('/')
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 space-y-4">
        <Skeleton width="12rem" height="1.75rem" />
        <div className="space-y-3">
          <Skeleton width="100%" height="5rem" />
          <Skeleton width="100%" height="5rem" />
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <ErrorState
          title="Could not load profile"
          message="Something went wrong loading your profile. Please try again."
          onRetry={() => refetch()}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <Heading as="h1" size="h3">
        My Profile
      </Heading>

      {/* Account info */}
      <Card variant="default" padding="lg">
        <CardBody>
          <div className="space-y-4">
            <div>
              <Text as="p" size="xs" muted className="uppercase tracking-wide mb-1">
                Display name
              </Text>
              <p className="text-base font-medium text-[var(--color-text-primary)]">
                {profile?.display_name ?? '—'}
              </p>
            </div>

            <div>
              <Text as="p" size="xs" muted className="uppercase tracking-wide mb-1">
                Email
              </Text>
              <p className="text-base text-[var(--color-text-primary)]">
                {user?.email ?? '—'}
              </p>
            </div>

            <div>
              <Text as="p" size="xs" muted className="uppercase tracking-wide mb-1">
                Reward points
              </Text>
              <p className="text-base font-medium text-[var(--color-text-primary)]">
                {profile?.reward_points ?? 0} pts
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Sign out */}
      <div className="flex justify-end">
        <Button
          variant="secondary"
          size="md"
          onClick={() => void handleSignOut()}
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          }
        >
          Sign out
        </Button>
      </div>
    </div>
  )
}
