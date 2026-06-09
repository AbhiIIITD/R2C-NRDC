import { WireframeButton } from '../../components/WireframeButton';
import { WireframeInput } from '../../components/WireframeInput';
import { WireframeCard } from '../../components/WireframeCard';
import { useAuth } from '@/contexts/AuthContext';

export function IndustryProfile() {
  const { user } = useAuth();
  const isListedCompany = user?.isListedCompany !== false;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl text-neutral-800 mb-2">Company Profile</h1>
        <p className="text-sm text-neutral-600">Manage your company information and preferences</p>
      </div>
      {!isListedCompany && (
        <div className="mb-6 border-2 border-neutral-700 bg-neutral-100 p-4 text-sm text-neutral-800">
          Warning: This request is associated with a non-listed company. Additional verification may be required.
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <WireframeCard title="Company Information">
            <div className="space-y-4">
              <WireframeInput label="Company Name" placeholder="PharmaCorp" />
              <div className="inline-block border-2 border-neutral-400 bg-white px-2 py-1 text-xs">
                {isListedCompany ? 'Listed Company' : 'Non-listed Company'}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <WireframeInput label="Industry Sector" placeholder="Pharmaceuticals" />
                <WireframeInput label="Company Size" placeholder="1000-5000 employees" />
              </div>
              <WireframeInput label="Website" placeholder="https://pharmaco rp.com" />
              <div>
                <div className="text-sm mb-1 text-neutral-700">Company Description</div>
                <div className="border-2 border-neutral-400 bg-white p-3 h-32 text-sm text-neutral-500">
                  Brief company overview...
                </div>
              </div>
            </div>
          </WireframeCard>

          <WireframeCard title="Technology Interests">
            <div className="space-y-4">
              <div>
                <div className="text-sm mb-2 text-neutral-700">Focus Areas</div>
                <div className="flex flex-wrap gap-2 mb-2">
                  <span className="px-3 py-1 border-2 border-neutral-400 bg-white text-xs">Biotechnology</span>
                  <span className="px-3 py-1 border-2 border-neutral-400 bg-white text-xs">AI / ML</span>
                  <span className="px-3 py-1 border-2 border-neutral-400 bg-white text-xs">Therapeutics</span>
                </div>
                <WireframeInput placeholder="Add focus area" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm mb-1 text-neutral-700">Preferred Development Stage</div>
                  <div className="border-2 border-neutral-400 bg-white px-3 py-2 text-sm text-neutral-600">
                    Preclinical to Phase I ▼
                  </div>
                </div>
                <div>
                  <div className="text-sm mb-1 text-neutral-700">Budget Range</div>
                  <div className="border-2 border-neutral-400 bg-white px-3 py-2 text-sm text-neutral-600">
                    $5M - $50M ▼
                  </div>
                </div>
              </div>
            </div>
          </WireframeCard>

          <div className="flex justify-end gap-3">
            <WireframeButton label="Cancel" variant="ghost" />
            <WireframeButton label="Save Changes" variant="primary" />
          </div>
        </div>

        <div className="space-y-6">
          <WireframeCard title="Company Logo">
            <div className="flex flex-col items-center gap-4">
              <div className="w-32 h-32 bg-neutral-400"></div>
              <WireframeButton label="Upload Logo" variant="secondary" size="sm" />
            </div>
          </WireframeCard>

          <WireframeCard title="Account Stats">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-xs text-neutral-600">Member Since</span>
                <span className="text-xs text-neutral-800">Jan 2026</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-neutral-600">Technologies Viewed</span>
                <span className="text-xs text-neutral-800">156</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-neutral-600">Active Licenses</span>
                <span className="text-xs text-neutral-800">2</span>
              </div>
            </div>
          </WireframeCard>
        </div>
      </div>
    </div>
  );
}
