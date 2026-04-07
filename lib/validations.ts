import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const signUpSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const destinationSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  customerName: z.string().min(1, "Customer name is required"),
  customerPhone: z.string().optional(),
  dropoffLocation: z.string().min(1, "Dropoff location is required"),
  coordinates: z
    .object({ lat: z.number(), lng: z.number() })
    .nullable()
    .optional(),
  distanceKm: z.number().nullable().optional(),
});

export const createDeliverySchema = z.object({
  warehouse: z.enum(["Pantang West", "Amrahia"]),
  assignedRiderId: z.string().optional(),
  priority: z.enum(["Normal", "Urgent", "Express"]),
  deliveryDate: z.string().min(1, "Delivery date is required"),
  notes: z.string().optional(),
  destinations: z
    .array(destinationSchema)
    .min(1, "At least one destination is required")
    .max(10, "Maximum 10 destinations"),
});

export const createRiderSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
  role: z.enum(["Rider", "Admin"]),
  vehicleType: z.enum(["motor", "car", "bike"]).optional(),
  active: z.boolean().optional().default(true),
});

export const updateRiderSchema = createRiderSchema.extend({
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .optional()
    .or(z.literal("")),
});

export const createExpenseSchema = z.object({
  expenseType: z.string().min(1, "Expense type is required"),
  amount: z.number().positive("Amount must be positive"),
  description: z.string().optional(),
  date: z.string().min(1, "Date is required"),
  receiptUrl: z.string().optional(),
});

export const adminCreateExpenseSchema = createExpenseSchema.extend({
  riderId: z.string().min(1, "Rider is required"),
});
