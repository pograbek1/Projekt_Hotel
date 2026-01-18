import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';

import HomeScreen from '../screens/HomeScreen';
import RoomDetailsScreen from '../screens/RoomDetailsScreen';
import RoomFormScreen from '../screens/RoomFormScreen';
import BookingFormScreen from '../screens/BookingFormScreen';
import CameraScreen from '../screens/CameraScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
    return (
        <NavigationContainer>
            <Stack.Navigator>
                <Stack.Screen
                    name="Home"
                    component={HomeScreen}
                    options={{ title: 'Home'}}
                />
                <Stack.Screen
                    name="RoomDetails"
                    component={RoomDetailsScreen}
                    options={{ title: 'Szczegóły pokojui '}}
                />
                <Stack.Screen
                    name="RoomForm"
                    component={RoomFormScreen}
                    options={{ title: 'Pokój' }}
                />
                <Stack.Screen
                    name="BookingForm"
                    component={BookingFormScreen}
                    options={{ title: 'Rezerwacja' }}
                />
                <Stack.Screen
                    name="Camera"
                    component={CameraScreen}
                    options={{ title: 'Aparat' }}
                />
            </Stack.Navigator>
        </NavigationContainer>
    );
}