import { WireframeButton } from '../../components/WireframeButton';
import { WireframeInput } from '../../components/WireframeInput';
import { WireframeCard } from '../../components/WireframeCard';
import { User, Shield, Bell, FileText } from 'lucide-react';

export function ResearcherProfile() {
  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl text-neutral-800 mb-2">Profile Settings</h1>
        <p className="text-sm text-neutral-600">Manage your account information and preferences</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b-2 border-neutral-400">
        <div className="flex gap-6">
          <button className="px-4 py-3 border-b-2 border-neutral-800 text-sm text-neutral-800 flex items-center gap-2">
            <User size={16} />
            Profile
          </button>
          <button className="px-4 py-3 text-sm text-neutral-600 hover:text-neutral-800 flex items-center gap-2">
            <Shield size={16} />
            Security
          </button>
          <button className="px-4 py-3 text-sm text-neutral-600 hover:text-neutral-800 flex items-center gap-2">
            <Bell size={16} />
            Notifications
          </button>
          <button className="px-4 py-3 text-sm text-neutral-600 hover:text-neutral-800 flex items-center gap-2">
            <FileText size={16} />
            Documents
          </button>
        </div>
      </div>

      {/* Profile Tab Content */}
      <div className="grid grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="col-span-2 space-y-6">
          <WireframeCard title="Personal Information">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <WireframeInput label="First Name" placeholder="Sarah" />
                <WireframeInput label="Last Name" placeholder="Johnson" />
              </div>
              <WireframeInput label="Email Address" type="email" placeholder="sarah.johnson@university.edu" />
              <WireframeInput label="Phone Number" placeholder="+1 (555) 123-4567" />
            </div>
          </WireframeCard>

          <WireframeCard title="Professional Information">
            <div className="space-y-4">
              <WireframeInput label="Institution / Organization" placeholder="Stanford University" />
              <WireframeInput label="Department" placeholder="Department of Biotechnology" />
              <WireframeInput label="Position / Title" placeholder="Associate Professor" />
              <div>
                <div className="text-sm mb-1 text-neutral-700">Research Areas</div>
                <div className="flex flex-wrap gap-2 mb-2">
                  <span className="px-3 py-1 border-2 border-neutral-400 bg-white text-xs flex items-center gap-2">
                    Biotechnology
                    <button className="text-neutral-500 hover:text-neutral-800">×</button>
                  </span>
                  <span className="px-3 py-1 border-2 border-neutral-400 bg-white text-xs flex items-center gap-2">
                    mRNA Therapeutics
                    <button className="text-neutral-500 hover:text-neutral-800">×</button>
                  </span>
                  <span className="px-3 py-1 border-2 border-neutral-400 bg-white text-xs flex items-center gap-2">
                    Cancer Research
                    <button className="text-neutral-500 hover:text-neutral-800">×</button>
                  </span>
                </div>
                <WireframeInput placeholder="Add research area" />
              </div>
              <div>
                <div className="text-sm mb-1 text-neutral-700">Bio / About</div>
                <div className="border-2 border-neutral-400 bg-white p-3 h-32 text-sm text-neutral-500">
                  Brief professional biography...
                </div>
              </div>
            </div>
          </WireframeCard>

          <WireframeCard title="Public Profile">
            <div className="space-y-4">
              <div className="p-3 border-2 border-neutral-300 bg-neutral-50">
                <div className="text-xs text-neutral-700 mb-2">Profile Visibility</div>
                <label className="flex items-center gap-2 text-sm text-neutral-600">
                  <input type="checkbox" className="w-4 h-4 border-2 border-neutral-400" />
                  <span>Allow industry partners to view my profile</span>
                </label>
              </div>
              <WireframeInput label="ORCID iD" placeholder="0000-0000-0000-0000" />
              <WireframeInput label="LinkedIn Profile" placeholder="https://linkedin.com/in/..." />
              <WireframeInput label="Personal Website" placeholder="https://..." />
            </div>
          </WireframeCard>

          <div className="flex justify-end gap-3">
            <WireframeButton label="Cancel" variant="ghost" />
            <WireframeButton label="Save Changes" variant="primary" />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Profile Photo */}
          <WireframeCard title="Profile Photo">
            <div className="flex flex-col items-center gap-4">
              <div className="w-32 h-32 bg-neutral-400 rounded-full"></div>
              <WireframeButton label="Upload Photo" variant="secondary" size="sm" />
              <div className="text-xs text-neutral-500 text-center">
                JPG, PNG or GIF. Max 2MB.
              </div>
            </div>
          </WireframeCard>

          {/* Account Stats */}
          <WireframeCard title="Account Activity">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-neutral-600">Member Since</span>
                <span className="text-xs text-neutral-800">Jan 2026</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-neutral-600">Studies Published</span>
                <span className="text-xs text-neutral-800">8</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-neutral-600">Total Views</span>
                <span className="text-xs text-neutral-800">1,234</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-neutral-600">Industry Connections</span>
                <span className="text-xs text-neutral-800">15</span>
              </div>
            </div>
          </WireframeCard>

          {/* Verification */}
          <WireframeCard title="Verification Status">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-neutral-700 rounded"></div>
                <span className="text-xs text-neutral-700">Email Verified</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-neutral-700 rounded"></div>
                <span className="text-xs text-neutral-700">Institution Verified</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-neutral-400 bg-white rounded"></div>
                <span className="text-xs text-neutral-500">ORCID Connected</span>
              </div>
            </div>
            <div className="mt-4">
              <WireframeButton label="Complete Verification" variant="secondary" size="sm" className="w-full" />
            </div>
          </WireframeCard>

          {/* Account Actions */}
          <div className="space-y-2">
            <WireframeButton label="Export My Data" variant="ghost" size="sm" className="w-full" />
            <WireframeButton label="Deactivate Account" variant="ghost" size="sm" className="w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
