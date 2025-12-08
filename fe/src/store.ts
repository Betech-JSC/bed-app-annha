// store.ts
import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import rootReducer from './reducers';

// 1. Cấu hình persist
const persistConfig = {
    key: 'root',
    storage: AsyncStorage,
    whitelist: ['user'], // chỉ lưu reducer user, các reducer khác không lưu
};

// 2. Tạo persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// 3. Tạo store với persisted reducer
export const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: false, // redux-persist cần tắt check serializable
        }),
});

// 4. Export persistor
export const persistor = persistStore(store);

// 5. Type cho store
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
