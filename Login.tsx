'use client'

// React Imports
import { useState } from 'react'

// Next Imports
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

// Redux Imports
import { useDispatch, useSelector } from 'react-redux'

// MUI Imports
import useMediaQuery from '@mui/material/useMediaQuery'
import { styled, useTheme } from '@mui/material/styles'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Checkbox from '@mui/material/Checkbox'
import Button from '@mui/material/Button'
import FormControlLabel from '@mui/material/FormControlLabel'
import Alert from '@mui/material/Alert'
import Divider from '@mui/material/Divider'

// Third-party Imports
import { signIn } from 'next-auth/react'
import { Controller, useForm } from 'react-hook-form'
import { valibotResolver } from '@hookform/resolvers/valibot'
import { email, object, minLength, string, pipe, nonEmpty } from 'valibot'
import type { SubmitHandler } from 'react-hook-form'
import type { InferInput } from 'valibot'
import classnames from 'classnames'

import type { AppDispatch, RootState } from '@/redux-store/index'
import { loginUser, clearError } from '@/redux-store/slices/usersSlice'

// Type Imports
import type { SystemMode } from '@core/types'

// Component Imports
import Logo from '@components/layout/shared/Logo'
import CustomTextField from '@core/components/mui/TextField'

// Config Imports
import themeConfig from '@configs/themeConfig'

// Hook Imports
import { useImageVariant } from '@core/hooks/useImageVariant'
import { useSettings } from '@core/hooks/useSettings'
import type { UserRole } from '@/types/roles/userRoles'

// Styled components remain exactly the same
const LoginIllustration = styled('img')(({ theme }) => ({
  zIndex: 2,
  blockSize: 'auto',
  maxBlockSize: 680,
  maxInlineSize: '100%',
  margin: theme.spacing(12),
  [theme.breakpoints.down(1536)]: {
    maxBlockSize: 550
  },
  [theme.breakpoints.down('lg')]: {
    maxBlockSize: 450
  }
}))

const MaskImg = styled('img')({
  blockSize: 'auto',
  maxBlockSize: 355,
  inlineSize: '100%',
  position: 'absolute',
  insetBlockEnd: 0,
  zIndex: -1
})

type FormData = InferInput<typeof schema>

const schema = object({
  email: pipe(string(), minLength(1, 'This field is required'), email('Email is invalid')),
  password: pipe(
    string(),
    nonEmpty('This field is required'),
    minLength(5, 'Password must be at least 5 characters long')
  )
})

// Public read-only demo account, seeded by the backend's `seedDemo.js`.
// These are deliberately public credentials — the account is read-only and
// exists so recruiters can look around without signing up. Overridable at
// build time so a fork can point at its own demo user.
const DEMO_EMAIL = process.env.NEXT_PUBLIC_DEMO_EMAIL || 'demo@tafawooq.com'
const DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_PASSWORD || 'Demo@1234'


const getDashboardUrl = (role: UserRole): string => {
  switch (role) {
    case 'admin':
      return '/dashboards/crm'
    case 'tutor':
      return '/apps/tutor/dashboard'
    case 'student':
      return '/apps/academy/dashboard'
    default:
      return '/dashboards/crm'
  }
}


