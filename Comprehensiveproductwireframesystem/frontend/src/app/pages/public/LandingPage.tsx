import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { WireframeButton } from '../../components/WireframeButton';
import { WireframeBox } from '../../components/WireframeBox';
import { ArrowRight, Upload, Search, Handshake } from 'lucide-react';
import { api } from '@/services/api';

interface PublicStats {
  publishedStudies: number;
  industryPartners: number;
  activeCollaborations: number;
  technologiesLicensed: number;
  researchers: number;
}

export function LandingPage() {
  const [stats, setStats] = useState<PublicStats | null>(null);

  useEffect(() => {
    let active = true;
    api
      .get<PublicStats>('/public/stats')
      .then((data) => active && setStats(data))
      .catch(() => active && setStats(null));
    return () => {
      active = false;
    };
  }, []);

  const fmt = (value: number | undefined) => (value === undefined ? '—' : value.toLocaleString());

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-white border-b-2 border-neutral-400">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="grid grid-cols-2 gap-12 items-center">
            <div>
              <div className="text-4xl text-neutral-800 mb-4">Research to Commercialization Platform</div>
              <div className="text-lg text-neutral-600 mb-6">
                Connect breakthrough research with industry partners. Accelerate technology transfer from lab to market.
              </div>
              <div className="flex gap-4">
                <Link to="/signup">
                  <WireframeButton label="Get Started" variant="primary" size="lg" />
                </Link>
                <a href="#how-it-works">
                  <WireframeButton label="Learn More" variant="secondary" size="lg" />
                </a>
              </div>
              <div className="mt-6 text-sm text-neutral-500">
                Join {fmt(stats?.researchers)} researchers and {fmt(stats?.industryPartners)} industry partners
              </div>
            </div>
            <WireframeBox height="400px" label="Hero Image / Video" />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-neutral-50 border-b-2 border-neutral-400">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="text-2xl text-neutral-800 text-center mb-12">How It Works</div>
          <div className="grid grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 border-2 border-neutral-400 bg-white flex items-center justify-center">
                <Upload size={32} className="text-neutral-600" />
              </div>
              <div className="text-lg text-neutral-800 mb-2">1. Upload Research</div>
              <div className="text-sm text-neutral-600">
                Researchers submit studies. AI extracts key insights and commercial potential.
              </div>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 border-2 border-neutral-400 bg-white flex items-center justify-center">
                <Search size={32} className="text-neutral-600" />
              </div>
              <div className="text-lg text-neutral-800 mb-2">2. Industry Discovery</div>
              <div className="text-sm text-neutral-600">
                Industry partners browse marketplace and receive smart matches.
              </div>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 border-2 border-neutral-400 bg-white flex items-center justify-center">
                <Handshake size={32} className="text-neutral-600" />
              </div>
              <div className="text-lg text-neutral-800 mb-2">3. Commercialization</div>
              <div className="text-sm text-neutral-600">
                Connect, meet, and license. Track progress from interest to market.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* User Types */}
      <section className="bg-white border-b-2 border-neutral-400">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="text-2xl text-neutral-800 text-center mb-12">Choose Your Path</div>
          <div className="grid grid-cols-2 gap-8">
            <div className="border-2 border-neutral-400 p-8">
              <div className="text-xl text-neutral-800 mb-4">For Researchers</div>
              <ul className="space-y-2 mb-6">
                <li className="flex items-start gap-2 text-sm text-neutral-600">
                  <ArrowRight size={16} className="mt-1 flex-shrink-0" />
                  <span>Upload and manage research studies</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-neutral-600">
                  <ArrowRight size={16} className="mt-1 flex-shrink-0" />
                  <span>AI-powered commercial readiness assessment</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-neutral-600">
                  <ArrowRight size={16} className="mt-1 flex-shrink-0" />
                  <span>Connect with industry partners</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-neutral-600">
                  <ArrowRight size={16} className="mt-1 flex-shrink-0" />
                  <span>Track commercialization progress</span>
                </li>
              </ul>
              <Link to="/signup?type=researcher">
                <WireframeButton label="Sign Up as Researcher" variant="primary" className="w-full" />
              </Link>
            </div>
            <div className="border-2 border-neutral-400 p-8">
              <div className="text-xl text-neutral-800 mb-4">For Industry</div>
              <ul className="space-y-2 mb-6">
                <li className="flex items-start gap-2 text-sm text-neutral-600">
                  <ArrowRight size={16} className="mt-1 flex-shrink-0" />
                  <span>Browse curated research marketplace</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-neutral-600">
                  <ArrowRight size={16} className="mt-1 flex-shrink-0" />
                  <span>AI-powered technology matching</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-neutral-600">
                  <ArrowRight size={16} className="mt-1 flex-shrink-0" />
                  <span>Schedule meetings with researchers</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-neutral-600">
                  <ArrowRight size={16} className="mt-1 flex-shrink-0" />
                  <span>Streamlined licensing workflow</span>
                </li>
              </ul>
              <Link to="/signup?type=industry">
                <WireframeButton label="Sign Up as Industry Partner" variant="primary" className="w-full" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-neutral-100 border-b-2 border-neutral-400">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl text-neutral-800 mb-2">{fmt(stats?.publishedStudies)}</div>
              <div className="text-sm text-neutral-600">Research Studies</div>
            </div>
            <div>
              <div className="text-3xl text-neutral-800 mb-2">{fmt(stats?.industryPartners)}</div>
              <div className="text-sm text-neutral-600">Industry Partners</div>
            </div>
            <div>
              <div className="text-3xl text-neutral-800 mb-2">{fmt(stats?.activeCollaborations)}</div>
              <div className="text-sm text-neutral-600">Active Collaborations</div>
            </div>
            <div>
              <div className="text-3xl text-neutral-800 mb-2">{fmt(stats?.technologiesLicensed)}</div>
              <div className="text-sm text-neutral-600">Technologies Licensed</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-6 py-20 text-center">
          <div className="text-3xl text-neutral-800 mb-4">Ready to Get Started?</div>
          <div className="text-lg text-neutral-600 mb-8">
            Join R2C.AI today and accelerate your path from research to market
          </div>
          <div className="flex gap-4 justify-center">
            <Link to="/signup">
              <WireframeButton label="Create Account" variant="primary" size="lg" />
            </Link>
            <Link to="/login">
              <WireframeButton label="Login" variant="secondary" size="lg" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
