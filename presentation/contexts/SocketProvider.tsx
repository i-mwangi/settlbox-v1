"use client";
import React, { createContext, useContext } from "react";
export const SocketContext = createContext<{
    socket: {
        on: (event: string, callback: (...args: never[]) => void) => void;
        off: (event: string, callback: (...args: never[]) => void) => void;
    } | null;
    changeSocketUrl: (newUrl: string) => void;
} | null>({
    socket: null,
    changeSocketUrl: () => { },
});
export const useSocket = () => {
    return useContext(SocketContext);
};
export function SocketProvider({ children }: {
    children: React.ReactNode;
}) {
    return (<SocketContext.Provider value={{ socket: null, changeSocketUrl: () => { } }}>
      {children}
    </SocketContext.Provider>);
}