const Login = ({ mode }: { mode: SystemMode }) => {
  // States
  const [isPasswordShown, setIsPasswordShown] = useState(false)
  const [isDemoLoading, setIsDemoLoading] = useState(false)

  // Redux hooks
  const dispatch = useDispatch<AppDispatch>()
  const { error, loading } = useSelector((state: RootState) => state.usersReducer)

  // Vars
  const darkImg = '/images/pages/auth-mask-dark.png'
  const lightImg = '/images/pages/auth-mask-light.png'
  const darkIllustration = '/images/illustrations/auth/v2-login-dark.png'
  const lightIllustration = '/images/illustrations/auth/v2-login-light.png'
  const borderedDarkIllustration = '/images/illustrations/auth/v2-login-dark-border.png'
  const borderedLightIllustration = '/images/illustrations/auth/v2-login-light-border.png'

  // Hooks
  const router = useRouter()
  const searchParams = useSearchParams()
  const { settings } = useSettings()
  const theme = useTheme()
  const hidden = useMediaQuery(theme.breakpoints.down('md'))
  const authBackground = useImageVariant(mode, lightImg, darkImg)

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm<FormData>({
    resolver: valibotResolver(schema),
    defaultValues: {
      email: '',
      password: ''
    }
  })

  const characterIllustration = useImageVariant(
    mode,
    lightIllustration,
    darkIllustration,
    borderedLightIllustration,
    borderedDarkIllustration
  )

  const handleClickShowPassword = () => setIsPasswordShown(show => !show)

  // Shared by the normal form submit and the "Try Demo Account" button —
  // the demo is just a shortcut into the same credential flow, not a
  // separate auth path.
  const performLogin = async (loginEmail: string, loginPassword: string) => {
    const result = await dispatch(loginUser({
      email: loginEmail,
      password: loginPassword
    })).unwrap()

    if (result.token) {
      // NextAuth sign-in (which already stores token in session)
      const nextAuthResult = await signIn('credentials', {
        email: loginEmail,
        password: loginPassword,
        token: result.token,
        userData: JSON.stringify(result.user),
        redirect: false
      })

      if (nextAuthResult?.error) {
        console.error('NextAuth sign-in failed:', nextAuthResult.error)

        return
      }

      const redirectURL = searchParams.get('redirectTo') ?? getDashboardUrl(result.user.role as UserRole)

      router.replace(redirectURL)
    }
  }

  const onSubmit: SubmitHandler<FormData> = async (data: FormData) => {
    try {
      await performLogin(data.email, data.password)
    } catch (err) {
      console.error('Login failed:', err)
    }
  }

  // Fills the form in first so the visitor can see exactly which
  // credentials are being used (and re-run it manually), then logs in.
  const handleDemoLogin = async () => {
    setValue('email', DEMO_EMAIL)
    setValue('password', DEMO_PASSWORD)
    setIsDemoLoading(true)

    try {
      await performLogin(DEMO_EMAIL, DEMO_PASSWORD)
    } catch (err) {
      console.error('Demo login failed:', err)
    } finally {
      setIsDemoLoading(false)
    }
  }

  return (
    <div className='flex bs-full justify-center'>
      <div
        className={classnames(
          'flex bs-full items-center justify-center flex-1 min-bs-[100dvh] relative p-6 max-md:hidden',
          {
            'border-ie': settings.skin === 'bordered'
          }
        )}
      >
        <LoginIllustration src={characterIllustration} alt='character-illustration' />
        {!hidden && <MaskImg alt='mask' src={authBackground} />}
      </div>
      <div className='flex justify-center items-center bs-full bg-backgroundPaper !min-is-full p-6 md:!min-is-[unset] md:p-12 md:is-[480px]'>
        <div className='absolute block-start-5 sm:block-start-[33px] inline-start-6 sm:inline-start-[38px]'>
          <Logo />
        </div>
        <div className='flex flex-col gap-6 is-full sm:is-auto md:is-full sm:max-is-[400px] md:max-is-[unset] mbs-8 sm:mbs-11 md:mbs-0'>
          <div className='flex flex-col gap-1'>
            <Typography variant='h4'>{`Welcome to ${themeConfig.templateName}! 👋🏻`}</Typography>
            <Typography>Please sign-in to your account and start the adventure</Typography>
          </div>
          <form
            noValidate
            autoComplete='off'
            onSubmit={handleSubmit(onSubmit)}
            className='flex flex-col gap-6'
          >
            {error && (
              <Alert severity='error' onClose={() => dispatch(clearError())}>
                {error}
              </Alert>
            )}
            <Controller
              name='email'
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <CustomTextField
                  {...field}
                  autoFocus
                  fullWidth
                  type='email'
                  label='Email'
                  placeholder='Enter your email'
                  error={!!errors.email || !!error}
                  helperText={errors?.email?.message || error}
                />
              )}
            />
            <Controller
              name='password'
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <CustomTextField
                  {...field}
                  fullWidth
                  label='Password'
                  placeholder='············'
                  id='login-password'
                  type={isPasswordShown ? 'text' : 'password'}
                  error={!!errors.password}
                  helperText={errors.password?.message}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position='end'>
                          <IconButton
                            edge='end'
                            onClick={handleClickShowPassword}
                            onMouseDown={e => e.preventDefault()}
                          >
                            <i className={isPasswordShown ? 'tabler-eye' : 'tabler-eye-off'} />
                          </IconButton>
                        </InputAdornment>
                      )
                    }
                  }}
                />
              )}
            />
            <div className='flex justify-between items-center gap-x-3 gap-y-1 flex-wrap'>
              <FormControlLabel control={<Checkbox defaultChecked />} label='Remember me' />
              <Typography className='text-end' color='primary.main' component={Link} href='/forgot-password'>
                Forgot password?
              </Typography>
            </div>
            <Button fullWidth variant='contained' type='submit' disabled={loading || isDemoLoading}>
              {loading && !isDemoLoading ? 'Logging in...' : 'Login'}
            </Button>

            <Divider>
              <Typography variant='body2' color='text.disabled'>
                or
              </Typography>
            </Divider>

            <Button
              fullWidth
              variant='outlined'
              color='secondary'
              onClick={handleDemoLogin}
              disabled={loading || isDemoLoading}
              startIcon={!isDemoLoading ? <i className='tabler-eye' /> : undefined}
            >
              {isDemoLoading ? 'Opening demo...' : 'Try Demo Account'}
            </Button>
            <Typography variant='body2' color='text.disabled' className='text-center'>
              Explore the full app instantly — no signup needed. The demo is read-only, so changes aren&apos;t saved.
            </Typography>

            <div className='flex justify-center items-center flex-wrap gap-2'>
              <Typography>New on our platform?</Typography>
              <Typography component={Link} href='/register' color='primary.main'>
                Create an account
              </Typography>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Login
