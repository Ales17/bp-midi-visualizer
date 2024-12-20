import { useEffect, useState } from "react";
import {
  CONNECTION,
  ConnectionStatus,
  MacObject,
} from "./SpectodaConnectionContext";
import { spectoda } from "./communication";
import { useToast } from "~/components/ui/use-toast";

export default function useConnectionStatus(
  setConnectedMacs: React.Dispatch<React.SetStateAction<MacObject[]>>,
  setDisconnectedMacs: React.Dispatch<React.SetStateAction<MacObject[]>>,
) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    CONNECTION.DISCONNECTED,
  );
  const [websocketConnectionStatus, setWebsocketConnectionStatus] =
    useState<ConnectionStatus>(CONNECTION.DISCONNECTED);
  const [connectedName, setConnectedName] = useState("unknown");
  const [directlyConnectedMac, setDirectlyConnectedMac] = useState("");
  const [lastDirectlyConnectedMac, setLastDirectlyConnectedMac] = useState("");

  const { toast } = useToast();

  const [connectedNetworkSignature, setConnectedNetworkSignature] =
    useState("");

  useEffect(() => {
    spectoda.on("connected", async () => {
      if (connectionStatus !== "connected") {
        setConnectionStatus("connected");

        const peers = await spectoda.getConnectedPeersInfo();
        if (peers.length > 0 && peers[0]) {
          setDirectlyConnectedMac(peers[0].mac);
          setLastDirectlyConnectedMac(peers[0].mac);
        }

        setConnectedMacs(peers);
        setDisconnectedMacs((macs) =>
          macs.filter((v) => peers.find((p: MacObject) => p.mac !== v.mac)),
        );

        const name = await spectoda.readControllerName().catch(() => "unknown");
        setConnectedName(name);

        const networkSignature = await spectoda
          .readNetworkSignature()
          .catch(() => "unknown");
        setConnectedNetworkSignature(networkSignature);

        setTimeout(async () => {
          window.localStorage.setItem("login_pass", "true");
        }, 300);
      }
    });

    spectoda.on("connecting", () => setConnectionStatus("connecting"));

    spectoda.on("disconnecting", () => setConnectionStatus("disconnecting"));

    spectoda.on("disconnected", () => {
      setConnectionStatus("disconnected");
      toast({ title: "Disconnected" });

      setDirectlyConnectedMac("");
      setConnectedMacs((macs) => {
        setDisconnectedMacs((disconnectedMacs) => {
          const key = "mac";
          const allmacs = [...disconnectedMacs, ...macs];
          const arrayUniqueByKey = [
            ...new Map(allmacs.map((item) => [item[key], item])).values(),
          ];

          return arrayUniqueByKey;
        });
        return [];
      });
    });

    spectoda.on("connected-websockets", () =>
      setWebsocketConnectionStatus("connected"),
    );

    spectoda.on("connecting-websockets", () =>
      setWebsocketConnectionStatus("connecting"),
    );

    spectoda.on("disconnecting-websockets", () =>
      setWebsocketConnectionStatus("disconnecting"),
    );

    spectoda.on("disconnected-websockets", () =>
      setWebsocketConnectionStatus("disconnected"),
    );

    spectoda.on("peer_connected", (peer: any) => {
      setConnectedMacs((macs) => [...macs, { mac: peer }]);
      setDisconnectedMacs((macs) => macs.filter((v) => v.mac !== peer));
    });

    spectoda.on("peer_disconnected", (peer: any) => {
      setConnectedMacs((macs) => macs.filter((v) => v.mac !== peer));
      setDisconnectedMacs((macs) => {
        if (!macs.find((p) => p.mac === peer)) {
          macs = [...macs, { mac: peer }];
        }
        return macs;
      });
    });
  }, []);

  const isConnected = connectionStatus === CONNECTION.CONNECTED;
  const isConnectingOrDisconnecting =
    connectionStatus === CONNECTION.CONNECTING ||
    connectionStatus === CONNECTION.DISCONNECTING;

  const isWebsocketConnected =
    websocketConnectionStatus === CONNECTION.CONNECTED;

  return {
    isConnected,
    isWebsocketConnected,
    connectionStatus,
    websocketConnectionStatus,
    directlyConnectedMac,
    lastDirectlyConnectedMac,
    isConnecting: isConnectingOrDisconnecting,
    connectedName,
    connectedNetworkSignature,
  };
}
