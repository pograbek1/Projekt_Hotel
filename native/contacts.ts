import * as Contacts from 'expo-contacts';

export type PickedPhone = {
    name?: string;
    phone: string;
};

function normalizePhone(raw: string): string {
    //prosta normalizacja: zostaw + i cyfry
    return raw.replace(/[^\d+]/g, '');
}

export async function pickPhoneNumber(): Promise<PickedPhone | null> {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== 'granted') {
        throw new Error('CONTACTS_PERMISSION_DENIED');
    }

    const picked = await Contacts.presentContactPickerAsync();
    if (!picked) return null;

    const contact = picked as Contacts.Contact;

    const firstPhone = contact.phoneNumbers?.[0]?.number;
    if (!firstPhone) {
        throw new Error('CONTACT_HAS_NO_PHONE');
    }

    return {
        name: contact.name ?? undefined,
        phone: normalizePhone(firstPhone),
    };
}