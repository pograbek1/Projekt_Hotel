export type RoomStatus = 'FREE' | 'OCCUPIED' | 'CLEANING';

export interface Room {
    id: string;
    number: string;
    capacity: number;
    pricePerNight: number;
    status: RoomStatus;
}

export interface Booking {
    id: string;
    roomId: string;
    guestName: string;
    phone?: string;
    checkIn: string; // ISO string
    checkOut: string; // ISO string
    totalAmount: number;
    paidAmount: number;
    notes?: string;
    photoUris?: string[];
    checkoutNotificationId?: string;
}