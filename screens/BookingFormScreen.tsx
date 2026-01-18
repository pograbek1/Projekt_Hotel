import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Platform, ScrollView, StyleSheet, Text, TextInput, View, Linking } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid, DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../navigation/types';
import { Booking } from '../models/types';
import { getBookingById, upsertBooking } from '../storage/bookingStorage';
import { pickPhoneNumber } from '../native/contacts';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'BookingForm'>;

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function formatYmd(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function parseYmdToDate(ymd: string): Date | null {
  // Obsługuje YYYY-MM-DD (bierzemy pierwsze 10 znaków)
  const s = ymd.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split('-').map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  return new Date(y, m - 1, d);
}

export default function BookingFormScreen({ route, navigation }: Props) {
  const { roomId, bookingId } = route.params;
  const isEditing = useMemo(() => Boolean(bookingId), [bookingId]);

  const [guestName, setGuestName] = useState('');
  const [phone, setPhone] = useState('');

  const [checkInDate, setCheckInDate] = useState<Date>(startOfDay(new Date()));
  const [checkOutDate, setCheckOutDate] = useState<Date>(startOfDay(addDays(new Date(), 1)));

  const [totalAmount, setTotalAmount] = useState('0');
  const [paidAmount, setPaidAmount] = useState('0');
  const [notes, setNotes] = useState('');

  // iOS-only (jeśli kiedyś uruchomisz na iOS)
  const [showCheckInIOS, setShowCheckInIOS] = useState(false);
  const [showCheckOutIOS, setShowCheckOutIOS] = useState(false);
  const [tempCheckIn, setTempCheckIn] = useState<Date>(checkInDate);
  const [tempCheckOut, setTempCheckOut] = useState<Date>(checkOutDate);

  useEffect(() => {
    navigation.setOptions({ title: isEditing ? 'Edytuj rezerwację' : 'Dodaj rezerwację' });

    if (!bookingId) return;

    (async () => {
      const existing = await getBookingById(bookingId);
      if (!existing) {
        Alert.alert('Błąd', 'Nie znaleziono rezerwacji.');
        navigation.goBack();
        return;
      }

      setGuestName(existing.guestName);
      setPhone(existing.phone ?? '');

      const inDate = parseYmdToDate(existing.checkIn);
      const outDate = parseYmdToDate(existing.checkOut);

      if (inDate) setCheckInDate(startOfDay(inDate));
      if (outDate) setCheckOutDate(startOfDay(outDate));

      setTotalAmount(String(existing.totalAmount));
      setPaidAmount(String(existing.paidAmount));
      setNotes(existing.notes ?? '');
    })();
  }, [bookingId, isEditing, navigation]);

  // ANDROID: stabilne otwieranie dialogu przez DateTimePickerAndroid.open()
  function openCheckInAndroid() {
    DateTimePickerAndroid.open({
      value: checkInDate,
      mode: 'date',
      is24Hour: true,
      onChange: (_event, selectedDate) => {
        if (!selectedDate) return;

        const s = startOfDay(selectedDate);
        setCheckInDate(s);

        // jeśli check-out <= check-in, przesuń check-out na +1 dzień
        if (startOfDay(checkOutDate).getTime() <= s.getTime()) {
          setCheckOutDate(startOfDay(addDays(s, 1)));
        }
      },
    });
  }

  function openCheckOutAndroid() {
    DateTimePickerAndroid.open({
      value: checkOutDate,
      mode: 'date',
      is24Hour: true,
      minimumDate: addDays(startOfDay(checkInDate), 1),
      onChange: (_event, selectedDate) => {
        if (!selectedDate) return;
        setCheckOutDate(startOfDay(selectedDate));
      },
    });
  }

  // iOS: inline picker + temp + zatwierdzanie (gdybyś odpalił na iOS)
  function onChangeCheckInIOS(_event: DateTimePickerEvent, selected?: Date) {
    if (selected) setTempCheckIn(startOfDay(selected));
  }

  function onChangeCheckOutIOS(_event: DateTimePickerEvent, selected?: Date) {
    if (selected) setTempCheckOut(startOfDay(selected));
  }

  async function onPickContact() {
    try {
      const picked = await pickPhoneNumber();
      if (!picked) return; //uzytkownik anulowal
      setPhone(picked.phone);
    } catch (e: any) {
      const msg = e?.message;

      if (msg === 'CONTACTS_PERMISSION_DENIED') {
        Alert.alert('Brak dostępu', 'Aplikacja nie ma dostępu do kontaktow');
        return;
      }
      if (msg === 'CONTACT_HAS_NO_PHONE') {
        Alert.alert('Brak numeru', 'Wybrany kontakt nie ma numeru telefonu');
        return;
      }

      console.warn('pick contact error', e);
      Alert.alert('Błąd', 'Nie udało się pobrać numeru telefonu');
    }
  }

  async function onCall() {
  const number = phone.trim();
  if (!number) {
    Alert.alert('Brak numeru', 'Najpierw wpisz lub wybierz numer telefonu.');
    return;
  }

  const telUrl = `tel:${number}`;

  try {
    const can = await Linking.canOpenURL(telUrl);
    if (!can) {
      Alert.alert('Brak możliwości', 'Nie można otworzyć dialera na tym urządzeniu.');
      return;
    }
    await Linking.openURL(telUrl);
  } catch (e) {
    console.warn('call error', e);
    Alert.alert('Błąd', 'Nie udało się uruchomić połączenia.');
  }
}

  async function onSave() {
    const name = guestName.trim();
    if (name.length === 0) {
      Alert.alert('Walidacja', 'Podaj imię i nazwisko gościa.');
      return;
    }

    const inTime = startOfDay(checkInDate).getTime();
    const outTime = startOfDay(checkOutDate).getTime();
    if (outTime <= inTime) {
      Alert.alert('Walidacja', 'Data wyjazdu musi być później niż data przyjazdu.');
      return;
    }

    const total = Number(totalAmount);
    const paid = Number(paidAmount);

    if (!Number.isFinite(total) || total < 0) {
      Alert.alert('Walidacja', 'Kwota całkowita musi być liczbą nieujemną.');
      return;
    }
    if (!Number.isFinite(paid) || paid < 0) {
      Alert.alert('Walidacja', 'Wpłacono musi być liczbą nieujemną.');
      return;
    }
    if (paid > total) {
      Alert.alert('Walidacja', 'Wpłacono nie może być większe niż kwota całkowita.');
      return;
    }

    const booking: Booking = {
      id: bookingId ?? String(Date.now()),
      roomId,
      guestName: name,
      phone: phone.trim().length > 0 ? phone.trim() : undefined,
      checkIn: formatYmd(checkInDate),   // zapis jako YYYY-MM-DD
      checkOut: formatYmd(checkOutDate), // zapis jako YYYY-MM-DD
      totalAmount: total,
      paidAmount: paid,
      notes: notes.trim().length > 0 ? notes.trim() : undefined,
      photoUris: [],
    };

    await upsertBooking(booking);
    navigation.goBack();
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* GOŚĆ */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Gość</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Imię i nazwisko</Text>
          <TextInput
            value={guestName}
            onChangeText={setGuestName}
            placeholder="np. Jan Kowalski"
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Telefon (opcjonalnie)</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="np. 500600700"
            style={styles.input}
            keyboardType="phone-pad"
          />

          {/* dwa przyciski obok siebie */}
          <View style={styles.phoneButtonsRow}>
            <View style={{ flex: 1 }}>
              <Button title="Wybierz kontakt" onPress={onPickContact} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Zadzwoń" onPress={onCall} disabled={phone.trim().length === 0} />
            </View>
          </View>
        </View>
      </View>

      {/* TERMIN */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Termin</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Check-in</Text>
          <View style={styles.dateRow}>
            <Text style={styles.dateValue}>{formatYmd(checkInDate)}</Text>
            <Button
              title="Wybierz"
              onPress={() => {
                if (Platform.OS === 'android') openCheckInAndroid();
                else {
                  setTempCheckIn(checkInDate);
                  setShowCheckInIOS(true);
                }
              }}
            />
          </View>

          {Platform.OS === 'ios' && showCheckInIOS ? (
            <>
              <DateTimePicker value={tempCheckIn} mode="date" display="inline" onChange={onChangeCheckInIOS} />
              <View style={{ marginTop: 8 }}>
                <Button
                  title="Zatwierdź"
                  onPress={() => {
                    setCheckInDate(startOfDay(tempCheckIn));
                    if (startOfDay(checkOutDate).getTime() <= startOfDay(tempCheckIn).getTime()) {
                      setCheckOutDate(startOfDay(addDays(tempCheckIn, 1)));
                    }
                    setShowCheckInIOS(false);
                  }}
                />
              </View>
            </>
          ) : null}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Check-out</Text>
          <View style={styles.dateRow}>
            <Text style={styles.dateValue}>{formatYmd(checkOutDate)}</Text>
            <Button
              title="Wybierz"
              onPress={() => {
                if (Platform.OS === 'android') openCheckOutAndroid();
                else {
                  setTempCheckOut(checkOutDate);
                  setShowCheckOutIOS(true);
                }
              }}
            />
          </View>

          {Platform.OS === 'ios' && showCheckOutIOS ? (
            <>
              <DateTimePicker
                value={tempCheckOut}
                mode="date"
                display="inline"
                minimumDate={addDays(startOfDay(checkInDate), 1)}
                onChange={onChangeCheckOutIOS}
              />
              <View style={{ marginTop: 8 }}>
                <Button
                  title="Zatwierdź"
                  onPress={() => {
                    setCheckOutDate(startOfDay(tempCheckOut));
                    setShowCheckOutIOS(false);
                  }}
                />
              </View>
            </>
          ) : null}
        </View>
      </View>

      {/* PŁATNOŚĆ */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Płatność</Text>

        <View style={styles.row2}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Kwota całkowita (zł)</Text>
            <TextInput
              value={totalAmount}
              onChangeText={setTotalAmount}
              keyboardType="numeric"
              placeholder="0"
              style={styles.input}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Wpłacono (zł)</Text>
            <TextInput
              value={paidAmount}
              onChangeText={setPaidAmount}
              keyboardType="numeric"
              placeholder="0"
              style={styles.input}
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Notatki (opcjonalnie)</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="np. łóżeczko dziecięce, późny przyjazd..."
            style={[styles.input, { height: 110, textAlignVertical: 'top' }]}
            multiline
          />
        </View>
      </View>

      <View style={{ marginTop: 4 }}>
        <Button title={isEditing ? 'Zapisz zmiany' : 'Zapisz rezerwację'} onPress={onSave} />
      </View>

      <Text style={styles.muted}>
        Dane są zapisywane lokalnie w pamięci urządzenia (AsyncStorage).
      </Text>
</ScrollView>

  );
}

const styles = StyleSheet.create({
  container: { 
    padding: 16,
    gap: 12,
    backgroundColor:
    colors.bg
  },
  section: {
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 14,
  padding: 14,
  gap: 10,
  backgroundColor: colors.bg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4
  },
  field: {
    gap: 6
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4
  },
  input: {
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 12,
  paddingHorizontal: 12,
  paddingVertical: 10,
  fontSize: 16,
  color: colors.text,
  backgroundColor: '#fff',
  },
  row2: {
    flexDirection: 'row',
    gap: 10
  },
  muted : { 
    color: colors.muted
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10
  },
  dateValue: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '700'
  },
  phoneButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
});