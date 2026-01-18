import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

export function isRunninginExpoGo(): boolean {
    // w expogo appOwnership='expo
    return Constants.appOwnership === 'expo';
}

export async function ensureNotificationsPermission(): Promise<boolean> {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;

    const req = await Notifications.requestPermissionsAsync();
    return req.granted;
}

export async function ensureAndroidChannel(): Promise<void> {
    if (Platform.OS !== 'android') return;
    await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.DEFAULT,
    });
}

export async function scheduleCheckoutReminder(opts: {
    roomNumber: string;
    checkOutYmd: string; //YYYY-MM-DD
    hour: number; // np. 10
    minute: number; //np. 0
}): Promise<string> {
    const { roomNumber, checkOutYmd, hour, minute } = opts;
    const [ y, m, d] = checkOutYmd.split('-').map(Number);
    const triggerDate = new Date(y, m-1, d, hour, minute, 0);

    //Jesli data jest w przeszlosci, nie planujeym
    if (triggerDate.getTime() <= Date.now()) {
        throw new Error('TRIGGER_IN_PAST');
    }

    return Notifications.scheduleNotificationAsync({
        content: {
            title: `Wymeldowanie — pokój ${roomNumber}`,
            body: `Dziś planowane wymeldowanie (check-out).`,
        },
        trigger: triggerDate,
  });
}

export async function cancelNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
}
