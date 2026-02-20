// hook to store user location across app and handle permissions
import { useEffect, useRef, useState } from "react";
import * as Location from "expo-location";

export default function useUserLocation() {
  const [status, setStatus] = useState("idle"); // idle | requesting | watching | denied | unavailable | error
  const [coords, setCoords] = useState(null);   // { latitude, longitude, ... }
  const [message, setMessage] = useState("");
  const subRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    async function start() {
      try {
        setStatus("requesting");
        setMessage("");

        // Request permissions
        const { status: perm } = await Location.requestForegroundPermissionsAsync();
        if (!mounted) return;

        if (perm !== "granted") {
          setStatus("denied");
          setMessage("Location permission denied. Enable it to show your current building.");
          return;
        }

        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (!mounted) return;

        if (!servicesEnabled) {
          setStatus("unavailable");
          setMessage("Location services are off. Turn on GPS to show your current building.");
          return;
        }

        setStatus("watching");

        subRef.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 2000,      // updates in real-time
            distanceInterval: 2,     // update as user moves
            mayShowUserSettingsDialog: true,
          },
          (pos) => {
            if (!mounted) return;
            setCoords(pos.coords);
          }
        );
      } catch (e) {
        if (!mounted) return;
        setStatus("error");
        setMessage("Location cannot be determined.");
      }
    }

    start();

    return () => {
      mounted = false;
      if (subRef.current) {
        subRef.current.remove();
        subRef.current = null;
      }
    };
  }, []);

  return { status, coords, message };
}
