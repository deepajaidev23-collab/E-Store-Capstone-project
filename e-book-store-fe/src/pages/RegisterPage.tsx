import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useForm } from 'react-hook-form'
import { usePageTitle } from '@/hooks/usePageTitle'
import { Heading, Button, Input, FormField, Alert } from '@/components/ui'

interface RegisterFormValues {
  displayName: string
  email: string
  password: string
  confirmPassword: string
}

export function RegisterPage() {
  usePageTitle('Create Account')
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [emailSent, setEmailSent] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>()

  const onSubmit = async (values: RegisterFormValues) => {
    const { data, error } = await signUp(values.email, values.password, values.displayName)
    if (error) {
      let friendlyMessage = 'Could not create account. Please try again.'
      const msg = error.message.toLowerCase()
      if (msg.includes('already registered') || msg.includes('user already exists') || msg.includes('unique')) {
        friendlyMessage = 'An account with this email already exists.'
      } else if (msg.includes('password') && msg.includes('short')) {
        friendlyMessage = 'Password must be at least 8 characters long.'
      } else if (msg.includes('network') || msg.includes('fetch')) {
        friendlyMessage = 'Network error. Please check your internet connection.'
      } else if (msg.includes('rate limit') || msg.includes('too many requests')) {
        friendlyMessage = 'Too many attempts. Please wait a moment and try again.'
      }
      setError('root', { message: friendlyMessage })
      return
    }
    if (data.session) {
      // Email auto-confirmation is on (local dev) — session available immediately
      navigate('/', { replace: true })
    } else {
      // Email confirmation required (production) — session is null
      setEmailSent(true)
    }
  }

  if (emailSent) {
    return (
      <>
        <Heading as="h1" size="h4" className="mb-4">
          Check your email
        </Heading>
        <Alert variant="info" className="mb-4">
          We've sent a confirmation link to your email address. Click the link
          to activate your account.
        </Alert>
        <p className="mt-4 text-center text-sm text-[var(--color-text-muted)]">
          Already confirmed?{' '}
          <Link to="/login" className="text-[var(--color-text-link)] hover:underline">
            Sign in
          </Link>
        </p>
      </>
    )
  }

  return (
    <>
      <Heading as="h1" size="h4" className="mb-6">
        Create an account
      </Heading>

      {errors.root && (
        <Alert variant="error" className="mb-4">
          {errors.root.message}
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <FormField
          label="Display name"
          htmlFor="displayName"
          error={errors.displayName?.message}
          required
        >
          <Input
            id="displayName"
            type="text"
            autoComplete="name"
            maxLength={50}
            error={!!errors.displayName}
            {...register('displayName', {
              required: 'Display name is required',
              maxLength: { value: 50, message: 'Maximum 50 characters' },
            })}
          />
        </FormField>

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
            autoComplete="new-password"
            error={!!errors.password}
            {...register('password', {
              required: 'Password is required',
              minLength: { value: 8, message: 'Minimum 8 characters' },
            })}
          />
        </FormField>

        <FormField
          label="Confirm password"
          htmlFor="confirmPassword"
          error={errors.confirmPassword?.message}
          required
        >
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            error={!!errors.confirmPassword}
            {...register('confirmPassword', {
              required: 'Please confirm your password',
              // eslint-disable-next-line react-hooks/incompatible-library
              validate: (val) => val === watch('password') || 'Passwords do not match',
            })}
          />
        </FormField>

        <Button type="submit" loading={isSubmitting} fullWidth className="mt-1">
          Create account
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-[var(--color-text-muted)]">
        Already have an account?{' '}
        <Link to="/login" className="text-[var(--color-text-link)] hover:underline">
          Sign in
        </Link>
      </p>
    </>
  )
}
