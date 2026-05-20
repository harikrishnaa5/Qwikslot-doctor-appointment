import { all } from "redux-saga/effects";
import { authSagas } from "./authSagas";

export function* rootSaga() {
  yield all([authSagas()]);
}
