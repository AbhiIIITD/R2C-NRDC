import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useAppData } from '@/contexts/AppDataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Search,
  Filter,
  ChevronRight,
  Zap,
  Beaker,
  TrendingUp,
} from 'lucide-react';
import { ResearchDomain } from '@/types/index';

export function Marketplace() {
  const navigate = useNavigate();
  const { studies } = useAppData();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<ResearchDomain | 'all'>('all');
  const [minReadiness, setMinReadiness] = useState(0);

  const publishedStudies = useMemo(() => {
    return studies.filter((s) => s.status === 'published');
  }, [studies]);

  const availableDomains = useMemo(() => {
    const domains = new Set(publishedStudies.map((s) => s.domain));
    return Array.from(domains).sort();
  }, [publishedStudies]);

  const filteredStudies = useMemo(() => {
    return publishedStudies.filter((study) => {
      if (selectedDomain !== 'all' && study.domain !== selectedDomain) {
        return false;
      }

      if (study.readinessScore && study.readinessScore < minReadiness) {
        return false;
      }

      if (searchTerm) {
        const lowerSearch = searchTerm.toLowerCase();
        return (
          study.title.toLowerCase().includes(lowerSearch) ||
          study.domain.toLowerCase().includes(lowerSearch) ||
          study.abstract.toLowerCase().includes(lowerSearch) ||
          study.keywords?.some((k) => k.toLowerCase().includes(lowerSearch))
        );
      }

      return true;
    });
  }, [publishedStudies, selectedDomain, minReadiness, searchTerm]);

  const getTRLColor = (trl: number) => {
    if (trl <= 3) return 'bg-red-100 text-red-800';
    if (trl <= 5) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getReadinessColor = (score: number | undefined) => {
    if (!score) return 'text-gray-600';
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Technology Marketplace</h1>
          <p className="text-gray-600">
            Discover and license innovative research technologies from leading institutions
          </p>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search Input */}
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Search by title, domain, keywords..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Domain Filter */}
            <div className="flex items-center gap-2">
              <Filter className="text-gray-400 w-5 h-5" />
              <select
                value={selectedDomain}
                onChange={(e) => setSelectedDomain(e.target.value as ResearchDomain | 'all')}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Domains</option>
                {availableDomains.map((domain) => (
                  <option key={domain} value={domain}>
                    {domain}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Readiness Score Filter */}
          <div className="mt-4">
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Minimum Readiness Score: {minReadiness}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={minReadiness}
              onChange={(e) => setMinReadiness(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>Early Stage</span>
              <span>Market Ready</span>
            </div>
          </div>

          {/* Results Count */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Showing <span className="font-semibold text-gray-900">{filteredStudies.length}</span> of{' '}
              <span className="font-semibold text-gray-900">{publishedStudies.length}</span> available technologies
            </p>
          </div>
        </div>

        {/* Studies Grid */}
        {filteredStudies.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStudies.map((study) => (
              <Card
                key={study.id}
                className="hover:shadow-xl transition-all cursor-pointer overflow-hidden hover:-translate-y-1"
                onClick={() => navigate(`/industry/technology/${study.id}`)}
              >
                <div className="p-6 flex flex-col h-full bg-white">
                  {/* Header */}
                  <div className="mb-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <Badge className="bg-blue-100 text-blue-800 border-0">Published</Badge>
                      <div className="flex gap-2">
                        <Badge className={`${getTRLColor(study.trl)} border-0`}>
                          TRL {study.trl}
                        </Badge>
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 mb-2">
                      {study.title}
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {study.abstract}
                    </p>
                  </div>

                  {/* Domain and Researcher */}
                  <div className="mb-4 pb-4 border-b border-gray-200 space-y-2">
                    <div className="flex items-center gap-2">
                      <Beaker className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{study.domain}</span>
                    </div>
                    <div className="text-xs text-gray-600">
                      <span className="font-medium text-gray-700">Researcher:</span> {study.researcherName}
                    </div>
                  </div>

                  {/* Readiness Score */}
                  {study.readinessScore && (
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">Readiness</span>
                        <span className={`text-sm font-bold ${getReadinessColor(study.readinessScore)}`}>
                          {study.readinessScore}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
                          style={{ width: `${study.readinessScore}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Market Size</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {study.marketSize || 'TBD'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">IP Status</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {study.ipStatus || 'Pending'}
                      </p>
                    </div>
                  </div>

                  {/* Keywords */}
                  {study.keywords && study.keywords.length > 0 && (
                    <div className="mb-4">
                      <div className="flex flex-wrap gap-2">
                        {study.keywords.slice(0, 3).map((keyword) => (
                          <span
                            key={keyword}
                            className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-md"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Footer - Action Button */}
                  <div className="mt-auto pt-4 border-t border-gray-200">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/industry/technology/${study.id}`);
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-black"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      View Details
                      <ChevronRight className="w-4 h-4 ml-auto" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Alert>
            <AlertDescription>
              No technologies found matching your criteria. Try adjusting your filters or search terms.
            </AlertDescription>
          </Alert>
        )}

        {/* Additional Info */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 text-center">
            <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Beaker className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Vetted Research</h3>
            <p className="text-sm text-gray-600">
              All technologies are reviewed and approved by expert evaluators
            </p>
          </Card>

          <Card className="p-6 text-center">
            <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Commercial Ready</h3>
            <p className="text-sm text-gray-600">
              Technologies with high readiness scores and clear commercialization paths
            </p>
          </Card>

          <Card className="p-6 text-center">
            <div className="bg-purple-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Zap className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Direct Access</h3>
            <p className="text-sm text-gray-600">
              Connect directly with researchers to discuss licensing and partnerships
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
