import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dumbbell, ShieldCheck, ArrowRight, Lock } from 'lucide-react';

export const Login: React.FC = () => {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('dawood@gmail.com');
  const [password, setPassword] = useState('1234');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const res = await login(email, password);
    if (!res.success) {
      setError(res.error || 'Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#1E1F22] relative overflow-hidden">
      <div className="w-full max-w-md space-y-6 relative z-10 animate-fade-in">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#5865F2] text-white mb-2 shadow-lg">
            <Dumbbell className="h-7 w-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#F2F3F5]">
            Fit-Thetic Fitness Club
          </h1>
          <p className="text-xs text-[#949BA4]">
            Royal Avenue, Meherban Colony, Chak Shahzad, Isb
          </p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-[#1E1F22] bg-[#313338] p-6 sm:p-8 shadow-modal space-y-5">
          <div className="flex items-center gap-2 pb-2 border-b border-[#1E1F22]">
            <Lock className="h-4 w-4 text-[#5865F2]" />
            <h2 className="text-sm font-bold text-white">Owner &amp; Admin Sign In</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-[#DA373C]/20 border border-[#DA373C]/30 text-[#DA373C] text-xs font-semibold animate-shake">
                {error}
              </div>
            )}

            <Input
              label="Admin Email"
              type="email"
              placeholder="dawood@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Password / PIN"
              type="password"
              placeholder="1234"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full font-bold shadow-md hover:shadow-lg transition-all"
              isLoading={isLoading}
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              Sign In to Admin Panel
            </Button>
          </form>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#949BA4] pt-2">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>Turnkey Admin Portal. Automatic Cloud &amp; Offline Sync Active.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
