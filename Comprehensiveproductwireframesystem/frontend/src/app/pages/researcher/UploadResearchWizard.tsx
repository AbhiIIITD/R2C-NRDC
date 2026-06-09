import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/contexts/AuthContext';
import { useAppData } from '@/contexts/AppDataContext';
import { ResearchDomain } from '@/types/index';
import { WireframeButton } from '../../components/WireframeButton';
import { WireframeInput } from '../../components/WireframeInput';
import { WireframeCard } from '../../components/WireframeCard';
import { KeywordMultiSelect } from '../../components/KeywordMultiSelect';
import { CheckCircle2 } from 'lucide-react';

export function UploadResearchWizard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addStudy, addNotification } = useAppData();
  const [currentStep, setCurrentStep] = useState(1);
  const [accepted, setAccepted] = useState(false);
  const [documentFile, setDocumentFile] = useState<File | undefined>();
  const [form, setForm] = useState({
    title: 'Novel Cancer Treatment Using mRNA Technology',
    abstract:
      'Novel mRNA-based treatment approach with significant efficacy in targeting specific tumor cells.',
    domain: 'Healthcare & Pharma' as ResearchDomain,
    keywords: ['mRNA', 'cancer', 'immunotherapy', 'oncology'],
    journal: 'Journal of Translational Medicine',
    publicationDate: '2026-04-12',
  });

  const steps = [
    { num: 1, label: 'Upload Document' },
    { num: 2, label: 'Basic Information' },
    { num: 3, label: 'AI Extraction' },
    { num: 4, label: 'Review & Submit' },
  ];

  const updateField = (field: keyof typeof form, value: string | string[]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const persistStudy = (status: 'draft' | 'submitted') => {
    if (!user) return;

    const study = {
      id: `study_${Date.now()}`,
      title: form.title,
      abstract: form.abstract,
      domain: form.domain,
      status,
      trl: 5 as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      researcherId: user.id,
      researcherName: user.name,
      keywords: form.keywords,
      commercialPotential: 'High - AI simulation identifies clear industry applications',
      marketSize: '$50B+ addressable market',
      competitors: 'Comparable emerging solutions under evaluation',
      ipStatus: 'Patent pending',
      readinessScore: 82,
      documentFile,
    };

    addStudy(study);

    if (status === 'submitted') {
      addNotification({
        id: `notif_${Date.now()}`,
        userId: 'admin1',
        type: 'study_submitted',
        title: 'Study Submitted',
        message: `${user.name} submitted "${study.title}" for NRDC review.`,
        relatedId: study.id,
        relatedType: 'study',
        read: false,
        createdAt: new Date(),
      });
      navigate('/researcher/studies');
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl text-neutral-800 mb-2">Upload Research Study</h1>
        <p className="text-sm text-neutral-600">Follow the steps to submit your research for commercialization</p>
      </div>

      {/* Wizard Progress */}
      <div className="mb-8 border-2 border-neutral-400 bg-white p-6">
        <div className="flex items-center justify-between">
          {steps.map((step, idx) => (
            <div key={step.num} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full border-2 flex items-center justify-center mb-2 ${
                    step.num < currentStep
                      ? 'border-neutral-600 bg-neutral-600 text-white'
                      : step.num === currentStep
                      ? 'border-neutral-800 bg-neutral-800 text-white'
                      : 'border-neutral-400 bg-white text-neutral-500'
                  }`}
                >
                  {step.num < currentStep ? <CheckCircle2 size={20} /> : <span className="text-sm">{step.num}</span>}
                </div>
                <div
                  className={`text-xs text-center ${
                    step.num <= currentStep ? 'text-neutral-800' : 'text-neutral-500'
                  }`}
                >
                  {step.label}
                </div>
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-4 ${
                    step.num < currentStep ? 'bg-neutral-600' : 'bg-neutral-300'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      {currentStep === 1 && (
        <WireframeCard title="Step 1: Upload Research Document">
          <div className="space-y-4">
            <div className="border-2 border-dashed border-neutral-400 bg-neutral-50 p-12 text-center">
              <div className="text-sm text-neutral-600 mb-4">
                {documentFile ? documentFile.name : 'Drag and drop your research document here, or click to browse'}
              </div>
              <label className="inline-flex cursor-pointer">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  className="sr-only"
                  onChange={(event) => setDocumentFile(event.target.files?.[0])}
                />
                <span className="border font-medium rounded-md px-4 py-2 text-sm bg-white text-neutral-900 border-neutral-300 hover:bg-neutral-100 hover:border-neutral-500 transition-all duration-150 ease-out">
                  Choose File
                </span>
              </label>
              <div className="text-xs text-neutral-500 mt-4">Supported formats: PDF, DOCX (Max 50MB)</div>
            </div>

            <div className="text-sm text-neutral-700 mb-2">Or provide a DOI:</div>
              <WireframeInput placeholder="Enter DOI (e.g., 10.1000/xyz123)" />

            <div className="flex justify-end gap-3 mt-6 pt-6 border-t-2 border-neutral-300">
                <WireframeButton label="Cancel" variant="ghost" onClick={() => navigate('/researcher/studies')} />
              <WireframeButton label="Next" variant="primary" onClick={() => setCurrentStep(2)} />
            </div>
          </div>
        </WireframeCard>
      )}

      {currentStep === 2 && (
        <WireframeCard title="Step 2: Basic Information">
          <div className="space-y-4">
            <WireframeInput
              label="Study Title"
              placeholder="Enter a descriptive title"
              value={form.title}
              onChange={(value) => updateField('title', value)}
            />

            <div>
              <div className="text-sm mb-1 text-neutral-700">Abstract</div>
              <textarea
                value={form.abstract}
                onChange={(event) => updateField('abstract', event.target.value)}
                className="w-full border-2 border-neutral-400 bg-white p-3 h-32 text-sm text-neutral-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm mb-1 text-neutral-700">Research Category</div>
                <select
                  value={form.domain}
                  onChange={(event) => updateField('domain', event.target.value)}
                  className="w-full border-2 border-neutral-400 bg-white px-3 py-2 text-sm text-neutral-800"
                >
                  <option>Agro & Food Tech</option>
                  <option>Healthcare & Pharma</option>
                  <option>Chemicals & Life Sciences</option>
                  <option>Engineering & Eco Materials</option>
                  <option>CleanTech & Energy</option>
                  <option>Aerospace & Deep Tech</option>
                  <option>IoT & Electronics</option>
                </select>
              </div>
              <WireframeInput label="Technology Area" placeholder="e.g., mRNA Therapeutics" />
            </div>

            <KeywordMultiSelect
              value={form.keywords}
              onChange={(keywords) => updateField('keywords', keywords)}
              options={['AI', 'diagnostics', 'cancer', 'medical imaging', 'mRNA', 'immunotherapy', 'sustainability', 'IoT', 'energy storage']}
            />

            <div className="grid grid-cols-2 gap-4">
              <WireframeInput
                label="Publication Date"
                placeholder="YYYY-MM-DD"
                value={form.publicationDate}
                onChange={(value) => updateField('publicationDate', value)}
              />
              <WireframeInput
                label="Journal / Conference"
                placeholder="Journal name"
                value={form.journal}
                onChange={(value) => updateField('journal', value)}
              />
            </div>

            <div>
              <div className="text-sm mb-1 text-neutral-700">Co-Authors</div>
              <div className="space-y-2">
                <WireframeInput placeholder="Author name" />
                <WireframeButton label="+ Add Author" variant="ghost" size="sm" />
              </div>
            </div>

            <div className="flex justify-between gap-3 mt-6 pt-6 border-t-2 border-neutral-300">
              <WireframeButton label="Back" variant="ghost" onClick={() => setCurrentStep(1)} />
              <div className="flex gap-3">
                <WireframeButton label="Save Draft" variant="secondary" onClick={() => persistStudy('draft')} />
                <WireframeButton label="Next" variant="primary" onClick={() => setCurrentStep(3)} />
              </div>
            </div>
          </div>
        </WireframeCard>
      )}

      {currentStep === 3 && (
        <WireframeCard title="Step 3: AI-Powered Extraction">
          <div className="space-y-4">
            <div className="p-4 border-2 border-neutral-400 bg-neutral-50">
              <div className="text-sm text-neutral-700 mb-2">AI Analysis Progress</div>
              <div className="w-full h-2 bg-neutral-300 mb-2">
                <div className="w-3/4 h-2 bg-neutral-700"></div>
              </div>
              <div className="text-xs text-neutral-600">Analyzing document... 75% complete</div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-sm text-neutral-700 mb-2 flex justify-between">
                  <span>Commercial Readiness Score</span>
                  <span className="text-neutral-800">8.5/10</span>
                </div>
                <div className="w-full h-3 bg-neutral-300">
                  <div className="w-[85%] h-3 bg-neutral-700"></div>
                </div>
              </div>

              <div>
                <div className="text-sm text-neutral-700 mb-2">Key Innovations Detected</div>
                <div className="space-y-2">
                  <div className="border-2 border-neutral-300 p-3 bg-white">
                    <div className="text-sm text-neutral-800">Novel mRNA delivery mechanism</div>
                    <div className="text-xs text-neutral-500 mt-1">High commercial potential</div>
                  </div>
                  <div className="border-2 border-neutral-300 p-3 bg-white">
                    <div className="text-sm text-neutral-800">Cost-effective synthesis process</div>
                    <div className="text-xs text-neutral-500 mt-1">Manufacturing advantage</div>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-sm text-neutral-700 mb-2">Suggested Industry Sectors</div>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 border-2 border-neutral-400 bg-white text-xs">Pharmaceuticals</span>
                  <span className="px-3 py-1 border-2 border-neutral-400 bg-white text-xs">Biotechnology</span>
                  <span className="px-3 py-1 border-2 border-neutral-400 bg-white text-xs">Healthcare</span>
                </div>
              </div>

              <div>
                <div className="text-sm text-neutral-700 mb-2">Market Potential Analysis</div>
                <div className="border-2 border-neutral-400 p-4 bg-white text-sm text-neutral-600">
                  AI-generated market analysis summary... Target market size, competitive landscape, commercialization timeline...
                </div>
              </div>
            </div>

            <div className="flex justify-between gap-3 mt-6 pt-6 border-t-2 border-neutral-300">
              <WireframeButton label="Back" variant="ghost" onClick={() => setCurrentStep(2)} />
              <div className="flex gap-3">
                <WireframeButton label="Re-analyze" variant="secondary" />
                <WireframeButton label="Next" variant="primary" onClick={() => setCurrentStep(4)} />
              </div>
            </div>
          </div>
        </WireframeCard>
      )}

      {currentStep === 4 && (
        <WireframeCard title="Step 4: Review & Submit">
          <div className="space-y-6">
            <div className="p-4 border-2 border-neutral-400 bg-neutral-50">
              <div className="text-sm text-neutral-700 mb-2">✓ Review Complete</div>
              <div className="text-xs text-neutral-600">
                Your research is ready for submission. Please review the information below before submitting.
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-xs text-neutral-500 mb-1">Study Title</div>
                <div className="text-sm text-neutral-800">{form.title}</div>
              </div>
              <div>
                <div className="text-xs text-neutral-500 mb-1">Category</div>
                <div className="text-sm text-neutral-800">{form.domain}</div>
              </div>
              <div>
                <div className="text-xs text-neutral-500 mb-1">Commercial Readiness</div>
                <div className="text-sm text-neutral-800">8.5/10 - High potential</div>
              </div>
              <div>
                <div className="text-xs text-neutral-500 mb-1">Target Industries</div>
                <div className="text-sm text-neutral-800">Pharmaceuticals, Biotechnology, Healthcare</div>
              </div>
            </div>

            <div className="border-t-2 border-neutral-300 pt-4">
              <label className="flex items-start gap-2 text-sm text-neutral-600">
                  <input
                    type="checkbox"
                    checked={accepted}
                    onChange={(event) => setAccepted(event.target.checked)}
                    className="w-4 h-4 mt-0.5 border-2 border-neutral-400"
                  />
                <span>
                  I confirm that this research is original work and I have the right to submit it for commercialization
                </span>
              </label>
            </div>

            <div className="flex justify-between gap-3 mt-6 pt-6 border-t-2 border-neutral-300">
              <WireframeButton label="Back" variant="ghost" onClick={() => setCurrentStep(3)} />
              <div className="flex gap-3">
                <WireframeButton label="Save Draft" variant="secondary" onClick={() => persistStudy('draft')} />
                <WireframeButton
                  label="Submit for Review"
                  variant="primary"
                  disabled={!accepted || !form.title.trim()}
                  onClick={() => persistStudy('submitted')}
                />
              </div>
            </div>
          </div>
        </WireframeCard>
      )}

      {/* Help Panel */}
      <div className="mt-6 p-4 border-2 border-neutral-400 bg-white">
        <div className="text-sm text-neutral-700 mb-2">Need Help?</div>
        <div className="text-xs text-neutral-600 mb-3">
          Our AI copilot can assist you with the upload process
        </div>
        <WireframeButton label="Ask AI Copilot" variant="ghost" size="sm" onClick={() => navigate('/researcher/copilot')} />
      </div>
    </div>
  );
}
