/**
 * Location Service
 * Provides Aria with location awareness for local search capabilities
 */

import * as Location from 'expo-location';
import api from '../utils/api';

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  neighborhood?: string;
  timestamp: number;
}

export interface LocationSearchResult {
  position: number;
  title: string;
  link: string;
  snippet: string;
  displayUrl?: string;
}

export interface WeatherData {
  temperature: number;
  feelsLike: number;
  humidity: number;
  precipitation: number;
  windSpeed: number;
  condition: string;
  code: number;
}

class LocationService {
  private currentLocation: UserLocation | null = null;
  private watchSubscription: Location.LocationSubscription | null = null;
  private permissionGranted: boolean = false;

  /**
   * Request location permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      this.permissionGranted = status === 'granted';
      return this.permissionGranted;
    } catch (error) {
      console.error('[LocationService] Permission error:', error);
      return false;
    }
  }

  /**
   * Check if permissions are granted
   */
  async hasPermissions(): Promise<boolean> {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      this.permissionGranted = status === 'granted';
      return this.permissionGranted;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get current location
   */
  async getCurrentLocation(): Promise<UserLocation | null> {
    try {
      if (!this.permissionGranted) {
        const granted = await this.requestPermissions();
        if (!granted) {
          console.log('[LocationService] Permission not granted');
          return null;
        }
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      this.currentLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || undefined,
        altitude: location.coords.altitude || undefined,
        timestamp: location.timestamp,
      };

      // Try to get city/state info from backend
      try {
        const geocodeResult = await this.reverseGeocode(
          this.currentLocation.latitude,
          this.currentLocation.longitude
        );
        if (geocodeResult) {
          this.currentLocation = { ...this.currentLocation, ...geocodeResult };
        }
      } catch (e) {
        // Geocoding failed, but we still have coordinates
      }

      return this.currentLocation;
    } catch (error) {
      console.error('[LocationService] Get location error:', error);
      return null;
    }
  }

  /**
   * Get cached location (no async call)
   */
  getCachedLocation(): UserLocation | null {
    return this.currentLocation;
  }

  /**
   * Start watching location updates
   */
  async startWatching(callback?: (location: UserLocation) => void): Promise<boolean> {
    try {
      if (!this.permissionGranted) {
        const granted = await this.requestPermissions();
        if (!granted) return false;
      }

      if (this.watchSubscription) {
        await this.stopWatching();
      }

      this.watchSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 60000, // Update every minute
          distanceInterval: 100, // Or every 100 meters
        },
        async (location) => {
          this.currentLocation = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy || undefined,
            timestamp: location.timestamp,
          };

          if (callback) {
            callback(this.currentLocation);
          }
        }
      );

      return true;
    } catch (error) {
      console.error('[LocationService] Watch error:', error);
      return false;
    }
  }

  /**
   * Stop watching location
   */
  async stopWatching(): Promise<void> {
    if (this.watchSubscription) {
      this.watchSubscription.remove();
      this.watchSubscription = null;
    }
  }

  /**
   * Reverse geocode coordinates to get city/state
   */
  async reverseGeocode(
    latitude: number,
    longitude: number
  ): Promise<Partial<UserLocation> | null> {
    try {
      const response = await api.post('/api/scraper/geocode', {
        latitude,
        longitude,
      });

      if (response.data.success) {
        const loc = response.data.location;
        return {
          city: loc.city,
          state: loc.state,
          country: loc.country,
          zipCode: loc.zipCode,
          neighborhood: loc.neighborhood,
        };
      }
      return null;
    } catch (error) {
      console.error('[LocationService] Geocode error:', error);
      return null;
    }
  }

  /**
   * Search based on location
   */
  async locationSearch(query: string): Promise<LocationSearchResult[]> {
    try {
      const location = this.currentLocation || (await this.getCurrentLocation());

      const response = await api.post('/api/scraper/location-search', {
        query,
        latitude: location?.latitude,
        longitude: location?.longitude,
      });

      if (response.data.success) {
        return response.data.results;
      }
      return [];
    } catch (error) {
      console.error('[LocationService] Search error:', error);
      return [];
    }
  }

  /**
   * Find nearby places
   */
  async findNearby(type?: string, keyword?: string): Promise<LocationSearchResult[]> {
    try {
      const location = this.currentLocation || (await this.getCurrentLocation());
      if (!location) {
        throw new Error('Location not available');
      }

      const response = await api.post('/api/scraper/nearby', {
        latitude: location.latitude,
        longitude: location.longitude,
        type,
        keyword,
      });

      if (response.data.success) {
        return response.data.results;
      }
      return [];
    } catch (error) {
      console.error('[LocationService] Nearby search error:', error);
      return [];
    }
  }

  /**
   * Get weather at current location
   */
  async getWeather(): Promise<WeatherData | null> {
    try {
      const location = this.currentLocation || (await this.getCurrentLocation());
      if (!location) {
        throw new Error('Location not available');
      }

      const response = await api.post('/api/scraper/weather', {
        latitude: location.latitude,
        longitude: location.longitude,
      });

      if (response.data.success) {
        return response.data.weather;
      }
      return null;
    } catch (error) {
      console.error('[LocationService] Weather error:', error);
      return null;
    }
  }

  /**
   * Get location for Aria context
   */
  getLocationForAria(): {
    latitude?: number;
    longitude?: number;
    city?: string;
    state?: string;
    country?: string;
  } | null {
    if (!this.currentLocation) return null;

    return {
      latitude: this.currentLocation.latitude,
      longitude: this.currentLocation.longitude,
      city: this.currentLocation.city,
      state: this.currentLocation.state,
      country: this.currentLocation.country,
    };
  }

  /**
   * Format location as string
   */
  getLocationString(): string {
    if (!this.currentLocation) return 'Location unavailable';

    if (this.currentLocation.city && this.currentLocation.state) {
      return `${this.currentLocation.city}, ${this.currentLocation.state}`;
    }

    return `${this.currentLocation.latitude.toFixed(4)}, ${this.currentLocation.longitude.toFixed(4)}`;
  }

  /**
   * Calculate distance between two points (in miles)
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}

// Export singleton instance
const locationService = new LocationService();
export default locationService;
