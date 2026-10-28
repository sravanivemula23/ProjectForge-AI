import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ScoreRing from '../components/ScoreRing'
import ScoreBars from '../components/ScoreBars'
import ProtectedRoute from '../components/ProtectedRoute'

vi.mock('../hooks/useAuth', () => ({ useAuth: vi.fn() }))
import { useAuth } from '../hooks/useAuth'

test('ScoreRing shows value and handles null', () => {
  const { rerender } = render(<ScoreRing value={86} label="Novelty" />)
  expect(screen.getByLabelText('Novelty: 86')).toBeInTheDocument()
  rerender(<ScoreRing value={null} label="Novelty" />)
  expect(screen.getByLabelText('Novelty: not available')).toBeInTheDocument()
})

test('ScoreBars flags unverified novelty', () => {
  render(<ScoreBars scores={{ novelty: 70, feasibility: 80 }} explanations={{}} novelty_verified={false} />)
  expect(screen.getByText(/unverified prior/i)).toBeInTheDocument()
  expect(screen.getAllByRole('progressbar')).toHaveLength(2)
})

const tree = (path = '/secret') => (
  <MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/login" element={<div>login page</div>} /><Route path="/dashboard" element={<div>dash</div>} />
    <Route path="/secret" element={<ProtectedRoute><div>secret</div></ProtectedRoute>} />
    <Route path="/admin" element={<ProtectedRoute admin><div>admin area</div></ProtectedRoute>} />
  </Routes></MemoryRouter>
)

test('ProtectedRoute redirects anonymous users to login', () => {
  useAuth.mockReturnValue({ user: null, loading: false })
  render(tree()); expect(screen.getByText('login page')).toBeInTheDocument()
})
test('ProtectedRoute renders for authenticated users and blocks non-admins', () => {
  useAuth.mockReturnValue({ user: { role: 'student' }, loading: false })
  const { unmount } = render(tree()); expect(screen.getByText('secret')).toBeInTheDocument(); unmount()
  render(tree('/admin')); expect(screen.getByText('dash')).toBeInTheDocument()
})
