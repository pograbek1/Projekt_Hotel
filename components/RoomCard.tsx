import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Room } from '../models/types';
import StatusBadge from './StatusBadge';
import { colors} from '../theme/colors';

type Props = {
    room: Room;
    onPress: () => void;
};

export default function RoomCard({ room, onPress }: Props) {
    return (
        <Pressable style={styles.card} onPress={onPress}>
            <View style={styles.topRow}>
                <Text style={styles.title}>Pokój {room.number}</Text>
                <StatusBadge status={room.status} />
            </View>
            <Text style={styles.meta}>Miejsca: {room.capacity}</Text>
            <Text style={styles.meta}>Cena/noc: {room.pricePerNight} zł</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    card: {
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.bg,
        marginBottom: 10
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text
    },
    meta: {
        color: colors.muted,
        fontSize: 14,
        marginTop: 2
    },
});