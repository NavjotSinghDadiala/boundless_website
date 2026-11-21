export interface TripSummary {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  totalSeats: number;
  totalJoined: number;
  isCompleted: boolean;
  images: string[];
}

export interface CoordinatorInfo {
  name: string;
  email?: string;
  phone?: string;
  assignedOption?: string | null;
}

export interface TripDetail {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  description: string;
  capacity: number;
  totalSeats: number;
  totalJoined: number;
  itinerary: Array<{ day?: string | number; title?: string; description?: string } | string>;
  importantInformation: string;
  thingsToCarry: string[];
  images: string[];
  isCompleted: boolean;
  coordinators: CoordinatorInfo[];
}

export interface ApprovedStudent {
  id: string;
  name: string;
  phone: string;
}

export interface Concern {
  id: string;
  studentName: string;
  studentPhone: string;
  concernText: string;
  coordinatorEmail: string;
  createdAt: string | null;
}

export interface DashboardStats {
  totalApproved: number;
  totalSeats: number;
  totalJoined: number;
  remainingSeats: number;
}

export type CoordinatorTab = "overview" | "students" | "concerns";

export interface TripEditFormState {
  destination: string;
  startDate: string;
  endDate: string;
  description: string;
  importantInformation: string;
  thingsToCarry: string[];
  newCarryItem: string;
}
