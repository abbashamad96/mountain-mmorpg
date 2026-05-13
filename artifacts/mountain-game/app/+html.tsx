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
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
