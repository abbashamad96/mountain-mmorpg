import { ScrollViewStyleReset } from "expo-router/build/static/html";
import React from "react";

export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <title>Mountain of Supremacy</title>
        <meta
          name="description"
          content="An online RPG where you explore a mountain road, gather rare materials, battle fearsome creatures, and trade on a global auction house. Create your account and start your journey."
        />
        <style>{`
          html { zoom: 0.8; }
          html, body { width: 100%; height: 100%; }
          body {
            display: flex;
            justify-content: center;
            background-color: #111;
            margin: 0;
          }
          #root {
            width: 100%;
            height: 100%;
          }
        `}</style>
        <ScrollViewStyleReset />
        
      </head>
      <body>{children}</body>
    </html>
  );
}
