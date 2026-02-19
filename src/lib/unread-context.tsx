import { createContext, useContext, useState, useCallback, useRef } from "react";

interface UnreadContextType {
  unreadCount: number;
  increment: () => void;
  reset: () => void;
  isChatActive: boolean;
  setChatActive: (active: boolean) => void;
}

const UnreadContext = createContext<UnreadContextType>({
  unreadCount: 0,
  increment: () => {},
  reset: () => {},
  isChatActive: false,
  setChatActive: () => {},
});

export function UnreadProvider({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const chatActiveRef = useRef(false);
  const [isChatActive, setIsChatActiveState] = useState(false);

  const increment = useCallback(() => {
    if (!chatActiveRef.current) {
      setUnreadCount((c) => c + 1);
    }
  }, []);

  const reset = useCallback(() => {
    setUnreadCount(0);
  }, []);

  const setChatActive = useCallback((active: boolean) => {
    chatActiveRef.current = active;
    setIsChatActiveState(active);
    if (active) setUnreadCount(0);
  }, []);

  return (
    <UnreadContext.Provider value={{ unreadCount, increment, reset, isChatActive, setChatActive }}>
      {children}
    </UnreadContext.Provider>
  );
}

export function useUnread() {
  return useContext(UnreadContext);
}
