import React from 'react';
import { StatusBar } from 'expo-status-bar';
import RootNavigator from './navigation/RootNavigator';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
    }),
});

export default function App() {
    return (
        <>
            <RootNavigator />
            <StatusBar style="auto" />
        </>
    );
}