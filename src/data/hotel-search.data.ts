/**
 * Test data for the Hotels booking-search flow.
 * Kept separate from the spec so the same test can be re-run with different
 * data sets (e.g. different destinations, dates, guest mixes) without
 * touching test logic — just import a different object or add new ones here.
 */

export interface GuestSelection {
  adults: number;
  children: number;
  childAge?: number;
}

export interface DateRange {
  checkIn: string; // format: 'YYYY-MM-DD'
  checkOut: string; // format: 'YYYY-MM-DD'
}

export interface PriceRange {
  min: number;
  max: number; // "1000+" open-ended cap is represented as 1000
  isMaxOpenEnded: boolean;
}

export interface HotelSearchCriteria {
  category: string;
  location: string;
  dates: DateRange;
  guests: GuestSelection;
  filters: {
    priceRange: PriceRange;
    guestScore: string;
  };
}

export const miamiHotelSearch: HotelSearchCriteria = {
  category: 'Hotels',
  location: 'Miami',
  dates: {
    checkIn: '2026-08-01',
    checkOut: '2026-08-03',
  },
  guests: {
    adults: 1,
    children: 1,
    childAge: 8,
  },
  filters: {
    priceRange: {
      min: 100,
      max: 1000,
      isMaxOpenEnded: true,
    },
    guestScore: 'Very Good',
  },
};
