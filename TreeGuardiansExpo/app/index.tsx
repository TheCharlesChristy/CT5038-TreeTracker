import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { globalStyles } from '@/styles';

export default function LoginScreen() {
  return (
    <View style={globalStyles.container}>
      <Text style={globalStyles.title}>Login HELLO</Text>

      <TouchableOpacity style={globalStyles.button}>
        <Text style={globalStyles.buttonText}>Sign In</Text>
      </TouchableOpacity>
    </View>
  );
}