export type IrohBridgeConnection = {
  send(data: Uint8Array | number[]): Promise<void>;
  onMessage(handler: (data: Uint8Array) => void): () => void;
  close(): Promise<void>;
};

export type IrohBridge = {
  bridgeVersion(): Promise<string>;
  nodeId(): Promise<string>;
  start(): Promise<void>;
  stop(): Promise<void>;
  isRunning(): Promise<boolean>;
  connect(nodeId: string, relayUrl?: string | null): Promise<IrohBridgeConnection>;
};

export declare const MODULE_NAME = "MusicHubIroh";
export declare function getIrohBridge(): IrohBridge | null;
export default getIrohBridge;
