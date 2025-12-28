// reducers/permissionsSlice.ts
import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { permissionApi } from '@/api/permissionApi';

interface PermissionsState {
    permissions: string[];
    loading: boolean;
    error: string | null;
    lastFetched: number | null; // timestamp
}

const initialState: PermissionsState = {
    permissions: [],
    loading: false,
    error: null,
    lastFetched: null,
};

// Thunk để fetch permissions
export const fetchPermissions = createAsyncThunk(
    'permissions/fetch',
    async (_, { rejectWithValue }) => {
        try {
            const response = await permissionApi.getMyPermissions();
            if (response.success) {
                return response.data || [];
            }
            return rejectWithValue('Failed to fetch permissions');
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to fetch permissions');
        }
    }
);

const permissionsSlice = createSlice({
    name: 'permissions',
    initialState,
    reducers: {
        setPermissions: (state, action: PayloadAction<string[]>) => {
            state.permissions = action.payload;
            state.lastFetched = Date.now();
        },
        clearPermissions: (state) => {
            state.permissions = [];
            state.lastFetched = null;
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchPermissions.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchPermissions.fulfilled, (state, action) => {
                state.loading = false;
                state.permissions = action.payload;
                state.lastFetched = Date.now();
                state.error = null;
            })
            .addCase(fetchPermissions.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });
    },
});

export const { setPermissions, clearPermissions } = permissionsSlice.actions;
export default permissionsSlice.reducer;

