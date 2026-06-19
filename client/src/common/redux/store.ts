import { configureStore } from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import rootReducer from './rootReducer';
import storageSession from 'redux-persist/lib/storage/session';


const persistConfig = {
    key: 'root',
    storage: storageSession,
    version: 1,
    whitelist: [
        'auth', 
        'ui',
        'allMenu',
        'chart'
    ],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);
// RootState 타입: 스토어의 전체 상태 타입
export type RootState = ReturnType<typeof store.getState>;
// AppDispatch 타입: dispatch 함수의 타입
export type AppDispatch = typeof store.dispatch;