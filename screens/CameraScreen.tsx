import React, { useEffect, useRef, useState } from 'react';
import { Alert, Button, StyleSheet, Text, View, SafeAreaView } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../navigation/types';
import { getBookingById, upsertBooking } from '../storage/bookingStorage';
import { ContactAccessButton } from 'expo-contacts';

type Props = NativeStackScreenProps<RootStackParamList, 'Camera'>;

export default function CameraScreen({ route, navigation }: Props) {
    const { bookingId } = route.params;
    const cameraRef = useRef<CameraView>(null);
    const [facing, setFacing] = useState<CameraType>('back');
    const [permission, requestPermission] = useCameraPermissions();
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!permission) return;

        if (!permission.granted) {
            //
        }
    }, [permission]);

    async function onTakePhoto() {
        try {
            if (!cameraRef.current) return;

            setSaving(true);
            const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
            if (!photo?.uri) {
                setSaving(false);
                Alert.alert('Bład', 'Nie udało się zrobić zdjęcia');
                return;
            }

            const booking = await getBookingById(bookingId);
            if (!booking) {
                setSaving(false);
                Alert.alert('Bład', 'Nie znaleziono rezerwacji');
                navigation.goBack();
                return;
            }

            const uris = booking.photoUris ?? [];
            const updated = { ...booking, photoUris: [photo.uri, ...uris] };
            await upsertBooking(updated);
            setSaving(false);
            Alert.alert('OK', 'Dodano zdjęcie do rezerwacji');
            navigation.goBack();
        } catch (e) {
            console.warn('take photo error', e);
            setSaving(false);
            Alert.alert('Błąd', 'Nie udało się zrobić zdjęcia');
        }
    }

    if (!permission) {
        return (
            <View style={styles.center}>
                <Text>Sprawdzanie uprwnien...</Text>
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <View style={styles.center}>
                <Text style={{ marginBottom: 12, textAlign: 'center' }}>
                    BRak dostępu do aparatu, Udziel zgody aby zrobić zdjęcia.
                </Text>
                <Button title="Poproś o dostęp" onPress={() => requestPermission()} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <CameraView ref={cameraRef} style={styles.camera} facing={facing} />
                <View style={styles.controls}>
                    <View style={{ flex: 1 }}>
                        <Button title={facing === 'back' ? 'Tylny' : 'Przedni'} onPress={() => setFacing(facing === 'back' ? 'front' : 'back')} />
                    </View>

                    <View style={{ flex: 1 }}>
                        <Button title={saving ? 'Zapisywanie...' : 'Zrób zdjęcie'} onPress={onTakePhoto} disabled={saving} />
                    </View>
                </View>
        </SafeAreaView>
);

}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black'
    },
    camera: { 
        flex: 1 
    },
    controls: {
        position: 'absolute',
        left: 12,
        right: 12,
        bottom: 24,
        flexDirection: 'row',
        gap: 10,
        padding: 12,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.45',
    },
    center: {
        flex: 1,
        padding: 16,
        justifyContent: 'center',
        alignItems: 'center'
    },
});