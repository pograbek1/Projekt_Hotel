import * as SMS from 'expo-sms';

export async function isSmsAvailable(): Promise<boolean> {
    return SMS.isAvailableAsync();
}

export async function sendSms(to: string, message: string): Promise<void> {
    const ok = await SMS.isAvailableAsync();
    if ( !ok ) {
        throw new Error('SMS_NOT_AVAILABLE');
    }

    const result = await SMS.sendSMSAsync([to], message);
    
    //result: { result: "sent" | "cancelled" | "unkown" }
    if ( result.result !== 'sent' ) {
        throw new Error('SMS_NOT_SENT');
    }
}