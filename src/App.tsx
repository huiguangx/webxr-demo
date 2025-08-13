import React, { useEffect, useRef } from "react";
import { ThreeSceneManager } from "./components/ThreeSceneManager";

const App = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneManagerRef = useRef<ThreeSceneManager | null>(null);

  useEffect(() => {
    if (containerRef.current && !sceneManagerRef.current) {
      sceneManagerRef.current = new ThreeSceneManager(containerRef.current);
    }

    return () => {
      if (sceneManagerRef.current) {
        sceneManagerRef.current.dispose();
        sceneManagerRef.current = null;
      }
    };
  }, []);

  return <div ref={containerRef} style={{ width: "100vw", height: "100vh" }} />;
};

export default App;
