// Hand-written types for the tables in supabase/migrations/. Update them with
// every new migration. They must stay `type` aliases (not interfaces), because
// supabase-js checks them against Record<string, unknown>.
// Postgres `date` arrives as a 'YYYY-MM-DD' string, timestamptz as an ISO string.

export type ReservationStatus = "pending" | "confirmed" | "cancelled" | "blocked";
export type ReservationSource = "website" | "admin";

export type ApartmentRow = {
  id: string;
  slug: string;
  name: string;
  price_weekday: number;
  price_friday: number;
  price_saturday: number;
  max_guests: number;
  /** SECRET: never select it for anything that can reach the browser. */
  booking_ical_url: string | null;
  sort_order: number;
  created_at: string;
};

export type PriceOverrideRow = {
  apartment_id: string;
  /** The night that starts on this date. */
  date: string;
  price: number;
};

export type ReservationRow = {
  id: string;
  apartment_id: string;
  check_in: string;
  /** Exclusive: this night is free again. */
  check_out: string;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  guests: number | null;
  total_price: number | null;
  status: ReservationStatus;
  source: ReservationSource;
  created_at: string;
};

/** Columns that have a database default (or may be null) are optional on insert. */
type InsertOf<Row, Optional extends keyof Row> = Omit<Row, Optional> & Partial<Pick<Row, Optional>>;

export type Database = {
  public: {
    Tables: {
      apartments: {
        Row: ApartmentRow;
        Insert: InsertOf<ApartmentRow, "id" | "booking_ical_url" | "sort_order" | "created_at">;
        Update: Partial<ApartmentRow>;
        Relationships: [];
      };
      price_overrides: {
        Row: PriceOverrideRow;
        Insert: PriceOverrideRow;
        Update: Partial<PriceOverrideRow>;
        Relationships: [
          {
            foreignKeyName: "price_overrides_apartment_id_fkey";
            columns: ["apartment_id"];
            isOneToOne: false;
            referencedRelation: "apartments";
            referencedColumns: ["id"];
          },
        ];
      };
      reservations: {
        Row: ReservationRow;
        Insert: InsertOf<
          ReservationRow,
          | "id"
          | "guest_name"
          | "guest_email"
          | "guest_phone"
          | "guests"
          | "total_price"
          | "status"
          | "source"
          | "created_at"
        >;
        Update: Partial<ReservationRow>;
        Relationships: [
          {
            foreignKeyName: "reservations_apartment_id_fkey";
            columns: ["apartment_id"];
            isOneToOne: false;
            referencedRelation: "apartments";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      /** supabase/migrations/0002_unblock_nights.sql. p_to is exclusive; returns the freed nights. */
      unblock_nights: {
        Args: { p_apartment_id: string; p_from: string; p_to: string };
        Returns: number;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
