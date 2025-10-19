import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const Signup: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await signup(name, email, password, confirmPassword);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container-bedtime min-h-screen flex items-center justify-center">
      <div className="bedtime-card max-w-md w-full">
        <h1 className="text-4xl text-bedtime-purple font-display font-semibold mb-6 text-center">
          Create Account
        </h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label-bedtime">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-bedtime"
              required
            />
          </div>

          <div>
            <label className="label-bedtime">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-bedtime"
              required
            />
          </div>

          <div>
            <label className="label-bedtime">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-bedtime"
              required
            />
            <p className="text-xs text-bedtime-purple/60 mt-1">
              Min 8 characters, must include uppercase, lowercase, number, and special character
            </p>
          </div>

          <div>
            <label className="label-bedtime">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input-bedtime"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full"
          >
            {isLoading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <p className="mt-6 text-center text-bedtime-purple-dark font-body">
          Already have an account?{' '}
          <Link to="/login" className="text-bedtime-purple hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};
