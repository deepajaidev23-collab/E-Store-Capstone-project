import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useForm } from 'react-hook-form'
import { usePageTitle } from '@/hooks/usePageTitle'
import { Heading, Button, Input, FormField, Alert } from '@/components/ui'
import { safeRedirectPath } from '@/lib/auth'

interface LoginFormValues {
  email: string
  password: string
}

export function LoginPage() {
  usePageTitle('Sign In')
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const next = safeRedirectPath(searchParams.get('next'))

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>()

  const onSubmit = async (values: LoginFormValues) => {
    const { error } = await signIn(values.email, values.password)
    if (error) {
      let friendlyMessage = 'Invalid email or password. Please try again.'
      const msg = error.message.toLowerCase()
      if (msg.includes('email not confirmed') || msg.includes('unconfirmed')) {
        friendlyMessage = 'Please verify your email address before signing in.'
      } else if (msg.includes('too many requests') || msg.includes('rate limit')) {
        friendlyMessage = 'Too many failed attempts. Please wait a moment and try again.'
      } else if (msg.includes('network') || msg.includes('fetch')) {
        friendlyMessage = 'Network error. Please check your internet connection.'
      }
      setError('root', { message: friendlyMessage })
      return
    }
    navigate(next, { replace: true })
  }

  return (
    <>
      <Heading as="h1" size="h4" className="mb-6">
        Sign in to Bibliophile
      </Heading>

      {errors.root && (
        <Alert variant="error" className="mb-4">
          {errors.root.message}
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <FormField label="Email" htmlFor="email" error={errors.email?.message} required>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            error={!!errors.email}
            {...register('email', { required: 'Email is required' })}
          />
        </FormField>

        <FormField label="Password" htmlFor="password" error={errors.password?.message} required>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            error={!!errors.password}
            {...register('password', { required: 'Password is required' })}
          />
        </FormField>

        <Button type="submit" loading={isSubmitting} fullWidth className="mt-1">
          Sign in
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-[var(--color-text-muted)]">
        Don&apos;t have an account?{' '}
        <Link to="/register" className="text-[var(--color-text-link)] hover:underline">
          Register
        </Link>
      </p>
    </>
  )
}
