// sub: id del usuario. sid: familia de la sesión (sessions.family_id).
export interface JwtPayload {
  sub: string;
  sid: string;
}
