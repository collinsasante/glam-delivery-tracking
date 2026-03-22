export type DeliveryStatus = "Pending" | "In Progress" | "Completed";
export type DeliveryPriority = "Normal" | "Urgent" | "Express";
export type Warehouse = "Pantang West" | "Amrahia";

export interface Delivery {
  id: string;
  deliveryId: string;
  orderId: string;
  customerName: string;
  customerPhone: string | null;
  dropoffLocation: string;
  dropoffCoordinates: { lat: number; lng: number } | null;
  assignedRiderId: string | null;
  assignedRiderName: string | null;
  warehouse: Warehouse;
  status: DeliveryStatus;
  priority: DeliveryPriority;
  createdAt: string;
  deliveryDate: string;
  pickupTime: string | null;
  deliveryTime: string | null;
  notes: string | null;
  distance: number | null;
}
