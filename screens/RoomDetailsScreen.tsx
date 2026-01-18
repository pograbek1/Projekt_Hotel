import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, StyleSheet, Text, View, ScrollView, Image, Pressable } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';

import { RootStackParamList } from '../navigation/types';
import { Room, RoomStatus, Booking } from '../models/types'
import { getRoomById, updateRoomStatus } from '../storage/hotelStorage';
import { getActiveBookingForRoom } from '../storage/bookingStorage';
import { sendSms } from '../native/sms';
import { upsertBooking, deleteBooking } from '../storage/bookingStorage';
import { ensureAndroidChannel, ensureNotificationsPermission, scheduleCheckoutReminder, cancelNotification, isRunninginExpoGo } from '../native/notifications';
import PhotoViewerModal from '../components/PhotoViewerModal';
import StatusBadge from '../components/StatusBadge';
import { colors } from '../theme/colors';

if (isRunninginExpoGo()) {
    Alert.alert('Ograniczenie Expo Go', 'Powiadomienia w Expo Go mogą nie działąć poprawnie (SDK53). Uruchom aplikację jkako development build, aby przetestować powiadomienia');
}

type Props = NativeStackScreenProps<RootStackParamList, 'RoomDetails'>;

export default function RoomDetailsScreen({ route, navigation}: Props) {
    const { roomId } = route.params;
    const [room, setRoom ] = useState<Room | null>(null);
    const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerIndex, setViewerIndex] = useState(0);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const r = await getRoomById(roomId);
            if (!r) {
                setRoom(null);
                setActiveBooking(null);
            } else {
                setRoom(r);
                const b = await getActiveBookingForRoom(roomId);
                setActiveBooking(b);
            }
        } catch (e) {
            console.warn('RoomDetails load error:', e);
            setRoom(null);
            setActiveBooking(null);
        } finally {
            setLoading(false);
        }
    }, [roomId]);

    useEffect(() => {
        void load();
    }, [load]);

    useFocusEffect(
        useCallback(() => {
            void load();
        }, [load])
    );

    async function onChangeStatus(status: RoomStatus) {
        if (!room) return;

        try {
            await updateRoomStatus(room.id, status);
            await load();
        } catch (e) {
            console.warn('Update status error - RoomDetailsScreen', e);
            Alert.alert('Błąd', 'Nie udało się zmienić statusu pokoju.');
        }
    }

    function onEditRoom() {
        navigation.navigate('RoomForm', { roomId });
    }

    function onAddBooking() {
        navigation.navigate('BookingForm', { roomId });
    }

    async function onSendSms() {
        if (!activeBooking?.phone) {
            Alert.alert('Brak numeru', 'Ta rezerwacja nie ma przypisanego numeru telefonu');
            return;
        }

        //prosty szablon - pozniej edycja tresci i ustawienia
        const message =
            `Dzień dobry, potwierdzamy rezerwację pokoju ${room?.number ?? ''}. ` +
            `Termin: ${activeBooking.checkIn} - ${activeBooking.checkOut}. ` +
            `Kwota: ${activeBooking.totalAmount} z, Wpłacono: ${activeBooking.paidAmount} zł.`;

        try {
            await sendSms(activeBooking.phone, message);
            Alert.alert('OK', 'SMS wysłany');
        }
        catch (e: any) {
            const msg = e?.message;

            if (msg === 'SMS_NOT_AVAILABLE') {
                Alert.alert('SMS niedostepny', 'To urządzenie nie obsluguje wysyłania sms');
                return;
            }
            if (msg === 'SMS_NOT_SENT') {
                Alert.alert('Nie wysłano', 'SMS nie został wysłany (anulowano lub bład)');
                return;
            }

            console.warn('send sms error', e);
            Alert.alert('Bład', 'Nie udało się wysłać SMS');
        }
    }

    async function onScheduleCheckoutReminder() {
        if (!room || !activeBooking) {
            Alert.alert('Brak danych', 'Brak aktywnerj rezerwacji');
            return;
        }

        try {
            await ensureAndroidChannel();
            const ok = await ensureNotificationsPermission();
            if (!ok) {
                Alert.alert('Brak zgody', 'Powiadomienia są wyłączone - nmie można ustawić przypomnienia');
            }

            //jesli bylo wczesniej ustawione, anuluj stare
            if (activeBooking.checkoutNotificationId) {
                await cancelNotification(activeBooking.checkoutNotificationId);
            }

            const id = await scheduleCheckoutReminder({
                roomNumber: room.number,
                checkOutYmd: activeBooking.checkOut,
                hour: 10,
                minute: 0,
            });

            await upsertBooking({ ...activeBooking, checkoutNotificationId: id });
            Alert.alert('OK', 'Ustawiono przypomnienie o wymeldowaniu (10:00 w dniu czheck-out');
            await load();
        } catch (e: any) {
            const msg = e?.message;
            if (msg === 'TRIGGER_IN_PAST') {
                Alert.alert('Nie ustawiono', 'Data przypomnienia jest w przeszlosci');
                return;
            }
            console.warn('schedule reminder error', e);
            Alert.alert('Bład', 'Nie udało się ustawić przypomnienia');
        }
    }

    async function onDeleteActiveBooking() {
        if (!activeBooking) return;
        Alert.alert('Usuń rezerwację', 'Czy na pewno chcesz usunąć tę rezerwację? Tej operacji nie można cofnąć',
            [
                { text: 'Anuluj', style: 'cancel'},
                {
                    text: 'Usuń',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            //jeśli było przypomnienie - usun je
                            if (activeBooking.checkoutNotificationId) {
                                try {
                                    await cancelNotification(activeBooking.checkoutNotificationId);
                                } catch (e) {
                                    //nie blokuj operacji usuwania jesli anulowanie nie wyszlo
                                    console.warn('cancelNotification failed', e);
                                }
                            }
                            await deleteBooking(activeBooking.id);
                            Alert.alert('OK', 'Rezerwacja zostałą usunięta');
                            await load();
                        } catch (e) {
                            console.warn('delete booking error', e);
                            Alert.alert('Bład', 'Nie udało się usunąć rezerwacji');
                        }
                    },
                },
            ]
        );
    }

    async function onCancelCheckoutReminder() {
        if (!activeBooking?.checkoutNotificationId) return;
        try {
            await cancelNotification(activeBooking.checkoutNotificationId);
            await upsertBooking({ ...activeBooking, checkoutNotificationId: undefined });
            Alert.alert('OK', 'Usunieto przypomnienie');
            await load();
        } catch (e) {
            console.warn('cancel reminder error', e);
            Alert.alert('Blad', 'Nie udalo sie usunac przypomnienia');
        }
    }

    if (loading) {
        return (
            <View style={styles.container}>
                <Text>Ładowanie...</Text>
            </View>
        );
    }

    if (!room) {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>Nie znaleziono pokoju</Text>
                <Text style={styles.muted}>Pokój mógł zostać usunięty</Text>
                <View style={{ marginTop: 12 }}>
                    <Button title="Wróć" onPress={() => navigation.goBack()} />
                </View>
            </View>
        );
    }

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Pokój {room.number}</Text>

            <View style={styles.section}>
                <Text style={styles.row}>Miejsca: {room.capacity}</Text>
                <Text style={styles.row}>Cena/noc: {room.pricePerNight} zł</Text>
                <Text style={styles.row}>Status: 
                    <View style={{ marginTop: 6 }}>
                        <StatusBadge status={room.status} />    
                    </View>    
                </Text> 
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Akcje</Text>

                <View style={styles.buttonRow}>
                    <Button title="Edytuj pokój" onPress={onEditRoom} />
                </View>

                <View style={styles.buttonRow}>
                    <Button title="Dodaj rezerwację" onPress={onAddBooking} />
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Zmień status</Text>

                <View style={styles.statusRow}>
                    <View style={styles.statusBtn}>
                        <Button title="Wolny" onPress={() => onChangeStatus('FREE')} />
                    </View>
                    <View style={styles.statusBtn}>
                        <Button title="Zajęty" onPress={() => onChangeStatus('OCCUPIED')} />
                    </View>
                    <View style={styles.statusBtn}>
                        <Button title="Do sprzątania" onPress={() => onChangeStatus('CLEANING')} />
                    </View>
                </View>

                <View style={{ marginTop: 10 }}>
                    <Button
                        title="Wymeldowanie -> Do sprzątania"
                        onPress={() =>
                            Alert.alert(
                                'Wymeldowanie',
                                'Ustawić status pokoju na: "Do sprzątania">',
                                [
                                    { text: 'Anuluj', style: 'cancel' },
                                    { text: 'Tak', onPress: () => onChangeStatus('CLEANING') },
                                ]
                            )
                        }
                    />
                </View>

                <View style={{ marginTop: 10}}>
                    <Button
                        title="Posprzątane -> Wolny"
                        onPress={() => onChangeStatus('FREE')}
                    />
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Aktywna rezerwacja</Text>

                {!activeBooking ? (
                    <Text style={styles.muted}>Brak rezerwacji dla tego pokoju</Text>
                ) : (
                    <>
                        <Text style={styles.row}>Gość: {activeBooking.guestName}</Text>
                        <Text style={styles.row}>Telefon: {activeBooking.phone ?? '-'}</Text>
                        <Text style={styles.row}>Check-in: {activeBooking.checkIn.slice(0, 10)}</Text>
                        <Text style={styles.row}>Check-out: {activeBooking.checkOut.slice(0, 10)}</Text>

                        <Text style={[styles.row, { marginTop: 6 }]}>
                            Płatność: {paymentLabel(activeBooking.paidAmount, activeBooking.totalAmount)}
                        </Text>
                        <Text style={styles.muted}>
                            {activeBooking.paidAmount} / {activeBooking.totalAmount} zł
                        </Text>

                        {activeBooking.notes ? (
                            <Text style={[styles.muted, { marginTop: 6 }]}>
                                Notatki: {activeBooking.notes}
                            </Text>
                        ) : null}

                        {activeBooking.photoUris && activeBooking.photoUris.length > 0 ? (
                            <View style={{ marginTop: 10 }}>
                                <Text style={{ fontWeight: '700', marginBottom: 6 }}>Zdjęcia:</Text>

                                <View style={styles.thumbRow}>
                                    {activeBooking.photoUris.slice(0, 6).map((uri, idx) => 
                                    <Pressable
                                        key={uri}
                                        onPress={() => {
                                            setViewerIndex(idx);
                                            setViewerOpen(true);
                                        }}
                                        onLongPress={() => {
                                            Alert.alert('Usuń zdjęcie', 'Czy na pewno chcesz usunąć to zdjęcie z rezerwacji?',
                                                [
                                                    { text: 'Anuluj', style: 'cancel' },
                                                    {
                                                        text: 'Usuń',
                                                        style: 'destructive',
                                                        onPress: async () => {
                                                            if (!activeBooking) return;
                                                            const next = (activeBooking.photoUris ?? []).filter((x) => x !== uri);
                                                            await upsertBooking({ ...activeBooking, photoUris: next });
                                                            await load();
                                                        }
                                                    }
                                                ]
                                            )
                                        }}
                                        >
                                        <Image source={{ uri }} style={styles.thumb} />
                                    </Pressable>
                                    )}
                                </View>
                                {activeBooking.photoUris.length > 6 ? (
                                    <Text style={styles.muted}> i {activeBooking.photoUris.length - 6} więcej</Text>
                                ) : null}
                            </View>
                        ) : null}

                        <View style={{ marginTop: 10 }}>
                            <Button
                                title="Edytuj rezerwację"
                                onPress={() =>
                                    navigation.navigate('BookingForm', { roomId, bookingId: activeBooking.id})
                                }
                            />
                        </View>
                        {activeBooking.phone ? (
                            <View style={{ marginTop: 10 }}>
                                <Button title="Wyślij SMS do gościa" onPress={onSendSms} />
                            </View>
                        ) : null}

                        <View style={{ marginTop: 10 }}>
                            <Button title="Ustaw przypomnienie check-out" onPress={onScheduleCheckoutReminder} />
                        </View>
                        {activeBooking.checkoutNotificationId ? (
                            <View style={{ marginTop: 10 }}>
                                <Button title="Usuń przypomnienie check-out" onPress={onCancelCheckoutReminder} />
                            </View>
                        ) : null}

                        <View style={{ marginTop: 10 }}>
                            <Button title="Dodaj zdjęcie" onPress={(() => navigation.navigate('Camera', { bookingId: activeBooking.id }))} />
                        </View>

                        <View style={{ marginTop: 10 }}>
                            <Button title="Usuń rezerwacje" onPress={onDeleteActiveBooking} />
                        </View>
                    </>
                )}
                
            </View> 
            {activeBooking?.photoUris ? (
                <PhotoViewerModal
                    visible={viewerOpen}
                    uris={activeBooking.photoUris}
                    initialIndex={viewerIndex}
                    onClose={() => setViewerOpen(false)}
                />
            ) : null }
        </ScrollView>
    );

}

function mapStatus(status: Room['status']): string {
    switch (status) {
        case 'FREE':
            return 'Wolny';
        case 'OCCUPIED':
            return 'Zajęty';
        case 'CLEANING':
            return 'Do sprzątania';
    }
}

function paymentLabel(paid: number, total: number): string {
    if (total === 0) return 'Brak kwoty';
    if (paid <= 0) return 'Nieopłacone';
    if (paid >= total) return 'Opłacone';
    return 'Zaliczka';
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        gap: 12,
        backgroundColor: colors.bg
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        color: colors.text
    },
    muted: {
        color: colors.muted
    },
    section: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 14,
        padding: 14,
        gap: 6,
        backgroundColor: colors.bg
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '800',
        marginBottom: 4,
        color: colors.text
    },
    row: {
        fontSize: 16,
        color: colors.text
    },
    buttonRow: {
        marginTop: 6
    },
    statusRow: {
        gap: 8
    },
    statusBtn: {
        marginTop: 6
    },
    thumbRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8
    },
    thumb: {
        width: 72,
        height: 72,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#333'
    },
});