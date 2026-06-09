import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router';
import { useAuth } from '@/contexts/AuthContext';
import { getRoleDashboardPath } from '@/components/ProtectedRoute';
import { UserRole } from '@/types/index';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Loader } from 'lucide-react';

// ============================================================================
// Signup Page
// ============================================================================

export function SignupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signup, isLoading, error } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Step 1: Role Selection
  const [role, setRole] = useState<UserRole | ''>('');

  // Pre-select role from URL (?type=researcher or ?type=industry)
  useEffect(() => {
    const type = searchParams.get('type');
    if (type === 'researcher' || type === 'industry') {
      setRole(type);
      setCurrentStep(2);
    }
  }, [searchParams]);

  // Step 2: Basic Information
  const [basicInfo, setBasicInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  // Step 3: Role-Specific Information
  const [roleInfo, setRoleInfo] = useState({
    organization: '',
    institution: '',
    department: '',
    researchArea: '',
    jobTitle: '',
    industrySector: '',
  });

  const [acceptTerms, setAcceptTerms] = useState(false);

  // Handle role selection
  const handleRoleSelect = (selectedRole: UserRole) => {
    setRole(selectedRole);
    setCurrentStep(2);
  };

  // Handle basic info changes
  const handleBasicInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setBasicInfo((prev) => ({
      ...prev,
      [name]: value,
    }));
    setSubmitError(null);
  };

  // Handle role info changes
  const handleRoleInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setRoleInfo((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Validate basic info
  const validateBasicInfo = (): boolean => {
    if (!basicInfo.firstName || !basicInfo.lastName) {
      setSubmitError('Please enter your name');
      return false;
    }
    if (!basicInfo.email) {
      setSubmitError('Please enter an email address');
      return false;
    }
    if (
      !basicInfo.email.match(
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      )
    ) {
      setSubmitError('Please enter a valid email address');
      return false;
    }
    if (!basicInfo.password) {
      setSubmitError('Please enter a password');
      return false;
    }
    if (basicInfo.password.length < 8) {
      setSubmitError('Password must be at least 8 characters');
      return false;
    }
    if (basicInfo.password !== basicInfo.confirmPassword) {
      setSubmitError('Passwords do not match');
      return false;
    }
    return true;
  };

  // Validate role info
  const validateRoleInfo = (): boolean => {
    if (role === 'researcher') {
      if (!roleInfo.institution || !roleInfo.department) {
        setSubmitError('Please fill in institution and department');
        return false;
      }
    } else if (role === 'industry') {
      if (!roleInfo.organization || !roleInfo.jobTitle) {
        setSubmitError('Please fill in company and job title');
        return false;
      }
    }
    if (!acceptTerms) {
      setSubmitError('Please accept the Terms of Service and Privacy Policy');
      return false;
    }
    return true;
  };

  // Handle signup submission
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // Validate
    if (!validateRoleInfo()) {
      return;
    }

    try {
      const organization =
        role === 'researcher'
          ? roleInfo.institution
          : roleInfo.organization;

      await signup(
        basicInfo.email,
        basicInfo.password,
        `${basicInfo.firstName} ${basicInfo.lastName}`,
        role as UserRole,
        organization
      );

      navigate(getRoleDashboardPath(role as UserRole), { replace: true });
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Signup failed'
      );
    }
  };

  // Step 1: Role Selection
  if (currentStep === 1 && !role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-100 py-12 px-4">
        <div className="w-full max-w-2xl">
          <div className="bg-white rounded-lg shadow-xl shadow-black/10 p-8 border border-neutral-200">
            <h1 className="text-3xl font-bold text-neutral-950 mb-2">
              Join R2C.AI
            </h1>
            <p className="text-neutral-600 mb-8">
              Select your role to get started
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Researcher Option */}
              <button
                onClick={() => handleRoleSelect('researcher')}
                className="p-6 border border-neutral-300 rounded-lg hover:border-neutral-900 hover:bg-neutral-50 active:bg-neutral-100 transition-all duration-150 hover:-translate-y-0.5 text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
              >
                <div className="text-2xl mb-2">🔬</div>
                <h3 className="text-lg font-bold text-neutral-950 mb-2">
                  Researcher
                </h3>
                <p className="text-neutral-600 text-sm">
                  Publish your research and connect with industry partners for
                  commercialization opportunities.
                </p>
              </button>

              {/* Industry Option */}
              <button
                onClick={() => handleRoleSelect('industry')}
                className="p-6 border border-neutral-300 rounded-lg hover:border-neutral-900 hover:bg-neutral-50 active:bg-neutral-100 transition-all duration-150 hover:-translate-y-0.5 text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
              >
                <div className="text-2xl mb-2">🏢</div>
                <h3 className="text-lg font-bold text-neutral-950 mb-2">
                  Industry Partner
                </h3>
                <p className="text-neutral-600 text-sm">
                  Discover innovative technologies and research to accelerate
                  your product development.
                </p>
              </button>
            </div>

            <div className="text-center text-sm text-neutral-600 mt-8 pt-8 border-t border-neutral-200">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-neutral-900 hover:text-black underline-offset-4 hover:underline font-medium"
              >
                Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Basic Information
  if (currentStep === 2) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-100 py-12 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-xl shadow-black/10 p-8 border border-neutral-200">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold text-neutral-950">
                  Create Your Account
                </h1>
                <span className="text-sm text-neutral-500">Step 1 of 2</span>
              </div>
              <div className="w-full bg-neutral-200 rounded-full h-2">
                <div className="bg-neutral-900 h-2 rounded-full transition-all duration-300" style={{ width: '50%' }}></div>
              </div>
            </div>

            {submitError && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (validateBasicInfo()) {
                  setCurrentStep(3);
                }
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName" className="text-neutral-800">
                    First Name
                  </Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    placeholder="John"
                    value={basicInfo.firstName}
                    onChange={handleBasicInfoChange}
                    className="mt-1 border-neutral-300 bg-white text-neutral-950 placeholder:text-neutral-500 focus-visible:border-neutral-900 focus-visible:ring-neutral-900/20"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName" className="text-neutral-800">
                    Last Name
                  </Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    placeholder="Doe"
                    value={basicInfo.lastName}
                    onChange={handleBasicInfoChange}
                    className="mt-1 border-neutral-300 bg-white text-neutral-950 placeholder:text-neutral-500 focus-visible:border-neutral-900 focus-visible:ring-neutral-900/20"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email" className="text-neutral-800">
                  Email Address
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="your@email.com"
                  value={basicInfo.email}
                  onChange={handleBasicInfoChange}
                  className="mt-1 border-neutral-300 bg-white text-neutral-950 placeholder:text-neutral-500 focus-visible:border-neutral-900 focus-visible:ring-neutral-900/20"
                />
              </div>

              <div>
                <Label htmlFor="password" className="text-neutral-800">
                  Password
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Password"
                  value={basicInfo.password}
                  onChange={handleBasicInfoChange}
                  className="mt-1 border-neutral-300 bg-white text-neutral-950 placeholder:text-neutral-500 focus-visible:border-neutral-900 focus-visible:ring-neutral-900/20"
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="text-neutral-800">
                  Confirm Password
                </Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="Confirm password"
                  value={basicInfo.confirmPassword}
                  onChange={handleBasicInfoChange}
                  className="mt-1 border-neutral-300 bg-white text-neutral-950 placeholder:text-neutral-500 focus-visible:border-neutral-900 focus-visible:ring-neutral-900/20"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCurrentStep(1);
                    setRole('');
                  }}
                  className="flex-1 border-neutral-300 text-neutral-900 hover:bg-neutral-100"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-neutral-900 hover:bg-neutral-800 active:bg-black text-white font-semibold shadow-sm transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0"
                >
                  Continue
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Role-Specific Information
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-100 py-12 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-xl shadow-black/10 p-8 border border-neutral-200">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-neutral-950">
                {role === 'researcher'
                  ? 'Research Information'
                  : 'Company Information'}
              </h1>
              <span className="text-sm text-neutral-500">Step 2 of 2</span>
            </div>
            <div className="w-full bg-neutral-200 rounded-full h-2">
              <div className="bg-neutral-900 h-2 rounded-full transition-all duration-300" style={{ width: '100%' }}></div>
            </div>
          </div>

          {(submitError || error) && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{submitError || error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            {role === 'researcher' ? (
              <>
                <div>
                  <Label htmlFor="institution" className="text-neutral-800">
                    Institution / University
                  </Label>
                  <Input
                    id="institution"
                    name="institution"
                    placeholder="MIT, Stanford, etc."
                    value={roleInfo.institution}
                    onChange={handleRoleInfoChange}
                    className="mt-1 border-neutral-300 bg-white text-neutral-950 placeholder:text-neutral-500 focus-visible:border-neutral-900 focus-visible:ring-neutral-900/20"
                  />
                </div>
                <div>
                  <Label htmlFor="department" className="text-neutral-800">
                    Department
                  </Label>
                  <Input
                    id="department"
                    name="department"
                    placeholder="Engineering, Biology, etc."
                    value={roleInfo.department}
                    onChange={handleRoleInfoChange}
                    className="mt-1 border-neutral-300 bg-white text-neutral-950 placeholder:text-neutral-500 focus-visible:border-neutral-900 focus-visible:ring-neutral-900/20"
                  />
                </div>
                <div>
                  <Label htmlFor="researchArea" className="text-neutral-800">
                    Research Area (Optional)
                  </Label>
                  <Input
                    id="researchArea"
                    name="researchArea"
                    placeholder="e.g., Biotechnology, Materials Science"
                    value={roleInfo.researchArea}
                    onChange={handleRoleInfoChange}
                    className="mt-1 border-neutral-300 bg-white text-neutral-950 placeholder:text-neutral-500 focus-visible:border-neutral-900 focus-visible:ring-neutral-900/20"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label htmlFor="organization" className="text-neutral-800">
                    Company Name
                  </Label>
                  <Input
                    id="organization"
                    name="organization"
                    placeholder="Company Name"
                    value={roleInfo.organization}
                    onChange={handleRoleInfoChange}
                    className="mt-1 border-neutral-300 bg-white text-neutral-950 placeholder:text-neutral-500 focus-visible:border-neutral-900 focus-visible:ring-neutral-900/20"
                  />
                </div>
                <div>
                  <Label htmlFor="jobTitle" className="text-neutral-800">
                    Job Title
                  </Label>
                  <Input
                    id="jobTitle"
                    name="jobTitle"
                    placeholder="e.g., R&D Director"
                    value={roleInfo.jobTitle}
                    onChange={handleRoleInfoChange}
                    className="mt-1 border-neutral-300 bg-white text-neutral-950 placeholder:text-neutral-500 focus-visible:border-neutral-900 focus-visible:ring-neutral-900/20"
                  />
                </div>
                <div>
                  <Label htmlFor="industrySector" className="text-neutral-800">
                    Industry Sector (Optional)
                  </Label>
                  <Input
                    id="industrySector"
                    name="industrySector"
                    placeholder="e.g., Pharmaceuticals, Electronics"
                    value={roleInfo.industrySector}
                    onChange={handleRoleInfoChange}
                    className="mt-1 border-neutral-300 bg-white text-neutral-950 placeholder:text-neutral-500 focus-visible:border-neutral-900 focus-visible:ring-neutral-900/20"
                  />
                </div>
              </>
            )}

            <div className="pt-2">
              <label className="flex items-start gap-2 text-sm text-neutral-700">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded border-neutral-400 accent-neutral-900"
                />
                <span>
                  I agree to the Terms of Service and Privacy Policy
                </span>
              </label>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(2)}
                className="flex-1 border-neutral-300 text-neutral-900 hover:bg-neutral-100"
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-neutral-900 hover:bg-neutral-800 active:bg-black disabled:bg-neutral-300 disabled:text-neutral-600 text-white font-semibold shadow-sm transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0"
              >
                {isLoading ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
            </div>
          </form>

          <div className="text-center text-sm text-neutral-600 mt-6 pt-6 border-t border-neutral-200">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-neutral-900 hover:text-black underline-offset-4 hover:underline font-medium"
            >
              Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
