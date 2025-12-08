import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react'
import { Image, Pressable, Text, View } from "react-native";

function CreateOrderSuccess() {
    const router = useRouter();
    const { order } = useLocalSearchParams();

    return (
        <>
        </>
    )
}

export default CreateOrderSuccess