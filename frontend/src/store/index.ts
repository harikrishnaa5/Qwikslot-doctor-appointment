import { configureStore } from "@reduxjs/toolkit";
import createSagaMiddleware from "redux-saga";
import { rootReducer } from "./rootReducer";
import { rootSaga } from "./rootSaga";

const saga = createSagaMiddleware();

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefault) => getDefault({ serializableCheck: false }).concat(saga),
});

saga.run(rootSaga);

export type AppDispatch = typeof store.dispatch;
export type { RootState } from "./rootReducer";
