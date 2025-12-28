// reducers/index.ts
import { combineReducers } from '@reduxjs/toolkit';
import userReducer from './userSlice';
import permissionsReducer from './permissionsSlice';

const rootReducer = combineReducers({
    user: userReducer,
    permissions: permissionsReducer,
});

export type RootState = ReturnType<typeof rootReducer>; // This will give you the correct type for your state
export default rootReducer;
