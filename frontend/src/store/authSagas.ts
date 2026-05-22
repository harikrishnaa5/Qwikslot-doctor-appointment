import { call, put, takeLatest } from "redux-saga/effects";
import * as authApi from "../api/auth";
import { toast, SIGN_IN_SUCCESS_MESSAGE } from "../lib/toast";
import { loginRequested, registerRequested } from "./authActions";
import { setAuthError, setAuthLoading, setCredentials } from "./slices/authSlice";

function* loginSaga(action: ReturnType<typeof loginRequested>): Generator {
  yield put(setAuthLoading(true));
  yield put(setAuthError(null));
  try {
    const res = (yield call(authApi.loginRequest, action.payload.email, action.payload.password)) as Awaited<
      ReturnType<typeof authApi.loginRequest>
    >;
    yield put(
      setCredentials({
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
        user: res.user,
      })
    );
    toast.success(SIGN_IN_SUCCESS_MESSAGE);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Login failed";
    yield put(setAuthError(msg));
    toast.error(msg);
  } finally {
    yield put(setAuthLoading(false));
  }
}

function* registerSaga(action: ReturnType<typeof registerRequested>): Generator {
  yield put(setAuthLoading(true));
  yield put(setAuthError(null));
  try {
    const res = (yield call(
      authApi.registerRequest,
      action.payload.name,
      action.payload.email,
      action.payload.password
    )) as Awaited<ReturnType<typeof authApi.registerRequest>>;
    yield put(
      setCredentials({
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
        user: res.user,
      })
    );
    toast.success("Account created");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Registration failed";
    yield put(setAuthError(msg));
    toast.error(msg);
  } finally {
    yield put(setAuthLoading(false));
  }
}

export function* authSagas() {
  yield takeLatest(loginRequested.type, loginSaga);
  yield takeLatest(registerRequested.type, registerSaga);
}
