import React from 'react';
import { Modal, View, Image, StyleSheet, Pressable, Text, FlatList, Dimensions } from 'react-native';

type Props = {
    visible: boolean;
    uris: string[];
    initialIndex: number;
    onClose: () => void;
};

export default function PhotoViewerModal({ visible, uris, initialIndex, onClose }: Props) {
    const width = Dimensions.get('window').width;

    return (
        <Modal visible={visible} animationType="fade" onRequestClose={onClose}>
            <View style={styles.container}>
                <Pressable style={styles.closeBtn} onPress={onClose}>
                    <Text style={styles.closeText}>Zamknij</Text>
                </Pressable>
                <FlatList
                    data={uris}
                    keyExtractor={(item) => item}
                    horizontal
                    pagingEnabled
                    initialScrollIndex={Math.max(0, Math.min(initialIndex, uris.length - 1))}
                    renderItem={({ item }) => (
                        <View style={[styles.page, { width }]}>
                            <Image source={{ uri: item }} style={styles.image} resizeMode="contain" />
                        </View>
                    )}
                />
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black'
    },
    closeBtn: {
        paddingVertical: 14,
        paddingHorizontal: 16,
        alignSelf: 'flex-end'
    },
    closeText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600'
    },
    page: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    image: {
        width: '100%',
        height: '85%'
    },
});