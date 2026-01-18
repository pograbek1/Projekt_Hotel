export type RootStackParamList = {
    Home: undefined;
    RoomDetails: { roomId: string };
    RoomForm: { roomId?: string } | undefined;
    BookingForm: { roomId: string; bookingId?: string };
    Camera: { bookingId: string };
};