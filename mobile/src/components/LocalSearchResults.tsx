import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SearchResult {
  rank: number;
  placeId: string;
  name: string;
  address: string;
  rating: number | null;
  totalRatings: number;
  priceLevel: string | null;
  isOpen: boolean | null;
  distance: string | null;
  distanceMiles: number | null;
  types: string[];
  location: { lat: number; lng: number } | null;
}

interface PlaceDetails {
  placeId: string;
  name: string;
  address: string;
  phone: string | null;
  website: string | null;
  googleMapsUrl: string | null;
  rating: number | null;
  totalRatings: number;
  priceLevel: string | null;
  isOpen: boolean | null;
  hours: string[] | null;
  status: string;
  reviews: Array<{
    author: string;
    rating: number;
    text: string;
    timeAgo: string;
  }> | null;
}

interface Directions {
  origin: string;
  destination: string;
  distance: string;
  duration: string;
  steps: Array<{
    instruction: string;
    distance: string;
    duration: string;
  }>;
  googleMapsUrl: string;
}

interface UIAction {
  type: 'local_search_results' | 'place_details' | 'directions';
  data: {
    query?: string;
    results?: SearchResult[];
    details?: PlaceDetails;
    directions?: Directions;
  };
}

interface LocalSearchResultsProps {
  uiAction: UIAction;
  onClose?: () => void;
  onSelectPlace?: (placeId: string) => void;
}

