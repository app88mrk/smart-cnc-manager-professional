export const ALLOWED_USER_UID =
  "74GPbaN8d0ZDc4RfqkRxUL23RBo1";

export function isAllowedUser(uid: string) {
  return uid === ALLOWED_USER_UID;
}
