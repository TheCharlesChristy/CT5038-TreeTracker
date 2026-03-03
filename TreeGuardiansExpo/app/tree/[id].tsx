import { useLocalSearchParams } from "expo-router";
import { View } from 'react-native';
import { AppText } from '@/components/base/AppText';

export default function TreePage() {
    const { id } = useLocalSearchParams();

    return (
        <View>
            <AppText>Tree ID: {id}</AppText>
        </View>
    );
}