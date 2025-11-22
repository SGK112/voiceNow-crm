import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import api from '@/utils/api';

const ProfileContext = createContext();

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within ProfileProvider');
  }
  return context;
};

export const ProfileProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load profile data when user logs in
  useEffect(() => {
    const loadProfile = async () => {
      if (!isAuthenticated || !user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Check if user object already has profile data
        if (user.profile) {
          setProfile(user.profile);
          setLoading(false);
          return;
        }

        // Otherwise fetch from API
        const response = await api.get('/auth/profile');
        setProfile(response.data.profile);
      } catch (err) {
        console.error('Failed to load profile:', err);
        setError(err.response?.data?.message || 'Failed to load profile');
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [isAuthenticated, user]);

  // Update profile data
  const updateProfile = async (profileData) => {
    try {
      setError(null);
      const response = await api.put('/auth/profile', { profile: profileData });
      setProfile(response.data.profile);
      return { success: true, profile: response.data.profile };
    } catch (err) {
      console.error('Failed to update profile:', err);
      const errorMessage = err.response?.data?.message || 'Failed to update profile';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Refresh profile from server
  const refreshProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/auth/profile');
      setProfile(response.data.profile);
      return response.data.profile;
    } catch (err) {
      console.error('Failed to refresh profile:', err);
      setError(err.response?.data?.message || 'Failed to refresh profile');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get specific profile field with fallback
  const getProfileField = (field, fallback = '') => {
    if (!profile) return fallback;
    return profile[field] || fallback;
  };

  // Helper to check if onboarding is completed
  const isOnboardingComplete = () => {
    return profile?.onboardingCompleted || false;
  };

  // Helper to get business context for AI
  const getBusinessContext = () => {
    if (!profile) return '';

    const context = [];

    if (profile.businessName) {
      context.push(`Business: ${profile.businessName}`);
    }

    if (profile.industry) {
      context.push(`Industry: ${profile.industry}`);
    }

    if (profile.businessSize) {
      context.push(`Company Size: ${profile.businessSize}`);
    }

    if (profile.companyDescription) {
      context.push(`Description: ${profile.companyDescription}`);
    }

    if (profile.valueProposition) {
      context.push(`Value Proposition: ${profile.valueProposition}`);
    }

    return context.join('\n');
  };

  // Helper to get brand voice for AI
  const getBrandVoice = () => {
    if (!profile?.brandVoice) return 'Professional';
    return profile.brandVoice;
  };

  // Helper to get AI instructions
  const getAIInstructions = () => {
    if (!profile?.aiInstructions) return '';
    return profile.aiInstructions;
  };

  // Helper to get custom variables
  const getCustomVariable = (key, fallback = '') => {
    if (!profile?.customVariables) return fallback;
    return profile.customVariables.get?.(key) || profile.customVariables[key] || fallback;
  };

  // Helper to get full AI context (business + voice + instructions)
  const getFullAIContext = () => {
    const parts = [];

    const businessContext = getBusinessContext();
    if (businessContext) {
      parts.push('BUSINESS CONTEXT:', businessContext);
    }

    const brandVoice = getBrandVoice();
    parts.push(`\nBRAND VOICE: ${brandVoice}`);

    const aiInstructions = getAIInstructions();
    if (aiInstructions) {
      parts.push('\nCUSTOM INSTRUCTIONS:', aiInstructions);
    }

    return parts.join('\n');
  };

  // Helper to get contact info
  const getContactInfo = () => {
    if (!profile) return null;

    return {
      firstName: profile.firstName || '',
      lastName: profile.lastName || '',
      email: user?.email || '',
      phone: profile.phone || '',
      fullName: `${profile.firstName || ''} ${profile.lastName || ''}`.trim(),
    };
  };

  // Helper to get location
  const getLocation = () => {
    if (!profile) return null;

    return {
      address: profile.address || '',
      city: profile.city || '',
      state: profile.state || '',
      zipCode: profile.zipCode || '',
      country: profile.country || '',
      timezone: profile.timezone || '',
      fullAddress: [
        profile.address,
        profile.city,
        profile.state,
        profile.zipCode,
        profile.country
      ].filter(Boolean).join(', '),
    };
  };

  const value = {
    profile,
    loading,
    error,
    updateProfile,
    refreshProfile,

    // Helper functions
    getProfileField,
    isOnboardingComplete,
    getBusinessContext,
    getBrandVoice,
    getAIInstructions,
    getCustomVariable,
    getFullAIContext,
    getContactInfo,
    getLocation,
  };

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
};
