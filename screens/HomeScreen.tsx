import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, FlatList, Pressable, RefreshControl } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { Room } from '../models/types';
import { seedRoomsIfEmpty, getRooms } from '../storage/hotelStorage';
import RoomCard from '../components/RoomCard';
import { colors } from '@/theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);

    const loadInitial = useCallback(async () => {
        setLoading(true);
        try {
            const seededOrExisting = await seedRoomsIfEmpty();
            setRooms(seededOrExisting);
        } catch (e) {
            console.warn('loadInitial error', e);
            setRooms([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadFresh = useCallback(async () => {
        try {
            const list = await getRooms();
            setRooms(list);
        } catch (e) {
            console.warn('loadFresh error', e);
            setRooms([]);
        }
    }, []);

    useEffect(() => {
        void loadInitial();
    }, [loadInitial]);

    useFocusEffect(
        useCallback(() => {
            // odpali się przy powrocie na ekran
            void loadFresh();
        }, [loadFresh])
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadFresh();
        setRefreshing(false);
    }, [loadFresh]);

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={styles.title}>Pokoje</Text>
                <Button title="Dodaj pokój" onPress={() => navigation.navigate('RoomForm')} />
            </View>

            {loading ? (
                <Text>Ładowanie...</Text>
            ) : rooms.length === 0 ? (
                <Text>Brak pokoi. Dodaj pierwszy pokój</Text>
            ) : (
                <FlatList
                    data={rooms}
                    keyExtractor={(item) => item.id}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    renderItem={({ item }) => (
                        <RoomCard
                            room={item}
                            onPress={() => navigation.navigate('RoomDetails', { roomId: item.id})}
                        />
                    )}
                />
            )}
        </View>
    );
}

function mapStatus(status: Room['status']): string {
    switch (status) {
        case 'FREE':
            return "Wolny";
        case 'OCCUPIED':
            return "Zajęty";
        case 'CLEANING':
            return "Do sprzątania";
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: colors.bg
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12
    },
    title: {
        fontSize: 22,
        fontWeight: '600'
    },
    card: {
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#ddd',
        marginBottom: 10
    },
    cardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '600'
    },
    badge: {
        fontSize: 12
    },
});