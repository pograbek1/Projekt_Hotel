import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Room } from '../models/types';
import { getRoomById, isRoomNumberTaken, upsertRoom } from '../storage/hotelStorage';

type Props = NativeStackScreenProps<RootStackParamList, 'RoomForm'>;

export default function RoomFormScreen({ route, navigation }: Props) {
    const editingRoomId = route.params?.roomId;

    const [number, setNumber] = useState<string>('');
    const [capacity, setCapacity] = useState<string>('2');
    const [pricePerNight, setPricePerNight] = useState<string>('150');
    const [loading, setLoading] = useState<boolean>(false);

    const isEditing = useMemo(() => Boolean(editingRoomId), [editingRoomId]);

    useEffect(() => {
        if (!editingRoomId) {
            navigation.setOptions({ title: 'Dodaj pokój'});
            return;
        }

        navigation.setOptions({ title: 'Edytuj pokój' });

        (async () => {
            setLoading(true);
            const room = await getRoomById(editingRoomId);
            if (!room) {
                setLoading(false);
                Alert.alert('Błąd', 'Nie znaleziono pokoju.');
                navigation.goBack();
                return;
            }

            setNumber(room.number);
            setCapacity(String(room.capacity));
            setPricePerNight(String(room.pricePerNight));
            setLoading(false);
        })();

    }, [editingRoomId, navigation]);

    async function onSave() {
        const num = number.trim();
        const cap = Number(capacity);
        const price = Number(pricePerNight);

        if (num.length === 0) {
            Alert.alert('Walidacja', 'Podaj numer pokoju.');
            return;
        }
        if (!Number.isFinite(cap) || cap <= 0) {
            Alert.alert('Walidacja', 'Liczba miejsc musi być większa od 0.');
            return;
        }
        if (!Number.isFinite(price) || price < 0) {
            Alert.alert('Walidacja', 'Cena za noc nie może być ujemna');
            return;
        }

        const taken = await isRoomNumberTaken(num, editingRoomId);
        if (taken) {
            Alert.alert('Walidacja', 'Taki numer pokoju już istnieje.');
            return;
        }

        const room: Room = {
            id: editingRoomId ?? String(Date.now()),
            number: num,
            capacity: cap,
            pricePerNight: price,
            status: 'FREE',
        };

        //Przy edycji nie chcemy resetować statusu na free:
        if (editingRoomId) {
            const existing = await getRoomById(editingRoomId);
            if (existing) room.status = existing.status;
        }

        await upsertRoom(room);
        navigation.goBack();
    }

    return (
        <KeyboardAvoidingView style={{ flex: 1}} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.container}>
                {loading ? <Text>Ładowanie...</Text> : null}

                <View style={styles.field}>
                    <Text style={styles.label}>Numer pokoju</Text>
                    <TextInput
                        value={number}
                        onChangeText={setNumber}
                        placeholder="np. 12"
                        style={styles.input}
                        autoCapitalize="none"
                    />
                </View>

                <View style={styles.field}>
                    <Text style={styles.label}>Liczba miejsc</Text>
                    <TextInput
                        value={capacity}
                        onChangeText={setCapacity}
                        placeholder="np. 2"
                        keyboardType="number-pad"
                        style={styles.input}
                    />
                </View>

                <View style={styles.field}>
                    <Text style={styles.label}>Cena za noc</Text>
                    <TextInput
                        value={pricePerNight}
                        onChangeText={setPricePerNight}
                        placeholder="np. 150"
                        keyboardType="numeric"
                        style={styles.input}
                    />
                </View>

                <View style={styles.buttons}>
                    <Button title={isEditing ? 'Zapisz zmiany' : 'Dodaj pokój'} onPress={onSave} />
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );

}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        gap: 12
    },
    field: {
        gap: 6
    },
    label: {
        fontSize: 14,
        fontWeight: '600'
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16
    },
    buttons: {
        marginTop: 8
    },
});