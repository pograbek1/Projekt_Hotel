import AsyncStorage from '@react-native-async-storage/async-storage';
import { Booking } from '../models/types';

const BOOKINGS_KEY = 'bookings_v1';

export async function getBookings(): Promise<Booking[]> {
    const raw = await AsyncStorage.getItem(BOOKINGS_KEY);
    if (!raw) return [];

    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed as Booking[];
    } catch {
        return [];
    }
}

export async function saveBookings(bookings: Booking[]): Promise<void> {
    await AsyncStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
}

export async function getBookingById(bookingId: string): Promise<Booking | null> {
    const list = await getBookings();
    return list.find(b => b.id === bookingId) ?? null
}

export async function getActiveBookingForRoom(roomId: string): Promise<Booking | null> {
    //"Aktywna" = najnowsza rezerwacja dla pokoju
    //Póżniej można rozszerzyć o logikę dat i etc..
    const list = await getBookings();
    const roomBookings = list.filter(b => b.roomId === roomId);
    if (roomBookings.length === 0) return null;

    roomBookings.sort((a, b) => Number(b.id) - Number(a.id)); // id = Date.now()
    return roomBookings[0] ?? null;
}

export async function upsertBooking(booking: Booking): Promise<void> {
    const list = await getBookings();
    const idx = list.findIndex(b => b.id === booking.id);

    if (idx >= 0) list[idx] = booking;
    else list.push(booking);

    await saveBookings(list);
}
// Usuwanie rezerwacji
export async function deleteBooking(bookingId: string): Promise<void> {
    const list = await getBookings();
    await saveBookings(list.filter(b => b.id !== bookingId));
}

//Czyszczenie danych(demo)
export async function clearBookings(): Promise<void> {
    await AsyncStorage.removeItem(BOOKINGS_KEY);
}