const LocalSearchResults: React.FC<LocalSearchResultsProps> = ({
  uiAction,
  onClose,
  onSelectPlace,
}) => {
  // Extract type and data from uiAction
  const type = uiAction?.type;
  const data = uiAction?.data || {};
  // Open in Google Maps app or browser
  const openInMaps = (address: string, lat?: number, lng?: number) => {
    let url = '';
    if (lat && lng) {
      url = Platform.select({
        ios: `maps:?q=${encodeURIComponent(address)}&ll=${lat},${lng}`,
        android: `geo:${lat},${lng}?q=${encodeURIComponent(address)}`,
        default: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
      }) || '';
    } else {
      url = Platform.select({
        ios: `maps:?q=${encodeURIComponent(address)}`,
        android: `geo:0,0?q=${encodeURIComponent(address)}`,
        default: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
      }) || '';
    }
    Linking.openURL(url);
  };

  // Call phone number
  const callPhone = (phone: string) => {
    Linking.openURL(`tel:${phone.replace(/\D/g, '')}`);
  };

  // Open website
  const openWebsite = (url: string) => {
    Linking.openURL(url);
  };

  // Render star rating
  const renderStars = (rating: number | null) => {
    if (!rating) return null;
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;

    return (
      <View style={styles.starsContainer}>
        {[...Array(fullStars)].map((_, i) => (
          <Ionicons key={`full-${i}`} name="star" size={14} color="#f59e0b" />
        ))}
        {hasHalf && <Ionicons name="star-half" size={14} color="#f59e0b" />}
        <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
      </View>
    );
  };

  // Render local search results
  const renderSearchResults = () => {
    const results = data.results || [];

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="location" size={20} color="#3b82f6" />
            <Text style={styles.headerTitle}>
              {data.query ? `"${data.query}"` : 'Local Results'}
            </Text>
          </View>
          <Text style={styles.resultCount}>{results.length} found</Text>
        </View>

        <ScrollView style={styles.resultsList} showsVerticalScrollIndicator={false}>
          {results.map((result, index) => (
            <TouchableOpacity
              key={result.placeId || index}
              style={styles.resultCard}
              onPress={() => onSelectPlace?.(result.placeId)}
              activeOpacity={0.7}
            >
              <View style={styles.resultMain}>
                <View style={styles.resultHeader}>
                  <Text style={styles.resultName} numberOfLines={1}>
                    {result.name}
                  </Text>
                  {result.isOpen !== null && (
                    <View style={[
                      styles.openBadge,
                      { backgroundColor: result.isOpen ? '#10b98120' : '#ef444420' }
                    ]}>
                      <Text style={[
                        styles.openBadgeText,
                        { color: result.isOpen ? '#10b981' : '#ef4444' }
                      ]}>
                        {result.isOpen ? 'Open' : 'Closed'}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.resultMeta}>
                  {renderStars(result.rating)}
                  {result.totalRatings > 0 && (
                    <Text style={styles.reviewCount}>({result.totalRatings})</Text>
                  )}
                  {result.priceLevel && (
                    <Text style={styles.priceLevel}>{result.priceLevel}</Text>
                  )}
                </View>

                <Text style={styles.resultAddress} numberOfLines={2}>
                  {result.address}
                </Text>

                {result.distance && (
                  <View style={styles.distanceRow}>
                    <Ionicons name="navigate-outline" size={14} color="#6b7280" />
                    <Text style={styles.distanceText}>{result.distance}</Text>
                  </View>
                )}
              </View>

              <View style={styles.resultActions}>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => openInMaps(
                    result.address,
                    result.location?.lat,
                    result.location?.lng
                  )}
                >
                  <Ionicons name="navigate" size={20} color="#3b82f6" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  // Render place details
  const renderPlaceDetails = () => {
    const details = data.details;
    if (!details) return null;

    return (
      <View style={styles.container}>
        <View style={styles.detailsHeader}>
          <Text style={styles.detailsName}>{details.name}</Text>
          {details.isOpen !== null && (
            <View style={[
              styles.openBadge,
              { backgroundColor: details.isOpen ? '#10b98120' : '#ef444420' }
            ]}>
              <Text style={[
                styles.openBadgeText,
                { color: details.isOpen ? '#10b981' : '#ef4444' }
              ]}>
                {details.isOpen ? 'Open Now' : 'Closed'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.detailsMeta}>
          {renderStars(details.rating)}
          {details.totalRatings > 0 && (
            <Text style={styles.reviewCount}>({details.totalRatings} reviews)</Text>
          )}
          {details.priceLevel && (
            <Text style={styles.priceLevel}>{details.priceLevel}</Text>
          )}
        </View>

        <ScrollView style={styles.detailsContent} showsVerticalScrollIndicator={false}>
          {/* Address */}
          <TouchableOpacity
            style={styles.detailRow}
            onPress={() => openInMaps(details.address)}
          >
            <Ionicons name="location-outline" size={20} color="#6b7280" />
            <Text style={styles.detailText}>{details.address}</Text>
            <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
          </TouchableOpacity>

          {/* Phone */}
          {details.phone && (
            <TouchableOpacity
              style={styles.detailRow}
              onPress={() => callPhone(details.phone!)}
            >
              <Ionicons name="call-outline" size={20} color="#6b7280" />
              <Text style={styles.detailText}>{details.phone}</Text>
              <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
            </TouchableOpacity>
          )}

          {/* Website */}
          {details.website && (
            <TouchableOpacity
              style={styles.detailRow}
              onPress={() => openWebsite(details.website!)}
            >
              <Ionicons name="globe-outline" size={20} color="#6b7280" />
              <Text style={styles.detailText} numberOfLines={1}>
                {details.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
              </Text>
              <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
            </TouchableOpacity>
          )}

          {/* Hours */}
          {details.hours && details.hours.length > 0 && (
            <View style={styles.hoursSection}>
              <View style={styles.hoursSectionHeader}>
                <Ionicons name="time-outline" size={20} color="#6b7280" />
                <Text style={styles.hoursSectionTitle}>Hours</Text>
              </View>
              {details.hours.map((hour, idx) => (
                <Text key={idx} style={styles.hoursText}>{hour}</Text>
              ))}
            </View>
          )}

          {/* Reviews */}
          {details.reviews && details.reviews.length > 0 && (
            <View style={styles.reviewsSection}>
              <Text style={styles.reviewsSectionTitle}>Recent Reviews</Text>
              {details.reviews.map((review, idx) => (
                <View key={idx} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewAuthor}>{review.author}</Text>
                    <View style={styles.reviewRating}>
                      {[...Array(review.rating)].map((_, i) => (
                        <Ionicons key={i} name="star" size={12} color="#f59e0b" />
                      ))}
                    </View>
                  </View>
                  <Text style={styles.reviewText} numberOfLines={3}>
                    {review.text}
                  </Text>
                  <Text style={styles.reviewTime}>{review.timeAgo}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Action buttons */}
        <View style={styles.detailsActions}>
          {details.phone && (
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonPrimary]}
              onPress={() => callPhone(details.phone!)}
            >
              <Ionicons name="call" size={18} color="#fff" />
              <Text style={styles.actionButtonTextPrimary}>Call</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => openInMaps(details.address)}
          >
            <Ionicons name="navigate" size={18} color="#3b82f6" />
            <Text style={styles.actionButtonText}>Directions</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Render directions
  const renderDirections = () => {
    const directions = data.directions;
    if (!directions) return null;

    return (
      <View style={styles.container}>
        <View style={styles.directionsHeader}>
          <Ionicons name="navigate" size={24} color="#3b82f6" />
          <View style={styles.directionsInfo}>
            <Text style={styles.directionsDuration}>{directions.duration}</Text>
            <Text style={styles.directionsDistance}>{directions.distance}</Text>
          </View>
        </View>

        <View style={styles.directionsRoute}>
          <View style={styles.routePoint}>
            <View style={styles.routePointDot} />
            <Text style={styles.routePointText} numberOfLines={1}>
              {directions.origin}
            </Text>
          </View>
          <View style={styles.routeLine} />
          <View style={styles.routePoint}>
            <View style={[styles.routePointDot, styles.routePointDotEnd]} />
            <Text style={styles.routePointText} numberOfLines={1}>
              {directions.destination}
            </Text>
          </View>
        </View>

        <ScrollView style={styles.stepsList} showsVerticalScrollIndicator={false}>
          {directions.steps.map((step, idx) => (
            <View key={idx} style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{idx + 1}</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepInstruction}>{step.instruction}</Text>
                <Text style={styles.stepMeta}>
                  {step.distance} · {step.duration}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>

        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonPrimary, styles.actionButtonFull]}
          onPress={() => Linking.openURL(directions.googleMapsUrl)}
        >
          <Ionicons name="map" size={18} color="#fff" />
          <Text style={styles.actionButtonTextPrimary}>Open in Maps</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Render based on type
  switch (type) {
    case 'local_search_results':
      return renderSearchResults();
    case 'place_details':
      return renderPlaceDetails();
    case 'directions':
      return renderDirections();
    default:
      return null;
  }
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginTop: 8,
    marginHorizontal: 4,
    overflow: 'hidden',
    maxHeight: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  resultCount: {
    fontSize: 13,
    color: '#6b7280',
  },
  resultsList: {
    maxHeight: 340,
  },
  resultCard: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  resultMain: {
    flex: 1,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  resultName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  openBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  openBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  resultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    marginLeft: 4,
  },
  reviewCount: {
    fontSize: 12,
    color: '#6b7280',
  },
  priceLevel: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
  },
  resultAddress: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  distanceText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#3b82f6',
  },
  resultActions: {
    justifyContent: 'center',
    paddingLeft: 12,
  },
  actionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Details styles
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  detailsName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    flex: 1,
  },
  detailsMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  detailsContent: {
    maxHeight: 260,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 12,
  },
  detailText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  hoursSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  hoursSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  hoursSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  hoursText: {
    fontSize: 13,
    color: '#6b7280',
    marginLeft: 32,
    marginBottom: 2,
  },
  reviewsSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  reviewsSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  reviewCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  reviewAuthor: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  reviewRating: {
    flexDirection: 'row',
  },
  reviewText: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  reviewTime: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 6,
  },
  detailsActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
  },
  actionButtonPrimary: {
    backgroundColor: '#3b82f6',
  },
  actionButtonFull: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  actionButtonTextPrimary: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  // Directions styles
  directionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  directionsInfo: {
    flex: 1,
  },
  directionsDuration: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  directionsDistance: {
    fontSize: 14,
    color: '#6b7280',
  },
  directionsRoute: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  routePointDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3b82f6',
  },
  routePointDotEnd: {
    backgroundColor: '#ef4444',
  },
  routeLine: {
    width: 2,
    height: 24,
    backgroundColor: '#e5e7eb',
    marginLeft: 5,
    marginVertical: 4,
  },
  routePointText: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
  },
  stepsList: {
    maxHeight: 200,
    paddingHorizontal: 16,
  },
  stepItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  stepContent: {
    flex: 1,
  },
  stepInstruction: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  stepMeta: {
    fontSize: 12,
    color: '#9ca3af',
  },
});

export default LocalSearchResults;
