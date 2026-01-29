
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Hotel, ItineraryPackage, Vehicle, Sightseeing, RoomType } from '../types';

interface ItineraryData {
  hotelData: Record<string, Hotel[]>;
  sightseeingData: Record<string, Sightseeing[]>;
  vehicleData: Vehicle[];
  packages: ItineraryPackage[];
  loading: boolean;
  error: string | null;
}

export const useItineraryData = (destinationSlug: string = 'kutch') => {
  const [data, setData] = useState<ItineraryData>({
    hotelData: {},
    sightseeingData: {},
    vehicleData: [],
    packages: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setData(prev => ({ ...prev, loading: true }));

        // 1. Fetch Hotels with Room Types and Location Name
        // Assumes schema: hotels -> locations (name), hotels -> room_types (*)
        const { data: hotelsRaw, error: hotelError } = await supabase
          .from('hotels')
          .select(`
            id, name, type, tier, image_url,
            locations!inner (name),
            room_types (name, capacity, rate)
          `);

        if (hotelError) throw hotelError;

        // 2. Fetch Sightseeing
        const { data: sightsRaw, error: sightError } = await supabase
          .from('sightseeing')
          .select(`
            id, name, description, image_url,
            locations!inner (name)
          `);

        if (sightError) throw sightError;

        // 3. Fetch Vehicles
        const { data: vehiclesRaw, error: vehicleError } = await supabase
          .from('vehicles')
          .select('*');

        if (vehicleError) throw vehicleError;

        // 4. Fetch Packages
        const { data: packagesRaw, error: packageError } = await supabase
          .from('packages')
          .select('*');

        if (packageError) throw packageError;

        // --- TRANSFORMATIONS ---

        // Transform Hotels: Group by City Name
        const hotelData: Record<string, Hotel[]> = {};
        hotelsRaw?.forEach((h: any) => {
          const city = h.locations?.name || 'Unknown';
          if (!hotelData[city]) hotelData[city] = [];

          hotelData[city].push({
            name: h.name,
            rate: 0, // Base rate not strictly needed if we have roomTypes, but good for fallback
            type: h.type,
            tier: h.tier,
            img: h.image_url,
            roomTypes: h.room_types.map((rt: any) => ({
              name: rt.name,
              capacity: rt.capacity,
              rate: rt.rate
            }))
          });
        });

        // Transform Sightseeing: Group by City Name
        const sightseeingData: Record<string, Sightseeing[]> = {};
        sightsRaw?.forEach((s: any) => {
          const city = s.locations?.name || 'Unknown';
          if (!sightseeingData[city]) sightseeingData[city] = [];

          sightseeingData[city].push({
            name: s.name,
            desc: s.description,
            img: s.image_url
          });
        });

        // Transform Vehicles
        const vehicleData: Vehicle[] = vehiclesRaw?.map((v: any) => ({
          name: v.name,
          rate: v.rate,
          capacity: v.capacity,
          img: v.image_url
        })) || [];

        // Transform Packages
        const packages: ItineraryPackage[] = packagesRaw?.map((p: any) => ({
          id: p.id,
          name: p.name,
          img: p.image_url,
          days: p.days,
          // Ensure route is parsed if it comes as a JSON string, or used directly if JSONB
          route: typeof p.route === 'string' ? JSON.parse(p.route) : p.route
        })) || [];

        setData({
          hotelData,
          sightseeingData,
          vehicleData,
          packages,
          loading: false,
          error: null
        });

      } catch (err: any) {
        console.error('Error fetching itinerary data:', err);
        setData(prev => ({ ...prev, loading: false, error: err.message }));
      }
    };

    fetchData();
  }, [destinationSlug]);

  return data;
};
