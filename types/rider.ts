export type RiderRole = "Admin" | "Rider";
export type VehicleType = "motor" | "car" | "bike";

export interface Rider {
  id: string;
  riderId: string;
  name: string;
  email: string;
  phone: string;
  role: RiderRole;
  vehicleType: VehicleType | null;
  active: boolean;
  joinedDate: string;
  photoUrl: string | null;
}

