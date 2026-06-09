import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/contexts/AuthContext';
import { useAppData } from '@/contexts/AppDataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Search, Filter, ChevronRight, Plus } from 'lucide-react';
import { StudyStatus, TRLLevel } from '@/types/index';

export function MyStudies() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getStudiesByResearcher } = useAppData();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<StudyStatus | 'all'>('all');

  const allStudies = useMemo(() => {
    if (!user) return [];
    return getStudiesByResearcher(user.id);
  }, [user, getStudiesByResearcher]);

  const filteredStudies = useMemo(() => {
    return allStudies.filter((study) => {
      if (selectedStatus !== 'all' && study.status !== selectedStatus) {
        return false;
      }
      if (searchTerm) {
        const lowerSearch = searchTerm.toLowerCase();
        return (
          study.title.toLowerCase().includes(lowerSearch) ||
          study.domain.toLowerCase().includes(lowerSearch) ||
          study.keywords?.some(k => k.toLowerCase().includes(lowerSearch))
        );
      }
      return true;
    });
  }, [allStudies, selectedStatus, searchTerm]);

  const getStatusColor = (status: StudyStatus) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'submitted':
        return 'bg-blue-100 text-blue-800';
      case 'under_review':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'published':
        return 'bg-emerald-100 text-emerald-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatStatus = (status: StudyStatus) => {
    return status.replace(/_/g, ' ').charAt(0).toUpperCase() + status.replace(/_/g, ' ').slice(1);
  };

  if (allStudies.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="flex flex-col items-center justify-center py-16">
            <Upload className="w-16 h-16 text-gray-300 mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">No Studies Yet</h2>
            <p className="text-gray-600 text-center max-w-md mb-6">
              You haven't uploaded any research studies yet. Start by uploading your first research study to get started.
            </p>
            <Button
              onClick={() => navigate('/researcher/upload')}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Upload Research Study
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Studies</h1>
            <p className="text-gray-600 mt-1">
              {filteredStudies.length} of {allStudies.length} studies
            </p>
          </div>
          <Button
            onClick={() => navigate('/researcher/upload')}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Study
          </Button>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Search studies by title, domain..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="text-gray-400 w-5 h-5" />
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as StudyStatus | 'all')}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="under_review">Under Review</option>
                <option value="approved">Approved</option>
                <option value="published">Published</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {filteredStudies.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStudies.map((study) => (
              <Card
                key={study.id}
                className="hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
                onClick={() => navigate(`/researcher/studies/${study.id}`)}
              >
                <div className="p-6 flex flex-col h-full">
                  <div className="mb-3">
                    <Badge className={`${getStatusColor(study.status)} border-0`}>
                      {formatStatus(study.status)}
                    </Badge>
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                    {study.title}
                  </h3>

                  <div className="mb-4 space-y-2">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium text-gray-700">Domain:</span> {study.domain}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium text-gray-700">TRL:</span> Level {study.trl}
                    </p>
                  </div>

                  {study.readinessScore && (
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">Readiness Score</span>
                        <span className="text-sm font-bold text-gray-900">{study.readinessScore}%</span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${study.readinessScore}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {study.keywords && study.keywords.length > 0 && (
                    <div className="mb-4">
                      <div className="flex flex-wrap gap-2">
                        {study.keywords.slice(0, 3).map((keyword) => (
                          <span
                            key={keyword}
                            className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                          >
                            {keyword}
                          </span>
                        ))}
                        {study.keywords.length > 3 && (
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                            +{study.keywords.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="mt-auto pt-4 border-t border-gray-200 flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {new Date(study.updatedAt).toLocaleDateString()}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Alert>
            <AlertDescription>
              No studies found matching your filters. Try adjusting your search or status filter.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
