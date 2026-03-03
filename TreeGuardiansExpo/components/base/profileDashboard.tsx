// import { View, StyleSheet } from 'react-native';
// import { router } from 'expo-router';
// import { AppButton } from '@/components/base/AppButton';
// //import { useAuth } from '@context/AuthContext';

// export default function profileDashboard() {
//     // const { user } = useAuth(); // contains role

//     return (
//         <View style={styles.container}>

//         {/* Available to everyone */}
//         <AppButton
//         title="ManageProfile"
//         onPress={() => router.push('/profile')}
//         />

//         {/* Guardians + Admins */}
//         {(user?.role === 'guardian' || user?.role === 'admin') && (
//             <AppButton
//             title="My Trees"
//             onPress={() => router.push('/trees')}
//             />
//         )}

//         {/* Admins only */}
//         {(user?.role === 'admin') && (
//             <AppButton
//             title="Manage Users"
//             onPress={() => router.push('/admin/users')}
//             />
//         )}

//         </View>
//     )
// }

// const styles = StyleSheet.create({
//     container: {
//         flex: 1,
//         padding: 20,
//         justifyContent: 'center',
//         gap: 20,
//     },
// });