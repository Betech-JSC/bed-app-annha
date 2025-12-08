import { useState, useEffect } from "react";
import AsyncStorage from '@react-native-async-storage/async-storage';

// Custom hook to fetch role from AsyncStorage
const useRole = () => {
    const [role, setRole] = useState(null);

    useEffect(() => {
        const fetchRole = async () => {
            const storedRole = await AsyncStorage.getItem('role');
            if (storedRole) {
                setRole(storedRole);
            }
        };

        fetchRole();
    }, []);

    return role;
};

export default useRole;
