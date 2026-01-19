'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Shield, Mail, Lock, Smartphone, Cloud } from 'lucide-react';

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentView, setCurrentView] = useState<'landing' | 'auth' | 'dashboard'>('landing');

  useEffect(() => {
    // Check if user is already authenticated
    const sessionToken = localStorage.getItem('sessionToken');
    if (sessionToken) {
      setIsAuthenticated(true);
      setCurrentView('dashboard');
    }
  }, []);

  const features = [
    {
      icon: Shield,
      title: 'End-to-End Encryption',
      description: 'Your emails are encrypted before they leave your device and can only be decrypted by you.'
    },
    {
      icon: Mail,
      title: 'Disposable Aliases',
      description: 'Create unlimited email aliases for different purposes without exposing your real email.'
    },
    {
      icon: Lock,
      title: 'Privacy First',
      description: 'No tracking, no data collection. Your privacy is our top priority.'
    },
    {
      icon: Smartphone,
      title: 'Cross-Device Sync',
      description: 'Access your aliases and emails from any device, securely synchronized.'
    },
    {
      icon: Cloud,
      title: 'Local & Cloud',
      description: 'Host locally on your device or deploy to the cloud. Your choice.'
    }
  ];

  if (currentView === 'auth') {
    return <AuthView onAuthenticated={() => {
      setIsAuthenticated(true);
      setCurrentView('dashboard');
    }} />;
  }

  if (currentView === 'dashboard') {
    return <DashboardView onLogout={() => {
      localStorage.removeItem('sessionToken');
      setIsAuthenticated(false);
      setCurrentView('landing');
    }} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">EmailAlies</h1>
          </div>
          <Button onClick={() => setCurrentView('auth')}>
            Get Started
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-6">
          Secure Email Aliases
          <br />
          <span className="text-primary">Encrypted & Private</span>
          </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Create disposable email aliases that forward to your real inbox.
          End-to-end encrypted, privacy-focused, and works across all your devices.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" onClick={() => setCurrentView('auth')}>
            Start Creating Aliases
          </Button>
          <Button variant="outline" size="lg">
            Learn More
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Why Choose EmailAlies?</h2>
          <p className="text-muted-foreground text-lg">
            Built with privacy and security at the core
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="text-center">
              <CardHeader>
                <feature.icon className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{feature.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-muted py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Protect Your Privacy?</h2>
          <p className="text-muted-foreground text-lg mb-8">
            Join thousands of users who trust EmailAlies with their email privacy.
          </p>
          <Button size="lg" onClick={() => setCurrentView('auth')}>
            Create Your First Alias
          </Button>
        </div>
      </section>
    </div>
  );
}

function AuthView({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setStep('code');
      } else {
        alert(data.error || 'Failed to send verification code');
      }
    } catch (error) {
      alert('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('sessionToken', data.sessionToken);
        onAuthenticated();
      } else {
        alert(data.error || 'Verification failed');
      }
    } catch (error) {
      alert('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep('email');
    setCode('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
          <CardTitle>
            {step === 'email'
              ? (isLogin ? 'Welcome Back' : 'Create Account')
              : 'Enter Verification Code'
            }
          </CardTitle>
          <CardDescription>
            {step === 'email'
              ? (isLogin ? 'Enter your email to sign in' : 'Enter your email to create an account')
              : `We've sent a 6-digit code to ${email}`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'email' ? (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <Input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Sending code...' : 'Send Verification Code'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleCodeSubmit} className="space-y-4">
              <div>
                <Input
                  type="text"
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="text-center text-2xl tracking-widest"
                  maxLength={6}
                  required
                />
                <p className="text-sm text-muted-foreground text-center mt-2">
                  Enter the 6-digit code
                </p>
              </div>
              <Button type="submit" className="w-full" disabled={loading || code.length !== 6}>
                {loading ? 'Verifying...' : 'Verify Code'}
              </Button>
              <Button type="button" variant="outline" className="w-full" onClick={handleBack}>
                Back
              </Button>
            </form>
          )}
          {step === 'email' && (
            <div className="mt-4 text-center">
              <Button
                variant="link"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setEmail('');
                }}
              >
                {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardView({ onLogout }: { onLogout: () => void }) {
  const [aliases, setAliases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAliases();
  }, []);

  const loadAliases = async () => {
    try {
      const sessionToken = localStorage.getItem('sessionToken');
      const response = await fetch('/api/aliases', {
        headers: { 'Authorization': `Bearer ${sessionToken}` },
      });

      if (response.ok) {
        const data = await response.json();
        setAliases(data.aliases);
      }
    } catch (error) {
      console.error('Failed to load aliases:', error);
    } finally {
      setLoading(false);
    }
  };

  const createAlias = async () => {
    try {
      const sessionToken = localStorage.getItem('sessionToken');
      const response = await fetch('/api/aliases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          forwardingEmail: 'user@example.com', // In a real app, get from user profile
        }),
      });

      if (response.ok) {
        loadAliases();
      }
    } catch (error) {
      console.error('Failed to create alias:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">EmailAlies Dashboard</h1>
          </div>
          <Button variant="outline" onClick={onLogout}>
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold">Your Email Aliases</h2>
            <p className="text-muted-foreground">Manage your secure email aliases</p>
          </div>
          <Button onClick={createAlias}>
            Create New Alias
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <div className="grid gap-4">
            {aliases.map((alias) => (
              <Card key={alias.id}>
                <CardContent className="flex justify-between items-center p-6">
                  <div>
                    <h3 className="font-semibold">{alias.alias}@emailalies.com</h3>
                    <p className="text-sm text-muted-foreground">
                      Forwards to: {alias.forwardingEmail}
                    </p>
                    {alias.description && (
                      <p className="text-sm text-muted-foreground">{alias.description}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      alias.isActive
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {alias.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
            {aliases.length === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No aliases yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first email alias to get started
                  </p>
                  <Button onClick={createAlias}>Create Your First Alias</Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
