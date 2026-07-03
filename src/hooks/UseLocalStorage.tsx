import { useState } from "react";
import { tokenService } from "../services/TokenService";

export function useAuth() {
  const [isAuth, setIsAuth] = useState(tokenService.isAuthenticated());

  const addToken = (token: string) => {
    tokenService.set(token);
    setIsAuth(true);
  };

  const removeToken = () => {
    tokenService.remove();
    setIsAuth(false);
  };

  return { isAuth, addToken, removeToken };
}
