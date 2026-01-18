import AsyncStorage from '@react-native-async-storage/async-storage';
import { Room } from '../models/types';
import { RoomStatus } from '../models/types';

const ROOMS_KEY = 'rooms_v1';

export async function getRooms(): Promise<Room[]> {
    const raw = await AsyncStorage.getItem(ROOMS_KEY);
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed as Room[];
    } catch {
        //Jeśli dane w starage są uszkodzone,. nie blokujemy aplikacji
        return [];
    }
}

export async function saveRooms(rooms: Room[]): Promise<void> {
    await AsyncStorage.setItem(ROOMS_KEY, JSON.stringify(rooms));
}

export async function seedRoomsIfEmpty(): Promise<Room[]> {
    const current = await getRooms();
    if (current.length > 0) return current;

    const seeded: Room[] = [
        { id: '1', number: '1', capacity: 2, pricePerNight: 150, status: 'FREE' },
        { id: '2', number: '2', capacity: 3, pricePerNight: 180, status: 'FREE' },
        { id: '3', number: '3', capacity: 1, pricePerNight: 120, status: 'CLEANING' },
        { id: '4', number: '4', capacity: 2, pricePerNight: 160, status: 'OCCUPIED' },
        { id: '5', number: '5', capacity: 4, pricePerNight: 220, status: 'FREE' },
    ];

    await saveRooms(seeded);
    return seeded;
}

export async function upsertRoom(room: Room): Promise<void> {
    const rooms = await getRooms();
    const idx = rooms.findIndex(r => r.id === room.id);

    if (idx >= 0) rooms[idx] = room;
    else rooms.push(room);

    await saveRooms(rooms);
}

export async function deleteRoom(roomId: string): Promise<void> {
    const rooms = await getRooms();
    const filtered = rooms.filter(r => r.id !== roomId);
    await saveRooms(filtered);
}

export async function getRoomById(roomId: string): Promise<Room | null> {
    const rooms = await getRooms();
    return rooms.find(r => r.id === roomId) ?? null;
}

export async function isRoomNumberTaken(number: string, excludeRoomId?: string): Promise<boolean> {
    const rooms = await getRooms();
    const normalized = number.trim().toLowerCase();

    return rooms.some(r => {
        const sameNumber = r.number.trim().toLowerCase() === normalized;
        const notExcluded = excludeRoomId ? r.id !== excludeRoomId : true;
        return sameNumber && notExcluded;
    });
}

export async function updateRoomStatus(roomId: string, status: RoomStatus): Promise<void> {
    const rooms = await getRooms();
    const idx = rooms.findIndex(r => r.id === roomId);
    if (idx === -1) return;

    rooms[idx] = { ...rooms[idx], status };
    await saveRooms(rooms);
}

//Czyszczenie danych(demo)
export async function clearRooms(): Promise<void> {
    await AsyncStorage.removeItem(ROOMS_KEY);
}