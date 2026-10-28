import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Login, Register } from '../pages/Auth'
import Generate from '../pages/Generate'
import { api } from '../services/api'

const login = vi.fn(); const register = vi.fn()
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ login, register }) }))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))
afterEach(() => vi.restoreAllMocks())

test('login submits credentials and shows API error', async () => {
  login.mockRejectedValueOnce(new Error('Incorrect email or password'))
  render(<MemoryRouter><Login /></MemoryRouter>)
  await userEvent.type(screen.getByLabelText('Email'), 'a@b.com'); await userEvent.type(screen.getByLabelText('Password'), 'secret123')
  await userEvent.click(screen.getByRole('button', { name: /^log in/i }))
  expect(login).toHaveBeenCalledWith({ email: 'a@b.com', password: 'secret123' })
  expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect email or password')
})

test('register rejects weak passwords client-side', async () => {
  render(<MemoryRouter><Register /></MemoryRouter>)
  await userEvent.type(screen.getByLabelText('Full name'), 'Alice'); await userEvent.type(screen.getByLabelText('Email'), 'a@b.com'); await userEvent.type(screen.getByLabelText('Password'), 'abcdefgh')
  await userEvent.click(screen.getByRole('button', { name: /create account/i }))
  expect(await screen.findByRole('alert')).toHaveTextContent(/letters and numbers/i); expect(register).not.toHaveBeenCalled()
})

test('recommendation flow renders ranked projects and unverified-novelty notice', async () => {
  vi.spyOn(api, 'recommendations').mockResolvedValue({ projects: [] })
  const project = { id: 1, rank: 1, title: 'Explainable Fracture Detection', short_description: 'desc', domain: 'Healthcare', difficulty: 'advanced', version: 1,
    scores: { overall: 80, novelty_verified: false, scores: { novelty: 70, feasibility: 75, career_relevance: 88 } } }
  const rec = vi.spyOn(api, 'recommend').mockResolvedValue({ origin: 'template', notice: 'No AI key configured', projects: [project] })
  render(<MemoryRouter><Generate /></MemoryRouter>)
  await userEvent.selectOptions(screen.getByLabelText('Domain'), 'Healthcare')
  await userEvent.click(screen.getByRole('button', { name: /generate recommendations/i }))
  await waitFor(() => expect(rec).toHaveBeenCalled())
  expect(rec.mock.calls[0][0]).toMatchObject({ domain: 'Healthcare', team_size: 1 })
  expect(await screen.findByText('Explainable Fracture Detection')).toBeInTheDocument()
  expect(screen.getByText(/unverified prior/i)).toBeInTheDocument(); expect(screen.getByText(/No AI key configured/)).toBeInTheDocument()
})
