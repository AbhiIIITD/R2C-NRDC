import React, { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/contexts/AuthContext';
import { useAppData } from '@/contexts/AppDataContext';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Heart,
  FileText,
  Users,
  Award,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Calendar,
} from 'lucide-react';
import { normalizeLicenseStatus } from '@/app/config/licenseStatus';

export function IndustryDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    studies,
    getInterestsByIndustryUser,
    getMeetingsByIndustryUser,
    getLicenseRequestsByIndustryUser,
  } = useAppData();

  const userInterests = useMemo(() => {
    if (!user) return [];
    return getInterestsByIndustryUser(user.id);
  }, [user, getInterestsByIndustryUser]);

  const userMeetings = useMemo(() => {
    if (!user) return [];
    return getMeetingsByIndustryUser(user.id);
  }, [user, getMeetingsByIndustryUser]);

  const userLicenseRequests = useMemo(() => {
    if (!user) return [];
    return getLicenseRequestsByIndustryUser(user.id);
  }, [user, getLicenseRequestsByIndustryUser]);

  const kpis = {
    discoveries: studies.filter((s) => s.status === 'published').length,
    interests: userInterests.length,
    meetings: userMeetings.filter((m) => m.status === 'scheduled').length,
    licenses: userLicenseRequests.filter((lr) =>
      ['researcher_approved', 'agreement_generated', 'signed_submitted', 'agreement_executed', 'commercialized'].includes(normalizeLicenseStatus(lr.status))
    ).length,
  };

  const recentActivities = useMemo(() => {
    return userInterests.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    ).slice(0, 5);
  }, [userInterests]);

  const getInterestStatusColor = (status: string) => {
    switch (status) {
      case 'interested':
        return 'bg-blue-100 text-blue-800';
      case 'meeting_scheduled':
        return 'bg-purple-100 text-purple-800';
      case 'discussion_approved':
        return 'bg-green-100 text-green-800';
      case 'license_requested':
        return 'bg-orange-100 text-orange-800';
      case 'licensed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatInterestStatus = (status: string) => {
    if (status === 'interested') return 'Interest Submitted';
    if (status === 'meeting_scheduled') return 'Meeting Scheduled';
    if (status === 'discussion_approved') return 'Discussion Approved';
    return status.replace(/_/g, ' ').charAt(0).toUpperCase() + status.replace(/_/g, ' ').slice(1);
  };

  const getStudyTitle = (studyId: string) => {
    return studies.find((s) => s.id === studyId)?.title || 'Unknown Study';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Industry Dashboard" />
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome, {user?.name.split(' ')[0]}!
          </h1>
          <p className="text-gray-600">
            Discover innovative research studies and build partnerships with leading researchers.
          </p>
        </div>

        {/* KPIs Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Marketplace Discoveries */}
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-2">Available Studies</p>
                <h3 className="text-3xl font-bold text-gray-900">{kpis.discoveries}</h3>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              Published technologies ready for commercialization
            </p>
          </Card>

          {/* Interests Made */}
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-2">Interests Made</p>
                <h3 className="text-3xl font-bold text-gray-900">{kpis.interests}</h3>
              </div>
              <div className="bg-red-100 p-3 rounded-lg">
                <Heart className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              Studies you've expressed interest in
            </p>
          </Card>

          {/* Meetings Scheduled */}
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-2">Meetings Scheduled</p>
                <h3 className="text-3xl font-bold text-gray-900">{kpis.meetings}</h3>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              Scheduled meetings with researchers
            </p>
          </Card>

          {/* Licenses Approved */}
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-2">Licenses Approved</p>
                <h3 className="text-3xl font-bold text-gray-900">{kpis.licenses}</h3>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <Award className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              Technology licenses you've acquired
            </p>
          </Card>
        </div>

        {/* Quick Access Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Explore Marketplace */}
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Explore Marketplace
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  Discover cutting-edge research technologies available for licensing and partnerships.
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-600 flex-shrink-0" />
            </div>
            <Button
              onClick={() => navigate('/industry/marketplace')}
              className="bg-blue-600 hover:bg-blue-700 w-full text-black"
            >
              Browse Studies
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Card>

          {/* AI Copilot */}
          <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  AI Copilot Assistant
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  Get AI-powered insights on market trends, licensing strategies, and technology fit.
                </p>
              </div>
              <Sparkles className="w-8 h-8 text-purple-600 flex-shrink-0" />
            </div>
            <Button
              onClick={() => navigate('/industry/copilot')}
              className="bg-purple-600 hover:bg-purple-700 w-full text-black"
            >
              Start Chat
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Card>
        </div>

        {/* Recent Activities Section */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Recent Activity</h2>

          {recentActivities.length > 0 ? (
            <Card className="overflow-hidden">
              <div className="divide-y divide-gray-200">
                {recentActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/industry/marketplace`)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="font-medium text-gray-900">
                            {getStudyTitle(activity.studyId)}
                          </h4>
                          <Badge className={`${getInterestStatusColor(activity.status)} border-0`}>
                            {formatInterestStatus(activity.status)}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          Status: {formatInterestStatus(activity.status)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(activity.updatedAt).toLocaleDateString()} at{' '}
                          {new Date(activity.updatedAt).toLocaleTimeString()}
                        </p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    </div>
                  </div>
                ))}
              </div>

              {recentActivities.length < userInterests.length && (
                <div className="p-4 bg-gray-50 text-center">
                  <Button
                    variant="outline"
                    onClick={() => navigate('/industry/marketplace')}
                  >
                    View All Activities
                  </Button>
                </div>
              )}
            </Card>
          ) : (
            <Alert>
              <AlertDescription>
                You haven't expressed interest in any studies yet.{' '}
                <Button
                  variant="link"
                  className="p-0 h-auto"
                  onClick={() => navigate('/industry/marketplace')}
                >
                  Explore the marketplace
                </Button>
                {' '}to get started.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
}
