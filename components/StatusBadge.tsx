import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { RoomStatus } from '../models/types';
import { colors } from '../theme/colors';

type Props = { status: RoomStatus };

export default function StatusBadge({ status }: Props) {
    const { label, bg } = map(status);
    return (
        <View style={[styles.badge, { backgroundColor: bg }]}>
            <Text style={styles.text}>{label}</Text>
        </View>
    );
}

function map(status: RoomStatus) {
    switch (status) {
        case 'FREE':
            return { label: 'WOLNY', bg: colors.statusFree };
        case 'OCCUPIED':
            return { label: 'ZAJĘTY', bg: colors.statusOccupied };
        case 'CLEANING':
            return { label: 'SPRZĄTANIE', bg: colors.statusCleaning };
    }
}

const styles = StyleSheet.create({
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999
    },
    text: {
        color: 'white',
        fontWeight: '700',
        fontSize: 12,
        letterSpacing: 0.5
    },
});